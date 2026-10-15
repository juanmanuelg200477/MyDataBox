// ════════════════════════════════════════════════════════════════
//  MAPAS Y RUTAS — la lista
//  Cabecera estilo iOS (título grande y "widgets" de cristal), tarjetas
//  con la portada y el plano a la par, y la papelera de 5 días.
// ════════════════════════════════════════════════════════════════
import { store, isViewer, genId } from '../../store.js';
import { toastSuccess, toastError } from '../../toast.js';
import {
    loadMaps, createMap, updateMap, trashMap, restoreMap, deleteMapForever, purgeTrash,
    subirImagen, borrarImagenes, signedUrls, SinPreparar, DIAS_PAPELERA
} from '../../mapsStore.js';
import { TIPOS_MAPA } from './catalogo.js';
import { dialogo, confirmar, esc, I, metros, sinAcentos, haceCuanto, prepararImagen, prepararPlano, extension } from './ui.js';

let L = null;   // estado de la lista

export async function abrirLista(raiz, { pestana = 'mapas', alAbrirMapa, alCambiarPestana }) {
    const yo = (L = { raiz, mapas: [], pestana, filtro: '', busqueda: '', urls: new Map(), cargado: false, alAbrirMapa, alCambiarPestana });
    raiz.innerHTML = esqueleto();
    conectar();
    try {
        let mapas = await loadMaps();
        if (!isViewer()) {
            const purgados = await purgeTrash(mapas);
            if (purgados.length) mapas = mapas.filter(m => !purgados.includes(m.id));
        }
        if (L !== yo) return;
        L.mapas = mapas;
    } catch (err) {
        if (L !== yo) return;
        raiz.querySelector('.mp-cargando')?.remove();
        raiz.querySelector('.mp-contenido').innerHTML = err instanceof SinPreparar ? avisoPreparar() : avisoFallo(err);
        return;
    }
    await firmarImagenes();
    if (L !== yo) return;
    raiz.querySelector('.mp-cargando')?.remove();
    L.cargado = true;
    pintar();
}

export function cerrarLista() { L = null; }

// Atrás/adelante entre "Mapas" y "Papelera" sin volver a cargar la lista
export function cambiarPestana(pestana) {
    if (!L) return;
    L.pestana = pestana;
    pintar();
}

const activos = () => L.mapas.filter(m => !m.deletedAt);
const enPapelera = () => L.mapas.filter(m => m.deletedAt);

function esqueleto() {
    const editor = !isViewer();
    return `<div class="mp-casa">
        <header class="mp-cab">
            ${decoracion()}
            <div class="mp-cab-txt">
                <span class="mp-cab-sup">${I.mapa}DataBox IT · Gestión</span>
                <h1>Mapas y rutas</h1>
                <p>Planos de sedes, áreas y recorridos, con cada equipo en su lugar.</p>
            </div>
            <div class="mp-widgets" id="mp-widgets">${widgets()}</div>
        </header>

        <div class="mp-barra">
            <div class="mp-seg" role="tablist">
                <button type="button" role="tab" data-pestana="mapas">Mapas <b id="mp-n-mapas">0</b></button>
                <button type="button" role="tab" data-pestana="papelera">${I.basura}Papelera <b id="mp-n-papelera">0</b></button>
            </div>
            <label class="mp-buscar">${I.buscar}<input type="search" id="mp-buscar" placeholder="Buscar mapa…" autocomplete="off" aria-label="Buscar mapa"></label>
            ${editor ? `<button type="button" class="mp-btn mp-btn-primario mp-btn-alto" data-acc="nuevo">${I.mas}Nuevo mapa</button>` : ''}
        </div>
        <div class="mp-chips" id="mp-chips"></div>

        <div class="db-loading mp-cargando"><div class="db-spinner"></div><span>Cargando mapas…</span></div>
        <div class="mp-contenido"></div>
    </div>`;
}

// Curvas de nivel y una ruta punteada que se mueve: el "toque" de la cabecera
function decoracion() {
    return `<svg class="mp-cab-deco" viewBox="0 0 800 260" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1.2" opacity=".35">
            <path d="M420 230c40-60 120-80 190-70s120-30 150-80"/>
            <path d="M440 250c50-70 140-95 215-82s110-34 145-92"/>
            <path d="M400 210c35-50 100-66 165-58s128-24 158-66"/>
            <path d="M470 260c60-60 150-90 230-80"/>
            <path d="M380 190c30-40 85-52 140-46s132-18 160-52"/>
        </g>
        <path class="mp-ruta" d="M520 122 C 580 72, 628 112, 680 72 S 750 52, 776 26" fill="none" stroke-width="3" stroke-linecap="round"/>
        <g class="mp-cab-pins">
            <circle cx="520" cy="122" r="7"/><circle cx="680" cy="72" r="7"/><circle cx="776" cy="26" r="7"/>
        </g>
    </svg>`;
}

