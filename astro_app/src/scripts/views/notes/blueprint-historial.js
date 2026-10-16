// ════════════════════════════════════════════════════════════════
//  PLANOS · Historial (deshacer / rehacer), guardado y miniatura
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { renderList } from './blueprint-section.js';
import { updateDrawing } from '../../notesStore.js';
import { boundsAll } from './blueprint-geometry.js';
import { _ctx } from './blueprint-estado.js';
import { draw, renderShapes } from './blueprint-render.js';

export function commit() {
    const snapJSON = JSON.stringify(_ctx.shapes);
    _ctx.history = _ctx.history.slice(0, _ctx.historyIdx + 1);
    _ctx.history.push(snapJSON);
    if (_ctx.history.length > 80) _ctx.history.shift();
    _ctx.historyIdx = _ctx.history.length - 1;
    persistDrawing();
    draw();
    document.getElementById('bp-count').textContent = _ctx.shapes.length;
}

export function undo() {
    if (_ctx.historyIdx > 0) {
        _ctx.historyIdx--;
        _ctx.shapes = JSON.parse(_ctx.history[_ctx.historyIdx]);
        _ctx.selected = null;
        persistDrawing(); draw();
        document.getElementById('bp-count').textContent = _ctx.shapes.length;
    }
}

export function redo() {
    if (_ctx.historyIdx < _ctx.history.length - 1) {
        _ctx.historyIdx++;
        _ctx.shapes = JSON.parse(_ctx.history[_ctx.historyIdx]);
        _ctx.selected = null;
        persistDrawing(); draw();
        document.getElementById('bp-count').textContent = _ctx.shapes.length;
    }
}

export function persistDrawing() {
    const status = document.getElementById('bp-save-status');
    if (status) status.innerHTML = '<span class="bp-status-dot saving"></span> Guardando…';
    clearTimeout(persistDrawing._t);
    persistDrawing._t = setTimeout(() => {
        updateDrawing(_ctx.activeDrawingId, {
            data: { shapes: _ctx.shapes, gridSize: _ctx.gridSize, showGrid: _ctx.showGrid },
            thumbnail: makeThumbnail()
        });
        if (status) status.innerHTML = '<span class="bp-status-dot"></span> Sincronizado';
        renderList();
    }, 500);
}

function makeThumbnail() {
    try {
        const tmp = document.createElement('canvas');
        tmp.width = 120; tmp.height = 80;
        const tctx = tmp.getContext('2d');
        tctx.fillStyle = '#fef7e8';
        tctx.fillRect(0, 0, 120, 80);
        const b = boundsAll(_ctx.shapes);
        if (!b) return null;
        const pad = 8;
        const sx = (120 - pad * 2) / (b.w || 1);
        const sy = (80 - pad * 2) / (b.h || 1);
        const s = Math.min(sx, sy);
        tctx.save();
        tctx.translate(pad - b.x * s, pad - b.y * s);
        tctx.scale(s, s);
        renderShapes(tctx, _ctx.shapes, null);
        tctx.restore();
        return tmp.toDataURL('image/png');
    } catch { return null; }
}
