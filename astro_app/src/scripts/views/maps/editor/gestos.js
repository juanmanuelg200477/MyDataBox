// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — gestos: arrastrar, pellizcar, rueda e imán
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { showToast } from '../../../toast.js';
import { E, panelFijo, IMAN_PX, CAPA_DE } from './estado.js';
import { tieneCablesPegados } from './datos.js';
import { tamLienzo, aMundo, limitesZoom, acotar, aplicarVista, animacion, aNorm, zoomEn } from './vista.js';
import { pintarLineas, pintarMarcas, marcarIman, pintarMapa, pintarBorrador } from './pintar.js';
import { seleccionar } from './eventos.js';
import { cerrarHoja } from './hoja.js';
import { guardarMarcaMovida, guardarVertices, colocarEn, agregarPunto, terminarTrazo } from './colocar.js';

let avisoCandadoDado = false;

// ── Gestos sobre el lienzo ──────────────────────────────────────
export function alBajar(e) {
    if (!E?.listo || e.target.closest('.mp-ed-aviso, .mp-ed-zoom, .mp-sinplano')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // En pantallas chicas el panel flota encima: tocar el mapa lo esconde
    if (!panelFijo()) E.ed.classList.remove('panel-abierto');
    E.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { E.lienzo.setPointerCapture(e.pointerId); } catch { /* el puntero ya no existe */ }

    if (E.punteros.size === 2) {
        // Dos dedos: pellizco para ampliar. Lo que se arrastraba vuelve a su sitio.
        revertirGesto();
        const [a, b] = [...E.punteros.values()];
        const { left, top } = tamLienzo();
        E.gesto = {
            tipo: 'pellizco', movido: true, d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), z0: E.vista.z,
            cx0: (a.x + b.x) / 2 - left, cy0: (a.y + b.y) / 2 - top, tx0: E.vista.tx, ty0: E.vista.ty
        };
        return;
    }
    if (E.punteros.size > 2) return;

    const marca = e.target.closest('.mp-marca');
    const vertice = e.target.closest('.mp-vertice');
    const linea = e.target.closest('.mp-linea');
    const base = { sx: e.clientX, sy: e.clientY, movido: false, marca, linea, toque: e.pointerType === 'touch' };
    const mover = E.desbloqueado && E.editable && !E.modo;
    const elegido = mover && E.items.find(i => i.id === (vertice ? E.seleccion : marca?.dataset.item));
    if (vertice && elegido) {
        E.gesto = { ...base, tipo: 'vertice', it: elegido, i: Number(vertice.dataset.vertice),
            antes: { points: structuredClone(elegido.points), ends: { ...(elegido.ends ?? {}) } } };
    } else if (marca && elegido) {
        const p = aMundo(e.clientX, e.clientY);
        E.gesto = { ...base, tipo: 'marca', it: elegido, dx: p.x - elegido.x * E.W, dy: p.y - elegido.y * E.H, antes: { x: elegido.x, y: elegido.y } };
    } else {
        E.gesto = { ...base, tipo: 'pan', tx0: E.vista.tx, ty0: E.vista.ty };
    }
}

export function alMover(e) {
    if (!E?.listo) return;
    // Sin botón ni dedo apoyado: solo sigue el cursor (fantasma o guía)
    if (!E.punteros.has(e.pointerId)) {
        if (E.modo && e.pointerType !== 'touch') seguirCursor(e);
        return;
    }
    E.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = E.gesto;
    if (!g) return;

    if (g.tipo === 'pellizco') {
        const [a, b] = [...E.punteros.values()];
        if (!b) return;
        const { min, max } = limitesZoom();
        const { left, top } = tamLienzo();
        const z = Math.min(max, Math.max(min, g.z0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0));
        const wx = (g.cx0 - g.tx0) / g.z0;
        const wy = (g.cy0 - g.ty0) / g.z0;
        E.vista.z = z;
        E.vista.tx = (a.x + b.x) / 2 - left - wx * z;
        E.vista.ty = (a.y + b.y) / 2 - top - wy * z;
        E.tocada = true;
        acotar();
        aplicarVista();
        return;
    }

    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.movido) {
        if (Math.hypot(dx, dy) < (g.toque ? 9 : 4)) {
            if (E.modo && !g.toque) seguirCursor(e);
            return;
        }
        g.movido = true;
        cancelAnimationFrame(animacion);
        if (g.tipo === 'marca') E.capaMarcas.querySelector(`[data-item="${g.it.id}"]`)?.classList.add('moviendo');
        if (g.tipo === 'pan' && g.marca && E.editable && !E.desbloqueado && !E.modo && !avisoCandadoDado) {
            avisoCandadoDado = true;
            showToast('Para mover lo que ya está en el mapa, abre el candado de arriba.', { duration: 4000 });
        }
    }

    if (g.tipo === 'pan') {
        E.vista.tx = g.tx0 + dx;
        E.vista.ty = g.ty0 + dy;
        E.tocada = true;
        acotar();
        aplicarVista();
    } else if (g.tipo === 'marca') {
        const p = aMundo(e.clientX, e.clientY);
        const n = aNorm({ x: p.x - g.dx, y: p.y - g.dy });
        g.it.x = n.x;
        g.it.y = n.y;
        const el = E.capaMarcas.querySelector(`[data-item="${g.it.id}"]`);
        if (el) { el.style.left = `${n.x * E.W}px`; el.style.top = `${n.y * E.H}px`; }
        if (tieneCablesPegados(g.it.id)) pintarLineas();
    } else if (g.tipo === 'vertice') {
        // Los extremos se pegan a la marca más cercana (o se despegan)
        const ultimo = g.i === g.it.points.length - 1;
        const iman = g.i === 0 || ultimo ? imanCerca(e.clientX, e.clientY) : null;
        const n = iman ? { x: iman.x, y: iman.y } : aNorm(aMundo(e.clientX, e.clientY));
        g.it.points[g.i] = [n.x, n.y];
        if (g.i === 0) g.it.ends = { ...g.it.ends, a: iman?.id ?? null };
        if (ultimo) g.it.ends = { ...g.it.ends, b: iman?.id ?? null };
        E.imanId = iman?.id ?? null;
        pintarLineas();
        pintarMarcas();
    }
}

