// ════════════════════════════════════════════════════════════════
//  PLANOS · Dibujo del lienzo: cuadrícula, reglas, figuras y selección
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { shapeBounds, getHandles } from './blueprint-geometry.js';
import { drawArrow, drawSymbol, roundRect } from './blueprint-draw.js';
import { M, _ctx, RULER_SIZE, HANDLE_SIZE } from './blueprint-estado.js';
import { findIncomingLineDirection } from './blueprint-seleccion.js';

// ════════════════════════════════════════════════════════
//  RENDER
// ════════════════════════════════════════════════════════
export function draw() {
    const cw = M.canvas.width / M.dpr;
    const ch = M.canvas.height / M.dpr;
    M.ctx.fillStyle = '#fefcf7';
    M.ctx.fillRect(0, 0, cw, ch);
    if (_ctx.showGrid) drawGrid(M.ctx, cw, ch);

    M.ctx.save();
    M.ctx.translate(_ctx.view.x, _ctx.view.y);
    M.ctx.scale(_ctx.view.zoom, _ctx.view.zoom);

    renderShapes(M.ctx, _ctx.shapes, _ctx.selected);

    // Shape en construcción
    if (_ctx.creating) {
        M.ctx.save();
        M.ctx.globalAlpha = 0.78;
        renderShapes(M.ctx, [_ctx.creating], null);
        M.ctx.restore();
    }

    // Línea AutoCAD en construcción: preview del próximo segmento + arco de ángulo
    if (_ctx.lineChain && _ctx.lineChain.preview) {
        const last = _ctx.lineChain.last;
        const cur = _ctx.lineChain.preview;
        M.ctx.save();
        M.ctx.strokeStyle = _ctx.strokeColor;
        M.ctx.lineWidth = _ctx.strokeWidth;
        M.ctx.setLineDash([6 / _ctx.view.zoom, 4 / _ctx.view.zoom]);
        M.ctx.globalAlpha = 0.7;
        M.ctx.beginPath();
        M.ctx.moveTo(last.x, last.y);
        M.ctx.lineTo(cur.x, cur.y);
        M.ctx.stroke();
        M.ctx.setLineDash([]);
        M.ctx.globalAlpha = 1;
        // Marcador del punto de partida
        M.ctx.fillStyle = _ctx.strokeColor;
        M.ctx.beginPath();
        M.ctx.arc(last.x, last.y, 4 / _ctx.view.zoom, 0, Math.PI * 2);
        M.ctx.fill();
        M.ctx.restore();

        // ── Arco del ángulo en la esquina (estilo trigonometría) ──
        // Si el último punto coincide con el extremo de una línea existente,
        // dibujamos el arco entre ambas direcciones.
        const prevDir = findIncomingLineDirection(last);
        const curDir = Math.atan2(cur.y - last.y, cur.x - last.x);
        if (prevDir !== null && Math.hypot(cur.x - last.x, cur.y - last.y) > 5) {
            // prevDir apunta HACIA el vértice; lo invertimos para "salir" del vértice
            const fromAngle = prevDir + Math.PI;
            drawAngleArc(M.ctx, last, fromAngle, curDir);
        } else if (Math.hypot(cur.x - last.x, cur.y - last.y) > 5) {
            // Primer segmento: ángulo desde la horizontal
            drawAngleArc(M.ctx, last, 0, curDir);
        }
    }

    // Polilínea en construcción
    if (_ctx.polylineChain) {
        const c = _ctx.polylineChain;
        M.ctx.save();
        M.ctx.strokeStyle = c.stroke;
        M.ctx.lineWidth = c.strokeWidth;
        M.ctx.lineCap = 'round'; M.ctx.lineJoin = 'round';

        // Segmentos firmes
        M.ctx.beginPath();
        M.ctx.moveTo(c.points[0].x, c.points[0].y);
        for (let i = 1; i < c.points.length; i++) M.ctx.lineTo(c.points[i].x, c.points[i].y);
        M.ctx.stroke();

        // Segmento preview (línea punteada al cursor)
        if (c.cur) {
            M.ctx.save();
            M.ctx.globalAlpha = 0.65;
            M.ctx.setLineDash([6 / _ctx.view.zoom, 4 / _ctx.view.zoom]);
            M.ctx.beginPath();
            const last = c.points[c.points.length - 1];
            M.ctx.moveTo(last.x, last.y);
            M.ctx.lineTo(c.cur.x, c.cur.y);
            M.ctx.stroke();
            M.ctx.restore();
        }

        // Marker en cada vértice
        M.ctx.fillStyle = c.stroke;
        c.points.forEach((p, i) => {
            const r = (i === 0 ? 5 : 3) / _ctx.view.zoom;
            M.ctx.beginPath(); M.ctx.arc(p.x, p.y, r, 0, Math.PI * 2); M.ctx.fill();
        });

        // Indicador de cierre cerca del primer punto
        if (c.nearStart && c.points.length >= 2) {
            M.ctx.save();
            M.ctx.strokeStyle = '#10b981';
            M.ctx.lineWidth = 2 / _ctx.view.zoom;
            M.ctx.beginPath();
            M.ctx.arc(c.points[0].x, c.points[0].y, 8 / _ctx.view.zoom, 0, Math.PI * 2);
            M.ctx.stroke();
            M.ctx.restore();
        }
        M.ctx.restore();
    }

    M.ctx.restore();
}

