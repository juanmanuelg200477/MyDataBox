// ════════════════════════════════════════════════════════════════
//  PLANOS · Estructura del editor (barra, propiedades, reglas y lienzo)
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { groupBy } from './blueprint-section.js';
import { getDrawing, updateSettings } from '../../notesStore.js';
import { escapeHtml } from './notesApp.js';
import { _ctx, TOOLS_TOP, STROKE_COLORS, SHAPES, SYMBOLS } from './blueprint-estado.js';
import { initCanvasEngine } from './blueprint-motor.js';

// ════════════════════════════════════════════════════════════════
//  Editor — UI HTML
// ════════════════════════════════════════════════════════════════
export function renderEditor() {
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
