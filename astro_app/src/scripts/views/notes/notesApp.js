// ════════════════════════════════════════════════════════════════
//  NOTES APP — Controlador principal del workspace
//  Maneja la navegación entre las 4 secciones y los stats del header.
// ════════════════════════════════════════════════════════════════

import { getState, updateSettings, subscribe, initNotesStore } from '../../notesStore.js';
import { isViewer } from '../../store.js';
import { renderApuntes } from './notes-section.js';
import { renderBoveda } from './vault-section.js';
import { renderComandos } from './commands-section.js';
import { renderPlanos } from './blueprint-section.js';

const SECTIONS = {
    apuntes: renderApuntes,
    boveda: renderBoveda,
    comandos: renderComandos,
    planos: renderPlanos
};

let _activeSection = null;
let _statsUnsubscribe = null; // referencia para evitar suscripciones duplicadas

export async function initNotesApp() {
    const root = document.getElementById('nw-root');
    if (!root) return;

    // Re-inyectar estilos globales del módulo (toast + modal genérico)
    // por si Astro ClientRouter los removió en la navegación previa.
    ensureSharedStyles();

    // Bloquear acceso a viewers — el workspace es estrictamente personal
    if (isViewer()) {
        renderAccessDenied(root);
        return;
    }

    // RESET de estado por navegación: con Astro ClientRouter el módulo persiste
    // entre navegaciones. Si no reseteamos `_activeSection`, navigate() vuelve
    // a salir temprano y el spinner se queda fijo porque cree que la sección
    // ya estaba activa.
    _activeSection = null;

    // Limpiar suscripciones previas para no acumular listeners en cada visita
    if (_statsUnsubscribe) { try { _statsUnsubscribe(); } catch {} _statsUnsubscribe = null; }

    // Carga inicial desde Supabase (muestra spinner mientras tanto)
    const status = await initNotesStore();

    // Si entre tanto el usuario navegó fuera de /notas, abortamos
    if (!document.getElementById('nw-root')) return;

    // Sin datos cargados NO renderizamos el workspace: mostrar las secciones
    // vacías le haría creer al usuario que no tiene nada guardado, y todo lo
    // que escribiera ahí se perdería al recargar.
    if (!status?.ok) {
        if (status?.reason === 'no-session') renderNoSession(root);
        else renderLoadFailed(root, status?.detail);
        return;
    }

    refreshStats();

    // Reaccionar a cambios en el store (cualquier sección que agregue/borre)
    _statsUnsubscribe = subscribe(() => refreshStats());

    // Wire tabs
    root.querySelectorAll('.nw-tab').forEach(tab => {
        tab.addEventListener('click', () => navigate(tab.dataset.section));
    });

    // Botón flotante de crear (teléfono): cada sección ya tiene el suyo,
    // así que se delega en el que esté montado en ese momento en vez de
    // duplicar la lógica de creación.
    const fab = document.getElementById('nw-fab');
    if (fab) {
        fab.onclick = () => {
            document.querySelector('#ap-new-note, #vt-add, #cm-add')?.click();
        };
    }

    // Sección inicial
    let initial = getState().settings.activeSection || 'apuntes';
    // Planos está oculto en teléfono; si quedó guardado desde el escritorio
    // el usuario aterrizaría en una pestaña que no puede ni ver ni cambiar.
    if (initial === 'planos' && esPantallaEstrecha()) initial = 'apuntes';
    navigate(initial);
}

// Mismo umbral que el @media de NotesModule.astro que oculta la pestaña
function esPantallaEstrecha() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function navigate(section) {
    if (!SECTIONS[section]) section = 'apuntes';
    if (section === 'planos' && esPantallaEstrecha()) section = 'apuntes';
    if (_activeSection === section) return;
    _activeSection = section;

    // Marca tab activa
    document.querySelectorAll('.nw-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.section === section);
    });

    // Persiste preferencia
    updateSettings({ activeSection: section });

    // Render
    const host = document.getElementById('nw-content');
    if (!host) return;
    host.innerHTML = '';
    try {
        SECTIONS[section](host);
    } catch (e) {
        console.error('[notesApp] section render failed', e);
        host.innerHTML = `<div class="nws-empty"><div class="nws-empty-title">Error al cargar</div><div class="nws-empty-sub">${e.message}</div></div>`;
    }
}

