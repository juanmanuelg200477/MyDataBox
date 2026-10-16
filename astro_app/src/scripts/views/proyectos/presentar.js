// ════════════════════════════════════════════════════════════════
//  PROYECTOS — modo presentación a pantalla completa
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { toastError } from '../../toast.js';
import { escapeHtml as esc } from '../../utils.js';
import { colorDeEstado } from '../../projectsStore.js';
import { soltarVisor, mostrarArchivo, descargar } from '../projectViewer.js';
import { I, fechaCorta, monto } from './formato.js';
import { archivoVisto, st } from './estado.js';
import { visibles } from './lista.js';
import { documentosHtml, contextoHtml } from './tarjeta.js';
import { cerrarCapas, esLaDeArriba, desapilar, abrirGrande, apilar } from './ventanas.js';

// ── Modo presentación: un proyecto por pantalla ─────────────────
export function presentar(inicio) {
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
