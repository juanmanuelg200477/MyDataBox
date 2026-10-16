// ════════════════════════════════════════════════════════════════
//  PLANOS · Ratón: coordenadas, medidas, pulsar, soltar, doble clic y rueda
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { getHandles } from './blueprint-geometry.js';
import { _ctx, M, HANDLE_SIZE, SYMBOLS, CLOSE_THRESHOLD } from './blueprint-estado.js';
import { startInlineText, commitPolyline } from './blueprint-teclado.js';
import { commit } from './blueprint-historial.js';
import { findShapeAt } from './blueprint-seleccion.js';
import { draw } from './blueprint-render.js';

// ── Helpers ──────────────────────────────────────────────
export const screenToWorld = (sx, sy) => ({
    x: (sx - _ctx.view.x) / _ctx.view.zoom,
    y: (sy - _ctx.view.y) / _ctx.view.zoom
});

export const snap = v => _ctx.snap ? Math.round(v / _ctx.gridSize) * _ctx.gridSize : v;

export const constrainShift = (x0, y0, x1, y1) => {
    const dx = x1 - x0, dy = y1 - y0;
    const angle = Math.atan2(dy, dx);
    const step = Math.PI / 4;
    const a2 = Math.round(angle / step) * step;
    const len = Math.hypot(dx, dy);
    return { x: x0 + Math.cos(a2) * len, y: y0 + Math.sin(a2) * len };
};

// ── Helpers UI ──────────────────────────────────────────
export const showMeasureCell = (text) => {
    const cell = document.getElementById('bp-measure-cell');
    const m = document.getElementById('bp-measure');
    if (m) { m.textContent = text; cell.style.display = 'flex'; }
};

export const hideMeasureCell = () => { document.getElementById('bp-measure-cell').style.display = 'none'; };

export const showFloatingMeasure = (text, sx, sy) => {
    M.measureTip.textContent = text;
    M.measureTip.style.left = (sx + 18) + 'px';
    M.measureTip.style.top = (sy - 32) + 'px';
    M.measureTip.classList.add('show');
};

export const hideFloatingMeasure = () => M.measureTip.classList.remove('show');

