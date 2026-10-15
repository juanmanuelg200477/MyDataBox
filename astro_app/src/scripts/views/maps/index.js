// ════════════════════════════════════════════════════════════════
//  MAPAS Y RUTAS — entrada del módulo
//
//  La lista y el editor viven en la misma página (/mapas). Lo que se ve
//  queda en el hash, como en Dispositivos, para que "atrás" funcione:
//    #mapas       → lista
//    #papelera    → lista, en la papelera
//    #mapa=<id>   → el editor de ese mapa
//  Con el hash, el ClientRouter de Astro resuelve atrás/adelante dentro
//  de la página, sin volver a pedirla.
// ════════════════════════════════════════════════════════════════
import { navigate } from 'astro:transitions/client';
import { load } from '../../store.js';
import { abrirLista, cerrarLista, cambiarPestana } from './lista.js';
import { abrirEditor, cerrarEditor, intentarHorizontal } from './editor.js';
import { cerrarDialogos } from './ui.js';

const RUTA = '/mapas';

let actual = '';          // hash de lo que se está mostrando
let vista = null;         // 'lista' | 'mapa'
let sincronizado = false; // el primer paso de cada carga reemplaza la entrada
let enlazado = false;

const raiz = () => document.getElementById('mp-raiz');
const enMapas = () => window.location.pathname.replace(/\/$/, '') === RUTA;

export async function initMapas() {
    const r = raiz();
    if (!r) return;
    actual = '';
    vista = null;
    sincronizado = false;
    if (!enlazado) {
        enlazado = true;
        // window y document sobreviven a las view transitions: se enlazan una vez
        window.addEventListener('popstate', alHistorial);
        document.addEventListener('astro:before-swap', limpiar);
    }
    r.innerHTML = '<div class="db-loading mp-cargando-ini"><div class="db-spinner"></div><span>Cargando…</span></div>';
    await load();
    if (raiz() !== r) return;   // se fue a otra página mientras cargaba
    aplicar(leerRuta(), { reemplazar: true });
}

function limpiar() {
    cerrarDialogos();
    document.querySelector('.mp-menu-pop')?.remove();
    cerrarEditor();
    cerrarLista();
    vista = null;
    actual = '';
}

function leerRuta() {
    const h = window.location.hash.replace(/^#/, '');
    if (h.startsWith('mapa=')) {
        let id = h.slice(5);
        try { id = decodeURIComponent(id); } catch { /* se usa tal cual */ }
        if (id) return { vista: 'mapa', id };
    }
    return { vista: 'lista', pestana: h === 'papelera' ? 'papelera' : 'mapas' };
}

const hashDe = (ruta) => ruta.vista === 'mapa'
    ? `#mapa=${encodeURIComponent(ruta.id)}`
    : ruta.pestana === 'papelera' ? '#papelera' : '#mapas';

function escribirUrl(ruta, { reemplazar = false, estado } = {}) {
    const hash = hashDe(ruta);
    const reemplaza = reemplazar || !sincronizado;
    sincronizado = true;
    if (window.location.hash === hash) return;
    const url = window.location.pathname + window.location.search + hash;
    // Una entrada creada a mano (el hash escrito en la barra de direcciones)
    // no trae el estado del router de Astro, y su navigate() falla al
    // reemplazarla: se le pone uno antes.
    if (!window.history.state) {
        const st = { ...estado, index: 0, scrollX: 0, scrollY: 0 };
        if (reemplaza) { window.history.replaceState(st, '', url); return; }
        window.history.replaceState(st, '');
    }
    navigate(url, { history: reemplaza ? 'replace' : 'push', state: estado });
}

function aplicar(ruta, { historial = false, reemplazar = false, estado } = {}) {
    const r = raiz();
    if (!r) return;
    // Antes de tocar la URL: Astro avisa el cambio de hash con un popstate
    // propio, y así se reconoce como lo que ya se está mostrando.
    actual = hashDe(ruta);
    if (!historial) escribirUrl(ruta, { reemplazar, estado });

    if (ruta.vista === 'mapa') {
        cerrarLista();
        vista = 'mapa';
        abrirEditor(r, ruta.id, { alVolver: volver });
        return;
    }
    if (vista === 'lista') {
        cambiarPestana(ruta.pestana);
        return;
    }
    cerrarEditor();
    vista = 'lista';
    abrirLista(r, {
        pestana: ruta.pestana,
        alAbrirMapa: (id) => {
            // Todavía dentro del toque del usuario: única forma de que el
            // teléfono acepte pantalla completa y girar
            intentarHorizontal(r);
            aplicar({ vista: 'mapa', id }, { estado: { mpDesdeLista: true } });
        },
        alCambiarPestana: (pestana) => {
            const destino = { vista: 'lista', pestana };
            actual = hashDe(destino);
            escribirUrl(destino);
        }
    });
}

// Si al mapa se llegó desde la lista, volver es ir atrás en el historial;
// si se abrió directo (enlace o recarga), la lista ocupa su lugar.
function volver() {
    if (window.history.state?.mpDesdeLista) window.history.back();
    else aplicar({ vista: 'lista', pestana: 'mapas' }, { reemplazar: true });
}

function alHistorial() {
    if (!raiz() || !enMapas()) return;
    const ruta = leerRuta();
    if (hashDe(ruta) === actual) return;
    aplicar(ruta, { historial: true });
}
