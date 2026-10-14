import { supabase } from './supabase.js';
import { recordAudit } from './auditLog.js';
import { genId } from './store.js';

// ════════════════════════════════════════════════════════════════
//  PROYECTOS — datos y documentos
//
//  Cotizaciones y propuestas con sus archivos (ver la migración
//  supabase/migrations/20261014120000_proyectos.sql).
//
//  A diferencia del inventario, aquí nada es optimista: subir un archivo
//  tarda y puede fallar, y esto es lo que se le enseña a la jefatura.
//  Cada operación espera a Supabase y, si algo falla, lanza un Error con
//  un mensaje en español listo para enseñarse tal cual.
// ════════════════════════════════════════════════════════════════

const BUCKET = 'proyectos';
export const MAX_BYTES = 50 * 1024 * 1024;   // el límite del bucket

export const ESTADOS = [
    { id: 'En evaluación', color: '#f59e0b' },
    { id: 'Aprobado',      color: '#10b981' },
    { id: 'En ejecución',  color: '#3b82f6' },
    { id: 'En pausa',      color: '#64748b' },
    { id: 'Finalizado',    color: '#06b6d4' },
    { id: 'Rechazado',     color: '#ef4444' }
];

export const colorDeEstado = (estado) => ESTADOS.find(e => e.id === estado)?.color ?? '#64748b';

// Tipos admitidos y cómo se previsualiza cada uno
const TIPOS = {
    'application/pdf': 'pdf',
    'image/png':  'imagen',
    'image/jpeg': 'imagen',
    'image/webp': 'imagen',
    'image/gif':  'imagen',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc'
};

const POR_EXTENSION = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', gif: 'image/gif', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

export const ACEPTA = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx';

export const tipoDe = (archivo) => TIPOS[archivo.mime] ?? 'otro';

// En Windows sin Office instalado el navegador suele entregar los .doc y
// .docx sin tipo: se deduce por la extensión.
function mimeDe(file) {
    if (TIPOS[file.type]) return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return POR_EXTENSION[ext] ?? file.type ?? '';
}

// Aún no se aplicó la migración: la vista enseña cómo prepararla
export class SinPreparar extends Error {}

function falla(error, accion) {
    const msg = error?.message ?? String(error ?? '');
    const code = error?.code ?? error?.statusCode ?? '';
    if (code === '42P01' || code === 'PGRST205'
        || /could not find the table|relation .* does not exist|bucket not found/i.test(msg)) {
        return new SinPreparar(msg);
    }
    if (code === 'PGRST116' || /row-level security|permission denied|not authorized|unauthorized/i.test(msg)) {
        return new Error(`No tienes permiso para ${accion}.`);
    }
    if (/maximum allowed size|payload too large|entity too large/i.test(msg)) {
        return new Error('El archivo pasa del límite de 50 MB.');
    }
    if (/mime type|invalid_mime/i.test(msg)) {
        return new Error('Ese tipo de archivo no se admite: usa PDF, imagen o Word.');
    }
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        return new Error(`No se pudo ${accion}: sin conexión con el servidor.`);
    }
    return new Error(`No se pudo ${accion}: ${msg}`);
}

// ── Conversión base de datos ↔ app ──────────────────────────────
const archivoDesdeDb = (f) => ({
    id: f.id, projectId: f.project_id, name: f.name, path: f.path,
    mime: f.mime ?? '', size: Number(f.size) || 0, createdAt: f.created_at
});

const proyectoDesdeDb = (p, archivos = []) => ({
    id:               p.id,
    name:             p.name,
    vendor:           p.vendor ?? '',
    amount:           p.amount != null ? Number(p.amount) : null,
    currency:         p.currency ?? 'GTQ',
    status:           p.status ?? 'En evaluación',
    quoteDate:        p.quote_date ?? '',
    nextStep:         p.next_step ?? '',
    context:          p.context ?? '',
    contextUpdatedAt: p.context_updated_at ?? null,
    createdAt:        p.created_at,
    updatedAt:        p.updated_at,
    files:            archivos
});

// Solo los campos presentes en `datos` (sirve para crear y para editar)
function haciaDb(datos) {
    const fila = {};
    if ('name' in datos)      fila.name       = datos.name.trim();
    if ('vendor' in datos)    fila.vendor     = datos.vendor?.trim() || null;
    if ('amount' in datos)    fila.amount     = datos.amount ?? null;
    if ('currency' in datos)  fila.currency   = datos.currency || 'GTQ';
    if ('status' in datos)    fila.status     = datos.status || 'En evaluación';
    if ('quoteDate' in datos) fila.quote_date = datos.quoteDate || null;
    if ('nextStep' in datos)  fila.next_step  = datos.nextStep?.trim() || null;
    if ('context' in datos)   fila.context    = datos.context?.trim() || null;
    if ('context' in datos || 'nextStep' in datos) fila.context_updated_at = new Date().toISOString();
    return fila;
}

// ── Lectura ─────────────────────────────────────────────────────
export async function loadProjects() {
    const [{ data: proyectos, error: e1 }, { data: archivos, error: e2 }] = await Promise.all([
        supabase.from('projects').select('*').order('updated_at', { ascending: false }),
        supabase.from('project_files').select('*').order('created_at', { ascending: true })
    ]);
    if (e1 || e2) throw falla(e1 || e2, 'cargar los proyectos');

    const porProyecto = new Map();
    for (const f of archivos ?? []) {
        if (!porProyecto.has(f.project_id)) porProyecto.set(f.project_id, []);
        porProyecto.get(f.project_id).push(archivoDesdeDb(f));
    }
    return (proyectos ?? []).map(p => proyectoDesdeDb(p, porProyecto.get(p.id) ?? []));
}

