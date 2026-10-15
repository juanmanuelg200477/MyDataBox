import { supabase } from './supabase.js';
import { recordAudit } from './auditLog.js';
import { genId } from './store.js';

// ════════════════════════════════════════════════════════════════
//  MAPAS Y RUTAS — datos e imágenes
//  (ver supabase/migrations/20261015120000_mapas.sql)
//
//  Como en Proyectos, nada es optimista a ciegas: cada operación espera a
//  Supabase y, si falla, lanza un Error con un mensaje en español listo
//  para enseñarse. La vista decide si deshace lo que ya pintó.
// ════════════════════════════════════════════════════════════════

const BUCKET = 'mapas';
export const DIAS_PAPELERA = 5;
export const MAX_BYTES = 50 * 1024 * 1024;

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
    if (code === '23505') return new Error(`No se pudo ${accion}: ya estaba en este mapa.`);
    if (/maximum allowed size|payload too large|entity too large/i.test(msg)) {
        return new Error('La imagen pasa del límite de 50 MB.');
    }
    if (/mime type|invalid_mime/i.test(msg)) return new Error('Solo se admiten imágenes PNG, JPG o WebP.');
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        return new Error(`No se pudo ${accion}: sin conexión con el servidor.`);
    }
    return new Error(`No se pudo ${accion}: ${msg}`);
}

// ── Conversión base de datos ↔ app ──────────────────────────────
const mapaDesdeDb = (m) => ({
    id: m.id,
    name: m.name,
    kind: m.kind ?? 'Sede',
    regionId: m.region_id ?? '',
    description: m.description ?? '',
    coverPath: m.cover_path ?? null,
    imagePath: m.image_path ?? null,
    thumbPath: m.thumb_path ?? null,
    imageW: m.image_w ?? null,
    imageH: m.image_h ?? null,
    deletedAt: m.deleted_at ?? null,
    createdAt: m.created_at,
    updatedAt: m.updated_at
});

const itemDesdeDb = (it) => ({
    id: it.id,
    mapId: it.map_id,
    kind: it.kind,
    refId: it.ref_id,
    x: it.x,
    y: it.y,
    points: Array.isArray(it.points) ? it.points : null,
    ends: it.ends ?? null,
    lengthM: it.length_m != null ? Number(it.length_m) : null
});

const elementoDesdeDb = (e) => ({
    id: e.id,
    kind: e.kind,
    name: e.name,
    color: e.color ?? null,
    specs: e.specs ?? {},
    createdAt: e.created_at,
    updatedAt: e.updated_at
});

// ── Mapas ───────────────────────────────────────────────────────
// Todos (también los de la papelera) con lo que hace falta para las
// tarjetas de la lista: cuántos dispositivos, bastidores, elementos y
// metros de cable tiene cada uno.
export async function loadMaps() {
    const [{ data: mapas, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase.from('maps').select('*').order('updated_at', { ascending: false }),
        supabase.from('map_items').select('map_id, kind, length_m')
    ]);
    if (e1 || e2) throw falla(e1 || e2, 'cargar los mapas');

    const resumen = new Map();
    for (const it of items ?? []) {
        const r = resumen.get(it.map_id) ?? { dispositivos: 0, bastidores: 0, puntos: 0, tramos: 0, metros: 0 };
        if (it.kind === 'device') r.dispositivos++;
        else if (it.kind === 'rack') r.bastidores++;
        else if (it.kind === 'infra_point') r.puntos++;
        else if (it.kind === 'infra_line') { r.tramos++; r.metros += Number(it.length_m) || 0; }
        resumen.set(it.map_id, r);
    }
    return (mapas ?? []).map(m => ({
        ...mapaDesdeDb(m),
        resumen: resumen.get(m.id) ?? { dispositivos: 0, bastidores: 0, puntos: 0, tramos: 0, metros: 0 }
    }));
}

export async function loadMap(id) {
    const [{ data: mapa, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase.from('maps').select('*').eq('id', id).maybeSingle(),
        supabase.from('map_items').select('*').eq('map_id', id)
    ]);
    if (e1 || e2) throw falla(e1 || e2, 'abrir el mapa');
    if (!mapa) return null;
    return { mapa: mapaDesdeDb(mapa), items: (items ?? []).map(itemDesdeDb) };
}

function mapaHaciaDb(datos) {
    const fila = {};
    if ('name' in datos)        fila.name        = datos.name.trim();
    if ('kind' in datos)        fila.kind        = datos.kind || 'Sede';
    if ('regionId' in datos)    fila.region_id   = datos.regionId || null;
    if ('description' in datos) fila.description = datos.description?.trim() || null;
    if ('coverPath' in datos)   fila.cover_path  = datos.coverPath;
    if ('imagePath' in datos)   fila.image_path  = datos.imagePath;
    if ('thumbPath' in datos)   fila.thumb_path  = datos.thumbPath;
    if ('imageW' in datos)      fila.image_w     = datos.imageW;
    if ('imageH' in datos)      fila.image_h     = datos.imageH;
    if ('deletedAt' in datos)   fila.deleted_at  = datos.deletedAt;
    return fila;
}

