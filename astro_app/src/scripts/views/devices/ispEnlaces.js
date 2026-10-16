// ─────────────────────────────────────────────────────────────
// ISPs GENERAL — enlaces por región: cuadrícula de regiones y lista.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save } from '../../store.js';
import { icons } from '../../icons.js';
import { showIspLinkForm, showIspLinkDetail } from './ispEnlaceFicha.js';

// ISPs General state
let _ispLinksRegionId = null;

// Al salir de la vista se vuelve a la cuadrícula de regiones
export function reiniciarEnlacesIsp() {
    _ispLinksRegionId = null;
    document.getElementById('isp-links-container')?.remove();
}

const ISP_REGION_COLORS = [
    { bg:'rgba(59,130,246,0.08)',  border:'rgba(59,130,246,0.22)',  accent:'#3b82f6', text:'#2563eb'  },
    { bg:'rgba(34,197,94,0.08)',   border:'rgba(34,197,94,0.22)',   accent:'#22c55e', text:'#16a34a'  },
    { bg:'rgba(168,85,247,0.08)',  border:'rgba(168,85,247,0.22)',  accent:'#a855f7', text:'#9333ea'  },
    { bg:'rgba(249,115,22,0.08)',  border:'rgba(249,115,22,0.22)',  accent:'#f97316', text:'#ea580c'  },
    { bg:'rgba(20,184,166,0.08)',  border:'rgba(20,184,166,0.22)',  accent:'#14b8a6', text:'#0d9488'  },
    { bg:'rgba(239,68,68,0.08)',   border:'rgba(239,68,68,0.22)',   accent:'#ef4444', text:'#dc2626'  },
    { bg:'rgba(234,179,8,0.08)',   border:'rgba(234,179,8,0.22)',   accent:'#eab308', text:'#ca8a04'  },
    { bg:'rgba(14,165,233,0.08)',  border:'rgba(14,165,233,0.22)',  accent:'#0ea5e9', text:'#0284c7'  },
];

function _hideIspLinksHeaderFilters() {
    // Hide the entire "Resultados" card — ISPs General renders its own container
    const mainCard = document.getElementById('dev-main-card');
    if (mainCard) mainCard.style.display = 'none';
}

export function renderIspLinksView() {
    const tableContainer = document.getElementById('devices-table-container');
    const emptyState     = document.getElementById('devices-empty-state');
    const btnAdd         = document.getElementById('btn-add-device');
    if (btnAdd) btnAdd.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';

    // NOTE: do NOT call _cleanupAllSpecializedFilters() here — it resets _ispLinksRegionId
    // renderDevicesTable already called it before dispatching here.
    _hideIspLinksHeaderFilters();

    if (!store.ispLinks) store.ispLinks = [];

    // Container where we render everything
    const viewEl = document.getElementById('view-devices');
    let container = document.getElementById('isp-links-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'isp-links-container';
        viewEl.appendChild(container);
    }

    if (_ispLinksRegionId === null) {
        _renderIspRegionGrid(container);
    } else {
        _renderIspListForRegion(container, _ispLinksRegionId);
    }
}