function widgets() {
    const ms = L ? activos() : [];
    const sum = (k) => ms.reduce((s, m) => s + (m.resumen?.[k] ?? 0), 0);
    const w = (color, icono, valor, etiqueta) =>
        `<div class="mp-widget" style="--w:${color}"><span class="mp-widget-ico">${icono}</span><b>${valor}</b><span>${etiqueta}</span></div>`;
    return [
        w('#3b82f6', I.mapa, ms.length, ms.length === 1 ? 'mapa' : 'mapas'),
        w('#8b5cf6', I.pin, sum('dispositivos'), 'equipos ubicados'),
        w('#0f766e', I.panel, sum('bastidores'), 'bastidores'),
        w('#f59e0b', I.regla, metros(sum('metros')).replace(' m', ''), 'metros de cable')
    ].join('');
}

function conectar() {
    const r = L.raiz;
    r.addEventListener('click', alClic);
    let t = 0;
    r.querySelector('#mp-buscar')?.addEventListener('input', (e) => {
        clearTimeout(t);
        t = setTimeout(() => { if (L) { L.busqueda = e.target.value; pintar(); } }, 140);
    });
}

async function alClic(e) {
    if (!L) return;
    const b = e.target.closest('[data-acc], [data-pestana], [data-tipo], [data-abrir]');
    if (!b) return;
    if (b.dataset.pestana) {
        L.pestana = b.dataset.pestana;
        L.alCambiarPestana?.(L.pestana);
        pintar();
        return;
    }
    if (b.dataset.tipo !== undefined && b.closest('#mp-chips')) {
        L.filtro = b.dataset.tipo;
        pintar();
        return;
    }
    const id = b.closest('[data-id]')?.dataset.id;
    const mapa = id && L.mapas.find(m => m.id === id);
    switch (b.dataset.acc) {
        case 'nuevo':     formularioMapa(); return;
        case 'menu':      e.stopPropagation(); menuTarjeta(b, mapa); return;
        case 'restaurar': restaurar(mapa); return;
        case 'definitivo':eliminarYa(mapa); return;
        case 'reintentar':location.reload(); return;
    }
    if (b.dataset.abrir && mapa) L.alAbrirMapa(mapa.id);
}

// ── Pintado ─────────────────────────────────────────────────────
async function firmarImagenes() {
    const rutas = L.mapas.flatMap(m => [m.coverPath, m.thumbPath]).filter(Boolean);
    if (!rutas.length) return;
    try { L.urls = await signedUrls(rutas); }
    catch (err) { console.warn('[mapas] portadas:', err.message); }
}

function pintar() {
    if (!L?.cargado) return;
    const r = L.raiz;
    r.querySelector('#mp-widgets').innerHTML = widgets();
    r.querySelector('#mp-n-mapas').textContent = activos().length;
    r.querySelector('#mp-n-papelera').textContent = enPapelera().length;
    r.querySelectorAll('[data-pestana]').forEach(b => b.classList.toggle('activo', b.dataset.pestana === L.pestana));

    const chips = r.querySelector('#mp-chips');
    const cont = r.querySelector('.mp-contenido');
    if (L.pestana === 'papelera') {
        chips.innerHTML = '';
        cont.innerHTML = papeleraHtml();
        return;
    }
    const cuenta = (t) => activos().filter(m => m.kind === t).length;
    chips.innerHTML = [['', 'Todos', activos().length], ...TIPOS_MAPA.map(t => [t, t, cuenta(t)])]
        .filter(([t, , n]) => t === '' || n > 0)
        .map(([t, nombre, n]) => `<button type="button" class="mp-chip ${L.filtro === t ? 'activo' : ''}" data-tipo="${esc(t)}">${esc(nombre)} <b>${n}</b></button>`)
        .join('');

    const q = sinAcentos(L.busqueda.trim());
    const lista = activos()
        .filter(m => !L.filtro || m.kind === L.filtro)
        .filter(m => !q || sinAcentos(`${m.name} ${m.kind} ${m.description} ${nombreRegion(m.regionId)}`).includes(q));

    if (!activos().length) { cont.innerHTML = vacioHtml(); return; }
    cont.innerHTML = lista.length
        ? `<div class="mp-tarjetas">${lista.map(tarjetaHtml).join('')}</div>`
        : `<div class="mp-sin-resultados">Ningún mapa coincide con la búsqueda.</div>`;
}

