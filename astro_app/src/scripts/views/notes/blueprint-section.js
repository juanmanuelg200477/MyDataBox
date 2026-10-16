// ════════════════════════════════════════════════════════════════
//  PLANOS — Canvas 2D técnico profesional estilo AutoCAD
//
//  Features:
//   ─ Herramientas agrupadas: Select, Hand (pan), Shapes ▾, Symbols ▾, Text, Pen, Eraser
//   ─ Línea continua (polilínea AutoCAD): clic-clic-clic... ESC para terminar
//   ─ Edición inline de texto en el canvas (sin popup)
//   ─ Nodos/grips arrastrables en figuras seleccionadas
//   ─ Biblioteca de símbolos de red (router, switch, cámara IP, NVR, AP, etc.)
//   ─ Pantalla completa con botón X
//   ─ Medidas en px / mm / cm + ángulo en tiempo real
//   ─ Detección de polígonos cerrados → relleno
//   ─ Rulers + crosshair + status bar profesional
//   ─ Shift: ortogonal (0°/45°/90°)
//   ─ Espacio o herramienta Hand: pan
//   ─ Rueda: zoom centrado en cursor
//   ─ Ctrl+Z/Y: undo/redo
//
//  Este archivo es la entrada y la lista de planos. El editor está
//  repartido en blueprint-*.js: estado, editor (estructura), motor,
//  raton, movimiento, teclado, herramientas, historial, seleccion,
//  render y export; además de draw, geometry y styles.
// ════════════════════════════════════════════════════════════════
import { getState, createDrawing, updateSettings, listDrawings, getDrawing, deleteDrawing } from '../../notesStore.js';
import { nwPrompt, toast, escapeHtml, formatDate, nwConfirm } from './notesApp.js';
import { injectStyles } from './blueprint-styles.js';
import { fijarCtx, _ctx } from './blueprint-estado.js';
import { renderEditor } from './blueprint-editor.js';

// ════════════════════════════════════════════════════════════════
//  ENTRY
// ════════════════════════════════════════════════════════════════
export function renderPlanos(host) {
    host.innerHTML = `
        <div class="nws nws-bp">
            <aside class="nws-side bp-sidebar">
                <div class="nws-side-hdr">
                    <span class="nws-side-title">Planos</span>
                    <button class="nws-iconbtn" id="bp-new" title="Nuevo plano">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <div class="nws-side-list" id="bp-list"></div>
            </aside>

            <section class="nws-main">
                <div id="bp-editor"></div>
            </section>
        </div>
    `;

    injectStyles();

    fijarCtx({
        activeDrawingId:  getState().settings.activeDrawingId,
        tool:             'select',
        shapeVariant:     'line',         // variante activa de Formas
        symbolVariant:    'router',       // variante activa de Símbolos
        strokeColor:      '#0f172a',
        strokeWidth:      2,
        fillEnabled:      false,
        fillColor:        '#3b82f6',
        snap:             true,
        gridSize:         20,
        showGrid:         true,
        showRulers:       true,
        shapes:           [],
        selected:         null,            // índice del shape seleccionado
        history:          [],
        historyIdx:       -1,
        shiftDown:        false,
        spaceDown:        false,
        view:             { x: 0, y: 0, zoom: 1 },
        drag:             null,
        creating:         null,            // shape en construcción
        cursor:           { x: 0, y: 0, sx: 0, sy: 0, inside: false },
        polylineChain:    null,            // polígono continuo: { points: [], cur, stroke, strokeWidth }
        lineChain:        null,            // línea AutoCAD: { last: {x,y}, preview: {x,y} } — cada click = línea individual
        hoverHandle:      null,            // { shapeIdx, handleIdx } cuando se hover un nodo
        fullscreen:       false,
        textEditing:      null             // div contenteditable activo durante edición de texto
    });

    document.getElementById('bp-new').onclick = createNewDrawing;
    renderList();
    renderEditor();
}

// ════════════════════════════════════════════════════════════════
//  Lista de planos
// ════════════════════════════════════════════════════════════════
async function createNewDrawing() {
    const name = await nwPrompt({
        title: 'Nuevo plano',
        icon: 'plan',
        label: 'Nombre del plano',
        placeholder: 'Diagrama de red, plano de oficina...',
        defaultValue: 'Plano sin título',
        okText: 'Crear plano'
    });
    if (!name) return;
    const dr = createDrawing({ name: name.trim() });
    _ctx.activeDrawingId = dr.id;
    updateSettings({ activeDrawingId: dr.id });
    renderList();
    renderEditor();
    toast('Plano creado', 'success');
}

export function renderList() {
    const host = document.getElementById('bp-list');
    const drawings = listDrawings();
    if (!drawings.length) {
        host.innerHTML = '<div class="bp-side-empty">Sin planos. Crea el primero →</div>';
        return;
    }
    host.innerHTML = drawings
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .map(d => `
            <div class="bp-item ${d.id === _ctx.activeDrawingId ? 'active' : ''}" data-id="${d.id}">
                <div class="bp-item-thumb">${d.thumbnail ? `<img src="${d.thumbnail}" alt="">` : `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2v18l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2 2-2V2z"/></svg>
                `}</div>
                <div class="bp-item-body">
                    <div class="bp-item-name">${escapeHtml(d.name)}</div>
                    <div class="bp-item-meta">${d.shapesCount} elementos · ${formatDate(d.updatedAt)}</div>
                </div>
                <button class="bp-item-del" data-del="${d.id}" title="Eliminar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
            </div>
        `).join('');

    host.querySelectorAll('.bp-item').forEach(el => {
        el.onclick = e => {
            if (e.target.closest('.bp-item-del')) return;
            _ctx.activeDrawingId = el.dataset.id;
            updateSettings({ activeDrawingId: el.dataset.id });
            renderList();
            renderEditor();
        };
    });
    host.querySelectorAll('.bp-item-del').forEach(b => {
        b.onclick = async e => {
            e.stopPropagation();
            const id = b.dataset.del;
            const d = getDrawing(id);
            const ok = await nwConfirm({
                title: 'Eliminar plano',
                message: `¿Eliminar "${d.name}"? Esta acción no se puede deshacer.`,
                okText: 'Eliminar', danger: true, icon: 'trash'
            });
            if (!ok) return;
            deleteDrawing(id);
            if (_ctx.activeDrawingId === id) _ctx.activeDrawingId = null;
            renderList(); renderEditor();
            toast('Plano eliminado', 'success');
        };
    });
}

export function groupBy(arr, key) {
    const map = new Map();
    arr.forEach(item => {
        if (!map.has(item[key])) map.set(item[key], []);
        map.get(item[key]).push(item);
    });
    return Array.from(map.entries());
}
