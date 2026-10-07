import { store, save, logHistory, isViewer } from '../store.js';
import { icons } from '../icons.js';

export function renderRackRoute(app) {
    const params = new URLSearchParams(window.location.search);
    const rackId = params.get('id');
    const unit = params.get('u');
    
    if (rackId && unit) {
        renderRackDevice(app, rackId, parseInt(unit));
    } else if (rackId) {
        renderRackView(app, rackId);
    } else {
        window.location.href = '/bastidores';
    }
}

function renderRackView(app, rackId) {
    const rack = store.racks.find(r => String(r.id) === String(rackId));
    if (!rack) { window.location.href='/bastidores'; return; }
    
    logHistory('rack', rack.id, rack.name);
    
    // Set manual breadcrumb (not using standard setBreadcrumb globally)
    document.getElementById('breadcrumb').innerHTML = `<span>DataBox IT</span><span class="sep">›</span><span>Bastidores</span><span class="sep">›</span><span class="current">${rack.name}</span>`;

    const reg = store.regions.find(r => r.id === rack.regionId);
    const area = store.areas.find(a => a.id === rack.areaId);
    const totalU = parseInt(rack.height) || 42;
    const slotCount = rack.slots ? Object.keys(rack.slots).length : 0;
    const pct = Math.round((slotCount / totalU) * 100);

    let rackRows = '';
    for (let u = totalU; u >= 1; u--) {
        const dev = rack.slots && rack.slots[u];
        if (dev) {
            rackRows += `<tr>
                <td class="rack-u-num">${u}U</td>
                <td class="rack-u-slot occupied">
                    <a href="/rack?id=${rack.id}&u=${u}" class="rack-device" style="background:${dev.color || '#38a169'}">${dev.name} - ${dev.device}</a>
                </td>
            </tr>`;
        } else {
            rackRows += `<tr onclick="this.querySelector('a').click()" style="cursor:pointer;">
                <td class="rack-u-num">${u}U</td>
                <td class="rack-u-slot empty">
                    <a href="/rack?id=${rack.id}&u=${u}" class="mobile-plus-btn-container">
                        <span class="mobile-plus-btn">+</span>
                    </a>
                </td>
            </tr>`;
        }
    }

    app.innerHTML = `<style>
        .rack-view-container {
            display: flex;
            gap: 40px;
            align-items: flex-start;
            flex-wrap: wrap;
        }
        .rack-specs-wrapper {
            flex: 1;
            min-width: 300px;
        }
        .rack-digital-twin {
            width: 100%;
            max-width: 380px;
            background: #1a1a24;
            border-radius: 12px;
            padding: 24px 16px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.5), inset 0 2px 10px rgba(255,255,255,0.1);
            border: 2px solid #2a2a35;
            flex-shrink: 0;
            margin: 0 auto;
        }
        .rack-digital-twin-header {
            text-align: center;
            color: #fff;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 2px dashed #333;
        }
        .rack-digital-twin-header h3 { margin: 0; font-size: 16px; letter-spacing: 1px; text-transform: uppercase; color: #e2e8f0; }
        
        .rack-rails {
            background: #0f0f13;
            border-left: 24px solid #2a2a35;
            border-right: 24px solid #2a2a35;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.9);
            position: relative;
            border-radius: 4px;
        }
        /* Agujeros de los tornillos del riel (Screw holes) */
        .rack-rails::before, .rack-rails::after {
            content: '';
            position: absolute;
            top: 0; bottom: 0;
            width: 8px;
            background-image: radial-gradient(circle, #09090b 45%, transparent 55%);
            background-size: 100% 38px; /* cada U mide 38px */
            background-position: center 10px;
            pointer-events: none;
        }
        .rack-rails::before { left: -16px; }
        .rack-rails::after { right: -16px; }

        .dt-rack-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            position: relative;
            z-index: 2;
        }
        .dt-rack-table td {
            height: 38px;
            padding: 0;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            box-sizing: border-box;
            position: relative;
        }
        .rack-u-num {
            width: 32px;
            text-align: center;
            color: #64748b;
            font-size: 11px;
            background: rgba(0,0,0,0.6);
            font-family: 'JetBrains Mono', monospace;
            border-right: 2px solid #000;
        }
        .mobile-plus-btn-container {
            display: flex;
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            text-decoration: none;
            background: rgba(255, 255, 255, 0.001); /* iOS WebKit click target fix */
            align-items: center;
            justify-content: flex-end;
            padding-right: 12px;
            box-sizing: border-box;
            cursor: pointer;
        }
        .mobile-plus-btn {
            display: none;
        }
        @media (max-width: 768px) {
            .mobile-plus-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                background-color: #475569; /* Gris */
                color: #ffffff;
                font-size: 14px;
                font-weight: bold;
                border-radius: 4px; /* Un cuadrado redondito en vez de circulo, lucira mas DCIM */
                opacity: 0.8;
            }
        }
        .rack-u-slot.empty a:hover, tr:hover .rack-u-slot.empty a {
            background: rgba(59, 130, 246, 0.1);
            box-shadow: inset 0 0 10px rgba(59, 130, 246, 0.3);
        }
        .rack-u-slot {
            width: 100%;
        }
        .rack-u-slot.occupied a {
            display: flex;
            position: absolute;
            left: 2px;
            right: 2px;
            top: 1px;
            bottom: 1px;
            align-items: center;
            justify-content: center;
            color: #fff;
            text-decoration: none !important;
            font-size: 12px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
            box-shadow: inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.5);
            border: 1px solid rgba(0,0,0,0.8);
            border-top: 1px solid rgba(255,255,255,0.4);
            border-radius: 3px;
            box-sizing: border-box;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 8px;
        }
        .rack-u-slot.occupied a:hover {
            filter: brightness(1.15);
            transform: scale(1.02);
            z-index: 10;
            position: relative;
        }

        /* ── Teléfono ───────────────────────────────────────── */
        @media (max-width: 768px) {
            .rack-view-container { gap: 20px; }
            /* min-width:300px obligaba a un ancho que no siempre cabe */
            .rack-specs-wrapper { min-width: 0; width: 100%; }

            /* La tabla de especificaciones es de dos columnas
               (etiqueta / valor): debe ajustar el texto en vez de
               provocar scroll lateral, que es lo que hace la regla
               general de tablas en móvil. */
            .table-details { white-space: normal; }
            .table-details td { word-break: break-word; }

            /* El nombre del equipo se salía del riel cuando era largo */
            .rack-u-slot.occupied a {
                font-size: 10.5px;
                padding: 0 6px;
                overflow: hidden;
                white-space: nowrap;
            }
            .rack-digital-twin { padding: 18px 12px; }
            .rack-digital-twin-header h3 { font-size: 14px; }
        }
    </style>
    <div class="view-transition">
        <div class="page-header">
            <h1>${icons.rack} ${rack.name}</h1>
            <div class="page-header-actions">
                <a href="/bastidores" class="btn btn-outline">← Volver</a>
            </div>
        </div>
        
        <div class="rack-view-container">
            <div class="rack-specs-wrapper">
                <div class="card">
                    <div class="card-header">
                        <h2>Especificaciones Técnicas</h2>
                    </div>
                    <table class="table-details" style="width:100%;border-collapse:collapse;">
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted);width:40%">Nombre</td><td style="padding:12px"><strong>${rack.name}</strong></td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Región</td><td style="padding:12px"><span class="badge badge-teal">${reg ? reg.name : '—'}</span></td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Área</td><td style="padding:12px">${area ? area.name : '—'}</td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Estado</td><td style="padding:12px"><span class="badge ${rack.status === 'Activo' ? 'badge-active' : 'badge-warning'}">${rack.status}</span></td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Tipo</td><td style="padding:12px">${rack.type || '—'}</td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Descripción</td><td style="padding:12px">${rack.description || '—'}</td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Anchura</td><td style="padding:12px">${rack.width ? rack.width + ' cm' : '—'}</td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Altura</td><td style="padding:12px;font-family:'JetBrains Mono'"><strong>${totalU}U</strong></td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Dispositivos</td><td style="padding:12px;font-family:'JetBrains Mono'"><strong>${slotCount}</strong> alojados</td></tr>
                        <tr><td style="padding:12px;color:var(--text-muted)">Uso de espacio</td><td style="padding:12px">
                            <div class="space-bar" style="max-width:150px">
                                <div class="space-bar-fill"><div style="width:${pct}%;background:${pct < 30 ? 'var(--success)' : pct < 70 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
                                <span class="space-bar-pct">${pct}%</span>
                            </div>
                        </td></tr>
                    </table>
                </div>
            </div>

            <div class="rack-digital-twin">
                <div class="rack-digital-twin-header">
                    <h3>PANELES FRONTALES</h3>
                    <span style="font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace">ELEVACIÓN ${totalU}U • CLICK PARA EDITAR</span>
                </div>
                <div class="rack-rails">
                    <table class="dt-rack-table">${rackRows}</table>
                </div>
            </div>
        </div>
    </div>`;
}

