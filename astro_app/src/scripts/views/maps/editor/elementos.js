// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — elementos de infraestructura
//  Alta, edición y baja del catálogo propio (postes, cajas, tramos...).
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { toastError, toastSuccess } from '../../../toast.js';
import { saveInfra, infraUsage, deleteInfra } from '../../../mapsStore.js';
import { icono3d, estiloColor } from '../iconos.js';
import { TIPOS_INFRA, tipoInfra, ESTILOS_LINEA, GROSORES } from '../catalogo.js';
import { dialogo, esc, confirmar } from '../ui.js';
import { E } from './estado.js';
import { pintarMapa } from './pintar.js';
import { abrirHoja } from './hoja.js';
import { empezarTrazo, empezarColocar, cancelarModo } from './colocar.js';
import { pintarPanel } from './panel.js';

// ── Catálogo de infraestructura: crear / editar / borrar ────────
export function crearElemento() {
    const grupos = [
        ['Cableado y rutas', 'Se dibujan punto a punto; cada tramo lleva su metraje.', TIPOS_INFRA.filter(t => t.forma === 'linea')],
        ['Puntos de la red', 'Se colocan con un toque, las veces que haga falta.', TIPOS_INFRA.filter(t => t.forma === 'punto')]
    ];
    dialogo({
        oscuro: true,
        ancho: 680,
        clase: 'mp-dlg-tipos',
        titulo: 'Crear elemento de infraestructura',
        cuerpo: `<p class="mp-dlg-sub">Elige qué quieres crear. Después llenas sus datos (todos opcionales) y queda guardado para usarlo en cualquier mapa.</p>
            ${grupos.map(([titulo, ayuda, tipos]) => `<div class="mp-tipos-tit">${titulo}<small>${ayuda}</small></div>
                <div class="mp-tipos">${tipos.map(t => `<button type="button" class="mp-tipo" data-r="${t.kind}">
                    ${icono3d(estiloColor(t.color, t.glifo), { tam: 40 })}
                    <span><b>${esc(t.nombre)}</b><small>${esc(t.ayuda)}</small></span>
                </button>`).join('')}</div>`).join('')}`,
        alPulsar: (r) => {
            if (r) setTimeout(() => formularioElemento(null, r), 170);
            return true;
        }
    });
}

const PALETA = ['#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#78716c', '#475569', '#0f172a'];

