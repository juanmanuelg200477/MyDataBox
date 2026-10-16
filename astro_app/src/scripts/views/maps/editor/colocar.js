// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — colocar objetos y trazar líneas
//  También guarda las marcas movidas y los vértices editados.
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { toastError, showToast, toastSuccess } from '../../../toast.js';
import { updateItem, touchMap, addItem } from '../../../mapsStore.js';
import { icono3d } from '../iconos.js';
import { esc, I, dialogo } from '../ui.js';
import { E, panelFijo } from './estado.js';
import { indiceItems, puntosLinea, elementoPorId } from './datos.js';
import { aMundo, aNorm } from './vista.js';
import { pintarMapa, marcarIman, pintarBorrador, pintarMarcas } from './pintar.js';
import { imanCerca } from './gestos.js';
import { cerrarHoja, leerMetraje } from './hoja.js';
import { pintarPanel, objetos } from './panel.js';

// ── Mover lo que ya está puesto ─────────────────────────────────
export async function guardarMarcaMovida(g) {
    // Los tramos pegados a la marca guardan su nuevo extremo
    const porId = indiceItems();
    const pegados = E.items.filter(i => i.kind === 'infra_line' && (i.ends?.a === g.it.id || i.ends?.b === g.it.id));
    for (const l of pegados) l.points = puntosLinea(l, porId).map(([x, y]) => [x / E.W, y / E.H]);
    pintarMapa();
    try {
        await updateItem(g.it.id, { x: g.it.x, y: g.it.y });
    } catch (err) {
        if (!E) return;
        g.it.x = g.antes.x;
        g.it.y = g.antes.y;
        pintarMapa();
        toastError(err.message, { title: 'No se movió' });
        return;
    }
    // Los tramos siguen a la marca al pintarse; guardar sus puntos es solo
    // para cuando la marca se quite y se queden sueltos.
    pegados.forEach(l => updateItem(l.id, { points: l.points }).catch(err => console.warn('[mapas] tramo:', err.message)));
    if (E) touchMap(E.mapa.id);
}

export async function guardarVertices(g) {
    E.imanId = null;
    pintarMapa();
    try {
        await updateItem(g.it.id, { points: g.it.points, ends: g.it.ends });
        if (E) touchMap(E.mapa.id);
    } catch (err) {
        if (!E) return;
        g.it.points = g.antes.points;
        g.it.ends = g.antes.ends;
        pintarMapa();
        toastError(err.message, { title: 'No se movió el tramo' });
    }
}

// ── Colocar en el mapa ──────────────────────────────────────────
function puedeMapear() {
    if (!E.editable) return false;
    if (!E.mapa.imagePath || !E.listo) {
        toastError('Primero sube la imagen del mapa: es la base para ubicar todo.');
        return false;
    }
    return true;
}

export function empezarColocar(obj) {
    if (!puedeMapear()) return;
    cerrarHoja();
    E.modo = { tipo: 'colocar', obj, varios: obj.kind === 'infra_point', ocupado: false };
    E.fantasma.innerHTML = icono3d(obj.estilo, { tam: obj.kind === 'infra_point' ? 30 : 38 });
    E.fantasma.hidden = true;
    E.ed.classList.remove('trazando');
    E.ed.classList.add('colocando');
    marcarIman(null);
    pintarBorrador();
    pintarAviso();
    if (!panelFijo()) E.ed.classList.remove('panel-abierto');
    pintarPanel();
}

// Tocar el fondo oscuro (fuera del plano) no ubica nada
let ultimoAvisoFuera = 0;
function fueraDelPlano(e) {
    const p = aMundo(e.clientX, e.clientY);
    const margen = 2 / E.vista.z;
    const fuera = p.x < -margen || p.y < -margen || p.x > E.W + margen || p.y > E.H + margen;
    if (fuera && Date.now() - ultimoAvisoFuera > 3000) {
        ultimoAvisoFuera = Date.now();
        showToast('Toca dentro del plano para ubicarlo.', { duration: 2200 });
    }
    return fuera;
}

