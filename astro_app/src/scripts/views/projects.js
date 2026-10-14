// ════════════════════════════════════════════════════════════════
//  PROYECTOS — vista
//
//  Cada proyecto es una tarjeta grande: a la izquierda sus documentos
//  (con vista previa) y a la derecha el contexto, para que al verlo se
//  recuerde de qué va y en qué está. Arriba, el resumen; y un modo
//  presentación para enseñarlos uno a uno en pantalla completa.
// ════════════════════════════════════════════════════════════════
import { isViewer } from '../store.js';
import { toastSuccess, toastError } from '../toast.js';
import { escapeHtml as esc, renderPager } from '../utils.js';
import { showModal, closeModal } from '../modal.js';
import {
    ESTADOS, colorDeEstado, ACEPTA, tipoDe, validarArchivo, SinPreparar,
    loadProjects, createProject, updateProject, deleteProject, uploadFile, deleteFile
} from '../projectsStore.js';
import { mostrarArchivo, soltarVisor, liberarUrls, urlDe, descargar } from './projectViewer.js';

// ── Iconos (trazos de Lucide) ───────────────────────────────────
const svg = (c) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c}</svg>`;
const I = {
    mas:       svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
    lapiz:     svg('<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>'),
    basura:    svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    x:         svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    subir:     svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>'),
    bajar:     svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
    expandir:  svg('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>'),
    externo:   svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    calendario:svg('<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>'),
    tienda:    svg('<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/>'),
    clip:      svg('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>'),
    reloj:     svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    nota:      svg('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>'),
    bandera:   svg('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>'),
    presentar: svg('<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>'),
    izq:       svg('<path d="m15 18-6-6 6-6"/>'),
    der:       svg('<path d="m9 18 6-6-6-6"/>'),
    archivo:   svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>'),
    imagen:    svg('<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>'),
    carpeta:   svg('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
    minimizar: svg('<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/>'),
    maximizar: svg('<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>')
};

const iconoTipo = (f) => {
    const t = tipoDe(f);
    if (t === 'imagen') return I.imagen;
    return `<span class="pj-tipo-txt">${t === 'pdf' ? 'PDF' : t === 'docx' || t === 'doc' ? 'W' : '•'}</span>`;
};

// ── Formatos ────────────────────────────────────────────────────
const nf2 = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });
const simbolo = (cur) => (cur === 'USD' ? 'US$' : 'Q');
const monto = (n, cur) => `${simbolo(cur)} ${nf2.format(n)}`;
const montoCorto = (n, cur) => n >= 1e6
    ? `${simbolo(cur)} ${(n / 1e6).toLocaleString('es-GT', { maximumFractionDigits: 2 })} M`
    : `${simbolo(cur)} ${nf0.format(n)}`;

const fechaDia = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
const fechaCompleta = new Intl.DateTimeFormat('es-GT', { dateStyle: 'long', timeStyle: 'short' });
// '2026-10-12' es una fecha sin hora: se arma en hora local para que no
// "retroceda" un día por la zona horaria.
const fechaCorta = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return fechaDia.format(new Date(y, m - 1, d)); };
const fechaHora = (iso) => (iso ? fechaCompleta.format(new Date(iso)) : '');

const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
function haceCuanto(iso) {
    if (!iso) return '';
    const seg = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(seg);
    if (abs < 45) return 'hace un momento';
    if (abs < 3600) return relativo.format(Math.round(seg / 60), 'minute');
    if (abs < 86400) return relativo.format(Math.round(seg / 3600), 'hour');
    if (abs < 86400 * 7) return relativo.format(Math.round(seg / 86400), 'day');
    return `el ${fechaDia.format(new Date(iso))}`;
}

function tamano(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toLocaleString('es-GT', { maximumFractionDigits: 1 })} MB`;
}

// Contexto con formato mínimo: líneas que empiezan por "-" son lista y
// **texto** resalta. Todo se escapa antes: no se interpreta HTML.
function textoBonito(texto) {
    const negrita = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    let html = '';
    let lista = false;
    for (const linea of esc(texto).split(/\r?\n/)) {
        const item = linea.match(/^\s*[-•*]\s+(.*)$/);
        if (item) {
            if (!lista) { html += '<ul>'; lista = true; }
            html += `<li>${negrita(item[1])}</li>`;
            continue;
        }
        if (lista) { html += '</ul>'; lista = false; }
        html += linea.trim() ? `<p>${negrita(linea)}</p>` : '<div class="pj-ctx-aire"></div>';
    }
    return lista ? `${html}</ul>` : html;
}

const sinAcentos = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const GUIA = `¿De qué se trata?
-

¿Por qué se necesita?
-

¿En qué vamos?
- `;

// ── Estado de la vista ──────────────────────────────────────────
let st = null;

export async function initProjects() {
    limpiar();
    const wrap = document.getElementById('pj-wrap');
    if (!wrap) return;

    st = {
        wrap,
        proyectos: [],
        filtro: '',
        busqueda: '',
        orden: 'recientes',
        vista: vistaGuardada(),  // 'tarjetas' (completa) | 'mini' (minimizada)
        pagina: 1,               // solo la vista minimizada pagina
        sel: new Map(),          // id de proyecto → id del documento que se ve
        escuchas: [],
        // Las vistas previas se cargan cuando el visor se acerca a la pantalla
        io: new IntersectionObserver((entradas) => {
            for (const e of entradas) {
                if (!e.isIntersecting) continue;
                st.io.unobserve(e.target);
                const p = proyecto(e.target.closest('.pj-card').dataset.id);
                const f = p && archivoVisto(p);
                if (f) mostrarArchivo(e.target, f);
            }
        }, { rootMargin: '500px 0px' })
    };

    conectarControles();
    pintarBotonVista();

    try {
        st.proyectos = await loadProjects();
    } catch (err) {
        document.getElementById('pj-cargando')?.remove();
        if (err instanceof SinPreparar) mostrarPreparar();
        else mostrarFalloCarga(err);
        return;
    }
    document.getElementById('pj-cargando')?.remove();
    document.getElementById('pj-cuerpo').hidden = false;
    pintarTodo();
}

// Al salir de la página: soltar visores, URLs y escuchas de document
document.addEventListener('astro:before-swap', limpiar);

function limpiar() {
    if (!st) return;
    const viejo = st;
    st = null;   // desde aquí nada vuelve a pintar (la ficha repinta al cerrarse)
    cerrarCapas();
    viejo.io.disconnect();
    document.querySelectorAll('#pj-lista [data-visor]').forEach(soltarVisor);
    viejo.escuchas.forEach(([obj, ev, fn, op]) => obj.removeEventListener(ev, fn, op));
    clearTimeout(tVistazo);
    document.getElementById('pj-vistazo')?.remove();
    liberarUrls();
}

// La vista elegida se recuerda en este navegador (es comodidad de cada quien)
const VISTA_KEY = 'databox:proyectos:vista';