const nombreRegion = (id) => store.regions.find(r => r.id === id)?.name ?? '';

function iniciales(nombre) {
    const p = nombre.split(/\s+/).filter(w => w && !/^(de|del|la|las|el|los|y)$/i.test(w));
    return (p.length ? p : [nombre]).slice(0, 2).map(w => [...w][0]).join('').toUpperCase();
}

// Color de la portada sin foto: estable por nombre
function tono(nombre) {
    let h = 0;
    for (const ch of nombre) h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
}

function tarjetaHtml(m) {
    const cover = m.coverPath && L.urls.get(m.coverPath);
    const thumb = m.thumbPath && L.urls.get(m.thumbPath);
    const reg = nombreRegion(m.regionId);
    const r = m.resumen ?? {};
    const datos = [
        r.dispositivos ? `${I.pin}${r.dispositivos} ${r.dispositivos === 1 ? 'equipo' : 'equipos'}` : '',
        r.bastidores ? `${I.panel}${r.bastidores} ${r.bastidores === 1 ? 'bastidor' : 'bastidores'}` : '',
        r.metros ? `${I.regla}${metros(r.metros)} de cable` : r.tramos ? `${I.regla}${r.tramos} tramos` : '',
        r.puntos ? `${I.capas}${r.puntos} de infraestructura` : ''
    ].filter(Boolean);
    return `<article class="mp-tarjeta" data-id="${m.id}">
        <button type="button" class="mp-tarjeta-portada ${cover ? '' : 'sin-foto'}" data-abrir="1" style="--h:${tono(m.name)}"
                aria-label="Abrir ${esc(m.name)}">
            ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : `<span class="mp-tarjeta-inic">${esc(iniciales(m.name))}</span>`}
            <span class="mp-tarjeta-velo"></span>
            <span class="mp-tarjeta-info">
                <span class="mp-tarjeta-tipo">${esc(m.kind)}${reg ? ` · ${esc(reg)}` : ''}</span>
                <span class="mp-tarjeta-nombre">${esc(m.name)}</span>
                ${m.description ? `<span class="mp-tarjeta-desc">${esc(m.description)}</span>` : ''}
                <span class="mp-tarjeta-datos">${datos.length ? datos.map(d => `<span>${d}</span>`).join('') : '<span>Aún sin elementos</span>'}</span>
            </span>
        </button>
        <button type="button" class="mp-tarjeta-plano" data-abrir="1" aria-label="Abrir el plano de ${esc(m.name)}">
            ${thumb
                ? `<span class="mp-papel"><img src="${esc(thumb)}" alt="" loading="lazy"></span><span class="mp-plano-etq">Plano</span>`
                : `<span class="mp-plano-vacio">${I.imagen}<b>Sin plano</b><small>${isViewer() ? 'Todavía no tiene imagen' : 'Súbelo para empezar a mapear'}</small></span>`}
        </button>
        ${isViewer() ? '' : `<button type="button" class="mp-tarjeta-menu" data-acc="menu" aria-label="Opciones de ${esc(m.name)}">•••</button>`}
    </article>`;
}

function vacioHtml() {
    return `<div class="mp-vacio">
        <div class="mp-vacio-ico">${I.mapa}</div>
        <h2>Todavía no hay mapas</h2>
        <p>Crea un mapa por sede, área o ruta, súbele su plano y ubica encima tus cámaras, bastidores y el cableado.</p>
        ${isViewer() ? '' : `<button type="button" class="mp-btn mp-btn-primario mp-btn-alto" data-acc="nuevo">${I.mas}Crear el primer mapa</button>`}
    </div>`;
}

