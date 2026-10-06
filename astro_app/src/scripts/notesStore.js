// ════════════════════════════════════════════════════════════════
//  NOTES WORKSPACE STORE — Supabase backend
//
//  Estrategia: actualizaciones optimistas.
//  ─ La caché en memoria se actualiza de forma síncrona (respuesta
//    inmediata en la UI).
//  ─ Supabase se sincroniza en segundo plano (fire-and-forget).
//  ─ Si Supabase falla, el dato ya está en caché para esta sesión.
//
//  Tablas: notes_folders · notes_notes · notes_credentials
//          notes_commands · notes_drawings
// ════════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';
import { toastError } from './toast.js';

// ── Settings de UI — siguen en localStorage (son estado de UI) ──
const SETTINGS_KEY = 'databox_notes_settings_v1';
const DEFAULT_SETTINGS = {
    activeSection:    'apuntes',
    activeFolderId:   null,
    activeNoteId:     null,
    activeDrawingId:  null
};

// ── Caché en memoria ─────────────────────────────────────────────
let _cache = {
    folders:     [],
    notes:       [],
    credentials: [],
    commands:    [],
    drawings:    [],
    settings:    { ...DEFAULT_SETTINGS }
};

let _userId = null;
const _listeners = new Set();

// ── Utilidades ───────────────────────────────────────────────────
export function genId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
export function nowISO() { return new Date().toISOString(); }

function notify() {
    _listeners.forEach(fn => { try { fn(_cache); } catch (e) { console.error(e); } });
}

export function subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}

// ── Settings ─────────────────────────────────────────────────────
function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
}

export function getState() { return _cache; }

export function updateSettings(patch) {
    _cache.settings = { ..._cache.settings, ...patch };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(_cache.settings)); } catch {}
    notify();
}

// ════════════════════════════════════════════════════════════════
//  INIT — carga todo desde Supabase al arrancar la sección
// ════════════════════════════════════════════════════════════════
// Devuelve { ok: true } o { ok: false, reason: 'no-session' | 'load-failed' }.
// El caller DEBE comprobarlo: renderizar el workspace sin sesión le hace creer
// al usuario que no tiene nada guardado, y todo lo que escriba ahí se perderá
// al recargar porque los inserts los rechaza RLS.
export async function initNotesStore() {
    _cache.settings = loadSettings();

    let session = null;
    try {
        const { data } = await supabase.auth.getSession();
        session = data?.session ?? null;
    } catch (err) {
        console.error('[notesStore] No se pudo verificar la sesión:', err);
        return { ok: false, reason: 'load-failed', detail: err?.message };
    }

    if (!session?.user) {
        console.warn('[notesStore] No hay sesión activa');
        return { ok: false, reason: 'no-session' };
    }
    _userId = session.user.id;

    let fRes, nRes, cRes, cmdRes, dRes;
    try {
        [fRes, nRes, cRes, cmdRes, dRes] = await Promise.all([
            supabase.from('notes_folders')     .select('*').eq('user_id', _userId).order('created_at'),
            supabase.from('notes_notes')       .select('*').eq('user_id', _userId).order('updated_at', { ascending: false }),
            supabase.from('notes_credentials') .select('*').eq('user_id', _userId).order('updated_at', { ascending: false }),
            supabase.from('notes_commands')    .select('*').eq('user_id', _userId).order('updated_at', { ascending: false }),
            supabase.from('notes_drawings')    .select('*').eq('user_id', _userId).order('updated_at', { ascending: false })
        ]);
    } catch (err) {
        console.error('[notesStore] Fallo al cargar el workspace:', err);
        return { ok: false, reason: 'load-failed', detail: err?.message };
    }

    // Si falla la lectura de UNA tabla avisamos pero seguimos: el resto del
    // workspace sí puede mostrarse.
    const readError = [fRes, nRes, cRes, cmdRes, dRes].find(r => r?.error)?.error;
    if (readError) {
        console.error('[notesStore] Error al leer el workspace:', readError.message);
        toastError('Parte del workspace no se pudo cargar desde el servidor.', {
            title: 'Carga incompleta', detail: readError.message
        });
    }

    _cache.folders     = (fRes.data   || []).map(folderFromDb);
    _cache.notes       = (nRes.data   || []).map(noteFromDb);
    _cache.credentials = (cRes.data   || []).map(credFromDb);
    _cache.commands    = (cmdRes.data || []).map(cmdFromDb);
    _cache.drawings    = (dRes.data   || []).map(drawFromDb);

    // Primera vez: crear carpeta General
    if (!_cache.folders.length) {
        const f = { id: genId('f-'), name: 'General', color: '#3b82f6', parentId: null, createdAt: nowISO() };
        const { error } = await supabase.from('notes_folders').insert(folderToDb(f));
        if (!error) _cache.folders.push(f);
    }

    // Activar primera carpeta si no hay ninguna seleccionada
    if (!_cache.settings.activeFolderId && _cache.folders.length) {
        _cache.settings.activeFolderId = _cache.folders[0].id;
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(_cache.settings)); } catch {}
    }

    notify();
    return { ok: true };
}

