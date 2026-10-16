// ════════════════════════════════════════════════════════════════
//  APUNTES · Editor de una nota: acciones
//  Formato, colores, tablas, listas de tareas, atajos y guardado.
//  Extraído de notes-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { renderNotesList, backToList } from './notes-section.js';
import { getNote, updateNote, deleteNote, updateSettings } from '../../notesStore.js';
import { escapeHtml, nwPrompt, nwConfirm, toast } from './notesApp.js';
import { _ctx } from './notes-estado.js';
import { renderEditor } from './notes-editor.js';

// Retira el listener de selección del editor de la nota anterior
let _soltarSeleccion = null;

// ── Initialize editor logic ─────────────────────────────────────
export function initEditor(note) {
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
    // Va en document: se suelta el de la nota anterior, y este se retira
    // solo si el editor desaparece (otra sección u otra página).
    _soltarSeleccion?.();
    const onSelectionChange = () => {
        if (!contentEl.isConnected) { soltarSeleccion(); return; }
        if (document.activeElement === contentEl) trackSelection();
    };
    const soltarSeleccion = () => {
        document.removeEventListener('selectionchange', onSelectionChange);
        if (_soltarSeleccion === soltarSeleccion) _soltarSeleccion = null;
    };
    document.addEventListener('selectionchange', onSelectionChange);
    _soltarSeleccion = soltarSeleccion;

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

export function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
}