function vistaGuardada() {
    try { return localStorage.getItem(VISTA_KEY) === 'mini' ? 'mini' : 'tarjetas'; }
    catch { return 'tarjetas'; }
}

function guardarVista(vista) {
    try { localStorage.setItem(VISTA_KEY, vista); } catch { /* modo privado */ }
}

function escuchar(obj, ev, fn, op) {
    obj.addEventListener(ev, fn, op);
    st.escuchas.push([obj, ev, fn, op]);
}

const proyecto = (id) => st.proyectos.find(p => p.id === id);
const archivoVisto = (p) => p.files.find(f => f.id === st.sel.get(p.id)) ?? p.files[0] ?? null;
const tarjeta = (id) => document.getElementById(`pj-${id}`);

// ── Controles fijos (barra de herramientas) ─────────────────────
function conectarControles() {
    // Buscar, filtrar u ordenar cambia lo que hay: se vuelve a la página 1
    let tBusqueda = 0;
    document.getElementById('pj-buscar')?.addEventListener('input', (e) => {
        clearTimeout(tBusqueda);
        tBusqueda = setTimeout(() => { st.busqueda = e.target.value; st.pagina = 1; pintarLista(); }, 150);
    });
    document.getElementById('pj-orden')?.addEventListener('change', (e) => { st.orden = e.target.value; st.pagina = 1; pintarLista(); });
    document.getElementById('pj-filtros')?.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-estado]');
        if (!chip) return;
        st.filtro = chip.dataset.estado;
        st.pagina = 1;
        pintarFiltros();
        pintarLista();
    });
    document.getElementById('pj-vista')?.addEventListener('click', () => {
        st.vista = st.vista === 'mini' ? 'tarjetas' : 'mini';
        st.pagina = 1;
        guardarVista(st.vista);
        pintarBotonVista();
        pintarLista();
    });
    document.getElementById('pj-nuevo')?.addEventListener('click', () => formularioProyecto());
    document.getElementById('pj-vacio-nuevo')?.addEventListener('click', () => formularioProyecto());
    document.getElementById('pj-presentar')?.addEventListener('click', () => presentar(0));

    const lista = document.getElementById('pj-lista');
    if (lista) {
        conectarLista(lista);
        conectarVistazo(lista);
    }

    // Un archivo soltado fuera de una tarjeta no debe hacer que el navegador
    // abandone la página para abrirlo.
    const evitar = (e) => { if (hayArchivos(e)) e.preventDefault(); };
    escuchar(document, 'dragover', evitar);
    escuchar(document, 'drop', evitar);
}

const hayArchivos = (e) => e.dataTransfer?.types?.includes('Files');

// Clics, teclado y arrastrar archivos sobre tarjetas. Sirve para la lista
// y para la ficha, que lleva la misma tarjeta dentro de una ventana.
function conectarLista(el) {
    el.addEventListener('click', alClicLista);
    el.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-acc="ver"]')) {
            e.preventDefault();
            e.target.click();
        }
    });
    el.addEventListener('dragover', (e) => {
        const doc = e.target.closest('.pj-doc');
        if (!doc || !hayArchivos(e) || isViewer()) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        doc.classList.add('pj-arrastrando');
    });
    el.addEventListener('dragleave', (e) => {
        const doc = e.target.closest('.pj-doc');
        if (doc && !doc.contains(e.relatedTarget)) doc.classList.remove('pj-arrastrando');
    });
    el.addEventListener('drop', (e) => {
        const doc = e.target.closest('.pj-doc');
        if (!doc || !hayArchivos(e)) return;
        e.preventDefault();
        e.stopPropagation();
        doc.classList.remove('pj-arrastrando');
        if (isViewer()) return;
        subirArchivos(proyecto(doc.closest('.pj-card').dataset.id), [...e.dataTransfer.files]);
    });
}

async function alClicLista(e) {
    // Vista minimizada: la miniatura abre el proyecto completo en una ficha
    const mini = e.target.closest('.pj-mini');
    if (mini) {
        abrirFicha(proyecto(mini.dataset.id));
        return;
    }

    const btn = e.target.closest('[data-acc]');
    if (!btn) return;
    const card = btn.closest('.pj-card');
    const p = card && proyecto(card.dataset.id);
    if (!p) return;

    switch (btn.dataset.acc) {
        case 'ver':            verArchivo(p, btn.dataset.archivo); break;
        case 'borrar-archivo': e.stopPropagation(); borrarArchivo(p, p.files.find(f => f.id === btn.dataset.archivo)); break;
        case 'subir':          elegirArchivos(p); break;
        case 'grande':         abrirGrande(p, archivoVisto(p)); break;
        case 'descargar':      archivoVisto(p) && descargar(archivoVisto(p)).catch(err => toastError(err.message)); break;
        case 'editar':         formularioProyecto(p); break;
        case 'eliminar':       eliminarProyecto(p); break;
        case 'ctx-editar':     editarContexto(card, p); break;
        case 'ctx-borrar':     borrarContexto(p); break;
        case 'ctx-cancelar':   pintarContexto(card, p); break;
        case 'ctx-guardar':    guardarContexto(card, p, btn); break;
        case 'ctx-guia':       ponerGuia(card); break;
    }
}

// ── Pintado ─────────────────────────────────────────────────────
function pintarTodo() {
    pintarResumen();
    pintarFiltros();
    pintarLista();
}

function pintarResumen() {
    const ps = st.proyectos;
    const pon = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    pon('pj-k-total', ps.length);
    pon('pj-k-eval', ps.filter(p => p.status === 'En evaluación').length);
    pon('pj-k-aprob', ps.filter(p => ['Aprobado', 'En ejecución', 'Finalizado'].includes(p.status)).length);
    pon('pj-k-docs', ps.reduce((s, p) => s + p.files.length, 0));

    // Lo que está esperando decisión, que es lo que más le interesa a quien aprueba
    const pendientes = ps.filter(p => p.status === 'En evaluación' && p.amount != null);
    const q = pendientes.filter(p => p.currency !== 'USD').reduce((s, p) => s + p.amount, 0);
    const usd = pendientes.filter(p => p.currency === 'USD').reduce((s, p) => s + p.amount, 0);
    const el = document.getElementById('pj-k-monto');
    if (el) {
        el.textContent = usd && !q ? montoCorto(usd, 'USD') : montoCorto(q, 'GTQ');
        el.title = [q ? monto(q, 'GTQ') : '', usd ? monto(usd, 'USD') : ''].filter(Boolean).join(' + ') || 'Sin montos por aprobar';
    }
    const extra = document.getElementById('pj-k-monto-extra');
    if (extra) extra.textContent = usd && q ? `+ ${montoCorto(usd, 'USD')}` : '';

    const presentar = document.getElementById('pj-presentar');
    if (presentar) presentar.disabled = !ps.length;
}

