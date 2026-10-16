// ════════════════════════════════════════════════════════════════
//  PLANOS · Teclado, polilínea y texto en el lienzo
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { _ctx, M, TOOLS_TOP } from './blueprint-estado.js';
import { cleanup } from './blueprint-motor.js';
import { hideFloatingMeasure, hideMeasureCell } from './blueprint-raton.js';
import { updateOrthoIndicator, toggleFullscreen, setTool } from './blueprint-herramientas.js';
import { commit, undo, redo } from './blueprint-historial.js';
import { draw } from './blueprint-render.js';

export function commitPolyline(closed) {
    if (!_ctx.polylineChain || _ctx.polylineChain.points.length < 2) {
        _ctx.polylineChain = null;
        hideFloatingMeasure(); hideMeasureCell();
        draw();
        return;
    }
    _ctx.shapes.push({
        type: closed ? 'polygon' : 'polyline',
        points: [..._ctx.polylineChain.points],
        stroke: _ctx.polylineChain.stroke,
        strokeWidth: _ctx.polylineChain.strokeWidth,
        fill: (closed && _ctx.fillEnabled) ? _ctx.fillColor : null,
        closed
    });
    _ctx.polylineChain = null;
    hideFloatingMeasure(); hideMeasureCell();
    commit();
}

// ── Edición inline de texto en el canvas ────────────────
export function startInlineText(wx, wy) {
    // Si ya hay un editor abierto, lo cerramos primero (commit)
    if (_ctx.textEditing) {
        _ctx.textEditing.finish(true);
    }

    const sx = wx * _ctx.view.zoom + _ctx.view.x;
    const sy = wy * _ctx.view.zoom + _ctx.view.y;
    let currentSize = 16;

    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.className = 'bp-text-editor';
    editor.style.left = sx + 'px';
    editor.style.top = sy + 'px';
    editor.style.fontSize = (currentSize * _ctx.view.zoom) + 'px';
    editor.style.color = _ctx.strokeColor;
    editor.style.fontFamily = "'DM Sans', sans-serif";
    editor.dataset.placeholder = 'Escribe texto...';
    editor.tabIndex = 0;

    // Evita que clicks en el editor se propaguen al canvas
    editor.addEventListener('mousedown', e => e.stopPropagation());
    editor.addEventListener('click',     e => e.stopPropagation());

    M.wrap.appendChild(editor);

    let done = false;
    const finish = (save) => {
        if (done) return;
        done = true;
        const text = editor.innerText.trim();
        editor.remove();
        _ctx.textEditing = null;
        if (save && text) {
            _ctx.shapes.push({
                type: 'text',
                x: wx, y: wy,
                text,
                color: _ctx.strokeColor,
                size: currentSize
            });
            commit();
        } else {
            draw();
        }
    };

    _ctx.textEditing = { editor, finish };

    editor.addEventListener('blur', () => finish(true));
    editor.addEventListener('keydown', e => {
        e.stopPropagation(); // que no se disparen atajos de herramientas
        if (e.key === 'Escape') { e.preventDefault(); finish(false); return; }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editor.blur(); return; }
        if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            currentSize = Math.min(72, currentSize + 2);
            editor.style.fontSize = (currentSize * _ctx.view.zoom) + 'px';
        }
        if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
            e.preventDefault();
            currentSize = Math.max(8, currentSize - 2);
            editor.style.fontSize = (currentSize * _ctx.view.zoom) + 'px';
        }
    });

    // Foco diferido — algunos navegadores no enfocan si se hace en el
    // mismo tick que la creación. requestAnimationFrame garantiza que el
    // DOM ya está pintado.
    requestAnimationFrame(() => {
        editor.focus({ preventScroll: true });
        // Coloca el cursor dentro del editor
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });
}

// ── Keyboard ─────────────────────────────────────────────
// Si el lienzo ya no está en la página (se cambió de sección o de
// página), el motor se retira solo con la primera tecla o clic.
export const onKeyDown = e => {
    if (!M.canvas.isConnected) { cleanup(); return; }
    if (e.target.matches('input, textarea, [contenteditable="true"]')) return;
    if (e.key === 'Shift') { _ctx.shiftDown = true; updateOrthoIndicator(); }
    if (e.code === 'Space') {
        e.preventDefault();
        _ctx.spaceDown = true;
        if (_ctx.tool !== 'hand') M.canvas.style.cursor = 'grab';
    }
    if (e.key === 'Escape') {
        if (_ctx.lineChain) { _ctx.lineChain = null; hideFloatingMeasure(); hideMeasureCell(); draw(); return; }
        if (_ctx.polylineChain) { commitPolyline(false); return; }
        if (_ctx.creating) { _ctx.creating = null; hideFloatingMeasure(); hideMeasureCell(); draw(); return; }
        if (_ctx.fullscreen) { toggleFullscreen(); return; }
        if (_ctx.selected !== null) { _ctx.selected = null; draw(); }
    }
    if (e.key === 'Enter') {
        if (_ctx.polylineChain) { commitPolyline(true); return; }
    }
    if (e.key === 'Delete' && _ctx.selected !== null) {
        _ctx.shapes.splice(_ctx.selected, 1);
        _ctx.selected = null;
        commit();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }

    // Atajos de herramientas
    const t = TOOLS_TOP.find(x => x.key.toLowerCase() === e.key.toLowerCase());
    if (t) setTool(t.id);
};

export const onKeyUp = e => {
    if (!M.canvas.isConnected) { cleanup(); return; }
    if (e.key === 'Shift') { _ctx.shiftDown = false; updateOrthoIndicator(); }
    if (e.code === 'Space') {
        _ctx.spaceDown = false;
        if (_ctx.tool !== 'hand') M.canvas.style.cursor = _ctx.tool === 'select' ? 'default' : 'crosshair';
    }
};
