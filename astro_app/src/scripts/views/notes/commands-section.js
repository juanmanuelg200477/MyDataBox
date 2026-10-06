// ════════════════════════════════════════════════════════════════
//  COMANDOS — biblioteca de snippets reutilizables
// ════════════════════════════════════════════════════════════════

import {
    listCommands, createCommand, updateCommand, deleteCommand, incrementCommandUse
} from '../../notesStore.js';
import { escapeHtml, formatDate, toast, nwConfirm } from './notesApp.js';

const CATEGORIES = [
    { id: 'linux', name: 'Linux / Bash', color: '#10b981', icon: 'M2 12l5 5L22 4M2 12l5 5L22 4' },
    { id: 'windows', name: 'Windows / PowerShell', color: '#3b82f6', icon: 'M4 4h16v6H4zM4 14h16v6H4z' },
    { id: 'network', name: 'Networking', color: '#8b5cf6', icon: 'M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0' },
    { id: 'sql', name: 'SQL / DB', color: '#f59e0b', icon: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 5c0 1.66 4 3 9 3s9-1.34 9-3M3 5c0-1.66 4-3 9-3s9 1.34 9 3' },
    { id: 'docker', name: 'Docker / Containers', color: '#06b6d4', icon: 'M3 9h18M9 21h6M12 17v4M5 9v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9' },
    { id: 'git', name: 'Git', color: '#ef4444', icon: 'M21 12l-3 3M21 12l-3-3M3 12l3 3M3 12l3-3M9 21l3-3M9 21l3 3M15 21l-3-3M15 21l-3 3' },
    { id: 'cisco', name: 'Cisco / Routers', color: '#ec4899', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z' },
    { id: 'general', name: 'General', color: '#64748b', icon: 'M4 17l6-6 6 6' }
];

let _ctx = null;

export function renderComandos(host) {
    host.innerHTML = `
        <div class="nws nws-cmd">
            <aside class="nws-side">
                <div class="nws-side-hdr">
                    <span class="nws-side-title">Categorías</span>
                </div>
                <div class="nws-side-list" id="cm-cats"></div>
            </aside>

            <section class="nws-main">
                <div class="nws-main-hdr">
                    <div class="nws-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="cm-search" placeholder="Buscar comandos...">
                    </div>
                    <button class="nws-btn primary" id="cm-add">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>Nuevo</span>
                    </button>
                </div>
                <div class="nws-main-body" id="cm-list"></div>
            </section>
        </div>
    `;

    injectStyles();
    _ctx = { activeCat: 'all', search: '' };

    document.getElementById('cm-search').oninput = e => {
        _ctx.search = e.target.value.toLowerCase();
        renderList();
    };
    document.getElementById('cm-add').onclick = () => openEditor(null);

    renderCategories();
    renderList();
}

function renderCategories() {
    const all = listCommands();
    const host = document.getElementById('cm-cats');
    const items = [
        { id: 'all', name: 'Todos', color: '#0ea5e9', count: all.length, icon: 'M4 17l6-6 6 6M4 7l6 6 6-6' },
        ...CATEGORIES.map(c => ({
            ...c, count: all.filter(x => (x.category || 'general').toLowerCase() === c.id).length
        }))
    ];

    host.innerHTML = items.map(c => `
        <div class="cm-cat ${c.id === _ctx.activeCat ? 'active' : ''}" data-id="${c.id}" style="--c:${c.color}">
            <span class="cm-cat-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${c.icon}"/></svg>
            </span>
            <span class="cm-cat-name">${c.name}</span>
            <span class="cm-cat-count">${c.count}</span>
        </div>
    `).join('');

    host.querySelectorAll('.cm-cat').forEach(el => {
        el.onclick = () => {
            _ctx.activeCat = el.dataset.id;
            renderCategories();
            renderList();
        };
    });
}

function renderList() {
    const host = document.getElementById('cm-list');
    let cmds = listCommands();
    if (_ctx.activeCat !== 'all') {
        cmds = cmds.filter(c => (c.category || 'general').toLowerCase() === _ctx.activeCat);
    }
    if (_ctx.search) {
        cmds = cmds.filter(c =>
            (c.title || '').toLowerCase().includes(_ctx.search) ||
            (c.command || '').toLowerCase().includes(_ctx.search) ||
            (c.description || '').toLowerCase().includes(_ctx.search) ||
            (c.tags || []).some(t => t.toLowerCase().includes(_ctx.search))
        );
    }
    cmds.sort((a, b) => (b.useCount || 0) - (a.useCount || 0) || new Date(b.updatedAt) - new Date(a.updatedAt));

    if (!cmds.length) {
        host.innerHTML = `
            <div class="nws-empty">
                <div class="nws-empty-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                </div>
                <div class="nws-empty-title">${_ctx.search ? 'Sin resultados' : 'Tu biblioteca de comandos está vacía'}</div>
                <div class="nws-empty-sub">${_ctx.search ? 'Prueba con otra búsqueda' : 'Guarda snippets de Linux, PowerShell, SQL, Docker, Git y más para reutilizarlos al instante.'}</div>
            </div>
        `;
        return;
    }

    host.innerHTML = `<div class="cm-list">${cmds.map(buildCard).join('')}</div>`;

    host.querySelectorAll('.cm-card').forEach(card => {
        const id = card.dataset.id;
        card.querySelector('.cm-copy').onclick = () => {
            const c = listCommands().find(x => x.id === id);
            navigator.clipboard.writeText(c.command || '').then(() => {
                incrementCommandUse(id);
                toast('Comando copiado al portapapeles', 'success');
            });
        };
        card.querySelector('.cm-edit').onclick = () => openEditor(id);
        card.querySelector('.cm-delete').onclick = async () => {
            const c = listCommands().find(x => x.id === id);
            const ok = await nwConfirm({
                title: 'Eliminar comando',
                message: `¿Estás seguro de eliminar "${c.title}"? Esta acción no se puede deshacer.`,
                okText: 'Eliminar',
                danger: true,
                icon: 'trash'
            });
            if (!ok) return;
            deleteCommand(id);
            renderCategories();
            renderList();
            toast('Comando eliminado', 'success');
        };
    });
}

function buildCard(c) {
    const cat = CATEGORIES.find(x => x.id === (c.category || 'general').toLowerCase()) || CATEGORIES.find(x => x.id === 'general');
    return `
        <div class="cm-card" data-id="${c.id}" style="--c:${cat.color}">
            <div class="cm-card-hdr">
                <div class="cm-card-info">
                    <div class="cm-card-tag">${cat.name}</div>
                    <h3 class="cm-card-title">${escapeHtml(c.title || 'Sin título')}</h3>
                    ${c.description ? `<p class="cm-card-desc">${escapeHtml(c.description)}</p>` : ''}
                </div>
                <div class="cm-card-acts">
                    <button class="cm-iconbtn cm-copy" title="Copiar al portapapeles">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="cm-iconbtn cm-edit" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="cm-iconbtn cm-delete" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
            <pre class="cm-code"><code>${escapeHtml(c.command || '')}</code></pre>
            <div class="cm-card-foot">
                ${(c.tags || []).map(t => `<span class="nws-tag">#${escapeHtml(t)}</span>`).join('')}
                <span class="cm-meta">
                    Usado ${c.useCount || 0} veces · ${formatDate(c.updatedAt)}
                </span>
            </div>
        </div>
    `;
}

// ── Editor ──────────────────────────────────────────────────────
function openEditor(id) {
    const c = id ? listCommands().find(x => x.id === id) : { category: 'general', title: '', command: '', description: '', tags: [] };

    const overlay = document.createElement('div');
    overlay.className = 'cm-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) close(); };

    overlay.innerHTML = `
        <div class="cm-modal">
            <div class="cm-modal-hdr">
                <h3>${id ? 'Editar comando' : 'Nuevo comando'}</h3>
                <button class="nws-iconbtn" id="cme-close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="cm-modal-body">
                <label class="cm-fld">
                    <span class="cm-fld-lbl">Título *</span>
                    <input type="text" id="cme-title" value="${escapeHtml(c.title)}" placeholder="ej. Buscar puertos abiertos">
                </label>
                <label class="cm-fld">
                    <span class="cm-fld-lbl">Categoría</span>
                    <select id="cme-cat">
                        ${CATEGORIES.map(x => `<option value="${x.id}" ${x.id === c.category ? 'selected' : ''}>${x.name}</option>`).join('')}
                    </select>
                </label>
                <label class="cm-fld">
                    <span class="cm-fld-lbl">Descripción</span>
                    <textarea id="cme-desc" rows="2" placeholder="Qué hace el comando, cuándo usarlo...">${escapeHtml(c.description)}</textarea>
                </label>
                <label class="cm-fld">
                    <span class="cm-fld-lbl">Comando *</span>
                    <textarea id="cme-cmd" rows="5" class="cm-code-input" spellcheck="false" placeholder="sudo netstat -tulpn | grep LISTEN">${escapeHtml(c.command)}</textarea>
                </label>
                <label class="cm-fld">
                    <span class="cm-fld-lbl">Etiquetas (separadas por coma)</span>
                    <input type="text" id="cme-tags" value="${escapeHtml((c.tags || []).join(', '))}" placeholder="firewall, debug, prod">
                </label>
            </div>
            <div class="cm-modal-ftr">
                <button class="nws-btn" id="cme-cancel">Cancelar</button>
                <button class="nws-btn primary" id="cme-save">${id ? 'Guardar cambios' : 'Crear comando'}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 220); };
    overlay.querySelector('#cme-close').onclick = close;
    overlay.querySelector('#cme-cancel').onclick = close;

    overlay.querySelector('#cme-save').onclick = () => {
        const title = overlay.querySelector('#cme-title').value.trim();
        const command = overlay.querySelector('#cme-cmd').value.trim();
        if (!title || !command) { toast('Título y comando son requeridos', 'warning'); return; }
        const tags = overlay.querySelector('#cme-tags').value.split(',').map(t => t.trim()).filter(Boolean);
        const data = {
            title, command, tags,
            category: overlay.querySelector('#cme-cat').value,
            description: overlay.querySelector('#cme-desc').value.trim()
        };
        if (id) updateCommand(id, data);
        else createCommand(data);
        close();
        renderCategories();
        renderList();
        toast(id ? 'Comando actualizado' : 'Comando guardado', 'success');
    };
}

