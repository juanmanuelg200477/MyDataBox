// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — la ficha lateral del objeto elegido
//  Metraje, foto del bastidor y quitar del mapa.
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { toastError, toastSuccess } from '../../../toast.js';
import { signedUrl, updateItem, touchMap, setRackPhoto, removeRackPhoto, deleteItem } from '../../../mapsStore.js';
import { I, verImagen, metros, elegirImagen, prepararImagen, confirmar, esc } from '../ui.js';
import { fichaDispositivo, fichaBastidor, fichaInfra } from '../fichas.js';
import { E } from './estado.js';
import { rackPorId, elementoPorId, infoItem, indiceItems, puntosLinea } from './datos.js';
import { pintarLineas, pintarMarcas, pintarMapa } from './pintar.js';
import { pintarPanel } from './panel.js';

export async function abrirHoja(it) {
    if (it.kind === 'device') {
        pintarHoja(fichaDispositivo(E.indice.get(String(it.refId)), { editable: E.editable }), it);
    } else if (it.kind === 'rack') {
        const rack = rackPorId(it.refId);
        const ruta = rack && E.fotos.get(String(it.refId));
        pintarHoja(fichaBastidor(rack, { editable: E.editable, cargandoFoto: Boolean(ruta) }), it);
        if (!ruta) return;
        // La foto llega después: primero la ficha, luego la imagen
        const url = await signedUrl(ruta).catch(() => null);
        if (E?.seleccion === it.id) pintarHoja(fichaBastidor(rack, { editable: E.editable, fotoUrl: url }), it);
    } else {
        pintarHoja(fichaInfra(elementoPorId(it.refId), { editable: E.editable, tramo: it.kind === 'infra_line' ? it : null }), it);
    }
}

function pintarHoja(html, it) {
    const scroll = E.hoja.querySelector('.mp-hoja-scroll');
    const arriba = scroll?.dataset.item === it.id ? scroll.scrollTop : 0;
    E.hoja.innerHTML = `<button type="button" class="mp-hoja-x" data-acc="cerrar-hoja" aria-label="Cerrar">${I.x}</button>
        <div class="mp-hoja-scroll" data-item="${it.id}">${html}</div>`;
    E.hoja.querySelector('.mp-hoja-scroll').scrollTop = arriba;
    E.hoja.hidden = false;
    E.ed.classList.add('con-hoja');
}

export function cerrarHoja() {
    if (!E) return;
    E.hoja.hidden = true;
    E.hoja.innerHTML = '';
    E.ed.classList.remove('con-hoja');
    if (E.seleccion) {
        E.seleccion = null;
        pintarLineas();
        pintarMarcas();
    }
}

export function alClicHoja(e) {
    const b = e.target.closest('[data-acc]');
    if (!b || !E) return;
    const id = E.hoja.querySelector('.mp-hoja-scroll')?.dataset.item;
    const it = id && E.items.find(i => i.id === id);
    switch (b.dataset.acc) {
        case 'cerrar-hoja': cerrarHoja(); break;
        case 'quitar':      if (it) quitarDelMapa(it.id); break;
        case 'metraje':     if (it) guardarMetraje(it, b); break;
        case 'foto':        if (it) fotoBastidor(it); break;
        case 'foto-quitar': if (it) quitarFoto(it); break;
        case 'foto-ver': {
            const img = b.querySelector('img');
            if (img?.src) verImagen(img.src, rackPorId(it?.refId)?.name ?? 'Bastidor');
            break;
        }
    }
}

// Lo que escribe el usuario: vacío = sin medir; admite coma decimal y
// que se escriba la unidad ("35 m", "35 metros")
export function leerMetraje(crudo) {
    const t = String(crudo ?? '').trim().replace(/\s*(m|mts|metros)\.?$/i, '').replace(',', '.');
    if (!t) return { valor: null };
    const valor = Number(t);
    if (!Number.isFinite(valor) || valor < 0) return { error: 'El metraje debe ser un número positivo.' };
    if (valor >= 1e9) return { error: 'Ese metraje es demasiado grande.' };
    return { valor: Math.round(valor * 100) / 100 };
}