function drawGrid(ctx, w, h) {
    const gs = _ctx.gridSize * _ctx.view.zoom;
    if (gs < 4) return;
    const ox = _ctx.view.x % gs;
    const oy = _ctx.view.y % gs;

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox; x < w; x += gs) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
    for (let y = oy; y < h; y += gs) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.13)';
    ctx.beginPath();
    for (let x = ox; x < w; x += gs * 5) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
    for (let y = oy; y < h; y += gs * 5) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
    ctx.stroke();

    // Ejes
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const ax = _ctx.view.x;
    const ay = _ctx.view.y;
    if (ax >= 0 && ax <= w) { ctx.moveTo(Math.round(ax) + 0.5, 0); ctx.lineTo(Math.round(ax) + 0.5, h); }
    if (ay >= 0 && ay <= h) { ctx.moveTo(0, Math.round(ay) + 0.5); ctx.lineTo(w, Math.round(ay) + 0.5); }
    ctx.stroke();
}

export function updateRulers() {
    if (!M.rulerX || !M.rulerY || M.rulerX.style.display === 'none') return;
    const rxctx = M.rulerX.getContext('2d');
    const ryctx = M.rulerY.getContext('2d');
    const rxw = M.rulerX.width / M.dpr;
    const ryh = M.rulerY.height / M.dpr;
    const gs = _ctx.gridSize * _ctx.view.zoom;

    rxctx.fillStyle = '#1e293b';
    rxctx.fillRect(0, 0, rxw, RULER_SIZE);
    rxctx.strokeStyle = '#334155';
    rxctx.fillStyle = '#94a3b8';
    rxctx.font = '9px "JetBrains Mono", monospace';

    if (gs > 3) {
        const ox = _ctx.view.x % gs;
        for (let x = ox; x < rxw; x += gs) {
            rxctx.beginPath();
            rxctx.moveTo(Math.round(x) + 0.5, RULER_SIZE - 4);
            rxctx.lineTo(Math.round(x) + 0.5, RULER_SIZE);
            rxctx.stroke();
        }
        const oxL = _ctx.view.x % (gs * 5);
        for (let x = oxL; x < rxw; x += gs * 5) {
            const worldX = Math.round((x - _ctx.view.x) / _ctx.view.zoom);
            rxctx.beginPath();
            rxctx.moveTo(Math.round(x) + 0.5, RULER_SIZE - 8);
            rxctx.lineTo(Math.round(x) + 0.5, RULER_SIZE);
            rxctx.stroke();
            rxctx.fillText(String(worldX), x + 2, 10);
        }
    }
    if (_ctx.cursor.inside) {
        rxctx.fillStyle = '#3b82f6';
        rxctx.fillRect(_ctx.cursor.sx - 1, 0, 2, RULER_SIZE);
    }

    ryctx.fillStyle = '#1e293b';
    ryctx.fillRect(0, 0, RULER_SIZE, ryh);
    ryctx.strokeStyle = '#334155';
    ryctx.fillStyle = '#94a3b8';
    ryctx.font = '9px "JetBrains Mono", monospace';
    if (gs > 3) {
        const oy = _ctx.view.y % gs;
        for (let y = oy; y < ryh; y += gs) {
            ryctx.beginPath();
            ryctx.moveTo(RULER_SIZE - 4, Math.round(y) + 0.5);
            ryctx.lineTo(RULER_SIZE, Math.round(y) + 0.5);
            ryctx.stroke();
        }
        const oyL = _ctx.view.y % (gs * 5);
        for (let y = oyL; y < ryh; y += gs * 5) {
            const worldY = Math.round((y - _ctx.view.y) / _ctx.view.zoom);
            ryctx.beginPath();
            ryctx.moveTo(RULER_SIZE - 8, Math.round(y) + 0.5);
            ryctx.lineTo(RULER_SIZE, Math.round(y) + 0.5);
            ryctx.stroke();
            ryctx.save();
            ryctx.translate(10, y - 2);
            ryctx.rotate(-Math.PI / 2);
            ryctx.fillText(String(worldY), 0, 0);
            ryctx.restore();
        }
    }
    if (_ctx.cursor.inside) {
        ryctx.fillStyle = '#3b82f6';
        ryctx.fillRect(0, _ctx.cursor.sy - 1, RULER_SIZE, 2);
    }
}