export async function createMap(datos) {
    const fila = { id: genId(), ...mapaHaciaDb(datos) };
    const { data, error } = await supabase.from('maps').insert(fila).select().single();
    if (error) throw falla(error, 'crear el mapa');
    recordAudit([{ action: 'insert', entityType: 'map', entityId: data.id, entityName: data.name }]);
    return mapaDesdeDb(data);
}

// .select() para saber si de verdad se guardó: si RLS lo impide no hay
// error, simplemente no vuelve ninguna fila.
export async function updateMap(id, cambios, { auditar = true } = {}) {
    const { data, error } = await supabase.from('maps').update(mapaHaciaDb(cambios)).eq('id', id).select().single();
    if (error) throw falla(error, 'guardar el mapa');
    if (auditar) recordAudit([{ action: 'update', entityType: 'map', entityId: data.id, entityName: data.name }]);
    return mapaDesdeDb(data);
}

// A la papelera: el mapa sigue completo, solo queda marcado
export async function trashMap(mapa) {
    const m = await updateMap(mapa.id, { deletedAt: new Date().toISOString() }, { auditar: false });
    recordAudit([{ action: 'delete', entityType: 'map', entityId: mapa.id, entityName: mapa.name, changes: { papelera: { antes: null, despues: 'sí' } } }]);
    return m;
}

export async function restoreMap(mapa) {
    const m = await updateMap(mapa.id, { deletedAt: null }, { auditar: false });
    recordAudit([{ action: 'update', entityType: 'map', entityId: mapa.id, entityName: mapa.name, changes: { papelera: { antes: 'sí', despues: 'restaurado' } } }]);
    return m;
}

// Borrado definitivo: primero la fila (sus elementos se van por el
// cascade) y después las imágenes. Si estas fallaran quedarían como
// basura invisible en el bucket, nunca como un mapa roto.
export async function deleteMapForever(mapa) {
    const { data, error } = await supabase.from('maps').delete().eq('id', mapa.id).select('id');
    if (error) throw falla(error, 'eliminar el mapa');
    if (!data?.length) throw new Error('No tienes permiso para eliminar mapas.');
    const rutas = [mapa.coverPath, mapa.imagePath, mapa.thumbPath].filter(Boolean);
    if (rutas.length) {
        const { error: e2 } = await supabase.storage.from(BUCKET).remove(rutas);
        if (e2) console.warn('[mapas] imágenes no borradas del bucket:', e2.message);
    }
    recordAudit([{ action: 'delete', entityType: 'map', entityId: mapa.id, entityName: mapa.name, changes: { definitivo: { antes: null, despues: 'sí' } } }]);
}

// Lo que lleva más de 5 días en la papelera se elimina del todo. Lo hace
// la app al abrir la lista (no hay tareas programadas en la base).
export async function purgeTrash(mapas) {
    const limite = Date.now() - DIAS_PAPELERA * 86400000;
    const viejos = mapas.filter(m => m.deletedAt && new Date(m.deletedAt).getTime() < limite);
    // Solo se devuelven los que de verdad se borraron: si uno falla (p. ej.
    // sin conexión) sigue en la papelera y se reintenta la próxima vez.
    const borrados = [];
    for (const m of viejos) {
        try { await deleteMapForever(m); borrados.push(m.id); }
        catch (err) { console.warn('[mapas] no se pudo purgar', m.name, err.message); }
    }
    return borrados;
}

// ── Elementos de un mapa ────────────────────────────────────────
export async function addItem(mapId, item) {
    const fila = {
        id: genId(),
        map_id: mapId,
        kind: item.kind,
        ref_id: item.refId,
        x: item.x ?? null,
        y: item.y ?? null,
        points: item.points ?? null,
        ends: item.ends ?? null,
        length_m: item.lengthM ?? null
    };
    const { data, error } = await supabase.from('map_items').insert(fila).select().single();
    if (error) throw falla(error, 'agregarlo al mapa');
    return itemDesdeDb(data);
}

export async function updateItem(id, cambios) {
    const fila = {};
    if ('x' in cambios)       fila.x = cambios.x;
    if ('y' in cambios)       fila.y = cambios.y;
    if ('points' in cambios)  fila.points = cambios.points;
    if ('ends' in cambios)    fila.ends = cambios.ends;
    if ('lengthM' in cambios) fila.length_m = cambios.lengthM;
    const { data, error } = await supabase.from('map_items').update(fila).eq('id', id).select().single();
    if (error) throw falla(error, 'guardar el cambio');
    return itemDesdeDb(data);
}

