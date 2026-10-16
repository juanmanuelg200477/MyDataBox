// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — consultas sobre los objetos del mapa
//  Índices, puntos de cada línea y datos para fichas y etiquetas.
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { store } from '../../../store.js';
import { estiloDispositivo, ESTILO_BASTIDOR, estiloColor } from '../iconos.js';
import { tipoInfra } from '../catalogo.js';
import { I } from '../ui.js';
import { E, ESTILO_PERDIDO } from './estado.js';

export const indiceItems = () => new Map(E.items.map(i => [i.id, i]));

// Puntos de un tramo en px. Si su inicio o su final están pegados a una
// marca, siguen a esa marca aunque se haya movido.
export function puntosLinea(it, porId) {
    const pts = (it.points ?? []).map(([x, y]) => [x * E.W, y * E.H]);
    if (pts.length < 2) return pts;
    const buscar = (id) => id && (porId ? porId.get(id) : E.items.find(o => o.id === id));
    const a = buscar(it.ends?.a);
    const b = buscar(it.ends?.b);
    if (a && a.kind !== 'infra_line') pts[0] = [a.x * E.W, a.y * E.H];
    if (b && b.kind !== 'infra_line') pts[pts.length - 1] = [b.x * E.W, b.y * E.H];
    return pts;
}

export const tieneCablesPegados = (id) => E.items.some(i => i.kind === 'infra_line' && (i.ends?.a === id || i.ends?.b === id));

// Punto a la mitad del recorrido (no de la recta entre los extremos)
export function mitad(pts) {
    if (pts.length < 2) return null;
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
        const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        seg.push(d);
        total += d;
    }
    let falta = total / 2;
    for (let i = 0; i < seg.length; i++) {
        if (falta <= seg[i] || i === seg.length - 1) {
            const k = seg[i] ? Math.min(1, falta / seg[i]) : 0;
            return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k };
        }
        falta -= seg[i];
    }
    return null;
}

// ── Datos de referencia ─────────────────────────────────────────
export const rackPorId = (id) => store.racks.find(r => String(r.id) === String(id)) ?? null;
export const elementoPorId = (id) => E.infra.find(e => e.id === id) ?? null;
export const nombreArea = (id) => store.areas.find(a => a.id === id)?.name ?? '';

export function infoItem(it) {
    if (it.kind === 'device') {
        const ent = E.indice.get(String(it.refId));
        return ent
            ? { nombre: ent.dev.name || 'Sin nombre', estilo: estiloDispositivo(ent.dev) }
            : { nombre: 'Dispositivo eliminado', estilo: ESTILO_PERDIDO, perdido: true };
    }
    if (it.kind === 'rack') {
        const r = rackPorId(it.refId);
        return r ? { nombre: r.name, estilo: ESTILO_BASTIDOR } : { nombre: 'Bastidor eliminado', estilo: ESTILO_PERDIDO, perdido: true };
    }
    const el = elementoPorId(it.refId);
    const tipo = el && tipoInfra(el.kind);
    return el
        ? { nombre: el.name, estilo: estiloColor(el.color, tipo?.glifo ?? I.pin), el, tipo }
        : { nombre: 'Elemento eliminado', estilo: ESTILO_PERDIDO, perdido: true };
}
