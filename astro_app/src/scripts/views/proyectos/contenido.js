// ════════════════════════════════════════════════════════════════
//  PROYECTOS — documentos (ver, subir, borrar) y contexto (editar)
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { toastError, toastSuccess } from '../../toast.js';
import { escapeHtml as esc } from '../../utils.js';
import { ACEPTA, validarArchivo, uploadFile, deleteFile, updateProject } from '../../projectsStore.js';
import { mostrarArchivo } from '../projectViewer.js';
import { I, GUIA } from './formato.js';
import { st, tarjeta, archivoVisto } from './estado.js';
import { pintarResumen } from './lista.js';
import { repintarTarjeta } from './tarjeta.js';
import { confirmar } from './formulario.js';

// ── Documentos ──────────────────────────────────────────────────
export function verArchivo(p, idArchivo) {
    if (st.sel.get(p.id) === idArchivo && tarjeta(p.id)?.querySelector('[data-visor]')?._visor) return;
    st.sel.set(p.id, idArchivo);
    const card = tarjeta(p.id);
    card.querySelectorAll('.pj-tab').forEach(t => {
        const activo = t.dataset.archivo === idArchivo;
        t.classList.toggle('activo', activo);
        t.setAttribute('aria-selected', String(activo));
    });
    const visor = card.querySelector('[data-visor]');
    st.io.unobserve(visor);
    mostrarArchivo(visor, archivoVisto(p));
}

export function elegirArchivos(p) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACEPTA;
    input.onchange = () => subirArchivos(p, [...input.files]);
    input.click();
}

export async function subirArchivos(p, files) {
    if (!p || !files.length) return;
    const rechazados = files.map(validarArchivo).filter(Boolean);
    const validos = files.filter(f => !validarArchivo(f));
    if (rechazados.length) toastError(rechazados.join(' '), { title: 'Algunos archivos no se subieron' });
    if (!validos.length) return;

    const card = tarjeta(p.id);
    const aviso = document.createElement('div');
    aviso.className = 'pj-subiendo';
    card?.querySelector('.pj-doc')?.prepend(aviso);

    const fallidos = [];
    let ultimo = null;
    for (let i = 0; i < validos.length; i++) {
        aviso.innerHTML = `<div class="db-spinner"></div><span>Subiendo ${validos.length > 1 ? `${i + 1} de ${validos.length} · ` : ''}${esc(validos[i].name)}…</span>`;
        try {
            const { archivo, actualizado } = await uploadFile(p, validos[i]);
            p.files.push(archivo);
            if (actualizado) p.updatedAt = actualizado;
            ultimo = archivo;
        } catch (err) {
            fallidos.push(err.message);
        }
    }
    aviso.remove();
    if (!st) return;   // se salió de la página mientras subía

    if (ultimo) st.sel.set(p.id, ultimo.id);
    repintarTarjeta(p);
    pintarResumen();

    const subidos = validos.length - fallidos.length;
    if (fallidos.length) toastError(fallidos.join(' '), { title: subidos ? 'Algunos documentos no se subieron' : 'No se subió ningún documento' });
    if (subidos) toastSuccess(subidos === 1 ? `Documento agregado a «${p.name}».` : `${subidos} documentos agregados a «${p.name}».`);
}

export async function borrarArchivo(p, f) {
    if (!f) return;
    const ok = await confirmar({
        titulo: 'Eliminar documento',
        mensaje: `¿Eliminar <b>${esc(f.name)}</b> de «${esc(p.name)}»? No se puede deshacer.`,
        boton: 'Eliminar documento'
    });
    if (!ok) return;
    try {
        const { actualizado } = await deleteFile(p, f);
        p.files = p.files.filter(x => x.id !== f.id);
        if (actualizado) p.updatedAt = actualizado;
        if (st.sel.get(p.id) === f.id) st.sel.delete(p.id);
        repintarTarjeta(p);
        pintarResumen();
        toastSuccess(`Se eliminó «${f.name}».`);
    } catch (err) {
        toastError(err.message, { title: 'No se eliminó el documento' });
    }
}

// ── Contexto ────────────────────────────────────────────────────
export function editarContexto(card, p) {
    const ctx = card.querySelector('.pj-ctx');
    ctx.innerHTML = `<div class="pj-ctx-hdr"><div><h3>${I.nota}Contexto</h3></div></div>
        <label class="pj-campo">
            <span>Próximo paso</span>
            <input class="pj-input" data-campo="paso" maxlength="200" value="${esc(p.nextStep)}"
                   placeholder="Ej. Esperar el visto bueno de gerencia">
        </label>
        <label class="pj-campo pj-campo-grande">
            <span>¿De qué se trata y en qué vamos?
                <button type="button" class="pj-enlace" data-acc="ctx-guia">Usar guía</button></span>
            <textarea class="pj-textarea" data-campo="texto" rows="9"
                placeholder="Cuéntalo como se lo contarías en persona: qué se cotizó, por qué hace falta y en qué quedó.">${esc(p.context)}</textarea>
        </label>
        <p class="pj-ayuda">Consejo: empieza una línea con «-» para hacer una lista y escribe **así** para resaltar.</p>
        <div class="pj-ctx-pie">
            <button type="button" class="pj-btn-suave" data-acc="ctx-cancelar">Cancelar</button>
            <button type="button" class="pj-btn-primario" data-acc="ctx-guardar">Guardar contexto</button>
        </div>`;
    const area = ctx.querySelector('textarea');
    const crecer = () => { area.style.height = 'auto'; area.style.height = `${Math.min(area.scrollHeight + 2, 520)}px`; };
    area.addEventListener('input', crecer);
    crecer();
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
}

export function ponerGuia(card) {
    const area = card.querySelector('.pj-ctx textarea');
    if (!area) return;
    area.value = area.value.trim() ? `${area.value.trimEnd()}\n\n${GUIA}` : GUIA;
    area.dispatchEvent(new Event('input'));
    area.focus();
}

export async function guardarContexto(card, p, btn) {
    const texto = card.querySelector('[data-campo="texto"]').value;
    const paso = card.querySelector('[data-campo="paso"]').value;
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
        const nuevo = await updateProject(p, { context: texto, nextStep: paso });
        Object.assign(p, nuevo, { files: p.files });
        repintarTarjeta(p);
        toastSuccess('Contexto guardado.');
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Guardar contexto';
        toastError(err.message, { title: 'No se guardó el contexto' });
    }
}

export async function borrarContexto(p) {
    const ok = await confirmar({
        titulo: 'Eliminar contexto',
        mensaje: `Se borrará el contexto y el próximo paso de «${esc(p.name)}». Los documentos no se tocan.`,
        boton: 'Eliminar contexto'
    });
    if (!ok) return;
    try {
        const nuevo = await updateProject(p, { context: '', nextStep: '' });
        Object.assign(p, nuevo, { files: p.files, contextUpdatedAt: null });
        repintarTarjeta(p);
        toastSuccess('Contexto eliminado.');
    } catch (err) {
        toastError(err.message, { title: 'No se eliminó el contexto' });
    }
}
