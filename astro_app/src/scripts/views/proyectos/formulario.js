// ════════════════════════════════════════════════════════════════
//  PROYECTOS — alta, edición y baja de un proyecto
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { toastSuccess, toastError } from '../../toast.js';
import { escapeHtml as esc } from '../../utils.js';
import { showModal, closeModal } from '../../modal.js';
import { ESTADOS, ACEPTA, updateProject, createProject, deleteProject } from '../../projectsStore.js';
import { soltarVisor } from '../projectViewer.js';
import { I } from './formato.js';
import { st, tarjeta } from './estado.js';
import { pintarResumen, pintarFiltros, pintarLista, visibles, POR_PAGINA, pintarTodo } from './lista.js';
import { repintarTarjeta } from './tarjeta.js';
import { subirArchivos } from './contenido.js';
import { abrirFicha, cerrarFichaDe } from './ventanas.js';

// ── Proyecto: crear, editar, eliminar ───────────────────────────
export function formularioProyecto(p = null) {
    const v = p ?? { status: 'En evaluación', currency: 'GTQ' };
    const cuerpo = `
        <div class="form-group"><label for="pjf-nombre">Nombre del proyecto *</label>
            <input id="pjf-nombre" maxlength="140" value="${esc(v.name ?? '')}" placeholder="Ej. Renovación de switches en CMY"></div>
        <div class="form-row">
            <div class="form-group"><label for="pjf-proveedor">Proveedor</label>
                <input id="pjf-proveedor" maxlength="120" value="${esc(v.vendor ?? '')}" placeholder="Quién cotiza"></div>
            <div class="form-group"><label for="pjf-estado">Estado</label>
                <select id="pjf-estado">${ESTADOS.map(e => `<option ${e.id === v.status ? 'selected' : ''}>${esc(e.id)}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label for="pjf-monto">Monto cotizado</label>
                <div class="pjf-monto">
                    <select id="pjf-moneda" aria-label="Moneda">
                        <option value="GTQ" ${v.currency !== 'USD' ? 'selected' : ''}>Q</option>
                        <option value="USD" ${v.currency === 'USD' ? 'selected' : ''}>US$</option>
                    </select>
                    <input id="pjf-monto" type="number" min="0" step="0.01" inputmode="decimal" value="${v.amount ?? ''}" placeholder="0.00">
                </div></div>
            <div class="form-group"><label for="pjf-fecha">Fecha de la cotización</label>
                <input id="pjf-fecha" type="date" value="${esc(v.quoteDate ?? '')}"></div>
        </div>
        ${p ? '' : `
        <div class="form-group"><label for="pjf-paso">Próximo paso</label>
            <input id="pjf-paso" maxlength="200" placeholder="Ej. Esperar el visto bueno de gerencia"></div>
        <div class="form-group"><label for="pjf-contexto">Contexto</label>
            <textarea id="pjf-contexto" rows="5" placeholder="¿De qué se trata? ¿Por qué se necesita? ¿En qué vamos?"></textarea></div>
        <div class="form-group"><label for="pjf-archivos">Documentos</label>
            <input id="pjf-archivos" type="file" multiple accept="${ACEPTA}">
            <small class="pjf-ayuda">PDF, imágenes o Word, hasta 50 MB cada uno. También puedes arrastrarlos después a la tarjeta del proyecto.</small></div>`}
        <p class="pjf-error" id="pjf-error" hidden></p>`;

    showModal(p ? 'Editar proyecto' : 'Nuevo proyecto', cuerpo, async () => {
        const btn = document.getElementById('modal-save');
        if (btn.disabled) return;
        const datos = leerFormulario(!p);
        if (!datos) return;
        const archivos = p ? [] : [...(document.getElementById('pjf-archivos')?.files ?? [])];

        btn.disabled = true;
        btn.textContent = p ? 'Guardando…' : 'Creando…';
        try {
            if (p) {
                const nuevo = await updateProject(p, datos);
                Object.assign(p, nuevo, { files: p.files });
                closeModal();
                pintarResumen();
                pintarFiltros();
                // La tarjeta (en la lista o en la ficha) y su miniatura se
                // actualizan; si con el estado nuevo ya no entra en el filtro,
                // además cambia la lista.
                repintarTarjeta(p);
                if (st.filtro && p.status !== st.filtro) pintarLista();
                toastSuccess('Datos del proyecto guardados.');
            } else {
                const nuevo = await createProject(datos);
                st.proyectos.unshift(nuevo);
                closeModal();
                st.filtro = '';
                st.busqueda = '';
                const buscar = document.getElementById('pj-buscar');
                if (buscar) buscar.value = '';
                if (st.vista === 'mini') {
                    // A la página donde quedó, y se abre para ver cómo sube lo adjunto
                    const pos = visibles().findIndex(x => x.id === nuevo.id);
                    st.pagina = Math.floor(Math.max(0, pos) / POR_PAGINA) + 1;
                    pintarTodo();
                    abrirFicha(nuevo);
                } else {
                    pintarTodo();
                    tarjeta(nuevo.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                if (archivos.length) await subirArchivos(nuevo, archivos);
                else toastSuccess(`Proyecto «${nuevo.name}» creado.`);
            }
        } catch (err) {
            btn.disabled = false;
            btn.textContent = p ? 'Guardar cambios' : 'Crear proyecto';
            const box = document.getElementById('pjf-error');
            if (box) { box.textContent = err.message; box.hidden = false; }
            else toastError(err.message);
        }
    }, p ? 'Guardar cambios' : 'Crear proyecto');
}

function leerFormulario(esNuevo) {
    const val = (id) => document.getElementById(id)?.value ?? '';
    const error = (msg, id) => {
        const box = document.getElementById('pjf-error');
        box.textContent = msg;
        box.hidden = false;
        document.getElementById(id)?.focus();
        return null;
    };
    const nombre = val('pjf-nombre').trim();
    if (!nombre) return error('Ponle un nombre al proyecto.', 'pjf-nombre');
    const crudo = val('pjf-monto').trim();
    const cantidad = crudo === '' ? null : Number(crudo);
    if (cantidad !== null && (!Number.isFinite(cantidad) || cantidad < 0)) return error('El monto debe ser un número positivo.', 'pjf-monto');

    const datos = {
        name: nombre,
        vendor: val('pjf-proveedor'),
        status: val('pjf-estado'),
        amount: cantidad,
        currency: val('pjf-moneda') || 'GTQ',
        quoteDate: val('pjf-fecha')
    };
    if (esNuevo) {
        datos.nextStep = val('pjf-paso');
        datos.context = val('pjf-contexto');
    }
    return datos;
}

export async function eliminarProyecto(p) {
    const n = p.files.length;
    const ok = await confirmar({
        titulo: 'Eliminar proyecto',
        mensaje: `¿Eliminar <b>${esc(p.name)}</b>${n ? ` y sus ${n} ${n === 1 ? 'documento' : 'documentos'}` : ''}? No se puede deshacer.`,
        boton: 'Eliminar proyecto'
    });
    if (!ok) return;
    try {
        await deleteProject(p);
        st.proyectos = st.proyectos.filter(x => x.id !== p.id);
        st.sel.delete(p.id);
        cerrarFichaDe(p.id);   // si se borró desde la ficha, esta se va
        const card = tarjeta(p.id) ?? document.getElementById(`pjm-${p.id}`);
        if (card) {
            soltarVisor(card.querySelector('[data-visor]'));
            card.classList.add('pj-saliendo');
            await new Promise(r => setTimeout(r, 260));
        }
        pintarTodo();
        toastSuccess(`Se eliminó «${p.name}».`);
    } catch (err) {
        toastError(err.message, { title: 'No se eliminó el proyecto' });
    }
}

// ── Confirmación (vidrio, como el resto) ────────────────────────
export function confirmar({ titulo, mensaje, boton }) {
    return new Promise((resolver) => {
        const capa = document.createElement('div');
        capa.className = 'pj-dialogo';
        capa.innerHTML = `<div class="pj-dialogo-caja" role="alertdialog" aria-modal="true" aria-labelledby="pj-dlg-t">
            <div class="pj-dialogo-ico">${I.basura}</div>
            <h3 id="pj-dlg-t">${esc(titulo)}</h3>
            <p>${mensaje}</p>
            <div class="pj-dialogo-pie">
                <button type="button" class="pj-btn-suave" data-r="no">Cancelar</button>
                <button type="button" class="pj-btn-peligro" data-r="si">${esc(boton)}</button>
            </div>
        </div>`;
        const cerrar = (r) => {
            document.removeEventListener('keydown', teclas, true);
            capa.classList.add('saliendo');
            setTimeout(() => capa.remove(), 160);
            resolver(r);
        };
        const teclas = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(false); }
        };
        capa.addEventListener('click', (e) => {
            if (e.target === capa) cerrar(false);
            const r = e.target.closest('[data-r]')?.dataset.r;
            if (r) cerrar(r === 'si');
        });
        document.addEventListener('keydown', teclas, true);
        document.body.appendChild(capa);
        capa.querySelector('[data-r="no"]').focus();   // lo seguro, por defecto
    });
}