// ── Proyectos ───────────────────────────────────────────────────
export async function createProject(datos) {
    const fila = { id: genId(), ...haciaDb(datos) };
    if (!fila.context && !fila.next_step) fila.context_updated_at = null;
    const { data, error } = await supabase.from('projects').insert(fila).select().single();
    if (error) throw falla(error, 'crear el proyecto');
    recordAudit([{ action: 'insert', entityType: 'project', entityId: data.id, entityName: data.name }]);
    return proyectoDesdeDb(data);
}

export async function updateProject(proyecto, cambios) {
    const fila = haciaDb(cambios);
    // .select() para saber si de verdad se guardó: si RLS lo impide, no
    // hay error, simplemente no vuelve ninguna fila.
    const { data, error } = await supabase.from('projects')
        .update(fila).eq('id', proyecto.id).select().single();
    if (error) throw falla(error, 'guardar los cambios');

    const changes = {};
    for (const [k, v] of Object.entries(cambios)) {
        if ((proyecto[k] ?? '') !== (v ?? '')) changes[k] = { antes: proyecto[k] ?? null, despues: v ?? null };
    }
    recordAudit([{
        action: 'update', entityType: 'project', entityId: data.id, entityName: data.name,
        changes: Object.keys(changes).length ? changes : null
    }]);
    return proyectoDesdeDb(data, proyecto.files);
}

// Primero la fila (sus documentos se van con ella por el cascade) y luego
// los archivos: si estos fallaran, quedarían como basura invisible en el
// bucket, nunca como un proyecto con documentos rotos.
export async function deleteProject(proyecto) {
    const { data, error } = await supabase.from('projects').delete().eq('id', proyecto.id).select('id');
    if (error) throw falla(error, 'eliminar el proyecto');
    if (!data?.length) throw new Error('No tienes permiso para eliminar proyectos.');

    if (proyecto.files.length) {
        const { error: e2 } = await supabase.storage.from(BUCKET).remove(proyecto.files.map(f => f.path));
        if (e2) console.warn('[proyectos] archivos no borrados del bucket:', e2.message);
    }
    proyecto.files.forEach(f => cache.delete(f.path));
    recordAudit([{ action: 'delete', entityType: 'project', entityId: proyecto.id, entityName: proyecto.name }]);
}

// La fecha de "Actualizado" del proyecto también cuenta subir o quitar un
// documento. El valor definitivo lo pone el trigger de la base (now());
// este solo hace que la fila cambie.
async function tocarProyecto(id) {
    const { data } = await supabase.from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id).select('updated_at').single();
    return data?.updated_at ?? null;
}

// ── Documentos ──────────────────────────────────────────────────
const nombreSeguro = (nombre) => nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '_').replace(/_+/g, '_')
    .slice(-80) || 'archivo';

export function validarArchivo(file) {
    const mime = mimeDe(file);
    if (!TIPOS[mime]) return `«${file.name}» no es PDF, imagen ni Word.`;
    if (file.size > MAX_BYTES) return `«${file.name}» pasa de 50 MB.`;
    return null;
}

export async function uploadFile(proyecto, file) {
    const problema = validarArchivo(file);
    if (problema) throw new Error(problema);

    const mime = mimeDe(file);
    const id   = genId();
    const path = `${proyecto.id}/${id}-${nombreSeguro(file.name)}`;

    const { error: e1 } = await supabase.storage.from(BUCKET)
        .upload(path, file, { contentType: mime, upsert: false, cacheControl: '3600' });
    if (e1) throw falla(e1, `subir «${file.name}»`);

    const fila = { id, project_id: proyecto.id, name: file.name, path, mime, size: file.size };
    const { data, error: e2 } = await supabase.from('project_files').insert(fila).select().single();
    if (e2) {
        // Sin su fila el archivo quedaría huérfano en el bucket
        await supabase.storage.from(BUCKET).remove([path]);
        throw falla(e2, `registrar «${file.name}»`);
    }

    // Lo recién subido ya está en memoria: la vista previa no lo descarga
    cache.set(path, Promise.resolve(file));
    const actualizado = await tocarProyecto(proyecto.id);
    recordAudit([{ action: 'insert', entityType: 'project_file', entityId: id, entityName: `${file.name} · ${proyecto.name}` }]);
    return { archivo: archivoDesdeDb(data), actualizado };
}

export async function deleteFile(proyecto, archivo) {
    const { data, error: e2 } = await supabase.from('project_files').delete().eq('id', archivo.id).select('id');
    if (e2) throw falla(e2, `eliminar «${archivo.name}»`);
    if (!data?.length) throw new Error('No tienes permiso para eliminar documentos.');

    // La fila ya no existe; si el archivo del bucket no se pudiera borrar,
    // quedaría solo como basura invisible, no como un documento roto.
    const { error: e1 } = await supabase.storage.from(BUCKET).remove([archivo.path]);
    if (e1) console.warn('[proyectos] archivo no borrado del bucket:', archivo.path, e1.message);

    cache.delete(archivo.path);
    const actualizado = await tocarProyecto(proyecto.id);
    recordAudit([{ action: 'delete', entityType: 'project_file', entityId: archivo.id, entityName: `${archivo.name} · ${proyecto.name}` }]);
    return { actualizado };
}

// Descarga con la sesión del usuario (el bucket es privado). Se guarda la
// promesa: cambiar de pestaña o abrir en grande no vuelve a descargar.
const cache = new Map();

export function fileBlob(archivo) {
    if (!cache.has(archivo.path)) {
        const p = supabase.storage.from(BUCKET).download(archivo.path).then(({ data, error }) => {
            if (error) {
                cache.delete(archivo.path);
                throw falla(error, `abrir «${archivo.name}»`);
            }
            return data;
        });
        cache.set(archivo.path, p);
    }
    return cache.get(archivo.path);
}