export async function colocarEn(e, modo) {
    const { obj } = modo;
    if (modo.ocupado && !modo.varios) return;
    if (fueraDelPlano(e)) return;
    if (!modo.varios && E.items.some(i => i.kind === obj.kind && String(i.refId) === obj.id)) {
        if (E.modo === modo) cancelarModo();
        toastError(`«${obj.nombre}» ya está en este mapa.`);
        return;
    }
    const n = aNorm(aMundo(e.clientX, e.clientY));
    modo.ocupado = true;
    try {
        const it = await addItem(E.mapa.id, { kind: obj.kind, refId: obj.id, x: n.x, y: n.y });
        if (!E) return;
        E.items.push(it);
        touchMap(E.mapa.id);
        if (!modo.varios) {
            if (E.modo === modo) cancelarModo();
            toastSuccess(`«${obj.nombre}» ubicado en el mapa.`, { duration: 1800 });
        }
        pintarMapa();
        pintarPanel();
    } catch (err) {
        toastError(err.message);
    } finally {
        modo.ocupado = false;
    }
}

export function alArrastrarObjeto(e) {
    const fila = e.target.closest?.('.mp-obj[draggable="true"]');
    if (!fila) return;
    e.dataTransfer.setData('application/x-mapa', JSON.stringify({ kind: fila.dataset.kind, id: fila.dataset.id }));
    e.dataTransfer.effectAllowed = 'copy';
    const ico = fila.querySelector('.ic3d');
    if (ico) e.dataTransfer.setDragImage(ico, 15, 15);
}

