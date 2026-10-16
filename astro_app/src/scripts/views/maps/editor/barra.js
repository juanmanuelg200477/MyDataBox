// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — barra de arriba: Capas, Resumen y Ajustes
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { cargarPlano } from '../editor.js';
import { signedUrls } from '../../../mapsStore.js';
import { estiloDispositivo, icono3d, estiloColor } from '../iconos.js';
import { tipoInfra } from '../catalogo.js';
import { esc, I, metros } from '../ui.js';
import { formularioMapa, eliminar as eliminarMapa } from '../lista.js';
import { E, ESTILO_PERDIDO } from './estado.js';
import { elementoPorId } from './datos.js';
import { aplicarCapas, pintarMapa } from './pintar.js';
import { cerrarHoja } from './hoja.js';
import { cancelarModo } from './colocar.js';
import { pintarPanel } from './panel.js';

// ── Ventanitas: capas, resumen, opciones ────────────────────────
export function alternarPop(cual, boton) {
    if (!E.pop.hidden && E.pop.dataset.cual === cual) { cerrarPop(); return; }
    E.pop.dataset.cual = cual;
    E.pop.innerHTML = cual === 'capas' ? popCapas() : cual === 'resumen' ? popResumen() : popAjustes();
    E.pop.hidden = false;
    // Debajo del botón que la abrió, sin salirse del editor
    const r = boton.getBoundingClientRect();
    const base = E.ed.getBoundingClientRect();
    const ancho = E.pop.offsetWidth;
    const top = r.bottom - base.top + 8;
    E.pop.style.top = `${top}px`;
    E.pop.style.left = `${Math.max(8, Math.min(r.right - base.left - ancho, base.width - ancho - 8))}px`;
    E.pop.style.maxHeight = `${Math.max(160, base.height - top - 10)}px`;
    E.pop.querySelectorAll('[data-capa]').forEach(i => i.addEventListener('input', alCambiarCapa));
    E.raiz.querySelectorAll('.mp-ed-h').forEach(b => b.classList.toggle('abierto', b === boton));
}

export function cerrarPop() {
    if (!E?.pop || E.pop.hidden) return;
    E.pop.hidden = true;
    E.raiz.querySelectorAll('.mp-ed-h.abierto').forEach(b => b.classList.remove('abierto'));
}

function popCapas() {
    const c = E.capas;
    const fila = (k, nombre) => `<label class="mp-interruptor"><span>${nombre}</span><input type="checkbox" data-capa="${k}" ${c[k] ? 'checked' : ''}><i></i></label>`;
    return `<div class="mp-pop-tit">Capas</div>
        ${fila('dispositivos', 'Dispositivos')}
        ${fila('bastidores', 'Bastidores')}
        ${fila('puntos', 'Puntos de infraestructura')}
        ${fila('lineas', 'Cableado y rutas')}
        ${fila('metraje', 'Metrajes')}
        ${fila('nombresInfra', 'Nombres de infraestructura')}
        <label class="mp-rango"><span>Opacidad del plano <b id="mp-opac-val">${Math.round(c.opacidad * 100)}%</b></span>
            <input type="range" min="0.15" max="1" step="0.05" value="${c.opacidad}" data-capa="opacidad"></label>`;
}

function alCambiarCapa(e) {
    if (!E) return;
    const k = e.target.dataset.capa;
    E.capas[k] = k === 'opacidad' ? Number(e.target.value) : e.target.checked;
    if (k === 'opacidad') E.pop.querySelector('#mp-opac-val').textContent = `${Math.round(E.capas.opacidad * 100)}%`;
    aplicarCapas();
    if (k !== 'opacidad' && k !== 'nombresInfra') pintarMapa();
}

