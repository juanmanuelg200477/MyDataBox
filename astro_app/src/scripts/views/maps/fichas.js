// ════════════════════════════════════════════════════════════════
//  VISTAS PREVIAS DEL MAPA
//  Lo que aparece al tocar algo en el mapa. Todo se lee del inventario
//  (dispositivos y bastidores) o del catálogo de infraestructura: aquí
//  no se edita nada, salvo el metraje de un tramo y la foto de un
//  bastidor.
// ════════════════════════════════════════════════════════════════
import { store } from '../../store.js';
import { rackLayout, spanOf, rangeLabel } from '../../rackLayout.js';
import { estiloDispositivo, ESTILO_BASTIDOR, estiloColor, icono3d } from './iconos.js';
import { tipoInfra, ESTILOS_LINEA, GROSORES } from './catalogo.js';
import { esc, metros, I } from './ui.js';

// Dispositivos sueltos y montados en bastidores, por su id real
export function indiceDispositivos() {
    const porId = new Map();
    for (const d of store.devices) porId.set(String(d.id), { dev: d, rack: null, unidad: null });
    for (const r of store.racks) {
        for (const [u, d] of Object.entries(r.slots ?? {})) {
            porId.set(String(d.id), { dev: d, rack: r, unidad: u });
        }
    }
    return porId;
}

const nombreRegion = (id) => store.regions.find(r => r.id === id)?.name ?? '';
const nombreArea = (id) => store.areas.find(a => a.id === id)?.name ?? '';

// Datos que se enseñan por campo. Las contraseñas y usuarios no salen
// en el mapa: es una vista para mostrar, no la ficha de credenciales.
const ETIQUETAS = [
    ['brand', 'Marca'], ['model', 'Modelo'], ['serial', 'Serie'], ['ip', 'IP'], ['mac', 'MAC'],
    ['resolution', 'Resolución'], ['cameraType', 'Tipo de cámara'], ['nvr', 'NVR'], ['channel', 'Canal'],
    ['swPort', 'Puerto de switch'], ['channels', 'Canales'], ['disks', 'Discos'], ['outPort', 'Puerto de salida'],
    ['ports', 'Puertos'], ['fiberPorts', 'Puertos de fibra'], ['powerSources', 'Fuentes de poder'],
    ['speed', 'Velocidad'], ['port', 'Puerto'], ['towards', 'Hacia'],
    ['ssid', 'Redes (SSID)'], ['vlan', 'VLAN'],
    ['mask', 'Máscara'], ['gateway', 'Puerta de enlace'], ['dns', 'DNS'], ['server', 'Servidor'],
    ['kva', 'Capacidad (KVA)'], ['changeDate', 'Último cambio'], ['categoryUTP', 'Categoría UTP'],
    ['quantity', 'Cantidad'], ['cantidad', 'Cantidad'], ['input', 'Entrada'], ['output', 'Salida'],
    ['medida', 'Medida'], ['rackNode', 'Rack / nodo'], ['maintenance', 'Mantenimiento'],
    ['description', 'Descripción'], ['comment', 'Comentario']
];
const MONO = new Set(['ip', 'mac', 'serial', 'mask', 'gateway', 'dns', 'server', 'swPort', 'port']);

function filas(pares) {
    const llenas = pares.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!llenas.length) return '';
    return `<div class="mp-grupo">${llenas.map(([k, v, mono]) =>
        `<div class="mp-fila"><span>${esc(k)}</span><b class="${mono ? 'mono' : ''}">${esc(v)}</b></div>`).join('')}</div>`;
}

const claseEstado = (s) =>
    ['Up', 'Online', 'Activo', 'Disponible', 'Nuevo'].includes(s) ? 'ok'
        : ['Down', 'Falla', 'Inactivo', 'Desuso'].includes(s) ? 'mal' : 'aviso';

const chipEstado = (s) => (s ? `<span class="mp-estado ${claseEstado(s)}">${esc(s)}</span>` : '');

function cabecera(estilo, tipo, nombre, extra = '') {
    return `<div class="mp-hoja-cab">
        ${icono3d(estilo, { tam: 54 })}
        <div class="mp-hoja-tit">
            <span class="mp-hoja-tipo">${esc(tipo)}</span>
            <h3>${esc(nombre)}</h3>
            ${extra}
        </div>
    </div>`;
}