function papeleraHtml() {
    const ms = enPapelera();
    if (!ms.length) {
        return `<div class="mp-vacio mp-vacio-chico">
            <div class="mp-vacio-ico">${I.basura}</div>
            <h2>La papelera está vacía</h2>
            <p>Los mapas que elimines se guardan aquí ${DIAS_PAPELERA} días por si quieres recuperarlos.</p>
        </div>`;
    }
    return `<p class="mp-papelera-nota">Los mapas se borran definitivamente ${DIAS_PAPELERA} días después de eliminarlos. Al restaurarlos vuelven con todo lo que tenían.</p>
        <div class="mp-papelera">${ms.map(m => {
            const cover = m.coverPath && L.urls.get(m.coverPath);
            const quedan = Math.max(0, Math.ceil((new Date(m.deletedAt).getTime() + DIAS_PAPELERA * 86400000 - Date.now()) / 86400000));
            return `<div class="mp-papel-fila" data-id="${m.id}">
                <span class="mp-papel-mini" style="--h:${tono(m.name)}">${cover ? `<img src="${esc(cover)}" alt="">` : esc(iniciales(m.name))}</span>
                <div class="mp-papel-txt">
                    <b>${esc(m.name)}</b>
                    <small>Eliminado ${haceCuanto(m.deletedAt)} · ${quedan <= 1 ? 'se borra en menos de un día' : `se borra en ${quedan} días`}</small>
                </div>
                ${isViewer() ? '' : `<button type="button" class="mp-btn mp-btn-suave" data-acc="restaurar">${I.restaurar}Restaurar</button>
                <button type="button" class="mp-btn mp-btn-peligro-suave" data-acc="definitivo">${I.basura}Eliminar ya</button>`}
            </div>`;
        }).join('')}</div>`;
}

function avisoPreparar() {
    return `<div class="mp-aviso-grande">
        <h2>Mapas necesita su espacio en la base de datos</h2>
        <p>Es un paso único: crea las tablas de mapas, el catálogo de infraestructura y el almacén privado de imágenes.</p>
        <ol>
            <li>Abre una terminal en la carpeta <code>astro_app</code>.</li>
            <li>Ejecuta <code>npx supabase db push</code>.</li>
            <li>Recarga esta página.</li>
        </ol>
    </div>`;
}

function avisoFallo(err) {
    return `<div class="mp-aviso-grande">
        <h2>No se pudieron cargar los mapas</h2>
        <p>${esc(err?.message ?? String(err))}</p>
        <button type="button" class="mp-btn mp-btn-primario" data-acc="reintentar">Reintentar</button>
    </div>`;
}

