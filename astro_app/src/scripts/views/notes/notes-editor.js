// ════════════════════════════════════════════════════════════════
//  APUNTES · Editor de una nota: estructura y barra de herramientas
//  Las acciones de la barra viven en notes-editor-acciones.js.
//  Extraído de notes-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { setEditing } from './notes-section.js';
import { getNote } from '../../notesStore.js';
import { escapeHtml, formatDate } from './notesApp.js';
import { _ctx } from './notes-estado.js';
import { initEditor } from './notes-editor-acciones.js';

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

// ════════════════════════════════════════════════════════════════
//  EDITOR estilo Microsoft Word + Canva
// ════════════════════════════════════════════════════════════════
export function renderEditor() {
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
