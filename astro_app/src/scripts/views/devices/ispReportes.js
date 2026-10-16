// ─────────────────────────────────────────────────────────────
// REPORTES ISP — lista de incidencias con filtros y paginación.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save } from '../../store.js';
import { icons } from '../../icons.js';
import { showIncidentForm, showIncidentDetail } from './ispReporteFicha.js';

// ─────────────────────────────────────────────────────────────
// REPORTES ISP — Registro de Inconvenientes
// ─────────────────────────────────────────────────────────────
export const SEVERITY_CFG = {
    'Crítico': { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', dot: '#ef4444' },
    'Alto':    { bg: 'rgba(249,115,22,0.12)', color: '#ea580c', dot: '#f97316' },
    'Medio':   { bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04', dot: '#eab308' },
    'Bajo':    { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', dot: '#22c55e' },
};
export const STATUS_CFG = {
    'Abierto':    { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
    'En Proceso': { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
    'Cerrado':    { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
};
export const KNOWN_TYPES = ['Corte Total','Degradación de Servicio','Latencia Alta','Pérdida de Paquetes','Inestabilidad','Fallo de Equipo ISP','Otro'];
const INCIDENTS_PER_PAGE = 20;
let currentPageIncidents = 1;
let _incidentFilters = { isp: '', type: '', dateFrom: '', dateTo: '' };

function _getFilteredIncidents() {
    if (!store.ispIncidents) store.ispIncidents = [];
    return store.ispIncidents.filter(i => {
        if (_incidentFilters.isp      && i.isp  !== _incidentFilters.isp)  return false;
        if (_incidentFilters.type     && i.type !== _incidentFilters.type)  return false;
        if (_incidentFilters.dateFrom && i.date  < _incidentFilters.dateFrom) return false;
        if (_incidentFilters.dateTo   && i.date  > _incidentFilters.dateTo)   return false;
        return true;
    });
}

function _hideReportesHeaderFilters() {
    // Hide the "Resultados" card wrapper — Reportes renders inline into tableContainer
    // (but tableContainer IS inside the card, so we only hide the card-header, not the full card)
    ['dev-area-filter','dev-status-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const sb = document.querySelector('.search-box');
    if (sb) sb.style.display = 'none';
    const regFil = document.getElementById('dev-region-filter');
    if (regFil) regFil.style.display = 'none';
}

function _buildIncidentRow(inc, globalIdx) {
    const reg     = store.regions.find(r => r.id === inc.regionId);
    const sevCfg  = SEVERITY_CFG[inc.severity] || { bg:'rgba(100,116,139,0.1)', color:'#64748b', dot:'#94a3b8' };
    const stCfg   = STATUS_CFG[inc.status]     || { bg:'rgba(100,116,139,0.1)', color:'#64748b' };
    const fmtDate = d => d ? new Date(d).toLocaleDateString('es-DO', { day:'2-digit', month:'short', year:'numeric' }) : '—';
    const eyeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    return `
    <tr style="border-bottom:1px solid var(--border);transition:background 0.15s;" onmouseover="this.style.background='rgba(59,130,246,0.03)'" onmouseout="this.style.background=''">
        <td style="padding:11px 12px;width:40px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${globalIdx}</td>
        <td style="padding:11px 12px;min-width:100px;">
            <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${sevCfg.bg};color:${sevCfg.color};">
                <span style="width:7px;height:7px;border-radius:50%;background:${sevCfg.dot};flex-shrink:0;"></span>${inc.severity || '—'}
            </span>
        </td>
        <td style="padding:11px 12px;min-width:110px;">
            <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${stCfg.bg};color:${stCfg.color};">${inc.status || '—'}</span>
        </td>
        <td style="padding:11px 12px;min-width:120px;font-weight:700;font-size:13px;color:var(--text);white-space:nowrap;">${inc.isp || '—'}</td>
        <td style="padding:11px 12px;min-width:110px;font-size:12px;color:var(--text-muted);white-space:nowrap;">${reg ? reg.name : '—'}</td>
        <td style="padding:11px 12px;min-width:120px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--primary);">${inc.ticketNo || '—'}</td>
        <td style="padding:11px 12px;min-width:150px;font-size:12px;white-space:nowrap;">${inc.type || '—'}</td>
        <td style="padding:11px 12px;min-width:130px;font-size:12px;white-space:nowrap;">${fmtDate(inc.date)}</td>
        <td style="padding:11px 12px;min-width:140px;font-size:12px;white-space:nowrap;">${fmtDate(inc.resolvedDate)}</td>
        <td style="padding:11px 12px;min-width:110px;font-size:12px;white-space:nowrap;color:${inc.resolutionTime ? 'var(--text)' : 'var(--text-muted)'};">${inc.resolutionTime || '—'}</td>
        <td style="padding:11px 12px;min-width:260px;font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(inc.description||'').replace(/"/g,'&quot;')}">${inc.description || '—'}</td>
        <td style="padding:11px 12px;min-width:110px;white-space:nowrap;text-align:right;">
            <button class="btn-icon btn-view-inc" data-id="${inc.id}" title="Ver detalle">${eyeIcon}</button>
            <button class="btn-icon btn-edit-inc" data-id="${inc.id}" title="Editar">${icons.edit}</button>
            <button class="btn-icon danger btn-del-inc" data-id="${inc.id}" title="Eliminar">${icons.trash}</button>
        </td>
    </tr>`;
}

export function renderReportesView() {
    const tableContainer = document.getElementById('devices-table-container');
    const emptyState     = document.getElementById('devices-empty-state');
    const btnAdd         = document.getElementById('btn-add-device');
    if (btnAdd) btnAdd.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';

    // Hide irrelevant header filters (cleanup was already called by renderDevicesTable)
    _hideReportesHeaderFilters();

    if (!store.ispIncidents) store.ispIncidents = [];
    const allInc     = store.ispIncidents;
    const filtered   = _getFilteredIncidents();
    const totalPages = Math.max(1, Math.ceil(filtered.length / INCIDENTS_PER_PAGE));
    if (currentPageIncidents > totalPages) currentPageIncidents = totalPages;
    const pageSlice  = filtered.slice((currentPageIncidents-1)*INCIDENTS_PER_PAGE, currentPageIncidents*INCIDENTS_PER_PAGE);

    // ── KPI (always over ALL incidents, not filtered) ─────────
    const total     = allInc.length;
    const abiertos  = allInc.filter(i => i.status  === 'Abierto').length;
    const enProceso = allInc.filter(i => i.status  === 'En Proceso').length;
    const cerrados  = allInc.filter(i => i.status  === 'Cerrado').length;
    const criticos  = allInc.filter(i => i.severity === 'Crítico').length;

    // ── Filter bar options ────────────────────────────────────
    const uniqueIsps  = [...new Set(allInc.map(i => i.isp).filter(Boolean))].sort();
    const uniqueTypes = [...new Set(allInc.map(i => i.type).filter(Boolean))].sort();

    const ispOpts  = uniqueIsps.map(v  => `<option value="${v}"  ${_incidentFilters.isp  === v  ? 'selected':''  }>${v}</option>`).join('');
    const typeOpts = uniqueTypes.map(v => `<option value="${v}" ${_incidentFilters.type === v ? 'selected':''   }>${v}</option>`).join('');

    // ── Table rows ────────────────────────────────────────────
    const startIdx  = (currentPageIncidents - 1) * INCIDENTS_PER_PAGE;
    const tableRows = pageSlice.length
        ? pageSlice.map((inc, i) => _buildIncidentRow(inc, startIdx + i + 1)).join('')
        : `<tr><td colspan="12" style="padding:50px;text-align:center;color:var(--text-muted);font-style:italic;">
               ${filtered.length === 0 && allInc.length === 0
                   ? 'No hay registros de inconvenientes. Usa el botón "Registrar Inconveniente" para añadir uno.'
                   : 'Ningún registro coincide con los filtros aplicados.'}
           </td></tr>`;

    // ── Pagination HTML ───────────────────────────────────────
    let pagHtml = '';
    if (totalPages > 1) {
        const pages = Array.from({length: totalPages}, (_,i) => i+1);
        pagHtml = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0 0;border-top:1px solid var(--border);margin-top:4px;">
            <span style="font-size:13px;color:var(--text-muted);">Mostrando <strong>${pageSlice.length}</strong> de <strong>${filtered.length}</strong> registros</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-outline btn-sm inc-page-btn" data-page="${currentPageIncidents-1}" ${currentPageIncidents===1?'disabled':''} style="padding:5px 10px;">‹</button>
                ${pages.map(p=>`<button class="btn ${p===currentPageIncidents?'btn-primary':'btn-outline'} btn-sm inc-page-btn" data-page="${p}" style="padding:5px 10px;min-width:34px;">${p}</button>`).join('')}
                <button class="btn btn-outline btn-sm inc-page-btn" data-page="${currentPageIncidents+1}" ${currentPageIncidents===totalPages?'disabled':''} style="padding:5px 10px;">›</button>
            </div>
        </div>`;
    }

    if (tableContainer) {
        tableContainer.style.display = 'block';
        tableContainer.innerHTML = `
        <div style="padding:4px 0 24px;">

            <!-- KPI row -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 140px), 1fr));gap:12px;margin-bottom:22px;">
                <div style="background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--primary);margin-bottom:6px;">Total Registros</div>
                    <div style="font-size:32px;font-weight:900;color:var(--text);line-height:1;">${total}</div>
                </div>
                <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#dc2626;margin-bottom:6px;">Abiertos</div>
                    <div style="font-size:32px;font-weight:900;color:#dc2626;line-height:1;">${abiertos}</div>
                </div>
                <div style="background:rgba(234,179,8,0.07);border:1px solid rgba(234,179,8,0.2);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#ca8a04;margin-bottom:6px;">En Proceso</div>
                    <div style="font-size:32px;font-weight:900;color:#ca8a04;line-height:1;">${enProceso}</div>
                </div>
                <div style="background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#16a34a;margin-bottom:6px;">Cerrados</div>
                    <div style="font-size:32px;font-weight:900;color:#16a34a;line-height:1;">${cerrados}</div>
                </div>
                <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#ef4444;margin-bottom:6px;">Críticos</div>
                    <div style="font-size:32px;font-weight:900;color:#ef4444;line-height:1;">${criticos}</div>
                </div>
            </div>

            <!-- Toolbar: title + filters + add button -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
                <span style="font-size:14px;font-weight:700;color:var(--text);">Registro de Inconvenientes con ISPs
                    ${filtered.length !== allInc.length ? `<span style="font-size:12px;font-weight:500;color:var(--primary);margin-left:8px;">(${filtered.length} de ${allInc.length})</span>` : ''}
                </span>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <select id="inc-filter-isp" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;background:var(--bg);color:var(--text);cursor:pointer;">
                        <option value="">Todos los ISPs</option>${ispOpts}
                    </select>
                    <select id="inc-filter-type" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;background:var(--bg);color:var(--text);cursor:pointer;">
                        <option value="">Todos los Tipos</option>${typeOpts}
                    </select>
                    <input type="date" id="inc-filter-from" value="${_incidentFilters.dateFrom}" title="Desde" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;background:var(--bg);color:var(--text);">
                    <input type="date" id="inc-filter-to"   value="${_incidentFilters.dateTo}"   title="Hasta" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;background:var(--bg);color:var(--text);">
                    ${(_incidentFilters.isp || _incidentFilters.type || _incidentFilters.dateFrom || _incidentFilters.dateTo)
                        ? `<button id="inc-clear-filters" class="btn btn-outline btn-sm" style="color:#dc2626;border-color:#dc2626;">✕ Limpiar</button>` : ''}
                    <button id="btn-add-incident" class="btn btn-primary btn-sm" style="display:flex;align-items:center;gap:6px;">${icons.plus} Registrar</button>
                </div>
            </div>

            <!-- Registry table (scrollable) -->
            <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;">
                    <table style="width:max-content;min-width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:rgba(59,130,246,0.04);border-bottom:2px solid var(--border);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);">
                                <th style="padding:11px 12px;width:40px;text-align:center;">#</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Severidad</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Estado</th>
                                <th style="padding:11px 12px;white-space:nowrap;">ISP / Proveedor</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Región</th>
                                <th style="padding:11px 12px;white-space:nowrap;">No. Ticket</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Tipo</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Fecha Inicio</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Fecha Resolución</th>
                                <th style="padding:11px 12px;white-space:nowrap;">T. Solución</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Descripción</th>
                                <th style="padding:11px 12px;white-space:nowrap;text-align:right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="incidents-tbody">${tableRows}</tbody>
                    </table>
                </div>
                ${pagHtml}
            </div>

        </div>`;
    }

    // Wire filters
    document.getElementById('inc-filter-isp')?.addEventListener('change', e => {
        _incidentFilters.isp = e.target.value; currentPageIncidents = 1; renderReportesView();
    });
    document.getElementById('inc-filter-type')?.addEventListener('change', e => {
        _incidentFilters.type = e.target.value; currentPageIncidents = 1; renderReportesView();
    });
    document.getElementById('inc-filter-from')?.addEventListener('change', e => {
        _incidentFilters.dateFrom = e.target.value; currentPageIncidents = 1; renderReportesView();
    });
    document.getElementById('inc-filter-to')?.addEventListener('change', e => {
        _incidentFilters.dateTo = e.target.value; currentPageIncidents = 1; renderReportesView();
    });
    document.getElementById('inc-clear-filters')?.addEventListener('click', () => {
        _incidentFilters = { isp:'', type:'', dateFrom:'', dateTo:'' };
        currentPageIncidents = 1; renderReportesView();
    });

    // Wire pagination
    document.querySelectorAll('.inc-page-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const pg = parseInt(e.currentTarget.dataset.page);
            if (!pg || pg < 1 || pg > totalPages) return;
            currentPageIncidents = pg; renderReportesView();
        });
    });

    // Wire action buttons
    document.getElementById('btn-add-incident')?.addEventListener('click', () => showIncidentForm(null));
    document.querySelectorAll('.btn-view-inc').forEach(b =>
        b.addEventListener('click', e => showIncidentDetail(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('.btn-edit-inc').forEach(b =>
        b.addEventListener('click', e => showIncidentForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('.btn-del-inc').forEach(b =>
        b.addEventListener('click', e => {
            if (!confirm('¿Eliminar este registro?')) return;
            store.ispIncidents = store.ispIncidents.filter(i => i.id !== e.currentTarget.dataset.id);
            save(); renderReportesView();
        })
    );
}
