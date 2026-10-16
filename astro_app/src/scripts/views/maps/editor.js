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
//
//  Este archivo abre, construye y cierra el editor. El resto vive en
//  ./editor/: estado compartido, vista (zoom y desplazamiento), pintado,
//  eventos y gestos, ficha lateral, colocar y trazar, panel de objetos,
//  elementos de infraestructura, barra de opciones y pantalla completa.
// ════════════════════════════════════════════════════════════════
import { isViewer, genId } from '../../store.js';
import { toastSuccess, toastError } from '../../toast.js';
import { loadMap, loadInfra, loadRackPhotos, SinPreparar, signedUrl, subirImagen, updateMap, borrarImagenes } from '../../mapsStore.js';
import { esc, I, elegirImagen, prepararPlano, extension } from './ui.js';
import { indiceDispositivos } from './fichas.js';
import { esTelefono, fijarEditor, E, CAPAS_KEY, panelFijo } from './editor/estado.js';
import { animacion, ajustar } from './editor/vista.js';
import { aplicarCapas, pintarMapa } from './editor/pintar.js';
import { conectar, pintarBloqueo } from './editor/eventos.js';
import { tBusca, pintarPanel } from './editor/panel.js';
import { devolverAvisos, salirPantallaCompleta } from './editor/pantalla.js';

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
    const yo = fijarEditor({
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
    fijarEditor(null);
    cancelAnimationFrame(animacion);
    clearTimeout(tBusca);
    yo.escuchas.forEach(([o, ev, fn, op]) => o.removeEventListener(ev, fn, op));
    yo.ro?.disconnect();
    devolverAvisos();
    salirPantallaCompleta(yo.raiz);
    document.body.classList.remove('mp-ed-abierto');
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
export async function cargarPlano() {
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

export async function subirPlano() {
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
