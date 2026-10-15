// ════════════════════════════════════════════════════════════════
//  MAPAS Y RUTAS — el editor de un mapa
//
//  · El plano va dentro de un "mundo" que se desplaza y amplía con un
//    transform. Marcas, etiquetas y líneas se contra-escalan con la
//    variable --z para verse siempre del mismo tamaño en pantalla.
//  · Las posiciones se guardan de 0 a 1 respecto a la imagen: si se
//    cambia el plano por otro de distinto tamaño, todo conserva su lugar.
//  · Panel con dos pestañas: Dispositivos (del inventario: aquí solo se
//    ubican) e Infraestructura (catálogo propio: se crea una vez y se usa
//    en cualquier mapa).
//  · En el teléfono el mapa se trabaja en horizontal.
// ════════════════════════════════════════════════════════════════
import { store, isViewer, genId } from '../../store.js';
import { toastSuccess, toastError, showToast } from '../../toast.js';
import {
    loadMap, addItem, updateItem, deleteItem, touchMap, loadInfra, saveInfra, deleteInfra, infraUsage,
    loadRackPhotos, setRackPhoto, removeRackPhoto, signedUrl, signedUrls, updateMap, subirImagen, borrarImagenes, SinPreparar
} from '../../mapsStore.js';
import { estiloDispositivo, ESTILO_BASTIDOR, estiloColor, icono3d } from './iconos.js';
import { TIPOS_INFRA, tipoInfra, ESTILOS_LINEA, GROSORES } from './catalogo.js';
import { dialogo, confirmar, hayDialogo, esc, I, metros, sinAcentos, elegirImagen, prepararImagen, prepararPlano, extension, verImagen } from './ui.js';
import { indiceDispositivos, fichaDispositivo, fichaBastidor, fichaInfra, resumenSpecs } from './fichas.js';
import { formularioMapa, eliminar as eliminarMapa } from './lista.js';

const CAPAS_KEY = 'databox:mapas:capas';
const IMAN_PX = 24;   // radio (en pantalla) para pegar un cable a una marca
const ESTILO_PERDIDO = { c: ['#e2e8f0', '#64748b'], glifo: I.x };
const CAPA_DE = { device: 'dispositivos', rack: 'bastidores', infra_point: 'puntos', infra_line: 'lineas' };

let E = null;               // el editor abierto
let animacion = 0;
let tBusca = 0;
let avisoCandadoDado = false;

// ── Pantallas ───────────────────────────────────────────────────
// Un teléfono tiene su lado corto por debajo de 600 px; una tableta no.
const esTelefono = () => Math.min(screen.width, screen.height) < 600;
const esTelefonoVertical = () => esTelefono() && innerHeight > innerWidth;
// Igual que en maps.css: solo en escritorio el panel va fijo a la izquierda
const panelFijo = () => matchMedia('(min-width: 1025px) and (min-height: 501px)').matches;

// Se llama desde el toque que abre un mapa: el navegador solo deja poner
// pantalla completa y girar si viene de un gesto del usuario. En Android
// funciona; en iPhone no existe y queda el aviso de "Gira tu teléfono".
export function intentarHorizontal(el) {
    if (!esTelefono() || !matchMedia('(pointer: coarse)').matches || document.fullscreenElement) return;
    el.requestFullscreen?.({ navigationUI: 'hide' })
        ?.then(() => screen.orientation?.lock?.('landscape'))
        .catch(() => { /* sin soporte: lo resuelve el aviso de girar */ });
}

// ── Abrir / cerrar ──────────────────────────────────────────────
export async function abrirEditor(raiz, mapaId, { alVolver }) {
    cerrarEditor();
    const yo = (E = {
        raiz, alVolver,
        mapa: null, items: [], infra: [], fotos: new Map(), indice: new Map(),
        editable: !isViewer(),
        desbloqueado: false,
        tab: 'dispositivos', agrupar: 'tipo', busqueda: '', busquedaInfra: '', filtroTipo: '', abiertos: new Set(),
        vista: { tx: 0, ty: 0, z: 1 }, W: 1, H: 1, zAjuste: 1, listo: false, tocada: false,
        modo: null, seleccion: null, imanId: null,
        capas: capasGuardadas(),
        escuchas: [], punteros: new Map(), gesto: null, ro: null
    });
    document.body.classList.add('mp-ed-abierto');
    raiz.innerHTML = `<div class="mp-ed mp-ed-espera"><div class="mp-ed-espera-caja"><div class="db-spinner"></div><span>Abriendo mapa…</span></div></div>`;

    let datos;
    try {
        const [res, infra, fotos] = await Promise.all([loadMap(mapaId), loadInfra(), loadRackPhotos()]);
        datos = { res, infra, fotos };
    } catch (err) {
        if (E !== yo) return;
        pantallaError(err instanceof SinPreparar
            ? 'Mapas aún no está preparado en la base de datos. Ejecuta «npx supabase db push» en la carpeta astro_app.'
            : err.message);
        return;
    }
    if (E !== yo) return;
    if (!datos.res || datos.res.mapa.deletedAt) {
        pantallaError(datos.res ? 'Este mapa está en la papelera. Restáuralo desde la lista para abrirlo.' : 'Este mapa ya no existe.');
        return;
    }
    E.mapa = datos.res.mapa;
    E.items = datos.res.items;
    E.infra = datos.infra;
    E.fotos = datos.fotos;
    E.indice = indiceDispositivos();
    construir();
}

export function cerrarEditor() {
    if (!E) return;
    const yo = E;
    E = null;
    cancelAnimationFrame(animacion);
    clearTimeout(tBusca);
    yo.escuchas.forEach(([o, ev, fn, op]) => o.removeEventListener(ev, fn, op));
    yo.ro?.disconnect();
    devolverAvisos();
    salirPantallaCompleta(yo.raiz);
    document.body.classList.remove('mp-ed-abierto');
}

function escuchar(o, ev, fn, op) {
    o.addEventListener(ev, fn, op);
    E.escuchas.push([o, ev, fn, op]);
}

function pantallaError(msg) {
    E.raiz.innerHTML = `<div class="mp-ed mp-ed-espera">
        <div class="mp-aviso-grande oscuro">
            <h2>No se pudo abrir el mapa</h2>
            <p>${esc(msg)}</p>
            <button type="button" class="mp-btn mp-btn-primario" data-acc="volver">${I.atras}Volver a los mapas</button>
        </div>
    </div>`;
    E.raiz.querySelector('[data-acc="volver"]').onclick = () => E?.alVolver();
}

function capasGuardadas() {
    // nombres → equipos y bastidores (botón de arriba) · nombresInfra → puntos de infraestructura (Capas)
    const base = { dispositivos: true, bastidores: true, puntos: true, lineas: true, nombres: false, nombresInfra: false, minimizar: false, metraje: true, opacidad: 1 };
    try { return { ...base, ...JSON.parse(localStorage.getItem(CAPAS_KEY) ?? '{}') }; } catch { return base; }
}