// ── Pantalla de acceso denegado para viewers ─────────────────────
// Pantalla de bloqueo del workspace, compartida por todos los motivos por los
// que no podemos mostrarlo (rol viewer, sin sesión, fallo de carga).
function renderBlockedScreen(root, { icon, title, sub, info, detail = '', actionHref, actionLabel }) {
    // Forzar tema oscuro elegante, sin importar la preferencia del usuario.
    // Así el topbar y todo el chrome se ve coherente con la pantalla de bloqueo.
    document.documentElement.classList.add('nw-dark');

    root.innerHTML = `
        <div class="nw-denied">
            <div class="nw-denied-card">
                <div class="nw-denied-orb">${icon}</div>
                <h1 class="nw-denied-title">${title}</h1>
                <p class="nw-denied-sub">${sub}</p>
                <p class="nw-denied-info">${info}</p>
                ${detail ? '<p class="nw-denied-detail"></p>' : ''}
                <div class="nw-denied-actions">
                    <a href="${actionHref}" class="nw-denied-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        ${actionLabel}
                    </a>
                </div>
            </div>
        </div>
        <style>
            .nw-denied {
                min-height: calc(100vh - 130px);
                display: flex; align-items: center; justify-content: center;
                padding: 20px;
                animation: nwIn .4s cubic-bezier(0.4,0,0.2,1);
            }
            .nw-denied-card {
                max-width: 480px; width: 100%;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 18px;
                padding: 40px 36px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,.08);
                position: relative; overflow: hidden;
            }
            .nw-denied-card::before {
                content: ''; position: absolute;
                top: 0; left: 0; right: 0; height: 4px;
                background: linear-gradient(90deg, #ef4444, #f59e0b);
            }
            .nw-denied-orb {
                width: 78px; height: 78px;
                margin: 0 auto 22px;
                border-radius: 50%;
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                color: #b45309;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 8px 24px rgba(245, 158, 11, .25);
            }
            .nw-denied-orb svg { width: 36px; height: 36px; }
            .nw-denied-title {
                font-size: 24px; font-weight: 800;
                color: var(--text-main); margin: 0 0 8px;
                letter-spacing: -.5px;
            }
            .nw-denied-sub {
                font-size: 14px; color: var(--text-main);
                font-weight: 600; margin: 0 0 14px;
            }
            .nw-denied-info {
                font-size: 13px; color: var(--text-muted);
                line-height: 1.6; margin: 0 0 26px;
            }
            .nw-denied-info strong {
                color: #b45309;
                background: #fef3c7;
                padding: 1px 7px;
                border-radius: 4px;
                font-weight: 700;
            }
            .nw-denied-btn {
                display: inline-flex; align-items: center; gap: 8px;
                padding: 11px 22px;
                background: var(--primary);
                color: #fff;
                text-decoration: none;
                border-radius: 10px;
                font-size: 13.5px; font-weight: 700;
                transition: all .2s ease;
                box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 35%, transparent);
            }
            .nw-denied-btn:hover {
                background: var(--primary-hover);
                transform: translateY(-2px);
                box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 40%, transparent);
            }
            .nw-denied-btn svg { width: 16px; height: 16px; }
            .nw-denied-detail {
                margin: -14px 0 24px;
                font-size: 11.5px;
                font-family: 'JetBrains Mono', monospace;
                color: var(--text-muted);
                overflow-wrap: anywhere;
            }
        </style>
    `;

    // textContent y no innerHTML: el detalle viene del mensaje de error de Supabase.
    if (detail) {
        const detailEl = root.querySelector('.nw-denied-detail');
        if (detailEl) detailEl.textContent = detail;
    }
}

