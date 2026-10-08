// ════════════════════════════════════════════════════════════════
//  BÓVEDA — gestor de credenciales con cards estilo wallet
// ════════════════════════════════════════════════════════════════

import {
    listCredentials, createCredential, updateCredential, deleteCredential, getCredential
} from '../../notesStore.js';
import { escapeHtml, formatDate, toast, nwConfirm } from './notesApp.js';

const CATEGORIES = [
    { id: 'servidor', name: 'Servidor', color: '#3b82f6', icon: 'server' },
    { id: 'web', name: 'Web / App', color: '#10b981', icon: 'globe' },
    { id: 'database', name: 'Base de datos', color: '#8b5cf6', icon: 'db' },
    { id: 'red', name: 'Red / WiFi', color: '#f59e0b', icon: 'wifi' },
    { id: 'email', name: 'Email', color: '#ec4899', icon: 'mail' },
    { id: 'cloud', name: 'Cloud', color: '#06b6d4', icon: 'cloud' },
    { id: 'general', name: 'General', color: '#64748b', icon: 'key' }
];

const CAT_ICONS = {
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>'
};

let _ctx = null;

export function renderBoveda(host) {
    host.innerHTML = `
        <div class="nws nws-vault">
            <aside class="nws-side">
                <div class="nws-side-hdr">
                    <span class="nws-side-title">Categorías</span>
                </div>
                <div class="nws-side-list" id="vt-cats"></div>
            </aside>

            <section class="nws-main">
                <div class="nws-main-hdr">
                    <div class="nws-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="vt-search" placeholder="Buscar credenciales...">
                    </div>
                    <button class="nws-btn primary" id="vt-add">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>Nueva</span>
                    </button>
                </div>
                <div class="nws-main-body" id="vt-grid"></div>
            </section>
        </div>
    `;

    injectStyles();

    _ctx = { activeCat: 'all', search: '' };

    document.getElementById('vt-search').oninput = e => {
        _ctx.search = e.target.value.toLowerCase();
        renderGrid();
    };
    document.getElementById('vt-add').onclick = () => openEditor(null);

    renderCategories();
    renderGrid();
}

function renderCategories() {
    const all = listCredentials();
    const host = document.getElementById('vt-cats');

    const allCount = all.length;
    const items = [
        { id: 'all', name: 'Todas', color: '#0ea5e9', count: allCount, ico: 'key' },
        ...CATEGORIES.map(c => ({
            ...c, count: all.filter(x => (x.category || 'general').toLowerCase() === c.id).length, ico: c.icon
        }))
    ];

    host.innerHTML = items.map(c => `
        <div class="vt-cat ${c.id === _ctx.activeCat ? 'active' : ''}" data-id="${c.id}" style="--c:${c.color}">
            <span class="vt-cat-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${CAT_ICONS[c.ico] || CAT_ICONS.key}</svg>
            </span>
            <span class="vt-cat-name">${c.name}</span>
            <span class="vt-cat-count">${c.count}</span>
        </div>
    `).join('');

    host.querySelectorAll('.vt-cat').forEach(el => {
        el.onclick = () => {
            _ctx.activeCat = el.dataset.id;
            renderCategories();
            renderGrid();
        };
    });
}

