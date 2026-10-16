// ════════════════════════════════════════════════════════════════
//  PROYECTOS — ventanas apiladas: documento en grande y ficha
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { toastError } from '../../toast.js';
import { escapeHtml as esc } from '../../utils.js';
import { tipoDe } from '../../projectsStore.js';
import { mostrarArchivo, soltarVisor, descargar, urlDe } from '../projectViewer.js';
import { I } from './formato.js';
import { st, archivoVisto, tarjeta } from './estado.js';
import { conectarLista, pintarLista } from './lista.js';
import { ocultarVistazo } from './vistazo.js';
import { tarjetaHtml } from './tarjeta.js';

// ── Capas: ver en grande, ficha y presentación ──────────────────
// Pueden abrirse unas encima de otras (ver en grande desde la ficha o desde
// la presentación). Se apilan: Escape y las flechas son siempre de la de
// arriba, y al salir de la página se cierran todas.
const capas = [];

export function apilar(capa, cerrar) {
    capas.push({ capa, cerrar });
    document.body.style.overflow = 'hidden';
}

export function desapilar(capa) {
    const i = capas.findIndex(c => c.capa === capa);
    if (i >= 0) capas.splice(i, 1);
    if (!capas.length) document.body.style.overflow = '';
}

// Los diálogos de confirmar y los formularios van por encima de cualquier capa
export const esLaDeArriba = (capa) =>
    capas[capas.length - 1]?.capa === capa && !document.querySelector('.pj-dialogo, .form-overlay');

export function cerrarCapas() {
    [...capas].reverse().forEach(c => c.cerrar());
    capas.length = 0;
}

export function abrirGrande(p, archivo) {
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
export function abrirFicha(p) {
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
export function cerrarFichaDe(id) {
    const ficha = tarjeta(id)?.closest('.pj-ficha');
    capas.find(c => c.capa === ficha)?.cerrar();
}