const ICON_LOCK  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

function renderAccessDenied(root) {
    renderBlockedScreen(root, {
        icon: ICON_LOCK,
        title: 'Acceso denegado',
        sub: 'El workspace personal está restringido a usuarios con permisos de edición.',
        info: 'Tu sesión actual tiene rol <strong>viewer</strong>. Si necesitas acceso a tus apuntes, credenciales y planos, contacta a un administrador para que actualice tus permisos.',
        actionHref: '/',
        actionLabel: 'Volver al Dashboard'
    });
}

function renderNoSession(root) {
    renderBlockedScreen(root, {
        icon: ICON_LOCK,
        title: 'Sesión no válida',
        sub: 'No pudimos verificar tu sesión, así que el workspace no se cargó.',
        info: 'Tus apuntes, credenciales y comandos siguen guardados en el servidor y asociados a tu cuenta: <strong>no se ha perdido nada</strong>. Vuelve a iniciar sesión para recuperarlos.',
        actionHref: '/login',
        actionLabel: 'Iniciar sesión de nuevo'
    });
}

function renderLoadFailed(root, detail) {
    renderBlockedScreen(root, {
        icon: ICON_ALERT,
        title: 'No se pudo cargar el workspace',
        sub: 'Hubo un problema al leer tus datos del servidor.',
        info: 'No mostramos el workspace vacío para que no parezca que no tienes nada guardado. Revisa tu conexión y vuelve a intentarlo: <strong>tus datos siguen en el servidor</strong>.',
        detail,
        actionHref: '/notas',
        actionLabel: 'Reintentar'
    });
}

function refreshStats() {
    const s = getState();
    const map = {
        notes: s.notes.length,
        credentials: s.credentials.length,
        commands: s.commands.length,
        drawings: s.drawings.length
    };
    Object.entries(map).forEach(([k, v]) => {
        const el = document.querySelector(`.nw-stat[data-stat="${k}"] .nw-stat-n`);
        if (el) el.textContent = v;
    });
}

// Helper compartido para todas las secciones
export function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

export function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
}

export function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `nws-toast nws-toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 250);
    }, 2200);
}

// ════════════════════════════════════════════════════════════════
//  MODALES PROFESIONALES (reemplazan prompt() y confirm())
// ════════════════════════════════════════════════════════════════

// Prompt async — devuelve Promise<string|null>
export function nwPrompt({ title, label = '', placeholder = '', defaultValue = '', okText = 'Aceptar', cancelText = 'Cancelar', icon = 'edit' } = {}) {
    return new Promise(resolve => {
        const overlay = buildModal({
            title,
            icon,
            body: `
                ${label ? `<label class="nwm-label">${escapeHtml(label)}</label>` : ''}
                <input type="text" class="nwm-input" id="nwm-input" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" autocomplete="off">
            `,
            actions: [
                { id: 'cancel', label: cancelText, kind: 'ghost', value: null },
                { id: 'ok', label: okText, kind: 'primary', value: 'OK' }
            ],
            onResolve: resolve
        });
        const input = overlay.querySelector('#nwm-input');
        setTimeout(() => { input?.focus(); input?.select(); }, 80);
        input?.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const v = input.value.trim();
                closeModal(overlay, v || null, resolve);
            }
        });
        overlay.querySelector('[data-act="ok"]').addEventListener('click', () => {
            const v = input.value.trim();
            closeModal(overlay, v || null, resolve);
        });
    });
}

// Confirm async — devuelve Promise<boolean>
export function nwConfirm({ title, message = '', okText = 'Confirmar', cancelText = 'Cancelar', danger = false, icon = 'alert' } = {}) {
    return new Promise(resolve => {
        const overlay = buildModal({
            title,
            icon,
            body: `<p class="nwm-msg">${escapeHtml(message)}</p>`,
            actions: [
                { id: 'cancel', label: cancelText, kind: 'ghost', value: false },
                { id: 'ok', label: okText, kind: danger ? 'danger' : 'primary', value: true }
            ],
            onResolve: resolve
        });
    });
}

// Builder genérico de modal
function buildModal({ title, body, actions, icon, onResolve }) {
    const overlay = document.createElement('div');
    overlay.className = 'nwm-overlay';
    overlay.innerHTML = `
        <div class="nwm-modal" role="dialog" aria-modal="true">
            <header class="nwm-hdr">
                <span class="nwm-ico nwm-ico-${icon}">${ICONS[icon] || ICONS.edit}</span>
                <h3 class="nwm-title">${escapeHtml(title)}</h3>
                <button class="nwm-x" aria-label="Cerrar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </header>
            <div class="nwm-body">${body}</div>
            <footer class="nwm-ftr">
                ${actions.map(a => `<button class="nwm-btn nwm-btn-${a.kind}" data-act="${a.id}">${escapeHtml(a.label)}</button>`).join('')}
            </footer>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    // Wire close handlers
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay, false, onResolve); });
    overlay.querySelector('.nwm-x').addEventListener('click', () => closeModal(overlay, false, onResolve));

    actions.forEach(a => {
        if (a.id === 'ok' && body.includes('id="nwm-input"')) return; // handled by caller
        overlay.querySelector(`[data-act="${a.id}"]`).addEventListener('click', () => {
            closeModal(overlay, a.value, onResolve);
        });
    });

    // ESC para cerrar
    const onKey = e => {
        if (e.key === 'Escape') closeModal(overlay, false, onResolve);
    };
    document.addEventListener('keydown', onKey);
    overlay._cleanup = () => document.removeEventListener('keydown', onKey);

    return overlay;
}