// ── Estructura ──────────────────────────────────────────────────
function construir() {
    const m = E.mapa;
    const puedeGirar = document.fullscreenEnabled && typeof screen.orientation?.lock === 'function';
    E.raiz.innerHTML = `<div class="mp-ed ${E.editable ? 'editable' : 'solo-ver'} ${panelFijo() ? 'panel-abierto' : ''}" id="mp-ed">
        <header class="mp-ed-barra">
            <button type="button" class="mp-ed-volver" data-acc="volver" aria-label="Volver a los mapas">${I.atras}<span>Mapas</span></button>
            <div class="mp-ed-tit">
                <span class="mp-ed-tipo" id="mp-ed-tipo">${esc(m.kind)}</span>
                <h2 id="mp-ed-nombre">${esc(m.name)}</h2>
            </div>
            ${E.editable ? '' : '<span class="mp-ed-lectura">Solo lectura</span>'}
            <div class="mp-ed-herr">
                <button type="button" class="mp-ed-h" data-acc="panel" aria-label="Lista de objetos" title="Lista de objetos">${I.panel}<span>Objetos</span></button>
                ${E.editable ? '<button type="button" class="mp-ed-h" data-acc="bloqueo" id="mp-h-bloqueo"></button>' : ''}
                <button type="button" class="mp-ed-h" data-acc="minimizar" aria-pressed="false" aria-label="Minimizar iconos" title="Ver los equipos y bastidores como puntos azules">${I.puntos}<span>Minimizar iconos</span></button>
                <button type="button" class="mp-ed-h" data-acc="nombres" aria-pressed="false" aria-label="Mostrar nombres" title="Ver el nombre de todos los equipos y bastidores">${I.etiqueta}<span>Mostrar nombres</span></button>
                <button type="button" class="mp-ed-h" data-acc="capas" aria-label="Capas" title="Capas">${I.capas}<span>Capas</span></button>
                <button type="button" class="mp-ed-h" data-acc="resumen" aria-label="Resumen" title="Resumen del mapa">${I.resumen}<span>Resumen</span></button>
                ${E.editable ? `<button type="button" class="mp-ed-h solo-ico" data-acc="ajustes" aria-label="Opciones del mapa" title="Opciones del mapa">${I.ajustes}</button>` : ''}
            </div>
        </header>
        <div class="mp-ed-cuerpo">
            <aside class="mp-panel" id="mp-panel" aria-label="Objetos para ubicar">
                <div class="mp-seg mp-seg-osc mp-panel-tabs" role="tablist">
                    <button type="button" role="tab" data-tab="dispositivos">${I.pin}Dispositivos</button>
                    <button type="button" role="tab" data-tab="infra">${I.capas}Infraestructura</button>
                </div>
                <div class="mp-panel-cuerpo" id="mp-panel-cuerpo"></div>
            </aside>
            <div class="mp-lienzo" id="mp-lienzo">
                <div class="mp-mundo" id="mp-mundo">
                    <img class="mp-plano" id="mp-plano" alt="" draggable="false">
                    <svg class="mp-lineas" id="mp-lineas" xmlns="http://www.w3.org/2000/svg"><g id="mp-g-lineas"></g><g id="mp-g-borrador"></g></svg>
                    <div class="mp-marcas" id="mp-marcas"></div>
                </div>
                <div class="mp-ed-aviso" id="mp-aviso" hidden></div>
                <div class="mp-ed-zoom">
                    <button type="button" data-acc="zoom-mas" aria-label="Acercar">${I.mas}</button>
                    <button type="button" data-acc="zoom-menos" aria-label="Alejar">${I.menos}</button>
                    <button type="button" data-acc="ajustar" aria-label="Ver todo el mapa">${I.ajustar}</button>
                </div>
                <div class="mp-fantasma" id="mp-fantasma" hidden></div>
                <div class="mp-sinplano" id="mp-sinplano" hidden></div>
                <div class="mp-cargando-plano" id="mp-cargando-plano"><div class="db-spinner"></div></div>
            </div>
            <aside class="mp-hoja" id="mp-hoja" hidden></aside>
        </div>
        <div class="mp-pop" id="mp-pop" hidden></div>
        <div class="mp-girar" id="mp-girar">
            <div class="mp-girar-fig"><span class="mp-girar-tel">${I.girar}</span></div>
            <h3>Gira tu teléfono</h3>
            <p>Los mapas se trabajan en horizontal: así caben el plano, la lista de objetos y las fichas.</p>
            ${puedeGirar ? '<button type="button" class="mp-btn mp-btn-primario mp-btn-alto" data-acc="girar">Poner en horizontal</button>' : ''}
            <button type="button" class="mp-btn mp-btn-suave" data-acc="volver">${I.atras}Volver a los mapas</button>
        </div>
    </div>`;

    E.ed = E.raiz.querySelector('#mp-ed');
    E.lienzo = E.raiz.querySelector('#mp-lienzo');
    E.mundo = E.raiz.querySelector('#mp-mundo');
    E.img = E.raiz.querySelector('#mp-plano');
    E.svg = E.raiz.querySelector('#mp-lineas');
    E.gLineas = E.raiz.querySelector('#mp-g-lineas');
    E.gBorrador = E.raiz.querySelector('#mp-g-borrador');
    E.capaMarcas = E.raiz.querySelector('#mp-marcas');
    E.hoja = E.raiz.querySelector('#mp-hoja');
    E.pop = E.raiz.querySelector('#mp-pop');
    E.aviso = E.raiz.querySelector('#mp-aviso');
    E.fantasma = E.raiz.querySelector('#mp-fantasma');

    conectar();
    pintarBloqueo();
    aplicarCapas();
    pintarPanel();
    cargarPlano();
}

// ── Plano ───────────────────────────────────────────────────────
async function cargarPlano() {
    const yo = E;
    const sin = E.raiz.querySelector('#mp-sinplano');
    const cargando = E.raiz.querySelector('#mp-cargando-plano');
    E.listo = false;
    E.ed.classList.toggle('sin-plano', !E.mapa.imagePath);
    if (!E.mapa.imagePath) {
        cargando.hidden = true;
        sin.hidden = false;
        sin.innerHTML = `<div class="mp-sinplano-caja">
            <div class="mp-sinplano-ico">${I.mapa}</div>
            <h3>Este mapa todavía no tiene su imagen</h3>
            <p>Sube el plano, croquis o diagrama: es la base sobre la que se ubica todo. Sin imagen no se puede mapear.</p>
            ${E.editable ? `<button type="button" class="mp-btn mp-btn-primario mp-btn-alto" data-acc="subir-plano">${I.imagen}Subir imagen del mapa</button>` : ''}
        </div>`;
        pintarMapa();
        return;
    }
    sin.hidden = true;
    cargando.hidden = false;
    try {
        const url = await signedUrl(E.mapa.imagePath);
        if (E !== yo) return;
        if (!url) throw new Error('sin enlace');
        await new Promise((ok, mal) => {
            E.img.onload = ok;
            E.img.onerror = mal;
            E.img.src = url;
        });
    } catch {
        if (E !== yo) return;
        cargando.hidden = true;
        sin.hidden = false;
        sin.innerHTML = `<div class="mp-sinplano-caja">
            <div class="mp-sinplano-ico">${I.imagen}</div>
            <h3>No se pudo cargar la imagen del plano</h3>
            <p>Revisa la conexión e inténtalo de nuevo.</p>
            <button type="button" class="mp-btn mp-btn-primario" data-acc="reintentar-plano">Reintentar</button>
        </div>`;
        return;
    }
    if (E !== yo) return;
    cargando.hidden = true;
    E.W = E.img.naturalWidth || E.mapa.imageW || 1000;
    E.H = E.img.naturalHeight || E.mapa.imageH || 700;
    E.mundo.style.width = `${E.W}px`;
    E.mundo.style.height = `${E.H}px`;
    E.svg.setAttribute('viewBox', `0 0 ${E.W} ${E.H}`);
    E.svg.setAttribute('width', E.W);
    E.svg.setAttribute('height', E.H);
    E.listo = true;
    ajustar(false);
    pintarMapa();
    pintarPanel();
}

