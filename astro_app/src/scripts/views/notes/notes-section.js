// ════════════════════════════════════════════════════════════════
//  APUNTES — carpetas + notas con editor estilo Microsoft Word + Canva
//  ─ Toolbar sticky con grupos lógicos
//  ─ Fuente, tamaño, alineación, color, resaltado, listas, headings
//  ─ Insertar tabla, divisor, checkbox, enlace
//  ─ Atajos completos de Word (Ctrl+B/I/U, etc.)
//
//  Aquí van las carpetas y la lista de notas. El editor está en
//  notes-editor.js (estructura) y notes-editor-acciones.js, y los
//  estilos en notes-styles.js.
// ════════════════════════════════════════════════════════════════
import { getState, listFolders, listNotes, updateSettings, createFolder, updateFolder, deleteFolder, createNote } from '../../notesStore.js';
import { escapeHtml, nwPrompt, toast, nwConfirm, formatDate } from './notesApp.js';
import { fijarCtx, _ctx } from './notes-estado.js';
import { renderEditor } from './notes-editor.js';
import { stripHtml } from './notes-editor-acciones.js';
import { injectStyles } from './notes-styles.js';

const FOLDER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#ef4444'];

export function renderApuntes(host) {
    host.innerHTML = `
        <div class="nws nws-apuntes">
            <!-- Tab flotante para restaurar paneles en modo enfocado -->
            <button class="ap-focus-restore" id="ap-focus-restore" title="Mostrar carpetas y notas">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <aside class="nws-side">
                <div class="nws-side-hdr">
                    <span class="nws-side-title">Carpetas</span>
                    <button class="nws-iconbtn" id="ap-new-folder" title="Nueva carpeta">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <div class="nws-side-list" id="ap-folders"></div>
            </aside>

            <section class="nws-side ap-notes-side">
                <div class="nws-side-hdr">
                    <div class="nws-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="ap-search" placeholder="Buscar notas...">
                    </div>
                    <button class="nws-iconbtn" id="ap-new-note" title="Nueva nota">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <div class="nws-side-list" id="ap-notes"></div>
            </section>

            <section class="nws-main">
                <div id="ap-editor" class="ap-editor-host"></div>
            </section>
        </div>
    `;

    injectStyles();

    fijarCtx({
        activeFolderId: getState().settings.activeFolderId,
        activeNoteId: getState().settings.activeNoteId,
        searchQuery: ''
    });

    document.getElementById('ap-new-folder').onclick = onNewFolder;
    document.getElementById('ap-new-note').onclick = onNewNote;
    document.getElementById('ap-search').oninput = e => {
        _ctx.searchQuery = e.target.value.toLowerCase();
        renderNotesList();
    };

    renderFoldersList();
    renderNotesList();
    renderEditor();

    // Se entra siempre por la lista, aunque quedara una nota abierta de la
    // sesión anterior: abrir el editor de golpe desorienta.
    setEditing(false);
}

// ── Folders ─────────────────────────────────────────────────────
function renderFoldersList() {
    const host = document.getElementById('ap-folders');
    const folders = listFolders();
    if (!folders.length) {
        host.innerHTML = '<div class="ap-side-empty">Crea tu primera carpeta</div>';
        return;
    }
    host.innerHTML = folders.map(f => {
        const count = listNotes(f.id).length;
        const active = f.id === _ctx.activeFolderId ? 'active' : '';
        return `
            <div class="ap-folder ${active}" data-id="${f.id}" style="--c:${f.color}">
                <span class="ap-folder-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </span>
                <span class="ap-folder-name">${escapeHtml(f.name)}</span>
                <span class="ap-folder-count">${count}</span>
                <button class="ap-folder-edit" data-edit="${f.id}" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
            </div>
        `;
    }).join('');

    host.querySelectorAll('.ap-folder').forEach(el => {
        el.onclick = e => {
            if (e.target.closest('.ap-folder-edit')) return;
            selectFolder(el.dataset.id);
        };
    });
    host.querySelectorAll('.ap-folder-edit').forEach(btn => {
        btn.onclick = e => { e.stopPropagation(); openFolderEditor(btn.dataset.edit); };
    });
}

function selectFolder(id) {
    _ctx.activeFolderId = id;
    _ctx.activeNoteId = null;
    updateSettings({ activeFolderId: id, activeNoteId: null });
    renderFoldersList();
    renderNotesList();
    renderEditor();
}

async function onNewFolder() {
    const name = await nwPrompt({
        title: 'Nueva carpeta',
        icon: 'folder',
        label: 'Nombre',
        placeholder: 'Mi nueva carpeta',
        okText: 'Crear carpeta'
    });
    if (!name) return;
    const color = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];
    const f = createFolder({ name: name.trim(), color });
    selectFolder(f.id);
    toast('Carpeta creada', 'success');
}

function openFolderEditor(id) {
    const folder = listFolders().find(f => f.id === id);
    if (!folder) return;
    const dlg = buildFolderDialog(folder);
    document.body.appendChild(dlg);
    requestAnimationFrame(() => dlg.classList.add('show'));
}