function popResumen() {
    const disp = E.items.filter(i => i.kind === 'device');
    const racks = E.items.filter(i => i.kind === 'rack');
    const porTipo = new Map();
    for (const it of disp) {
        const ent = E.indice.get(String(it.refId));
        const k = ent ? ent.dev.device || 'Sin tipo' : 'Eliminados';
        const r = porTipo.get(k) ?? { n: 0, estilo: ent ? estiloDispositivo(ent.dev) : ESTILO_PERDIDO };
        r.n++;
        porTipo.set(k, r);
    }
    const puntos = new Map();
    const cables = new Map();
    for (const it of E.items) {
        if (it.kind !== 'infra_point' && it.kind !== 'infra_line') continue;
        const el = elementoPorId(it.refId);
        const destino = it.kind === 'infra_point' ? puntos : cables;
        const r = destino.get(el?.id ?? '?') ?? { el, n: 0, m: 0, sin: 0 };
        r.n++;
        if (it.lengthM != null) r.m += it.lengthM; else r.sin++;
        destino.set(el?.id ?? '?', r);
    }
    const totalM = [...cables.values()].reduce((s, r) => s + r.m, 0);
    const sinMedir = [...cables.values()].reduce((s, r) => s + r.sin, 0);
    const fila = (ico, nombre, valor) => `<div class="mp-res-fila">${ico}<span>${esc(nombre)}</span><b>${valor}</b></div>`;
    const icoLinea = (el) => el
        ? `<span class="mp-muestra-linea corta ${esc(el.specs?.estilo ?? 'solida')}" style="--lc:${esc(el.color || '#94a3b8')}"></span>`
        : icono3d(ESTILO_PERDIDO, { tam: 22 });
    const icoPunto = (el) => icono3d(el ? estiloColor(el.color, tipoInfra(el.kind)?.glifo ?? I.pin) : ESTILO_PERDIDO, { tam: 22 });
    return `<div class="mp-pop-tit">Resumen del mapa</div>
        <div class="mp-res-grandes">
            <div><b>${disp.length}</b><span>${disp.length === 1 ? 'dispositivo' : 'dispositivos'}</span></div>
            <div><b>${racks.length}</b><span>${racks.length === 1 ? 'bastidor' : 'bastidores'}</span></div>
            <div><b>${metros(totalM).replace(' m', '')}</b><span>metros de cable</span></div>
        </div>
        ${sinMedir ? `<p class="mp-res-aviso">${I.regla}${sinMedir} ${sinMedir === 1 ? 'tramo sin metraje' : 'tramos sin metraje'}: tócalos en el mapa para anotarlo.</p>` : ''}
        ${porTipo.size ? `<div class="mp-res-sec">Dispositivos</div>${[...porTipo].map(([k, r]) => fila(icono3d(r.estilo, { tam: 22 }), k, r.n)).join('')}` : ''}
        ${cables.size ? `<div class="mp-res-sec">Cableado</div>${[...cables.values()].map(r =>
            fila(icoLinea(r.el), r.el?.name ?? 'Eliminado', `${metros(r.m)}<small>${r.n} ${r.n === 1 ? 'tramo' : 'tramos'}${r.sin ? ` · ${r.sin} sin medir` : ''}</small>`)).join('')}` : ''}
        ${puntos.size ? `<div class="mp-res-sec">Infraestructura</div>${[...puntos.values()].map(r => fila(icoPunto(r.el), r.el?.name ?? 'Eliminado', r.n)).join('')}` : ''}
        ${!E.items.length ? '<p class="mp-pop-vacio">Este mapa aún está vacío.</p>' : ''}`;
}

function popAjustes() {
    return `<div class="mp-pop-menu">
        <button type="button" data-acc="editar-mapa">${I.lapiz}Editar datos, portada y plano</button>
        <button type="button" data-acc="eliminar-mapa" class="peligro">${I.basura}Eliminar mapa</button>
    </div>`;
}

export async function editarMapa() {
    const yo = E;
    const urls = await signedUrls([E.mapa.coverPath, E.mapa.thumbPath]).catch(() => new Map());
    if (E !== yo) return;
    const antes = E.mapa;
    const m = await formularioMapa(E.mapa, { oscuro: true, urls });
    if (!m || E !== yo) return;
    E.mapa = m;
    E.raiz.querySelector('#mp-ed-nombre').textContent = m.name;
    E.raiz.querySelector('#mp-ed-tipo').textContent = m.kind;
    if (m.imagePath !== antes.imagePath) {
        cancelarModo();
        cerrarHoja();
        cargarPlano();
        pintarPanel();
    }
}

export async function borrarEsteMapa() {
    const yo = E;
    if (await eliminarMapa(E.mapa, { oscuro: true }) && E === yo) E.alVolver();
}