function _renderIspRegionGrid(container) {
    // Sort regions reverse-alphabetically so COINCO, CMY… appear first
    const regions = [...store.regions].sort((a, b) => b.name.localeCompare(a.name));
    if (regions.length === 0) {
        container.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--text-muted);">
            <p>No hay regiones creadas. Crea regiones primero en el módulo Regiones.</p>
        </div>`;
        return;
    }

    const arrowIcon  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    const globeIcon  = `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
    const globeSmIcon= `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
    const signalIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>`;

    const cards = regions.map((r, i) => {
        const c = ISP_REGION_COLORS[i % ISP_REGION_COLORS.length];
        const ispList = (store.ispLinks || []).filter(l => l.regionId === r.id);
        const count = ispList.length;
        const hasIsps = count > 0;

        // ISP preview pills (up to 4)
        const previewIsps = ispList.slice(0, 4).map(l => {
            const typeColors = {
                'Fibra':'#16a34a','Radio':'#ea580c','Cable':'#2563eb','Satélite':'#9333ea','Otro':'#64748b'
            };
            const tc = typeColors[l.type] || '#64748b';
            return `<div style="display:flex;align-items:center;gap:7px;padding:7px 10px;background:rgba(255,255,255,0.55);border:1px solid ${c.border};border-radius:10px;backdrop-filter:blur(4px);">
                <span style="color:${c.accent};flex-shrink:0;">${signalIcon}</span>
                <span style="font-size:12px;font-weight:700;color:var(--text);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.name}</span>
                ${l.internet ? `<span style="font-size:10.5px;color:var(--text-muted);flex-shrink:0;">${l.internet}</span>` : ''}
                ${l.type ? `<span style="flex-shrink:0;font-size:10px;font-weight:800;color:${tc};background:${tc}18;padding:1px 7px;border-radius:10px;">${l.type}</span>` : ''}
            </div>`;
        }).join('');

        const moreTag = count > 4
            ? `<div style="text-align:center;font-size:11.5px;font-weight:600;color:${c.accent};padding:4px 0;">+${count - 4} más</div>`
            : '';

        return `
        <div class="isp-region-card" data-region-id="${r.id}"
             style="background:${c.bg};border:1.5px solid ${c.border};border-radius:20px;padding:26px 28px;cursor:pointer;
                    transition:transform 0.28s cubic-bezier(.4,0,.2,1),box-shadow 0.28s,border-color 0.2s;position:relative;overflow:hidden;
                    display:flex;flex-direction:column;gap:0;"
             onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 20px 45px rgba(0,0,0,0.14)';this.style.borderColor='${c.accent}'"
             onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='${c.border}'">
            <!-- Watermark -->
            <div style="position:absolute;top:-14px;right:-14px;opacity:0.08;color:${c.accent};">${globeIcon}</div>
            <!-- Colored top stripe -->
            <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${c.accent},${c.accent}88);border-radius:20px 20px 0 0;"></div>
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:16px;margin-top:4px;">
                <div style="min-width:0;">
                    <div style="font-size:24px;font-weight:900;color:${c.text};letter-spacing:-0.6px;line-height:1.1;">${r.name}</div>
                    ${r.location ? `<div style="font-size:12.5px;color:var(--text-muted);margin-top:4px;font-weight:500;">${r.location}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                    <span style="background:${hasIsps ? c.accent : c.border};color:${hasIsps ? '#fff' : c.text};padding:4px 14px;border-radius:20px;font-size:13px;font-weight:800;">
                        ${count} ISP${count !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
            <!-- ISP list or empty hint -->
            <div style="flex:1;display:flex;flex-direction:column;gap:6px;min-height:${hasIsps ? '100px' : '80px'};">
                ${hasIsps ? previewIsps + moreTag
                    : `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:0.45;padding:10px 0;">
                           <div style="color:${c.accent};">${globeSmIcon}</div>
                           <span style="font-size:12px;font-weight:600;color:var(--text-muted);">Sin proveedores registrados</span>
                       </div>`}
            </div>
            <!-- Footer -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:1px solid ${c.border};">
                <span style="font-size:12px;color:${c.accent};font-weight:600;">${hasIsps ? 'Gestionar proveedores' : 'Añadir primer ISP'} →</span>
                <span style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${c.accent}22;color:${c.accent};flex-shrink:0;">${arrowIcon}</span>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
    <div style="padding:4px 0 24px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:20px;">
            ${cards}
        </div>
    </div>`;

    container.querySelectorAll('.isp-region-card').forEach(card => {
        card.addEventListener('click', () => {
            _ispLinksRegionId = card.dataset.regionId;
            renderIspLinksView();
        });
    });
}

function _renderIspListForRegion(container, regionId) {
    const region = store.regions.find(r => r.id === regionId);
    const links  = (store.ispLinks || []).filter(l => l.regionId === regionId);

    const backIcon  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const addIcon   = icons.plus;
    const eyeIcon   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

    const TYPE_COLORS = {
        'Fibra':    { bg:'rgba(34,197,94,0.1)',  color:'#16a34a'  },
        'Radio':    { bg:'rgba(249,115,22,0.1)', color:'#ea580c'  },
        'Cable':    { bg:'rgba(59,130,246,0.1)', color:'#2563eb'  },
        'Satélite': { bg:'rgba(168,85,247,0.1)', color:'#9333ea'  },
        'Otro':     { bg:'rgba(100,116,139,0.1)','color':'#64748b'},
    };

    const ispCards = links.length === 0
        ? `<div style="padding:60px;text-align:center;color:var(--text-muted);border:2px dashed var(--border);border-radius:20px;">
               <p style="margin:0 0 8px;font-size:16px;font-weight:700;">No hay ISPs en esta región</p>
               <small>Usa el botón "Añadir ISP" para registrar un proveedor</small>
           </div>`
        : links.map((l, i) => {
            const clr = ISP_REGION_COLORS[i % ISP_REGION_COLORS.length];
            const typeCfg = TYPE_COLORS[l.type] || TYPE_COLORS['Otro'];

            // min-width:0 y overflow-wrap son los que impiden que una IP larga
            // ensanche su columna y se salga de la tarjeta.
            const infoCell = (label, val, mono = false) => val
                ? `<div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
                       <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);">${label}</span>
                       <span class="isp-net-val" style="font-size:13px;font-weight:700;color:var(--text);${mono ? "font-family:'JetBrains Mono',monospace;" : ''}">${val}</span>
                   </div>` : '';

            const networkGrid = [
                infoCell('Segmento', l.segment, true),
                infoCell('Máscara', l.mask, true),
                infoCell('Gateway', l.gateway, true),
                infoCell('DNS', l.dns, true),
                infoCell('DNS Alt.', l.dnsAlt, true),
                infoCell('Puerto FW', l.fwPort),
            ].filter(Boolean).join('');

            const contactRow = [
                l.contactTel ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${l.contactTel}</span>` : '',
                l.contactTickets ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${l.contactTickets}</span>` : '',
            ].filter(Boolean).join('<span style="color:var(--border);padding:0 4px;">·</span>');

            return `
            <div class="isp-link-card" data-id="${l.id}"
                 style="background:var(--card);border:1.5px solid var(--border);border-radius:20px;overflow:hidden;cursor:pointer;
                        transition:transform 0.25s cubic-bezier(.4,0,.2,1),box-shadow 0.25s,border-color 0.2s;position:relative;"
                 onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 16px 40px rgba(0,0,0,0.13)';this.style.borderColor='${clr.accent}44'"
                 onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">

                <!-- Top accent bar -->
                <div style="height:5px;background:linear-gradient(90deg,${clr.accent},${clr.accent}66);"></div>

                <!-- Card body -->
                <div class="isp-card-body">

                    <!-- Header: name + type + actions -->
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px;">
                        <div style="min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                                <span style="font-size:20px;font-weight:900;color:var(--text);letter-spacing:-0.5px;">${l.name}</span>
                                <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;background:${typeCfg.bg};color:${typeCfg.color};">${l.type || 'N/A'}</span>
                            </div>
                            ${l.ispCode ? `<div style="font-size:11.5px;font-family:'JetBrains Mono',monospace;color:${clr.accent};font-weight:600;">${l.ispCode}</div>` : ''}
                            ${l.internet ? `<div style="margin-top:5px;font-size:12px;color:var(--text-muted);">🌐 <strong style="color:var(--text);">${l.internet}</strong> de ancho de banda</div>` : ''}
                        </div>
                        <div style="display:flex;gap:6px;flex-shrink:0;">
                            <button class="btn-icon btn-view-isp" data-id="${l.id}" title="Ver detalle completo"
                                    style="width:34px;height:34px;border-radius:10px;background:${clr.accent}15;color:${clr.accent};border:1px solid ${clr.accent}30;display:flex;align-items:center;justify-content:center;">${eyeIcon}</button>
                            <button class="btn-icon btn-edit-isp" data-id="${l.id}" title="Editar"
                                    style="width:34px;height:34px;border-radius:10px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;">${icons.edit}</button>
                            <button class="btn-icon danger btn-del-isp" data-id="${l.id}" title="Eliminar"
                                    style="width:34px;height:34px;border-radius:10px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);color:#dc2626;display:flex;align-items:center;justify-content:center;">${icons.trash}</button>
                        </div>
                    </div>

                    <!-- Network info grid -->
                    ${networkGrid ? `
                    <div style="background:${clr.bg};border:1px solid ${clr.border};border-radius:12px;padding:16px 18px;margin-bottom:14px;">
                        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:${clr.accent};margin-bottom:12px;">Configuración de Red</div>
                        <div class="isp-net-grid">
                            ${networkGrid}
                        </div>
                    </div>` : ''}

                    <!-- IPs usables -->
                    ${l.ips ? `
                    <div style="margin-bottom:14px;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:6px;">IPs Utilizables</div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;">
                            ${l.ips.split('\n').filter(Boolean).map(ip =>
                                `<span style="padding:2px 8px;border-radius:6px;background:rgba(59,130,246,0.07);font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--primary);border:1px solid rgba(59,130,246,0.15);">${ip.trim()}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}

                    <!-- Footer: contact + monitoring -->
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:12px;border-top:1px solid var(--border);">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${contactRow || '<span style="font-size:12px;color:var(--text-muted);">Sin contacto</span>'}</div>
                        ${l.monitoringName
                            ? `<span style="font-size:11.5px;display:flex;align-items:center;gap:4px;color:var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>📡 ${l.monitoringName}</span>`
                            : `<span style="font-size:11.5px;color:var(--text-muted);opacity:0.6;">Sin monitoreo</span>`}
                    </div>
                </div>
            </div>`;
        }).join('');

    container.innerHTML = `
    <div style="padding:4px 0 20px;">
        <!-- Header row -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button id="isp-back-btn" class="btn btn-outline btn-sm" style="display:flex;align-items:center;gap:5px;">${backIcon} Regiones</button>
                <span style="font-size:16px;font-weight:800;color:var(--text);">ISPs en <span style="color:var(--primary);">${region ? region.name : ''}</span></span>
                <span style="background:rgba(59,130,246,0.1);color:var(--primary);padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;">${links.length}</span>
            </div>
            <button id="isp-add-btn" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;">${addIcon} Añadir ISP</button>
        </div>
        <!-- ISP cards — Responsive layout -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 340px),1fr));gap:18px;">
            ${ispCards}
        </div>
    </div>`;

    document.getElementById('isp-back-btn')?.addEventListener('click', () => {
        _ispLinksRegionId = null;
        renderIspLinksView();
    });
    document.getElementById('isp-add-btn')?.addEventListener('click', () => showIspLinkForm(null, regionId));

    container.querySelectorAll('.btn-view-isp').forEach(b =>
        b.addEventListener('click', e => { e.stopPropagation(); showIspLinkDetail(e.currentTarget.dataset.id); })
    );
    container.querySelectorAll('.btn-edit-isp').forEach(b =>
        b.addEventListener('click', e => { e.stopPropagation(); showIspLinkForm(e.currentTarget.dataset.id, regionId); })
    );
    container.querySelectorAll('.btn-del-isp').forEach(b =>
        b.addEventListener('click', e => {
            e.stopPropagation();
            if (!confirm('¿Eliminar este ISP?')) return;
            store.ispLinks = (store.ispLinks || []).filter(l => l.id !== e.currentTarget.dataset.id);
            save();
            renderIspLinksView();
        })
    );
    container.querySelectorAll('.isp-link-card').forEach(card => {
        card.addEventListener('click', () => showIspLinkDetail(card.dataset.id));
    });
}
