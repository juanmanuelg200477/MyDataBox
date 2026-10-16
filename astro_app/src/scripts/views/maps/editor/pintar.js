// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — pintado de marcas, líneas y capas
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { icono3d } from '../iconos.js';
import { tipoInfra } from '../catalogo.js';
import { esc, metros } from '../ui.js';
import { E, CAPA_DE, CAPAS_KEY } from './estado.js';
import { indiceItems, puntosLinea, elementoPorId, mitad, infoItem } from './datos.js';

// ── Pintado del mapa ────────────────────────────────────────────
export function pintarMapa() {
    pintarLineas();
    pintarBorrador();
    pintarMarcas();
}

export function pintarLineas() {
    if (!E.listo || !E.capas.lineas) { E.gLineas.innerHTML = ''; return; }
    const porId = indiceItems();
    const lineas = E.items.filter(i => i.kind === 'infra_line')
        .sort((a, b) => (a.id === E.seleccion) - (b.id === E.seleccion));   // la elegida, encima
    const partes = [];
    for (const it of lineas) {
        const pts = puntosLinea(it, porId);
        if (pts.length < 2) continue;
        const el = elementoPorId(it.refId);
        const tipo = el && tipoInfra(el.kind);
        const estilo = el?.specs?.estilo ?? tipo?.estilo ?? 'solida';
        const grosor = Number(el?.specs?.grosor) || 5;
        const p = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        partes.push(`<g class="mp-linea ${E.seleccion === it.id ? 'sel' : ''} ${el ? '' : 'perdida'}" data-item="${it.id}" style="--lc:${esc(el?.color || '#94a3b8')};--g:${grosor}">
            <polyline class="mp-linea-casco" points="${p}"/>
            <polyline class="mp-linea-trazo ${esc(estilo)}" points="${p}"/>
            <polyline class="mp-linea-hit" points="${p}"/>
        </g>`);
    }
    E.gLineas.innerHTML = partes.join('');
}

// El tramo que se está dibujando (se repinta con cada movimiento)
export function pintarBorrador() {
    const m = E.modo;
    if (!E.listo || m?.tipo !== 'trazar' || !m.puntos.length) { E.gBorrador.innerHTML = ''; return; }
    const pts = m.puntos.map(([x, y]) => [x * E.W, y * E.H]);
    if (m.cursor) pts.push([m.cursor.x, m.cursor.y]);
    const p = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    E.gBorrador.innerHTML = `<g class="mp-linea borrador" style="--lc:${esc(m.elemento.color || '#0ea5e9')};--g:${Number(m.elemento.specs?.grosor) || 5}">
        <polyline class="mp-linea-casco" points="${p}"/>
        <polyline class="mp-linea-trazo discontinua" points="${p}"/>
        ${m.puntos.map(([x, y]) => `<circle class="mp-borrador-punto" cx="${(x * E.W).toFixed(1)}" cy="${(y * E.H).toFixed(1)}" r="4"/>`).join('')}
    </g>`;
}

export function pintarMarcas() {
    if (!E.listo) { E.capaMarcas.innerHTML = ''; return; }
    const html = [];
    const porId = indiceItems();
    // Metraje en letra pequeña a mitad de cada tramo (solo si lo tiene)
    if (E.capas.lineas && E.capas.metraje) {
        for (const it of E.items) {
            if (it.kind !== 'infra_line' || it.lengthM == null) continue;
            const m = mitad(puntosLinea(it, porId));
            if (m) html.push(`<span class="mp-etq-metraje ${E.seleccion === it.id ? 'sel' : ''}" style="left:${m.x.toFixed(1)}px;top:${m.y.toFixed(1)}px">${metros(it.lengthM)}</span>`);
        }
    }
    // Infraestructura abajo, equipos encima
    const orden = { infra_point: 0, rack: 1, device: 2 };
    const marcas = E.items.filter(it => it.kind !== 'infra_line' && E.capas[CAPA_DE[it.kind]])
        .sort((a, b) => orden[a.kind] - orden[b.kind]);
    for (const it of marcas) {
        const info = infoItem(it);
        const pin = it.kind !== 'infra_point';
        const tam = it.kind === 'rack' ? 44 : it.kind === 'device' ? 38 : 30;
        html.push(`<button type="button" class="mp-marca mp-m-${it.kind} ${pin ? 'con-pin' : ''} ${E.seleccion === it.id ? 'sel' : ''} ${E.imanId === it.id ? 'iman' : ''} ${info.perdido ? 'perdida' : ''}"
                data-item="${it.id}" style="left:${(it.x * E.W).toFixed(1)}px;top:${(it.y * E.H).toFixed(1)}px" aria-label="${esc(info.nombre)}">
            <span class="mp-marca-ficha">${icono3d(info.estilo, { tam })}</span>
            ${pin ? '<span class="mp-marca-pico"></span><span class="mp-marca-punto"></span>' : ''}
            <span class="mp-marca-nombre">${esc(info.nombre)}</span>
        </button>`);
    }
    // Agarraderas para reformar el tramo elegido
    const sel = E.seleccion && porId.get(E.seleccion);
    if (sel?.kind === 'infra_line' && E.desbloqueado && E.editable && E.capas.lineas) {
        puntosLinea(sel, porId).forEach(([x, y], i) =>
            html.push(`<span class="mp-vertice" data-vertice="${i}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px"></span>`));
    }
    E.capaMarcas.innerHTML = html.join('');
}

export function marcarIman(id) {
    if (!E || E.imanId === id) return;
    if (E.imanId) E.capaMarcas.querySelector(`[data-item="${E.imanId}"]`)?.classList.remove('iman');
    E.imanId = id;
    if (id) E.capaMarcas.querySelector(`[data-item="${id}"]`)?.classList.add('iman');
}

export function aplicarCapas() {
    const c = E.capas;
    E.ed.classList.toggle('minimizado', c.minimizar);
    E.ed.classList.toggle('con-nombres', c.nombres);
    E.ed.classList.toggle('con-nombres-infra', c.nombresInfra);
    E.img.style.opacity = c.opacidad;
    for (const [acc, encendido] of [['minimizar', c.minimizar], ['nombres', c.nombres]]) {
        const b = E.raiz.querySelector(`.mp-ed-h[data-acc="${acc}"]`);
        b?.classList.toggle('encendido', encendido);
        b?.setAttribute('aria-pressed', encendido);
    }
    // Se recuerda en este navegador para la próxima vez
    try { localStorage.setItem(CAPAS_KEY, JSON.stringify(c)); } catch { /* modo privado */ }
}