// ── Dispositivo ─────────────────────────────────────────────────
export function fichaDispositivo(entrada, { editable }) {
    if (!entrada) return fichaPerdida('dispositivo', editable);
    const { dev, rack, unidad } = entrada;
    const est = estiloDispositivo(dev);
    const enlace = rack
        ? `/device?id=${encodeURIComponent(`rack_${rack.id}_${unidad}`)}`
        : /nvr/i.test(dev.device ?? '') ? `/nvr?id=${encodeURIComponent(dev.id)}` : `/device?id=${encodeURIComponent(dev.id)}`;
    const datos = ETIQUETAS.map(([k, etq]) => [etq, dev[k], MONO.has(k)]);
    const lugar = [['Región', nombreRegion(dev.regionId)], ['Área', dev.area]];
    return `${cabecera(est, dev.device || est.etiqueta, dev.name, chipEstado(dev.status))}
        ${rack ? `<div class="mp-aviso-hoja">${I.flecha}Montado en el bastidor <b>${esc(rack.name)}</b>, ${esc(unidad)}U</div>` : ''}
        ${filas(lugar)}
        ${filas(datos)}
        <div class="mp-hoja-acc">
            <a class="mp-btn mp-btn-suave" href="${enlace}" target="_blank" rel="noopener">${I.externo}Abrir su ficha</a>
            ${editable ? `<button type="button" class="mp-btn mp-btn-peligro-suave" data-acc="quitar">${I.basura}Quitar del mapa</button>` : ''}
        </div>`;
}

// ── Bastidor: foto real y lo que tiene dentro ───────────────────
export function fichaBastidor(rack, { editable, fotoUrl = null, subiendo = false, cargandoFoto = false }) {
    if (!rack) return fichaPerdida('bastidor', editable);
    const layout = rackLayout(rack);
    const usadas = layout.items.reduce((s, it) => s + spanOf(it), 0);
    const pct = Math.round((usadas / layout.total) * 100);
    const equipos = [...layout.items].sort((a, b) => b.top - a.top);

    const foto = cargandoFoto
        ? '<div class="mp-foto mp-foto-cargando" role="img" aria-label="Cargando la foto del bastidor"></div>'
        : fotoUrl
        ? `<figure class="mp-foto">
                <button type="button" class="mp-foto-ver" data-acc="foto-ver" aria-label="Ver la foto completa de ${esc(rack.name)}">
                    <img src="${esc(fotoUrl)}" alt="Foto del bastidor ${esc(rack.name)}" loading="lazy">
                    <span class="mp-foto-lupa">${I.expandir}Ver completa</span>
                </button>
                ${editable ? `<div class="mp-foto-acc">
                    <button type="button" class="mp-btn-mini" data-acc="foto">${I.camara}Cambiar</button>
                    <button type="button" class="mp-btn-mini peligro" data-acc="foto-quitar">${I.basura}Quitar</button>
                </div>` : ''}
           </figure>`
        : editable
            ? `<button type="button" class="mp-foto-vacia" data-acc="foto" ${subiendo ? 'disabled' : ''}>
                    ${I.camara}<b>${subiendo ? 'Subiendo foto…' : 'Agregar foto del bastidor'}</b>
                    <small>Para ver cómo es en la vida real</small>
               </button>`
            : '';

    const lista = equipos.length
        ? `<div class="mp-equipos">${equipos.map(it => {
            const d = it.dev;
            const est = estiloDispositivo(d);
            const sub = [d.model, d.serial ? `S/N ${d.serial}` : ''].filter(Boolean).join(' · ');
            return `<div class="mp-equipo">
                <span class="mp-equipo-u">${rangeLabel(it.base, spanOf(it))}</span>
                ${icono3d(est, { tam: 30 })}
                <div class="mp-equipo-txt">
                    <b>${esc(d.name)}</b>
                    <small>${esc(d.device ?? '')}${sub ? ` · <span class="mono">${esc(sub)}</span>` : ''}</small>
                    ${d.description ? `<small class="mp-equipo-desc">${esc(d.description)}</small>` : ''}
                </div>
            </div>`;
        }).join('')}</div>`
        : `<p class="mp-hoja-vacio">Este bastidor todavía no tiene equipos montados.</p>`;

    return `${cabecera(ESTILO_BASTIDOR, 'Bastidor', rack.name, chipEstado(rack.status))}
        ${foto}
        ${filas([['Región', nombreRegion(rack.regionId)], ['Área', nombreArea(rack.areaId)], ['Tipo', rack.type], ['Descripción', rack.description]])}
        <div class="mp-ocupacion">
            <div><span>Ocupación</span><b>${usadas} de ${layout.total} U · ${pct}%</b></div>
            <div class="mp-barra-uso"><i style="width:${pct}%"></i></div>
        </div>
        <div class="mp-seccion-tit">Contenido <span>${equipos.length} ${equipos.length === 1 ? 'equipo' : 'equipos'}</span></div>
        ${lista}
        <div class="mp-hoja-acc">
            <a class="mp-btn mp-btn-suave" href="/rack?id=${encodeURIComponent(rack.id)}" target="_blank" rel="noopener">${I.externo}Abrir bastidor</a>
            ${editable ? `<button type="button" class="mp-btn mp-btn-peligro-suave" data-acc="quitar">${I.basura}Quitar del mapa</button>` : ''}
        </div>`;
}

