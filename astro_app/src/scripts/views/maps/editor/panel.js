// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — panel de objetos
//  Pestañas Dispositivos e Infraestructura, grupos, búsqueda y filtros.
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { store } from '../../../store.js';
import { ESTILO_BASTIDOR, estiloDispositivo, icono3d, estiloColor } from '../iconos.js';
import { TIPOS_INFRA, tipoInfra } from '../catalogo.js';
import { sinAcentos, I, esc, metros } from '../ui.js';
import { resumenSpecs } from '../fichas.js';
import { E, panelFijo } from './estado.js';
import { nombreArea } from './datos.js';
import { centrarEn } from './vista.js';
import { seleccionar } from './eventos.js';
import { cancelarModo, empezarTrazo, empezarColocar } from './colocar.js';
import { crearElemento, formularioElemento, borrarElemento } from './elementos.js';

export let tBusca = 0;

// ── Panel: objetos del inventario ───────────────────────────────
export function objetos() {
    const lista = [];
    for (const r of store.racks) {
        const area = nombreArea(r.areaId);
        lista.push({
            kind: 'rack', id: String(r.id), nombre: r.name, tipo: 'Bastidores', area: area || 'Sin área',
            sub: [`${parseInt(r.height, 10) || 42}U`, area].filter(Boolean).join(' · '), estilo: ESTILO_BASTIDOR,
            buscar: sinAcentos(`${r.name} ${area} bastidor rack ${r.type ?? ''}`)
        });
    }
    for (const d of store.devices) {
        lista.push({
            kind: 'device', id: String(d.id), nombre: d.name || 'Sin nombre', tipo: d.device || 'Sin tipo', area: d.area || 'Sin área',
            sub: [d.ip, d.area].filter(Boolean).join(' · ') || d.model || '', estilo: estiloDispositivo(d),
            buscar: sinAcentos(`${d.name} ${d.device} ${d.ip} ${d.mac} ${d.serial} ${d.model} ${d.brand} ${d.area}`)
        });
    }
    return lista;
}

const clavesPuestas = () => new Set(E.items.filter(i => i.kind === 'device' || i.kind === 'rack').map(i => `${i.kind}:${i.refId}`));

export function pintarPanel() {
    if (!E?.ed) return;
    const cuerpo = E.raiz.querySelector('#mp-panel-cuerpo');
    E.raiz.querySelectorAll('#mp-panel .mp-panel-tabs [data-tab]').forEach(b => {
        b.classList.toggle('activo', b.dataset.tab === E.tab);
        b.setAttribute('aria-selected', b.dataset.tab === E.tab);
    });
    // Se conserva el scroll de la lista y el foco del buscador
    const lista = cuerpo.querySelector('.mp-pan-lista');
    const arriba = lista?.dataset.de === E.tab ? lista.scrollTop : 0;
    const activo = document.activeElement;
    const foco = activo?.matches?.('#mp-panel input') ? activo.id : '';
    const cursor = foco ? activo.selectionStart : null;
    cuerpo.innerHTML = E.tab === 'dispositivos' ? panelDispositivos() : panelInfra();
    const nueva = cuerpo.querySelector('.mp-pan-lista');
    if (nueva) nueva.scrollTop = arriba;
    if (foco) {
        const el = cuerpo.querySelector(`#${foco}`);
        el?.focus();
        if (el && cursor != null) try { el.setSelectionRange(cursor, cursor); } catch { /* no es de texto */ }
    }
}

// Solo la lista (al buscar o abrir un grupo): no toca el buscador
function pintarLista() {
    const lista = E.raiz.querySelector('.mp-pan-lista');
    if (!lista) return;
    const arriba = lista.scrollTop;
    lista.innerHTML = E.tab === 'dispositivos' ? listaDispositivos() : listaInfra();
    lista.scrollTop = arriba;
}

function tiposDe(todos) {
    return [...new Set(todos.map(o => o.tipo))]
        .sort((a, b) => (a === 'Bastidores' ? -1 : b === 'Bastidores' ? 1 : a.localeCompare(b, 'es')));
}