function pintarFiltros() {
    const cont = document.getElementById('pj-filtros');
    if (!cont) return;
    const cuenta = (id) => st.proyectos.filter(p => p.status === id).length;
    cont.innerHTML = [
        `<button type="button" class="pj-chip ${st.filtro === '' ? 'activo' : ''}" data-estado="">Todos <b>${st.proyectos.length}</b></button>`,
        ...ESTADOS.map(e => {
            const n = cuenta(e.id);
            return `<button type="button" class="pj-chip ${st.filtro === e.id ? 'activo' : ''} ${n ? '' : 'vacio'}" data-estado="${esc(e.id)}" style="--c:${e.color}">
                <i></i>${esc(e.id)} <b>${n}</b></button>`;
        })
    ].join('');
}

function visibles() {
    const q = sinAcentos(st.busqueda.trim());
    let ps = st.proyectos.filter(p => !st.filtro || p.status === st.filtro);
    if (q) {
        ps = ps.filter(p => sinAcentos([p.name, p.vendor, p.status, p.context, p.nextStep, ...p.files.map(f => f.name)].join(' ')).includes(q));
    }
    const orden = {
        recientes: (a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
        nombre:    (a, b) => a.name.localeCompare(b.name, 'es'),
        monto:     (a, b) => (b.amount ?? -1) - (a.amount ?? -1),
        fecha:     (a, b) => (b.quoteDate || '').localeCompare(a.quoteDate || '')
    }[st.orden];
    return [...ps].sort(orden);
}

function pintarLista() {
    const lista = document.getElementById('pj-lista');
    const vacio = document.getElementById('pj-vacio');
    if (!lista) return;

    // Los visores de la lista se sueltan; los de una ficha abierta, no
    lista.querySelectorAll('[data-visor]').forEach(v => { st.io.unobserve(v); soltarVisor(v); });
    ocultarVistazo();
    lista.classList.toggle('pj-lista-mini', st.vista === 'mini');

    if (!st.proyectos.length) {
        lista.innerHTML = '';
        vacio.hidden = false;
        return;
    }
    vacio.hidden = true;

    const ps = visibles();
    if (!ps.length) {
        lista.innerHTML = `<div class="pj-sin-resultados">Ningún proyecto coincide con la búsqueda o el filtro.</div>`;
        return;
    }
    if (st.vista === 'mini') {
        pintarMinis(lista, ps);
        return;
    }
    lista.innerHTML = ps.map(tarjetaHtml).join('');
    lista.querySelectorAll('[data-visor]').forEach(v => st.io.observe(v));
}

// ── Vista minimizada: miniaturas, 15 por página ─────────────────
const POR_PAGINA = 15;

function pintarMinis(lista, ps) {
    const paginas = Math.max(1, Math.ceil(ps.length / POR_PAGINA));
    st.pagina = Math.min(Math.max(1, st.pagina), paginas);
    const desde = (st.pagina - 1) * POR_PAGINA;
    const pagina = ps.slice(desde, desde + POR_PAGINA);

    lista.innerHTML = `<div class="pj-minis">${pagina.map(miniHtml).join('')}</div>
        <div class="pj-minis-pie">
            <span class="pj-minis-cuenta">Mostrando ${desde + 1}–${desde + pagina.length} de ${ps.length}</span>
            <div class="pj-paginador" id="pj-paginador"></div>
        </div>`;

    renderPager(lista.querySelector('#pj-paginador'), {
        page: st.pagina,
        totalPages: paginas,
        onChange: (n) => {
            st.pagina = n;
            pintarLista();
            document.getElementById('pj-filtros')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

// Palabras que no cuentan para las iniciales ("Compra DE cámara" → CC)
const RELLENO = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'para', 'por', 'con', 'a', 'al', 'un', 'una', 'o']);

function iniciales(nombre) {
    const palabras = nombre.split(/\s+/).filter(Boolean);
    const utiles = palabras.filter(w => !RELLENO.has(sinAcentos(w)));
    return (utiles.length ? utiles : palabras).slice(0, 2).map(w => [...w][0]).join('').toUpperCase() || '•';
}

function miniHtml(p) {
    const color = colorDeEstado(p.status);
    return `<button type="button" class="pj-mini" id="pjm-${p.id}" data-id="${p.id}" style="--accent:${color}"
            aria-label="Abrir ${esc(p.name)}">
        <span class="pj-mini-cabeza">
            <span class="pj-mini-ico" aria-hidden="true">${esc(iniciales(p.name))}</span>
            <span class="pj-mini-nombre">${esc(p.name)}</span>
        </span>
        <span class="pj-mini-pie">
            <span class="pj-estado" style="--c:${color}">${esc(p.status)}</span>
            ${p.amount != null ? `<span class="pj-mini-monto">${monto(p.amount, p.currency)}</span>` : ''}
        </span>
    </button>`;
}

function pintarBotonVista() {
    const b = document.getElementById('pj-vista');
    if (!b || !st) return;
    const mini = st.vista === 'mini';
    b.innerHTML = mini ? `${I.maximizar}<span>Expandir todo</span>` : `${I.minimizar}<span>Minimizar todo</span>`;
    b.setAttribute('aria-pressed', String(mini));
    b.title = mini
        ? 'Ver cada proyecto completo, con su documento y su contexto'
        : 'Ver solo los nombres, para encontrar un proyecto más rápido';
}

// ── Vistazo del contexto al pasar el cursor por una miniatura ────
// Solo en PC: con el dedo no hay "encima", y tocar ya abre la ficha.
let tVistazo = 0;

function conectarVistazo(lista) {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    lista.addEventListener('mouseover', (e) => {
        const mini = e.target.closest('.pj-mini');
        if (!mini || mini.contains(e.relatedTarget)) return;
        clearTimeout(tVistazo);
        tVistazo = setTimeout(() => mostrarVistazo(mini), 260);
    });
    lista.addEventListener('mouseout', (e) => {
        const mini = e.target.closest('.pj-mini');
        if (!mini || mini.contains(e.relatedTarget)) return;
        clearTimeout(tVistazo);
        ocultarVistazo();
    });
    escuchar(window, 'scroll', ocultarVistazo, { passive: true });
    escuchar(window, 'resize', ocultarVistazo, { passive: true });
}

function mostrarVistazo(mini) {
    const p = st && proyecto(mini.dataset.id);
    if (!p || !mini.isConnected) return;

    let v = document.getElementById('pj-vistazo');
    if (!v) {
        v = document.createElement('div');
        v.id = 'pj-vistazo';
        v.className = 'pj-vistazo';
        v.setAttribute('aria-hidden', 'true');   // es un adelanto; la ficha tiene lo mismo
        document.body.appendChild(v);
    }
    const hay = Boolean(p.context || p.nextStep);
    v.style.setProperty('--accent', colorDeEstado(p.status));
    v.innerHTML = `<div class="pj-vis-cab">
            <span class="pj-vis-tit">${I.nota}Contexto</span>
            ${hay && p.contextUpdatedAt ? `<span class="pj-vis-fecha">Escrito ${haceCuanto(p.contextUpdatedAt)}</span>` : ''}
        </div>
        <div class="pj-vis-nombre">${esc(p.name)}</div>
        ${p.nextStep ? `<div class="pj-paso pj-paso-mini">
            <span class="pj-paso-ico">${I.bandera}</span>
            <div><span class="pj-paso-l">Próximo paso</span><p>${esc(p.nextStep)}</p></div>
        </div>` : ''}
        ${p.context ? `<div class="pj-vis-texto">${textoBonito(p.context)}</div>` : ''}
        ${hay ? '' : `<p class="pj-vis-vacio">Este proyecto todavía no tiene contexto.</p>`}`;

    // Si el texto es largo se corta con un desvanecido: es un vistazo,
    // el contexto completo está al abrir el proyecto.
    const texto = v.querySelector('.pj-vis-texto');
    v.classList.add('midiendo');
    if (texto) texto.classList.toggle('cortado', texto.scrollHeight > texto.clientHeight + 2);

    // A la derecha de la miniatura; si no cabe, a la izquierda; y si
    // tampoco (pantallas estrechas), debajo.
    const r = mini.getBoundingClientRect();
    const ancho = v.offsetWidth;
    const alto = v.offsetHeight;
    const hueco = 14;
    let left = r.right + hueco;
    let top = r.top;
    if (left + ancho > innerWidth - 10) left = r.left - hueco - ancho;
    if (left < 10) {
        left = Math.min(Math.max(10, r.left), innerWidth - ancho - 10);
        top = r.bottom + hueco;
    }
    top = Math.min(Math.max(64, top), innerHeight - alto - 10);
    v.style.left = `${Math.round(left)}px`;
    v.style.top = `${Math.round(top)}px`;
    v.classList.remove('midiendo');
    void v.offsetWidth;   // que la transición arranque desde la posición nueva
    v.classList.add('visible');
}

function ocultarVistazo() {
    clearTimeout(tVistazo);
    document.getElementById('pj-vistazo')?.classList.remove('visible');
}

function repintarTarjeta(p) {
    // La miniatura (si la hay) también refleja el cambio
    const mini = document.getElementById(`pjm-${p.id}`);
    if (mini) mini.outerHTML = miniHtml(p);

    const vieja = tarjeta(p.id);
    if (!vieja) return;
    soltarVisor(vieja.querySelector('[data-visor]'));
    vieja.outerHTML = tarjetaHtml(p);
    const visor = tarjeta(p.id)?.querySelector('[data-visor]');
    if (visor) st.io.observe(visor);
}

function tarjetaHtml(p) {
    const color = colorDeEstado(p.status);
    const n = p.files.length;
    return `<article class="pj-card" id="pj-${p.id}" data-id="${p.id}" style="--accent:${color}">
        <header class="pj-card-hdr">
            <div class="pj-card-tit">
                <div class="pj-kicker">
                    <span class="pj-estado" style="--c:${color}">${esc(p.status)}</span>
                    ${p.quoteDate ? `<span class="pj-kicker-dato">${I.calendario}Cotizado el ${fechaCorta(p.quoteDate)}</span>` : ''}
                </div>
                <h2 class="pj-nombre">${esc(p.name)}</h2>
                <div class="pj-meta">
                    ${p.vendor ? `<span>${I.tienda}${esc(p.vendor)}</span>` : ''}
                    <span>${I.clip}${n} ${n === 1 ? 'documento' : 'documentos'}</span>
                    <span title="${esc(fechaHora(p.updatedAt))}">${I.reloj}Actualizado ${haceCuanto(p.updatedAt)}</span>
                </div>
            </div>
            <div class="pj-card-lado">
                ${p.amount != null ? `<div class="pj-monto">
                    <span class="pj-monto-l">Monto cotizado</span>
                    <span class="pj-monto-n">${monto(p.amount, p.currency)}</span>
                </div>` : ''}
                <div class="pj-card-acc pj-editor">
                    <button type="button" class="pj-icono" data-acc="editar" title="Editar datos del proyecto" aria-label="Editar datos del proyecto">${I.lapiz}</button>
                    <button type="button" class="pj-icono pj-peligro" data-acc="eliminar" title="Eliminar proyecto" aria-label="Eliminar proyecto">${I.basura}</button>
                </div>
            </div>
        </header>
        <div class="pj-cuerpo-card">
            <section class="pj-doc" aria-label="Documentos">${documentosHtml(p)}</section>
            <section class="pj-ctx" aria-label="Contexto">${contextoHtml(p)}</section>
        </div>
    </article>`;
}

function documentosHtml(p, { lectura = false } = {}) {
    if (!p.files.length) {
        return `<div class="pj-visor pj-visor-vacio">
            <div class="pj-soltar">
                <div class="pj-soltar-ico">${I.subir}</div>
                <p class="pj-soltar-tit">Sin documentos todavía</p>
                ${lectura ? '' : `<p class="pj-soltar-txt pj-editor">Arrastra aquí la cotización (PDF, imagen o Word)<br>o <button type="button" class="pj-enlace" data-acc="subir">elige los archivos</button></p>`}
            </div>
        </div>`;
    }
    const visto = archivoVisto(p);
    return `<div class="pj-tabs" role="tablist" aria-label="Documentos del proyecto">
            ${p.files.map(f => `<div class="pj-tab ${f.id === visto?.id ? 'activo' : ''}" role="tab" tabindex="0"
                    aria-selected="${f.id === visto?.id}" data-acc="ver" data-archivo="${f.id}" title="${esc(f.name)} · ${tamano(f.size)}">
                <span class="pj-tab-ico pj-t-${tipoDe(f)}">${iconoTipo(f)}</span>
                <span class="pj-tab-nombre">${esc(f.name)}</span>
                ${lectura ? '' : `<button type="button" class="pj-tab-x pj-editor" data-acc="borrar-archivo" data-archivo="${f.id}" title="Eliminar documento" aria-label="Eliminar ${esc(f.name)}">${I.x}</button>`}
            </div>`).join('')}
            ${lectura ? '' : `<button type="button" class="pj-tab-mas pj-editor" data-acc="subir" title="Agregar documentos">${I.mas}<span>Agregar</span></button>`}
        </div>
        <div class="pj-visor">
            <div class="pjv" data-visor></div>
            <div class="pj-visor-acc">
                <button type="button" class="pj-flot" data-acc="grande" title="Ver en grande" aria-label="Ver en grande">${I.expandir}</button>
                <button type="button" class="pj-flot" data-acc="descargar" title="Descargar" aria-label="Descargar">${I.bajar}</button>
            </div>
        </div>`;
}

function contextoHtml(p, { lectura = false } = {}) {
    const hay = Boolean(p.context || p.nextStep);
    return `<div class="pj-ctx-hdr">
            <div>
                <h3>${I.nota}Contexto</h3>
                ${hay && p.contextUpdatedAt ? `<span class="pj-ctx-fecha" title="${esc(fechaHora(p.contextUpdatedAt))}">Escrito ${haceCuanto(p.contextUpdatedAt)}</span>` : ''}
            </div>
            ${hay && !lectura ? `<div class="pj-ctx-acc pj-editor">
                <button type="button" class="pj-btn-suave" data-acc="ctx-editar">${I.lapiz}Editar</button>
                <button type="button" class="pj-btn-suave pj-peligro" data-acc="ctx-borrar">${I.basura}Eliminar</button>
            </div>` : ''}
        </div>
        ${hay ? `
            ${p.nextStep ? `<div class="pj-paso">
                <span class="pj-paso-ico">${I.bandera}</span>
                <div><span class="pj-paso-l">Próximo paso</span><p>${esc(p.nextStep)}</p></div>
            </div>` : ''}
            ${p.context ? `<div class="pj-ctx-texto">${textoBonito(p.context)}</div>` : ''}
        ` : `<div class="pj-ctx-vacio">
            <div class="pj-ctx-vacio-ico">${I.nota}</div>
            <p>Todavía no hay contexto para este proyecto.</p>
            ${lectura ? '' : `<p class="pj-ctx-vacio-sub pj-editor">Explica de qué se trata, por qué se necesita y en qué va, para que al verlo se recuerde todo.</p>
            <button type="button" class="pj-btn-primario pj-editor" data-acc="ctx-editar">${I.lapiz}Escribir contexto</button>`}
        </div>`}`;
}

function pintarContexto(card, p) {
    card.querySelector('.pj-ctx').innerHTML = contextoHtml(p);
}

// ── Documentos ──────────────────────────────────────────────────
function verArchivo(p, idArchivo) {
    if (st.sel.get(p.id) === idArchivo && tarjeta(p.id)?.querySelector('[data-visor]')?._visor) return;
    st.sel.set(p.id, idArchivo);
    const card = tarjeta(p.id);
    card.querySelectorAll('.pj-tab').forEach(t => {
        const activo = t.dataset.archivo === idArchivo;
        t.classList.toggle('activo', activo);
        t.setAttribute('aria-selected', String(activo));
    });
    const visor = card.querySelector('[data-visor]');
    st.io.unobserve(visor);
    mostrarArchivo(visor, archivoVisto(p));
}

function elegirArchivos(p) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACEPTA;
    input.onchange = () => subirArchivos(p, [...input.files]);
    input.click();
}

async function subirArchivos(p, files) {
    if (!p || !files.length) return;
    const rechazados = files.map(validarArchivo).filter(Boolean);
    const validos = files.filter(f => !validarArchivo(f));
    if (rechazados.length) toastError(rechazados.join(' '), { title: 'Algunos archivos no se subieron' });
    if (!validos.length) return;

    const card = tarjeta(p.id);
    const aviso = document.createElement('div');
    aviso.className = 'pj-subiendo';
    card?.querySelector('.pj-doc')?.prepend(aviso);

    const fallidos = [];
    let ultimo = null;
    for (let i = 0; i < validos.length; i++) {
        aviso.innerHTML = `<div class="db-spinner"></div><span>Subiendo ${validos.length > 1 ? `${i + 1} de ${validos.length} · ` : ''}${esc(validos[i].name)}…</span>`;
        try {
            const { archivo, actualizado } = await uploadFile(p, validos[i]);
            p.files.push(archivo);
            if (actualizado) p.updatedAt = actualizado;
            ultimo = archivo;
        } catch (err) {
            fallidos.push(err.message);
        }
    }
    aviso.remove();
    if (!st) return;   // se salió de la página mientras subía

    if (ultimo) st.sel.set(p.id, ultimo.id);
    repintarTarjeta(p);
    pintarResumen();

    const subidos = validos.length - fallidos.length;
    if (fallidos.length) toastError(fallidos.join(' '), { title: subidos ? 'Algunos documentos no se subieron' : 'No se subió ningún documento' });
    if (subidos) toastSuccess(subidos === 1 ? `Documento agregado a «${p.name}».` : `${subidos} documentos agregados a «${p.name}».`);
}

async function borrarArchivo(p, f) {
    if (!f) return;
    const ok = await confirmar({
        titulo: 'Eliminar documento',
        mensaje: `¿Eliminar <b>${esc(f.name)}</b> de «${esc(p.name)}»? No se puede deshacer.`,
        boton: 'Eliminar documento'
    });
    if (!ok) return;
    try {
        const { actualizado } = await deleteFile(p, f);
        p.files = p.files.filter(x => x.id !== f.id);
        if (actualizado) p.updatedAt = actualizado;
        if (st.sel.get(p.id) === f.id) st.sel.delete(p.id);
        repintarTarjeta(p);
        pintarResumen();
        toastSuccess(`Se eliminó «${f.name}».`);
    } catch (err) {
        toastError(err.message, { title: 'No se eliminó el documento' });
    }
}

// ── Contexto ────────────────────────────────────────────────────
function editarContexto(card, p) {
    const ctx = card.querySelector('.pj-ctx');
    ctx.innerHTML = `<div class="pj-ctx-hdr"><div><h3>${I.nota}Contexto</h3></div></div>
        <label class="pj-campo">
            <span>Próximo paso</span>
            <input class="pj-input" data-campo="paso" maxlength="200" value="${esc(p.nextStep)}"
                   placeholder="Ej. Esperar el visto bueno de gerencia">
        </label>
        <label class="pj-campo pj-campo-grande">
            <span>¿De qué se trata y en qué vamos?
                <button type="button" class="pj-enlace" data-acc="ctx-guia">Usar guía</button></span>
            <textarea class="pj-textarea" data-campo="texto" rows="9"
                placeholder="Cuéntalo como se lo contarías en persona: qué se cotizó, por qué hace falta y en qué quedó.">${esc(p.context)}</textarea>
        </label>
        <p class="pj-ayuda">Consejo: empieza una línea con «-» para hacer una lista y escribe **así** para resaltar.</p>
        <div class="pj-ctx-pie">
            <button type="button" class="pj-btn-suave" data-acc="ctx-cancelar">Cancelar</button>
            <button type="button" class="pj-btn-primario" data-acc="ctx-guardar">Guardar contexto</button>
        </div>`;
    const area = ctx.querySelector('textarea');
    const crecer = () => { area.style.height = 'auto'; area.style.height = `${Math.min(area.scrollHeight + 2, 520)}px`; };
    area.addEventListener('input', crecer);
    crecer();
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
}

function ponerGuia(card) {
    const area = card.querySelector('.pj-ctx textarea');
    if (!area) return;
    area.value = area.value.trim() ? `${area.value.trimEnd()}\n\n${GUIA}` : GUIA;
    area.dispatchEvent(new Event('input'));
    area.focus();
}

async function guardarContexto(card, p, btn) {
    const texto = card.querySelector('[data-campo="texto"]').value;
    const paso = card.querySelector('[data-campo="paso"]').value;
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
        const nuevo = await updateProject(p, { context: texto, nextStep: paso });
        Object.assign(p, nuevo, { files: p.files });
        repintarTarjeta(p);
        toastSuccess('Contexto guardado.');
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Guardar contexto';
        toastError(err.message, { title: 'No se guardó el contexto' });
    }
}

async function borrarContexto(p) {
    const ok = await confirmar({
        titulo: 'Eliminar contexto',
        mensaje: `Se borrará el contexto y el próximo paso de «${esc(p.name)}». Los documentos no se tocan.`,
        boton: 'Eliminar contexto'
    });
    if (!ok) return;
    try {
        const nuevo = await updateProject(p, { context: '', nextStep: '' });
        Object.assign(p, nuevo, { files: p.files, contextUpdatedAt: null });
        repintarTarjeta(p);
        toastSuccess('Contexto eliminado.');
    } catch (err) {
        toastError(err.message, { title: 'No se eliminó el contexto' });
    }
}

// ── Proyecto: crear, editar, eliminar ───────────────────────────
function formularioProyecto(p = null) {
    const v = p ?? { status: 'En evaluación', currency: 'GTQ' };
    const cuerpo = `
        <div class="form-group"><label for="pjf-nombre">Nombre del proyecto *</label>
            <input id="pjf-nombre" maxlength="140" value="${esc(v.name ?? '')}" placeholder="Ej. Renovación de switches en CMY"></div>
        <div class="form-row">
            <div class="form-group"><label for="pjf-proveedor">Proveedor</label>
                <input id="pjf-proveedor" maxlength="120" value="${esc(v.vendor ?? '')}" placeholder="Quién cotiza"></div>
            <div class="form-group"><label for="pjf-estado">Estado</label>
                <select id="pjf-estado">${ESTADOS.map(e => `<option ${e.id === v.status ? 'selected' : ''}>${esc(e.id)}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label for="pjf-monto">Monto cotizado</label>
                <div class="pjf-monto">
                    <select id="pjf-moneda" aria-label="Moneda">
                        <option value="GTQ" ${v.currency !== 'USD' ? 'selected' : ''}>Q</option>
                        <option value="USD" ${v.currency === 'USD' ? 'selected' : ''}>US$</option>
                    </select>
                    <input id="pjf-monto" type="number" min="0" step="0.01" inputmode="decimal" value="${v.amount ?? ''}" placeholder="0.00">
                </div></div>
            <div class="form-group"><label for="pjf-fecha">Fecha de la cotización</label>
                <input id="pjf-fecha" type="date" value="${esc(v.quoteDate ?? '')}"></div>
        </div>
        ${p ? '' : `
        <div class="form-group"><label for="pjf-paso">Próximo paso</label>
            <input id="pjf-paso" maxlength="200" placeholder="Ej. Esperar el visto bueno de gerencia"></div>
        <div class="form-group"><label for="pjf-contexto">Contexto</label>
            <textarea id="pjf-contexto" rows="5" placeholder="¿De qué se trata? ¿Por qué se necesita? ¿En qué vamos?"></textarea></div>
        <div class="form-group"><label for="pjf-archivos">Documentos</label>
            <input id="pjf-archivos" type="file" multiple accept="${ACEPTA}">
            <small class="pjf-ayuda">PDF, imágenes o Word, hasta 50 MB cada uno. También puedes arrastrarlos después a la tarjeta del proyecto.</small></div>`}
        <p class="pjf-error" id="pjf-error" hidden></p>`;

    showModal(p ? 'Editar proyecto' : 'Nuevo proyecto', cuerpo, async () => {
        const btn = document.getElementById('modal-save');
        if (btn.disabled) return;
        const datos = leerFormulario(!p);
        if (!datos) return;
        const archivos = p ? [] : [...(document.getElementById('pjf-archivos')?.files ?? [])];

        btn.disabled = true;
        btn.textContent = p ? 'Guardando…' : 'Creando…';
        try {
            if (p) {
                const nuevo = await updateProject(p, datos);
                Object.assign(p, nuevo, { files: p.files });
                closeModal();
                pintarResumen();
                pintarFiltros();
                // La tarjeta (en la lista o en la ficha) y su miniatura se
                // actualizan; si con el estado nuevo ya no entra en el filtro,
                // además cambia la lista.
                repintarTarjeta(p);
                if (st.filtro && p.status !== st.filtro) pintarLista();
                toastSuccess('Datos del proyecto guardados.');
            } else {
                const nuevo = await createProject(datos);
                st.proyectos.unshift(nuevo);
                closeModal();
                st.filtro = '';
                st.busqueda = '';
                const buscar = document.getElementById('pj-buscar');
                if (buscar) buscar.value = '';
                if (st.vista === 'mini') {
                    // A la página donde quedó, y se abre para ver cómo sube lo adjunto
                    const pos = visibles().findIndex(x => x.id === nuevo.id);
                    st.pagina = Math.floor(Math.max(0, pos) / POR_PAGINA) + 1;
                    pintarTodo();
                    abrirFicha(nuevo);
                } else {
                    pintarTodo();
                    tarjeta(nuevo.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                if (archivos.length) await subirArchivos(nuevo, archivos);
                else toastSuccess(`Proyecto «${nuevo.name}» creado.`);
            }
        } catch (err) {
            btn.disabled = false;
            btn.textContent = p ? 'Guardar cambios' : 'Crear proyecto';
            const box = document.getElementById('pjf-error');
            if (box) { box.textContent = err.message; box.hidden = false; }
            else toastError(err.message);
        }
    }, p ? 'Guardar cambios' : 'Crear proyecto');
}

function leerFormulario(esNuevo) {
    const val = (id) => document.getElementById(id)?.value ?? '';
    const error = (msg, id) => {
        const box = document.getElementById('pjf-error');
        box.textContent = msg;
        box.hidden = false;
        document.getElementById(id)?.focus();
        return null;
    };
    const nombre = val('pjf-nombre').trim();
    if (!nombre) return error('Ponle un nombre al proyecto.', 'pjf-nombre');
    const crudo = val('pjf-monto').trim();
    const cantidad = crudo === '' ? null : Number(crudo);
    if (cantidad !== null && (!Number.isFinite(cantidad) || cantidad < 0)) return error('El monto debe ser un número positivo.', 'pjf-monto');

    const datos = {
        name: nombre,
        vendor: val('pjf-proveedor'),
        status: val('pjf-estado'),
        amount: cantidad,
        currency: val('pjf-moneda') || 'GTQ',
        quoteDate: val('pjf-fecha')
    };
    if (esNuevo) {
        datos.nextStep = val('pjf-paso');
        datos.context = val('pjf-contexto');
    }
    return datos;
}

async function eliminarProyecto(p) {
    const n = p.files.length;
    const ok = await confirmar({
        titulo: 'Eliminar proyecto',
        mensaje: `¿Eliminar <b>${esc(p.name)}</b>${n ? ` y sus ${n} ${n === 1 ? 'documento' : 'documentos'}` : ''}? No se puede deshacer.`,
        boton: 'Eliminar proyecto'
    });
    if (!ok) return;
    try {
        await deleteProject(p);
        st.proyectos = st.proyectos.filter(x => x.id !== p.id);
        st.sel.delete(p.id);
        cerrarFichaDe(p.id);   // si se borró desde la ficha, esta se va
        const card = tarjeta(p.id) ?? document.getElementById(`pjm-${p.id}`);
        if (card) {
            soltarVisor(card.querySelector('[data-visor]'));
            card.classList.add('pj-saliendo');
            await new Promise(r => setTimeout(r, 260));
        }
        pintarTodo();
        toastSuccess(`Se eliminó «${p.name}».`);
    } catch (err) {
        toastError(err.message, { title: 'No se eliminó el proyecto' });
    }
}

// ── Confirmación (vidrio, como el resto) ────────────────────────
function confirmar({ titulo, mensaje, boton }) {
    return new Promise((resolver) => {
        const capa = document.createElement('div');
        capa.className = 'pj-dialogo';
        capa.innerHTML = `<div class="pj-dialogo-caja" role="alertdialog" aria-modal="true" aria-labelledby="pj-dlg-t">
            <div class="pj-dialogo-ico">${I.basura}</div>
            <h3 id="pj-dlg-t">${esc(titulo)}</h3>
            <p>${mensaje}</p>
            <div class="pj-dialogo-pie">
                <button type="button" class="pj-btn-suave" data-r="no">Cancelar</button>
                <button type="button" class="pj-btn-peligro" data-r="si">${esc(boton)}</button>
            </div>
        </div>`;
        const cerrar = (r) => {
            document.removeEventListener('keydown', teclas, true);
            capa.classList.add('saliendo');
            setTimeout(() => capa.remove(), 160);
            resolver(r);
        };
        const teclas = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(false); }
        };
        capa.addEventListener('click', (e) => {
            if (e.target === capa) cerrar(false);
            const r = e.target.closest('[data-r]')?.dataset.r;
            if (r) cerrar(r === 'si');
        });
        document.addEventListener('keydown', teclas, true);
        document.body.appendChild(capa);
        capa.querySelector('[data-r="no"]').focus();   // lo seguro, por defecto
    });
}

// ── Capas: ver en grande, ficha y presentación ──────────────────
// Pueden abrirse unas encima de otras (ver en grande desde la ficha o desde
// la presentación). Se apilan: Escape y las flechas son siempre de la de
// arriba, y al salir de la página se cierran todas.
const capas = [];

function apilar(capa, cerrar) {
    capas.push({ capa, cerrar });
    document.body.style.overflow = 'hidden';
}

function desapilar(capa) {
    const i = capas.findIndex(c => c.capa === capa);
    if (i >= 0) capas.splice(i, 1);
    if (!capas.length) document.body.style.overflow = '';
}

// Los diálogos de confirmar y los formularios van por encima de cualquier capa
const esLaDeArriba = (capa) =>
    capas[capas.length - 1]?.capa === capa && !document.querySelector('.pj-dialogo, .form-overlay');

function cerrarCapas() {
    [...capas].reverse().forEach(c => c.cerrar());
    capas.length = 0;
}

function abrirGrande(p, archivo) {
    if (!archivo) return;
    let i = Math.max(0, p.files.findIndex(f => f.id === archivo.id));
    const capa = document.createElement('div');
    capa.className = 'pjv-capa';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.innerHTML = `<div class="pjv-capa-barra">
            <div class="pjv-capa-tit"><span class="pjv-capa-proy">${esc(p.name)}</span><span class="pjv-capa-arch"></span></div>
            <div class="pjv-capa-acc">
                ${p.files.length > 1 ? `<button type="button" class="pjv-capa-btn" data-c="ant" aria-label="Documento anterior">${I.izq}</button>
                    <span class="pjv-capa-n"></span>
                    <button type="button" class="pjv-capa-btn" data-c="sig" aria-label="Documento siguiente">${I.der}</button>` : ''}
                <button type="button" class="pjv-capa-btn pjv-capa-txt" data-c="abrir">${I.externo}<span>Abrir aparte</span></button>
                <button type="button" class="pjv-capa-btn pjv-capa-txt" data-c="bajar">${I.bajar}<span>Descargar</span></button>
                <button type="button" class="pjv-capa-btn" data-c="cerrar" aria-label="Cerrar">${I.x}</button>
            </div>
        </div>
        <div class="pjv-capa-cuerpo"><div class="pjv pjv-grande" data-visor></div></div>`;

    const visor = capa.querySelector('[data-visor]');
    const mostrar = () => {
        const f = p.files[i];
        capa.querySelector('.pjv-capa-arch').textContent = f.name;
        const n = capa.querySelector('.pjv-capa-n');
        if (n) n.textContent = `${i + 1} / ${p.files.length}`;
        capa.querySelector('[data-c="abrir"]').hidden = tipoDe(f) === 'docx' || tipoDe(f) === 'doc';
        mostrarArchivo(visor, f);
    };
    const mover = (d) => { i = (i + d + p.files.length) % p.files.length; mostrar(); };

    const teclas = (e) => {
        if (!esLaDeArriba(capa)) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
        else if (e.key === 'ArrowLeft' && p.files.length > 1) mover(-1);
        else if (e.key === 'ArrowRight' && p.files.length > 1) mover(1);
    };
    const cerrar = () => {
        document.removeEventListener('keydown', teclas, true);
        soltarVisor(visor);
        capa.remove();
        desapilar(capa);
    };
    capa.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-c]')?.dataset.c;
        if (c === 'cerrar') cerrar();
        else if (c === 'ant') mover(-1);
        else if (c === 'sig') mover(1);
        else if (c === 'bajar') descargar(p.files[i]).catch(err => toastError(err.message));
        else if (c === 'abrir') {
            // La pestaña se abre ya, dentro del clic, y se le pone la dirección
            // después: si se abriera tras el await la bloquearía el navegador.
            const pestana = window.open('', '_blank');
            try { pestana.location.href = await urlDe(p.files[i]); }
            catch (err) { pestana?.close(); toastError(err.message); }
        } else if (e.target.closest('[data-acc="descargar"]')) descargar(p.files[i]).catch(err => toastError(err.message));
        else if (e.target === capa || e.target.classList.contains('pjv-capa-cuerpo')) cerrar();
    });

    document.addEventListener('keydown', teclas, true);
    // En pantalla completa solo se ve lo que está dentro del elemento a
    // pantalla completa (la presentación): ahí tiene que ir la capa.
    (document.fullscreenElement ?? document.body).appendChild(capa);
    apilar(capa, cerrar);
    mostrar();
}

// ── Ficha: un proyecto completo encima de la vista minimizada ───
// Es la misma tarjeta de la vista completa, con todas sus acciones
// (documentos, contexto, editar, eliminar) dentro de una ventana.
function abrirFicha(p) {
    if (!p) return;
    ocultarVistazo();
    const capa = document.createElement('div');
    capa.className = 'pj-ficha';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-label', p.name);
    capa.innerHTML = `<div class="pj-ficha-marco">
            <button type="button" class="pj-ficha-cerrar" data-c="cerrar" aria-label="Cerrar">${I.x}</button>
            <div class="pj-ficha-cuerpo">${tarjetaHtml(p)}</div>
        </div>`;
    const cuerpo = capa.querySelector('.pj-ficha-cuerpo');
    conectarLista(cuerpo);

    const teclas = (e) => {
        if (esLaDeArriba(capa) && e.key === 'Escape') { e.preventDefault(); cerrar(); }
    };
    const cerrar = () => {
        document.removeEventListener('keydown', teclas, true);
        cuerpo.querySelectorAll('[data-visor]').forEach(soltarVisor);
        capa.remove();
        desapilar(capa);
        // Lo que se cambió dentro (nombre, estado, monto) se ve en la lista
        if (st) pintarLista();
    };
    capa.addEventListener('click', (e) => {
        if (e.target === capa || e.target.closest('[data-c="cerrar"]')) cerrar();
    });

    document.addEventListener('keydown', teclas, true);
    document.body.appendChild(capa);
    apilar(capa, cerrar);
    const visor = cuerpo.querySelector('[data-visor]');
    const f = archivoVisto(p);
    if (visor && f) mostrarArchivo(visor, f);
    capa.querySelector('.pj-ficha-cerrar').focus({ preventScroll: true });
}

// Cierra la ficha en la que esté la tarjeta del proyecto (si está en una)
function cerrarFichaDe(id) {
    const ficha = tarjeta(id)?.closest('.pj-ficha');
    capas.find(c => c.capa === ficha)?.cerrar();
}

// ── Modo presentación: un proyecto por pantalla ─────────────────
function presentar(inicio) {
    const ps = visibles();
    if (!ps.length) return;
    cerrarCapas();
    let i = Math.min(Math.max(0, inicio), ps.length - 1);

    const capa = document.createElement('div');
    capa.className = 'pj-pres';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-label', 'Presentación de proyectos');
    capa.innerHTML = `<div class="pj-pres-fondo"></div>
        <div class="pj-pres-barra">
            <span class="pj-pres-marca">${I.presentar}Proyectos</span>
            <span class="pj-pres-n"></span>
            <button type="button" class="pjv-capa-btn" data-c="cerrar" aria-label="Salir de la presentación">${I.x}</button>
        </div>
        <div class="pj-pres-escena"></div>
        <button type="button" class="pj-pres-nav izq" data-c="ant" aria-label="Proyecto anterior">${I.izq}</button>
        <button type="button" class="pj-pres-nav der" data-c="sig" aria-label="Proyecto siguiente">${I.der}</button>
        <div class="pj-pres-puntos"></div>`;
    const escena = capa.querySelector('.pj-pres-escena');

    const mostrar = (direccion = 0) => {
        escena.querySelectorAll('[data-visor]').forEach(soltarVisor);
        const p = ps[i];
        const color = colorDeEstado(p.status);
        escena.innerHTML = `<article class="pj-pres-diapo ${direccion > 0 ? 'desde-der' : direccion < 0 ? 'desde-izq' : ''}" data-id="${p.id}" style="--accent:${color}">
            <header class="pj-pres-hdr">
                <div>
                    <div class="pj-kicker">
                        <span class="pj-estado" style="--c:${color}">${esc(p.status)}</span>
                        ${p.quoteDate ? `<span class="pj-kicker-dato">${I.calendario}Cotizado el ${fechaCorta(p.quoteDate)}</span>` : ''}
                        ${p.vendor ? `<span class="pj-kicker-dato">${I.tienda}${esc(p.vendor)}</span>` : ''}
                    </div>
                    <h2 class="pj-pres-nombre">${esc(p.name)}</h2>
                </div>
                ${p.amount != null ? `<div class="pj-monto pj-monto-pres"><span class="pj-monto-l">Monto cotizado</span><span class="pj-monto-n">${monto(p.amount, p.currency)}</span></div>` : ''}
            </header>
            <div class="pj-pres-cuerpo">
                <section class="pj-doc">${documentosHtml(p, { lectura: true })}</section>
                <section class="pj-ctx">${contextoHtml(p, { lectura: true })}</section>
            </div>
        </article>`;
        capa.querySelector('.pj-pres-n').textContent = `${i + 1} de ${ps.length}`;
        capa.querySelector('.pj-pres-puntos').innerHTML = ps.map((_, k) =>
            `<button type="button" class="${k === i ? 'activo' : ''}" data-ir="${k}" aria-label="Ir al proyecto ${k + 1}"></button>`).join('');
        const visor = escena.querySelector('[data-visor]');
        const f = archivoVisto(p);
        if (visor && f) mostrarArchivo(visor, f);
    };
    const mover = (d) => {
        if (ps.length < 2) return;
        i = (i + d + ps.length) % ps.length;
        mostrar(d);
    };

    const teclas = (e) => {
        // Con un documento abierto en grande encima, las teclas son suyas
        if (!esLaDeArriba(capa)) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
        else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); mover(1); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); mover(-1); }
    };
    const cerrar = () => {
        document.removeEventListener('keydown', teclas, true);
        escena.querySelectorAll('[data-visor]').forEach(soltarVisor);
        capa.remove();
        desapilar(capa);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };

    capa.addEventListener('click', (e) => {
        const c = e.target.closest('[data-c]')?.dataset.c;
        const ir = e.target.closest('[data-ir]')?.dataset.ir;
        if (c === 'cerrar') cerrar();
        else if (c === 'ant') mover(-1);
        else if (c === 'sig') mover(1);
        else if (ir != null) { const d = Number(ir) - i; if (d) { i = Number(ir); mostrar(Math.sign(d)); } }
        else {
            const acc = e.target.closest('[data-acc]');
            const p = ps[i];
            if (acc?.dataset.acc === 'ver') {
                st.sel.set(p.id, acc.dataset.archivo);
                escena.querySelectorAll('.pj-tab').forEach(t => t.classList.toggle('activo', t.dataset.archivo === acc.dataset.archivo));
                mostrarArchivo(escena.querySelector('[data-visor]'), archivoVisto(p));
            } else if (acc?.dataset.acc === 'grande') abrirGrande(p, archivoVisto(p));   // se apila encima
            else if (acc?.dataset.acc === 'descargar') archivoVisto(p) && descargar(archivoVisto(p)).catch(err => toastError(err.message));
        }
    });

    document.addEventListener('keydown', teclas, true);
    document.body.appendChild(capa);
    apilar(capa, cerrar);
    // Pantalla completa de verdad si el navegador lo permite (lo pide el clic)
    capa.requestFullscreen?.().catch(() => {});
    mostrar();
}

// ── Estados especiales ──────────────────────────────────────────
function mostrarPreparar() {
    const box = document.getElementById('pj-preparar');
    if (!box) return;
    box.hidden = false;
    document.getElementById('pj-cuerpo').hidden = true;
}

function mostrarFalloCarga(err) {
    const box = document.getElementById('pj-fallo');
    if (!box) return;
    box.hidden = false;
    box.querySelector('[data-detalle]').textContent = err?.message ?? String(err);
    document.getElementById('pj-cuerpo').hidden = true;
    box.querySelector('[data-reintentar]')?.addEventListener('click', () => location.reload(), { once: true });
}