export function alSubir(e) {
    if (!E || !E.punteros.has(e.pointerId)) return;
    E.punteros.delete(e.pointerId);
    const g = E.gesto;
    if (g?.tipo === 'pellizco') {
        // Si queda un dedo, sigue como desplazamiento desde donde está
        const resto = [...E.punteros.values()][0];
        E.gesto = resto ? { tipo: 'pan', sx: resto.x, sy: resto.y, tx0: E.vista.tx, ty0: E.vista.ty, movido: true } : null;
        return;
    }
    if (E.punteros.size) return;
    E.gesto = null;
    if (!g) return;

    if (g.movido) {
        if (g.tipo === 'marca') guardarMarcaMovida(g);
        else if (g.tipo === 'vertice') guardarVertices(g);
        return;
    }
    // Fue un toque o un clic
    if (E.modo?.tipo === 'colocar') { colocarEn(e, E.modo); return; }
    if (E.modo?.tipo === 'trazar') { agregarPunto(e); return; }
    if (g.marca) { seleccionar(g.marca.dataset.item); return; }
    if (g.linea) { seleccionar(g.linea.dataset.item); return; }
    if (E.seleccion) cerrarHoja();
}

export function alCancelarPuntero(e) {
    if (!E?.punteros.has(e.pointerId)) return;
    E.punteros.delete(e.pointerId);
    if (E.punteros.size) return;
    revertirGesto();
    E.gesto = null;
    marcarIman(null);
}

// Si entra un segundo dedo o el navegador cancela el gesto, lo que se
// estaba arrastrando vuelve a su sitio.
function revertirGesto() {
    const g = E.gesto;
    if (!g?.movido) return;
    if (g.tipo === 'marca') { g.it.x = g.antes.x; g.it.y = g.antes.y; }
    else if (g.tipo === 'vertice') { g.it.points = g.antes.points; g.it.ends = g.antes.ends; E.imanId = null; }
    else return;
    pintarMapa();
}

export function alRueda(e) {
    if (!E?.listo) return;
    e.preventDefault();
    const { left, top } = tamLienzo();
    const unidad = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    // El pellizco del trackpad llega como rueda con Ctrl: más sensible
    const factor = Math.exp(-e.deltaY * unidad * (e.ctrlKey ? 0.01 : 0.0015));
    zoomEn(factor, e.clientX - left, e.clientY - top);
}

export function alDobleClic(e) {
    if (!E?.listo || e.target.closest('.mp-ed-aviso, .mp-ed-zoom, .mp-sinplano')) return;
    e.preventDefault();
    if (E.modo?.tipo === 'trazar') { terminarTrazo(); return; }
    if (!E.modo && !e.target.closest('.mp-marca, .mp-linea')) {
        const { left, top } = tamLienzo();
        zoomEn(1.8, e.clientX - left, e.clientY - top, true);
    }
}

function seguirCursor(e) {
    if (E.modo.tipo === 'colocar') {
        const { left, top } = tamLienzo();
        E.fantasma.hidden = false;
        E.fantasma.style.transform = `translate(${e.clientX - left}px, ${e.clientY - top}px)`;
    } else if (E.modo.tipo === 'trazar') {
        const iman = imanCerca(e.clientX, e.clientY);
        marcarIman(iman?.id ?? null);
        if (!E.modo.puntos.length) return;
        E.modo.cursor = iman ? { x: iman.x * E.W, y: iman.y * E.H } : aMundo(e.clientX, e.clientY);
        pintarBorrador();
    }
}

// Marca visible más cercana al puntero. En los pines cuenta tanto la punta
// como la ficha de arriba, que es lo que el usuario apunta.
export function imanCerca(clientX, clientY) {
    const { left, top } = tamLienzo();
    const v = E.vista;
    let mejor = null;
    let dist = IMAN_PX;
    for (const it of E.items) {
        if (it.kind === 'infra_line' || !E.capas[CAPA_DE[it.kind]]) continue;
        const sx = left + v.tx + it.x * E.W * v.z;
        const sy = top + v.ty + it.y * E.H * v.z;
        let d = Math.hypot(sx - clientX, sy - clientY);
        // Minimizados son un punto justo en su lugar: no hay ficha arriba
        if (it.kind !== 'infra_point' && !E.capas.minimizar) d = Math.min(d, Math.hypot(sx - clientX, sy - (it.kind === 'rack' ? 33 : 30) - clientY));
        if (d < dist) { dist = d; mejor = it; }
    }
    return mejor;
}