async function guardarMetraje(it, btn) {
    const { valor, error } = leerMetraje(E.hoja.querySelector('[data-campo="metraje"]')?.value);
    if (error) { toastError(error); return; }
    btn.disabled = true;
    try {
        const nuevo = await updateItem(it.id, { lengthM: valor });
        it.lengthM = nuevo.lengthM;
        if (!E) return;
        pintarMarcas();
        pintarPanel();
        toastSuccess(valor == null ? 'Metraje borrado: el tramo queda sin medir.' : `Tramo de ${metros(nuevo.lengthM)} guardado.`, { duration: 2200 });
        touchMap(E.mapa.id);
    } catch (err) {
        toastError(err.message);
    } finally {
        btn.disabled = false;
    }
}

async function fotoBastidor(it) {
    const file = await elegirImagen();
    if (!file || !E) return;
    const rack = rackPorId(it.refId);
    pintarHoja(fichaBastidor(rack, { editable: true, subiendo: true }), it);
    try {
        const { blob } = await prepararImagen(file, { max: 1600, calidad: 0.85 });
        const ruta = await setRackPhoto(String(it.refId), blob, E?.fotos.get(String(it.refId)));
        E?.fotos.set(String(it.refId), ruta);
        toastSuccess('Foto del bastidor guardada. Se ve en todos los mapas donde esté.', { duration: 2600 });
    } catch (err) {
        toastError(err.message, { title: 'No se guardó la foto' });
    }
    if (E?.seleccion === it.id) abrirHoja(it);
}

async function quitarFoto(it) {
    const ok = await confirmar({ oscuro: true, titulo: 'Quitar la foto', mensaje: 'Se borrará la foto de este bastidor en todos los mapas.', boton: 'Quitar foto' });
    if (!ok || !E) return;
    try {
        await removeRackPhoto(String(it.refId), E.fotos.get(String(it.refId)));
        E?.fotos.delete(String(it.refId));
        if (E?.seleccion === it.id) abrirHoja(it);
    } catch (err) {
        toastError(err.message);
    }
}

export async function quitarDelMapa(id) {
    const it = E.items.find(i => i.id === id);
    if (!it) return;
    const info = infoItem(it);
    const mensaje = it.kind === 'infra_line'
        ? `Este tramo de <b>${esc(info.nombre)}</b>${it.lengthM != null ? ` (${metros(it.lengthM)})` : ''} se quitará del mapa. El elemento sigue en tu catálogo.`
        : `<b>${esc(info.nombre)}</b> dejará de aparecer en este mapa. ${it.kind === 'infra_point' ? 'El elemento sigue en tu catálogo.' : 'En el inventario no cambia nada.'}`;
    const ok = await confirmar({ oscuro: true, titulo: 'Quitar del mapa', mensaje, boton: 'Quitar' });
    if (!ok || !E) return;
    // Los tramos pegados a esta marca se quedan donde están, ya sueltos
    const porId = indiceItems();
    const sueltos = E.items
        .filter(l => l.kind === 'infra_line' && (l.ends?.a === id || l.ends?.b === id))
        .map(l => ({
            l,
            points: puntosLinea(l, porId).map(([x, y]) => [x / E.W, y / E.H]),
            ends: { a: l.ends.a === id ? null : l.ends.a, b: l.ends.b === id ? null : l.ends.b }
        }));
    try {
        await deleteItem(id);
    } catch (err) {
        toastError(err.message);
        return;
    }
    if (!E) return;
    E.items = E.items.filter(i => i.id !== id);
    for (const s of sueltos) {
        s.l.points = s.points;
        s.l.ends = s.ends;
        updateItem(s.l.id, { points: s.points, ends: s.ends }).catch(err => console.warn('[mapas] tramo sin soltar:', err.message));
    }
    if (E.seleccion === id) cerrarHoja();
    pintarMapa();
    pintarPanel();
    touchMap(E.mapa.id);
    toastSuccess('Quitado del mapa.', { duration: 2000 });
}
