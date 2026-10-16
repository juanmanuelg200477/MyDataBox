// ════════════════════════════════════════════════════════════════
//  PROYECTOS — controles, resumen, filtros, lista y miniaturas
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { isViewer } from '../../store.js';
import { toastError } from '../../toast.js';
import { escapeHtml as esc, renderPager } from '../../utils.js';
import { ESTADOS, colorDeEstado } from '../../projectsStore.js';
import { descargar, soltarVisor } from '../projectViewer.js';
import { montoCorto, monto, sinAcentos, I } from './formato.js';
import { st, guardarVista, escuchar, proyecto, archivoVisto } from './estado.js';
import { conectarVistazo, ocultarVistazo } from './vistazo.js';
import { pintarContexto, tarjetaHtml } from './tarjeta.js';
import { subirArchivos, verArchivo, borrarArchivo, elegirArchivos, editarContexto, borrarContexto, guardarContexto, ponerGuia } from './contenido.js';
import { formularioProyecto, eliminarProyecto } from './formulario.js';
import { abrirFicha, abrirGrande } from './ventanas.js';
import { presentar } from './presentar.js';

// ── Controles fijos (barra de herramientas) ─────────────────────
export function conectarControles() {
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
export function conectarLista(el) {
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
export function pintarTodo() {
    pintarResumen();
    pintarFiltros();
    pintarLista();
}

export function pintarResumen() {
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

export function pintarFiltros() {
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

export function visibles() {
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

export function pintarLista() {
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
export const POR_PAGINA = 15;

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

export function miniHtml(p) {
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

export function pintarBotonVista() {
    const b = document.getElementById('pj-vista');
    if (!b || !st) return;
    const mini = st.vista === 'mini';
    b.innerHTML = mini ? `${I.maximizar}<span>Expandir todo</span>` : `${I.minimizar}<span>Minimizar todo</span>`;
    b.setAttribute('aria-pressed', String(mini));
    b.title = mini
        ? 'Ver cada proyecto completo, con su documento y su contexto'
        : 'Ver solo los nombres, para encontrar un proyecto más rápido';
}