// ════════════════════════════════════════════════════════════════
//  MAPPERS DB ↔ JS
// ════════════════════════════════════════════════════════════════
function folderFromDb(r) {
    return { id: r.id, name: r.name, color: r.color, parentId: r.parent_id, createdAt: r.created_at };
}
function folderToDb(f) {
    return { id: f.id, user_id: _userId, name: f.name, color: f.color || '#3b82f6', parent_id: f.parentId || null, updated_at: nowISO() };
}

function noteFromDb(r) {
    return { id: r.id, folderId: r.folder_id, title: r.title, content: r.content || '', tags: r.tags || [], starred: r.starred || false, createdAt: r.created_at, updatedAt: r.updated_at };
}
function noteToDb(n) {
    return { id: n.id, user_id: _userId, folder_id: n.folderId || null, title: n.title, content: n.content || '', tags: n.tags || [], starred: n.starred || false, updated_at: nowISO() };
}

function credFromDb(r) {
    return { id: r.id, category: r.category, name: r.name, username: r.username, passwordEnc: r.password_enc, url: r.url, notes: r.notes, tags: r.tags || [], createdAt: r.created_at, updatedAt: r.updated_at };
}
function credToDb(c) {
    return { id: c.id, user_id: _userId, category: c.category, name: c.name, username: c.username, password_enc: c.passwordEnc, url: c.url, notes: c.notes, tags: c.tags || [], updated_at: nowISO() };
}

function cmdFromDb(r) {
    return { id: r.id, category: r.category, title: r.title, command: r.command, description: r.description, tags: r.tags || [], useCount: r.use_count || 0, createdAt: r.created_at, updatedAt: r.updated_at };
}
function cmdToDb(c) {
    return { id: c.id, user_id: _userId, category: c.category, title: c.title, command: c.command, description: c.description, tags: c.tags || [], use_count: c.useCount || 0, updated_at: nowISO() };
}

function drawFromDb(r) {
    return { id: r.id, name: r.name, data: r.data || { shapes: [], gridSize: 20, showGrid: true }, thumbnail: r.thumbnail, createdAt: r.created_at, updatedAt: r.updated_at };
}
function drawToDb(d) {
    return { id: d.id, user_id: _userId, name: d.name, data: d.data, thumbnail: d.thumbnail || null, updated_at: nowISO() };
}

// ── Helper para sync en segundo plano ─────────────────────────────
// Ya no es silencioso: un insert rechazado (RLS, sesión vencida, red) dejaba
// el dato solo en la caché de esta pestaña y el usuario lo perdía al recargar
// sin ningún aviso.
function reportSyncFailure(reason) {
    console.error('[notesStore] sync error:', reason);
    toastError(
        'No se pudo guardar en el servidor. El cambio sigue visible aquí, pero se perderá al recargar.',
        { title: 'Error al guardar', detail: reason }
    );
}

function bg(promise) {
    promise.then(({ error }) => {
        if (error) reportSyncFailure(error.message);
    }).catch(err => reportSyncFailure(err?.message ?? String(err)));
}