export async function deleteItem(id) {
    const { data, error } = await supabase.from('map_items').delete().eq('id', id).select('id');
    if (error) throw falla(error, 'quitarlo del mapa');
    if (!data?.length) throw new Error('No tienes permiso para quitar elementos del mapa.');
}

// Mover un mapa toca su "Actualizado": basta con escribir la fila
export async function touchMap(id) {
    await supabase.from('maps').update({ updated_at: new Date().toISOString() }).eq('id', id);
}

// ── Catálogo de infraestructura ─────────────────────────────────
export async function loadInfra() {
    const { data, error } = await supabase.from('infra_elements').select('*').order('name');
    if (error) throw falla(error, 'cargar la infraestructura');
    return (data ?? []).map(elementoDesdeDb);
}

export async function saveInfra(elemento) {
    const fila = { kind: elemento.kind, name: elemento.name.trim(), color: elemento.color || null, specs: elemento.specs ?? {} };
    const nuevo = !elemento.id;
    const consulta = nuevo
        ? supabase.from('infra_elements').insert({ id: genId(), ...fila }).select().single()
        : supabase.from('infra_elements').update(fila).eq('id', elemento.id).select().single();
    const { data, error } = await consulta;
    if (error) throw falla(error, nuevo ? 'crear el elemento' : 'guardar el elemento');
    recordAudit([{ action: nuevo ? 'insert' : 'update', entityType: 'infra_element', entityId: data.id, entityName: data.name }]);
    return elementoDesdeDb(data);
}

// Dónde se usa un elemento del catálogo (para no borrar algo que está puesto)
export async function infraUsage(id) {
    const { data, error } = await supabase.from('map_items').select('map_id').eq('ref_id', id).in('kind', ['infra_point', 'infra_line']);
    if (error) throw falla(error, 'revisar dónde se usa');
    const porMapa = new Map();
    for (const r of data ?? []) porMapa.set(r.map_id, (porMapa.get(r.map_id) ?? 0) + 1);
    return porMapa;
}

export async function deleteInfra(elemento) {
    const { data, error } = await supabase.from('infra_elements').delete().eq('id', elemento.id).select('id');
    if (error) throw falla(error, 'eliminar el elemento');
    if (!data?.length) throw new Error('No tienes permiso para eliminar elementos.');
    recordAudit([{ action: 'delete', entityType: 'infra_element', entityId: elemento.id, entityName: elemento.name }]);
}

// ── Fotos de bastidores ─────────────────────────────────────────
export async function loadRackPhotos() {
    const { data, error } = await supabase.from('rack_photos').select('*');
    if (error) throw falla(error, 'cargar las fotos de bastidores');
    return new Map((data ?? []).map(f => [f.rack_id, f.path]));
}

export async function setRackPhoto(rackId, blob, anterior) {
    const path = await subirImagen(`racks/${rackId}/${genId()}.webp`, blob);
    const { error } = await supabase.from('rack_photos').upsert({ rack_id: rackId, path });
    if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw falla(error, 'guardar la foto del bastidor');
    }
    if (anterior) await supabase.storage.from(BUCKET).remove([anterior]);
    return path;
}

export async function removeRackPhoto(rackId, path) {
    const { error } = await supabase.from('rack_photos').delete().eq('rack_id', rackId);
    if (error) throw falla(error, 'quitar la foto');
    if (path) await supabase.storage.from(BUCKET).remove([path]);
}

// ── Imágenes ────────────────────────────────────────────────────
export async function subirImagen(path, blob) {
    const { error } = await supabase.storage.from(BUCKET)
        .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: false, cacheControl: '31536000' });
    if (error) throw falla(error, 'subir la imagen');
    return path;
}

export async function borrarImagenes(rutas) {
    const validas = rutas.filter(Boolean);
    if (!validas.length) return;
    const { error } = await supabase.storage.from(BUCKET).remove(validas);
    if (error) console.warn('[mapas] imágenes no borradas:', error.message);
}

// URLs firmadas (el bucket es privado). Duran 1 hora; se guardan en
// memoria para no pedir otra cada vez que se repinta una tarjeta.
const firmas = new Map();   // path → { url, vence }

export async function signedUrls(rutas) {
    const ahora = Date.now();
    const faltan = [...new Set(rutas.filter(Boolean))].filter(p => !(firmas.get(p)?.vence > ahora + 60000));
    if (faltan.length) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(faltan, 3600);
        if (error) throw falla(error, 'cargar las imágenes');
        for (const f of data ?? []) {
            if (f.signedUrl) firmas.set(f.path, { url: f.signedUrl, vence: ahora + 3600 * 1000 });
        }
    }
    return new Map(rutas.filter(Boolean).map(p => [p, firmas.get(p)?.url ?? null]));
}

export async function signedUrl(ruta) {
    return (await signedUrls([ruta])).get(ruta) ?? null;
}
