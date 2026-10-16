// ════════════════════════════════════════════════════════════════
//  PLANOS · Movimiento del ratón: arrastres, mira y nodos bajo el cursor
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { translateShape, moveHandle, getHandles } from './blueprint-geometry.js';
import { M, _ctx, fmtLen, fmtLenFull, CLOSE_THRESHOLD, pxToCm, HANDLE_SIZE } from './blueprint-estado.js';
import { screenToWorld, snap, constrainShift, showMeasureCell, showFloatingMeasure } from './blueprint-raton.js';
import { updateRulers, draw } from './blueprint-render.js';

export function onMouseMove(e) {
    const rect = M.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);
    _ctx.cursor.x = w.x; _ctx.cursor.y = w.y;
    _ctx.cursor.sx = sx; _ctx.cursor.sy = sy;
    updateCrosshair();

    document.getElementById('bp-coords').textContent = `${Math.round(w.x)}, ${Math.round(w.y)}`;
    updateRulers();
    updateHoverHandle(sx, sy);

    if (_ctx.drag?.type === 'pan') {
        _ctx.view.x = _ctx.drag.viewX + (sx - _ctx.drag.startX);
        _ctx.view.y = _ctx.drag.viewY + (sy - _ctx.drag.startY);
        draw(); return;
    }

    if (_ctx.drag?.type === 'move' && _ctx.selected !== null) {
        const sh = _ctx.shapes[_ctx.selected];
        const orig = _ctx.drag.origShape;
        const dx = snap(w.x) - snap(_ctx.drag.startX);
        const dy = snap(w.y) - snap(_ctx.drag.startY);
        translateShape(sh, orig, dx, dy);
        draw(); return;
    }

    if (_ctx.drag?.type === 'handle') {
        const sh = _ctx.shapes[_ctx.drag.shapeIdx];
        const orig = _ctx.drag.origShape;
        moveHandle(sh, orig, _ctx.drag.handleIdx, snap(w.x), snap(w.y));
        draw(); return;
    }

    // Línea AutoCAD: actualizar preview del próximo segmento
    if (_ctx.lineChain) {
        let nx = snap(w.x), ny = snap(w.y);
        if (_ctx.shiftDown) {
            const last = _ctx.lineChain.last;
            const p = constrainShift(last.x, last.y, w.x, w.y);
            nx = snap(p.x); ny = snap(p.y);
        }
        _ctx.lineChain.preview = { x: nx, y: ny };
        const last = _ctx.lineChain.last;
        const segLen = Math.hypot(nx - last.x, ny - last.y);
        const angle = (Math.atan2(ny - last.y, nx - last.x) * 180 / Math.PI).toFixed(1);
        const txt = `${fmtLen(segLen)} · ${angle}°`;
        showMeasureCell(fmtLenFull(segLen) + ` · ${angle}°`);
        showFloatingMeasure(txt, sx, sy);
        draw();
        return;
    }

    // Polilínea: actualizar preview
    if (_ctx.polylineChain) {
        let nx = snap(w.x), ny = snap(w.y);
        if (_ctx.shiftDown && _ctx.polylineChain.points.length) {
            const last = _ctx.polylineChain.points[_ctx.polylineChain.points.length - 1];
            const p = constrainShift(last.x, last.y, w.x, w.y);
            nx = snap(p.x); ny = snap(p.y);
        }
        _ctx.polylineChain.cur = { x: nx, y: ny };

        // Mostrar medida del último segmento
        const last = _ctx.polylineChain.points[_ctx.polylineChain.points.length - 1];
        const segLen = Math.hypot(nx - last.x, ny - last.y);
        const angle = (Math.atan2(ny - last.y, nx - last.x) * 180 / Math.PI).toFixed(1);
        const txt = `${fmtLen(segLen)} · ${angle}°`;
        showMeasureCell(fmtLenFull(segLen) + ` · ${angle}°`);
        showFloatingMeasure(txt, sx, sy);

        // Indicador de cierre cerca del punto inicial
        if (_ctx.polylineChain.points.length >= 2) {
            const start = _ctx.polylineChain.points[0];
            const dist = Math.hypot((nx - start.x) * _ctx.view.zoom, (ny - start.y) * _ctx.view.zoom);
            _ctx.polylineChain.nearStart = dist < CLOSE_THRESHOLD;
        }

        draw(); return;
    }

    if (_ctx.creating) {
        const c = _ctx.creating;
        const x = snap(w.x), y = snap(w.y);
        if (c.type === 'rect') {
            let nw = w.x - c.x, nh = w.y - c.y;
            if (_ctx.shiftDown) {
                const s = Math.max(Math.abs(nw), Math.abs(nh));
                nw = Math.sign(nw || 1) * s; nh = Math.sign(nh || 1) * s;
            }
            c.w = _ctx.snap ? Math.round(nw / _ctx.gridSize) * _ctx.gridSize : nw;
            c.h = _ctx.snap ? Math.round(nh / _ctx.gridSize) * _ctx.gridSize : nh;
            const txt = `${fmtLen(Math.abs(c.w))} × ${fmtLen(Math.abs(c.h))}`;
            showMeasureCell(`${Math.abs(c.w)} × ${Math.abs(c.h)} px · ${pxToCm(Math.abs(c.w)).toFixed(2)} × ${pxToCm(Math.abs(c.h)).toFixed(2)} cm`);
            showFloatingMeasure(txt, sx, sy);
        } else if (c.type === 'circle') {
            const r = Math.hypot(w.x - c.cx, w.y - c.cy);
            c.r = _ctx.snap ? Math.round(r / _ctx.gridSize) * _ctx.gridSize : r;
            const txt = `R ${fmtLen(c.r)} · D ${fmtLen(c.r * 2)}`;
            showMeasureCell(`R = ${Math.round(c.r)}px (${pxToCm(c.r).toFixed(2)} cm) · D = ${pxToCm(c.r * 2).toFixed(2)} cm`);
            showFloatingMeasure(txt, sx, sy);
        } else if (c.type === 'ellipse') {
            c.rx = Math.abs(w.x - c.cx);
            c.ry = Math.abs(w.y - c.cy);
            if (_ctx.shiftDown) { c.rx = c.ry = Math.max(c.rx, c.ry); }
            const txt = `${fmtLen(c.rx * 2)} × ${fmtLen(c.ry * 2)}`;
            showMeasureCell(`Rx ${Math.round(c.rx)} · Ry ${Math.round(c.ry)}`);
            showFloatingMeasure(txt, sx, sy);
        } else if (c.type === 'triangle') {
            c.w = (w.x - c.x);
            c.h = (w.y - c.y);
            if (_ctx.shiftDown) {
                const s = Math.max(Math.abs(c.w), Math.abs(c.h));
                c.w = Math.sign(c.w || 1) * s; c.h = Math.sign(c.h || 1) * s;
            }
            showMeasureCell(`Base ${Math.abs(c.w)} · Alto ${Math.abs(c.h)}`);
            showFloatingMeasure(`${fmtLen(Math.abs(c.w))} × ${fmtLen(Math.abs(c.h))}`, sx, sy);
        } else if (c.type === 'arrow') {
            if (_ctx.shiftDown) {
                const p = constrainShift(c.x1, c.y1, w.x, w.y);
                c.x2 = snap(p.x); c.y2 = snap(p.y);
            } else {
                c.x2 = x; c.y2 = y;
            }
            const len = Math.hypot(c.x2 - c.x1, c.y2 - c.y1);
            const angle = (Math.atan2(c.y2 - c.y1, c.x2 - c.x1) * 180 / Math.PI).toFixed(1);
            showMeasureCell(`${Math.round(len)}px · ${angle}°`);
            showFloatingMeasure(`${fmtLen(len)} · ${angle}°`, sx, sy);
        } else if (c.type === 'pen') {
            c.points.push({ x: w.x, y: w.y });
        }
        draw();
    }
}

