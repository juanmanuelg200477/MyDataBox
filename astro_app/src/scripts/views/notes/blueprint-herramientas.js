// ════════════════════════════════════════════════════════════════
//  PLANOS · Herramientas, colores, menús, pantalla completa y zoom
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { boundsAll } from './blueprint-geometry.js';
import { _ctx, SHAPES, SYMBOLS, TOOLS_TOP, M } from './blueprint-estado.js';
import { resize } from './blueprint-motor.js';
import { hideFloatingMeasure, hideMeasureCell, screenToWorld } from './blueprint-raton.js';
import { commitPolyline } from './blueprint-teclado.js';
import { commit } from './blueprint-historial.js';
import { draw } from './blueprint-render.js';

// Colors
export const updateStrokeUI = () => {
    document.querySelectorAll('#bp-stroke-colors .bp-color[data-c]').forEach(b => {
        b.classList.toggle('active', b.dataset.c === _ctx.strokeColor);
    });
};

export const fillUI = () => {
    document.querySelectorAll('#bp-fill-colors .bp-color').forEach(b => {
        b.classList.toggle('active', b.dataset.c === _ctx.fillColor);
    });
};

export function applyColorToSelected() {
    if (_ctx.selected === null) return;
    const sh = _ctx.shapes[_ctx.selected];
    sh.stroke = _ctx.strokeColor;
    if (sh.type === 'text') sh.color = _ctx.strokeColor;
    commit();
}

export function applyFillToSelected() {
    if (_ctx.selected === null) return;
    const sh = _ctx.shapes[_ctx.selected];
    if (['rect', 'circle', 'ellipse', 'triangle', 'polygon'].includes(sh.type)) {
        sh.fill = _ctx.fillEnabled ? _ctx.fillColor : null;
        commit();
    }
}

// ── Funciones internas que dependen del scope ──
export function setTool(id) {
    _ctx.tool = id;
    _ctx.selected = null;
    _ctx.creating = null;
    _ctx.lineChain = null;
    hideFloatingMeasure(); hideMeasureCell();
    if (_ctx.polylineChain) commitPolyline(false);
    document.querySelectorAll('.bp-tool[data-tool]').forEach(b => {
        b.classList.toggle('active', b.dataset.tool === id);
    });
    const toolName = (() => {
        if (id === 'shape') {
            const v = SHAPES.find(s => s.id === _ctx.shapeVariant);
            return v ? `Forma: ${v.name}` : 'Forma';
        }
        if (id === 'symbol') {
            const v = SYMBOLS.find(s => s.id === _ctx.symbolVariant);
            return v ? `Símbolo: ${v.name}` : 'Símbolo';
        }
        return TOOLS_TOP.find(t => t.id === id)?.name || id;
    })();
    document.getElementById('bp-tool-name').textContent = toolName;
    M.canvas.style.cursor = id === 'select' ? 'default' : id === 'hand' ? 'grab' : 'crosshair';
    draw();
}

export function updateShapeIcon() {
    const btn = document.querySelector('.bp-tool[data-tool="shape"] svg');
    if (!btn) return;
    const v = SHAPES.find(s => s.id === _ctx.shapeVariant);
    if (v) btn.innerHTML = v.icon;
}

export function toggleDropdown(name, anchor) {
    const dd = document.getElementById('bp-dropdown-' + name);
    const isOpen = dd.classList.contains('open');
    closeDropdowns();
    if (!isOpen) {
        const rect = anchor.getBoundingClientRect();
        dd.style.left = (rect.right + 8) + 'px';
        dd.style.top = rect.top + 'px';
        dd.classList.add('open');
    }
}

export function closeDropdowns() {
    document.querySelectorAll('.bp-dropdown.open').forEach(d => d.classList.remove('open'));
}

export function toggleFullscreen() {
    _ctx.fullscreen = !_ctx.fullscreen;

    if (_ctx.fullscreen) {
        // PORTAL → mover el editor a <body> para escapar cualquier
        // contenedor con transform/filter/overflow que rompa position:fixed.
        // Dejamos un placeholder para poder regresarlo a su lugar.
        let placeholder = document.getElementById('bp-fs-placeholder');
        if (placeholder) placeholder.remove();
        placeholder = document.createElement('div');
        placeholder.id = 'bp-fs-placeholder';
        placeholder.style.display = 'none';
        if (M.editorRoot.parentNode) {
            M.editorRoot.parentNode.insertBefore(placeholder, M.editorRoot);
        }
        document.body.appendChild(M.editorRoot);
        M.editorRoot.classList.add('bp-fs');
    } else {
        M.editorRoot.classList.remove('bp-fs');
        const placeholder = document.getElementById('bp-fs-placeholder');
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(M.editorRoot, placeholder);
            placeholder.remove();
        }
    }
    document.body.classList.toggle('bp-fs-body', _ctx.fullscreen);
    // Múltiples resizes para asegurar que el canvas se ajusta
    // después del cambio de layout y reparenting.
    requestAnimationFrame(() => {
        resize();
        setTimeout(resize, 100);
        setTimeout(resize, 300);
    });
}

export function toggleRulers() {
    M.rulerX.style.display = _ctx.showRulers ? '' : 'none';
    M.rulerY.style.display = _ctx.showRulers ? '' : 'none';
    document.querySelector('.bp-ruler-corner').style.display = _ctx.showRulers ? '' : 'none';
    document.querySelector('.bp-canvas-area').classList.toggle('no-rulers', !_ctx.showRulers);
}

export function zoomBy(factor) {
    const cx = M.canvas.clientWidth / 2;
    const cy = M.canvas.clientHeight / 2;
    const before = screenToWorld(cx, cy);
    _ctx.view.zoom = Math.max(0.2, Math.min(8, _ctx.view.zoom * factor));
    const after = screenToWorld(cx, cy);
    _ctx.view.x += (after.x - before.x) * _ctx.view.zoom;
    _ctx.view.y += (after.y - before.y) * _ctx.view.zoom;
    document.getElementById('bp-zoom-val').textContent = Math.round(_ctx.view.zoom * 100) + '%';
    draw();
}

export function zoomFit() {
    const b = boundsAll(_ctx.shapes);
    if (!b) { _ctx.view = { x: 0, y: 0, zoom: 1 }; document.getElementById('bp-zoom-val').textContent = '100%'; draw(); return; }
    const padding = 80;
    const cw = M.canvas.clientWidth - padding * 2;
    const ch = M.canvas.clientHeight - padding * 2;
    const z = Math.min(cw / (b.w || 1), ch / (b.h || 1), 4);
    _ctx.view.zoom = Math.max(0.2, z);
    _ctx.view.x = padding - b.x * _ctx.view.zoom + (cw - b.w * _ctx.view.zoom) / 2;
    _ctx.view.y = padding - b.y * _ctx.view.zoom + (ch - b.h * _ctx.view.zoom) / 2;
    document.getElementById('bp-zoom-val').textContent = Math.round(_ctx.view.zoom * 100) + '%';
    draw();
}

export function updateOrthoIndicator() {
    const el = document.getElementById('bp-ortho-mode');
    const state = el?.querySelector('.bp-status-state');
    if (state) {
        state.textContent = _ctx.shiftDown ? 'ON' : 'OFF';
        el.classList.toggle('active', _ctx.shiftDown);
    }
}