function panelDispositivos() {
    const todos = objetos();
    const tipos = tiposDe(todos);
    if (E.filtroTipo && !tipos.includes(E.filtroTipo)) E.filtroTipo = '';
    return `<div class="mp-pan-cab">
            <span>OBJETOS <b>(${todos.length})</b></span>
            <div class="mp-seg mp-seg-mini">
                <button type="button" data-agrupar="tipo" class="${E.agrupar === 'tipo' ? 'activo' : ''}">Por tipo</button>
                <button type="button" data-agrupar="area" class="${E.agrupar === 'area' ? 'activo' : ''}">Por área</button>
            </div>
        </div>
        <label class="mp-pan-buscar">${I.buscar}<input type="search" id="mp-buscar-obj" value="${esc(E.busqueda)}" placeholder="Buscar por nombre, IP o serie…" autocomplete="off" aria-label="Buscar objetos"></label>
        ${tipos.length > 1 ? `<div class="mp-pan-chips">
            <button type="button" data-filtro="" class="${!E.filtroTipo ? 'activo' : ''}">Todos</button>
            ${tipos.map(t => `<button type="button" data-filtro="${esc(t)}" class="${E.filtroTipo === t ? 'activo' : ''}">${esc(t)}</button>`).join('')}
        </div>` : ''}
        ${!E.mapa.imagePath && E.editable ? `<p class="mp-pan-nota">${I.imagen}Sube la imagen del mapa para empezar a ubicar.</p>` : ''}
        <div class="mp-pan-titulo">${E.agrupar === 'tipo' ? 'GRUPOS' : 'ÁREAS'}</div>
        <div class="mp-pan-lista" data-de="dispositivos">${listaDispositivos(todos, tipos)}</div>`;
}

function listaDispositivos(todos = objetos(), tipos = tiposDe(todos)) {
    const q = sinAcentos(E.busqueda.trim());
    const clave = E.agrupar === 'tipo' ? 'tipo' : 'area';
    const grupos = new Map();
    for (const o of todos) {
        if (E.filtroTipo && o.tipo !== E.filtroTipo) continue;
        if (q && !o.buscar.includes(q)) continue;
        if (!grupos.has(o[clave])) grupos.set(o[clave], []);
        grupos.get(o[clave]).push(o);
    }
    if (!grupos.size) {
        return `<p class="mp-pan-vacio">${todos.length ? 'Nada coincide con la búsqueda.' : 'Aún no hay dispositivos ni bastidores en el inventario. Créalos en sus módulos y aparecerán aquí.'}</p>`;
    }
    const orden = [...grupos.keys()].sort((a, b) => clave === 'tipo'
        ? tipos.indexOf(a) - tipos.indexOf(b)
        : (a === 'Sin área') - (b === 'Sin área') || a.localeCompare(b, 'es'));
    const puestas = clavesPuestas();
    return orden.map(g => {
        const lista = grupos.get(g);
        const n = lista.filter(o => puestas.has(`${o.kind}:${o.id}`)).length;
        const abierto = Boolean(q) || Boolean(E.filtroTipo) || grupos.size === 1 || E.abiertos.has(`${clave}:${g}`);
        return `<div class="mp-grupo-l ${abierto ? 'abierto' : ''}">
            <button type="button" class="mp-grupo-cab" data-grupo="${esc(`${clave}:${g}`)}" aria-expanded="${abierto}">
                <span class="mp-grupo-flecha">${I.flecha}</span>
                <span class="mp-grupo-nombre">${esc(g)} <i>(${lista.length})</i></span>
                ${n ? `<span class="mp-grupo-en" title="${n} en este mapa">${I.pin}${n}</span>` : ''}
            </button>
            ${abierto ? `<div class="mp-grupo-items">${lista.map(o => filaObjeto(o, puestas)).join('')}</div>` : ''}
        </div>`;
    }).join('');
}

function filaObjeto(o, puestas) {
    const puesto = puestas.has(`${o.kind}:${o.id}`);
    const activo = E.modo?.tipo === 'colocar' && E.modo.obj.kind === o.kind && E.modo.obj.id === o.id;
    const arrastrable = E.editable && !puesto && E.listo;
    const ayuda = puesto ? 'Ya está en el mapa: tócalo para verlo' : E.editable ? 'Tócalo y luego toca el mapa, o arrástralo' : '';
    return `<div class="mp-obj ${puesto ? 'puesto' : ''} ${activo ? 'activo' : ''}" data-kind="${o.kind}" data-id="${esc(o.id)}"
            draggable="${arrastrable ? 'true' : 'false'}" role="button" tabindex="0" title="${ayuda}">
        ${icono3d(o.estilo, { tam: 30 })}
        <span class="mp-obj-txt"><b>${esc(o.nombre)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>
        ${puesto ? `<span class="mp-obj-pin" aria-label="En el mapa">${I.pin}</span>` : ''}
    </div>`;
}

