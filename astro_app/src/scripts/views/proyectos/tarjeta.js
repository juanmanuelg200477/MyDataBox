// ════════════════════════════════════════════════════════════════
//  PROYECTOS — la tarjeta de un proyecto: documentos y contexto
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { escapeHtml as esc } from '../../utils.js';
import { colorDeEstado, tipoDe } from '../../projectsStore.js';
import { soltarVisor } from '../projectViewer.js';
import { I, fechaCorta, fechaHora, haceCuanto, monto, tamano, iconoTipo, textoBonito } from './formato.js';
import { tarjeta, st, archivoVisto } from './estado.js';
import { miniHtml } from './lista.js';

export function repintarTarjeta(p) {
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

export function tarjetaHtml(p) {
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

export function documentosHtml(p, { lectura = false } = {}) {
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

export function contextoHtml(p, { lectura = false } = {}) {
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

export function pintarContexto(card, p) {
    card.querySelector('.pj-ctx').innerHTML = contextoHtml(p);
}