async function subirPlano() {
    const file = await elegirImagen();
    if (!file || !E) return;
    const yo = E;
    const btn = E.raiz.querySelector('[data-acc="subir-plano"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Subiendo imagen…'; }
    try {
        const { plano, mini } = await prepararPlano(file);
        const imagePath = await subirImagen(`maps/${yo.mapa.id}/plano-${genId()}.${extension(plano.blob)}`, plano.blob);
        const thumbPath = await subirImagen(`maps/${yo.mapa.id}/mini-${genId()}.${extension(mini.blob)}`, mini.blob);
        const viejas = [yo.mapa.imagePath, yo.mapa.thumbPath];
        const m = await updateMap(yo.mapa.id, { imagePath, thumbPath, imageW: plano.w, imageH: plano.h }, { auditar: false });
        borrarImagenes(viejas);
        if (E !== yo) return;
        E.mapa = m;
        toastSuccess('Imagen del mapa lista. Ya puedes empezar a ubicar.');
        cargarPlano();
    } catch (err) {
        toastError(err.message, { title: 'No se subió la imagen' });
        if (btn?.isConnected) { btn.disabled = false; btn.innerHTML = `${I.imagen}Subir imagen del mapa`; }
    }
}

// ── Vista: desplazar y ampliar ──────────────────────────────────
function tamLienzo() {
    const r = E.lienzo.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top };
}

function limitesZoom() {
    return { min: E.zAjuste * 0.5, max: Math.max(E.zAjuste * 12, 2.5) };
}

function aplicarVista() {
    const { tx, ty, z } = E.vista;
    E.mundo.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
    E.mundo.style.setProperty('--z', z);
}

// Siempre queda a la vista al menos un trozo del plano
function acotar(v = E.vista) {
    const { w, h } = tamLienzo();
    const margen = 80;
    v.tx = Math.min(Math.max(v.tx, margen - E.W * v.z), w - margen);
    v.ty = Math.min(Math.max(v.ty, margen - E.H * v.z), h - margen);
}

function ajustar(animado = true) {
    if (!E?.listo) return;
    const { w, h } = tamLienzo();
    if (!w || !h) return;
    const z = Math.min(w / E.W, h / E.H) * 0.92;
    E.zAjuste = z;
    E.tocada = false;
    irA({ z, tx: (w - E.W * z) / 2, ty: (h - E.H * z) / 2 }, animado);
}