// ── Panel: infraestructura ──────────────────────────────────────
function panelInfra() {
    const n = E.infra.length;
    if (!n) {
        return `<div class="mp-infra-vacio">
            <div class="mp-infra-vacio-iconos">${TIPOS_INFRA.filter((_, i) => i % 3 === 0).map(t => icono3d(estiloColor(t.color, t.glifo), { tam: 34 })).join('')}</div>
            <h4>Crea tu primer elemento de infraestructura</h4>
            <p>Fibra óptica, UTP, mufas, postes, pozos y más. Se crean una vez con sus datos y luego los usas en este mapa o en cualquier otro, las veces que quieras.</p>
            ${E.editable ? `<button type="button" class="mp-btn mp-btn-primario" data-acc="crear-elemento">${I.mas}Crear elemento</button>` : ''}
        </div>`;
    }
    return `<div class="mp-pan-cab">
            <span>MIS ELEMENTOS <b>(${n})</b></span>
            ${E.editable ? `<button type="button" class="mp-btn-mini" data-acc="crear-elemento">${I.mas}Nuevo</button>` : ''}
        </div>
        ${n > 5 ? `<label class="mp-pan-buscar">${I.buscar}<input type="search" id="mp-buscar-infra" value="${esc(E.busquedaInfra)}" placeholder="Buscar elemento…" autocomplete="off" aria-label="Buscar elementos"></label>` : ''}
        <p class="mp-pan-ayuda">${E.editable
            ? 'Toca un elemento para usarlo: los cables se dibujan punto a punto y lo demás se coloca con un toque.'
            : 'Elementos de infraestructura del catálogo.'}</p>
        <div class="mp-pan-lista" data-de="infra">${listaInfra()}</div>`;
}

function listaInfra() {
    const q = E.infra.length > 5 ? sinAcentos(E.busquedaInfra.trim()) : '';
    const usos = new Map();
    for (const it of E.items) {
        if (it.kind !== 'infra_point' && it.kind !== 'infra_line') continue;
        const u = usos.get(it.refId) ?? { n: 0, m: 0 };
        u.n++;
        u.m += it.lengthM ?? 0;
        usos.set(it.refId, u);
    }
    const usando = E.modo?.tipo === 'trazar' ? E.modo.elemento.id : E.modo?.obj?.kind === 'infra_point' ? E.modo.obj.id : null;
    const grupos = TIPOS_INFRA.map(t => ({
        t,
        els: E.infra.filter(el => el.kind === t.kind
            && (!q || sinAcentos(`${el.name} ${t.nombre} ${Object.values(el.specs ?? {}).join(' ')}`).includes(q)))
    })).filter(x => x.els.length);
    if (!grupos.length) return '<p class="mp-pan-vacio">Nada coincide con la búsqueda.</p>';
    return grupos.map(({ t, els }) => `<div class="mp-grupo-l abierto">
        <div class="mp-grupo-cab fijo">${icono3d(estiloColor(t.color, t.glifo), { tam: 20 })}<span class="mp-grupo-nombre">${esc(t.nombre)} <i>(${els.length})</i></span></div>
        <div class="mp-grupo-items">${els.map(el => {
            const u = usos.get(el.id);
            const aqui = !u ? '' : t.forma === 'linea'
                ? ` · ${u.n} ${u.n === 1 ? 'tramo' : 'tramos'}${u.m ? `, ${metros(u.m)}` : ''} aquí`
                : ` · ${u.n} aquí`;
            return `<div class="mp-obj mp-obj-infra ${usando === el.id ? 'activo' : ''}" data-infra="${el.id}" role="button" tabindex="0"
                    title="${E.editable ? (t.forma === 'linea' ? 'Tócalo para dibujar un tramo' : 'Tócalo para colocarlo en el mapa') : ''}">
                ${t.forma === 'linea'
                    ? `<span class="mp-muestra-linea ${esc(el.specs?.estilo ?? t.estilo ?? 'solida')}" style="--lc:${esc(el.color || t.color)}"></span>`
                    : icono3d(estiloColor(el.color, t.glifo), { tam: 30 })}
                <span class="mp-obj-txt"><b>${esc(el.name)}</b><small>${esc(resumenSpecs(el) || t.nombre)}${aqui}</small></span>
                ${E.editable ? `<span class="mp-obj-acc">
                    <button type="button" class="mp-ico-btn" data-editar-infra="${el.id}" aria-label="Editar ${esc(el.name)}" title="Editar">${I.lapiz}</button>
                    <button type="button" class="mp-ico-btn peligro" data-borrar-infra="${el.id}" aria-label="Eliminar ${esc(el.name)}" title="Eliminar del catálogo">${I.basura}</button>
                </span>` : ''}
            </div>`;
        }).join('')}</div>
    </div>`).join('');
}

