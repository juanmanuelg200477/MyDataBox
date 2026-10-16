// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — eventos: clics, teclado y selección
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { subirPlano, cargarPlano } from '../editor.js';
import { I, hayDialogo } from '../ui.js';
import { E, escuchar, panelFijo } from './estado.js';
import { puntosLinea } from './datos.js';
import { tamLienzo, ajustar, acotar, aplicarVista, zoomEn, limitesZoom, irA } from './vista.js';
import { pintarMarcas, aplicarCapas, pintarLineas } from './pintar.js';
import { alBajar, alMover, alSubir, alCancelarPuntero, alRueda, alDobleClic } from './gestos.js';
import { alClicHoja, cerrarHoja, quitarDelMapa, abrirHoja } from './hoja.js';
import { alArrastrarObjeto, alArrastrarEncima, alSoltarObjeto, cancelarModo, terminarTrazo, deshacerPunto } from './colocar.js';
import { alClicPanel, alEscribirPanel, alTeclaPanel } from './panel.js';
import { cerrarPop, alternarPop, editarMapa, borrarEsteMapa } from './barra.js';
import { revisarOrientacion, alPantallaCompleta, girar } from './pantalla.js';

// ── Eventos ─────────────────────────────────────────────────────
export function conectar() {
    E.ed.addEventListener('click', alClic);
    E.hoja.addEventListener('click', alClicHoja);
    E.hoja.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('[data-campo="metraje"]')) {
            e.preventDefault();
            E?.hoja.querySelector('[data-acc="metraje"]')?.click();
        }
    });
    const panel = E.raiz.querySelector('#mp-panel');
    panel.addEventListener('click', alClicPanel);
    panel.addEventListener('input', alEscribirPanel);
    panel.addEventListener('keydown', alTeclaPanel);
    panel.addEventListener('dragstart', alArrastrarObjeto);
    panel.addEventListener('dragend', () => E?.lienzo.classList.remove('soltando'));

    const l = E.lienzo;
    l.addEventListener('pointerdown', alBajar);
    l.addEventListener('pointermove', alMover);
    l.addEventListener('pointerup', alSubir);
    l.addEventListener('pointercancel', alCancelarPuntero);
    l.addEventListener('pointerleave', () => { if (E && !E.gesto) E.fantasma.hidden = true; });
    l.addEventListener('wheel', alRueda, { passive: false });
    l.addEventListener('dblclick', alDobleClic);
    l.addEventListener('dragover', alArrastrarEncima);
    l.addEventListener('dragleave', (e) => { if (!l.contains(e.relatedTarget)) l.classList.remove('soltando'); });
    l.addEventListener('drop', alSoltarObjeto);
    l.addEventListener('contextmenu', (e) => { if (E?.modo) { e.preventDefault(); cancelarModo(); } });

    escuchar(document, 'keydown', alTeclear);
    escuchar(document, 'pointerdown', alTocarFuera, true);
    escuchar(window, 'resize', revisarOrientacion, { passive: true });
    escuchar(document, 'fullscreenchange', alPantallaCompleta);
    E.ro = new ResizeObserver(alRedimensionar);
    E.ro.observe(E.lienzo);
    revisarOrientacion();
    alPantallaCompleta();
}

function alRedimensionar() {
    if (!E?.listo) return;
    revisarOrientacion();
    const { w, h } = tamLienzo();
    if (!w || !h) return;
    // Mientras nadie haya movido la vista, el plano se sigue viendo entero
    if (!E.tocada) { ajustar(false); return; }
    E.zAjuste = Math.min(w / E.W, h / E.H) * 0.92;
    acotar();
    aplicarVista();
}

async function alClic(e) {
    if (!E) return;
    // Enter o espacio sobre una marca con el teclado (los clics del ratón
    // y los toques se resuelven en alSubir)
    const marca = e.target.closest('.mp-marca');
    if (marca && e.detail === 0) { seleccionar(marca.dataset.item); return; }
    const b = e.target.closest('[data-acc]');
    if (!b || !E.ed.contains(b) || E.hoja.contains(b) || b.closest('#mp-panel')) return;
    switch (b.dataset.acc) {
        case 'volver':           E.alVolver(); break;
        case 'panel':            E.ed.classList.toggle('panel-abierto'); cerrarPop(); break;
        case 'bloqueo':          E.desbloqueado = !E.desbloqueado; pintarBloqueo(); pintarMarcas(); break;
        case 'minimizar':        E.capas.minimizar = !E.capas.minimizar; aplicarCapas(); break;
        case 'nombres':          E.capas.nombres = !E.capas.nombres; aplicarCapas(); break;
        case 'capas':
        case 'resumen':
        case 'ajustes':          alternarPop(b.dataset.acc, b); break;
        case 'zoom-mas':         zoomEn(1.4, undefined, undefined, true); break;
        case 'zoom-menos':       zoomEn(1 / 1.4, undefined, undefined, true); break;
        case 'ajustar':          ajustar(); break;
        case 'subir-plano':      subirPlano(); break;
        case 'reintentar-plano': cargarPlano(); break;
        case 'cancelar-modo':    cancelarModo(); break;
        case 'terminar':         terminarTrazo(); break;
        case 'deshacer-punto':   deshacerPunto(); break;
        case 'girar':            girar(); break;
        case 'editar-mapa':      cerrarPop(); editarMapa(); break;
        case 'eliminar-mapa':    cerrarPop(); borrarEsteMapa(); break;
    }
}