export function formularioElemento(elemento, kind = elemento?.kind) {
    const tipo = tipoInfra(kind);
    if (!tipo || !E) return;
    const v = elemento ?? { kind, name: '', color: tipo.color, specs: { estilo: tipo.estilo ?? 'solida', grosor: 5 } };
    let color = /^#[0-9a-f]{6}$/i.test(v.color ?? '') ? v.color : tipo.color;
    const lista = (c) => c.opciones ? `<datalist id="mpi-dl-${c.id}">${c.opciones.map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : '';
    const campo = (c) => c.tipo === 'area'
        ? `<label class="mp-campo ancho"><span>${esc(c.etiqueta)}</span><textarea data-spec="${c.id}" rows="2" maxlength="600" placeholder="Opcional">${esc(v.specs?.[c.id] ?? '')}</textarea></label>`
        : `<label class="mp-campo"><span>${esc(c.etiqueta)}</span><input data-spec="${c.id}" maxlength="120" ${c.opciones ? `list="mpi-dl-${c.id}"` : ''} value="${esc(v.specs?.[c.id] ?? '')}" placeholder="${c.opciones ? 'Elige o escribe' : 'Opcional'}" autocomplete="off">${lista(c)}</label>`;
    const ejemplo = tipo.forma === 'linea' ? `${tipo.nombre.split(' (')[0]} troncal` : `${tipo.nombre.split(' /')[0]} principal`;

    const { caja } = dialogo({
        oscuro: true,
        ancho: 640,
        clase: 'mp-dlg-infra',
        titulo: `${elemento ? 'Editar' : 'Nuevo'}: ${esc(tipo.nombre)}`,
        cuerpo: `<div class="mp-form mp-form-infra">
                <div class="mp-form-cab">${icono3d(estiloColor(color, tipo.glifo), { tam: 48, clase: 'mp-prev-ico' })}
                    <label class="mp-campo crece"><span>Nombre *</span>
                        <input id="mpi-nombre" maxlength="80" value="${esc(v.name)}" placeholder="Ej. ${esc(ejemplo)}" autocomplete="off"></label>
                </div>
                <div class="mp-campo ancho"><span>Color${tipo.forma === 'linea' ? ' de la línea' : ''}</span>
                    <div class="mp-paleta" id="mpi-paleta">${PALETA.map(c => `<button type="button" data-color="${c}" style="--c:${c}" class="${c === color ? 'activo' : ''}" aria-label="Color ${c}"></button>`).join('')}
                        <label class="mp-color-libre ${PALETA.includes(color) ? '' : 'activo'}" title="Otro color"><input type="color" id="mpi-color" value="${esc(color)}" aria-label="Otro color"></label></div></div>
                ${tipo.forma === 'linea' ? `
                <div class="mp-campo"><span>Estilo de línea</span>
                    <div class="mp-seg mp-seg-form" id="mpi-estilo">${ESTILOS_LINEA.map(s => `<button type="button" data-v="${s.id}" class="${(v.specs?.estilo ?? tipo.estilo ?? 'solida') === s.id ? 'activo' : ''}">${s.nombre}</button>`).join('')}</div></div>
                <div class="mp-campo"><span>Grosor</span>
                    <div class="mp-seg mp-seg-form" id="mpi-grosor">${GROSORES.map(g => `<button type="button" data-v="${g.id}" class="${(Number(v.specs?.grosor) || 5) === g.id ? 'activo' : ''}">${g.nombre}</button>`).join('')}</div></div>
                <div class="mp-campo ancho"><span>Así se verá en el mapa</span><div class="mp-muestra-grande"><span class="mp-muestra-linea" id="mpi-muestra"></span></div></div>` : ''}
                <div class="mp-form-sep">Datos <small>· todos opcionales</small></div>
                <div class="mp-form-rejilla">${tipo.campos.map(campo).join('')}</div>
                ${tipo.forma === 'linea' ? '<p class="mp-form-nota">El metraje no va aquí: se anota en cada tramo cuando lo dibujas en el mapa.</p>' : ''}
                ${elemento ? '<p class="mp-form-nota">Los cambios se ven en todos los mapas donde está puesto.</p>' : ''}
            </div>`,
        botones: [
            { r: 'cancelar', texto: 'Cancelar', clase: 'mp-btn-suave' },
            { r: 'guardar', texto: elemento ? 'Guardar cambios' : 'Crear y usar', clase: 'mp-btn-primario' }
        ],
        alPulsar: async (r) => {
            if (r !== 'guardar') return true;
            const nombre = caja.querySelector('#mpi-nombre').value.trim();
            if (!nombre) {
                toastError('Ponle un nombre para reconocerlo en la lista.');
                caja.querySelector('#mpi-nombre').focus();
                return false;
            }
            const specs = {};
            caja.querySelectorAll('[data-spec]').forEach(i => { if (i.value.trim()) specs[i.dataset.spec] = i.value.trim(); });
            if (tipo.forma === 'linea') {
                specs.estilo = caja.querySelector('#mpi-estilo .activo')?.dataset.v ?? 'solida';
                specs.grosor = Number(caja.querySelector('#mpi-grosor .activo')?.dataset.v ?? 5);
            }
            const btn = caja.querySelector('[data-r="guardar"]');
            btn.disabled = true;
            try {
                const guardado = await saveInfra({ id: elemento?.id, kind, name: nombre, color, specs });
                if (!E) return true;
                const i = E.infra.findIndex(x => x.id === guardado.id);
                if (i >= 0) E.infra[i] = guardado; else E.infra.push(guardado);
                E.infra.sort((a, b) => a.name.localeCompare(b.name, 'es'));
                E.tab = 'infra';
                pintarMapa();
                pintarPanel();
                if (elemento) {
                    toastSuccess('Elemento guardado: se actualizó en todos los mapas.', { duration: 2600 });
                    const sel = E.seleccion && E.items.find(x => x.id === E.seleccion);
                    if (sel?.refId === guardado.id) abrirHoja(sel);
                } else {
                    toastSuccess(`«${guardado.name}» creado. Ya puedes usarlo en cualquier mapa.`, { duration: 2600 });
                    if (tipo.forma === 'linea') empezarTrazo(guardado);
                    else empezarColocar({ kind: 'infra_point', id: guardado.id, nombre: guardado.name, estilo: estiloColor(guardado.color, tipo.glifo) });
                }
                return true;
            } catch (err) {
                btn.disabled = false;
                toastError(err.message);
                return false;
            }
        }
    });

    const refrescar = () => {
        const ico = caja.querySelector('.mp-prev-ico');
        const est = estiloColor(color, tipo.glifo);
        ico?.style.setProperty('--c1', est.c[0]);
        ico?.style.setProperty('--c2', est.c[1]);
        const m = caja.querySelector('#mpi-muestra');
        if (m) {
            m.className = `mp-muestra-linea ${caja.querySelector('#mpi-estilo .activo')?.dataset.v ?? 'solida'}`;
            m.style.setProperty('--lc', color);
            m.style.setProperty('--g', caja.querySelector('#mpi-grosor .activo')?.dataset.v ?? 5);
        }
    };
    caja.addEventListener('click', (e) => {
        const c = e.target.closest('[data-color]');
        if (c) {
            color = c.dataset.color;
            caja.querySelectorAll('#mpi-paleta [data-color]').forEach(b => b.classList.toggle('activo', b === c));
            caja.querySelector('.mp-color-libre').classList.remove('activo');
            caja.querySelector('#mpi-color').value = color;
            refrescar();
            return;
        }
        const s = e.target.closest('#mpi-estilo [data-v], #mpi-grosor [data-v]');
        if (s) {
            s.parentElement.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('activo', b === s));
            refrescar();
        }
    });
    caja.querySelector('#mpi-color').addEventListener('input', (e) => {
        color = e.target.value;
        caja.querySelectorAll('#mpi-paleta [data-color]').forEach(b => b.classList.remove('activo'));
        caja.querySelector('.mp-color-libre').classList.add('activo');
        refrescar();
    });
    refrescar();
}

export async function borrarElemento(el) {
    if (!el) return;
    let usos;
    try { usos = await infraUsage(el.id); } catch (err) { toastError(err.message); return; }
    if (!E) return;
    if (usos.size) {
        const total = [...usos.values()].reduce((s, n) => s + n, 0);
        const aqui = usos.get(E.mapa.id) ?? 0;
        dialogo({
            oscuro: true,
            ancho: 440,
            titulo: 'Está en uso',
            cuerpo: `<p class="mp-dlg-sub"><b>${esc(el.name)}</b> está puesto ${total} ${total === 1 ? 'vez' : 'veces'} en ${usos.size} ${usos.size === 1 ? 'mapa' : 'mapas'}${aqui ? ` (${aqui} en este)` : ''}. Quítalo de esos mapas (también de los que estén en la papelera) antes de eliminarlo del catálogo.</p>`,
            botones: [{ r: 'ok', texto: 'Entendido', clase: 'mp-btn-primario' }]
        });
        return;
    }
    const ok = await confirmar({ oscuro: true, titulo: 'Eliminar del catálogo', mensaje: `<b>${esc(el.name)}</b> se borrará de tu catálogo de infraestructura.`, boton: 'Eliminar' });
    if (!ok || !E) return;
    try {
        await deleteInfra(el);
        if (!E) return;
        E.infra = E.infra.filter(x => x.id !== el.id);
        if (E.modo && (E.modo.elemento?.id === el.id || E.modo.obj?.id === el.id)) cancelarModo();
        pintarPanel();
        toastSuccess('Elemento eliminado del catálogo.', { duration: 2000 });
    } catch (err) {
        toastError(err.message);
    }
}
