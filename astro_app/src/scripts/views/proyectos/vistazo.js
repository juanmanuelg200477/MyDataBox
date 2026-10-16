// ════════════════════════════════════════════════════════════════
//  PROYECTOS — vistazo del contexto en la vista minimizada
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { escapeHtml as esc } from '../../utils.js';
import { colorDeEstado } from '../../projectsStore.js';
import { I, haceCuanto, textoBonito } from './formato.js';
import { escuchar, st, proyecto } from './estado.js';

// ── Vistazo del contexto al pasar el cursor por una miniatura ────
// Solo en PC: con el dedo no hay "encima", y tocar ya abre la ficha.
export let tVistazo = 0;

export function conectarVistazo(lista) {
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

export function ocultarVistazo() {
    clearTimeout(tVistazo);
    document.getElementById('pj-vistazo')?.classList.remove('visible');
}