export function updateCrosshair() {
    if (!_ctx.cursor.inside) return;
    M.crosshair.style.opacity = '1';
    M.crosshair.querySelector('.bp-crosshair-x').style.top = _ctx.cursor.sy + 'px';
    M.crosshair.querySelector('.bp-crosshair-y').style.left = _ctx.cursor.sx + 'px';
}

// Detectar hover sobre handles para cambiar cursor
function updateHoverHandle(sx, sy) {
    if (_ctx.tool !== 'select' || _ctx.selected === null) {
        _ctx.hoverHandle = null;
        M.canvas.style.cursor = M.canvas.style.cursor; // mantener
        return;
    }
    const handles = getHandles(_ctx.shapes[_ctx.selected]);
    for (let hi = 0; hi < handles.length; hi++) {
        const h = handles[hi];
        const sxw = h.x * _ctx.view.zoom + _ctx.view.x;
        const syw = h.y * _ctx.view.zoom + _ctx.view.y;
        if (Math.abs(sxw - sx) <= HANDLE_SIZE && Math.abs(syw - sy) <= HANDLE_SIZE) {
            _ctx.hoverHandle = { handleIdx: hi };
            M.canvas.style.cursor = h.cursor || 'pointer';
            return;
        }
    }
    _ctx.hoverHandle = null;
    if (_ctx.tool === 'select') M.canvas.style.cursor = 'default';
}