function renderRackDevice(app, rackId, unit) {
    const rack = store.racks.find(r => String(r.id) === String(rackId));
    if (!rack) { window.location.href = '/bastidores'; return; }
    const existing  = rack.slots && rack.slots[unit];
    if (isViewer() && !existing) { window.location.href = `/rack?id=${rackId}`; return; }
    const rackAreaName = store.areas.find(a => a.id === rack.areaId)?.name || '';

    document.getElementById('breadcrumb').innerHTML = `<span>DataBox IT</span><span class="sep">›</span><span>Bastidores</span><span class="sep">›</span><span>${rack.name}</span><span class="sep">›</span><span class="current">U${unit}</span>`;

    // Build the category list from all unique device types in the store.
    // 'General' is a view category, not a device type — never appears in d.device.
    const deviceTypes = [...new Set(
        store.devices.map(d => d.device).filter(Boolean)
    )].sort();
    // Also include custom categories that might have no devices yet
    const customNames = (store.categories || []).map(c => c.name).filter(n => !deviceTypes.includes(n));
    const allTypes = [...deviceTypes, ...customNames].sort();

    app.innerHTML = `
    <style>
        .rd-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            margin-top: 16px;
            animation: fadeSlideIn 0.25s ease;
        }
        @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .rd-card-header {
            padding: 14px 20px;
            background: var(--bg);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .rd-type-pill {
            background: var(--primary);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            padding: 4px 10px;
            border-radius: 20px;
        }
        .rd-device-name {
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            color: var(--text);
        }
        .rd-card-body { padding: 20px; }
        .rd-section-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            color: var(--text-muted);
            margin: 20px 0 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--border);
        }
        .rd-section-label:first-child { margin-top: 0; }
        .rd-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: 14px;
        }
        .rd-field { display: flex; flex-direction: column; gap: 3px; }
        .rd-field-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: var(--text-muted);
        }
        .rd-field-value {
            font-size: 14px;
            font-weight: 500;
            color: var(--text);
        }
        .rd-field-value.mono {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
        }
        .rd-field-value.muted { color: var(--text-muted); font-style: italic; font-size: 13px; }
        .rd-color-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 20px;
            padding: 12px 16px;
            background: var(--bg);
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        .rd-color-swatch {
            width: 36px; height: 36px; border-radius: 8px;
            border: 2px solid var(--border); cursor: pointer;
            transition: transform 0.15s;
        }
        .rd-color-swatch:hover { transform: scale(1.08); }
        .rd-actions-container {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
        }
        @media (max-width: 768px) {
            .rd-actions-container {
                flex-direction: column-reverse;
                align-items: stretch;
                padding-bottom: 80px; /* Space for the floating nav menu on mobile */
            }
            .rd-actions-container .btn {
                width: 100%;
                justify-content: center;
                padding: 12px;
            }
        }
    </style>

    <div class="view-transition">
        <div class="page-header">
            <h1>Dispositivo — ${rack.name} / U${unit}</h1>
            <div class="page-header-actions">
                <a href="/rack?id=${rack.id}" class="btn btn-outline">← Volver al rack</a>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h2>${existing ? (isViewer() ? 'Detalles del Dispositivo' : 'Editar Dispositivo Montado') : 'Asignar Dispositivo Físico'}</h2>
            </div>
            <div style="padding:20px">
                <div class="form-row" style="${isViewer() ? 'display:none;' : ''}">
                    <div class="form-group">
                        <label>Categoría (Tipo)</label>
                        <select id="fd-category">
                            <option value="">Seleccione tipo...</option>
                            ${allTypes.map(t =>
                                `<option value="${t}" ${existing && existing.device === t ? 'selected' : ''}>${t}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Dispositivo disponible en [${rackAreaName || 'sin área'}]</label>
                        <select id="fd-global-device">
                            <option value="">Esperando categoría...</option>
                        </select>
                    </div>
                </div>

                <div id="rd-detail-panel"></div>

                <div class="rd-actions-container">
                    ${existing
                        ? `<button class="btn btn-danger" id="btn-delete-rd">${icons.trash} Retirar del Rack</button>`
                        : ''}
                    <a href="/rack?id=${rack.id}" class="btn btn-outline">Cancelar</a>
                    <button class="btn btn-success" id="btn-save-rd" style="display:none; justify-content: center;">${icons.save} Guardar en Rack</button>
                </div>
            </div>
        </div>
    </div>`;

    // ── Helpers ────────────────────────────────────────────────
    let currentDevObj = existing || null;
    const catSelect   = document.getElementById('fd-category');
    const devSelect   = document.getElementById('fd-global-device');
    const detailPanel = document.getElementById('rd-detail-panel');
    const btnSave     = document.getElementById('btn-save-rd');

    const fld = (label, value, mono = false) => {
        const isEmpty = !value || value === '';
        return `<div class="rd-field">
            <span class="rd-field-label">${label}</span>
            <span class="rd-field-value ${mono ? 'mono' : ''} ${isEmpty ? 'muted' : ''}">${isEmpty ? '—' : value}</span>
        </div>`;
    };

    const statusBadgeClass = (s) => {
        if (['Up','Online','Activo','Disponible','Nuevo'].includes(s)) return 'badge-active';
        if (['Down','Falla','Inactivo','Desuso'].includes(s))          return 'badge-inactive';
        if (s === 'Stock')                                              return 'badge-info';
        return 'badge-warning';
    };

    // ── Paint device details ───────────────────────────────────
    const paintDetails = (devObj) => {
        if (!devObj) {
            detailPanel.innerHTML = '';
            btnSave.style.display = 'none';
            return;
        }
        btnSave.style.display = 'inline-flex';

        const type = (devObj.device || '').toLowerCase();
        const reg  = store.regions.find(r => r.id === devObj.regionId);
        const color = devObj.color || '#38a169';

        // ── Common header block ────────────────────────────────
        const headerBlock = `
            <div class="rd-card-header">
                <span class="rd-type-pill">${devObj.device || 'Dispositivo'}</span>
                <div>
                    <p class="rd-device-name">${devObj.name}</p>
                </div>
                <span class="badge ${statusBadgeClass(devObj.status)}" style="margin-left:4px">${devObj.status || '—'}</span>
            </div>`;

        // ── Location & Identity ────────────────────────────────
        const identityBlock = `
            <p class="rd-section-label">Ubicación e Identificación</p>
            <div class="rd-grid">
                ${fld('Marca',   devObj.brand)}
                ${fld('Modelo',  devObj.model)}
                ${fld('Serie',   devObj.serial,  true)}
                ${fld('Región',  reg?.name)}
                ${fld('Área',    devObj.area)}
            </div>`;

        // ── Type-specific blocks ───────────────────────────────
        let techBlock = '';
        let extraBlocks = '';

        if (type === 'cámaras') {
            techBlock = `
                <p class="rd-section-label">Red & Acceso</p>
                <div class="rd-grid">
                    ${fld('IP',          devObj.ip,          true)}
                    ${fld('MAC',         devObj.mac,         true)}
                    ${fld('Puerto SW',   devObj.swPort,      true)}
                </div>
                <p class="rd-section-label">Cámara</p>
                <div class="rd-grid">
                    ${fld('Resolución',  devObj.resolution)}
                    ${fld('Tipo',        devObj.cameraType)}
                    ${fld('NVR Asignado',devObj.nvr)}
                    ${fld('Canal',       devObj.channel)}
                </div>`;
            if (devObj.user1 || devObj.pass1 || devObj.user2 || devObj.pass2) {
                extraBlocks += `
                <p class="rd-section-label">Credenciales</p>
                <div class="rd-grid">
                    ${fld('Usuario 1',    devObj.user1)}
                    ${fld('Contraseña 1', devObj.pass1)}
                    ${fld('Usuario 2',    devObj.user2)}
                    ${fld('Contraseña 2', devObj.pass2)}
                </div>`;
            }
            if (devObj.maintenance) {
                extraBlocks += `
                <p class="rd-section-label">Mantenimiento</p>
                <div class="rd-grid" style="grid-template-columns:1fr">${fld('Notas', devObj.maintenance)}</div>`;
            }

        } else if (type === 'nvr') {
            techBlock = `
                <p class="rd-section-label">Red & Acceso</p>
                <div class="rd-grid">
                    ${fld('IP',        devObj.ip,        true)}
                    ${fld('MAC',       devObj.mac,       true)}
                    ${fld('Puerto SW', devObj.swPort,    true)}
                    ${fld('Canales',   devObj.channels)}
                    ${fld('Usuario',   devObj.user)}
                    ${fld('Contraseña',devObj.password)}
                </div>`;
            if (devObj.maintenance) {
                extraBlocks = `<p class="rd-section-label">Mantenimiento</p>
                <div class="rd-grid" style="grid-template-columns:1fr">${fld('Notas', devObj.maintenance)}</div>`;
            }

        } else if (type === 'antenas') {
            techBlock = `
                <p class="rd-section-label">Red & Acceso</p>
                <div class="rd-grid">
                    ${fld('IP',        devObj.ip,      true)}
                    ${fld('MAC',       devObj.mac,     true)}
                    ${fld('Puerto SW', devObj.swPort,  true)}
                    ${fld('Usuario',   devObj.user)}
                    ${fld('Contraseña',devObj.password)}
                </div>`;
            if (devObj.maintenance) {
                extraBlocks = `<p class="rd-section-label">Mantenimiento</p>
                <div class="rd-grid" style="grid-template-columns:1fr">${fld('Notas', devObj.maintenance)}</div>`;
            }

        } else if (type === 'switch') {
            techBlock = `
                <p class="rd-section-label">Red</p>
                <div class="rd-grid">
                    ${fld('IP',              devObj.ip,          true)}
                    ${fld('MAC',             devObj.mac,         true)}
                </div>
                <p class="rd-section-label">Puertos & Energía</p>
                <div class="rd-grid">
                    ${fld('Puertos Ethernet',devObj.ports)}
                    ${fld('Puertos Fibra',   devObj.fiberPorts)}
                    ${fld('Fuentes de Poder',devObj.powerSources)}
                </div>`;
            if (devObj.maintenance) {
                extraBlocks = `<p class="rd-section-label">Mantenimiento</p>
                <div class="rd-grid" style="grid-template-columns:1fr">${fld('Notas', devObj.maintenance)}</div>`;
            }

        } else if (type === 'sfp') {
            const swName = devObj.connectedSwitchId
                ? (store.devices.find(d => d.id === devObj.connectedSwitchId) || {}).name || '—'
                : '—';
            techBlock = `
                <p class="rd-section-label">Conectividad</p>
                <div class="rd-grid">
                    ${fld('Velocidad',        devObj.speed)}
                    ${fld('Switch Conectado',  swName)}
                    ${fld('Puerto',            devObj.port,    true)}
                    ${fld('Hacia (Destino)',   devObj.towards)}
                </div>`;
            if (devObj.maintenance) {
                extraBlocks = `<p class="rd-section-label">Mantenimiento</p>
                <div class="rd-grid" style="grid-template-columns:1fr">${fld('Notas', devObj.maintenance)}</div>`;
            }

        } else if (type === 'ap') {
            techBlock = `
                <p class="rd-section-label">Red Inalámbrica</p>
                <div class="rd-grid">
                    ${fld('IP',          devObj.ip,       true)}
                    ${fld('MAC',         devObj.mac,      true)}
                    ${fld('SSID',        devObj.ssid)}
                    ${fld('VLAN',        devObj.vlan)}
                    ${fld('Contraseña',  devObj.password)}
                </div>`;

        } else if (type === 'ups') {
            techBlock = `
                <p class="rd-section-label">Especificaciones</p>
                <div class="rd-grid">
                    ${fld('Capacidad',        devObj.kva ? devObj.kva + ' KVA' : '')}
                    ${fld('Fecha Cambio UPS', devObj.changeDate)}
                </div>`;
            const b1 = devObj.battery1 || {};
            const b2 = devObj.battery2 || {};
            if (b1.brand || b2.brand) {
                extraBlocks = `
                <p class="rd-section-label">Batería 1</p>
                <div class="rd-grid">
                    ${fld('Marca',        b1.brand)}
                    ${fld('Modelo',       b1.model)}
                    ${fld('Serie',        b1.serial,     true)}
                    ${fld('Fecha Cambio', b1.changeDate)}
                </div>
                <p class="rd-section-label">Batería 2</p>
                <div class="rd-grid">
                    ${fld('Marca',        b2.brand)}
                    ${fld('Modelo',       b2.model)}
                    ${fld('Serie',        b2.serial,     true)}
                    ${fld('Fecha Cambio', b2.changeDate)}
                </div>`;
            }

        } else if (type === 'supresores') {
            techBlock = `
                <p class="rd-section-label">Especificaciones</p>
                <div class="rd-grid">
                    ${fld('Rack / Nodo', devObj.rackNode)}
                    ${fld('Cantidad',    devObj.quantity)}
                    ${fld('Entrada',     devObj.input)}
                    ${fld('Salida',      devObj.output)}
                </div>`;

        } else if (type === 'pdu') {
            techBlock = `
                <p class="rd-section-label">Especificaciones</p>
                <div class="rd-grid">
                    ${fld('Cantidad', devObj.quantity)}
                </div>`;

        } else if (type === 'patch panels') {
            techBlock = `
                <p class="rd-section-label">Especificaciones</p>
                <div class="rd-grid">
                    ${fld('Categoría UTP', devObj.categoryUTP)}
                    ${fld('Puertos',       devObj.ports)}
                    ${fld('Rack / Nodo',   devObj.rackNode)}
                </div>`;

        } else {
            // Generic fallback
            if (devObj.ip || devObj.mac) {
                techBlock = `
                <p class="rd-section-label">Red</p>
                <div class="rd-grid">
                    ${fld('IP',  devObj.ip,  true)}
                    ${fld('MAC', devObj.mac, true)}
                </div>`;
            }
            if (devObj.description) {
                extraBlocks = `<p class="rd-section-label">Descripción</p>
                <div class="rd-grid" style="grid-template-columns:1fr">${fld('', devObj.description)}</div>`;
            }
        }

        // ── Color picker ───────────────────────────────────────
        const colorRow = isViewer() ? '' : `
            <div class="rd-color-row">
                <input type="color" id="fd-color" value="${color}"
                    style="width:36px;height:36px;border:none;background:none;cursor:pointer;padding:0;border-radius:6px;overflow:hidden;">
                <div>
                    <p style="margin:0;font-size:13px;font-weight:600;">Color en el rack</p>
                    <p style="margin:0;font-size:12px;color:var(--text-muted);">Elige el color con que aparecerá en el diagrama del bastidor</p>
                </div>
            </div>`;

        detailPanel.innerHTML = `
            <div class="rd-card">
                ${headerBlock}
                <div class="rd-card-body">
                    ${identityBlock}
                    ${techBlock}
                    ${extraBlocks}
                    ${colorRow}
                </div>
            </div>`;
    };

    // ── Update device dropdown ─────────────────────────────────
    const updateDevSelect = () => {
        const cat = catSelect.value;
        if (!cat) {
            devSelect.innerHTML = '<option value="">Esperando categoría...</option>';
            paintDetails(null);
            return;
        }
        const pool = store.devices.filter(d => d.device === cat && d.area === rackAreaName);
        devSelect.innerHTML = '<option value="">— Seleccionar equipo —</option>';
        if (existing && existing.device === cat) {
            devSelect.innerHTML += `<option value="CURRENT_MOUNTED">★ ${existing.name} (instalado actualmente)</option>`;
        }
        pool.forEach(d => {
            const hint = [d.ip, d.serial ? 'S/N: ' + d.serial : ''].filter(Boolean).join(' · ');
            devSelect.innerHTML += `<option value="${d.id}">${d.name}${hint ? ' — ' + hint : ''}</option>`;
        });
        if (devSelect.options.length === 1) {
            devSelect.innerHTML = `<option value="">Sin dispositivos de este tipo en "${rackAreaName}"</option>`;
        }
        devSelect.dispatchEvent(new Event('change'));
    };

    catSelect.addEventListener('change', updateDevSelect);
    devSelect.addEventListener('change', () => {
        const id = devSelect.value;
        if (!id) { currentDevObj = null; paintDetails(null); return; }
        if (id === 'CURRENT_MOUNTED') { currentDevObj = existing; paintDetails(existing); return; }
        const found = store.devices.find(d => d.id === id) || null;
        currentDevObj = found;
        paintDetails(currentDevObj);
    });

    if (existing) {
        updateDevSelect();
        devSelect.value = 'CURRENT_MOUNTED';
        // updateDevSelect dispara dispatchEvent('change') internamente, lo que resetea
        // currentDevObj a null. Lo restauramos aquí explícitamente.
        currentDevObj = existing;
        paintDetails(existing);
    }

    // ── Save ───────────────────────────────────────────────────
    const btnSaveRd = document.getElementById('btn-save-rd');
    btnSaveRd?.addEventListener('click', async () => {
        if (btnSaveRd.disabled) return;
        if (!currentDevObj) return alert('Selecciona un dispositivo primero');

        // Se bloquea ANTES de mutar el store: este formulario se pinta inline
        // (no es un modal que se destruya al guardar), así que un doble clic
        // durante el await duplicaba el push a store.devices. Un id repetido
        // rompe el upsert por lote y aborta TODO el guardado del ciclo.
        btnSaveRd.disabled      = true;
        btnSaveRd.style.opacity = '0.6';

        const selectedId = devSelect.value;
        const newColor   = document.getElementById('fd-color')?.value || '#38a169';
        if (!rack.slots) rack.slots = {};

        if (existing && selectedId !== 'CURRENT_MOUNTED') {
            // Return previously mounted device to global pool
            store.devices.push(existing);
        }
        if (selectedId !== 'CURRENT_MOUNTED') {
            rack.slots[unit] = { ...currentDevObj, color: newColor };
            store.devices = store.devices.filter(d => d.id !== currentDevObj.id);
        } else {
            rack.slots[unit].color = newColor;
        }
        // Await para que Supabase complete antes de navegar.
        // Sin await, load() en la siguiente página obtiene datos viejos.
        if (!await save()) {
            // No navegamos: el aviso de error se destruiría con la página y el
            // usuario se quedaría sin saber que su cambio no llegó al servidor.
            btnSaveRd.disabled      = false;
            btnSaveRd.style.opacity = '';
            return;
        }
        window.location.href = `/rack?id=${rackId}`;
    });

    // ── Delete / Retire ────────────────────────────────────────
    const btnDeleteRd = document.getElementById('btn-delete-rd');
    btnDeleteRd?.addEventListener('click', async () => {
        if (btnDeleteRd.disabled) return;
        if (confirm(`¿Retirar este dispositivo de la ${unit}U? Volverá al módulo de Dispositivos.`)) {
            btnDeleteRd.disabled      = true;
            btnDeleteRd.style.opacity = '0.6';
            store.devices.push(rack.slots[unit]);
            delete rack.slots[unit];
            if (!await save()) {
                btnDeleteRd.disabled      = false;
                btnDeleteRd.style.opacity = '';
                return;
            }
            window.location.href = `/rack?id=${rackId}`;
        }
    });
}