function renderGrid() {
    const host = document.getElementById('vt-grid');
    let creds = listCredentials();
    if (_ctx.activeCat !== 'all') {
        creds = creds.filter(c => (c.category || 'general').toLowerCase() === _ctx.activeCat);
    }
    if (_ctx.search) {
        creds = creds.filter(c =>
            (c.name || '').toLowerCase().includes(_ctx.search) ||
            (c.username || '').toLowerCase().includes(_ctx.search) ||
            (c.url || '').toLowerCase().includes(_ctx.search)
        );
    }

    if (!creds.length) {
        host.innerHTML = `
            <div class="nws-empty">
                <div class="nws-empty-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                </div>
                <div class="nws-empty-title">${_ctx.search ? 'Sin resultados' : 'Tu bóveda está vacía'}</div>
                <div class="nws-empty-sub">${_ctx.search ? 'Prueba con otra búsqueda' : 'Guarda contraseñas, accesos a servidores, bases de datos y más — todo en local y ofuscado.'}</div>
            </div>
        `;
        return;
    }

    host.innerHTML = `<div class="vt-grid">${creds.map(buildCard).join('')}</div>`;

    host.querySelectorAll('.vt-card').forEach(card => {
        const id = card.dataset.id;
        card.querySelector('.vt-toggle')?.addEventListener('click', e => {
            e.stopPropagation();
            const mask = card.querySelector('.vt-pwd');
            const visible = card.classList.toggle('revealed');
            mask.textContent = visible ? getCredential(id).password : '••••••••••••';
            // Auto-hide a los 10s
            if (visible) {
                setTimeout(() => {
                    if (card.classList.contains('revealed')) {
                        card.classList.remove('revealed');
                        mask.textContent = '••••••••••••';
                    }
                }, 10000);
            }
        });
        card.querySelectorAll('[data-copy]').forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                const field = btn.dataset.copy;
                const c = getCredential(id);
                const val = field === 'password' ? c.password : c[field];
                navigator.clipboard.writeText(val || '').then(() => toast(`${field} copiado`, 'success'));
            };
        });
        card.querySelector('.vt-edit')?.addEventListener('click', e => {
            e.stopPropagation();
            openEditor(id);
        });
        card.querySelector('.vt-delete')?.addEventListener('click', async e => {
            e.stopPropagation();
            const c = getCredential(id);
            const ok = await nwConfirm({
                title: 'Eliminar credencial',
                message: `¿Estás seguro de eliminar "${c.name}"? Esta acción no se puede deshacer.`,
                okText: 'Eliminar',
                danger: true,
                icon: 'trash'
            });
            if (!ok) return;
            deleteCredential(id);
            renderCategories();
            renderGrid();
            toast('Credencial eliminada', 'success');
        });
    });
}

function buildCard(c) {
    const cat = CATEGORIES.find(x => x.id === (c.category || 'general').toLowerCase()) || CATEGORIES.find(x => x.id === 'general');
    return `
        <div class="vt-card" data-id="${c.id}" style="--c:${cat.color}">
            <div class="vt-card-stripe"></div>
            <div class="vt-card-top">
                <div class="vt-card-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${CAT_ICONS[cat.icon] || CAT_ICONS.key}</svg>
                </div>
                <div class="vt-card-info">
                    <div class="vt-card-name">${escapeHtml(c.name || 'Sin nombre')}</div>
                    <div class="vt-card-cat">${cat.name}</div>
                </div>
                <div class="vt-card-actions">
                    <button class="vt-mini vt-edit" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="vt-mini vt-delete" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>

            <div class="vt-card-rows">
                <div class="vt-card-row">
                    <span class="vt-lbl">Usuario</span>
                    <span class="vt-val">${escapeHtml(c.username || '—')}</span>
                    <button class="vt-mini" data-copy="username" title="Copiar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                </div>
                <div class="vt-card-row">
                    <span class="vt-lbl">Clave</span>
                    <span class="vt-val vt-pwd">••••••••••••</span>
                    <button class="vt-mini vt-toggle" title="Mostrar/ocultar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="vt-mini" data-copy="password" title="Copiar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                </div>
                ${c.url ? `
                <div class="vt-card-row">
                    <span class="vt-lbl">URL</span>
                    <a href="${escapeHtml(c.url)}" target="_blank" rel="noopener" class="vt-val vt-link">${escapeHtml(c.url)}</a>
                    <button class="vt-mini" data-copy="url" title="Copiar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                </div>` : ''}
                ${c.notes ? `<div class="vt-card-notes">${escapeHtml(c.notes)}</div>` : ''}
            </div>

            <div class="vt-card-foot">
                <span>Actualizado ${formatDate(c.updatedAt)}</span>
            </div>
        </div>
    `;
}

// ── Editor modal ────────────────────────────────────────────────
function openEditor(id) {
    const c = id ? getCredential(id) : { category: 'general', name: '', username: '', password: '', url: '', notes: '' };

    const overlay = document.createElement('div');
    overlay.className = 'vt-modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) close(); };

    overlay.innerHTML = `
        <div class="vt-modal">
            <div class="vt-modal-hdr">
                <h3>${id ? 'Editar credencial' : 'Nueva credencial'}</h3>
                <button class="nws-iconbtn" id="vte-close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="vt-modal-body">
                <label class="vt-fld">
                    <span class="vt-fld-lbl">Nombre *</span>
                    <input type="text" id="vte-name" value="${escapeHtml(c.name)}" placeholder="ej. Servidor producción">
                </label>
                <label class="vt-fld">
                    <span class="vt-fld-lbl">Categoría</span>
                    <select id="vte-cat">
                        ${CATEGORIES.map(x => `<option value="${x.id}" ${x.id === c.category ? 'selected' : ''}>${x.name}</option>`).join('')}
                    </select>
                </label>
                <label class="vt-fld">
                    <span class="vt-fld-lbl">Usuario</span>
                    <input type="text" id="vte-user" value="${escapeHtml(c.username)}" placeholder="admin">
                </label>
                <label class="vt-fld">
                    <span class="vt-fld-lbl">Contraseña</span>
                    <div class="vt-pwd-wrap">
                        <input type="password" id="vte-pwd" value="${escapeHtml(c.password)}">
                        <button type="button" class="nws-iconbtn" id="vte-gen" title="Generar contraseña">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        </button>
                        <button type="button" class="nws-iconbtn" id="vte-show" title="Mostrar/ocultar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                    <div class="vt-pwd-meter" id="vte-meter"><div></div></div>
                </label>
                <label class="vt-fld">
                    <span class="vt-fld-lbl">URL</span>
                    <input type="text" id="vte-url" value="${escapeHtml(c.url)}" placeholder="https://...">
                </label>
                <label class="vt-fld">
                    <span class="vt-fld-lbl">Notas</span>
                    <textarea id="vte-notes" rows="3" placeholder="Comentarios, instrucciones, recordatorios...">${escapeHtml(c.notes)}</textarea>
                </label>
            </div>
            <div class="vt-modal-ftr">
                <button class="nws-btn" id="vte-cancel">Cancelar</button>
                <button class="nws-btn primary" id="vte-save">${id ? 'Guardar cambios' : 'Crear credencial'}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const pwdEl = overlay.querySelector('#vte-pwd');
    const meter = overlay.querySelector('#vte-meter > div');

    const updateMeter = () => {
        const s = strengthScore(pwdEl.value);
        const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'];
        meter.style.width = ((s + 1) * 20) + '%';
        meter.style.background = colors[s];
    };
    pwdEl.oninput = updateMeter;
    updateMeter();

    overlay.querySelector('#vte-show').onclick = () => {
        pwdEl.type = pwdEl.type === 'password' ? 'text' : 'password';
    };
    overlay.querySelector('#vte-gen').onclick = () => {
        pwdEl.value = generatePassword();
        pwdEl.type = 'text';
        updateMeter();
    };

    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 220); };
    overlay.querySelector('#vte-close').onclick = close;
    overlay.querySelector('#vte-cancel').onclick = close;

    overlay.querySelector('#vte-save').onclick = () => {
        const name = overlay.querySelector('#vte-name').value.trim();
        if (!name) { toast('El nombre es requerido', 'warning'); return; }
        const data = {
            name,
            category: overlay.querySelector('#vte-cat').value,
            username: overlay.querySelector('#vte-user').value,
            password: pwdEl.value,
            url: overlay.querySelector('#vte-url').value,
            notes: overlay.querySelector('#vte-notes').value
        };
        if (id) updateCredential(id, data);
        else createCredential(data);
        close();
        renderCategories();
        renderGrid();
        toast(id ? 'Credencial actualizada' : 'Credencial creada', 'success');
    };
}

