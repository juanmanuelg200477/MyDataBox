// ─────────────────────────────────────────────────────────────
// REPORTES ISP — ficha de una incidencia y su formulario.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, genId, save } from '../../store.js';
import { showModal, closeModal } from '../../modal.js';
import { SEVERITY_CFG, STATUS_CFG, KNOWN_TYPES, renderReportesView } from './ispReportes.js';

// ─── Detail View ────────────────────────────────────────────
export function showIncidentDetail(id) {
    const inc = (store.ispIncidents || []).find(i => i.id === id);
    if (!inc) return;

    const reg       = store.regions.find(r => r.id === inc.regionId);
    const sevCfg    = SEVERITY_CFG[inc.severity] || { bg:'rgba(100,116,139,0.1)', color:'#64748b', dot:'#94a3b8' };
    const stCfg     = STATUS_CFG[inc.status]     || { bg:'rgba(100,116,139,0.1)', color:'#64748b' };
    const fmtDate   = d => d ? new Date(d).toLocaleDateString('es-DO', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : '—';
    const fmtShort  = d => d ? new Date(d).toLocaleDateString('es-DO', { day:'2-digit', month:'short', year:'numeric' }) : null;

    // Related incidents from same ISP (last 10 excluding current)
    const related = (store.ispIncidents || [])
        .filter(i => i.isp === inc.isp && i.id !== inc.id)
        .slice(0, 8);

    // SVG bar chart: incidents per month for this ISP (last 6 months)
    const now = new Date();
    const months = Array.from({length:6}, (_,k) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5-k), 1);
        return { label: d.toLocaleDateString('es-DO',{month:'short'}), key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` };
    });
    const byMonth = {};
    (store.ispIncidents||[]).filter(i => i.isp === inc.isp).forEach(i => {
        if (!i.date) return;
        const k = i.date.slice(0,7);
        byMonth[k] = (byMonth[k]||0) + 1;
    });
    const maxBar   = Math.max(1, ...months.map(m => byMonth[m.key]||0));
    const barW     = 36; const barGap = 10; const chartH = 80;
    const barsSvg  = months.map((m, mi) => {
        const val    = byMonth[m.key] || 0;
        const bh     = Math.round((val / maxBar) * chartH);
        const x      = mi * (barW + barGap);
        const isThis = m.key === (inc.date||'').slice(0,7);
        return `
        <g>
            <rect x="${x}" y="${chartH - bh}" width="${barW}" height="${bh}" rx="4"
                  fill="${isThis ? '#3b82f6' : '#94a3b8'}" opacity="${isThis ? '1' : '0.5'}"/>
            ${val ? `<text x="${x + barW/2}" y="${chartH - bh - 5}" text-anchor="middle" font-size="10" fill="var(--text)" font-weight="700">${val}</text>` : ''}
            <text x="${x + barW/2}" y="${chartH + 16}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${m.label}</text>
        </g>`;
    }).join('');
    const svgW = months.length * (barW + barGap) - barGap;

    // Timeline step component
    const step = (label, date, icon, done) => `
    <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
        <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;
             background:${done ? 'var(--primary)' : 'var(--border)'};color:${done ? '#fff' : 'var(--text-muted)'};">${icon}</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${done?'var(--text)':'var(--text-muted)'};margin-top:6px;">${label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${date || '—'}</div>
    </div>`;

    const lineColor = inc.resolvedDate ? 'var(--primary)' : 'var(--border)';

    showModal(`Reporte — ${inc.isp || ''}`, `
    <div style="display:flex;flex-direction:column;gap:20px;">

        <!-- Header badge row -->
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:700;background:${sevCfg.bg};color:${sevCfg.color};">
                <span style="width:8px;height:8px;border-radius:50%;background:${sevCfg.dot};"></span>${inc.severity || '—'}
            </span>
            <span style="padding:5px 14px;border-radius:20px;font-size:13px;font-weight:700;background:${stCfg.bg};color:${stCfg.color};">${inc.status || '—'}</span>
            ${inc.ticketNo ? `<span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--primary);font-weight:700;"># ${inc.ticketNo}</span>` : ''}
            <span style="margin-left:auto;font-size:12px;color:var(--text-muted);">${inc.type || ''}</span>
        </div>

        <!-- Info grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div style="padding:12px 14px;border-radius:10px;background:rgba(59,130,246,0.05);border:1px solid var(--border);">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:4px;">ISP / Proveedor</div>
                <div style="font-size:15px;font-weight:800;color:var(--text);">${inc.isp || '—'}</div>
            </div>
            <div style="padding:12px 14px;border-radius:10px;background:rgba(59,130,246,0.05);border:1px solid var(--border);">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:4px;">Región</div>
                <div style="font-size:15px;font-weight:800;color:var(--text);">${reg ? reg.name : '—'}</div>
            </div>
            <div style="padding:12px 14px;border-radius:10px;background:rgba(59,130,246,0.05);border:1px solid var(--border);">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:4px;">T. de Solución</div>
                <div style="font-size:15px;font-weight:800;color:${inc.resolutionTime ? 'var(--text)' : 'var(--text-muted)'};">${inc.resolutionTime || '—'}</div>
            </div>
            ${inc.affectedServices ? `
            <div style="padding:12px 14px;border-radius:10px;background:rgba(59,130,246,0.05);border:1px solid var(--border);grid-column:span 3;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:4px;">Servicios Afectados</div>
                <div style="font-size:13px;color:var(--text);">${inc.affectedServices}</div>
            </div>` : ''}
        </div>

        <!-- Timeline -->
        <div style="padding:16px;border-radius:10px;border:1px solid var(--border);background:rgba(59,130,246,0.03);">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:14px;">Línea de Tiempo</div>
            <div style="display:flex;align-items:flex-start;gap:0;position:relative;">
                ${step('Registrado', fmtShort(inc.date), '📋', !!inc.date)}
                <div style="flex:1;height:2px;background:${lineColor};margin-top:18px;"></div>
                ${step('En Proceso', inc.status === 'En Proceso' ? 'Activo' : (fmtShort(inc.resolvedDate) || 'Pendiente'), '⚙️', inc.status !== 'Abierto')}
                <div style="flex:1;height:2px;background:${inc.resolvedDate ? 'var(--primary)' : 'var(--border)'};margin-top:18px;"></div>
                ${step('Resuelto', fmtShort(inc.resolvedDate) || 'Pendiente', '✅', !!inc.resolvedDate)}
            </div>
        </div>

        <!-- Description -->
        ${inc.description ? `
        <div style="padding:14px 16px;border-radius:10px;border-left:4px solid var(--primary);background:rgba(59,130,246,0.04);">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--primary);margin-bottom:8px;">Descripción / Observaciones</div>
            <div style="font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;">${inc.description}</div>
        </div>` : ''}

        <!-- Bar chart: incidentes por mes para este ISP -->
        <div style="padding:16px;border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:16px;">
                Historial de Incidentes — ${inc.isp} (últimos 6 meses)
            </div>
            <svg width="${svgW}" height="${chartH + 24}" style="overflow:visible;display:block;margin:0 auto;">
                ${barsSvg}
            </svg>
        </div>

        <!-- Related incidents -->
        ${related.length ? `
        <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:10px;">Otros incidentes de ${inc.isp}</div>
            <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead><tr style="background:rgba(59,130,246,0.04);border-bottom:1px solid var(--border);">
                        <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text-muted);">Ticket</th>
                        <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text-muted);">Tipo</th>
                        <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text-muted);">Fecha</th>
                        <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text-muted);">Estado</th>
                    </tr></thead>
                    <tbody>${related.map(r => {
                        const sc = STATUS_CFG[r.status]||{bg:'rgba(100,116,139,0.1)',color:'#64748b'};
                        return `<tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:8px 12px;font-family:'JetBrains Mono',monospace;color:var(--primary);">${r.ticketNo||'—'}</td>
                            <td style="padding:8px 12px;color:var(--text);">${r.type||'—'}</td>
                            <td style="padding:8px 12px;color:var(--text-muted);">${fmtShort(r.date)||'—'}</td>
                            <td style="padding:8px 12px;"><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${sc.bg};color:${sc.color};">${r.status||'—'}</span></td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>
            </div>
        </div>` : ''}

    </div>`, null, null);
}

// ─── Incident Form ───────────────────────────────────────────
export function showIncidentForm(id) {
    const inc = id ? (store.ispIncidents || []).find(i => i.id === id) : null;
    const regOpts = store.regions.map(r =>
        `<option value="${r.id}" ${inc && inc.regionId === r.id ? 'selected' : ''}>${r.name}</option>`
    ).join('');
    const hasCustomType = inc?.type && !KNOWN_TYPES.includes(inc.type);

    showModal(inc ? 'Editar Registro de Inconveniente' : 'Nuevo Registro de Inconveniente', `
        <div class="form-row">
            <div class="form-group">
                <label>ISP / Proveedor *</label>
                <input id="fi-isp" value="${inc?.isp || ''}" placeholder="Ej: Claro, Wind, Altice…">
            </div>
            <div class="form-group">
                <label>Región</label>
                <select id="fi-region">
                    <option value="">— Seleccionar región —</option>
                    ${regOpts}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>No. de Ticket</label>
                <input id="fi-ticket" value="${inc?.ticketNo || ''}" placeholder="Ej: TKT-2025-0042">
            </div>
            <div class="form-group">
                <label>Tipo de Inconveniente</label>
                <select id="fi-type">
                    <option value="">— Seleccionar tipo —</option>
                    ${KNOWN_TYPES.map(t => {
                        const sel = inc?.type === t || (t === 'Otro' && hasCustomType);
                        return `<option ${sel ? 'selected':''}>${t}</option>`;
                    }).join('')}
                </select>
                <input id="fi-type-custom" placeholder="Especificar tipo…"
                       value="${hasCustomType ? inc.type : ''}"
                       style="margin-top:6px;display:${hasCustomType ? 'block':'none'};">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Severidad</label>
                <select id="fi-severity">
                    <option value="">— Seleccionar —</option>
                    ${['Crítico','Alto','Medio','Bajo'].map(s =>
                        `<option ${inc?.severity === s ? 'selected':''}>${s}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Estado</label>
                <select id="fi-status">
                    ${['Abierto','En Proceso','Cerrado'].map(s =>
                        `<option ${(inc?.status||'Abierto') === s ? 'selected':''}>${s}</option>`
                    ).join('')}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Fecha de Inicio *</label>
                <input type="date" id="fi-date" value="${inc?.date || ''}">
            </div>
            <div class="form-group">
                <label>Fecha de Resolución</label>
                <input type="date" id="fi-resolved" value="${inc?.resolvedDate || ''}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Tiempo de Solución</label>
                <input id="fi-restime" value="${inc?.resolutionTime || ''}" placeholder="Ej: 4h 30min, 2 días…">
            </div>
            <div class="form-group">
                <label>Servicios Afectados</label>
                <input id="fi-services" value="${inc?.affectedServices || ''}" placeholder="Ej: Internet, VoIP, VPN…">
            </div>
        </div>
        <div class="form-group">
            <label>Descripción / Observaciones</label>
            <textarea id="fi-desc" rows="3" style="width:100%;resize:vertical;" placeholder="Detalle del inconveniente, gestiones realizadas, resolución…">${inc?.description || ''}</textarea>
        </div>
    `, () => {
        const ispVal  = document.getElementById('fi-isp').value.trim();
        const dateVal = document.getElementById('fi-date').value;
        if (!ispVal || !dateVal) { alert('ISP y Fecha de Inicio son obligatorios.'); return; }

        if (!store.ispIncidents) store.ispIncidents = [];
        const typeRaw    = document.getElementById('fi-type').value;
        const typeCustom = document.getElementById('fi-type-custom').value.trim();
        const typeVal    = typeRaw === 'Otro' ? (typeCustom || 'Otro') : typeRaw;

        const obj = {
            id:               inc?.id || genId(),
            isp:              ispVal,
            regionId:         document.getElementById('fi-region').value,
            ticketNo:         document.getElementById('fi-ticket').value.trim(),
            type:             typeVal,
            severity:         document.getElementById('fi-severity').value,
            status:           document.getElementById('fi-status').value,
            date:             dateVal,
            resolvedDate:     document.getElementById('fi-resolved').value,
            resolutionTime:   document.getElementById('fi-restime').value.trim(),
            affectedServices: document.getElementById('fi-services').value.trim(),
            description:      document.getElementById('fi-desc').value.trim(),
        };

        if (inc) {
            const idx = store.ispIncidents.findIndex(i => i.id === inc.id);
            if (idx !== -1) store.ispIncidents[idx] = obj;
        } else {
            store.ispIncidents.unshift(obj);
        }

        save(); closeModal(); renderReportesView();
    }, inc ? 'Guardar Cambios' : 'Registrar');

    // Wire "Otro" custom input toggle
    const fiType = document.getElementById('fi-type');
    const fiTypeCustom = document.getElementById('fi-type-custom');
    if (fiType && fiTypeCustom) {
        fiType.addEventListener('change', () => {
            fiTypeCustom.style.display = fiType.value === 'Otro' ? 'block' : 'none';
            if (fiType.value !== 'Otro') fiTypeCustom.value = '';
        });
    }
}
