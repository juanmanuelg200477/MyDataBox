// ════════════════════════════════════════════════════════════════
//  APUNTES — carpetas + notas con editor estilo Microsoft Word + Canva
//  ─ Toolbar sticky con grupos lógicos
//  ─ Fuente, tamaño, alineación, color, resaltado, listas, headings
//  ─ Insertar tabla, divisor, checkbox, enlace
//  ─ Atajos completos de Word (Ctrl+B/I/U, etc.)
// ════════════════════════════════════════════════════════════════

import {
    getState, updateSettings,
    listFolders, createFolder, updateFolder, deleteFolder,
    listNotes, getNote, createNote, updateNote, deleteNote
} from '../../notesStore.js';
import { escapeHtml, formatDate, toast, nwPrompt, nwConfirm } from './notesApp.js';

const FOLDER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#ef4444'];

const FONTS = [
    { v: 'DM Sans, sans-serif', n: 'DM Sans (predet.)' },
    { v: 'Inter, sans-serif', n: 'Inter' },
    { v: 'Georgia, serif', n: 'Georgia' },
    { v: 'Times New Roman, serif', n: 'Times New Roman' },
    { v: 'Arial, sans-serif', n: 'Arial' },
    { v: 'Verdana, sans-serif', n: 'Verdana' },
    { v: 'Courier New, monospace', n: 'Courier New' },
    { v: 'JetBrains Mono, monospace', n: 'JetBrains Mono' }
];

const FONT_SIZES = [
    { v: 1, n: '10' },
    { v: 2, n: '12' },
    { v: 3, n: '14' },
    { v: 4, n: '16' },
    { v: 5, n: '20' },
    { v: 6, n: '24' },
    { v: 7, n: '32' }
];

const TEXT_COLORS = [
    '#0f172a', '#475569', '#94a3b8', '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#10b981', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#ec4899', '#f43f5e'
];

const HIGHLIGHT_COLORS = [
    'transparent', '#fef3c7', '#fce7f3', '#dbeafe',
    '#dcfce7', '#fee2e2', '#e0e7ff', '#fed7aa',
    '#cffafe', '#fae8ff'
];