function closeModal(overlay, value, resolve) {
    overlay.classList.remove('show');
    overlay._cleanup?.();
    setTimeout(() => { overlay.remove(); resolve?.(value); }, 220);
}

const ICONS = {
    edit:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    folder:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    alert:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    trash:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    link:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    text:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    plan:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2v18l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2 2-2V2z"/><line x1="7" y1="8" x2="17" y2="8"/></svg>'
};

// ════════════════════════════════════════════════════════════════
//  ESTILOS GLOBALES (toast + modal genérico)
//  Se inyectan/re-inyectan en cada llamada a ensureSharedStyles().
//  El atributo data-astro-transition-persist evita que Astro
//  ClientRouter los elimine al cambiar de página.
// ════════════════════════════════════════════════════════════════
export function ensureSharedStyles() {
    let s = document.getElementById('nws-shared-styles');
    if (s) {
        // Asegurar el atributo persist por si fue eliminado
        s.setAttribute('data-astro-transition-persist', 'nws-shared-styles');
        return;
    }
    s = document.createElement('style');
    s.id = 'nws-shared-styles';
    s.setAttribute('data-astro-transition-persist', 'nws-shared-styles');
    s.textContent = `
        /* ── Toast ── */
        .nws-toast {
            position: fixed; bottom: 28px; left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: #0f172a; color: #fff;
            padding: 10px 18px; border-radius: 10px;
            font-size: 13px; font-weight: 600;
            box-shadow: 0 8px 30px rgba(0,0,0,.3);
            z-index: var(--z-notes-popover); opacity: 0;
            transition: all .25s cubic-bezier(0.34,1.4,0.64,1);
            pointer-events: none;
        }
        .nws-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        .nws-toast-success { background: #10b981; }
        .nws-toast-danger { background: #ef4444; }
        .nws-toast-warning { background: #f59e0b; }

        /* ── Modal genérico (prompt / confirm) ── */
        .nwm-overlay {
            position: fixed; inset: 0; z-index: var(--z-notes-modal);
            background: rgba(8,12,24,.6);
            backdrop-filter: blur(8px) saturate(140%);
            -webkit-backdrop-filter: blur(8px) saturate(140%);
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
            opacity: 0;
            transition: opacity .22s ease;
        }
        .nwm-overlay.show { opacity: 1; }

        /* En teléfono el diálogo aprovecha el ancho y limita su alto, que
           con formularios largos (credenciales) se salía de pantalla. */
        @media (max-width: 768px) {
            .nwm-overlay { padding: 12px; }
            .nwm-modal { max-height: 88vh; display: flex; flex-direction: column; }
            .nwm-body { overflow-y: auto; }
        }
        .nwm-modal {
            background: var(--surface);
            border-radius: 16px;
            width: min(460px, 100%);
            box-shadow: 0 30px 80px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset;
            transform: scale(.92) translateY(10px);
            opacity: 0;
            transition: transform .28s cubic-bezier(0.34,1.4,0.64,1), opacity .2s ease;
            overflow: hidden;
        }
        .nwm-overlay.show .nwm-modal { transform: scale(1) translateY(0); opacity: 1; }
        .nwm-hdr {
            display: flex; align-items: center; gap: 12px;
            padding: 18px 20px 14px;
            border-bottom: 1px solid var(--border);
        }
        .nwm-ico {
            width: 38px; height: 38px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            background: color-mix(in srgb, var(--primary) 12%, transparent);
            color: var(--primary);
            flex-shrink: 0;
        }
        .nwm-ico svg { width: 18px; height: 18px; }
        .nwm-ico-alert { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #f59e0b; }
        .nwm-ico-trash { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); }
        .nwm-title {
            flex: 1;
            font-size: 16px; font-weight: 700;
            color: var(--text-main);
            margin: 0;
            letter-spacing: -.2px;
        }
        .nwm-x {
            width: 30px; height: 30px;
            border: none; background: transparent;
            color: var(--text-muted);
            border-radius: 8px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all .15s ease;
        }
        .nwm-x:hover { background: var(--surface-3); color: var(--text-main); }
        .nwm-x svg { width: 16px; height: 16px; }
        .nwm-body {
            padding: 18px 20px;
        }
        .nwm-label {
            display: block;
            font-size: 11.5px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .5px;
            color: var(--text-muted);
            margin-bottom: 8px;
        }
        .nwm-input {
            width: 100%;
            padding: 10px 13px;
            border: 1px solid var(--border);
            border-radius: 9px;
            font-size: 14px;
            background: var(--surface-2);
            color: var(--text-main);
            outline: none;
            font-family: inherit;
            transition: border-color .15s ease, box-shadow .15s ease;
        }
        .nwm-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
        }
        .nwm-msg {
            margin: 0;
            font-size: 13.5px;
            color: var(--text-main);
            line-height: 1.55;
        }
        .nwm-ftr {
            padding: 12px 20px 16px;
            display: flex; gap: 8px;
            justify-content: flex-end;
            border-top: 1px solid var(--border);
            background: var(--surface-2);
        }
        .nwm-btn {
            padding: 9px 16px;
            border-radius: 9px;
            font-size: 13px; font-weight: 600;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all .18s ease;
            font-family: inherit;
            min-width: 90px;
        }
        .nwm-btn-ghost {
            background: var(--surface);
            border-color: var(--border);
            color: var(--text-main);
        }
        .nwm-btn-ghost:hover {
            background: var(--surface-3);
        }
        .nwm-btn-primary {
            background: var(--primary);
            color: #fff;
            border-color: var(--primary);
            box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent);
        }
        .nwm-btn-primary:hover { background: var(--primary-hover); }
        .nwm-btn-danger {
            background: var(--danger);
            color: #fff;
            border-color: var(--danger);
            box-shadow: 0 2px 8px color-mix(in srgb, var(--danger) 30%, transparent);
        }
        .nwm-btn-danger:hover { filter: brightness(.92); }
    `;
    document.head.appendChild(s);
}

// Llamada inicial (al importar el módulo). En navegaciones siguientes
// se vuelve a invocar desde initNotesApp() para re-inyectar si Astro
// removió el estilo entre transiciones.
ensureSharedStyles();
