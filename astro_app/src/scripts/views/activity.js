import { fetchAuditLog } from '../auditLog.js';
import { escapeHtml, labelTableCells } from '../utils.js';
import { toastError } from '../toast.js';
import { supabase } from '../supabase.js';
import { listarSesiones, esOwner } from '../sessionLog.js';

// ════════════════════════════════════════════════════════════════
//  ACTIVIDAD — visor de la bitácora de auditoría
//  Lee la tabla audit_log (ver supabase/migrations/…_audit_log.sql).
// ════════════════════════════════════════════════════════════════

const PAGE_SIZE = 50;

const ENTITY_LABELS = {
    region:       'Región',
    area:         'Área',
    contact:      'Contacto',
    category:     'Categoría',
    rack:         'Bastidor',
    device:       'Dispositivo',
    isp_link:     'Enlace ISP',
    isp_incident: 'Incidente ISP'
};

const ACTIONS = {
    insert: { label: 'Creó',     badge: 'badge-active' },
    update: { label: 'Modificó', badge: 'badge-info' },
    delete: { label: 'Eliminó',  badge: 'badge-inactive' }
};

let _offset   = 0;
let _hasMore  = true;
let _loading  = false;
let _filters  = { entityType: '', action: '' };

function formatWhen(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-DO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
}

function renderChanges(changes) {
    if (!changes || typeof changes !== 'object') return '';
    const fields = Object.entries(changes);
    if (!fields.length) return '';

    const rows = fields.map(([field, value]) => `
        <div class="ac-change">
            <span class="ac-change-field">${escapeHtml(field)}</span>
            <span class="ac-change-before">${escapeHtml(value?.antes ?? '—')}</span>
            <span class="ac-change-arrow">→</span>
            <span class="ac-change-after">${escapeHtml(value?.despues ?? '—')}</span>
        </div>`).join('');

    return `<details class="ac-details">
        <summary>${fields.length} campo${fields.length !== 1 ? 's' : ''}</summary>
        <div class="ac-changes">${rows}</div>
    </details>`;
}

function rowHtml(entry) {
    const action = ACTIONS[entry.action] ?? { label: entry.action, badge: 'badge-purple' };
    const entity = ENTITY_LABELS[entry.entity_type] ?? entry.entity_type;

    return `<tr>
        <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--text-muted)">
            ${escapeHtml(formatWhen(entry.created_at))}
        </td>
        <td style="font-size:12.5px">${escapeHtml(entry.user_email ?? '—')}</td>
        <td><span class="badge ${action.badge}">${escapeHtml(action.label)}</span></td>
        <td><span class="badge badge-purple">${escapeHtml(entity)}</span></td>
        <td><strong>${escapeHtml(entry.entity_name ?? '—')}</strong></td>
        <td>${renderChanges(entry.changes)}</td>
    </tr>`;
}

function setStatus(message) {
    const el = document.getElementById('activity-status');
    if (el) el.textContent = message;
}

async function loadPage({ reset = false } = {}) {
    if (_loading) return;
    _loading = true;

    const tbody     = document.getElementById('activity-tbody');
    const container = document.getElementById('activity-table-container');
    const empty     = document.getElementById('activity-empty-state');
    const moreBtn   = document.getElementById('activity-more');
    if (!tbody) { _loading = false; return; }

    if (reset) {
        _offset  = 0;
        _hasMore = true;
        tbody.innerHTML = '';
    }

    if (moreBtn) moreBtn.disabled = true;
    setStatus('Cargando…');

    try {
        const entries = await fetchAuditLog({ ..._filters, limit: PAGE_SIZE, offset: _offset });

        _offset += entries.length;
        _hasMore = entries.length === PAGE_SIZE;

        if (entries.length) tbody.insertAdjacentHTML('beforeend', entries.map(rowHtml).join(''));

        const total = tbody.children.length;
        if (total === 0) {
            container.style.display = 'none';
            empty.style.display     = 'flex';
        } else {
            container.style.display = 'block';
            empty.style.display     = 'none';
        }

        setStatus(total ? `${total} registro${total !== 1 ? 's' : ''}${_hasMore ? ' (hay más)' : ''}` : '');
        if (moreBtn) moreBtn.style.display = _hasMore ? 'inline-flex' : 'none';

    } catch (err) {
        // Mensaje accionable: el fallo más probable es que la migración de
        // audit_log no se haya aplicado en este proyecto de Supabase.
        setStatus('No se pudo cargar la bitácora.');
        container.style.display = 'none';
        empty.style.display     = 'flex';
        toastError('No se pudo leer la bitácora de actividad. Comprueba que la migración de audit_log esté aplicada.', {
            title: 'Error al cargar', detail: err?.message
        });
    } finally {
        _loading = false;
        if (moreBtn) moreBtn.disabled = false;
    }
}