export function pintarBloqueo() {
    const b = E.raiz.querySelector('#mp-h-bloqueo');
    if (!b) return;
    b.innerHTML = E.desbloqueado ? `${I.abierto}<span>Moviendo</span>` : `${I.candado}<span>Bloqueado</span>`;
    b.classList.toggle('activo', E.desbloqueado);
    b.setAttribute('aria-pressed', E.desbloqueado);
    b.title = E.desbloqueado
        ? 'Arrastra lo que está en el mapa para moverlo. Pulsa para bloquear.'
        : 'Desbloquea para mover lo que ya está en el mapa';
    E.ed.classList.toggle('desbloqueado', E.desbloqueado);
}

function alTocarFuera(e) {
    if (!E?.pop || E.pop.hidden) return;
    if (E.pop.contains(e.target) || e.target.closest?.('.mp-ed-h[data-acc="capas"], .mp-ed-h[data-acc="resumen"], .mp-ed-h[data-acc="ajustes"]')) return;
    cerrarPop();
}

function alTeclear(e) {
    if (!E?.ed || e.defaultPrevented || hayDialogo()) return;
    const t = e.target;
    if (t.closest?.('input, textarea, select, [contenteditable="true"]')) {
        if (e.key === 'Escape') t.blur();
        return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
        case 'Escape':
            if (E.modo) cancelarModo();
            else if (!E.pop.hidden) cerrarPop();
            else if (!E.hoja.hidden) cerrarHoja();
            else if (!panelFijo() && E.ed.classList.contains('panel-abierto')) E.ed.classList.remove('panel-abierto');
            else return;
            break;
        case 'Enter':
            if (E.modo?.tipo !== 'trazar' || t.closest?.('button, a')) return;
            terminarTrazo();
            break;
        case 'Backspace':
        case 'Delete':
            if (E.modo?.tipo === 'trazar') deshacerPunto();
            else if (E.seleccion && E.editable && !E.modo) quitarDelMapa(E.seleccion);
            else return;
            break;
        case '+':
        case '=': zoomEn(1.4, undefined, undefined, true); break;
        case '-':
        case '_': zoomEn(1 / 1.4, undefined, undefined, true); break;
        case '0': ajustar(); break;
        default: return;
    }
    e.preventDefault();
}

// ── Seleccionar y vista previa ──────────────────────────────────
export function seleccionar(id) {
    const it = E.items.find(i => i.id === id);
    if (!it) return;
    E.seleccion = id;
    pintarLineas();
    pintarMarcas();
    abrirHoja(it);
    asegurarVisible(it);
}

// Que lo elegido no quede debajo de su ficha: si cae tapado, el mapa se
// corre hasta el hueco libre (y solo se aleja si no cabe).
function asegurarVisible(it) {
    if (!E.listo) return;
    const pts = it.kind === 'infra_line' ? puntosLinea(it) : [[it.x * E.W, it.y * E.H]];
    if (!pts.length) return;
    const { w, h } = tamLienzo();
    const hoja = E.hoja.hidden ? 0 : E.hoja.getBoundingClientRect().width + 20;
    const libre = { x0: 20, y0: 64, x1: w - hoja - 20, y1: h - 20 };
    if (libre.x1 - libre.x0 < 120 || libre.y1 - libre.y0 < 120) return;
    const v = E.vista;
    const xs = pts.map(p => v.tx + p[0] * v.z);
    const ys = pts.map(p => v.ty + p[1] * v.z);
    const caja = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    if (it.kind !== 'infra_line') {
        const punto = it.kind === 'infra_point' || E.capas.minimizar;
        caja.x0 -= 26; caja.x1 += 26; caja.y0 -= punto ? 20 : 60; caja.y1 += punto ? 30 : 12;
    }
    if (caja.x0 >= libre.x0 && caja.x1 <= libre.x1 && caja.y0 >= libre.y0 && caja.y1 <= libre.y1) return;
    let z = v.z;
    const cabe = Math.min((libre.x1 - libre.x0) / Math.max(caja.x1 - caja.x0, 1), (libre.y1 - libre.y0) / Math.max(caja.y1 - caja.y0, 1));
    if (cabe < 1) z = Math.max(limitesZoom().min, v.z * cabe * 0.9);
    const cx = ((caja.x0 + caja.x1) / 2 - v.tx) / v.z;
    const cy = ((caja.y0 + caja.y1) / 2 - v.ty) / v.z;
    E.tocada = true;
    irA({ z, tx: (libre.x0 + libre.x1) / 2 - cx * z, ty: (libre.y0 + libre.y1) / 2 - cy * z });
}