export function alClicPanel(e) {
    if (!E) return;
    const t = e.target;
    const tab = t.closest('.mp-panel-tabs [data-tab]');
    if (tab) { E.tab = tab.dataset.tab; pintarPanel(); return; }
    const ag = t.closest('[data-agrupar]');
    if (ag) { E.agrupar = ag.dataset.agrupar; pintarPanel(); return; }
    const fil = t.closest('[data-filtro]');
    if (fil) { E.filtroTipo = fil.dataset.filtro; pintarPanel(); return; }
    const grupo = t.closest('[data-grupo]');
    if (grupo) {
        const k = grupo.dataset.grupo;
        if (E.abiertos.has(k)) E.abiertos.delete(k); else E.abiertos.add(k);
        pintarLista();
        return;
    }
    if (t.closest('[data-acc="crear-elemento"]')) { crearElemento(); return; }
    const ed = t.closest('[data-editar-infra]');
    if (ed) { formularioElemento(E.infra.find(x => x.id === ed.dataset.editarInfra)); return; }
    const bo = t.closest('[data-borrar-infra]');
    if (bo) { borrarElemento(E.infra.find(x => x.id === bo.dataset.borrarInfra)); return; }

    const inf = t.closest('[data-infra]');
    if (inf) {
        const el = E.infra.find(x => x.id === inf.dataset.infra);
        if (!el || !E.editable) return;
        const tipo = tipoInfra(el.kind);
        if (E.modo && (E.modo.elemento?.id === el.id || E.modo.obj?.id === el.id)) { cancelarModo(); return; }
        if (tipo?.forma === 'linea') empezarTrazo(el);
        else empezarColocar({ kind: 'infra_point', id: el.id, nombre: el.name, estilo: estiloColor(el.color, tipo?.glifo ?? I.pin) });
        return;
    }
    const fila = t.closest('.mp-obj[data-kind]');
    if (fila) {
        const obj = objetos().find(o => o.kind === fila.dataset.kind && o.id === fila.dataset.id);
        if (!obj) return;
        const puesto = E.items.find(i => i.kind === obj.kind && String(i.refId) === obj.id);
        if (puesto) {
            if (!E.listo) return;
            if (!panelFijo()) E.ed.classList.remove('panel-abierto');
            cancelarModo();
            seleccionar(puesto.id);
            centrarEn(puesto);
            return;
        }
        if (!E.editable) return;
        if (E.modo?.tipo === 'colocar' && E.modo.obj.kind === obj.kind && E.modo.obj.id === obj.id) { cancelarModo(); return; }
        empezarColocar(obj);
    }
}

export function alEscribirPanel(e) {
    const id = e.target.id;
    if (id !== 'mp-buscar-obj' && id !== 'mp-buscar-infra') return;
    clearTimeout(tBusca);
    tBusca = setTimeout(() => {
        if (!E) return;
        if (id === 'mp-buscar-obj') E.busqueda = e.target.value;
        else E.busquedaInfra = e.target.value;
        pintarLista();
        const lista = E.raiz.querySelector('.mp-pan-lista');
        if (lista) lista.scrollTop = 0;
    }, 120);
}

export function alTeclaPanel(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.mp-obj[role="button"]')) {
        e.preventDefault();
        e.target.click();
    }
}