// ════════════════════════════════════════════════════════════════
//  FOLDERS
// ════════════════════════════════════════════════════════════════
export function listFolders() { return _cache.folders.slice(); }

export function createFolder({ name, color = '#3b82f6', parentId = null }) {
    const folder = { id: genId('f-'), name, color, parentId, createdAt: nowISO() };
    _cache.folders.push(folder);
    notify();
    bg(supabase.from('notes_folders').insert(folderToDb(folder)));
    return folder;
}

export function updateFolder(id, patch) {
    const f = _cache.folders.find(x => x.id === id);
    if (!f) return null;
    Object.assign(f, patch);
    notify();
    bg(supabase.from('notes_folders').update(folderToDb(f)).eq('id', id).eq('user_id', _userId));
    return f;
}

export function deleteFolder(id) {
    _cache.folders = _cache.folders.filter(f => f.id !== id);
    const fallback = _cache.folders[0]?.id || null;
    _cache.notes.forEach(n => { if (n.folderId === id) n.folderId = fallback; });
    notify();
    bg(supabase.from('notes_folders').delete().eq('id', id).eq('user_id', _userId));
}

// ════════════════════════════════════════════════════════════════
//  NOTES
// ════════════════════════════════════════════════════════════════
export function listNotes(folderId = null) {
    return folderId ? _cache.notes.filter(n => n.folderId === folderId) : _cache.notes.slice();
}

export function getNote(id) {
    return _cache.notes.find(n => n.id === id) || null;
}

export function createNote({ folderId, title = 'Nueva nota', content = '', tags = [] }) {
    const note = { id: genId('n-'), folderId: folderId || _cache.folders[0]?.id || null, title, content, tags, starred: false, createdAt: nowISO(), updatedAt: nowISO() };
    _cache.notes.unshift(note);
    notify();
    bg(supabase.from('notes_notes').insert(noteToDb(note)));
    return note;
}

export function updateNote(id, patch) {
    const n = _cache.notes.find(x => x.id === id);
    if (!n) return null;
    Object.assign(n, patch, { updatedAt: nowISO() });
    notify();
    bg(supabase.from('notes_notes').update(noteToDb(n)).eq('id', id).eq('user_id', _userId));
    return n;
}

export function deleteNote(id) {
    _cache.notes = _cache.notes.filter(n => n.id !== id);
    if (_cache.settings.activeNoteId === id) _cache.settings.activeNoteId = null;
    notify();
    bg(supabase.from('notes_notes').delete().eq('id', id).eq('user_id', _userId));
}

// ════════════════════════════════════════════════════════════════
//  CREDENTIALS (bóveda)
// ════════════════════════════════════════════════════════════════
function encodePwd(pwd) {
    try { return btoa(unescape(encodeURIComponent(pwd || ''))); } catch { return ''; }
}
function decodePwd(enc) {
    try { return decodeURIComponent(escape(atob(enc || ''))); } catch { return ''; }
}

export function listCredentials() { return _cache.credentials.slice(); }

export function getCredential(id) {
    const c = _cache.credentials.find(x => x.id === id);
    if (!c) return null;
    return { ...c, password: decodePwd(c.passwordEnc) };
}

export function createCredential({ category = 'general', name, username = '', password = '', url = '', notes = '', tags = [] }) {
    const cred = { id: genId('c-'), category, name, username, passwordEnc: encodePwd(password), url, notes, tags, createdAt: nowISO(), updatedAt: nowISO() };
    _cache.credentials.unshift(cred);
    notify();
    bg(supabase.from('notes_credentials').insert(credToDb(cred)));
    return cred;
}

export function updateCredential(id, patch) {
    const c = _cache.credentials.find(x => x.id === id);
    if (!c) return null;
    if ('password' in patch) { c.passwordEnc = encodePwd(patch.password); delete patch.password; }
    Object.assign(c, patch, { updatedAt: nowISO() });
    notify();
    bg(supabase.from('notes_credentials').update(credToDb(c)).eq('id', id).eq('user_id', _userId));
    return c;
}

export function deleteCredential(id) {
    _cache.credentials = _cache.credentials.filter(c => c.id !== id);
    notify();
    bg(supabase.from('notes_credentials').delete().eq('id', id).eq('user_id', _userId));
}