// ── Styles ──────────────────────────────────────────────────────
function injectStyles() {
    if (document.getElementById('cm-styles')) return;
    const s = document.createElement('style');
    s.id = 'cm-styles';
    s.textContent = `
        .nws-cmd .nws-side { width: 240px; }

        .cm-cat {
            display: flex; align-items: center; gap: 10px;
            padding: 9px 11px; border-radius: 8px;
            cursor: pointer; transition: background .15s ease;
        }
        .cm-cat:hover { background: var(--surface); }
        .cm-cat.active {
            background: color-mix(in srgb, var(--c) 12%, var(--surface));
            box-shadow: inset 3px 0 0 var(--c);
        }
        .cm-cat-ico {
            width: 28px; height: 28px;
            border-radius: 8px;
            background: color-mix(in srgb, var(--c) 14%, transparent);
            color: var(--c);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .cm-cat-ico svg { width: 15px; height: 15px; }
        .cm-cat-name {
            flex: 1; font-size: 13px; font-weight: 600;
            color: var(--text-main);
        }
        .cm-cat-count {
            background: var(--surface-3);
            color: var(--text-muted);
            font-size: 10.5px; font-weight: 700;
            padding: 2px 7px;
            border-radius: 10px;
            font-family: 'JetBrains Mono', monospace;
        }

        /* ── Cards ── */
        .cm-list {
            display: flex; flex-direction: column;
            gap: 14px;
            max-width: 900px;
        }
        .cm-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
            transition: border-color .25s ease, box-shadow .25s ease;
        }
        .cm-card:hover {
            border-color: color-mix(in srgb, var(--c) 30%, var(--border));
            box-shadow: 0 8px 24px rgba(0,0,0,.06);
        }
        .cm-card-hdr {
            padding: 14px 16px 10px;
            display: flex; align-items: flex-start; gap: 12px;
            border-left: 4px solid var(--c);
        }
        .cm-card-info { flex: 1; min-width: 0; }
        .cm-card-tag {
            display: inline-block;
            font-size: 10px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .5px;
            color: var(--c);
            background: color-mix(in srgb, var(--c) 10%, transparent);
            padding: 2px 8px;
            border-radius: 10px;
            margin-bottom: 6px;
        }
        .cm-card-title {
            font-size: 15px; font-weight: 700; color: var(--text-main);
            margin: 0;
        }
        .cm-card-desc {
            font-size: 12.5px; color: var(--text-muted);
            margin: 4px 0 0; line-height: 1.5;
        }
        .cm-card-acts { display: flex; gap: 4px; flex-shrink: 0; }
        .cm-iconbtn {
            width: 30px; height: 30px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text-muted);
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all .15s ease;
        }
        .cm-iconbtn:hover { background: var(--surface-3); color: var(--text-main); }
        .cm-iconbtn svg { width: 14px; height: 14px; }
        .cm-copy:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
        .cm-delete:hover { background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); border-color: var(--danger); }

        .cm-code {
            margin: 0;
            padding: 14px 16px;
            background: #0f172a;
            color: #e2e8f0;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12.5px;
            line-height: 1.65;
            overflow-x: auto;
            white-space: pre;
        }
        .cm-code code { color: inherit; background: transparent; }
        .cm-card-foot {
            padding: 10px 16px;
            border-top: 1px solid var(--border);
            display: flex; align-items: center; gap: 6px;
            flex-wrap: wrap;
            font-size: 10.5px;
        }
        .cm-meta {
            margin-left: auto;
            color: var(--text-muted);
            font-family: 'JetBrains Mono', monospace;
        }

        /* ── Modal ── */
        .cm-modal-overlay {
            position: fixed; inset: 0; z-index: var(--z-modal);
            background: rgba(8,12,24,.55);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity .22s ease;
            padding: 20px;
        }
        .cm-modal-overlay.show { opacity: 1; }
        .cm-modal {
            background: var(--surface);
            border-radius: 16px;
            width: min(620px, 100%);
            max-height: 90vh;
            box-shadow: 0 30px 80px rgba(0,0,0,.35);
            transform: scale(.94); transition: transform .25s cubic-bezier(.34,1.4,.64,1);
            overflow: hidden;
            display: flex; flex-direction: column;
        }
        .cm-modal-overlay.show .cm-modal { transform: scale(1); }
        .cm-modal-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 22px; border-bottom: 1px solid var(--border);
        }
        .cm-modal-hdr h3 { font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0; }
        .cm-modal-body {
            padding: 18px 22px;
            display: flex; flex-direction: column; gap: 14px;
            overflow-y: auto; max-height: 65vh;
        }
        .cm-fld { display: flex; flex-direction: column; gap: 6px; }
        .cm-fld-lbl {
            font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .4px;
            color: var(--text-muted);
        }
        .cm-fld input, .cm-fld select, .cm-fld textarea {
            padding: 9px 12px;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 13px;
            background: var(--surface-2);
            color: var(--text-main);
            outline: none;
            font-family: inherit;
            resize: vertical;
        }
        .cm-fld input:focus, .cm-fld select:focus, .cm-fld textarea:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
        }
        .cm-code-input {
            font-family: 'JetBrains Mono', monospace !important;
            background: #0f172a !important;
            color: #e2e8f0 !important;
            font-size: 12.5px !important;
        }
        .cm-modal-ftr {
            padding: 14px 22px;
            border-top: 1px solid var(--border);
            background: var(--surface-2);
            display: flex; align-items: center; justify-content: flex-end; gap: 8px;
        }
    `;
    document.head.appendChild(s);
}
