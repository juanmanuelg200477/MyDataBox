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
// ════════════════════════════════════════════════════════════════

import {
    listDrawings, getDrawing, createDrawing, updateDrawing, deleteDrawing, getState, updateSettings
} from '../../notesStore.js';
import { escapeHtml, formatDate, toast, nwPrompt, nwConfirm } from './notesApp.js';
import { shapeBounds, boundsAll, distPointToSegment, pointInPolygon, translateShape, getHandles, moveHandle } from './blueprint-geometry.js';
import { drawSymbol, roundRect, arrowHead, drawArrow } from './blueprint-draw.js';
import { injectStyles } from './blueprint-styles.js';

// ── Constantes ──────────────────────────────────────────────────
const PX_PER_MM = 96 / 25.4;          // 96 DPI estándar: 1 mm ≈ 3.78 px
export const RULER_SIZE = 22;
const HANDLE_SIZE = 8;                // tamaño visual del grip
const CLOSE_THRESHOLD = 12;           // distancia en px para cerrar polilínea

const STROKE_COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

// Herramientas principales del rail izquierdo
const TOOLS_TOP = [
    { id: 'select', name: 'Seleccionar',         key: 'S', icon: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>' },
    { id: 'hand',   name: 'Mover lienzo (Pan)',  key: 'H', icon: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>' },
    { id: 'shape',  name: 'Formas',              key: 'R', icon: '<rect x="3" y="3" width="8" height="8"/><circle cx="17" cy="7" r="4"/><polygon points="12 14 5 21 19 21"/>', dropdown: 'shapes' },
    { id: 'symbol', name: 'Símbolos de red',     key: 'N', icon: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>', dropdown: 'symbols' },
    { id: 'text',   name: 'Texto',               key: 'T', icon: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>' },
    { id: 'pen',    name: 'Mano alzada',         key: 'F', icon: '<path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>' },
    { id: 'eraser', name: 'Borrar',              key: 'E', icon: '<path d="M20 20H7L3 16a2 2 0 010-2.83L13.17 3a2 2 0 012.83 0l5 5a2 2 0 010 2.83L11 20"/>' }
];

// Variantes del dropdown de Formas
const SHAPES = [
    { id: 'line',     name: 'Línea',           desc: 'Cada click = segmento · ESC = fin', icon: '<line x1="4" y1="20" x2="20" y2="4"/>' },
    { id: 'polygon',  name: 'Polígono',        desc: 'Conectado · Enter = cerrar',         icon: '<polygon points="12 3 22 9 19 22 5 22 2 9"/>' },
    { id: 'rect',     name: 'Rectángulo',      desc: 'Shift = cuadrado',                   icon: '<rect x="3" y="3" width="18" height="18"/>' },
    { id: 'circle',   name: 'Círculo',         desc: 'Desde centro',                       icon: '<circle cx="12" cy="12" r="10"/>' },
    { id: 'ellipse',  name: 'Elipse',          desc: 'Eje X/Y libres',                     icon: '<ellipse cx="12" cy="12" rx="10" ry="6"/>' },
    { id: 'triangle', name: 'Triángulo',       desc: 'Equilátero',                         icon: '<polygon points="12 3 22 21 2 21"/>' },
    { id: 'arrow',    name: 'Flecha',          desc: 'Dirección',                          icon: '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/>' }
];

// Variantes del dropdown de Símbolos de red (más adelante define cómo se dibujan)
const SYMBOLS = [
    // Core network
    { id: 'router',    name: 'Router',          cat: 'Core',     defaultSize: 64 },
    { id: 'switch',    name: 'Switch',          cat: 'Core',     defaultSize: 80 },
    { id: 'firewall',  name: 'Firewall',        cat: 'Core',     defaultSize: 64 },
    { id: 'modem',     name: 'Módem / ONT',     cat: 'Core',     defaultSize: 64 },
    // Servidores
    { id: 'server',    name: 'Servidor',        cat: 'Compute',  defaultSize: 56 },
    { id: 'nvr',       name: 'NVR / DVR',       cat: 'Compute',  defaultSize: 60 },
    // Video
    { id: 'cam_dome',  name: 'Cámara Domo',     cat: 'Video',    defaultSize: 48 },
    { id: 'cam_bullet',name: 'Cámara Bullet',   cat: 'Video',    defaultSize: 48 },
    // Wireless
    { id: 'ap',        name: 'Access Point',    cat: 'Wireless', defaultSize: 50 },
    { id: 'antenna',   name: 'Antena',          cat: 'Wireless', defaultSize: 50 },
    // Endpoint
    { id: 'pc',        name: 'PC',              cat: 'Endpoint', defaultSize: 56 },
    { id: 'laptop',    name: 'Laptop',          cat: 'Endpoint', defaultSize: 56 },
    { id: 'phone',     name: 'Teléfono IP',     cat: 'Endpoint', defaultSize: 48 },
    { id: 'printer',   name: 'Impresora',       cat: 'Endpoint', defaultSize: 56 },
    // Infraestructura
    { id: 'rack',      name: 'Rack',            cat: 'Infra',    defaultSize: 56 },
    { id: 'ups',       name: 'UPS / SAI',       cat: 'Infra',    defaultSize: 50 },
    { id: 'patch',     name: 'Patch Panel',     cat: 'Infra',    defaultSize: 70 },
    // Red externa
    { id: 'cloud',     name: 'Nube',            cat: 'WAN',      defaultSize: 70 },
    { id: 'internet',  name: 'Internet',        cat: 'WAN',      defaultSize: 70 }
];

// ── Conversión de unidades ──────────────────────────────────────
function pxToMm(px)  { return px / PX_PER_MM; }
function pxToCm(px)  { return px / (PX_PER_MM * 10); }
function fmtLen(px)  {
    const mm = pxToMm(px);
    if (mm >= 10) return `${pxToCm(px).toFixed(2)} cm`;
    return `${mm.toFixed(1)} mm`;
}
function fmtLenFull(px) {
    return `${Math.round(px)} px · ${pxToMm(px).toFixed(1)} mm · ${pxToCm(px).toFixed(2)} cm`;
}

// ── Estado global del editor ────────────────────────────────────
let _ctx = null;

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

    _ctx = {
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
    };

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

function renderList() {
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

// ════════════════════════════════════════════════════════════════
//  Editor — UI HTML
// ════════════════════════════════════════════════════════════════
function renderEditor() {
    const host = document.getElementById('bp-editor');

    // Buscar el dibujo activo (si lo hay)
    const drawing = _ctx.activeDrawingId ? getDrawing(_ctx.activeDrawingId) : null;

    // Si no hay dibujo válido → mostrar empty state.
    // Esto cubre tanto "nunca seleccionado" como "ID guardado pero plano eliminado".
    if (!drawing) {
        // Limpiar referencia a un plano que ya no existe para no quedar
        // atascados intentando renderizarlo en próximas visitas.
        if (_ctx.activeDrawingId) {
            _ctx.activeDrawingId = null;
            updateSettings({ activeDrawingId: null });
        }
        host.innerHTML = `
            <div class="nws-empty">
                <div class="nws-empty-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2v18l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2 2-2V2z"/><line x1="7" y1="8" x2="17" y2="8"/></svg>
                </div>
                <div class="nws-empty-title">Empieza a crear</div>
            </div>
        `;
        return;
    }

    _ctx.shapes      = (drawing.data?.shapes || []).map(s => ({ ...s }));
    _ctx.gridSize    = drawing.data?.gridSize || 20;
    _ctx.showGrid    = drawing.data?.showGrid !== false;
    _ctx.selected    = null;
    _ctx.history     = [JSON.stringify(_ctx.shapes)];
    _ctx.historyIdx  = 0;
    _ctx.polylineChain = null;
    _ctx.lineChain   = null;

    host.innerHTML = `
        <div class="bp-editor" id="bp-editor-root">

            <!-- ── TOP BAR ── -->
            <header class="bp-top">
                <div class="bp-top-left">
                    <input type="text" id="bp-name" class="bp-name-input" value="${escapeHtml(drawing.name)}" placeholder="Nombre del plano">
                </div>
                <div class="bp-top-right">
                    <div class="bp-tg">
                        <button class="bp-tbtn" id="bp-undo" title="Deshacer (Ctrl+Z)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        </button>
                        <button class="bp-tbtn" id="bp-redo" title="Rehacer (Ctrl+Y)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        </button>
                    </div>
                    <div class="bp-tg">
                        <button class="bp-tbtn" id="bp-zoom-in" title="Acercar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                        </button>
                        <button class="bp-tbtn" id="bp-zoom-out" title="Alejar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                        </button>
                        <button class="bp-tbtn" id="bp-zoom-fit" title="Ajustar a pantalla">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                        </button>
                        <button class="bp-tbtn" id="bp-fullscreen" title="Pantalla completa">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                        </button>
                    </div>
                    <div class="bp-tg">
                        <button class="bp-tbtn bp-export" id="bp-export-png" title="Exportar PNG">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            <span>PNG</span>
                        </button>
                        <button class="bp-tbtn bp-export" id="bp-export-svg" title="Exportar SVG">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
                            <span>SVG</span>
                        </button>
                    </div>
                </div>
            </header>

            <!-- ── WORKSPACE ── -->
            <div class="bp-workspace">
                <!-- Rail izquierdo de herramientas -->
                <div class="bp-toolbar">
                    ${TOOLS_TOP.map(t => `
                        <button class="bp-tool ${t.dropdown ? 'bp-has-dropdown' : ''}" data-tool="${t.id}" title="${t.name} (${t.key})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
                            <span class="bp-tool-kbd">${t.key}</span>
                            ${t.dropdown ? '<span class="bp-tool-caret"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg></span>' : ''}
                        </button>
                    `).join('')}
                </div>

                <!-- Canvas area con rulers -->
                <div class="bp-canvas-area">
                    <div class="bp-ruler-corner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2v18l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2 2-2V2z"/></svg>
                    </div>
                    <canvas id="bp-ruler-x" class="bp-ruler bp-ruler-x"></canvas>
                    <canvas id="bp-ruler-y" class="bp-ruler bp-ruler-y"></canvas>
                    <div class="bp-canvas-wrap" id="bp-canvas-wrap">
                        <canvas id="bp-canvas"></canvas>
                        <!-- Crosshair que sigue el cursor -->
                        <div class="bp-crosshair" id="bp-crosshair">
                            <div class="bp-crosshair-x"></div>
                            <div class="bp-crosshair-y"></div>
                        </div>
                        <!-- Tooltip flotante de medidas -->
                        <div class="bp-measure-tip" id="bp-measure-tip"></div>
                        <!-- Exit fullscreen -->
                        <button class="bp-fullscreen-exit" id="bp-fullscreen-exit" title="Salir de pantalla completa (Esc)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Panel de propiedades -->
                <aside class="bp-props">
                    <div class="bp-props-section">
                        <div class="bp-props-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><polyline points="14 7 21 7 21 14"/></svg>
                            <span>Trazo</span>
                        </div>
                        <div class="bp-color-row" id="bp-stroke-colors">
                            ${STROKE_COLORS.map(c => `<button class="bp-color" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}
                            <label class="bp-color bp-color-custom" title="Color personalizado">
                                <input type="color" id="bp-stroke-custom" value="#0f172a">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>
                            </label>
                        </div>
                        <label class="bp-input-row">
                            <span>Grosor</span>
                            <input type="range" id="bp-stroke-width" min="1" max="12" value="2">
                            <span id="bp-stroke-width-val">2px</span>
                        </label>
                    </div>

                    <div class="bp-props-section">
                        <div class="bp-props-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity=".15"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                            <span>Relleno</span>
                        </div>
                        <label class="bp-check">
                            <input type="checkbox" id="bp-fill-on">
                            <span>Activar relleno</span>
                        </label>
                        <div class="bp-color-row" id="bp-fill-colors">
                            ${STROKE_COLORS.map(c => `<button class="bp-color" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}
                        </div>
                    </div>

                    <div class="bp-props-section">
                        <div class="bp-props-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                            <span>Cuadrícula</span>
                        </div>
                        <label class="bp-check">
                            <input type="checkbox" id="bp-grid-show" ${_ctx.showGrid ? 'checked' : ''}>
                            <span>Mostrar grid</span>
                        </label>
                        <label class="bp-check">
                            <input type="checkbox" id="bp-snap" checked>
                            <span>Snap a grid</span>
                        </label>
                        <label class="bp-check">
                            <input type="checkbox" id="bp-rulers-show" checked>
                            <span>Mostrar reglas</span>
                        </label>
                        <label class="bp-input-row">
                            <span>Tamaño</span>
                            <input type="range" id="bp-grid-size" min="10" max="60" step="5" value="${_ctx.gridSize}">
                            <span id="bp-grid-size-val">${_ctx.gridSize}px</span>
                        </label>
                    </div>

                </aside>
            </div>

            <!-- ── STATUS BAR ── -->
            <footer class="bp-status">
                <div class="bp-status-cell bp-status-tool">
                    <span class="bp-status-lbl">HERRAMIENTA</span>
                    <span id="bp-tool-name">Seleccionar</span>
                </div>
                <div class="bp-status-cell">
                    <span class="bp-status-lbl">X, Y</span>
                    <span id="bp-coords">0, 0</span>
                </div>
                <div class="bp-status-cell" id="bp-measure-cell" style="display:none">
                    <span class="bp-status-lbl">MEDIDA</span>
                    <span id="bp-measure">—</span>
                </div>
                <div class="bp-status-cell">
                    <span class="bp-status-lbl">ZOOM</span>
                    <span id="bp-zoom-val">100%</span>
                </div>
                <div class="bp-status-cell">
                    <span class="bp-status-lbl">ELEMENTOS</span>
                    <span id="bp-count">${_ctx.shapes.length}</span>
                </div>
                <div class="bp-status-cell bp-status-mode" id="bp-ortho-mode">
                    <span class="bp-status-lbl">ORTO</span>
                    <span class="bp-status-state">OFF</span>
                </div>
                <div class="bp-status-cell bp-status-flex">
                    <span class="bp-status-lbl">ESTADO</span>
                    <span id="bp-save-status"><span class="bp-status-dot"></span> Sincronizado</span>
                </div>
            </footer>

            <!-- Dropdowns flotantes (DENTRO del root para que viajen con fullscreen) -->
            <div class="bp-dropdown" id="bp-dropdown-shapes">
                <div class="bp-dd-title">Formas geométricas</div>
                <div class="bp-dd-grid">
                    ${SHAPES.map(s => `
                        <button class="bp-dd-item" data-variant="${s.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg>
                            <div class="bp-dd-info">
                                <span class="bp-dd-name">${s.name}</span>
                                <span class="bp-dd-desc">${s.desc}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="bp-dropdown bp-dropdown-symbols" id="bp-dropdown-symbols">
                <div class="bp-dd-title">Símbolos de red</div>
                ${groupBy(SYMBOLS, 'cat').map(([cat, items]) => `
                    <div class="bp-dd-cat">
                        <div class="bp-dd-cat-name">${cat}</div>
                        <div class="bp-dd-symbols-grid">
                            ${items.map(s => `
                                <button class="bp-dd-symbol" data-variant="${s.id}" title="${s.name}">
                                    <span class="bp-dd-sym-preview" data-sym="${s.id}"></span>
                                    <span class="bp-dd-sym-name">${s.name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    initCanvasEngine();
}

function groupBy(arr, key) {
    const map = new Map();
    arr.forEach(item => {
        if (!map.has(item[key])) map.set(item[key], []);
        map.get(item[key]).push(item);
    });
    return Array.from(map.entries());
}

// ════════════════════════════════════════════════════════════════
//  CANVAS ENGINE — el motor principal
// ════════════════════════════════════════════════════════════════
function initCanvasEngine() {
    const canvas = document.getElementById('bp-canvas');
    const wrap = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const rulerX = document.getElementById('bp-ruler-x');
    const rulerY = document.getElementById('bp-ruler-y');
    const crosshair = document.getElementById('bp-crosshair');
    const measureTip = document.getElementById('bp-measure-tip');
    const editorRoot = document.getElementById('bp-editor-root');

    let dpr = window.devicePixelRatio || 1;

    // ── Resize ───────────────────────────────────────────────
    const resize = () => {
        dpr = window.devicePixelRatio || 1;
        const rect = wrap.getBoundingClientRect();
        canvas.width  = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width  = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (rulerX) {
            rulerX.width = rect.width * dpr; rulerX.height = RULER_SIZE * dpr;
            rulerX.style.width = rect.width + 'px'; rulerX.style.height = RULER_SIZE + 'px';
            rulerX.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        if (rulerY) {
            rulerY.width = RULER_SIZE * dpr; rulerY.height = rect.height * dpr;
            rulerY.style.width = RULER_SIZE + 'px'; rulerY.style.height = rect.height + 'px';
            rulerY.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ── Helpers ──────────────────────────────────────────────
    const screenToWorld = (sx, sy) => ({
        x: (sx - _ctx.view.x) / _ctx.view.zoom,
        y: (sy - _ctx.view.y) / _ctx.view.zoom
    });
    const snap = v => _ctx.snap ? Math.round(v / _ctx.gridSize) * _ctx.gridSize : v;
    const constrainShift = (x0, y0, x1, y1) => {
        const dx = x1 - x0, dy = y1 - y0;
        const angle = Math.atan2(dy, dx);
        const step = Math.PI / 4;
        const a2 = Math.round(angle / step) * step;
        const len = Math.hypot(dx, dy);
        return { x: x0 + Math.cos(a2) * len, y: y0 + Math.sin(a2) * len };
    };

    // ── Helpers UI ──────────────────────────────────────────
    const showMeasureCell = (text) => {
        const cell = document.getElementById('bp-measure-cell');
        const m = document.getElementById('bp-measure');
        if (m) { m.textContent = text; cell.style.display = 'flex'; }
    };
    const hideMeasureCell = () => { document.getElementById('bp-measure-cell').style.display = 'none'; };
    const showFloatingMeasure = (text, sx, sy) => {
        measureTip.textContent = text;
        measureTip.style.left = (sx + 18) + 'px';
        measureTip.style.top = (sy - 32) + 'px';
        measureTip.classList.add('show');
    };
    const hideFloatingMeasure = () => measureTip.classList.remove('show');

    // ── Eventos del canvas ──────────────────────────────────
    canvas.addEventListener('mouseenter', () => { _ctx.cursor.inside = true; updateCrosshair(); });
    canvas.addEventListener('mouseleave', () => {
        _ctx.cursor.inside = false;
        crosshair.style.opacity = '0';
        hideFloatingMeasure();
        updateRulers();
    });

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    function onMouseDown(e) {
        if (_ctx.textEditing) return; // mientras se edita texto, no recibir clicks
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const w = screenToWorld(sx, sy);

        // Pan: espacio, herramienta Hand, o botón medio
        if (_ctx.spaceDown || _ctx.tool === 'hand' || e.button === 1) {
            _ctx.drag = { type: 'pan', startX: sx, startY: sy, viewX: _ctx.view.x, viewY: _ctx.view.y };
            canvas.style.cursor = 'grabbing';
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

    function onMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
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

    function onMouseUp(e) {
        if (_ctx.drag?.type === 'pan') { canvas.style.cursor = _ctx.tool === 'hand' ? 'grab' : ''; _ctx.drag = null; return; }
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

    function onDblClick(e) {
        // En polilínea, doble click cierra/termina
        if (_ctx.polylineChain) {
            commitPolyline(false);
        }
    }

    function onWheel(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
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

    function updateCrosshair() {
        if (!_ctx.cursor.inside) return;
        crosshair.style.opacity = '1';
        crosshair.querySelector('.bp-crosshair-x').style.top = _ctx.cursor.sy + 'px';
        crosshair.querySelector('.bp-crosshair-y').style.left = _ctx.cursor.sx + 'px';
    }

    // Detectar hover sobre handles para cambiar cursor
    function updateHoverHandle(sx, sy) {
        if (_ctx.tool !== 'select' || _ctx.selected === null) {
            _ctx.hoverHandle = null;
            canvas.style.cursor = canvas.style.cursor; // mantener
            return;
        }
        const handles = getHandles(_ctx.shapes[_ctx.selected]);
        for (let hi = 0; hi < handles.length; hi++) {
            const h = handles[hi];
            const sxw = h.x * _ctx.view.zoom + _ctx.view.x;
            const syw = h.y * _ctx.view.zoom + _ctx.view.y;
            if (Math.abs(sxw - sx) <= HANDLE_SIZE && Math.abs(syw - sy) <= HANDLE_SIZE) {
                _ctx.hoverHandle = { handleIdx: hi };
                canvas.style.cursor = h.cursor || 'pointer';
                return;
            }
        }
        _ctx.hoverHandle = null;
        if (_ctx.tool === 'select') canvas.style.cursor = 'default';
    }

    function commitPolyline(closed) {
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
    function startInlineText(wx, wy) {
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

        wrap.appendChild(editor);

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
    const onKeyDown = e => {
        if (e.target.matches('input, textarea, [contenteditable="true"]')) return;
        if (e.key === 'Shift') { _ctx.shiftDown = true; updateOrthoIndicator(); }
        if (e.code === 'Space') {
            e.preventDefault();
            _ctx.spaceDown = true;
            if (_ctx.tool !== 'hand') canvas.style.cursor = 'grab';
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
    const onKeyUp = e => {
        if (e.key === 'Shift') { _ctx.shiftDown = false; updateOrthoIndicator(); }
        if (e.code === 'Space') {
            _ctx.spaceDown = false;
            if (_ctx.tool !== 'hand') canvas.style.cursor = _ctx.tool === 'select' ? 'default' : 'crosshair';
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const cleanup = () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        ro.disconnect();
    };
    canvas._cleanup = cleanup;

    // ── Toolbar wiring ──────────────────────────────────────
    document.querySelectorAll('.bp-tool[data-tool]').forEach(b => {
        b.onclick = () => {
            const id = b.dataset.tool;
            const tool = TOOLS_TOP.find(t => t.id === id);
            if (tool?.dropdown) {
                toggleDropdown(tool.dropdown, b);
            } else {
                setTool(id);
            }
        };
    });

    // Shapes dropdown wiring
    document.querySelectorAll('#bp-dropdown-shapes .bp-dd-item').forEach(b => {
        b.onclick = () => {
            _ctx.shapeVariant = b.dataset.variant;
            setTool('shape');
            closeDropdowns();
            updateShapeIcon();
        };
    });

    // Symbols dropdown wiring (el ícono WiFi se mantiene fijo)
    document.querySelectorAll('#bp-dropdown-symbols .bp-dd-symbol').forEach(b => {
        b.onclick = () => {
            _ctx.symbolVariant = b.dataset.variant;
            setTool('symbol');
            closeDropdowns();
        };
    });

    // Render previews de símbolos en el dropdown
    document.querySelectorAll('.bp-dd-sym-preview').forEach(el => {
        const id = el.dataset.sym;
        const c = document.createElement('canvas');
        c.width = 48; c.height = 48;
        const cx2 = c.getContext('2d');
        cx2.lineWidth = 1.5;
        drawSymbol(cx2, id, 4, 4, 40, 40, '#0f172a');
        el.appendChild(c);
    });

    // Botones top
    document.getElementById('bp-undo').onclick = undo;
    document.getElementById('bp-redo').onclick = redo;
    document.getElementById('bp-zoom-in').onclick = () => zoomBy(1.2);
    document.getElementById('bp-zoom-out').onclick = () => zoomBy(0.83);
    document.getElementById('bp-zoom-fit').onclick = zoomFit;
    document.getElementById('bp-fullscreen').onclick = toggleFullscreen;
    document.getElementById('bp-fullscreen-exit').onclick = toggleFullscreen;
    document.getElementById('bp-export-png').onclick = () => exportPNG(canvas);
    document.getElementById('bp-export-svg').onclick = exportSVG;

    document.getElementById('bp-name').oninput = e => {
        updateDrawing(_ctx.activeDrawingId, { name: e.target.value });
        renderList();
    };

    // Colors
    const updateStrokeUI = () => {
        document.querySelectorAll('#bp-stroke-colors .bp-color[data-c]').forEach(b => {
            b.classList.toggle('active', b.dataset.c === _ctx.strokeColor);
        });
    };
    document.querySelectorAll('#bp-stroke-colors .bp-color[data-c]').forEach(b => {
        b.onclick = () => { _ctx.strokeColor = b.dataset.c; updateStrokeUI(); applyColorToSelected(); };
    });
    document.getElementById('bp-stroke-custom').oninput = e => {
        _ctx.strokeColor = e.target.value;
        document.querySelectorAll('#bp-stroke-colors .bp-color[data-c]').forEach(b => b.classList.remove('active'));
        applyColorToSelected();
    };
    updateStrokeUI();

    const fillUI = () => {
        document.querySelectorAll('#bp-fill-colors .bp-color').forEach(b => {
            b.classList.toggle('active', b.dataset.c === _ctx.fillColor);
        });
    };
    document.querySelectorAll('#bp-fill-colors .bp-color').forEach(b => {
        b.onclick = () => {
            _ctx.fillColor = b.dataset.c; _ctx.fillEnabled = true;
            document.getElementById('bp-fill-on').checked = true;
            fillUI(); applyFillToSelected();
        };
    });
    document.getElementById('bp-fill-on').onchange = e => {
        _ctx.fillEnabled = e.target.checked;
        applyFillToSelected();
    };
    fillUI();

    function applyColorToSelected() {
        if (_ctx.selected === null) return;
        const sh = _ctx.shapes[_ctx.selected];
        sh.stroke = _ctx.strokeColor;
        if (sh.type === 'text') sh.color = _ctx.strokeColor;
        commit();
    }
    function applyFillToSelected() {
        if (_ctx.selected === null) return;
        const sh = _ctx.shapes[_ctx.selected];
        if (['rect', 'circle', 'ellipse', 'triangle', 'polygon'].includes(sh.type)) {
            sh.fill = _ctx.fillEnabled ? _ctx.fillColor : null;
            commit();
        }
    }

    const swEl = document.getElementById('bp-stroke-width');
    const swVal = document.getElementById('bp-stroke-width-val');
    swEl.oninput = () => {
        _ctx.strokeWidth = +swEl.value;
        swVal.textContent = swEl.value + 'px';
        if (_ctx.selected !== null) {
            _ctx.shapes[_ctx.selected].strokeWidth = _ctx.strokeWidth;
            commit();
        }
    };

    document.getElementById('bp-grid-show').onchange = e => { _ctx.showGrid = e.target.checked; persistDrawing(); draw(); };
    document.getElementById('bp-snap').onchange = e => { _ctx.snap = e.target.checked; };
    document.getElementById('bp-rulers-show').onchange = e => { _ctx.showRulers = e.target.checked; toggleRulers(); };
    const gsEl = document.getElementById('bp-grid-size');
    const gsVal = document.getElementById('bp-grid-size-val');
    gsEl.oninput = () => {
        _ctx.gridSize = +gsEl.value;
        gsVal.textContent = _ctx.gridSize + 'px';
        persistDrawing(); draw();
    };

    setTool('select');
    updateShapeIcon();
    draw();

    // Cerrar dropdowns al click fuera
    document.addEventListener('click', e => {
        if (!e.target.closest('.bp-tool') && !e.target.closest('.bp-dropdown')) {
            closeDropdowns();
        }
    });

    // ── Funciones internas que dependen del scope ──
    function setTool(id) {
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
        canvas.style.cursor = id === 'select' ? 'default' : id === 'hand' ? 'grab' : 'crosshair';
        draw();
    }

    function updateShapeIcon() {
        const btn = document.querySelector('.bp-tool[data-tool="shape"] svg');
        if (!btn) return;
        const v = SHAPES.find(s => s.id === _ctx.shapeVariant);
        if (v) btn.innerHTML = v.icon;
    }
    function toggleDropdown(name, anchor) {
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
    function closeDropdowns() {
        document.querySelectorAll('.bp-dropdown.open').forEach(d => d.classList.remove('open'));
    }

    function toggleFullscreen() {
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
            if (editorRoot.parentNode) {
                editorRoot.parentNode.insertBefore(placeholder, editorRoot);
            }
            document.body.appendChild(editorRoot);
            editorRoot.classList.add('bp-fs');
        } else {
            editorRoot.classList.remove('bp-fs');
            const placeholder = document.getElementById('bp-fs-placeholder');
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.insertBefore(editorRoot, placeholder);
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

    function toggleRulers() {
        rulerX.style.display = _ctx.showRulers ? '' : 'none';
        rulerY.style.display = _ctx.showRulers ? '' : 'none';
        document.querySelector('.bp-ruler-corner').style.display = _ctx.showRulers ? '' : 'none';
        document.querySelector('.bp-canvas-area').classList.toggle('no-rulers', !_ctx.showRulers);
    }

    function zoomBy(factor) {
        const cx = canvas.clientWidth / 2;
        const cy = canvas.clientHeight / 2;
        const before = screenToWorld(cx, cy);
        _ctx.view.zoom = Math.max(0.2, Math.min(8, _ctx.view.zoom * factor));
        const after = screenToWorld(cx, cy);
        _ctx.view.x += (after.x - before.x) * _ctx.view.zoom;
        _ctx.view.y += (after.y - before.y) * _ctx.view.zoom;
        document.getElementById('bp-zoom-val').textContent = Math.round(_ctx.view.zoom * 100) + '%';
        draw();
    }

    function zoomFit() {
        const b = boundsAll(_ctx.shapes);
        if (!b) { _ctx.view = { x: 0, y: 0, zoom: 1 }; document.getElementById('bp-zoom-val').textContent = '100%'; draw(); return; }
        const padding = 80;
        const cw = canvas.clientWidth - padding * 2;
        const ch = canvas.clientHeight - padding * 2;
        const z = Math.min(cw / (b.w || 1), ch / (b.h || 1), 4);
        _ctx.view.zoom = Math.max(0.2, z);
        _ctx.view.x = padding - b.x * _ctx.view.zoom + (cw - b.w * _ctx.view.zoom) / 2;
        _ctx.view.y = padding - b.y * _ctx.view.zoom + (ch - b.h * _ctx.view.zoom) / 2;
        document.getElementById('bp-zoom-val').textContent = Math.round(_ctx.view.zoom * 100) + '%';
        draw();
    }

    function findShapeAt(x, y) {
        for (let i = _ctx.shapes.length - 1; i >= 0; i--) {
            if (shapeHit(_ctx.shapes[i], x, y)) return i;
        }
        return -1;
    }

    function commit() {
        const snapJSON = JSON.stringify(_ctx.shapes);
        _ctx.history = _ctx.history.slice(0, _ctx.historyIdx + 1);
        _ctx.history.push(snapJSON);
        if (_ctx.history.length > 80) _ctx.history.shift();
        _ctx.historyIdx = _ctx.history.length - 1;
        persistDrawing();
        draw();
        document.getElementById('bp-count').textContent = _ctx.shapes.length;
    }
    function undo() {
        if (_ctx.historyIdx > 0) {
            _ctx.historyIdx--;
            _ctx.shapes = JSON.parse(_ctx.history[_ctx.historyIdx]);
            _ctx.selected = null;
            persistDrawing(); draw();
            document.getElementById('bp-count').textContent = _ctx.shapes.length;
        }
    }
    function redo() {
        if (_ctx.historyIdx < _ctx.history.length - 1) {
            _ctx.historyIdx++;
            _ctx.shapes = JSON.parse(_ctx.history[_ctx.historyIdx]);
            _ctx.selected = null;
            persistDrawing(); draw();
            document.getElementById('bp-count').textContent = _ctx.shapes.length;
        }
    }

    function persistDrawing() {
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

    function updateOrthoIndicator() {
        const el = document.getElementById('bp-ortho-mode');
        const state = el?.querySelector('.bp-status-state');
        if (state) {
            state.textContent = _ctx.shiftDown ? 'ON' : 'OFF';
            el.classList.toggle('active', _ctx.shiftDown);
        }
    }

    // ════════════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════════════
    function draw() {
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;
        ctx.fillStyle = '#fefcf7';
        ctx.fillRect(0, 0, cw, ch);
        if (_ctx.showGrid) drawGrid(ctx, cw, ch);

        ctx.save();
        ctx.translate(_ctx.view.x, _ctx.view.y);
        ctx.scale(_ctx.view.zoom, _ctx.view.zoom);

        renderShapes(ctx, _ctx.shapes, _ctx.selected);

        // Shape en construcción
        if (_ctx.creating) {
            ctx.save();
            ctx.globalAlpha = 0.78;
            renderShapes(ctx, [_ctx.creating], null);
            ctx.restore();
        }

        // Línea AutoCAD en construcción: preview del próximo segmento + arco de ángulo
        if (_ctx.lineChain && _ctx.lineChain.preview) {
            const last = _ctx.lineChain.last;
            const cur = _ctx.lineChain.preview;
            ctx.save();
            ctx.strokeStyle = _ctx.strokeColor;
            ctx.lineWidth = _ctx.strokeWidth;
            ctx.setLineDash([6 / _ctx.view.zoom, 4 / _ctx.view.zoom]);
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(cur.x, cur.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            // Marcador del punto de partida
            ctx.fillStyle = _ctx.strokeColor;
            ctx.beginPath();
            ctx.arc(last.x, last.y, 4 / _ctx.view.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // ── Arco del ángulo en la esquina (estilo trigonometría) ──
            // Si el último punto coincide con el extremo de una línea existente,
            // dibujamos el arco entre ambas direcciones.
            const prevDir = findIncomingLineDirection(last);
            const curDir = Math.atan2(cur.y - last.y, cur.x - last.x);
            if (prevDir !== null && Math.hypot(cur.x - last.x, cur.y - last.y) > 5) {
                // prevDir apunta HACIA el vértice; lo invertimos para "salir" del vértice
                const fromAngle = prevDir + Math.PI;
                drawAngleArc(ctx, last, fromAngle, curDir);
            } else if (Math.hypot(cur.x - last.x, cur.y - last.y) > 5) {
                // Primer segmento: ángulo desde la horizontal
                drawAngleArc(ctx, last, 0, curDir);
            }
        }

        // Polilínea en construcción
        if (_ctx.polylineChain) {
            const c = _ctx.polylineChain;
            ctx.save();
            ctx.strokeStyle = c.stroke;
            ctx.lineWidth = c.strokeWidth;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';

            // Segmentos firmes
            ctx.beginPath();
            ctx.moveTo(c.points[0].x, c.points[0].y);
            for (let i = 1; i < c.points.length; i++) ctx.lineTo(c.points[i].x, c.points[i].y);
            ctx.stroke();

            // Segmento preview (línea punteada al cursor)
            if (c.cur) {
                ctx.save();
                ctx.globalAlpha = 0.65;
                ctx.setLineDash([6 / _ctx.view.zoom, 4 / _ctx.view.zoom]);
                ctx.beginPath();
                const last = c.points[c.points.length - 1];
                ctx.moveTo(last.x, last.y);
                ctx.lineTo(c.cur.x, c.cur.y);
                ctx.stroke();
                ctx.restore();
            }

            // Marker en cada vértice
            ctx.fillStyle = c.stroke;
            c.points.forEach((p, i) => {
                const r = (i === 0 ? 5 : 3) / _ctx.view.zoom;
                ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
            });

            // Indicador de cierre cerca del primer punto
            if (c.nearStart && c.points.length >= 2) {
                ctx.save();
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2 / _ctx.view.zoom;
                ctx.beginPath();
                ctx.arc(c.points[0].x, c.points[0].y, 8 / _ctx.view.zoom, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        ctx.restore();
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

    function updateRulers() {
        if (!rulerX || !rulerY || rulerX.style.display === 'none') return;
        const rxctx = rulerX.getContext('2d');
        const ryctx = rulerY.getContext('2d');
        const rxw = rulerX.width / dpr;
        const ryh = rulerY.height / dpr;
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

    function renderShapes(ctx, shapes, selectedIdx) {
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
}

// ────────────────────────────────────────────────────────────────
//  Helpers de geometría
// ────────────────────────────────────────────────────────────────


// Distancia de punto P al segmento AB

// ¿Está el punto dentro del polígono?

// Hit-test PRECISO: solo devuelve true si el click es realmente sobre la figura
function shapeHit(s, x, y) {
    const tol = 6 / (_ctx?.view?.zoom || 1);

    if (s.type === 'line' || s.type === 'arrow') {
        return distPointToSegment({ x, y }, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) < tol;
    }
    if (s.type === 'rect') {
        const x1 = Math.min(s.x, s.x + s.w), x2 = Math.max(s.x, s.x + s.w);
        const y1 = Math.min(s.y, s.y + s.h), y2 = Math.max(s.y, s.y + s.h);
        const outer  = x >= x1 - tol && x <= x2 + tol && y >= y1 - tol && y <= y2 + tol;
        const inner  = x >= x1 + tol && x <= x2 - tol && y >= y1 + tol && y <= y2 - tol;
        return s.fill ? outer : (outer && !inner);
    }
    if (s.type === 'circle') {
        const d = Math.hypot(x - s.cx, y - s.cy);
        return s.fill ? d <= s.r + tol : Math.abs(d - s.r) < tol;
    }
    if (s.type === 'ellipse') {
        // Test elíptico
        const nx = (x - s.cx) / (s.rx || 1);
        const ny = (y - s.cy) / (s.ry || 1);
        const d = Math.hypot(nx, ny);
        const t = tol / Math.min(s.rx || 1, s.ry || 1);
        return s.fill ? d <= 1 + t : Math.abs(d - 1) < t;
    }
    if (s.type === 'triangle') {
        const p1 = { x: s.x + s.w / 2, y: s.y };
        const p2 = { x: s.x + s.w, y: s.y + s.h };
        const p3 = { x: s.x, y: s.y + s.h };
        if (distPointToSegment({ x, y }, p1, p2) < tol) return true;
        if (distPointToSegment({ x, y }, p2, p3) < tol) return true;
        if (distPointToSegment({ x, y }, p3, p1) < tol) return true;
        if (s.fill && pointInPolygon({ x, y }, [p1, p2, p3])) return true;
        return false;
    }
    if (s.type === 'polyline' || s.type === 'polygon' || s.type === 'pen') {
        if (!s.points?.length) return false;
        for (let i = 1; i < s.points.length; i++) {
            if (distPointToSegment({ x, y }, s.points[i - 1], s.points[i]) < tol) return true;
        }
        if (s.closed && s.points.length > 1) {
            if (distPointToSegment({ x, y }, s.points[s.points.length - 1], s.points[0]) < tol) return true;
            if (s.fill && pointInPolygon({ x, y }, s.points)) return true;
        }
        return false;
    }
    if (s.type === 'text' || s.type === 'symbol') {
        const b = shapeBounds(s);
        if (!b) return false;
        return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol;
    }
    return false;
}


// ── Handles/Grips por tipo de figura ───────────────────────────


// ────────────────────────────────────────────────────────────────
//  Símbolos de red — funciones de dibujo
// ────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────
//  Indicador visual de ángulo (estilo trigonometría/AutoCAD)
// ────────────────────────────────────────────────────────────────
function findIncomingLineDirection(point) {
    // Busca una línea cuyo extremo coincida con `point`. Devuelve la
    // dirección que apunta HACIA el vértice (entrante al punto).
    const tol = 0.5;
    for (let i = _ctx.shapes.length - 1; i >= 0; i--) {
        const s = _ctx.shapes[i];
        if (s.type !== 'line' && s.type !== 'arrow') continue;
        if (Math.abs(s.x2 - point.x) < tol && Math.abs(s.y2 - point.y) < tol) {
            return Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        }
        if (Math.abs(s.x1 - point.x) < tol && Math.abs(s.y1 - point.y) < tol) {
            return Math.atan2(s.y1 - s.y2, s.x1 - s.x2);
        }
    }
    return null;
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




// ────────────────────────────────────────────────────────────────
//  Export
// ────────────────────────────────────────────────────────────────
function exportPNG(canvas) {
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = getDrawing(_ctx.activeDrawingId);
        a.download = `${(d?.name || 'plano').replace(/[^a-z0-9]/gi, '_')}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast('PNG exportado', 'success');
    });
}

function exportSVG() {
    const d = getDrawing(_ctx.activeDrawingId);
    const b = boundsAll(_ctx.shapes) || { x: 0, y: 0, w: 800, h: 600 };
    const pad = 20;
    const vb = `${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;

    const parts = _ctx.shapes.map(s => {
        const stroke = s.stroke || '#0f172a';
        const sw = s.strokeWidth || 2;
        const fill = s.fill || 'none';
        if (s.type === 'rect') return `<rect x="${Math.min(s.x, s.x + s.w)}" y="${Math.min(s.y, s.y + s.h)}" width="${Math.abs(s.w)}" height="${Math.abs(s.h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        if (s.type === 'circle') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        if (s.type === 'ellipse') return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        if (s.type === 'triangle') return `<polygon points="${s.x + s.w/2},${s.y} ${s.x + s.w},${s.y + s.h} ${s.x},${s.y + s.h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        if (s.type === 'arrow') return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${stroke}" stroke-width="${sw}" marker-end="url(#arrow)"/>`;
        if (s.type === 'polyline' || s.type === 'polygon' || s.type === 'pen') {
            const pts = s.points.map(p => `${p.x},${p.y}`).join(' ');
            const tag = (s.type === 'polygon' && s.closed) ? 'polygon' : 'polyline';
            return `<${tag} points="${pts}" fill="${(s.closed && s.fill) ? s.fill : 'none'}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        if (s.type === 'text') return `<text x="${s.x}" y="${s.y + (s.size || 14)}" font-family="DM Sans, sans-serif" font-size="${s.size || 14}" fill="${s.color || '#0f172a'}">${escapeHtml(s.text)}</text>`;
        if (s.type === 'symbol') return `<g><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="white" stroke="${stroke}" stroke-width="${sw}"/><text x="${s.x + s.w/2}" y="${s.y + s.h/2 + 5}" font-size="${Math.max(8, s.h * 0.15)}" text-anchor="middle" fill="${stroke}">${s.symbolId}</text></g>`;
        return '';
    }).join('\n  ');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${b.w + pad * 2}" height="${b.h + pad * 2}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="${b.x - pad}" y="${b.y - pad}" width="${b.w + pad * 2}" height="${b.h + pad * 2}" fill="#fefcf7"/>
  ${parts}
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(d?.name || 'plano').replace(/[^a-z0-9]/gi, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast('SVG exportado', 'success');
}

// ════════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════════