export function renderShapes(ctx, shapes, selectedIdx) {
    shapes.forEach((s, i) => {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = s.stroke || '#0f172a';
        ctx.lineWidth = s.strokeWidth || 2;
        ctx.fillStyle = s.fill || 'transparent';

        if (s.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
        } else if (s.type === 'rect') {
            ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h);
            if (s.fill) ctx.fill();
            ctx.stroke();
        } else if (s.type === 'circle') {
            ctx.beginPath(); ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
            if (s.fill) ctx.fill();
            ctx.stroke();
        } else if (s.type === 'ellipse') {
            ctx.beginPath(); ctx.ellipse(s.cx, s.cy, s.rx, s.ry, 0, 0, Math.PI * 2);
            if (s.fill) ctx.fill();
            ctx.stroke();
        } else if (s.type === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(s.x + s.w / 2, s.y);
            ctx.lineTo(s.x + s.w, s.y + s.h);
            ctx.lineTo(s.x, s.y + s.h);
            ctx.closePath();
            if (s.fill) ctx.fill();
            ctx.stroke();
        } else if (s.type === 'arrow') {
            drawArrow(ctx, s.x1, s.y1, s.x2, s.y2, s.strokeWidth || 2);
        } else if (s.type === 'polyline' || s.type === 'polygon') {
            if (!s.points?.length) return;
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let j = 1; j < s.points.length; j++) ctx.lineTo(s.points[j].x, s.points[j].y);
            if (s.closed) ctx.closePath();
            if (s.fill && s.closed) ctx.fill();
            ctx.stroke();
        } else if (s.type === 'pen') {
            if (!s.points?.length) return;
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let j = 1; j < s.points.length; j++) ctx.lineTo(s.points[j].x, s.points[j].y);
            ctx.stroke();
        } else if (s.type === 'text') {
            ctx.fillStyle = s.color || '#0f172a';
            ctx.font = `${s.size || 14}px 'DM Sans', sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(s.text, s.x, s.y);
        } else if (s.type === 'symbol') {
            drawSymbol(ctx, s.symbolId, s.x, s.y, s.w, s.h, s.stroke || '#0f172a');
            if (s.label) {
                ctx.fillStyle = s.stroke || '#0f172a';
                ctx.font = `${Math.max(10, s.h * 0.18)}px 'DM Sans', sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(s.label, s.x + s.w / 2, s.y + s.h + 4);
                ctx.textAlign = 'left';
            }
        }

        if (i === selectedIdx) {
            drawSelection(ctx, s);
        }
    });
}

function drawSelection(ctx, s) {
    const b = shapeBounds(s);
    if (!b) return;
    ctx.save();
    // Bounding box
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / _ctx.view.zoom;
    ctx.setLineDash([6 / _ctx.view.zoom, 4 / _ctx.view.zoom]);
    ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
    ctx.setLineDash([]);

    // Handles (grips) en los puntos relevantes
    const handles = getHandles(s);
    const hs = HANDLE_SIZE / _ctx.view.zoom;
    handles.forEach(h => {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5 / _ctx.view.zoom;
        ctx.beginPath();
        ctx.rect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        ctx.fill();
        ctx.stroke();
    });
    ctx.restore();
}

function drawAngleArc(ctx, vertex, fromAngle, toAngle) {
    const zoom = _ctx.view.zoom;
    const radius = 35 / zoom;
    let diff = toAngle - fromAngle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const angleDeg = Math.abs(diff * 180 / Math.PI);
    if (angleDeg < 0.5) return;

    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5 / zoom;

    // Arco principal
    ctx.beginPath();
    if (diff > 0) ctx.arc(vertex.x, vertex.y, radius, fromAngle, fromAngle + diff);
    else          ctx.arc(vertex.x, vertex.y, radius, fromAngle + diff, fromAngle);
    ctx.stroke();

    // Pequeñas marcas de tic en los extremos del ángulo
    ctx.lineWidth = 1 / zoom;
    ctx.globalAlpha = 0.45;
    [fromAngle, toAngle].forEach(a => {
        ctx.beginPath();
        ctx.moveTo(vertex.x + Math.cos(a) * radius * 0.85, vertex.y + Math.sin(a) * radius * 0.85);
        ctx.lineTo(vertex.x + Math.cos(a) * radius * 1.1,  vertex.y + Math.sin(a) * radius * 1.1);
        ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Etiqueta del valor del ángulo
    const midAngle = fromAngle + diff / 2;
    const labelR   = radius + 18 / zoom;
    const lx = vertex.x + Math.cos(midAngle) * labelR;
    const ly = vertex.y + Math.sin(midAngle) * labelR;
    const text = angleDeg.toFixed(1) + '°';

    ctx.font = `bold ${12 / zoom}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(text);
    const padX = 6 / zoom, padY = 3 / zoom;
    const bgW = metrics.width + padX * 2;
    const bgH = 14 / zoom + padY * 2;
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, lx - bgW / 2, ly - bgH / 2, bgW, bgH, 4 / zoom);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(text, lx, ly);
    ctx.restore();
}
