// ════════════════════════════════════════════════════════════════
//  PROYECTOS — vista
//
//  Cada proyecto es una tarjeta grande: a la izquierda sus documentos
//  (con vista previa) y a la derecha el contexto, para que al verlo se
//  recuerde de qué va y en qué está. Arriba, el resumen; y un modo
//  presentación para enseñarlos uno a uno en pantalla completa.
//
//  Este archivo arranca y limpia la vista. El resto vive en
//  ./proyectos/: formato, estado, lista y miniaturas, vistazo, tarjeta,
//  documentos y contexto, formulario, ventanas y presentación.
// ════════════════════════════════════════════════════════════════
import { loadProjects, SinPreparar } from '../projectsStore.js';
import { mostrarArchivo, soltarVisor, liberarUrls } from './projectViewer.js';
import { fijarEstado, vistaGuardada, st, proyecto, archivoVisto } from './proyectos/estado.js';
import { conectarControles, pintarBotonVista, pintarTodo } from './proyectos/lista.js';
import { tVistazo } from './proyectos/vistazo.js';
import { cerrarCapas } from './proyectos/ventanas.js';

export async function initProjects() {
    limpiar();
    const wrap = document.getElementById('pj-wrap');
    if (!wrap) return;

    fijarEstado({
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
    });

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
    fijarEstado(null);   // desde aquí nada vuelve a pintar (la ficha repinta al cerrarse)
    cerrarCapas();
    viejo.io.disconnect();
    document.querySelectorAll('#pj-lista [data-visor]').forEach(soltarVisor);
    viejo.escuchas.forEach(([obj, ev, fn, op]) => obj.removeEventListener(ev, fn, op));
    clearTimeout(tVistazo);
    document.getElementById('pj-vistazo')?.remove();
    liberarUrls();
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