function zoomEn(factor, cx, cy, animado = false) {
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

function irA(destino, animado = true) {
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

function centrarEn(it) {
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
function aMundo(clientX, clientY) {
    const { left, top } = tamLienzo();
    const v = E.vista;
    return { x: (clientX - left - v.tx) / v.z, y: (clientY - top - v.ty) / v.z };
}

const aNorm = (p) => ({ x: Math.min(1, Math.max(0, p.x / E.W)), y: Math.min(1, Math.max(0, p.y / E.H)) });

function posMundo(it) {
    if (it.kind === 'infra_line') return mitad(puntosLinea(it));
    return { x: it.x * E.W, y: it.y * E.H };
}

const indiceItems = () => new Map(E.items.map(i => [i.id, i]));

// Puntos de un tramo en px. Si su inicio o su final están pegados a una
// marca, siguen a esa marca aunque se haya movido.
function puntosLinea(it, porId) {
    const pts = (it.points ?? []).map(([x, y]) => [x * E.W, y * E.H]);
    if (pts.length < 2) return pts;
    const buscar = (id) => id && (porId ? porId.get(id) : E.items.find(o => o.id === id));
    const a = buscar(it.ends?.a);
    const b = buscar(it.ends?.b);
    if (a && a.kind !== 'infra_line') pts[0] = [a.x * E.W, a.y * E.H];
    if (b && b.kind !== 'infra_line') pts[pts.length - 1] = [b.x * E.W, b.y * E.H];
    return pts;
}

const tieneCablesPegados = (id) => E.items.some(i => i.kind === 'infra_line' && (i.ends?.a === id || i.ends?.b === id));

// Punto a la mitad del recorrido (no de la recta entre los extremos)
function mitad(pts) {
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
const rackPorId = (id) => store.racks.find(r => String(r.id) === String(id)) ?? null;
const elementoPorId = (id) => E.infra.find(e => e.id === id) ?? null;
const nombreArea = (id) => store.areas.find(a => a.id === id)?.name ?? '';

function infoItem(it) {
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

// ── Pintado del mapa ────────────────────────────────────────────
function pintarMapa() {
    pintarLineas();
    pintarBorrador();
    pintarMarcas();
}

function pintarLineas() {
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
function pintarBorrador() {
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

function pintarMarcas() {
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

function marcarIman(id) {
    if (!E || E.imanId === id) return;
    if (E.imanId) E.capaMarcas.querySelector(`[data-item="${E.imanId}"]`)?.classList.remove('iman');
    E.imanId = id;
    if (id) E.capaMarcas.querySelector(`[data-item="${id}"]`)?.classList.add('iman');
}

function aplicarCapas() {
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

// ── Eventos ─────────────────────────────────────────────────────
function conectar() {
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

function pintarBloqueo() {
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

// ── Gestos sobre el lienzo ──────────────────────────────────────
function alBajar(e) {
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

function alMover(e) {
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

function alSubir(e) {
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

function alCancelarPuntero(e) {
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

function alRueda(e) {
    if (!E?.listo) return;
    e.preventDefault();
    const { left, top } = tamLienzo();
    const unidad = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    // El pellizco del trackpad llega como rueda con Ctrl: más sensible
    const factor = Math.exp(-e.deltaY * unidad * (e.ctrlKey ? 0.01 : 0.0015));
    zoomEn(factor, e.clientX - left, e.clientY - top);
}

function alDobleClic(e) {
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
function imanCerca(clientX, clientY) {
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

// ── Seleccionar y vista previa ──────────────────────────────────
function seleccionar(id) {
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

async function abrirHoja(it) {
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

function cerrarHoja() {
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

function alClicHoja(e) {
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
function leerMetraje(crudo) {
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

async function quitarDelMapa(id) {
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

// ── Mover lo que ya está puesto ─────────────────────────────────
async function guardarMarcaMovida(g) {
    // Los tramos pegados a la marca guardan su nuevo extremo
    const porId = indiceItems();
    const pegados = E.items.filter(i => i.kind === 'infra_line' && (i.ends?.a === g.it.id || i.ends?.b === g.it.id));
    for (const l of pegados) l.points = puntosLinea(l, porId).map(([x, y]) => [x / E.W, y / E.H]);
    pintarMapa();
    try {
        await updateItem(g.it.id, { x: g.it.x, y: g.it.y });
    } catch (err) {
        if (!E) return;
        g.it.x = g.antes.x;
        g.it.y = g.antes.y;
        pintarMapa();
        toastError(err.message, { title: 'No se movió' });
        return;
    }
    // Los tramos siguen a la marca al pintarse; guardar sus puntos es solo
    // para cuando la marca se quite y se queden sueltos.
    pegados.forEach(l => updateItem(l.id, { points: l.points }).catch(err => console.warn('[mapas] tramo:', err.message)));
    if (E) touchMap(E.mapa.id);
}

async function guardarVertices(g) {
    E.imanId = null;
    pintarMapa();
    try {
        await updateItem(g.it.id, { points: g.it.points, ends: g.it.ends });
        if (E) touchMap(E.mapa.id);
    } catch (err) {
        if (!E) return;
        g.it.points = g.antes.points;
        g.it.ends = g.antes.ends;
        pintarMapa();
        toastError(err.message, { title: 'No se movió el tramo' });
    }
}

// ── Colocar en el mapa ──────────────────────────────────────────
function puedeMapear() {
    if (!E.editable) return false;
    if (!E.mapa.imagePath || !E.listo) {
        toastError('Primero sube la imagen del mapa: es la base para ubicar todo.');
        return false;
    }
    return true;
}

function empezarColocar(obj) {
    if (!puedeMapear()) return;
    cerrarHoja();
    E.modo = { tipo: 'colocar', obj, varios: obj.kind === 'infra_point', ocupado: false };
    E.fantasma.innerHTML = icono3d(obj.estilo, { tam: obj.kind === 'infra_point' ? 30 : 38 });
    E.fantasma.hidden = true;
    E.ed.classList.remove('trazando');
    E.ed.classList.add('colocando');
    marcarIman(null);
    pintarBorrador();
    pintarAviso();
    if (!panelFijo()) E.ed.classList.remove('panel-abierto');
    pintarPanel();
}

// Tocar el fondo oscuro (fuera del plano) no ubica nada
let ultimoAvisoFuera = 0;
function fueraDelPlano(e) {
    const p = aMundo(e.clientX, e.clientY);
    const margen = 2 / E.vista.z;
    const fuera = p.x < -margen || p.y < -margen || p.x > E.W + margen || p.y > E.H + margen;
    if (fuera && Date.now() - ultimoAvisoFuera > 3000) {
        ultimoAvisoFuera = Date.now();
        showToast('Toca dentro del plano para ubicarlo.', { duration: 2200 });
    }
    return fuera;
}

async function colocarEn(e, modo) {
    const { obj } = modo;
    if (modo.ocupado && !modo.varios) return;
    if (fueraDelPlano(e)) return;
    if (!modo.varios && E.items.some(i => i.kind === obj.kind && String(i.refId) === obj.id)) {
        if (E.modo === modo) cancelarModo();
        toastError(`«${obj.nombre}» ya está en este mapa.`);
        return;
    }
    const n = aNorm(aMundo(e.clientX, e.clientY));
    modo.ocupado = true;
    try {
        const it = await addItem(E.mapa.id, { kind: obj.kind, refId: obj.id, x: n.x, y: n.y });
        if (!E) return;
        E.items.push(it);
        touchMap(E.mapa.id);
        if (!modo.varios) {
            if (E.modo === modo) cancelarModo();
            toastSuccess(`«${obj.nombre}» ubicado en el mapa.`, { duration: 1800 });
        }
        pintarMapa();
        pintarPanel();
    } catch (err) {
        toastError(err.message);
    } finally {
        modo.ocupado = false;
    }
}

function alArrastrarObjeto(e) {
    const fila = e.target.closest?.('.mp-obj[draggable="true"]');
    if (!fila) return;
    e.dataTransfer.setData('application/x-mapa', JSON.stringify({ kind: fila.dataset.kind, id: fila.dataset.id }));
    e.dataTransfer.effectAllowed = 'copy';
    const ico = fila.querySelector('.ic3d');
    if (ico) e.dataTransfer.setDragImage(ico, 15, 15);
}

function alArrastrarEncima(e) {
    if (!E?.listo || !E.editable || !e.dataTransfer?.types?.includes('application/x-mapa')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    E.lienzo.classList.add('soltando');
}

async function alSoltarObjeto(e) {
    if (!E) return;
    E.lienzo.classList.remove('soltando');
    const crudo = e.dataTransfer?.getData('application/x-mapa');
    if (!crudo) return;
    e.preventDefault();
    let ref;
    try { ref = JSON.parse(crudo); } catch { return; }
    const obj = objetos().find(o => o.kind === ref.kind && o.id === ref.id);
    if (!obj || !puedeMapear()) return;
    await colocarEn(e, { tipo: 'colocar', obj, varios: false, ocupado: false });
}

function cancelarModo() {
    if (!E?.modo) return;
    E.modo = null;
    E.fantasma.hidden = true;
    E.ed.classList.remove('colocando', 'trazando');
    E.aviso.hidden = true;
    marcarIman(null);
    pintarBorrador();
    pintarPanel();
}

function pintarAviso() {
    const m = E.modo;
    if (!m) { E.aviso.hidden = true; return; }
    if (m.tipo === 'colocar') {
        E.aviso.innerHTML = `${icono3d(m.obj.estilo, { tam: 26 })}
            <span class="mp-aviso-txt">${m.varios ? 'Toca el mapa para colocar' : 'Toca el mapa donde está'} <b>${esc(m.obj.nombre)}</b>
                ${m.varios ? '<small>Puedes poner varios. Pulsa «Listo» al terminar.</small>' : '<small>En la computadora también puedes arrastrarlo desde la lista.</small>'}</span>
            <button type="button" class="mp-btn mp-btn-suave" data-acc="cancelar-modo">${m.varios ? `${I.check}Listo` : 'Cancelar'}</button>`;
    } else {
        const n = m.puntos.length;
        E.aviso.innerHTML = `<span class="mp-muestra-linea corta ${esc(m.elemento.specs?.estilo ?? 'solida')}" style="--lc:${esc(m.elemento.color || '#0ea5e9')}"></span>
            <span class="mp-aviso-txt"><b>${esc(m.elemento.name)}</b> · ${n ? `${n} ${n === 1 ? 'punto' : 'puntos'}` : 'toca donde empieza el tramo'}
                <small>${n < 2 ? 'Toca cada quiebre del recorrido. Si tocas un equipo, el cable se pega a él.' : 'Doble clic o «Terminar» en el último punto.'}</small></span>
            <button type="button" class="mp-btn mp-btn-suave" data-acc="deshacer-punto" ${n ? '' : 'disabled'} aria-label="Quitar el último punto">${I.deshacer}<span>Punto</span></button>
            <button type="button" class="mp-btn mp-btn-primario" data-acc="terminar" ${n >= 2 ? '' : 'disabled'}>${I.check}Terminar</button>
            <button type="button" class="mp-btn mp-btn-suave" data-acc="cancelar-modo">Salir</button>`;
    }
    E.aviso.hidden = false;
}

// ── Trazar cableado ─────────────────────────────────────────────
function empezarTrazo(elemento) {
    if (!puedeMapear()) return;
    cerrarHoja();
    E.modo = { tipo: 'trazar', elemento, puntos: [], pegados: [], cursor: null, guardando: false };
    E.fantasma.hidden = true;
    E.ed.classList.remove('colocando');
    E.ed.classList.add('trazando');
    if (!panelFijo()) E.ed.classList.remove('panel-abierto');
    pintarAviso();
    pintarBorrador();
    pintarPanel();
}

function agregarPunto(e) {
    const m = E.modo;
    if (m.guardando) return;
    const iman = imanCerca(e.clientX, e.clientY);
    if (!iman && fueraDelPlano(e)) return;
    const n = iman ? { x: iman.x, y: iman.y } : aNorm(aMundo(e.clientX, e.clientY));
    // El doble clic que termina deja dos puntos encima: no se repiten
    const ult = m.puntos[m.puntos.length - 1];
    if (ult && Math.hypot((ult[0] - n.x) * E.W * E.vista.z, (ult[1] - n.y) * E.H * E.vista.z) < 4) return;
    m.puntos.push([n.x, n.y]);
    m.pegados.push(iman?.id ?? null);
    m.cursor = null;
    pintarAviso();
    pintarBorrador();
}

function deshacerPunto() {
    const m = E.modo;
    if (m?.tipo !== 'trazar' || !m.puntos.length || m.guardando) return;
    m.puntos.pop();
    m.pegados.pop();
    pintarAviso();
    pintarBorrador();
}

async function terminarTrazo() {
    const m = E.modo;
    if (m?.tipo !== 'trazar' || m.guardando) return;
    if (m.puntos.length < 2) { toastError('Un tramo necesita al menos dos puntos.'); return; }
    m.guardando = true;
    const datos = {
        kind: 'infra_line', refId: m.elemento.id, points: m.puntos.map(p => [...p]),
        ends: { a: m.pegados[0] ?? null, b: m.pegados[m.pegados.length - 1] ?? null }
    };
    try {
        const it = await addItem(E.mapa.id, datos);
        if (!E) return;
        E.items.push(it);
        // Listo para el siguiente tramo con el mismo elemento
        m.puntos = [];
        m.pegados = [];
        m.cursor = null;
        pintarMapa();
        if (E.modo === m) pintarAviso();
        pintarPanel();
        touchMap(E.mapa.id);
        pedirMetraje(it);
    } catch (err) {
        toastError(err.message, { title: 'No se guardó el tramo' });
    } finally {
        m.guardando = false;
    }
}

// El tramo ya quedó guardado: aquí solo se pide su metraje, que es opcional
function pedirMetraje(it) {
    const el = elementoPorId(it.refId);
    const { caja } = dialogo({
        oscuro: true,
        ancho: 380,
        clase: 'mp-dlg-metraje',
        titulo: 'Metraje del tramo',
        cuerpo: `<p class="mp-dlg-sub"><b>${esc(el?.name ?? 'Tramo')}</b>. Si aún no lo sabes, déjalo en blanco: lo agregas después tocando el tramo.</p>
            <div class="mp-metraje-campo grande">
                <input type="text" inputmode="decimal" autocomplete="off" maxlength="14" id="mp-metraje-nuevo" placeholder="0" aria-label="Metros">
                <span>metros</span>
            </div>`,
        botones: [
            { r: 'omitir', texto: 'Sin metraje', clase: 'mp-btn-suave' },
            { r: 'guardar', texto: 'Guardar', clase: 'mp-btn-primario' }
        ],
        alPulsar: async (r) => {
            if (r !== 'guardar') return true;
            const { valor, error } = leerMetraje(caja.querySelector('#mp-metraje-nuevo').value);
            if (error) { toastError(error); return false; }
            if (valor == null) return true;
            try {
                const nuevo = await updateItem(it.id, { lengthM: valor });
                const local = E?.items.find(i => i.id === it.id);
                if (local) { local.lengthM = nuevo.lengthM; pintarMarcas(); pintarPanel(); }
                return true;
            } catch (err) {
                toastError(err.message);
                return false;
            }
        }
    });
    caja.querySelector('#mp-metraje-nuevo').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        caja.querySelector('[data-r="guardar"]').click();
    });
}

// ── Panel: objetos del inventario ───────────────────────────────
function objetos() {
    const lista = [];
    for (const r of store.racks) {
        const area = nombreArea(r.areaId);
        lista.push({
            kind: 'rack', id: String(r.id), nombre: r.name, tipo: 'Bastidores', area: area || 'Sin área',
            sub: [`${parseInt(r.height, 10) || 42}U`, area].filter(Boolean).join(' · '), estilo: ESTILO_BASTIDOR,
            buscar: sinAcentos(`${r.name} ${area} bastidor rack ${r.type ?? ''}`)
        });
    }
    for (const d of store.devices) {
        lista.push({
            kind: 'device', id: String(d.id), nombre: d.name || 'Sin nombre', tipo: d.device || 'Sin tipo', area: d.area || 'Sin área',
            sub: [d.ip, d.area].filter(Boolean).join(' · ') || d.model || '', estilo: estiloDispositivo(d),
            buscar: sinAcentos(`${d.name} ${d.device} ${d.ip} ${d.mac} ${d.serial} ${d.model} ${d.brand} ${d.area}`)
        });
    }
    return lista;
}

const clavesPuestas = () => new Set(E.items.filter(i => i.kind === 'device' || i.kind === 'rack').map(i => `${i.kind}:${i.refId}`));

function pintarPanel() {
    if (!E?.ed) return;
    const cuerpo = E.raiz.querySelector('#mp-panel-cuerpo');
    E.raiz.querySelectorAll('#mp-panel .mp-panel-tabs [data-tab]').forEach(b => {
        b.classList.toggle('activo', b.dataset.tab === E.tab);
        b.setAttribute('aria-selected', b.dataset.tab === E.tab);
    });
    // Se conserva el scroll de la lista y el foco del buscador
    const lista = cuerpo.querySelector('.mp-pan-lista');
    const arriba = lista?.dataset.de === E.tab ? lista.scrollTop : 0;
    const activo = document.activeElement;
    const foco = activo?.matches?.('#mp-panel input') ? activo.id : '';
    const cursor = foco ? activo.selectionStart : null;
    cuerpo.innerHTML = E.tab === 'dispositivos' ? panelDispositivos() : panelInfra();
    const nueva = cuerpo.querySelector('.mp-pan-lista');
    if (nueva) nueva.scrollTop = arriba;
    if (foco) {
        const el = cuerpo.querySelector(`#${foco}`);
        el?.focus();
        if (el && cursor != null) try { el.setSelectionRange(cursor, cursor); } catch { /* no es de texto */ }
    }
}

// Solo la lista (al buscar o abrir un grupo): no toca el buscador
function pintarLista() {
    const lista = E.raiz.querySelector('.mp-pan-lista');
    if (!lista) return;
    const arriba = lista.scrollTop;
    lista.innerHTML = E.tab === 'dispositivos' ? listaDispositivos() : listaInfra();
    lista.scrollTop = arriba;
}

function tiposDe(todos) {
    return [...new Set(todos.map(o => o.tipo))]
        .sort((a, b) => (a === 'Bastidores' ? -1 : b === 'Bastidores' ? 1 : a.localeCompare(b, 'es')));
}

function panelDispositivos() {
    const todos = objetos();
    const tipos = tiposDe(todos);
    if (E.filtroTipo && !tipos.includes(E.filtroTipo)) E.filtroTipo = '';
    return `<div class="mp-pan-cab">
            <span>OBJETOS <b>(${todos.length})</b></span>
            <div class="mp-seg mp-seg-mini">
                <button type="button" data-agrupar="tipo" class="${E.agrupar === 'tipo' ? 'activo' : ''}">Por tipo</button>
                <button type="button" data-agrupar="area" class="${E.agrupar === 'area' ? 'activo' : ''}">Por área</button>
            </div>
        </div>
        <label class="mp-pan-buscar">${I.buscar}<input type="search" id="mp-buscar-obj" value="${esc(E.busqueda)}" placeholder="Buscar por nombre, IP o serie…" autocomplete="off" aria-label="Buscar objetos"></label>
        ${tipos.length > 1 ? `<div class="mp-pan-chips">
            <button type="button" data-filtro="" class="${!E.filtroTipo ? 'activo' : ''}">Todos</button>
            ${tipos.map(t => `<button type="button" data-filtro="${esc(t)}" class="${E.filtroTipo === t ? 'activo' : ''}">${esc(t)}</button>`).join('')}
        </div>` : ''}
        ${!E.mapa.imagePath && E.editable ? `<p class="mp-pan-nota">${I.imagen}Sube la imagen del mapa para empezar a ubicar.</p>` : ''}
        <div class="mp-pan-titulo">${E.agrupar === 'tipo' ? 'GRUPOS' : 'ÁREAS'}</div>
        <div class="mp-pan-lista" data-de="dispositivos">${listaDispositivos(todos, tipos)}</div>`;
}

function listaDispositivos(todos = objetos(), tipos = tiposDe(todos)) {
    const q = sinAcentos(E.busqueda.trim());
    const clave = E.agrupar === 'tipo' ? 'tipo' : 'area';
    const grupos = new Map();
    for (const o of todos) {
        if (E.filtroTipo && o.tipo !== E.filtroTipo) continue;
        if (q && !o.buscar.includes(q)) continue;
        if (!grupos.has(o[clave])) grupos.set(o[clave], []);
        grupos.get(o[clave]).push(o);
    }
    if (!grupos.size) {
        return `<p class="mp-pan-vacio">${todos.length ? 'Nada coincide con la búsqueda.' : 'Aún no hay dispositivos ni bastidores en el inventario. Créalos en sus módulos y aparecerán aquí.'}</p>`;
    }
    const orden = [...grupos.keys()].sort((a, b) => clave === 'tipo'
        ? tipos.indexOf(a) - tipos.indexOf(b)
        : (a === 'Sin área') - (b === 'Sin área') || a.localeCompare(b, 'es'));
    const puestas = clavesPuestas();
    return orden.map(g => {
        const lista = grupos.get(g);
        const n = lista.filter(o => puestas.has(`${o.kind}:${o.id}`)).length;
        const abierto = Boolean(q) || Boolean(E.filtroTipo) || grupos.size === 1 || E.abiertos.has(`${clave}:${g}`);
        return `<div class="mp-grupo-l ${abierto ? 'abierto' : ''}">
            <button type="button" class="mp-grupo-cab" data-grupo="${esc(`${clave}:${g}`)}" aria-expanded="${abierto}">
                <span class="mp-grupo-flecha">${I.flecha}</span>
                <span class="mp-grupo-nombre">${esc(g)} <i>(${lista.length})</i></span>
                ${n ? `<span class="mp-grupo-en" title="${n} en este mapa">${I.pin}${n}</span>` : ''}
            </button>
            ${abierto ? `<div class="mp-grupo-items">${lista.map(o => filaObjeto(o, puestas)).join('')}</div>` : ''}
        </div>`;
    }).join('');
}

function filaObjeto(o, puestas) {
    const puesto = puestas.has(`${o.kind}:${o.id}`);
    const activo = E.modo?.tipo === 'colocar' && E.modo.obj.kind === o.kind && E.modo.obj.id === o.id;
    const arrastrable = E.editable && !puesto && E.listo;
    const ayuda = puesto ? 'Ya está en el mapa: tócalo para verlo' : E.editable ? 'Tócalo y luego toca el mapa, o arrástralo' : '';
    return `<div class="mp-obj ${puesto ? 'puesto' : ''} ${activo ? 'activo' : ''}" data-kind="${o.kind}" data-id="${esc(o.id)}"
            draggable="${arrastrable ? 'true' : 'false'}" role="button" tabindex="0" title="${ayuda}">
        ${icono3d(o.estilo, { tam: 30 })}
        <span class="mp-obj-txt"><b>${esc(o.nombre)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>
        ${puesto ? `<span class="mp-obj-pin" aria-label="En el mapa">${I.pin}</span>` : ''}
    </div>`;
}

// ── Panel: infraestructura ──────────────────────────────────────
function panelInfra() {
    const n = E.infra.length;
    if (!n) {
        return `<div class="mp-infra-vacio">
            <div class="mp-infra-vacio-iconos">${TIPOS_INFRA.filter((_, i) => i % 3 === 0).map(t => icono3d(estiloColor(t.color, t.glifo), { tam: 34 })).join('')}</div>
            <h4>Crea tu primer elemento de infraestructura</h4>
            <p>Fibra óptica, UTP, mufas, postes, pozos y más. Se crean una vez con sus datos y luego los usas en este mapa o en cualquier otro, las veces que quieras.</p>
            ${E.editable ? `<button type="button" class="mp-btn mp-btn-primario" data-acc="crear-elemento">${I.mas}Crear elemento</button>` : ''}
        </div>`;
    }
    return `<div class="mp-pan-cab">
            <span>MIS ELEMENTOS <b>(${n})</b></span>
            ${E.editable ? `<button type="button" class="mp-btn-mini" data-acc="crear-elemento">${I.mas}Nuevo</button>` : ''}
        </div>
        ${n > 5 ? `<label class="mp-pan-buscar">${I.buscar}<input type="search" id="mp-buscar-infra" value="${esc(E.busquedaInfra)}" placeholder="Buscar elemento…" autocomplete="off" aria-label="Buscar elementos"></label>` : ''}
        <p class="mp-pan-ayuda">${E.editable
            ? 'Toca un elemento para usarlo: los cables se dibujan punto a punto y lo demás se coloca con un toque.'
            : 'Elementos de infraestructura del catálogo.'}</p>
        <div class="mp-pan-lista" data-de="infra">${listaInfra()}</div>`;
}

function listaInfra() {
    const q = E.infra.length > 5 ? sinAcentos(E.busquedaInfra.trim()) : '';
    const usos = new Map();
    for (const it of E.items) {
        if (it.kind !== 'infra_point' && it.kind !== 'infra_line') continue;
        const u = usos.get(it.refId) ?? { n: 0, m: 0 };
        u.n++;
        u.m += it.lengthM ?? 0;
        usos.set(it.refId, u);
    }
    const usando = E.modo?.tipo === 'trazar' ? E.modo.elemento.id : E.modo?.obj?.kind === 'infra_point' ? E.modo.obj.id : null;
    const grupos = TIPOS_INFRA.map(t => ({
        t,
        els: E.infra.filter(el => el.kind === t.kind
            && (!q || sinAcentos(`${el.name} ${t.nombre} ${Object.values(el.specs ?? {}).join(' ')}`).includes(q)))
    })).filter(x => x.els.length);
    if (!grupos.length) return '<p class="mp-pan-vacio">Nada coincide con la búsqueda.</p>';
    return grupos.map(({ t, els }) => `<div class="mp-grupo-l abierto">
        <div class="mp-grupo-cab fijo">${icono3d(estiloColor(t.color, t.glifo), { tam: 20 })}<span class="mp-grupo-nombre">${esc(t.nombre)} <i>(${els.length})</i></span></div>
        <div class="mp-grupo-items">${els.map(el => {
            const u = usos.get(el.id);
            const aqui = !u ? '' : t.forma === 'linea'
                ? ` · ${u.n} ${u.n === 1 ? 'tramo' : 'tramos'}${u.m ? `, ${metros(u.m)}` : ''} aquí`
                : ` · ${u.n} aquí`;
            return `<div class="mp-obj mp-obj-infra ${usando === el.id ? 'activo' : ''}" data-infra="${el.id}" role="button" tabindex="0"
                    title="${E.editable ? (t.forma === 'linea' ? 'Tócalo para dibujar un tramo' : 'Tócalo para colocarlo en el mapa') : ''}">
                ${t.forma === 'linea'
                    ? `<span class="mp-muestra-linea ${esc(el.specs?.estilo ?? t.estilo ?? 'solida')}" style="--lc:${esc(el.color || t.color)}"></span>`
                    : icono3d(estiloColor(el.color, t.glifo), { tam: 30 })}
                <span class="mp-obj-txt"><b>${esc(el.name)}</b><small>${esc(resumenSpecs(el) || t.nombre)}${aqui}</small></span>
                ${E.editable ? `<span class="mp-obj-acc">
                    <button type="button" class="mp-ico-btn" data-editar-infra="${el.id}" aria-label="Editar ${esc(el.name)}" title="Editar">${I.lapiz}</button>
                    <button type="button" class="mp-ico-btn peligro" data-borrar-infra="${el.id}" aria-label="Eliminar ${esc(el.name)}" title="Eliminar del catálogo">${I.basura}</button>
                </span>` : ''}
            </div>`;
        }).join('')}</div>
    </div>`).join('');
}

function alClicPanel(e) {
    if (!E) return;
    const t = e.target;
    const tab = t.closest('.mp-panel-tabs [data-tab]');
    if (tab) { E.tab = tab.dataset.tab; pintarPanel(); return; }
    const ag = t.closest('[data-agrupar]');
    if (ag) { E.agrupar = ag.dataset.agrupar; pintarPanel(); return; }
    const fil = t.closest('[data-filtro]');
    if (fil) { E.filtroTipo = fil.dataset.filtro; pintarPanel(); return; }
    const grupo = t.closest('[data-grupo]');
    if (grupo) {
        const k = grupo.dataset.grupo;
        if (E.abiertos.has(k)) E.abiertos.delete(k); else E.abiertos.add(k);
        pintarLista();
        return;
    }
    if (t.closest('[data-acc="crear-elemento"]')) { crearElemento(); return; }
    const ed = t.closest('[data-editar-infra]');
    if (ed) { formularioElemento(E.infra.find(x => x.id === ed.dataset.editarInfra)); return; }
    const bo = t.closest('[data-borrar-infra]');
    if (bo) { borrarElemento(E.infra.find(x => x.id === bo.dataset.borrarInfra)); return; }

    const inf = t.closest('[data-infra]');
    if (inf) {
        const el = E.infra.find(x => x.id === inf.dataset.infra);
        if (!el || !E.editable) return;
        const tipo = tipoInfra(el.kind);
        if (E.modo && (E.modo.elemento?.id === el.id || E.modo.obj?.id === el.id)) { cancelarModo(); return; }
        if (tipo?.forma === 'linea') empezarTrazo(el);
        else empezarColocar({ kind: 'infra_point', id: el.id, nombre: el.name, estilo: estiloColor(el.color, tipo?.glifo ?? I.pin) });
        return;
    }
    const fila = t.closest('.mp-obj[data-kind]');
    if (fila) {
        const obj = objetos().find(o => o.kind === fila.dataset.kind && o.id === fila.dataset.id);
        if (!obj) return;
        const puesto = E.items.find(i => i.kind === obj.kind && String(i.refId) === obj.id);
        if (puesto) {
            if (!E.listo) return;
            if (!panelFijo()) E.ed.classList.remove('panel-abierto');
            cancelarModo();
            seleccionar(puesto.id);
            centrarEn(puesto);
            return;
        }
        if (!E.editable) return;
        if (E.modo?.tipo === 'colocar' && E.modo.obj.kind === obj.kind && E.modo.obj.id === obj.id) { cancelarModo(); return; }
        empezarColocar(obj);
    }
}

function alEscribirPanel(e) {
    const id = e.target.id;
    if (id !== 'mp-buscar-obj' && id !== 'mp-buscar-infra') return;
    clearTimeout(tBusca);
    tBusca = setTimeout(() => {
        if (!E) return;
        if (id === 'mp-buscar-obj') E.busqueda = e.target.value;
        else E.busquedaInfra = e.target.value;
        pintarLista();
        const lista = E.raiz.querySelector('.mp-pan-lista');
        if (lista) lista.scrollTop = 0;
    }, 120);
}

function alTeclaPanel(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.mp-obj[role="button"]')) {
        e.preventDefault();
        e.target.click();
    }
}

// ── Catálogo de infraestructura: crear / editar / borrar ────────
function crearElemento() {
    const grupos = [
        ['Cableado y rutas', 'Se dibujan punto a punto; cada tramo lleva su metraje.', TIPOS_INFRA.filter(t => t.forma === 'linea')],
        ['Puntos de la red', 'Se colocan con un toque, las veces que haga falta.', TIPOS_INFRA.filter(t => t.forma === 'punto')]
    ];
    dialogo({
        oscuro: true,
        ancho: 680,
        clase: 'mp-dlg-tipos',
        titulo: 'Crear elemento de infraestructura',
        cuerpo: `<p class="mp-dlg-sub">Elige qué quieres crear. Después llenas sus datos (todos opcionales) y queda guardado para usarlo en cualquier mapa.</p>
            ${grupos.map(([titulo, ayuda, tipos]) => `<div class="mp-tipos-tit">${titulo}<small>${ayuda}</small></div>
                <div class="mp-tipos">${tipos.map(t => `<button type="button" class="mp-tipo" data-r="${t.kind}">
                    ${icono3d(estiloColor(t.color, t.glifo), { tam: 40 })}
                    <span><b>${esc(t.nombre)}</b><small>${esc(t.ayuda)}</small></span>
                </button>`).join('')}</div>`).join('')}`,
        alPulsar: (r) => {
            if (r) setTimeout(() => formularioElemento(null, r), 170);
            return true;
        }
    });
}

const PALETA = ['#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#78716c', '#475569', '#0f172a'];

function formularioElemento(elemento, kind = elemento?.kind) {
    const tipo = tipoInfra(kind);
    if (!tipo || !E) return;
    const v = elemento ?? { kind, name: '', color: tipo.color, specs: { estilo: tipo.estilo ?? 'solida', grosor: 5 } };
    let color = /^#[0-9a-f]{6}$/i.test(v.color ?? '') ? v.color : tipo.color;
    const lista = (c) => c.opciones ? `<datalist id="mpi-dl-${c.id}">${c.opciones.map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : '';
    const campo = (c) => c.tipo === 'area'
        ? `<label class="mp-campo ancho"><span>${esc(c.etiqueta)}</span><textarea data-spec="${c.id}" rows="2" maxlength="600" placeholder="Opcional">${esc(v.specs?.[c.id] ?? '')}</textarea></label>`
        : `<label class="mp-campo"><span>${esc(c.etiqueta)}</span><input data-spec="${c.id}" maxlength="120" ${c.opciones ? `list="mpi-dl-${c.id}"` : ''} value="${esc(v.specs?.[c.id] ?? '')}" placeholder="${c.opciones ? 'Elige o escribe' : 'Opcional'}" autocomplete="off">${lista(c)}</label>`;
    const ejemplo = tipo.forma === 'linea' ? `${tipo.nombre.split(' (')[0]} troncal` : `${tipo.nombre.split(' /')[0]} principal`;

    const { caja } = dialogo({
        oscuro: true,
        ancho: 640,
        clase: 'mp-dlg-infra',
        titulo: `${elemento ? 'Editar' : 'Nuevo'}: ${esc(tipo.nombre)}`,
        cuerpo: `<div class="mp-form mp-form-infra">
                <div class="mp-form-cab">${icono3d(estiloColor(color, tipo.glifo), { tam: 48, clase: 'mp-prev-ico' })}
                    <label class="mp-campo crece"><span>Nombre *</span>
                        <input id="mpi-nombre" maxlength="80" value="${esc(v.name)}" placeholder="Ej. ${esc(ejemplo)}" autocomplete="off"></label>
                </div>
                <div class="mp-campo ancho"><span>Color${tipo.forma === 'linea' ? ' de la línea' : ''}</span>
                    <div class="mp-paleta" id="mpi-paleta">${PALETA.map(c => `<button type="button" data-color="${c}" style="--c:${c}" class="${c === color ? 'activo' : ''}" aria-label="Color ${c}"></button>`).join('')}
                        <label class="mp-color-libre ${PALETA.includes(color) ? '' : 'activo'}" title="Otro color"><input type="color" id="mpi-color" value="${esc(color)}" aria-label="Otro color"></label></div></div>
                ${tipo.forma === 'linea' ? `
                <div class="mp-campo"><span>Estilo de línea</span>
                    <div class="mp-seg mp-seg-form" id="mpi-estilo">${ESTILOS_LINEA.map(s => `<button type="button" data-v="${s.id}" class="${(v.specs?.estilo ?? tipo.estilo ?? 'solida') === s.id ? 'activo' : ''}">${s.nombre}</button>`).join('')}</div></div>
                <div class="mp-campo"><span>Grosor</span>
                    <div class="mp-seg mp-seg-form" id="mpi-grosor">${GROSORES.map(g => `<button type="button" data-v="${g.id}" class="${(Number(v.specs?.grosor) || 5) === g.id ? 'activo' : ''}">${g.nombre}</button>`).join('')}</div></div>
                <div class="mp-campo ancho"><span>Así se verá en el mapa</span><div class="mp-muestra-grande"><span class="mp-muestra-linea" id="mpi-muestra"></span></div></div>` : ''}
                <div class="mp-form-sep">Datos <small>· todos opcionales</small></div>
                <div class="mp-form-rejilla">${tipo.campos.map(campo).join('')}</div>
                ${tipo.forma === 'linea' ? '<p class="mp-form-nota">El metraje no va aquí: se anota en cada tramo cuando lo dibujas en el mapa.</p>' : ''}
                ${elemento ? '<p class="mp-form-nota">Los cambios se ven en todos los mapas donde está puesto.</p>' : ''}
            </div>`,
        botones: [
            { r: 'cancelar', texto: 'Cancelar', clase: 'mp-btn-suave' },
            { r: 'guardar', texto: elemento ? 'Guardar cambios' : 'Crear y usar', clase: 'mp-btn-primario' }
        ],
        alPulsar: async (r) => {
            if (r !== 'guardar') return true;
            const nombre = caja.querySelector('#mpi-nombre').value.trim();
            if (!nombre) {
                toastError('Ponle un nombre para reconocerlo en la lista.');
                caja.querySelector('#mpi-nombre').focus();
                return false;
            }
            const specs = {};
            caja.querySelectorAll('[data-spec]').forEach(i => { if (i.value.trim()) specs[i.dataset.spec] = i.value.trim(); });
            if (tipo.forma === 'linea') {
                specs.estilo = caja.querySelector('#mpi-estilo .activo')?.dataset.v ?? 'solida';
                specs.grosor = Number(caja.querySelector('#mpi-grosor .activo')?.dataset.v ?? 5);
            }
            const btn = caja.querySelector('[data-r="guardar"]');
            btn.disabled = true;
            try {
                const guardado = await saveInfra({ id: elemento?.id, kind, name: nombre, color, specs });
                if (!E) return true;
                const i = E.infra.findIndex(x => x.id === guardado.id);
                if (i >= 0) E.infra[i] = guardado; else E.infra.push(guardado);
                E.infra.sort((a, b) => a.name.localeCompare(b.name, 'es'));
                E.tab = 'infra';
                pintarMapa();
                pintarPanel();
                if (elemento) {
                    toastSuccess('Elemento guardado: se actualizó en todos los mapas.', { duration: 2600 });
                    const sel = E.seleccion && E.items.find(x => x.id === E.seleccion);
                    if (sel?.refId === guardado.id) abrirHoja(sel);
                } else {
                    toastSuccess(`«${guardado.name}» creado. Ya puedes usarlo en cualquier mapa.`, { duration: 2600 });
                    if (tipo.forma === 'linea') empezarTrazo(guardado);
                    else empezarColocar({ kind: 'infra_point', id: guardado.id, nombre: guardado.name, estilo: estiloColor(guardado.color, tipo.glifo) });
                }
                return true;
            } catch (err) {
                btn.disabled = false;
                toastError(err.message);
                return false;
            }
        }
    });

    const refrescar = () => {
        const ico = caja.querySelector('.mp-prev-ico');
        const est = estiloColor(color, tipo.glifo);
        ico?.style.setProperty('--c1', est.c[0]);
        ico?.style.setProperty('--c2', est.c[1]);
        const m = caja.querySelector('#mpi-muestra');
        if (m) {
            m.className = `mp-muestra-linea ${caja.querySelector('#mpi-estilo .activo')?.dataset.v ?? 'solida'}`;
            m.style.setProperty('--lc', color);
            m.style.setProperty('--g', caja.querySelector('#mpi-grosor .activo')?.dataset.v ?? 5);
        }
    };
    caja.addEventListener('click', (e) => {
        const c = e.target.closest('[data-color]');
        if (c) {
            color = c.dataset.color;
            caja.querySelectorAll('#mpi-paleta [data-color]').forEach(b => b.classList.toggle('activo', b === c));
            caja.querySelector('.mp-color-libre').classList.remove('activo');
            caja.querySelector('#mpi-color').value = color;
            refrescar();
            return;
        }
        const s = e.target.closest('#mpi-estilo [data-v], #mpi-grosor [data-v]');
        if (s) {
            s.parentElement.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('activo', b === s));
            refrescar();
        }
    });
    caja.querySelector('#mpi-color').addEventListener('input', (e) => {
        color = e.target.value;
        caja.querySelectorAll('#mpi-paleta [data-color]').forEach(b => b.classList.remove('activo'));
        caja.querySelector('.mp-color-libre').classList.add('activo');
        refrescar();
    });
    refrescar();
}

async function borrarElemento(el) {
    if (!el) return;
    let usos;
    try { usos = await infraUsage(el.id); } catch (err) { toastError(err.message); return; }
    if (!E) return;
    if (usos.size) {
        const total = [...usos.values()].reduce((s, n) => s + n, 0);
        const aqui = usos.get(E.mapa.id) ?? 0;
        dialogo({
            oscuro: true,
            ancho: 440,
            titulo: 'Está en uso',
            cuerpo: `<p class="mp-dlg-sub"><b>${esc(el.name)}</b> está puesto ${total} ${total === 1 ? 'vez' : 'veces'} en ${usos.size} ${usos.size === 1 ? 'mapa' : 'mapas'}${aqui ? ` (${aqui} en este)` : ''}. Quítalo de esos mapas (también de los que estén en la papelera) antes de eliminarlo del catálogo.</p>`,
            botones: [{ r: 'ok', texto: 'Entendido', clase: 'mp-btn-primario' }]
        });
        return;
    }
    const ok = await confirmar({ oscuro: true, titulo: 'Eliminar del catálogo', mensaje: `<b>${esc(el.name)}</b> se borrará de tu catálogo de infraestructura.`, boton: 'Eliminar' });
    if (!ok || !E) return;
    try {
        await deleteInfra(el);
        if (!E) return;
        E.infra = E.infra.filter(x => x.id !== el.id);
        if (E.modo && (E.modo.elemento?.id === el.id || E.modo.obj?.id === el.id)) cancelarModo();
        pintarPanel();
        toastSuccess('Elemento eliminado del catálogo.', { duration: 2000 });
    } catch (err) {
        toastError(err.message);
    }
}

// ── Ventanitas: capas, resumen, opciones ────────────────────────
function alternarPop(cual, boton) {
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

function cerrarPop() {
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

async function editarMapa() {
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

async function borrarEsteMapa() {
    const yo = E;
    if (await eliminarMapa(E.mapa, { oscuro: true }) && E === yo) E.alVolver();
}

// ── Teléfono: horizontal y pantalla completa ────────────────────
function revisarOrientacion() {
    E?.ed?.classList.toggle('girar', esTelefonoVertical());
}

async function girar() {
    try {
        if (!document.fullscreenElement) await E.raiz.requestFullscreen({ navigationUI: 'hide' });
        await screen.orientation.lock('landscape');
    } catch {
        toastError('Este navegador no deja girar la pantalla desde aquí: gira el teléfono a lo horizontal.', { duration: 4500 });
    }
}

// En pantalla completa solo se ve lo que está dentro del elemento: los
// avisos tienen que vivir ahí mientras tanto (los diálogos ya lo hacen).
function alPantallaCompleta() {
    if (!E) return;
    const fs = document.fullscreenElement;
    if (fs && (fs === E.raiz || fs.contains(E.raiz) || E.raiz.contains(fs))) {
        let pila = document.getElementById('toast-stack');
        if (!pila) {
            pila = document.createElement('div');
            pila.id = 'toast-stack';
            pila.className = 'toast-stack';
            pila.setAttribute('role', 'status');
            pila.setAttribute('aria-live', 'polite');
        }
        if (pila.parentElement !== fs) fs.appendChild(pila);
    } else {
        devolverAvisos();
    }
    revisarOrientacion();
}

function devolverAvisos() {
    const pila = document.getElementById('toast-stack');
    if (pila && pila.parentElement !== document.body) document.body.appendChild(pila);
}

function salirPantallaCompleta(raiz) {
    const fs = document.fullscreenElement;
    if (!fs || !(fs === raiz || raiz.contains(fs))) return;
    try { screen.orientation?.unlock?.(); } catch { /* sin soporte */ }
    document.exitFullscreen?.().catch(() => {});
}