let _ctx = null;

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

    _ctx = {
        activeFolderId: getState().settings.activeFolderId,
        activeNoteId: getState().settings.activeNoteId,
        searchQuery: ''
    };

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
function renderNotesList() {
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
function setEditing(on) {
    document.querySelector('.nws-apuntes')?.classList.toggle('ap-editing', on);
    // El editor a pantalla completa vive fuera del árbol de Notas, así que
    // la clase va en <body>: desde ahí se oculta el botón flotante de
    // navegación y se bloquea el scroll de la página de detrás.
    document.body.classList.toggle('ap-fullscreen', on);
}

function backToList() {
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

// ════════════════════════════════════════════════════════════════
//  EDITOR estilo Microsoft Word + Canva
// ════════════════════════════════════════════════════════════════
function renderEditor() {
    const host = document.getElementById('ap-editor');
    if (!_ctx.activeNoteId) {
        // Sin nota (p. ej. recién borrada) se vuelve a la lista en teléfono
        setEditing(false);
        host.innerHTML = `
            <div class="nws-empty">
                <div class="nws-empty-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div class="nws-empty-title">Selecciona o crea una nota</div>
                <div class="nws-empty-sub">Tus apuntes se guardan automáticamente. Usa la barra de herramientas para dar formato.</div>
            </div>
        `;
        return;
    }

    const note = getNote(_ctx.activeNoteId);
    if (!note) { host.innerHTML = ''; return; }

    host.innerHTML = `
        <div class="ap-editor">
            <!-- Cabecera con título + estrella + eliminar -->
            <header class="ap-editor-top">
                <button class="nws-iconbtn ap-back-btn" id="ap-back" title="Cerrar y volver a las notas" aria-label="Cerrar y volver a las notas">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <button class="nws-iconbtn ap-focus-btn" id="ap-focus" title="Modo enfocado (ocultar/mostrar paneles)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                </button>
                <input type="text" id="ap-title" class="ap-editor-title" value="${escapeHtml(note.title)}" placeholder="Título de tu nota...">
                <div class="ap-editor-actions">
                    <button class="nws-iconbtn ${note.starred ? 'starred' : ''}" id="ap-star" title="Destacar">
                        <svg viewBox="0 0 24 24" fill="${note.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                    <button class="nws-iconbtn danger" id="ap-delete" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </header>

            <!-- ÁREA SCROLLABLE: tags + toolbar (sticky) + contenido -->
            <div class="ap-scroll-area">

            <!-- Tags row -->
            <div class="ap-tags-row">
                <span class="ap-tags-lbl">Etiquetas</span>
                <span id="ap-tags-list"></span>
                <input type="text" id="ap-tags-input" placeholder="+ añadir">
            </div>

            <!-- TOOLBAR sticky con grupos lógicos -->
            <div class="ap-toolbar-wrap">
                <div class="ap-toolbar">

                    <!-- ─── Fuente + tamaño ─── -->
                    <div class="ap-tg">
                        <select class="ap-tb-select ap-tb-font" id="ap-font" title="Fuente">
                            ${FONTS.map(f => `<option value="${f.v}">${f.n}</option>`).join('')}
                        </select>
                        <select class="ap-tb-select ap-tb-size" id="ap-size" title="Tamaño">
                            ${FONT_SIZES.map(s => `<option value="${s.v}" ${s.v === 3 ? 'selected' : ''}>${s.n}</option>`).join('')}
                        </select>
                    </div>

                    <span class="ap-tb-sep"></span>

                    <!-- ─── Estilo de carácter ─── -->
                    <div class="ap-tg">
                        <button class="ap-tb-btn" data-cmd="bold" title="Negrita (Ctrl+B)"><b>B</b></button>
                        <button class="ap-tb-btn" data-cmd="italic" title="Cursiva (Ctrl+I)"><i>I</i></button>
                        <button class="ap-tb-btn" data-cmd="underline" title="Subrayado (Ctrl+U)"><u>U</u></button>
                        <button class="ap-tb-btn" data-cmd="strikeThrough" title="Tachado"><s>S</s></button>
                        <button class="ap-tb-btn ap-tb-mini" data-cmd="superscript" title="Superíndice">X²</button>
                        <button class="ap-tb-btn ap-tb-mini" data-cmd="subscript" title="Subíndice">X₂</button>
                    </div>

                    <span class="ap-tb-sep"></span>

                    <!-- ─── Colores ─── -->
                    <div class="ap-tg">
                        <div class="ap-tb-color" id="ap-color-text" title="Color del texto">
                            <span class="ap-tb-color-ico">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                                <span class="ap-tb-color-bar" style="background:#ef4444"></span>
                            </span>
                            <svg class="ap-tb-color-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                            <div class="ap-tb-color-pop">
                                ${TEXT_COLORS.map(c => `<button data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
                            </div>
                        </div>
                        <div class="ap-tb-color" id="ap-color-hl" title="Resaltado">
                            <span class="ap-tb-color-ico">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
                                <span class="ap-tb-color-bar" style="background:#fef3c7"></span>
                            </span>
                            <svg class="ap-tb-color-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                            <div class="ap-tb-color-pop">
                                ${HIGHLIGHT_COLORS.map(c => `<button data-color="${c}" style="background:${c === 'transparent' ? 'repeating-linear-gradient(45deg,#e2e8f0 0,#e2e8f0 3px,#fff 3px,#fff 6px)' : c}" title="${c}"></button>`).join('')}
                            </div>
                        </div>
                    </div>

                    <span class="ap-tb-sep"></span>

                    <!-- ─── Bloque / Headings ─── -->
                    <div class="ap-tg">
                        <select class="ap-tb-select ap-tb-block" id="ap-block" title="Estilo de bloque">
                            <option value="p">Párrafo</option>
                            <option value="h1">Título 1</option>
                            <option value="h2">Título 2</option>
                            <option value="h3">Título 3</option>
                            <option value="h4">Título 4</option>
                            <option value="blockquote">Cita</option>
                            <option value="pre">Código</option>
                        </select>
                    </div>

                    <span class="ap-tb-sep"></span>

                    <!-- ─── Alineación ─── -->
                    <div class="ap-tg">
                        <button class="ap-tb-btn" data-cmd="justifyLeft" title="Alinear a la izquierda">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="justifyCenter" title="Centrar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="justifyRight" title="Alinear a la derecha">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="justifyFull" title="Justificar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
                        </button>
                    </div>

                    <span class="ap-tb-sep"></span>

                    <!-- ─── Listas ─── -->
                    <div class="ap-tg">
                        <button class="ap-tb-btn" data-cmd="insertUnorderedList" title="Lista con viñetas">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="insertOrderedList" title="Lista numerada">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-action="checklist" title="Lista de tareas">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="outdent" title="Disminuir sangría">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="indent" title="Aumentar sangría">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                        </button>
                    </div>

                    <span class="ap-tb-sep"></span>

                    <!-- ─── Insertar ─── -->
                    <div class="ap-tg">
                        <button class="ap-tb-btn" data-action="link" title="Insertar enlace (Ctrl+K)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-action="table" title="Insertar tabla">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="insertHorizontalRule" title="Insertar divisor">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                    </div>

                    <span class="ap-tb-sep"></span>

                    <!-- ─── Utilidades ─── -->
                    <div class="ap-tg">
                        <button class="ap-tb-btn" data-cmd="undo" title="Deshacer (Ctrl+Z)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="redo" title="Rehacer (Ctrl+Y)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        </button>
                        <button class="ap-tb-btn" data-cmd="removeFormat" title="Quitar formato">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4L8 20"/><line x1="18" y1="14" x2="22" y2="18"/><line x1="22" y1="14" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- CONTENIDO editable -->
            <div id="ap-content" class="ap-content" contenteditable="true" spellcheck="true"></div>

            </div><!-- /.ap-scroll-area -->

            <!-- FOOTER -->
            <footer class="ap-editor-foot">
                <span id="ap-savestate"><span class="ap-save-dot"></span> Sincronizado · ${formatDate(note.updatedAt)}</span>
                <span class="ap-foot-sep">·</span>
                <span id="ap-wordcount">0 palabras</span>
                <span class="ap-foot-sep">·</span>
                <span id="ap-charcount">0 caracteres</span>
            </footer>
        </div>
    `;

    initEditor(note);
}

// ── Initialize editor logic ─────────────────────────────────────
function initEditor(note) {
    const titleEl = document.getElementById('ap-title');
    const contentEl = document.getElementById('ap-content');
    const saveStateEl = document.getElementById('ap-savestate');
    const wcEl = document.getElementById('ap-wordcount');
    const ccEl = document.getElementById('ap-charcount');

    // Tags
    const tagsListEl = document.getElementById('ap-tags-list');
    const tagsInputEl = document.getElementById('ap-tags-input');
    const renderTags = () => {
        const n = getNote(_ctx.activeNoteId);
        tagsListEl.innerHTML = (n?.tags || []).map((t, i) => `
            <span class="ap-tag">#${escapeHtml(t)} <button data-rm="${i}">×</button></span>
        `).join('');
        tagsListEl.querySelectorAll('button[data-rm]').forEach(b => {
            b.onclick = () => {
                const idx = +b.dataset.rm;
                const nn = getNote(_ctx.activeNoteId);
                const tags = nn.tags.slice();
                tags.splice(idx, 1);
                updateNote(_ctx.activeNoteId, { tags });
                renderTags(); renderNotesList();
            };
        });
    };
    renderTags();
    tagsInputEl.onkeydown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const v = tagsInputEl.value.trim();
            if (!v) return;
            const n = getNote(_ctx.activeNoteId);
            const tags = [...(n.tags || []), v];
            updateNote(_ctx.activeNoteId, { tags });
            tagsInputEl.value = '';
            renderTags(); renderNotesList();
        }
    };

    // Content
    contentEl.innerHTML = note.content || '';
    updateCounts();

    // Detectar scroll para sombra reforzada de la toolbar sticky
    const scrollArea = document.querySelector('.ap-scroll-area');
    if (scrollArea) {
        scrollArea.addEventListener('scroll', () => {
            scrollArea.classList.toggle('scrolled', scrollArea.scrollTop > 8);
        }, { passive: true });
    }

    // Auto-save
    let saveTimer = null;
    const queueSave = () => {
        clearTimeout(saveTimer);
        saveStateEl.innerHTML = '<span class="ap-save-dot saving"></span> Guardando…';
        saveTimer = setTimeout(() => {
            updateNote(_ctx.activeNoteId, {
                title: titleEl.value || 'Sin título',
                content: contentEl.innerHTML
            });
            saveStateEl.innerHTML = '<span class="ap-save-dot"></span> Sincronizado · ahora';
            renderNotesList();
        }, 500);
    };

    titleEl.addEventListener('input', queueSave);
    contentEl.addEventListener('input', () => { queueSave(); updateCounts(); });

    function updateCounts() {
        const txt = stripHtml(contentEl.innerHTML).trim();
        const words = txt ? txt.split(/\s+/).length : 0;
        wcEl.textContent = `${words} palabra${words !== 1 ? 's' : ''}`;
        ccEl.textContent = `${txt.length} caracteres`;
    }

    // ── Toolbar interactions ──

    // 1) Preservar selección al hacer click en la toolbar.
    //    Sin esto, contenteditable pierde el foco/selección cuando
    //    pulsamos botones (como pasa con el selector de color).
    //    Exceptuamos <select> e <input> porque NECESITAN foco para
    //    abrir sus dropdowns nativos.
    const toolbarWrap = document.querySelector('.ap-toolbar-wrap');
    if (toolbarWrap) {
        toolbarWrap.addEventListener('mousedown', e => {
            if (e.target.matches('select, option, input, textarea')) return;
            e.preventDefault();
        });
    }

    // 2) Backup: guardamos el último Range válido dentro del editor
    //    y lo restauramos antes de cada exec para máxima fiabilidad
    //    (e.g. cuando un selector de la toolbar sí cambia el foco).
    let savedRange = null;
    const trackSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0);
            if (contentEl.contains(r.commonAncestorContainer)) {
                savedRange = r.cloneRange();
            }
        }
    };
    contentEl.addEventListener('keyup', trackSelection);
    contentEl.addEventListener('mouseup', trackSelection);
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === contentEl) trackSelection();
    });

    const restoreSelection = () => {
        if (!savedRange) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
    };

    const exec = (cmd, val = null) => {
        // Asegurar foco + selección antes de ejecutar el comando
        contentEl.focus();
        restoreSelection();
        document.execCommand(cmd, false, val);
        trackSelection(); // re-trackear por si la operación movió el cursor
        queueSave();
    };

    // Botones simples
    document.querySelectorAll('.ap-tb-btn[data-cmd]').forEach(btn => {
        btn.onclick = e => { e.preventDefault(); exec(btn.dataset.cmd); };
    });

    // Acciones especiales
    document.querySelectorAll('.ap-tb-btn[data-action]').forEach(btn => {
        btn.onclick = async e => {
            e.preventDefault();
            const act = btn.dataset.action;
            if (act === 'link') {
                const url = await nwPrompt({
                    title: 'Insertar enlace',
                    icon: 'link',
                    label: 'URL',
                    placeholder: 'https://...',
                    okText: 'Insertar'
                });
                if (url) exec('createLink', url);
            } else if (act === 'table') {
                insertTable(contentEl, queueSave);
            } else if (act === 'checklist') {
                insertChecklist(contentEl, queueSave);
            }
        };
    });

    // Bloque (heading / quote / code)
    const blockSel = document.getElementById('ap-block');
    blockSel.onchange = () => exec('formatBlock', blockSel.value);

    // Fuente
    const fontSel = document.getElementById('ap-font');
    fontSel.onchange = () => exec('fontName', fontSel.value);

    // Tamaño
    const sizeSel = document.getElementById('ap-size');
    sizeSel.onchange = () => exec('fontSize', sizeSel.value);

    // Color picker (texto)
    initColorPicker('ap-color-text', color => {
        document.querySelector('#ap-color-text .ap-tb-color-bar').style.background = color;
        exec('foreColor', color);
    });

    // Color picker (resaltado)
    initColorPicker('ap-color-hl', color => {
        document.querySelector('#ap-color-hl .ap-tb-color-bar').style.background = color === 'transparent' ? '#fef3c7' : color;
        if (color === 'transparent') exec('hiliteColor', 'transparent');
        else exec('hiliteColor', color);
    });

    // Atajos del editor
    contentEl.addEventListener('keydown', async e => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'k') {
                e.preventDefault();
                const url = await nwPrompt({ title: 'Insertar enlace', icon: 'link', label: 'URL', placeholder: 'https://...', okText: 'Insertar' });
                if (url) exec('createLink', url);
            }
        }
    });

    // Star / delete
    document.getElementById('ap-star').onclick = () => {
        const n = getNote(_ctx.activeNoteId);
        updateNote(_ctx.activeNoteId, { starred: !n.starred });
        renderEditor(); renderNotesList();
    };

    // Volver a la lista (solo se ve en teléfono; en escritorio sobra porque
    // la lista está siempre a la vista)
    const backBtn = document.getElementById('ap-back');
    if (backBtn) backBtn.onclick = backToList;

    // Focus mode toggle (oculta carpetas + lista para ampliar el área de escritura)
    const focusBtn = document.getElementById('ap-focus');
    const apWrap = document.querySelector('.nws-apuntes');
    const restoreBtn = document.getElementById('ap-focus-restore');
    const applyFocusState = () => {
        const focused = localStorage.getItem('ap_focus_mode') === '1';
        apWrap.classList.toggle('ap-focus', focused);
        focusBtn.classList.toggle('active', focused);
    };
    focusBtn.onclick = () => {
        const cur = localStorage.getItem('ap_focus_mode') === '1';
        localStorage.setItem('ap_focus_mode', cur ? '0' : '1');
        applyFocusState();
    };
    if (restoreBtn) {
        restoreBtn.onclick = () => {
            localStorage.setItem('ap_focus_mode', '0');
            applyFocusState();
        };
    }
    applyFocusState();

    document.getElementById('ap-delete').onclick = async () => {
        const ok = await nwConfirm({
            title: 'Eliminar nota',
            message: '¿Estás seguro de eliminar esta nota? Esta acción no se puede deshacer.',
            okText: 'Eliminar',
            danger: true,
            icon: 'trash'
        });
        if (!ok) return;
        deleteNote(_ctx.activeNoteId);
        _ctx.activeNoteId = null;
        updateSettings({ activeNoteId: null });
        renderNotesList(); renderEditor();
        toast('Nota eliminada', 'success');
    };
}

// ── Color picker dropdown ───────────────────────────────────────
function initColorPicker(id, onPick) {
    const wrap = document.getElementById(id);
    const pop = wrap.querySelector('.ap-tb-color-pop');
    const ico = wrap.querySelector('.ap-tb-color-ico');

    const close = () => { wrap.classList.remove('open'); document.removeEventListener('click', onOutside); };
    const onOutside = e => { if (!wrap.contains(e.target)) close(); };
    const toggle = (e) => {
        e.stopPropagation();
        const isOpen = wrap.classList.toggle('open');
        // Cerrar otros pickers
        document.querySelectorAll('.ap-tb-color.open').forEach(o => { if (o !== wrap) o.classList.remove('open'); });
        if (isOpen) setTimeout(() => document.addEventListener('click', onOutside), 0);
        else close();
    };
    ico.onclick = toggle;
    wrap.querySelector('.ap-tb-color-caret').onclick = toggle;

    pop.querySelectorAll('button').forEach(b => {
        b.onclick = e => {
            e.stopPropagation();
            onPick(b.dataset.color);
            close();
        };
    });
}

// ── Insertar tabla ──────────────────────────────────────────────
function insertTable(contentEl, queueSave) {
    const rows = 3, cols = 3;
    let html = '<table class="ap-table">';
    for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            const tag = r === 0 ? 'th' : 'td';
            html += `<${tag}>${r === 0 ? `Col ${c + 1}` : '&nbsp;'}</${tag}>`;
        }
        html += '</tr>';
    }
    html += '</table><p>&nbsp;</p>';
    contentEl.focus();
    document.execCommand('insertHTML', false, html);
    queueSave();
}

// ── Insertar checklist ──────────────────────────────────────────
function insertChecklist(contentEl, queueSave) {
    const html = '<ul class="ap-checklist"><li><input type="checkbox"> Tarea</li><li><input type="checkbox"> Tarea</li></ul><p>&nbsp;</p>';
    contentEl.focus();
    document.execCommand('insertHTML', false, html);
    queueSave();
    // Wire checkboxes
    contentEl.querySelectorAll('.ap-checklist input').forEach(cb => {
        cb.onchange = () => queueSave();
    });
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
}

// ════════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════════
function injectStyles() {
    if (document.getElementById('ap-styles')) return;
    const s = document.createElement('style');
    s.id = 'ap-styles';
    s.textContent = `
        .nws-apuntes {
            position: relative;
        }
        .nws-apuntes .nws-side:first-child {
            width: 230px;
        }
        .nws-apuntes .ap-notes-side {
            width: 270px; background: var(--surface);
            border-right: 1px solid var(--border);
        }

        /* ── Modo enfocado: ocultar carpetas + lista ── */
        .nws-apuntes.ap-focus > .nws-side {
            display: none !important;
        }
        .ap-focus-restore {
            position: absolute;
            left: 0; top: 50%;
            transform: translateY(-50%);
            width: 26px; height: 70px;
            background: var(--primary);
            color: #fff;
            border: none;
            border-radius: 0 12px 12px 0;
            cursor: pointer;
            display: none;
            align-items: center; justify-content: center;
            z-index: 10;
            box-shadow: 0 6px 18px rgba(59, 130, 246, .35);
            transition: all .2s ease, transform .25s cubic-bezier(.34,1.4,.64,1);
            opacity: 0;
            transform: translateY(-50%) translateX(-100%);
        }
        .nws-apuntes.ap-focus .ap-focus-restore {
            display: flex;
            opacity: 1;
            transform: translateY(-50%) translateX(0);
        }
        .ap-focus-restore:hover {
            background: var(--primary-hover);
            width: 32px;
        }
        .ap-focus-restore svg { width: 14px; height: 14px; }

        /* Botón Focus en el editor */
        .ap-focus-btn { color: var(--text-muted); }
        .ap-focus-btn:hover {
            background: color-mix(in srgb, var(--primary) 10%, var(--surface-2));
            color: var(--primary);
            border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
        }
        .ap-focus-btn.active {
            background: var(--primary);
            color: #fff;
            border-color: var(--primary);
        }
        .ap-side-empty {
            padding: 20px 14px; text-align: center;
            font-size: 12px; color: var(--text-muted);
            font-style: italic;
        }

        /* ── Folders ── */
        .ap-folder {
            display: flex; align-items: center; gap: 10px;
            padding: 9px 11px; border-radius: 8px;
            cursor: pointer; transition: background .15s ease;
            position: relative;
        }
        .ap-folder:hover { background: var(--surface); }
        .ap-folder.active {
            background: color-mix(in srgb, var(--c) 12%, var(--surface));
            box-shadow: inset 3px 0 0 var(--c);
        }
        .ap-folder-ico {
            width: 28px; height: 28px;
            border-radius: 8px;
            background: color-mix(in srgb, var(--c) 14%, transparent);
            color: var(--c);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .ap-folder-ico svg { width: 15px; height: 15px; }
        .ap-folder-name {
            flex: 1; font-size: 13px; font-weight: 600;
            color: var(--text-main);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ap-folder-count {
            background: var(--surface-3);
            color: var(--text-muted);
            font-size: 10.5px; font-weight: 700;
            padding: 2px 7px;
            border-radius: 10px;
            font-family: 'JetBrains Mono', monospace;
        }
        .ap-folder-edit {
            opacity: 0; border: none; background: transparent;
            cursor: pointer; padding: 4px;
            color: var(--text-muted);
            transition: opacity .15s ease, color .15s ease;
        }
        .ap-folder:hover .ap-folder-edit { opacity: 1; }
        .ap-folder-edit:hover { color: var(--primary); }
        .ap-folder-edit svg { width: 13px; height: 13px; }

        /* ── Note cards ── */
        .ap-note-card {
            padding: 11px 12px;
            border-radius: 9px;
            cursor: pointer;
            transition: background .15s ease, transform .15s ease;
            border: 1px solid transparent;
        }
        .ap-note-card:hover { background: var(--surface-3); }
        .ap-note-card.active {
            background: color-mix(in srgb, var(--primary) 8%, var(--surface-2));
            border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
        }
        .ap-note-row1 { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .ap-star { color: #f59e0b; font-size: 13px; }
        .ap-note-title {
            font-size: 13px; font-weight: 700; color: var(--text-main);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            flex: 1;
        }
        .ap-note-snippet {
            font-size: 11.5px; color: var(--text-muted);
            line-height: 1.4;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden;
            margin-bottom: 5px;
        }
        .ap-note-meta {
            display: flex; align-items: center; gap: 4px;
            font-size: 10.5px; color: var(--text-muted);
        }
        .ap-note-date { font-family: 'JetBrains Mono', monospace; }

        /* ════════════════════════════════════════════════════════
           EDITOR estilo Word + Canva
           ════════════════════════════════════════════════════════ */
        .ap-editor-host { flex: 1; min-height: 0; display: flex; }
        .ap-editor {
            flex: 1; min-height: 0;
            display: flex; flex-direction: column;
            position: relative;
        }

        /* Header */
        .ap-editor-top {
            display: flex; align-items: center; gap: 10px;
            padding: 22px 32px 0;
            flex-shrink: 0;
        }
        .ap-editor-title {
            flex: 1;
            border: none; outline: none; background: transparent;
            font-size: 30px; font-weight: 800;
            color: var(--text-main);
            font-family: inherit;
            letter-spacing: -.8px;
            padding: 4px 0;
        }
        .ap-editor-actions { display: flex; gap: 6px; }
        .nws-iconbtn.starred {
            background: #fef3c7; color: #f59e0b; border-color: #fde68a;
            box-shadow: 0 2px 6px rgba(245,158,11,.2);
        }
        .nws-iconbtn.danger:hover {
            background: color-mix(in srgb, var(--danger) 12%, transparent);
            color: var(--danger);
            border-color: var(--danger);
        }

        /* Tags */
        .ap-tags-row {
            padding: 8px 32px 14px;
            display: flex; align-items: center; gap: 8px;
            flex-wrap: wrap;
            font-size: 11px; color: var(--text-muted);
            flex-shrink: 0;
        }
        .ap-tags-lbl {
            font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
            font-size: 10px;
            background: var(--surface-3);
            padding: 3px 8px; border-radius: 6px;
        }
        .ap-tag {
            background: color-mix(in srgb, var(--primary) 10%, transparent);
            color: var(--primary);
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px; font-weight: 600;
            display: inline-flex; align-items: center; gap: 4px;
        }
        .ap-tag button {
            border: none; background: transparent;
            color: var(--primary); cursor: pointer;
            font-size: 14px; padding: 0; line-height: 1;
        }
        #ap-tags-input {
            border: 1px dashed var(--border); outline: none; background: transparent;
            font-size: 11.5px; color: var(--text-main);
            font-family: inherit;
            padding: 3px 8px; border-radius: 10px;
            transition: border-color .15s ease;
        }
        #ap-tags-input:focus { border-color: var(--primary); border-style: solid; }

        /* ── ÁREA SCROLLABLE (contiene tags + toolbar sticky + contenido) ── */
        .ap-scroll-area {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            background: var(--surface-2);
            display: flex;
            flex-direction: column;
        }
        .ap-scroll-area::-webkit-scrollbar { width: 10px; }
        .ap-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .ap-scroll-area::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 5px;
            border: 2px solid var(--surface-2);
        }
        .ap-scroll-area::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

        /* ── TOOLBAR sticky (anclada al tope del scroll area) ── */
        .ap-toolbar-wrap {
            position: sticky;
            top: 0;
            z-index: 10;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(14px) saturate(180%);
            -webkit-backdrop-filter: blur(14px) saturate(180%);
            border-bottom: 1px solid var(--border);
            box-shadow: 0 4px 12px -6px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(15, 23, 42, 0.04);
            flex-shrink: 0;
        }
        /* Sombra reforzada cuando hay contenido por encima */
        .ap-toolbar-wrap::after {
            content: '';
            position: absolute;
            left: 0; right: 0; bottom: -8px;
            height: 8px;
            background: linear-gradient(180deg, rgba(15,23,42,0.06), transparent);
            pointer-events: none;
            opacity: 0;
            transition: opacity .25s ease;
        }
        .ap-scroll-area.scrolled .ap-toolbar-wrap::after { opacity: 1; }
        .ap-toolbar {
            display: flex; align-items: center;
            gap: 2px;
            padding: 8px 22px;
            flex-wrap: wrap;
            row-gap: 6px;
        }
        .ap-tg {
            display: flex; align-items: center; gap: 2px;
            background: var(--surface-2);
            border-radius: 9px;
            padding: 3px;
        }
        .ap-tb-btn {
            min-width: 30px; height: 30px;
            border: none;
            background: transparent;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12.5px; font-weight: 700;
            color: var(--text-main);
            font-family: inherit;
            display: flex; align-items: center; justify-content: center;
            padding: 0 8px;
            transition: all .12s ease;
        }
        .ap-tb-btn:hover {
            background: var(--surface);
            box-shadow: 0 2px 6px rgba(0,0,0,.06);
        }
        .ap-tb-btn:active { transform: scale(.94); }
        .ap-tb-btn svg { width: 15px; height: 15px; }
        .ap-tb-btn.ap-tb-mini { font-size: 10px; padding: 0 6px; min-width: 26px; }
        .ap-tb-btn b, .ap-tb-btn i, .ap-tb-btn u, .ap-tb-btn s {
            font-style: inherit;
            text-decoration: inherit;
        }
        .ap-tb-btn b { font-weight: 800; }
        .ap-tb-btn i { font-style: italic; font-family: Georgia, serif; }
        .ap-tb-btn u { text-decoration: underline; }
        .ap-tb-btn s { text-decoration: line-through; }

        .ap-tb-sep {
            width: 1px; height: 20px;
            background: var(--border);
            margin: 0 3px;
            flex-shrink: 0;
        }

        /* Selects de la toolbar */
        .ap-tb-select {
            border: 1px solid transparent;
            background: transparent;
            border-radius: 6px;
            padding: 5px 8px;
            font-size: 12px;
            color: var(--text-main);
            font-family: inherit;
            cursor: pointer;
            transition: all .12s ease;
            min-width: 30px;
            outline: none;
        }
        .ap-tb-select:hover {
            background: var(--surface);
            border-color: var(--border);
        }
        .ap-tb-select:focus { border-color: var(--primary); }
        .ap-tb-font { min-width: 130px; }
        .ap-tb-size { min-width: 50px; text-align: center; }
        .ap-tb-block { min-width: 105px; }

        /* Color picker */
        .ap-tb-color {
            position: relative;
            display: flex; align-items: center;
            background: transparent;
            border-radius: 7px;
            padding: 0;
            cursor: pointer;
            transition: background .12s ease;
        }
        .ap-tb-color:hover { background: var(--surface); }
        .ap-tb-color-ico {
            display: flex; flex-direction: column; align-items: center;
            padding: 3px 4px 1px 7px;
            color: var(--text-main);
            cursor: pointer;
            gap: 1px;
        }
        .ap-tb-color-ico svg { width: 14px; height: 14px; }
        .ap-tb-color-bar {
            width: 18px; height: 4px;
            border-radius: 2px;
            border: 1px solid rgba(0,0,0,.06);
        }
        .ap-tb-color-caret {
            width: 12px !important; height: 12px !important;
            color: var(--text-muted);
            padding-right: 5px;
        }
        .ap-tb-color-pop {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 8px;
            box-shadow: 0 12px 32px rgba(0,0,0,.15);
            display: none;
            grid-template-columns: repeat(6, 1fr);
            gap: 4px;
            z-index: 100;
            min-width: 180px;
        }
        .ap-tb-color.open .ap-tb-color-pop { display: grid; }
        .ap-tb-color-pop button {
            width: 22px; height: 22px;
            border: 1px solid rgba(0,0,0,.08);
            border-radius: 5px;
            cursor: pointer;
            transition: transform .15s ease, box-shadow .15s ease;
        }
        .ap-tb-color-pop button:hover {
            transform: scale(1.15);
            box-shadow: 0 2px 8px rgba(0,0,0,.15);
            z-index: 1;
        }

        /* ── Contenido editable (dentro del scroll area, debajo de la toolbar sticky) ──
           flex: 1 0 auto hace que la hoja:
             - Siempre ocupe al menos toda la altura visible del scroll area
             - Crezca naturalmente con el contenido cuando se hace más largo
             - Nunca se quede más corta que el contenido (overflow visible) */
        .ap-content {
            max-width: 880px;
            width: calc(100% - 36px);
            margin: 22px auto 22px;
            background: var(--surface);
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,.05), 0 0 0 1px var(--border);
            padding: 50px 60px;
            flex: 1 0 auto;
            font-size: 15px;
            line-height: 1.75;
            color: var(--text-main);
            outline: none;
            font-family: 'DM Sans', sans-serif;
            overflow: visible;
            box-sizing: border-box;
        }
        .ap-content:focus { outline: none; }
        .ap-content h1 { font-size: 32px; font-weight: 800; margin: 18px 0 10px; letter-spacing: -.7px; color: var(--text-main); }
        .ap-content h2 { font-size: 26px; font-weight: 700; margin: 14px 0 8px; letter-spacing: -.4px; color: var(--text-main); }
        .ap-content h3 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; color: var(--text-main); }
        .ap-content h4 { font-size: 17px; font-weight: 700; margin: 10px 0 5px; color: var(--text-main); }
        .ap-content p { margin: 8px 0; }
        .ap-content ul, .ap-content ol { padding-left: 32px; margin: 10px 0; }
        .ap-content li { margin: 4px 0; }
        .ap-content blockquote {
            border-left: 4px solid var(--primary);
            background: color-mix(in srgb, var(--primary) 5%, transparent);
            margin: 14px 0;
            padding: 10px 18px;
            border-radius: 0 8px 8px 0;
            color: var(--text-muted);
            font-style: italic;
        }
        .ap-content pre {
            background: #0f172a;
            color: #e2e8f0;
            padding: 16px 20px;
            border-radius: 10px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            overflow-x: auto;
            margin: 14px 0;
            line-height: 1.6;
        }
        .ap-content code {
            background: var(--surface-3);
            padding: 2px 6px;
            border-radius: 5px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: #be185d;
        }
        .ap-content a { color: var(--primary); text-decoration: underline; }
        .ap-content hr {
            border: none; border-top: 1px solid var(--border);
            margin: 20px 0;
        }
        .ap-content .ap-table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0;
            font-size: 14px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 0 1px var(--border);
        }
        .ap-content .ap-table th,
        .ap-content .ap-table td {
            border: 1px solid var(--border);
            padding: 9px 13px;
            text-align: left;
        }
        .ap-content .ap-table th {
            background: var(--surface-2);
            font-weight: 700;
            color: var(--text-main);
        }
        .ap-content .ap-checklist {
            list-style: none;
            padding-left: 6px;
        }
        .ap-content .ap-checklist li {
            display: flex; align-items: center; gap: 10px;
        }
        .ap-content .ap-checklist input[type="checkbox"] {
            width: 16px; height: 16px;
            cursor: pointer;
            accent-color: var(--primary);
        }

        /* ── Footer del editor ── */
        .ap-editor-foot {
            padding: 9px 22px;
            border-top: 1px solid var(--border);
            background: var(--surface);
            font-size: 11px;
            color: var(--text-muted);
            display: flex; align-items: center; gap: 10px;
            flex-shrink: 0;
        }
        .ap-foot-sep { opacity: .6; }
        .ap-save-dot {
            display: inline-block;
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #10b981;
            margin-right: 5px;
            vertical-align: middle;
        }
        .ap-save-dot.saving {
            background: #f59e0b;
            animation: apPulse 1s ease-in-out infinite;
        }
        @keyframes apPulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }

        /* ════════════════════════════════════════════════════════
           MODAL DE EDICIÓN DE CARPETA
           ════════════════════════════════════════════════════════ */
        .ap-modal-overlay {
            position: fixed; inset: 0; z-index: var(--z-notes-modal);
            background: rgba(8,12,24,.55);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity .22s ease;
        }
        .ap-modal-overlay.show { opacity: 1; }
        .ap-modal {
            background: var(--surface);
            border-radius: 14px;
            width: min(440px, 92%);
            box-shadow: 0 30px 80px rgba(0,0,0,.35);
            transform: scale(.94); transition: transform .25s cubic-bezier(.34,1.4,.64,1);
            overflow: hidden;
        }
        .ap-modal-overlay.show .ap-modal { transform: scale(1); }
        .ap-modal-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px; border-bottom: 1px solid var(--border);
        }
        .ap-modal-hdr h3 { font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0; }
        .ap-modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
        .ap-field { display: flex; flex-direction: column; gap: 6px; }
        .ap-field-lbl {
            font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .4px;
            color: var(--text-muted);
        }
        .ap-field input {
            padding: 9px 12px;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 13px;
            background: var(--surface-2);
            color: var(--text-main);
            outline: none;
            font-family: inherit;
        }
        .ap-field input:focus { border-color: var(--primary); }
        .ap-color-grid { display: flex; gap: 8px; flex-wrap: wrap; }
        .ap-color-dot {
            width: 28px; height: 28px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            transition: transform .15s ease, border-color .15s ease;
        }
        .ap-color-dot:hover { transform: scale(1.15); }
        .ap-color-dot.active { border-color: var(--text-main); transform: scale(1.15); }
        .ap-modal-ftr {
            padding: 14px 20px;
            border-top: 1px solid var(--border);
            display: flex; align-items: center; gap: 8px;
            background: var(--surface-2);
        }

        /* ════════════════════════════════════════════════════════
           RESPONSIVE
           ════════════════════════════════════════════════════════ */
        @media (max-width: 1100px) {
            .ap-content { padding: 36px 40px; margin: 18px; }
            .ap-editor-top { padding: 18px 22px 0; }
            .ap-tags-row { padding: 8px 22px 12px; }
        }
        @media (max-width: 768px) {
            .ap-editor-title { font-size: 24px; }
            .ap-toolbar { padding: 6px 12px; gap: 4px; }
            .ap-tb-font { min-width: 90px; font-size: 11px; }
            .ap-tb-block { min-width: 90px; }
            .ap-content { padding: 24px 22px; margin: 12px; }
        }
        @media (max-width: 600px) {
            .ap-tb-font, .ap-tb-block { display: none; }
            .ap-editor-top { padding: 14px 16px 0; }
            .ap-tags-row { padding: 6px 16px 10px; }
        }

        /* El botón de volver solo tiene sentido en la vista por niveles */
        .ap-back-btn { display: none; }

        /* ════════════════════════════════════════════════════════
           APUNTES EN TELÉFONO — navegación por niveles
           Los tres paneles (carpetas · lista · editor) no caben uno al
           lado de otro en una pantalla estrecha. Aquí se recorre por
           niveles, como una app de notas:
             Nivel 1 → carpetas en tira + lista de notas
             Nivel 2 → el editor ocupa toda el área, con botón atrás
           La clase .ap-editing (la pone selectNote) decide cuál se ve.
           En escritorio nada de esto aplica: siguen los tres paneles.
           ════════════════════════════════════════════════════════ */
        @media (max-width: 768px) {
            .nws-apuntes { flex-direction: column; }

            /* Carpetas: de panel lateral de 230px a tira horizontal.
               El max-height:35vh que la regla global de 900px aplica a
               todo .nws-side se anula aquí: en una tira sobra, y en la
               lista de notas la dejaría recortada a un tercio de alto. */
            .nws-apuntes .nws-side:first-child {
                width: 100%;
                max-height: none;
                flex-direction: row;
                align-items: center;
                flex-shrink: 0;
                border-right: none;
                border-bottom: 1px solid var(--border);
            }
            .nws-apuntes .nws-side:first-child .nws-side-hdr {
                border-bottom: none;
                border-right: 1px solid var(--border);
                padding: 8px 10px;
                flex-shrink: 0;
            }
            /* El rótulo "Carpetas" sobra: el botón + ya se entiende */
            .nws-apuntes .nws-side:first-child .nws-side-title { display: none; }
            .nws-apuntes .nws-side:first-child .nws-side-list {
                flex-direction: row;
                overflow-x: auto;
                overflow-y: hidden;
                gap: 6px;
                padding: 8px 10px;
            }
            .nws-apuntes .nws-side:first-child .nws-side-list > * {
                flex-shrink: 0;
                white-space: nowrap;
            }

            /* Carpetas como pastillas: en fila, la franja de color a la
               izquierda de la versión de escritorio no se lee. */
            .nws-apuntes .nws-side:first-child .ap-folder {
                padding: 7px 12px;
                border: 1px solid var(--border);
                border-radius: 20px;
                background: var(--surface);
                gap: 8px;
            }
            .nws-apuntes .nws-side:first-child .ap-folder.active {
                box-shadow: none;
                border-color: var(--c);
                background: color-mix(in srgb, var(--c) 14%, var(--surface));
            }
            /* El lápiz de renombrar dependía de hover, así que en una
               pantalla táctil no había manera de llegar a él. */
            .nws-apuntes .ap-folder-edit { opacity: 1; }

            /* Lista de notas: ocupa el resto del alto */
            .nws-apuntes .ap-notes-side {
                width: 100%;
                max-height: none;
                flex: 1;
                min-height: 0;
                border-right: none;
            }

            /* Nivel 2: el editor sale del marco de la app y ocupa la
               pantalla entera, como si fuera una app de notas aparte.
               position:fixed lo saca de .nw-content (que recorta con
               overflow:hidden) y de la tarjeta, la cabecera y las pestañas. */
            .nws-apuntes .nws-main { display: none; }
            .nws-apuntes.ap-editing .nws-main {
                display: flex;
                flex-direction: column;
                position: fixed;
                inset: 0;
                z-index: var(--z-sheet);
                min-height: 0;
                background: var(--surface);
            }
            /* El área de escritura necesita poder encogerse para que su
               propio scroll funcione dentro del panel fijo. */
            .nws-apuntes.ap-editing .ap-scroll-area { min-height: 0; }

            /* El modo enfocado es de escritorio; aquí manda .ap-editing,
               y sin esto una sesión que lo dejó activo escondería los
               paneles sin forma de recuperarlos. */
            .nws-apuntes.ap-focus > .nws-side { display: flex !important; }
            .nws-apuntes.ap-editing > .nws-side { display: none !important; }
            .ap-focus-restore,
            .ap-focus-btn { display: none !important; }

            .ap-back-btn { display: inline-flex; }

            /* Objetivos táctiles más cómodos en la lista */
            .nws-apuntes .ap-notes-side .nws-side-list { padding: 8px; }
        }
    `;
    document.head.appendChild(s);
}
