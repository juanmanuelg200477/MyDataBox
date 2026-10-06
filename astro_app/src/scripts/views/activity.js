import { fetchAuditLog } from '../auditLog.js';
import { escapeHtml } from '../utils.js';
import { toastError } from '../toast.js';

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

export function initActivity() {
    if (!document.getElementById('activity-module')) return;

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