// ════════════════════════════════════════════════════════════════
//  COMMANDS
// ════════════════════════════════════════════════════════════════
export function listCommands() { return _cache.commands.slice(); }

export function createCommand({ category = 'general', title, command, description = '', tags = [] }) {
    const cmd = { id: genId('cmd-'), category, title, command, description, tags, useCount: 0, createdAt: nowISO(), updatedAt: nowISO() };
    _cache.commands.unshift(cmd);
    notify();
    bg(supabase.from('notes_commands').insert(cmdToDb(cmd)));
    return cmd;
}

export function updateCommand(id, patch) {
    const c = _cache.commands.find(x => x.id === id);
    if (!c) return null;
    Object.assign(c, patch, { updatedAt: nowISO() });
    notify();
    bg(supabase.from('notes_commands').update(cmdToDb(c)).eq('id', id).eq('user_id', _userId));
    return c;
}

export function incrementCommandUse(id) {
    const c = _cache.commands.find(x => x.id === id);
    if (!c) return;
    c.useCount = (c.useCount || 0) + 1;
    bg(supabase.from('notes_commands').update({ use_count: c.useCount, updated_at: nowISO() }).eq('id', id).eq('user_id', _userId));
}

export function deleteCommand(id) {
    _cache.commands = _cache.commands.filter(c => c.id !== id);
    notify();
    bg(supabase.from('notes_commands').delete().eq('id', id).eq('user_id', _userId));
}

// ════════════════════════════════════════════════════════════════
//  DRAWINGS
// ════════════════════════════════════════════════════════════════
export function listDrawings() {
    return _cache.drawings.map(d => ({
        id: d.id, name: d.name, createdAt: d.createdAt, updatedAt: d.updatedAt,
        thumbnail: d.thumbnail || null,
        shapesCount: (d.data?.shapes || []).length
    }));
}

export function getDrawing(id) {
    return _cache.drawings.find(d => d.id === id) || null;
}

export function createDrawing({ name = 'Plano sin título' } = {}) {
    const dr = { id: genId('dr-'), name, data: { shapes: [], gridSize: 20, showGrid: true }, thumbnail: null, createdAt: nowISO(), updatedAt: nowISO() };
    _cache.drawings.unshift(dr);
    notify();
    bg(supabase.from('notes_drawings').insert(drawToDb(dr)));
    return dr;
}

export function updateDrawing(id, patch) {
    const d = _cache.drawings.find(x => x.id === id);
    if (!d) return null;
    Object.assign(d, patch, { updatedAt: nowISO() });
    notify();
    bg(supabase.from('notes_drawings').update(drawToDb(d)).eq('id', id).eq('user_id', _userId));
    return d;
}

export function deleteDrawing(id) {
    _cache.drawings = _cache.drawings.filter(d => d.id !== id);
    if (_cache.settings.activeDrawingId === id) _cache.settings.activeDrawingId = null;
    notify();
    bg(supabase.from('notes_drawings').delete().eq('id', id).eq('user_id', _userId));
}

// ════════════════════════════════════════════════════════════════
//  SEARCH GLOBAL
// ════════════════════════════════════════════════════════════════
export function globalSearch(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return { notes: [], credentials: [], commands: [] };
    return {
        notes: _cache.notes.filter(n =>
            (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) ||
            (n.tags || []).some(t => t.toLowerCase().includes(q))
        ),
        credentials: _cache.credentials.filter(c =>
            (c.name || '').toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q) ||
            (c.url || '').toLowerCase().includes(q)
        ),
        commands: _cache.commands.filter(c =>
            (c.title || '').toLowerCase().includes(q) || (c.command || '').toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q)
        )
    };
}

// ════════════════════════════════════════════════════════════════
//  EXPORT JSON (descarga backup local)
// ════════════════════════════════════════════════════════════════
export function exportData() {
    return JSON.stringify({
        folders: _cache.folders,
        notes: _cache.notes,
        credentials: _cache.credentials,
        commands: _cache.commands,
        drawings: _cache.drawings
    }, null, 2);
}
