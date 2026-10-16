// ─────────────────────────────────────────────────────────────
// BASTIDOR — ficha de detalles del equipo elegido para una U.
// Extraído de rack/equipo.js (renderRackDevice) sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, isViewer } from '../../store.js';

export const fld = (label, value, mono = false) => {
    const isEmpty = !value || value === '';
    return `<div class="rd-field">
        <span class="rd-field-label">${label}</span>
        <span class="rd-field-value ${mono ? 'mono' : ''} ${isEmpty ? 'muted' : ''}">${isEmpty ? '—' : value}</span>
    </div>`;
};

export const statusBadgeClass = (s) => {
    if (['Up','Online','Activo','Disponible','Nuevo'].includes(s)) return 'badge-active';
    if (['Down','Falla','Inactivo','Desuso'].includes(s))          return 'badge-inactive';
    if (s === 'Stock')                                              return 'badge-info';
    return 'badge-warning';
};

// ── Paint device details ───────────────────────────────────
// Antes vivía dentro de renderRackDevice() (equipo.js); lo que usaba
// de allí llega en el primer parámetro, con los mismos nombres.
export function pintarDetalles({ unit, rack, existing, detailPanel, btnSave }, devObj) {
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

    // ── Puertos ────────────────────────────────────────────
    // Los del equipo montado se ven y se les asigna host en su ficha de
    // dispositivo (la misma de Dispositivos, que ya sabe tratar equipos
    // de bastidor por su id rack_<bastidor>_<U>).
    const eth = parseInt(devObj.ports, 10) || 0;
    const fib = parseInt(devObj.fiberPorts, 10) || 0;
    const nIfs = devObj.interfaces ? Object.keys(devObj.interfaces).length : 0;
    const portsBlock = devObj === existing && (eth || fib || nIfs) ? `
        <a class="rd-ports-btn" href="/device?id=${encodeURIComponent(`rack_${rack.id}_${unit}`)}&tab=interfaces">
            <span class="rd-ports-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10v4M10 10v4M14 10v4M18 10v4"/></svg></span>
            <span class="rd-ports-txt">
                <strong>Ver puertos y hosts</strong>
                <small>${nIfs ? `${nIfs} puertos` : [eth ? `${eth} Ethernet` : '', fib ? `${fib} de fibra` : ''].filter(Boolean).join(' · ')}${isViewer() ? '' : ' · asignar hosts'}</small>
            </span>
            <span class="rd-ports-flecha">›</span>
        </a>` : '';

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
                ${portsBlock}
                ${extraBlocks}
                ${colorRow}
            </div>
        </div>`;
}