function buildFolderDialog(folder) {
    const overlay = document.createElement('div');
    overlay.className = 'ap-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) close(); };

    overlay.innerHTML = `
        <div class="ap-modal">
            <div class="ap-modal-hdr">
                <h3>Editar carpeta</h3>
                <button class="nws-iconbtn" id="apm-close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="ap-modal-body">
                <label class="ap-field">
                    <span class="ap-field-lbl">Nombre</span>
                    <input type="text" id="apm-name" value="${escapeHtml(folder.name)}">
                </label>
                <div class="ap-field">
                    <span class="ap-field-lbl">Color</span>
                    <div class="ap-color-grid">
                        ${FOLDER_COLORS.map(c => `
                            <button class="ap-color-dot ${c === folder.color ? 'active' : ''}" data-c="${c}" style="background:${c}"></button>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="ap-modal-ftr">
                <button class="nws-btn danger" id="apm-delete">Eliminar</button>
                <div style="flex:1"></div>
                <button class="nws-btn" id="apm-cancel">Cancelar</button>
                <button class="nws-btn primary" id="apm-save">Guardar</button>
            </div>
        </div>
    `;

    let chosenColor = folder.color;
    overlay.querySelectorAll('.ap-color-dot').forEach(b => {
        b.onclick = () => {
            chosenColor = b.dataset.c;
            overlay.querySelectorAll('.ap-color-dot').forEach(x => x.classList.toggle('active', x === b));
        };
    });

    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 220); };

    overlay.querySelector('#apm-close').onclick = close;
    overlay.querySelector('#apm-cancel').onclick = close;
    overlay.querySelector('#apm-save').onclick = () => {
        const name = overlay.querySelector('#apm-name').value.trim();
        if (!name) return;
        updateFolder(folder.id, { name, color: chosenColor });
        close();
        renderFoldersList();
        toast('Carpeta actualizada', 'success');
    };
    overlay.querySelector('#apm-delete').onclick = async () => {
        const ok = await nwConfirm({
            title: 'Eliminar carpeta',
            message: `¿Eliminar la carpeta "${folder.name}"? Las notas se moverán a otra carpeta.`,
            okText: 'Eliminar',
            danger: true,
            icon: 'trash'
        });
        if (!ok) return;
        deleteFolder(folder.id);
        close();
        if (_ctx.activeFolderId === folder.id) selectFolder(listFolders()[0]?.id || null);
        else { renderFoldersList(); renderNotesList(); }
        toast('Carpeta eliminada', 'success');
    };
    return overlay;
}

// ── Notes list ──────────────────────────────────────────────────
export function renderNotesList() {
    const host = document.getElementById('ap-notes');
    let notes = listNotes(_ctx.activeFolderId);
    if (_ctx.searchQuery) {
        notes = notes.filter(n =>
            (n.title || '').toLowerCase().includes(_ctx.searchQuery) ||
            (n.content || '').toLowerCase().includes(_ctx.searchQuery) ||
            (n.tags || []).some(t => t.toLowerCase().includes(_ctx.searchQuery))
        );
    }
    notes.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || new Date(b.updatedAt) - new Date(a.updatedAt));

    if (!notes.length) {
        host.innerHTML = `<div class="ap-side-empty">${_ctx.searchQuery ? 'Sin resultados' : 'No hay notas aún'}</div>`;
        return;
    }

    host.innerHTML = notes.map(n => {
        const active = n.id === _ctx.activeNoteId ? 'active' : '';
        const snippet = stripHtml(n.content).slice(0, 70);
        return `
            <div class="ap-note-card ${active}" data-id="${n.id}">
                <div class="ap-note-row1">
                    ${n.starred ? '<span class="ap-star">★</span>' : ''}
                    <span class="ap-note-title">${escapeHtml(n.title || 'Sin título')}</span>
                </div>
                <div class="ap-note-snippet">${escapeHtml(snippet) || '<i>Nota vacía</i>'}</div>
                <div class="ap-note-meta">
                    <span class="ap-note-date">${formatDate(n.updatedAt)}</span>
                    ${(n.tags || []).slice(0, 2).map(t => `<span class="nws-tag">#${escapeHtml(t)}</span>`).join('')}
                </div>
            </div>
        `;
    }).join('');

    host.querySelectorAll('.ap-note-card').forEach(el => {
        el.onclick = () => selectNote(el.dataset.id);
    });
}

// En teléfono la vista funciona por niveles (lista → editor), como una app
// de notas. Esta clase es la que decide cuál se ve; en escritorio no hace
// nada, porque los tres paneles conviven.
export function setEditing(on) {
    document.querySelector('.nws-apuntes')?.classList.toggle('ap-editing', on);
    // El editor a pantalla completa vive fuera del árbol de Notas, así que
    // la clase va en <body>: desde ahí se oculta el botón flotante de
    // navegación y se bloquea el scroll de la página de detrás.
    document.body.classList.toggle('ap-fullscreen', on);
}

export function backToList() {
    setEditing(false);
}

function selectNote(id) {
    _ctx.activeNoteId = id;
    updateSettings({ activeNoteId: id });
    renderNotesList();
    renderEditor();
    setEditing(true);
}

function onNewNote() {
    if (!_ctx.activeFolderId) {
        toast('Crea una carpeta primero', 'warning');
        return;
    }
    const note = createNote({ folderId: _ctx.activeFolderId, title: 'Nueva nota' });
    selectNote(note.id);
    setTimeout(() => document.querySelector('#ap-title')?.focus(), 50);
}
