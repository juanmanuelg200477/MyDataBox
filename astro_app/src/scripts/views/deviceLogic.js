import { store, save, genId, getAllDevices, logHistory } from '../store.js';
import { icons } from '../icons.js';
import { showModal, closeModal } from '../modal.js';

export function initDeviceProfile(app, activeTab = 'dt-details') {
    const params = new URLSearchParams(window.location.search);
    const devId = params.get('id');
    const allDevs = getAllDevices();
    const dev = allDevs.find(d => String(d.id) === String(devId));

    if (!dev) { window.location.href = '/dispositivos'; return; }

    // Resolver dependencias del rack y área si aplica
    let realObj;
    if (dev.rackId) {
        realObj = store.racks.find(r => String(r.id) === String(dev.rackId))?.slots[dev.rackUnit];
    } else {
        realObj = store.devices.find(d => String(d.id) === String(dev.id));
    }

    if (!realObj) { window.location.href = '/dispositivos'; return; }

    logHistory('device', dev.id, dev.name);

    // Init interfaces si no existen pero tiene puertos asignados
    if (!realObj.interfaces) {
        realObj.interfaces = {};
        const eth = parseInt(realObj.ports) || 0;
        const fib = parseInt(realObj.fiberPorts) || 0;

        for (let i = 1; i <= eth; i++) {
            realObj.interfaces[`GigabitEthernet1/0/${i}`] = { type: 'copper', status: 'down', host: '', hostCategory: '', hostId: '' };
        }
        for (let i = 1; i <= fib; i++) {
            realObj.interfaces[`SFP ${i}`] = { type: 'fiber', status: 'down', host: '', hostCategory: '', hostId: '', sfpBrand: '', sfpModel: '', sfpSerial: '', sfpSpeed: '' };
        }
        save();
    }

    const interfacesCount = Object.keys(realObj.interfaces).length;

    const regName = dev.rackRegion ? (store.regions.find(r => r.id === dev.rackRegion) || {}).name || '—' : (dev.regionId ? (store.regions.find(r => r.id === dev.regionId) || {}).name || '—' : '—');
    const areaName = dev.rackArea ? (store.areas.find(a => a.id === dev.rackArea) || {}).name || dev.area || '—' : dev.area || '—';

    document.getElementById('breadcrumb').innerHTML = `<span>DataBox IT</span><span class="sep">›</span><a href="/dispositivos" style="color:#64748b;text-decoration:none">Dispositivos</a><span class="sep">›</span><span class="current">${dev.name}</span>`;

    app.innerHTML = `
    <style>
        .tabs-header { display: flex; gap: 20px; border-bottom: 2px solid var(--border); margin-bottom: 20px; margin-top:20px; }
        .tab-btn { background: transparent; border: none; padding: 10px 5px; font-size: 14px; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .td-lbl { font-size:13px; color:var(--text-muted); padding:12px; width:40%; border-bottom:1px solid var(--border); }
        .table-details td { padding:12px; border-bottom:1px solid var(--border); }
        .btn-toggle-port.btn-success { background: rgba(34,197,94,0.1); color: #16a34a; font-weight:bold; }
        .btn-toggle-port.btn-danger { background: rgba(239,68,68,0.1); color: #dc2626; font-weight:bold; }
    </style>
    <div class="view-transition">
        <div class="page-header" style="flex-wrap:wrap; justify-content:space-between;">
            <div>
                <h1 style="font-size: 28px; margin-bottom: 5px;">${dev.name}</h1>
                <span class="badge badge-purple" style="font-size: 14px; margin-top: 5px;">${dev.device || 'Dispositivo'}</span>
            </div>
            <div class="page-header-actions">
                <a href="${dev.rackId ? `/rack?id=${dev.rackId}&u=${dev.rackUnit}` : '/dispositivos'}" style="color: var(--text-muted); text-decoration: none; font-weight: 500; font-size: 14px;">← Volver / Atrás</a>
            </div>
        </div>

        <div class="tabs-header">
            <button class="tab-btn ${activeTab === 'dt-details' ? 'active' : ''}" data-tab="dt-details">Dispositivo</button>
            <button class="tab-btn ${activeTab === 'dt-interfaces' ? 'active' : ''}" data-tab="dt-interfaces">Interfaces <span class="badge badge-info">${interfacesCount}</span></button>
        </div>

        <!-- Pestaña 1: Detalles Cuadrados -->
        <div id="tab-dt-details" class="tab-content ${activeTab === 'dt-details' ? 'active' : ''}">
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
                <div class="card" style="flex:1;min-width:300px">
                     <div class="card-header"><h2 style="font-size:15px">Dispositivo</h2></div>
                     <table class="table-details" style="width:100%; border-collapse:collapse;">
                         <tr><td class="td-lbl">Región</td><td><span class="link">${regName}</span></td></tr>
                         <tr><td class="td-lbl">Sitio / Área</td><td><span class="link">${areaName}</span></td></tr>
                         <tr><td class="td-lbl">Rack</td><td><span class="badge badge-teal">${dev.rack ? `${dev.rack} (U${dev.rackUnit})` : 'INDIVIDUAL'}</span></td></tr>
                         <tr><td class="td-lbl">Descripción</td><td>${dev.description || '—'}</td></tr>
                         <tr><td class="td-lbl">Comentario</td><td>${dev.comment || '—'}</td></tr>
                         <tr><td class="td-lbl">Etiqueta de Activo</td><td>—</td></tr>
                     </table>
                </div>
                <div class="card" style="flex:1;min-width:300px">
                     <div class="card-header"><h2 style="font-size:15px">Administración</h2></div>
                     <table class="table-details" style="width:100%; border-collapse:collapse;">
                         <tr><td class="td-lbl">Estado</td><td><span class="badge ${dev.status === 'Activo' || dev.status === 'Disponible' ? 'badge-active' : 'badge-warning'}">${dev.status || '—'}</span></td></tr>
                         <tr><td class="td-lbl">Marca</td><td>${dev.brand || '—'}</td></tr>
                         <tr><td class="td-lbl">Modelo</td><td>${dev.model || '—'}</td></tr>
                         <tr><td class="td-lbl">Plataforma</td><td>Cisco IOS / Vendor</td></tr>
                         <tr><td class="td-lbl">Número de Serie</td><td><strong style="font-family:'JetBrains Mono'">${dev.serial || '—'}</strong></td></tr>
                         <tr><td class="td-lbl">IP Principal</td><td><strong style="font-family:'JetBrains Mono'">${dev.ip || '—'}</strong></td></tr>
                         <tr><td class="td-lbl">MAC Principal</td><td><strong style="font-family:'JetBrains Mono'">${dev.mac || '—'}</strong></td></tr>
                     </table>
                </div>
            </div>
        </div>

        <!-- Pestaña 2: Interfaces Listadas -->
        <div id="tab-dt-interfaces" class="tab-content ${activeTab === 'dt-interfaces' ? 'active' : ''}">
            <div class="card">
                <div class="card-header">
                    <h2>Listado de Interfaces</h2>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%; text-align:left; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid var(--border); font-size:12px; color:var(--text-muted)">
                                <th style="padding:12px;">NOMBRE</th>
                                <th style="padding:12px;">ESTADO</th>
                                <th style="padding:12px;">HOST DESTINO</th>
                                <th style="padding:12px;text-align:right">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody id="interfaces-tbody">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    `;

    // Render Interfaces
    const tbody = document.getElementById('interfaces-tbody');
    let rows = '';

    // Sort logic to make sure Gig1/0/1 < Gig1/0/2 and SFP comes last
    const portKeys = Object.keys(realObj.interfaces).sort((a, b) => {
        if (a.startsWith('SFP') && !b.startsWith('SFP')) return 1;
        if (!a.startsWith('SFP') && b.startsWith('SFP')) return -1;

        // Extract trailing numbers
        const numA = parseInt(a.match(/\\d+$/) || 0);
        const numB = parseInt(b.match(/\\d+$/) || 0);
        return numA - numB;
    });

    portKeys.forEach(portName => {
        const p = realObj.interfaces[portName];
        const btnClass = p.status === 'up' ? 'btn-success' : 'btn-danger';
        const txt = p.status === 'up' ? 'UP' : 'DOWN';
        const iconType = p.type === 'fiber' ? '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v8l9-11h-7z"></path></svg>' : '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>';

        // Para puertos SFP: mostrar el destino "Hacia" del módulo asignado
        let hostCell;
        if (p.type === 'fiber') {
            if (p.sfpDeviceId) {
                const sfpDev = store.devices.find(d => d.id === p.sfpDeviceId);
                if (sfpDev) {
                    const toSwitch = sfpDev.towardsSwitchId
                        ? (store.devices.find(sw => sw.id === sfpDev.towardsSwitchId) || {}).name || '—'
                        : (sfpDev.towards || '—');
                    hostCell = `<div style="display:flex;flex-direction:column;gap:2px;">
                        <strong style="color:var(--text);font-size:13px;">${sfpDev.name}</strong>
                        <span style="color:var(--text-muted);font-size:12px;">→ ${toSwitch}</span>
                    </div>`;
                } else {
                    hostCell = '<span style="color:var(--text-muted);font-style:italic">— Vacío —</span>';
                }
            } else {
                hostCell = '<span style="color:var(--text-muted);font-style:italic">— Vacío —</span>';
            }
        } else {
            hostCell = p.host
                ? `<strong style="color:var(--text)">${p.hostCategory === '__usuario__' ? '👤 ' : ''}${p.host}</strong>`
                : '<span style="color:var(--text-muted);font-style:italic">— Vacío —</span>';
        }

        rows += `
        <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:12px; font-family:'JetBrains Mono',monospace; font-size:13px; width:280px; color:var(--primary); font-weight:500;">
                <div style="display:flex;align-items:center;gap:6px;">${iconType} ${portName}</div>
            </td>
            <td style="padding:12px;">
                <button class="btn btn-sm ${btnClass} btn-toggle-port" data-port="${portName}" style="padding:4px 10px; width:65px">${txt}</button>
            </td>
            <td style="padding:12px;">${hostCell}</td>
            <td style="padding:12px; text-align:right">
                <button class="btn-icon btn-config-port" data-port="${portName}" title="Configurar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = rows;

    // Event Listeners
    // TABS
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById('tab-' + e.currentTarget.dataset.tab).classList.add('active');
        });
    });

    // TOGGLE UP/DOWN
    document.querySelectorAll('.btn-toggle-port').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const target = e.currentTarget;
            if (target.disabled) return;
            target.disabled = true;

            const pName = target.dataset.port;
            const ifc = realObj.interfaces[pName];
            ifc.status = ifc.status === 'up' ? 'down' : 'up';
            // await: si el usuario pulsa "Volver" antes de que Supabase confirme,
            // el load() de la página siguiente traería datos viejos y pisaría
            // este cambio.
            await save();
            initDeviceProfile(app, 'dt-interfaces'); // reactively reload keeping tab
        });
    });

    // CONFIG GEAR
    document.querySelectorAll('.btn-config-port').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openPortConfig(app, realObj, dev, e.currentTarget.dataset.port);
        });
    });
}

function openPortConfig(app, realObj, unifiedDevContext, portName) {
    const p = realObj.interfaces[portName];
    const isFiber = p.type === 'fiber';

    // Área del Switch Padre
    const areaContext = unifiedDevContext.rackArea ? store.areas.find(a => a.id === unifiedDevContext.rackArea)?.name : unifiedDevContext.area;

    // Obtener TODO el hardware del ecosistema (Global + Racks) descartando al Switch en cuestión
    const allHosts = getAllDevices().filter(d =>
        String(d.id) !== String(unifiedDevContext.id) &&
        (d.rackArea ? store.areas.find(a => a.id === d.rackArea)?.name === areaContext : d.area === areaContext)
    );

    let sfpSection = '';
    if (isFiber) {
        const sfpsInArea = store.devices.filter(d =>
            (d.device || '').toLowerCase() === 'sfp' &&
            d.area === areaContext
        );
        const sfpOpts = sfpsInArea.map(s =>
            `<option value="${s.id}" ${p.sfpDeviceId === s.id ? 'selected' : ''}>${s.name}${s.brand ? ' · ' + s.brand : ''}${s.speed ? ' · ' + s.speed : ''}</option>`
        ).join('');

        sfpSection = `
    <div style="margin-top:20px; padding-top:20px; border-top:1px dashed var(--border)">
        <h3 style="margin-bottom:12px; font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--primary); font-weight:700;">Módulo SFP Instalado</h3>
        <div class="form-group" style="margin-bottom:0;">
            <label>Seleccionar SFP del inventario (${areaContext || 'sin área'})</label>
            <select id="p-sfp-selector">
                <option value="">— Sin módulo SFP —</option>
                ${sfpOpts || ''}
            </select>
            ${sfpsInArea.length === 0 ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px;">No hay módulos SFP registrados en "${areaContext || 'esta área'}". Agrega uno primero en Dispositivos → SFP.</div>` : ''}
        </div>
        <div id="sfp-specs-panel" style="display:none; margin-top:14px; padding:14px; border-radius:8px; background:rgba(59,130,246,0.05); border:1px solid var(--border);">
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--primary); margin-bottom:12px;">Especificaciones del Módulo</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:12px;">
                <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:4px;">Marca</div><div id="sfp-sp-brand" style="font-size:13px;font-weight:500;color:var(--text);">—</div></div>
                <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:4px;">Modelo</div><div id="sfp-sp-model" style="font-size:13px;font-weight:500;color:var(--text);">—</div></div>
                <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:4px;">Velocidad</div><div id="sfp-sp-speed" style="font-size:13px;font-weight:600;color:var(--primary);">—</div></div>
                <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:4px;">Serie</div><div id="sfp-sp-serial" style="font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--text);">—</div></div>
                <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:4px;">De</div><div id="sfp-sp-from" style="font-size:13px;color:var(--text);">—</div></div>
                <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:4px;">Hacia</div><div id="sfp-sp-to" style="font-size:13px;color:var(--text);">—</div></div>
            </div>
        </div>
    </div>`;
    }

    // Categorías derivadas de los dispositivos reales presentes en el área del switch.
    // Se excluye 'General' (es una vista, no un tipo de dispositivo).
    const EXCLUDED_TYPES = new Set(['general']);
    const availableTypes = [...new Set(allHosts.map(d => d.device).filter(Boolean))]
        .filter(t => !EXCLUDED_TYPES.has(t.toLowerCase()))
        .sort();

    const catOpts = availableTypes.map(t => {
        const count = allHosts.filter(d => d.device === t).length;
        return `<option value="${t}" ${p.hostCategory === t ? 'selected' : ''}>${t} (${count})</option>`;
    }).join('');

    const modalBody = isFiber ? sfpSection : `
        <div style="margin-bottom:10px;padding:10px 12px;background:rgba(59,130,246,0.06);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text-muted);">
            <strong style="color:var(--text);">Área de contexto:</strong> ${areaContext || 'Sin área'} &nbsp;·&nbsp;
            <strong style="color:var(--text);">${allHosts.length}</strong> dispositivo${allHosts.length !== 1 ? 's' : ''} disponible${allHosts.length !== 1 ? 's' : ''}
        </div>
        <div class="form-row">
            <div class="form-group"><label>Categoría (Tipo de Host)</label>
                <select id="p-host-type">
                    <option value="">— Seleccione categoría —</option>
                    <option value="__usuario__" ${p.hostCategory === '__usuario__' ? 'selected' : ''}>👤 Usuario (manual)</option>
                    ${catOpts || '<option disabled>Sin dispositivos en esta área</option>'}
                </select>
            </div>
            <div class="form-group"><label id="p-host-target-label">Host de Destino Físico</label>
                <select id="p-host-device">
                    <option value="">Esperando categoría...</option>
                </select>
                <input id="p-host-username" type="text" placeholder="Ej: Juan Pérez" style="display:none;" />
            </div>
        </div>

        <div id="read-only-host-details" style="display:none; margin-top: 15px; padding: 15px; border-radius: 8px; background: rgba(59,130,246,0.05); border: 1px solid var(--border)">
             <div style="font-size: 13px; font-weight: bold; margin-bottom: 15px; color: var(--primary);">Características del Host</div>
             <div class="form-row">
                 <div class="form-group">
                     <label>IP</label>
                     <div id="ro-p-ip" style="padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text);min-height:38px;">—</div>
                 </div>
                 <div class="form-group">
                     <label>MAC</label>
                     <div id="ro-p-mac" style="padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text);min-height:38px;">—</div>
                 </div>
             </div>
             <div class="form-row">
                 <div class="form-group">
                     <label>Modelo</label>
                     <div id="ro-p-model" style="padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);min-height:38px;">—</div>
                 </div>
                 <div class="form-group">
                     <label>Serie</label>
                     <div id="ro-p-serial" style="padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text);min-height:38px;">—</div>
                 </div>
             </div>
        </div>
    `;

    showModal(`Interfaz :: ${portName}`, modalBody, async () => {
        // El handler es async: bloqueamos el botón para que un doble clic no
        // dispare dos guardados con estados distintos.
        const btnApply = document.getElementById('modal-save');
        if (btnApply?.disabled) return;
        if (btnApply) btnApply.disabled = true;

        if (isFiber) {
            const sfpSel = document.getElementById('p-sfp-selector');
            p.sfpDeviceId = sfpSel ? sfpSel.value : '';
        } else {
            p.hostCategory = document.getElementById('p-host-type').value;
            if (p.hostCategory === '__usuario__') {
                // Host manual: nombre de usuario escrito libremente (no es un dispositivo)
                p.hostId = '';
                p.host = document.getElementById('p-host-username').value.trim();
            } else {
                p.hostId = document.getElementById('p-host-device').value;
                const hostDev = allHosts.find(d => String(d.id) === String(p.hostId));
                p.host = hostDev ? hostDev.name : '';
            }
        }

        await save();
        closeModal();
        initDeviceProfile(app, 'dt-interfaces');
    }, 'Aplicar Configuración');

    // AFTER Modal mounts — copper-only logic:
    if (!isFiber) {
        const typeSel = document.getElementById('p-host-type');
        const devSel = document.getElementById('p-host-device');
        const roPanel = document.getElementById('read-only-host-details');
        const userInput = document.getElementById('p-host-username');
        const targetLabel = document.getElementById('p-host-target-label');

        // Alterna entre selector de dispositivo físico y campo de texto de usuario
        const applyMode = () => {
            const isUser = typeSel.value === '__usuario__';
            userInput.style.display = isUser ? '' : 'none';
            devSel.style.display = isUser ? 'none' : '';
            targetLabel.textContent = isUser ? 'Nombre de Usuario' : 'Host de Destino Físico';
            if (isUser) roPanel.style.display = 'none';
        };

        const paintRoPanel = (devObj) => {
            if (!devObj) {
                roPanel.style.display = 'none';
                return;
            }
            roPanel.style.display = 'block';
            document.getElementById('ro-p-ip').textContent = devObj.ip || '—';
            document.getElementById('ro-p-mac').textContent = devObj.mac || '—';
            document.getElementById('ro-p-model').textContent = devObj.model || '—';
            document.getElementById('ro-p-serial').textContent = devObj.serial || '—';
        };

        const updateDevSel = () => {
            const cat = typeSel.value.trim();
            if (!cat) {
                devSel.innerHTML = '<option value="">Seleccione Categoría primero...</option>';
                paintRoPanel(null);
                return;
            }
            const pool = allHosts.filter(d => d.device === cat);
            if (pool.length === 0) {
                devSel.innerHTML = `<option value="">Sin dispositivos de "${cat}" en "${areaContext || 'esta área'}"</option>`;
                paintRoPanel(null);
                return;
            }
            devSel.innerHTML = '<option value="">— Seleccionar equipo —</option>';
            pool.forEach(d => {
                const loc = d.rack ? `Rack: ${d.rack} · U${d.rackUnit}` : 'Individual';
                const hint = [d.ip, d.serial ? `S/N: ${d.serial}` : ''].filter(Boolean).join(' · ');
                devSel.innerHTML += `<option value="${d.id}" ${p.hostId === String(d.id) ? 'selected' : ''}>
                    ${d.name}${hint ? ' — ' + hint : ''} (${loc})
                </option>`;
            });
            devSel.dispatchEvent(new Event('change'));
        };

        typeSel.addEventListener('change', () => {
            applyMode();
            if (typeSel.value !== '__usuario__') updateDevSel();
        });
        devSel.addEventListener('change', () => {
            const selectedId = devSel.value;
            if (!selectedId) { paintRoPanel(null); return; }
            paintRoPanel(allHosts.find(d => String(d.id) === String(selectedId)));
        });

        // Estado inicial (incluye edición de un puerto ya guardado)
        applyMode();
        if (p.hostCategory === '__usuario__') {
            userInput.value = p.host || '';
        } else if (p.hostCategory) {
            updateDevSel();
        }
    }

    if (isFiber) {
        const sfpSel = document.getElementById('p-sfp-selector');
        const sfpPanel = document.getElementById('sfp-specs-panel');
        const sfpsInArea = store.devices.filter(d =>
            (d.device || '').toLowerCase() === 'sfp' && d.area === areaContext
        );

        const paintSfpSpecs = (sfpId) => {
            if (!sfpId || !sfpPanel) return;
            const sfp = sfpsInArea.find(s => s.id === sfpId);
            if (!sfp) { sfpPanel.style.display = 'none'; return; }
            sfpPanel.style.display = 'block';
            const fromSwitch = sfp.connectedSwitchId ? (store.devices.find(sw => sw.id === sfp.connectedSwitchId) || {}).name || '—' : '—';
            const toSwitch = sfp.towardsSwitchId ? (store.devices.find(sw => sw.id === sfp.towardsSwitchId) || {}).name || '—' : (sfp.towards || '—');
            document.getElementById('sfp-sp-brand').textContent = sfp.brand || '—';
            document.getElementById('sfp-sp-model').textContent = sfp.model || '—';
            document.getElementById('sfp-sp-speed').textContent = sfp.speed || '—';
            document.getElementById('sfp-sp-serial').textContent = sfp.serial || '—';
            document.getElementById('sfp-sp-from').textContent = fromSwitch;
            document.getElementById('sfp-sp-to').textContent = toSwitch;
        };

        if (sfpSel) {
            sfpSel.addEventListener('change', () => paintSfpSpecs(sfpSel.value));
            // Paint immediately if already selected
            if (p.sfpDeviceId) paintSfpSpecs(p.sfpDeviceId);
        }
    }
}

function syncSfpToGlobal(p, portName, parentName, areaContext, regionContext) {
    if (!p.sfpDeviceId) { p.sfpDeviceId = genId(); }

    // Auto crear categoría de seguridad si no existe
    if (!store.categories.find(c => c.name === 'SFP')) {
        store.categories.push({ id: genId(), name: 'SFP' });
    }

    let dev = store.devices.find(d => d.id === p.sfpDeviceId);
    if (!dev) {
        dev = {
            id: p.sfpDeviceId,
            device: 'SFP',
            name: `SFP [${portName}] en ${parentName}`,
            area: areaContext,
            regionId: regionContext
        };
        store.devices.push(dev);
    } else {
        dev.name = `SFP [${portName}] en ${parentName}`;
    }

    dev.brand = p.sfpBrand;
    dev.model = p.sfpModel;
    dev.serial = p.sfpSerial;
    dev.description = `Módulo transceptor instalado en ${parentName} (${portName}). Velocidad: ${p.sfpSpeed}`;
    dev.status = p.status === 'up' ? 'Activo' : 'En reposo';
}