// ── Infraestructura (punto o tramo) ─────────────────────────────
export function resumenSpecs(elemento) {
    const tipo = tipoInfra(elemento.kind);
    if (!tipo) return '';
    return tipo.campos.filter(c => c.id !== 'notas' && elemento.specs?.[c.id])
        .slice(0, 3).map(c => elemento.specs[c.id]).join(' · ');
}

export function fichaInfra(elemento, { editable, tramo = null }) {
    if (!elemento) return fichaPerdida('elemento', editable);
    const tipo = tipoInfra(elemento.kind);
    const est = estiloColor(elemento.color, tipo?.glifo);
    const specs = (tipo?.campos ?? []).map(c => [c.etiqueta, elemento.specs?.[c.id]]);
    const linea = tipo?.forma === 'linea'
        ? [['Estilo de línea', ESTILOS_LINEA.find(e => e.id === (elemento.specs?.estilo ?? tipo.estilo ?? 'solida'))?.nombre],
           ['Grosor', GROSORES.find(g => g.id === Number(elemento.specs?.grosor ?? 5))?.nombre]]
        : [];

    const metraje = tramo
        ? `<div class="mp-metraje">
                <div class="mp-metraje-tit">${I.regla}Metraje de este tramo</div>
                ${editable
                    ? `<div class="mp-metraje-campo">
                            <input type="text" inputmode="decimal" autocomplete="off" maxlength="14" data-campo="metraje"
                                   value="${tramo.lengthM ?? ''}" placeholder="Sin medir" aria-label="Metraje en metros">
                            <span>m</span>
                            <button type="button" class="mp-btn mp-btn-primario" data-acc="metraje">Guardar</button>
                       </div>
                       <small>Lo que mide este tramo; cada tramo lleva el suyo.</small>`
                    : `<b class="mp-metraje-valor">${tramo.lengthM != null ? metros(tramo.lengthM) : 'Sin medir'}</b>`}
           </div>`
        : '';

    return `${cabecera(est, tipo?.nombre ?? 'Infraestructura', elemento.name,
            `<span class="mp-color-chip" style="--c:${esc(elemento.color ?? '#64748b')}"></span>`)}
        ${metraje}
        ${filas(specs)}
        ${filas(linea)}
        <p class="mp-hoja-nota">Los datos del elemento se editan en la pestaña Infraestructura y cambian en todos los mapas.</p>
        ${editable ? `<div class="mp-hoja-acc">
            <button type="button" class="mp-btn mp-btn-peligro-suave" data-acc="quitar">${I.basura}Quitar del mapa</button>
        </div>` : ''}`;
}

function fichaPerdida(que, editable) {
    return `<div class="mp-hoja-cab">
            <span class="ic3d" style="--c1:#cbd5e1;--c2:#475569;--tam:54px">${I.x}</span>
            <div class="mp-hoja-tit"><span class="mp-hoja-tipo">Ya no existe</span><h3>Este ${que} se eliminó</h3></div>
        </div>
        <p class="mp-hoja-vacio">Se borró del inventario o del catálogo después de ponerlo en el mapa.</p>
        ${editable ? `<div class="mp-hoja-acc"><button type="button" class="mp-btn mp-btn-peligro-suave" data-acc="quitar">${I.basura}Quitar del mapa</button></div>` : ''}`;
}