// ── Sesiones (solo dueño) ───────────────────────────────────────

function sessionRowHtml(s) {
    const estado = s.activo
        ? '<span class="ses-dot ses-on"></span>Conectado'
        : '<span class="ses-dot ses-off"></span>Desconectado';

    return `<tr>
        <td style="font-size:12.5px">${escapeHtml(s.user_email ?? '—')}</td>
        <td><span class="badge badge-purple">${escapeHtml(s.user_role ?? '—')}</span></td>
        <td><strong>${estado}</strong></td>
        <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11.5px">${escapeHtml(formatWhen(s.started_at))}</td>
        <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11.5px">${escapeHtml(formatWhen(s.last_seen_at))}</td>
        <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11.5px">${s.ended_at ? escapeHtml(formatWhen(s.ended_at)) : '—'}</td>
    </tr>`;
}

async function loadSessions() {
    const tbody     = document.getElementById('sessions-tbody');
    const container = document.getElementById('sessions-table-container');
    const empty     = document.getElementById('sessions-empty-state');
    const estado    = document.getElementById('sessions-status');
    if (!tbody) return;

    if (estado) estado.textContent = 'Cargando…';

    try {
        const sesiones = await listarSesiones();

        if (!sesiones.length) {
            container.style.display = 'none';
            empty.style.display     = 'flex';
            if (estado) estado.textContent = '';
            return;
        }

        container.style.display = 'block';
        empty.style.display     = 'none';
        tbody.innerHTML = sesiones.map(sessionRowHtml).join('');
        labelTableCells(tbody);

        const conectados = sesiones.filter(s => s.activo).length;
        if (estado) {
            estado.textContent =
                `${sesiones.length} registro${sesiones.length !== 1 ? 's' : ''} · ${conectados} conectado${conectados !== 1 ? 's' : ''}`;
        }
    } catch (err) {
        container.style.display = 'none';
        empty.style.display     = 'flex';
        if (estado) estado.textContent = 'No se pudo cargar.';
        toastError('No se pudo leer el historial de sesiones.', {
            title: 'Error al cargar', detail: err?.message
        });
    }
}

// La pestaña solo se ofrece al dueño. Es comodidad: aunque alguien la
// forzara, RLS no le devolvería ni una fila.
async function setupOwnerTabs() {
    let user = null;
    try {
        const { data } = await supabase.auth.getSession();
        user = data?.session?.user ?? null;
    } catch { return; }

    if (!esOwner(user)) return;

    const tabs = document.getElementById('activity-tabs');
    if (!tabs) return;
    tabs.style.display = 'flex';

    const paneles = {
        changes:  document.getElementById('activity-pane-changes'),
        sessions: document.getElementById('activity-pane-sessions')
    };

    tabs.querySelectorAll('.act-tab').forEach(btn => {
        btn.onclick = () => {
            const destino = btn.dataset.pane;
            tabs.querySelectorAll('.act-tab').forEach(b => b.classList.toggle('active', b === btn));
            Object.entries(paneles).forEach(([clave, el]) => {
                if (el) el.style.display = clave === destino ? '' : 'none';
            });
            if (destino === 'sessions') loadSessions();
        };
    });

    document.getElementById('sessions-refresh')?.addEventListener('click', loadSessions);
}

export function initActivity() {
    if (!document.getElementById('activity-module')) return;

    setupOwnerTabs();

    const entitySel = document.getElementById('activity-entity-filter');
    if (entitySel && !entitySel.dataset.filled) {
        entitySel.dataset.filled = 'true';
        entitySel.innerHTML = '<option value="">Todos los tipos</option>' +
            Object.entries(ENTITY_LABELS)
                .map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`)
                .join('');
    }

    // onchange (no addEventListener) para no acumular manejadores en cada visita.
    if (entitySel) {
        entitySel.value = _filters.entityType;
        entitySel.onchange = () => { _filters.entityType = entitySel.value; loadPage({ reset: true }); };
    }

    const actionSel = document.getElementById('activity-action-filter');
    if (actionSel) {
        actionSel.value = _filters.action;
        actionSel.onchange = () => { _filters.action = actionSel.value; loadPage({ reset: true }); };
    }

    const moreBtn = document.getElementById('activity-more');
    if (moreBtn) moreBtn.onclick = () => loadPage();

    loadPage({ reset: true });
}