export function alArrastrarEncima(e) {
    if (!E?.listo || !E.editable || !e.dataTransfer?.types?.includes('application/x-mapa')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    E.lienzo.classList.add('soltando');
}

export async function alSoltarObjeto(e) {
    if (!E) return;
    E.lienzo.classList.remove('soltando');
    const crudo = e.dataTransfer?.getData('application/x-mapa');
    if (!crudo) return;
    e.preventDefault();
    let ref;
    try { ref = JSON.parse(crudo); } catch { return; }
    const obj = objetos().find(o => o.kind === ref.kind && o.id === ref.id);
    if (!obj || !puedeMapear()) return;
    await colocarEn(e, { tipo: 'colocar', obj, varios: false, ocupado: false });
}

export function cancelarModo() {
    if (!E?.modo) return;
    E.modo = null;
    E.fantasma.hidden = true;
    E.ed.classList.remove('colocando', 'trazando');
    E.aviso.hidden = true;
    marcarIman(null);
    pintarBorrador();
    pintarPanel();
}

function pintarAviso() {
    const m = E.modo;
    if (!m) { E.aviso.hidden = true; return; }
    if (m.tipo === 'colocar') {
        E.aviso.innerHTML = `${icono3d(m.obj.estilo, { tam: 26 })}
            <span class="mp-aviso-txt">${m.varios ? 'Toca el mapa para colocar' : 'Toca el mapa donde está'} <b>${esc(m.obj.nombre)}</b>
                ${m.varios ? '<small>Puedes poner varios. Pulsa «Listo» al terminar.</small>' : '<small>En la computadora también puedes arrastrarlo desde la lista.</small>'}</span>
            <button type="button" class="mp-btn mp-btn-suave" data-acc="cancelar-modo">${m.varios ? `${I.check}Listo` : 'Cancelar'}</button>`;
    } else {
        const n = m.puntos.length;
        E.aviso.innerHTML = `<span class="mp-muestra-linea corta ${esc(m.elemento.specs?.estilo ?? 'solida')}" style="--lc:${esc(m.elemento.color || '#0ea5e9')}"></span>
            <span class="mp-aviso-txt"><b>${esc(m.elemento.name)}</b> · ${n ? `${n} ${n === 1 ? 'punto' : 'puntos'}` : 'toca donde empieza el tramo'}
                <small>${n < 2 ? 'Toca cada quiebre del recorrido. Si tocas un equipo, el cable se pega a él.' : 'Doble clic o «Terminar» en el último punto.'}</small></span>
            <button type="button" class="mp-btn mp-btn-suave" data-acc="deshacer-punto" ${n ? '' : 'disabled'} aria-label="Quitar el último punto">${I.deshacer}<span>Punto</span></button>
            <button type="button" class="mp-btn mp-btn-primario" data-acc="terminar" ${n >= 2 ? '' : 'disabled'}>${I.check}Terminar</button>
            <button type="button" class="mp-btn mp-btn-suave" data-acc="cancelar-modo">Salir</button>`;
    }
    E.aviso.hidden = false;
}

// ── Trazar cableado ─────────────────────────────────────────────
export function empezarTrazo(elemento) {
    if (!puedeMapear()) return;
    cerrarHoja();
    E.modo = { tipo: 'trazar', elemento, puntos: [], pegados: [], cursor: null, guardando: false };
    E.fantasma.hidden = true;
    E.ed.classList.remove('colocando');
    E.ed.classList.add('trazando');
    if (!panelFijo()) E.ed.classList.remove('panel-abierto');
    pintarAviso();
    pintarBorrador();
    pintarPanel();
}

export function agregarPunto(e) {
    const m = E.modo;
    if (m.guardando) return;
    const iman = imanCerca(e.clientX, e.clientY);
    if (!iman && fueraDelPlano(e)) return;
    const n = iman ? { x: iman.x, y: iman.y } : aNorm(aMundo(e.clientX, e.clientY));
    // El doble clic que termina deja dos puntos encima: no se repiten
    const ult = m.puntos[m.puntos.length - 1];
    if (ult && Math.hypot((ult[0] - n.x) * E.W * E.vista.z, (ult[1] - n.y) * E.H * E.vista.z) < 4) return;
    m.puntos.push([n.x, n.y]);
    m.pegados.push(iman?.id ?? null);
    m.cursor = null;
    pintarAviso();
    pintarBorrador();
}

export function deshacerPunto() {
    const m = E.modo;
    if (m?.tipo !== 'trazar' || !m.puntos.length || m.guardando) return;
    m.puntos.pop();
    m.pegados.pop();
    pintarAviso();
    pintarBorrador();
}

export async function terminarTrazo() {
    const m = E.modo;
    if (m?.tipo !== 'trazar' || m.guardando) return;
    if (m.puntos.length < 2) { toastError('Un tramo necesita al menos dos puntos.'); return; }
    m.guardando = true;
    const datos = {
        kind: 'infra_line', refId: m.elemento.id, points: m.puntos.map(p => [...p]),
        ends: { a: m.pegados[0] ?? null, b: m.pegados[m.pegados.length - 1] ?? null }
    };
    try {
        const it = await addItem(E.mapa.id, datos);
        if (!E) return;
        E.items.push(it);
        // Listo para el siguiente tramo con el mismo elemento
        m.puntos = [];
        m.pegados = [];
        m.cursor = null;
        pintarMapa();
        if (E.modo === m) pintarAviso();
        pintarPanel();
        touchMap(E.mapa.id);
        pedirMetraje(it);
    } catch (err) {
        toastError(err.message, { title: 'No se guardó el tramo' });
    } finally {
        m.guardando = false;
    }
}

// El tramo ya quedó guardado: aquí solo se pide su metraje, que es opcional
function pedirMetraje(it) {
    const el = elementoPorId(it.refId);
    const { caja } = dialogo({
        oscuro: true,
        ancho: 380,
        clase: 'mp-dlg-metraje',
        titulo: 'Metraje del tramo',
        cuerpo: `<p class="mp-dlg-sub"><b>${esc(el?.name ?? 'Tramo')}</b>. Si aún no lo sabes, déjalo en blanco: lo agregas después tocando el tramo.</p>
            <div class="mp-metraje-campo grande">
                <input type="text" inputmode="decimal" autocomplete="off" maxlength="14" id="mp-metraje-nuevo" placeholder="0" aria-label="Metros">
                <span>metros</span>
            </div>`,
        botones: [
            { r: 'omitir', texto: 'Sin metraje', clase: 'mp-btn-suave' },
            { r: 'guardar', texto: 'Guardar', clase: 'mp-btn-primario' }
        ],
        alPulsar: async (r) => {
            if (r !== 'guardar') return true;
            const { valor, error } = leerMetraje(caja.querySelector('#mp-metraje-nuevo').value);
            if (error) { toastError(error); return false; }
            if (valor == null) return true;
            try {
                const nuevo = await updateItem(it.id, { lengthM: valor });
                const local = E?.items.find(i => i.id === it.id);
                if (local) { local.lengthM = nuevo.lengthM; pintarMarcas(); pintarPanel(); }
                return true;
            } catch (err) {
                toastError(err.message);
                return false;
            }
        }
    });
    caja.querySelector('#mp-metraje-nuevo').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        caja.querySelector('[data-r="guardar"]').click();
    });
}