export function onMouseDown(e) {
    if (_ctx.textEditing) return; // mientras se edita texto, no recibir clicks
    const rect = M.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);

    // Pan: espacio, herramienta Hand, o botón medio
    if (_ctx.spaceDown || _ctx.tool === 'hand' || e.button === 1) {
        _ctx.drag = { type: 'pan', startX: sx, startY: sy, viewX: _ctx.view.x, viewY: _ctx.view.y };
        M.canvas.style.cursor = 'grabbing';
        return;
    }

    if (_ctx.tool === 'eraser') {
        const i = findShapeAt(w.x, w.y);
        if (i !== -1) { _ctx.shapes.splice(i, 1); commit(); }
        return;
    }

    // Select tool — incluye manejo de grips
    if (_ctx.tool === 'select') {
        // ¿Click sobre un handle (nodo) del shape seleccionado?
        if (_ctx.selected !== null) {
            const handles = getHandles(_ctx.shapes[_ctx.selected]);
            for (let hi = 0; hi < handles.length; hi++) {
                const h = handles[hi];
                const sxw = h.x * _ctx.view.zoom + _ctx.view.x;
                const syw = h.y * _ctx.view.zoom + _ctx.view.y;
                if (Math.abs(sxw - sx) <= HANDLE_SIZE && Math.abs(syw - sy) <= HANDLE_SIZE) {
                    _ctx.drag = {
                        type: 'handle',
                        shapeIdx: _ctx.selected,
                        handleIdx: hi,
                        origShape: JSON.parse(JSON.stringify(_ctx.shapes[_ctx.selected])),
                        startX: w.x, startY: w.y
                    };
                    return;
                }
            }
        }
        const i = findShapeAt(w.x, w.y);
        if (i !== -1) {
            _ctx.selected = i;
            _ctx.drag = {
                type: 'move',
                startX: w.x, startY: w.y,
                origShape: JSON.parse(JSON.stringify(_ctx.shapes[i]))
            };
        } else {
            _ctx.selected = null;
        }
        draw();
        return;
    }

    // Text — comienza edición inline directamente
    if (_ctx.tool === 'text') {
        startInlineText(snap(w.x), snap(w.y));
        return;
    }

    // Symbol — colocar símbolo seleccionado
    if (_ctx.tool === 'symbol') {
        const symDef = SYMBOLS.find(s => s.id === _ctx.symbolVariant) || SYMBOLS[0];
        const size = symDef.defaultSize;
        const cx = snap(w.x), cy = snap(w.y);
        _ctx.shapes.push({
            type: 'symbol', symbolId: symDef.id,
            x: cx - size / 2, y: cy - size / 2, w: size, h: size,
            stroke: _ctx.strokeColor, strokeWidth: _ctx.strokeWidth,
            label: ''
        });
        commit();
        return;
    }

    // Shapes (variantes)
    if (_ctx.tool === 'shape') {
        const variant = _ctx.shapeVariant;
        const x = snap(w.x), y = snap(w.y);

        // ── LÍNEA (AutoCAD): cada click crea un segmento INDEPENDIENTE ──
        if (variant === 'line') {
            if (!_ctx.lineChain) {
                // Primer punto: solo guarda el inicio, no crea figura aún
                _ctx.lineChain = { last: { x, y }, preview: { x, y } };
            } else {
                let nx = x, ny = y;
                if (_ctx.shiftDown) {
                    const last = _ctx.lineChain.last;
                    const p = constrainShift(last.x, last.y, w.x, w.y);
                    nx = snap(p.x); ny = snap(p.y);
                }
                // Crear figura individual: cada línea es su propio shape
                _ctx.shapes.push({
                    type: 'line',
                    x1: _ctx.lineChain.last.x,
                    y1: _ctx.lineChain.last.y,
                    x2: nx,
                    y2: ny,
                    stroke: _ctx.strokeColor,
                    strokeWidth: _ctx.strokeWidth
                });
                _ctx.lineChain.last = { x: nx, y: ny };
                _ctx.lineChain.preview = { x: nx, y: ny };
                commit();
            }
            draw();
            return;
        }

        // ── POLÍGONO: polilínea continua que se puede cerrar (rellenable) ──
        if (variant === 'polygon') {
            if (!_ctx.polylineChain) {
                _ctx.polylineChain = { points: [{ x, y }], cur: { x, y }, stroke: _ctx.strokeColor, strokeWidth: _ctx.strokeWidth };
            } else {
                const start = _ctx.polylineChain.points[0];
                const dist = Math.hypot((x - start.x) * _ctx.view.zoom, (y - start.y) * _ctx.view.zoom);
                if (_ctx.polylineChain.points.length >= 2 && dist < CLOSE_THRESHOLD) {
                    _ctx.shapes.push({
                        type: 'polygon',
                        points: [..._ctx.polylineChain.points],
                        stroke: _ctx.polylineChain.stroke,
                        strokeWidth: _ctx.polylineChain.strokeWidth,
                        fill: _ctx.fillEnabled ? _ctx.fillColor : null,
                        closed: true
                    });
                    _ctx.polylineChain = null;
                    hideFloatingMeasure();
                    hideMeasureCell();
                    commit();
                    return;
                }
                let nx = x, ny = y;
                if (_ctx.shiftDown) {
                    const last = _ctx.polylineChain.points[_ctx.polylineChain.points.length - 1];
                    const p = constrainShift(last.x, last.y, w.x, w.y);
                    nx = snap(p.x); ny = snap(p.y);
                }
                _ctx.polylineChain.points.push({ x: nx, y: ny });
                _ctx.polylineChain.cur = { x: nx, y: ny };
            }
            draw();
            return;
        }

        if (variant === 'rect') {
            _ctx.creating = { type: 'rect', x, y, w: 0, h: 0, stroke: _ctx.strokeColor, strokeWidth: _ctx.strokeWidth, fill: _ctx.fillEnabled ? _ctx.fillColor : null };
        } else if (variant === 'circle') {
            _ctx.creating = { type: 'circle', cx: x, cy: y, r: 0, stroke: _ctx.strokeColor, strokeWidth: _ctx.strokeWidth, fill: _ctx.fillEnabled ? _ctx.fillColor : null };
        } else if (variant === 'ellipse') {
            _ctx.creating = { type: 'ellipse', cx: x, cy: y, rx: 0, ry: 0, stroke: _ctx.strokeColor, strokeWidth: _ctx.strokeWidth, fill: _ctx.fillEnabled ? _ctx.fillColor : null };
        } else if (variant === 'triangle') {
            _ctx.creating = { type: 'triangle', x, y, w: 0, h: 0, stroke: _ctx.strokeColor, strokeWidth: _ctx.strokeWidth, fill: _ctx.fillEnabled ? _ctx.fillColor : null };
        } else if (variant === 'arrow') {
            _ctx.creating = { type: 'arrow', x1: x, y1: y, x2: x, y2: y, stroke: _ctx.strokeColor, strokeWidth: _ctx.strokeWidth };
        }
        draw();
        return;
    }

    if (_ctx.tool === 'pen') {
        _ctx.creating = { type: 'pen', points: [{ x: w.x, y: w.y }], stroke: _ctx.strokeColor, strokeWidth: _ctx.strokeWidth };
        draw();
        return;
    }
}

export function onMouseUp(e) {
    if (_ctx.drag?.type === 'pan') { M.canvas.style.cursor = _ctx.tool === 'hand' ? 'grab' : ''; _ctx.drag = null; return; }
    if (_ctx.drag?.type === 'move') { _ctx.drag = null; commit(); return; }
    if (_ctx.drag?.type === 'handle') { _ctx.drag = null; commit(); return; }
    if (_ctx.creating) {
        const c = _ctx.creating;
        const valid =
            (c.type === 'rect' && Math.abs(c.w) > 2 && Math.abs(c.h) > 2) ||
            (c.type === 'circle' && c.r > 2) ||
            (c.type === 'ellipse' && c.rx > 2 && c.ry > 2) ||
            (c.type === 'triangle' && Math.abs(c.w) > 2 && Math.abs(c.h) > 2) ||
            (c.type === 'arrow' && (c.x1 !== c.x2 || c.y1 !== c.y2)) ||
            (c.type === 'pen' && c.points.length > 1);
        if (valid) { _ctx.shapes.push({ ...c }); commit(); }
        _ctx.creating = null;
        hideFloatingMeasure(); hideMeasureCell();
        draw();
    }
}

export function onDblClick(e) {
    // En polilínea, doble click cierra/termina
    if (_ctx.polylineChain) {
        commitPolyline(false);
    }
}

export function onWheel(e) {
    e.preventDefault();
    const rect = M.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const before = screenToWorld(sx, sy);
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    _ctx.view.zoom = Math.max(0.2, Math.min(8, _ctx.view.zoom * factor));
    const after = screenToWorld(sx, sy);
    _ctx.view.x += (after.x - before.x) * _ctx.view.zoom;
    _ctx.view.y += (after.y - before.y) * _ctx.view.zoom;
    document.getElementById('bp-zoom-val').textContent = Math.round(_ctx.view.zoom * 100) + '%';
    draw();
}