function strengthScore(pwd) {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 14) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score - 1, 4);
}

function generatePassword(length = 18) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr, n => chars[n % chars.length]).join('');
}

// ── Styles ──────────────────────────────────────────────────────
function injectStyles() {
    if (document.getElementById('vt-styles')) return;
    const s = document.createElement('style');
    s.id = 'vt-styles';
    s.textContent = `
        .nws-vault .nws-side { width: 240px; }

        .vt-cat {
            display: flex; align-items: center; gap: 10px;
            padding: 9px 11px; border-radius: 8px;
            cursor: pointer; transition: background .15s ease;
        }
        .vt-cat:hover { background: var(--surface); }
        .vt-cat.active {
            background: color-mix(in srgb, var(--c) 12%, var(--surface));
            box-shadow: inset 3px 0 0 var(--c);
        }
        .vt-cat-ico {
            width: 28px; height: 28px;
            border-radius: 8px;
            background: color-mix(in srgb, var(--c) 14%, transparent);
            color: var(--c);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .vt-cat-ico svg { width: 15px; height: 15px; }
        .vt-cat-name {
            flex: 1; font-size: 13px; font-weight: 600;
            color: var(--text-main);
        }
        .vt-cat-count {
            background: var(--surface-3);
            color: var(--text-muted);
            font-size: 10.5px; font-weight: 700;
            padding: 2px 7px;
            border-radius: 10px;
            font-family: 'JetBrains Mono', monospace;
        }

        /* ── Grid de cards ── */
        .vt-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 14px;
        }
        .vt-card {
            position: relative;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
            transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }
        .vt-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 30px rgba(0,0,0,.1);
            border-color: color-mix(in srgb, var(--c) 30%, var(--border));
        }
        .vt-card-stripe {
            position: absolute; top:0; left:0; right:0; height:3px;
            background: linear-gradient(90deg, var(--c), color-mix(in srgb, var(--c) 50%, transparent));
        }
        .vt-card-top {
            padding: 16px 16px 12px;
            display: flex; align-items: center; gap: 12px;
        }
        .vt-card-ico {
            width: 42px; height: 42px;
            border-radius: 11px;
            background: color-mix(in srgb, var(--c) 14%, transparent);
            color: var(--c);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .vt-card-ico svg { width: 20px; height: 20px; }
        .vt-card-info { flex: 1; min-width: 0; }
        .vt-card-name {
            font-size: 14px; font-weight: 700; color: var(--text-main);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .vt-card-cat {
            font-size: 11px; color: var(--text-muted);
            margin-top: 2px;
        }
        .vt-card-actions { display: flex; gap: 4px; }
        .vt-mini {
            width: 26px; height: 26px;
            border-radius: 7px;
            border: 1px solid transparent;
            background: transparent;
            color: var(--text-muted);
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all .15s ease;
        }
        .vt-mini:hover { background: var(--surface-3); color: var(--text-main); border-color: var(--border); }
        .vt-mini svg { width: 13px; height: 13px; }

        .vt-card-rows {
            padding: 0 16px 12px;
            display: flex; flex-direction: column; gap: 6px;
        }
        .vt-card-row {
            display: flex; align-items: center; gap: 8px;
            padding: 7px 10px;
            background: var(--surface-2);
            border-radius: 8px;
            font-size: 12.5px;
        }
        .vt-lbl {
            font-size: 10px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .4px;
            color: var(--text-muted);
            width: 50px; flex-shrink: 0;
        }
        .vt-val {
            flex: 1; font-family: 'JetBrains Mono', monospace;
            color: var(--text-main);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .vt-link { color: var(--primary); text-decoration: none; }
        .vt-link:hover { text-decoration: underline; }
        .vt-card-notes {
            padding: 8px 10px;
            background: var(--surface-2);
            border-radius: 8px;
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.5;
        }
        .vt-card-foot {
            padding: 10px 16px;
            border-top: 1px solid var(--border);
            font-size: 10.5px;
            color: var(--text-muted);
        }

        /* ── Modal editor ── */
        .vt-modal-overlay {
            position: fixed; inset: 0; z-index: var(--z-notes-modal);
            background: rgba(8,12,24,.55);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity .22s ease;
            padding: 20px;
        }
        .vt-modal-overlay.show { opacity: 1; }
        .vt-modal {
            background: var(--surface);
            border-radius: 16px;
            width: min(520px, 100%);
            max-height: calc(var(--vh-util) * 0.9 - env(safe-area-inset-bottom, 0px));
            box-shadow: 0 30px 80px rgba(0,0,0,.35);
            transform: scale(.94); transition: transform .25s cubic-bezier(.34,1.4,.64,1);
            overflow: hidden;
            display: flex; flex-direction: column;
        }
        .vt-modal-overlay.show .vt-modal { transform: scale(1); }
        .vt-modal-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 22px; border-bottom: 1px solid var(--border);
        }
        .vt-modal-hdr h3 { font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0; }
        .vt-modal-body {
            padding: 18px 22px;
            display: flex; flex-direction: column; gap: 14px;
            overflow-y: auto; max-height: calc(var(--vh-util) * 0.65);
        }
        .vt-fld { display: flex; flex-direction: column; gap: 6px; }
        .vt-fld-lbl {
            font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .4px;
            color: var(--text-muted);
        }
        .vt-fld input, .vt-fld select, .vt-fld textarea {
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
        .vt-fld input:focus, .vt-fld select:focus, .vt-fld textarea:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
        }
        .vt-pwd-wrap { display: flex; gap: 6px; }
        .vt-pwd-wrap input { flex: 1; }
        .vt-pwd-meter {
            height: 4px; background: var(--surface-3);
            border-radius: 3px; overflow: hidden;
            margin-top: 4px;
        }
        .vt-pwd-meter > div {
            height: 100%; width: 0;
            transition: width .25s ease, background .25s ease;
            border-radius: 3px;
        }
        .vt-modal-ftr {
            padding: 14px 22px;
            border-top: 1px solid var(--border);
            background: var(--surface-2);
            display: flex; align-items: center; justify-content: flex-end; gap: 8px;
        }
    `;
    document.head.appendChild(s);
}
