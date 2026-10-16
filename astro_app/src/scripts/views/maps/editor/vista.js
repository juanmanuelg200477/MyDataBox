// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — vista: zoom, desplazamiento y coordenadas
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { E } from './estado.js';
import { mitad, puntosLinea } from './datos.js';

export let animacion = 0;

// ── Vista: desplazar y ampliar ──────────────────────────────────
export function tamLienzo() {
    const r = E.lienzo.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top };
}

export function limitesZoom() {
    return { min: E.zAjuste * 0.5, max: Math.max(E.zAjuste * 12, 2.5) };
}

export function aplicarVista() {
    const { tx, ty, z } = E.vista;
    E.mundo.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
    E.mundo.style.setProperty('--z', z);
}

// Siempre queda a la vista al menos un trozo del plano
export function acotar(v = E.vista) {
    const { w, h } = tamLienzo();
    const margen = 80;
    v.tx = Math.min(Math.max(v.tx, margen - E.W * v.z), w - margen);
    v.ty = Math.min(Math.max(v.ty, margen - E.H * v.z), h - margen);
}

export function ajustar(animado = true) {
    if (!E?.listo) return;
    const { w, h } = tamLienzo();
    if (!w || !h) return;
    const z = Math.min(w / E.W, h / E.H) * 0.92;
    E.zAjuste = z;
    E.tocada = false;
    irA({ z, tx: (w - E.W * z) / 2, ty: (h - E.H * z) / 2 }, animado);
}

export function zoomEn(factor, cx, cy, animado = false) {
    if (!E?.listo) return;
    const { w, h } = tamLienzo();
    const v = E.vista;
    const { min, max } = limitesZoom();
    const z = Math.min(max, Math.max(min, v.z * factor));
    const px = cx ?? w / 2;
    const py = cy ?? h / 2;
    const destino = { z, tx: px - (px - v.tx) * (z / v.z), ty: py - (py - v.ty) * (z / v.z) };
    acotar(destino);
    E.tocada = true;
    irA(destino, animado);
}

export function irA(destino, animado = true) {
    cancelAnimationFrame(animacion);
    const v = E.vista;
    if (!animado || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        Object.assign(v, destino);
        aplicarVista();
        return;
    }
    const yo = E;
    const desde = { ...v };
    const t0 = performance.now();
    const paso = (t) => {
        if (E !== yo) return;
        const k = Math.min(1, (t - t0) / 300);
        const e = 1 - Math.pow(1 - k, 3);
        v.tx = desde.tx + (destino.tx - desde.tx) * e;
        v.ty = desde.ty + (destino.ty - desde.ty) * e;
        v.z = desde.z + (destino.z - desde.z) * e;
        aplicarVista();
        if (k < 1) animacion = requestAnimationFrame(paso);
    };
    animacion = requestAnimationFrame(paso);
}

export function centrarEn(it) {
    const p = posMundo(it);
    if (!p || !E.listo) return;
    const { w, h } = tamLienzo();
    const z = Math.min(limitesZoom().max, Math.max(E.vista.z, E.zAjuste * 2.2));
    // Si la ficha está abierta, se centra en lo que queda libre a su izquierda
    const hoja = E.hoja.hidden ? 0 : E.hoja.getBoundingClientRect().width + 16;
    E.tocada = true;
    irA({ z, tx: (w - hoja) / 2 - p.x * z, ty: h / 2 - p.y * z });
}

// Pantalla → mundo (px de la imagen) y normalizado (0..1)
export function aMundo(clientX, clientY) {
    const { left, top } = tamLienzo();
    const v = E.vista;
    return { x: (clientX - left - v.tx) / v.z, y: (clientY - top - v.ty) / v.z };
}

export const aNorm = (p) => ({ x: Math.min(1, Math.max(0, p.x / E.W)), y: Math.min(1, Math.max(0, p.y / E.H)) });

function posMundo(it) {
    if (it.kind === 'infra_line') return mitad(puntosLinea(it));
    return { x: it.x * E.W, y: it.y * E.H };
}
