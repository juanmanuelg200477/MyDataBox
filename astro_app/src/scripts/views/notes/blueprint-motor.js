// ════════════════════════════════════════════════════════════════
//  PLANOS · Motor del lienzo: arranque, tamaño, eventos y limpieza
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { renderList } from './blueprint-section.js';
import { updateDrawing } from '../../notesStore.js';
import { drawSymbol } from './blueprint-draw.js';
import { M, _ctx, TOOLS_TOP, RULER_SIZE } from './blueprint-estado.js';
import { hideFloatingMeasure, onMouseDown, onMouseUp, onDblClick, onWheel } from './blueprint-raton.js';
import { updateCrosshair, onMouseMove } from './blueprint-movimiento.js';
import { onKeyDown, onKeyUp } from './blueprint-teclado.js';
import { toggleDropdown, setTool, closeDropdowns, updateShapeIcon, zoomBy, zoomFit, toggleFullscreen, updateStrokeUI, applyColorToSelected, fillUI, applyFillToSelected, toggleRulers } from './blueprint-herramientas.js';
import { undo, redo, commit, persistDrawing } from './blueprint-historial.js';
import { updateRulers, draw } from './blueprint-render.js';
import { exportPNG, exportSVG } from './blueprint-export.js';

// Limpieza del motor del lienzo vivo (listeners de documento y observer).
// Cada plano abierto crea un motor nuevo: si el anterior no suelta sus
// listeners, siguen respondiendo al teclado sobre el _ctx compartido y,
// por ejemplo, un Ctrl+Z deshace un paso por cada plano abierto antes.
let _limpiarMotor = null;

// ════════════════════════════════════════════════════════════════
//  CANVAS ENGINE — el motor principal
// ════════════════════════════════════════════════════════════════
export function initCanvasEngine() {
    _limpiarMotor?.();
    M.canvas = document.getElementById('bp-canvas');
    M.wrap = M.canvas.parentElement;
    M.ctx = M.canvas.getContext('2d');
    M.rulerX = document.getElementById('bp-ruler-x');
    M.rulerY = document.getElementById('bp-ruler-y');
    M.crosshair = document.getElementById('bp-crosshair');
    M.measureTip = document.getElementById('bp-measure-tip');
    M.editorRoot = document.getElementById('bp-editor-root');

    M.dpr = window.devicePixelRatio || 1;

    resize();
    M.ro = new ResizeObserver(resize);
    M.ro.observe(M.wrap);

    // ── Eventos del canvas ──────────────────────────────────
    M.canvas.addEventListener('mouseenter', () => { _ctx.cursor.inside = true; updateCrosshair(); });
    M.canvas.addEventListener('mouseleave', () => {
        _ctx.cursor.inside = false;
        M.crosshair.style.opacity = '0';
        hideFloatingMeasure();
        updateRulers();
    });

    M.canvas.addEventListener('mousedown', onMouseDown);
    M.canvas.addEventListener('mousemove', onMouseMove);
    M.canvas.addEventListener('mouseup', onMouseUp);
    M.canvas.addEventListener('dblclick', onDblClick);
    M.canvas.addEventListener('wheel', onWheel, { passive: false });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    M.canvas._cleanup = cleanup;
    _limpiarMotor = cleanup;

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
    document.getElementById('bp-export-png').onclick = () => exportPNG(M.canvas);
    document.getElementById('bp-export-svg').onclick = exportSVG;

    document.getElementById('bp-name').oninput = e => {
        updateDrawing(_ctx.activeDrawingId, { name: e.target.value });
        renderList();
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

    M.swEl = document.getElementById('bp-stroke-width');
    M.swVal = document.getElementById('bp-stroke-width-val');
    M.swEl.oninput = () => {
        _ctx.strokeWidth = +M.swEl.value;
        M.swVal.textContent = M.swEl.value + 'px';
        if (_ctx.selected !== null) {
            _ctx.shapes[_ctx.selected].strokeWidth = _ctx.strokeWidth;
            commit();
        }
    };

    document.getElementById('bp-grid-show').onchange = e => { _ctx.showGrid = e.target.checked; persistDrawing(); draw(); };
    document.getElementById('bp-snap').onchange = e => { _ctx.snap = e.target.checked; };
    document.getElementById('bp-rulers-show').onchange = e => { _ctx.showRulers = e.target.checked; toggleRulers(); };
    M.gsEl = document.getElementById('bp-grid-size');
    M.gsVal = document.getElementById('bp-grid-size-val');
    M.gsEl.oninput = () => {
        _ctx.gridSize = +M.gsEl.value;
        M.gsVal.textContent = _ctx.gridSize + 'px';
        persistDrawing(); draw();
    };

    setTool('select');
    updateShapeIcon();
    draw();

    // Cerrar dropdowns al click fuera
    document.addEventListener('click', onClickFuera);

}

// ── Funciones del motor (antes internas de initCanvasEngine) ─────
// ── Resize ───────────────────────────────────────────────
export const resize = () => {
    M.dpr = window.devicePixelRatio || 1;
    const rect = M.wrap.getBoundingClientRect();
    M.canvas.width  = rect.width * M.dpr;
    M.canvas.height = rect.height * M.dpr;
    M.canvas.style.width  = rect.width + 'px';
    M.canvas.style.height = rect.height + 'px';
    M.ctx.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    if (M.rulerX) {
        M.rulerX.width = rect.width * M.dpr; M.rulerX.height = RULER_SIZE * M.dpr;
        M.rulerX.style.width = rect.width + 'px'; M.rulerX.style.height = RULER_SIZE + 'px';
        M.rulerX.getContext('2d').setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    }
    if (M.rulerY) {
        M.rulerY.width = RULER_SIZE * M.dpr; M.rulerY.height = rect.height * M.dpr;
        M.rulerY.style.width = RULER_SIZE + 'px'; M.rulerY.style.height = rect.height + 'px';
        M.rulerY.getContext('2d').setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    }
    draw();
};

// Cerrar dropdowns al click fuera (se registra más abajo, con la toolbar)
const onClickFuera = e => {
    if (!M.canvas.isConnected) { cleanup(); return; }
    if (!e.target.closest('.bp-tool') && !e.target.closest('.bp-dropdown')) {
        closeDropdowns();
    }
};

export const cleanup = () => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('click', onClickFuera);
    M.ro.disconnect();
    if (_limpiarMotor === cleanup) _limpiarMotor = null;
};