// ── Menú de una tarjeta ─────────────────────────────────────────
function menuTarjeta(boton, mapa) {
    document.querySelector('.mp-menu-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'mp-menu-pop';
    pop.innerHTML = `
        <button type="button" data-m="editar">${I.lapiz}Editar datos e imágenes</button>
        <button type="button" data-m="eliminar" class="peligro">${I.basura}Eliminar mapa</button>`;
    document.body.appendChild(pop);
    const r = boton.getBoundingClientRect();
    pop.style.top = `${r.bottom + 8}px`;
    pop.style.left = `${Math.max(10, Math.min(r.right - pop.offsetWidth, innerWidth - pop.offsetWidth - 10))}px`;
    const cerrar = () => { pop.remove(); document.removeEventListener('pointerdown', fuera, true); };
    const fuera = (e) => { if (!pop.contains(e.target)) cerrar(); };
    setTimeout(() => document.addEventListener('pointerdown', fuera, true));
    pop.addEventListener('click', (e) => {
        const m = e.target.closest('[data-m]')?.dataset.m;
        if (!m) return;
        cerrar();
        if (m === 'editar') formularioMapa(mapa);
        if (m === 'eliminar') eliminar(mapa);
    });
}

// ── Crear / editar mapa ─────────────────────────────────────────
// Se usa también desde el editor (engranaje). Devuelve el mapa guardado
// o null si se canceló.
export function formularioMapa(mapa = null, { oscuro = false, urls = null } = {}) {
    return new Promise((resolver) => {
        const v = mapa ?? { kind: 'Sede', regionId: '' };
        const firmadas = urls ?? L?.urls ?? new Map();
        let portada = null;   // { file, url } nueva
        let plano = null;

        const zona = (id, titulo, ayuda, actual) => `
            <div class="mp-zona" data-zona="${id}">
                <div class="mp-zona-prev">${actual ? `<img src="${esc(actual)}" alt="">` : I.imagen}</div>
                <div class="mp-zona-txt"><b>${titulo}</b><small>${ayuda}</small></div>
                <button type="button" class="mp-btn mp-btn-suave" data-elegir="${id}">${actual ? 'Cambiar' : 'Elegir imagen'}</button>
            </div>`;

        const cuerpo = `
            <div class="mp-form">
                <label class="mp-campo"><span>Nombre *</span>
                    <input id="mpf-nombre" maxlength="120" value="${esc(v.name ?? '')}" placeholder="Ej. Sede Central CMY"></label>
                <div class="mp-campo"><span>Tipo</span>
                    <div class="mp-seg mp-seg-form" id="mpf-tipo">${TIPOS_MAPA.map(t =>
                        `<button type="button" data-t="${t}" class="${t === v.kind ? 'activo' : ''}">${t}</button>`).join('')}</div></div>
                <label class="mp-campo"><span>Región</span>
                    <select id="mpf-region"><option value="">— Sin región —</option>${store.regions.map(r =>
                        `<option value="${esc(r.id)}" ${r.id === v.regionId ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
                <label class="mp-campo"><span>Descripción</span>
                    <textarea id="mpf-desc" rows="2" maxlength="300" placeholder="Opcional">${esc(v.description ?? '')}</textarea></label>
                ${zona('portada', 'Portada', 'Una foto de la sede o del área. Se ve en grande en la lista.', mapa?.coverPath && firmadas.get(mapa.coverPath))}
                ${zona('plano', 'Imagen del plano', 'El mapa, croquis o diagrama sobre el que vas a ubicar todo. Sin ella no se puede mapear.', mapa?.thumbPath && firmadas.get(mapa.thumbPath))}
                ${mapa?.imagePath ? '<p class="mp-form-nota">Si cambias el plano, todo lo que ya ubicaste conserva su lugar relativo.</p>' : ''}
                <p class="mp-form-error" id="mpf-error" hidden></p>
            </div>`;

        const { caja, cerrar } = dialogo({
            titulo: mapa ? 'Editar mapa' : 'Nuevo mapa',
            cuerpo,
            oscuro,
            ancho: 560,
            botones: [
                { r: 'cancelar', texto: 'Cancelar', clase: 'mp-btn-suave' },
                { r: 'guardar', texto: mapa ? 'Guardar cambios' : 'Crear mapa', clase: 'mp-btn-primario' }
            ],
            alPulsar: async (r) => {
                if (r !== 'guardar') { limpiar(); resolver(null); return true; }
                const guardado = await guardar();
                if (guardado) { limpiar(); resolver(guardado); return true; }
                return false;
            }
        });

        const limpiar = () => [portada, plano].forEach(x => x && URL.revokeObjectURL(x.url));

        // El aviso de error se va en cuanto se corrige el nombre
        caja.querySelector('#mpf-nombre').addEventListener('input', () => { caja.querySelector('#mpf-error').hidden = true; });
        caja.querySelector('#mpf-tipo').addEventListener('click', (e) => {
            const b = e.target.closest('[data-t]');
            if (!b) return;
            caja.querySelectorAll('#mpf-tipo [data-t]').forEach(x => x.classList.toggle('activo', x === b));
        });
        caja.addEventListener('click', (e) => {
            const id = e.target.closest('[data-elegir]')?.dataset.elegir;
            if (id) elegir(id);
        });
        // Arrastrar una imagen sobre su zona
        caja.addEventListener('dragover', (e) => { if (e.target.closest('[data-zona]')) e.preventDefault(); });
        caja.addEventListener('drop', (e) => {
            const z = e.target.closest('[data-zona]');
            if (!z) return;
            e.preventDefault();
            const f = e.dataTransfer?.files?.[0];
            if (f) poner(z.dataset.zona, f);
        });

        async function elegir(id) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/png,image/jpeg,image/webp';
            input.onchange = () => input.files?.[0] && poner(id, input.files[0]);
            input.click();
        }

        function poner(id, file) {
            if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) { error('Solo imágenes PNG, JPG o WebP.'); return; }
            const url = URL.createObjectURL(file);
            if (id === 'portada') { if (portada) URL.revokeObjectURL(portada.url); portada = { file, url }; }
            else { if (plano) URL.revokeObjectURL(plano.url); plano = { file, url }; }
            const z = caja.querySelector(`[data-zona="${id}"]`);
            z.querySelector('.mp-zona-prev').innerHTML = `<img src="${url}" alt="">`;
            z.querySelector('[data-elegir]').textContent = 'Cambiar';
            z.classList.add('lista');
        }

        function error(msg) {
            const box = caja.querySelector('#mpf-error');
            box.textContent = msg;
            box.hidden = false;
        }

        async function guardar() {
            const nombre = caja.querySelector('#mpf-nombre').value.trim();
            caja.querySelector('#mpf-error').hidden = true;
            if (!nombre) { error('Ponle un nombre al mapa.'); caja.querySelector('#mpf-nombre').focus(); return null; }
            const btn = caja.querySelector('[data-r="guardar"]');
            btn.disabled = true;
            const datos = {
                name: nombre,
                kind: caja.querySelector('#mpf-tipo .activo')?.dataset.t ?? 'Sede',
                regionId: caja.querySelector('#mpf-region').value,
                description: caja.querySelector('#mpf-desc').value
            };
            try {
                btn.textContent = 'Guardando…';
                let m = mapa ? await updateMap(mapa.id, datos) : await createMap(datos);
                const cambios = {};
                const viejas = [];
                if (portada) {
                    btn.textContent = 'Subiendo portada…';
                    const { blob } = await prepararImagen(portada.file, { max: 1800, calidad: 0.86 });
                    cambios.coverPath = await subirImagen(`maps/${m.id}/portada-${genId()}.${extension(blob)}`, blob);
                    viejas.push(mapa?.coverPath);
                }
                if (plano) {
                    btn.textContent = 'Subiendo plano…';
                    const { plano: p, mini } = await prepararPlano(plano.file);
                    cambios.imagePath = await subirImagen(`maps/${m.id}/plano-${genId()}.${extension(p.blob)}`, p.blob);
                    cambios.thumbPath = await subirImagen(`maps/${m.id}/mini-${genId()}.${extension(mini.blob)}`, mini.blob);
                    cambios.imageW = p.w;
                    cambios.imageH = p.h;
                    viejas.push(mapa?.imagePath, mapa?.thumbPath);
                }
                if (Object.keys(cambios).length) {
                    m = await updateMap(m.id, cambios, { auditar: false });
                    borrarImagenes(viejas);
                }
                // La lista (si está abierta) se entera del cambio
                if (L) {
                    const i = L.mapas.findIndex(x => x.id === m.id);
                    const resumen = i >= 0 ? L.mapas[i].resumen : { dispositivos: 0, bastidores: 0, puntos: 0, tramos: 0, metros: 0 };
                    if (i >= 0) L.mapas[i] = { ...m, resumen };
                    else L.mapas.unshift({ ...m, resumen });
                    await firmarImagenes();
                    pintar();
                }
                toastSuccess(mapa ? 'Mapa guardado.' : `Mapa «${m.name}» creado.`);
                return m;
            } catch (err) {
                btn.disabled = false;
                btn.textContent = mapa ? 'Guardar cambios' : 'Crear mapa';
                error(err.message);
                return null;
            }
        }
    });
}

// ── Papelera ────────────────────────────────────────────────────
export async function eliminar(mapa, { oscuro = false } = {}) {
    const ok = await confirmar({
        oscuro,
        titulo: '¿Eliminar este mapa?',
        mensaje: `<b>${esc(mapa.name)}</b> se moverá a la papelera. Durante ${DIAS_PAPELERA} días puedes restaurarlo con todo lo que tiene; después se borra definitivamente.`,
        boton: 'Sí, eliminar'
    });
    if (!ok) return false;
    try {
        const m = await trashMap(mapa);
        if (L) {
            const i = L.mapas.findIndex(x => x.id === mapa.id);
            if (i >= 0) L.mapas[i] = { ...L.mapas[i], deletedAt: m.deletedAt };
            pintar();
        }
        toastSuccess(`«${mapa.name}» está en la papelera.`);
        return true;
    } catch (err) {
        toastError(err.message, { title: 'No se eliminó el mapa' });
        return false;
    }
}

async function restaurar(mapa) {
    try {
        const m = await restoreMap(mapa);
        const i = L.mapas.findIndex(x => x.id === mapa.id);
        if (i >= 0) L.mapas[i] = { ...L.mapas[i], deletedAt: m.deletedAt };
        pintar();
        toastSuccess(`«${mapa.name}» volvió a tus mapas.`);
    } catch (err) {
        toastError(err.message, { title: 'No se restauró' });
    }
}

async function eliminarYa(mapa) {
    const ok = await confirmar({
        titulo: 'Eliminar definitivamente',
        mensaje: `<b>${esc(mapa.name)}</b> y todo lo que tiene se borrarán para siempre. Esto no se puede deshacer.`,
        boton: 'Eliminar para siempre'
    });
    if (!ok) return;
    try {
        await deleteMapForever(mapa);
        L.mapas = L.mapas.filter(x => x.id !== mapa.id);
        pintar();
        toastSuccess(`Se eliminó «${mapa.name}» definitivamente.`);
    } catch (err) {
        toastError(err.message, { title: 'No se eliminó' });
    }
}
