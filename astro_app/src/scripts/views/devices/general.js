// ─────────────────────────────────────────────────────────────
// GENERAL — la vista "Todos los dispositivos" y la limpieza que
// devuelve la tabla a su estado base al cambiar de subcategoría.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { getAllDevices, store } from '../../store.js';
import { quitarBarraHorizontal } from './barraHorizontalFija.js';
import { ELEMENTOS_TYPES } from './categorias.js';
import { filterDeviceTable } from './tabla.js';
import { reiniciarEnlacesIsp } from './ispEnlaces.js';

// Filtros de la vista General (se reinician al cambiar de subcategoría)
let allDevicesFilters = { search: '', region: '', area: '' };

// ─────────────────────────────────────────────────────────────
// GENERAL: Todos los Dispositivos (unified view, excluding Elementos)
// ─────────────────────────────────────────────────────────────
export function renderAllDevicesTable() {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');
    if (!tbody) return;

    tableContainer.style.overflowX = 'auto';

    if (!thead.dataset.isAllDevices) {
        thead.dataset.isAllDevices = 'true';
        thead.innerHTML = `<tr>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;width:36px;text-align:center;">#</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Nombre</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Tipo</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Estado</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Región</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Área</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Marca</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Modelo</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Serie</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">IP</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">MAC</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Canal</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">NVR</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Pto. SW</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Velocidad</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Puertos</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">SSID</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">KVA</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Mantenimiento</th>
        </tr>`;

        // Wire up filters
        const allBase = getAllDevices().filter(d => !ELEMENTOS_TYPES.has((d.device || '').toLowerCase()));
        const searchInput = document.getElementById('search-devices');
        if (searchInput) {
            searchInput.placeholder = 'Buscar dispositivo...';
            searchInput.value = allDevicesFilters.search;
            searchInput.oninput = (e) => { allDevicesFilters.search = e.target.value; renderAllDevicesTable(); };
        }
        document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

        const regionSelect = document.getElementById('dev-region-filter');
        if (regionSelect) {
            const ctxRegions = [...new Set(allBase.map(d => d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '').filter(Boolean).sort())];
            regionSelect.innerHTML = `<option value="">Todas las regiones</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
            regionSelect.value = allDevicesFilters.region;
            regionSelect.onchange = (e) => { allDevicesFilters.region = e.target.value; renderAllDevicesTable(); };
        }
        const areaSelect = document.getElementById('dev-area-filter');
        if (areaSelect) {
            const ctxAreas = [...new Set(allBase.map(d => d.area).filter(Boolean).sort())];
            areaSelect.innerHTML = `<option value="">Todas las áreas</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
            areaSelect.value = allDevicesFilters.area;
            areaSelect.onchange = (e) => { allDevicesFilters.area = e.target.value; renderAllDevicesTable(); };
        }
    }

    // Get all non-Elementos devices
    const allBase = getAllDevices().filter(d => !ELEMENTOS_TYPES.has((d.device || '').toLowerCase()));

    // Apply filters
    const search = allDevicesFilters.search.toLowerCase();
    const regFilter = allDevicesFilters.region;
    const areaFilter = allDevicesFilters.area;
    const filteredDevs = allBase.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';
        if (search) {
            const str = `${d.name} ${regName} ${d.area} ${d.device} ${d.brand} ${d.model} ${d.serial} ${d.ip || ''} ${d.mac || ''}`.toLowerCase();
            if (!str.includes(search)) return false;
        }
        if (regFilter && regName !== regFilter) return false;
        if (areaFilter && d.area !== areaFilter) return false;
        return true;
    });

    if (filteredDevs.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        if (countDisplay) countDisplay.textContent = '0';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    if (countDisplay) countDisplay.textContent = allBase.length;
    if (showingDisplay) showingDisplay.textContent = filteredDevs.length;
    if (totalDisplay) totalDisplay.textContent = filteredDevs.length;

    // N/A placeholder
    const NA = `<span style="color:var(--text-muted);font-size:11px;font-style:italic;">N/A</span>`;

    const statusClass = (d) => {
        const s = d.status || '';
        if (['Up', 'Online', 'Activo', 'Disponible', 'Nuevo'].includes(s)) return 'badge-active';
        if (['Down', 'Falla', 'Inactivo', 'Desuso'].includes(s)) return 'badge-inactive';
        if (['Batería', 'Mantenimiento', 'En reposo'].includes(s)) return 'badge-warning';
        if (s === 'Stock') return 'badge-info';
        return 'badge-warning';
    };

    tbody.innerHTML = filteredDevs.map((d, i) => {
        const type = (d.device || '').toLowerCase();
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';

        const isCamera   = type === 'cámaras';
        const isNvr      = type === 'nvr';
        const isAntenna  = type === 'antenas';
        const isSwitch   = type === 'switch';
        const isSfp      = type === 'sfp';
        const isAp       = type === 'ap';
        const isBio      = type === 'biométricos';
        const isUps      = type === 'ups';

        // Which columns have meaningful data per type
        const hasIp          = isCamera || isNvr || isAntenna || isSwitch || isAp || isBio;
        const hasMac         = isCamera || isNvr || isAntenna || isSwitch || isAp || isBio;
        const hasChannel     = isCamera;                              // NVR channel the camera is assigned to
        const hasNvrField    = isCamera;                              // NVR name for cameras
        const hasSwPort      = isCamera || isNvr || isAntenna;        // Switch port
        const hasSpeed       = isSfp;
        const hasPorts       = isSwitch;
        const hasSsid        = isAp;
        const hasKva         = isUps;
        const hasMaintenance = isCamera || isNvr || isAntenna || isSwitch || isSfp;

        // For SFP, show connected switch in the Pto.SW column
        const sfpSwitchName = isSfp && d.connectedSwitchId
            ? (store.devices.find(sw => sw.id === d.connectedSwitchId) || {}).name || '—'
            : null;

        const swPortCell = hasSwPort
            ? (d.swPort || '—')
            : (isSfp ? (sfpSwitchName ? `${sfpSwitchName}${d.port ? ' · ' + d.port : ''}` : '—') : NA);

        return `<tr>
            <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${i + 1}</td>
            <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
            <td style="white-space:nowrap;font-size:12px;">${d.device || '—'}</td>
            <td style="white-space:nowrap;"><span class="badge ${statusClass(d)}">${d.status || '—'}</span></td>
            <td style="white-space:nowrap;">${regName}</td>
            <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
            <td style="white-space:nowrap;">${d.brand || '—'}</td>
            <td style="white-space:nowrap;font-size:12px;">${d.model || '—'}</td>
            <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11px;">${d.serial || '—'}</td>
            <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11px;">${hasIp   ? (d.ip  || '—') : NA}</td>
            <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11px;">${hasMac  ? (d.mac || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasChannel     ? (d.channel  || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasNvrField    ? (d.nvr      || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${swPortCell}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasSpeed       ? (d.speed    || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasPorts       ? (d.ports    || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasSsid        ? (d.ssid     || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasKva         ? (d.kva      || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasMaintenance ? (d.maintenance || '—') : NA}</td>
        </tr>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// CLEANUP: Remove all specialized filters/pagination before switching type
// ─────────────────────────────────────────────────────────────
export function _cleanupAllSpecializedFilters() {
    // La barra horizontal fija es solo de Cámaras: se quita al salir de ahí.
    quitarBarraHorizontal();

    const tableContainer = document.getElementById('devices-table-container');
    if (!tableContainer) return;

    [
        'cam-filters-wrapper', 'nvr-filters-wrapper', 'antenna-filters-wrapper',
        'switch-filters-wrapper', 'sfp-filters-wrapper', 'ap-filters-wrapper',
        'bio-filters-wrapper',
        'ups-filters-wrapper', 'suppressor-filters-wrapper', 'pdu-filters-wrapper',
        'patchpanel-filters-wrapper', 'bandeja-fibra-filters-wrapper',
        'organizador-filters-wrapper', 'patchcord-filters-wrapper',
        'patchcord-fibra-filters-wrapper'
    ].forEach(id => document.getElementById(id)?.remove());

    [
        'camera-pagination', 'nvr-pagination', 'antenna-pagination',
        'switch-pagination', 'sfp-pagination', 'ap-pagination', 'bio-pagination',
        'ups-pagination', 'suppressor-pagination', 'pdu-pagination',
        'patchpanel-pagination', 'bandeja-fibra-pagination',
        'organizador-pagination', 'patchcord-pagination', 'patchcord-fibra-pagination'
    ].forEach(id => document.getElementById(id)?.remove());

    const thead = tableContainer.querySelector('table thead');
    if (thead) {
        ['isCamera', 'isNvr', 'isAntenna', 'isSwitch', 'isSfp', 'isAp', 'isBio', 'isUps',
         'isSuppressor', 'isPdu', 'isPatchPanel', 'isBandejaFibra', 'isOrganizador',
         'isPatchcord', 'isPatchcordFibra', 'isAllDevices'].forEach(k => delete thead.dataset[k]);
    }

    // Reset General/Todos filters state so the setup reruns on next visit
    allDevicesFilters = { search: '', region: '', area: '' };

    // Reset ISPs General state
    reiniciarEnlacesIsp();

    // Restore the main "Resultados" card (hidden by ISPs General / Reportes views)
    const _mainCard  = document.getElementById('dev-main-card');
    if (_mainCard)  _mainCard.style.display   = '';

    // Restore header filters that may have been hidden by Reportes view
    const _areaFil   = document.getElementById('dev-area-filter');
    const _statusFil = document.getElementById('dev-status-filter');
    const _searchBox = document.querySelector('.search-box');
    const _regFil    = document.getElementById('dev-region-filter');
    if (_areaFil)   _areaFil.style.display   = '';
    if (_statusFil) _statusFil.style.display  = '';
    if (_searchBox) _searchBox.style.display  = '';
    if (_regFil)    _regFil.style.display     = '';

    // If Reportes replaced tableContainer.innerHTML, restore the original table structure
    // so that devices-tbody exists again for other views
    if (tableContainer && document.getElementById('incidents-tbody')) {
        tableContainer.innerHTML = `
            <div style="overflow-x:auto">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th><th>Estado</th><th>Región</th><th>Área</th>
                            <th>Rack</th><th>Categoría</th><th>Marca</th><th>Modelo</th>
                            <th>Serie</th><th>IP</th><th>MAC</th><th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="devices-tbody"></tbody>
                </table>
            </div>
            <div class="table-count">
                Mostrando <span id="dev-showing">0</span> de <span id="devices-total">0</span>
            </div>`;
        tableContainer.style.display = 'none';
    }
}

// ─────────────────────────────────────────────────────────────
// RESTAURAR: cabeceras y filtros de la tabla genérica
// ─────────────────────────────────────────────────────────────
export function restoreNormalHeaders(tableContainer) {
    const thead = tableContainer.querySelector('table thead');
    if (thead && (thead.dataset.isCamera || thead.dataset.isNvr || thead.dataset.isAntenna || thead.dataset.isSwitch || thead.dataset.isSfp || thead.dataset.isAp || thead.dataset.isUps || thead.dataset.isSuppressor || thead.dataset.isPdu || thead.dataset.isPatchPanel || thead.dataset.isBandejaFibra || thead.dataset.isOrganizador || thead.dataset.isPatchcord || thead.dataset.isPatchcordFibra)) {
        thead.dataset.isCamera = '';
        thead.dataset.isNvr = '';
        thead.dataset.isAntenna = '';
        thead.dataset.isSwitch = '';
        thead.dataset.isSfp = '';
        thead.dataset.isAp = '';
        thead.dataset.isUps = '';
        thead.dataset.isSuppressor = '';
        thead.dataset.isPdu = '';
        thead.dataset.isPatchPanel = '';
        thead.dataset.isBandejaFibra = '';
        thead.dataset.isOrganizador = '';
        thead.dataset.isPatchcord = '';
        thead.dataset.isPatchcordFibra = '';
        thead.innerHTML = `<tr>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;width:36px;text-align:center;">#</th>
            <th>Dispositivo</th>
            <th>Estado</th>
            <th>Región</th>
            <th>Área</th>
            <th>Rack</th>
            <th>Tipo</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Serie</th>
            <th>IP</th>
            <th>MAC</th>
            <th>Acciones</th>
        </tr>`;

        // Restore filters
        const searchInput = document.getElementById('search-devices');
        if (searchInput) {
            searchInput.closest('.search-box').style.display = '';
            searchInput.placeholder = "Buscar dispositivo...";
            searchInput.oninput = filterDeviceTable;
            searchInput.value = ''; // Clear search
        }
        document.getElementById('dev-status-filter')?.style.setProperty('display', '');

        // Restore original event listeners
        const regionEl = document.getElementById('dev-region-filter');
        if (regionEl) {
            regionEl.options[0].textContent = 'Todas las regiones';
            regionEl.onchange = filterDeviceTable;
        }
        const areaEl = document.getElementById('dev-area-filter');
        if (areaEl) {
            areaEl.options[0].textContent = 'Todas las áreas';
            areaEl.onchange = filterDeviceTable;
        }

        document.getElementById('cam-filters-wrapper')?.remove();
        document.getElementById('nvr-filters-wrapper')?.remove();
        document.getElementById('antenna-filters-wrapper')?.remove();
        document.getElementById('switch-filters-wrapper')?.remove();
        document.getElementById('sfp-filters-wrapper')?.remove();
        document.getElementById('ap-filters-wrapper')?.remove();
        document.getElementById('ups-filters-wrapper')?.remove();
        document.getElementById('suppressor-filters-wrapper')?.remove();
        document.getElementById('pdu-filters-wrapper')?.remove();
        document.getElementById('patchpanel-filters-wrapper')?.remove();
        document.getElementById('bandeja-fibra-filters-wrapper')?.remove();
        document.getElementById('organizador-filters-wrapper')?.remove();
        document.getElementById('patchcord-filters-wrapper')?.remove();
        document.getElementById('patchcord-fibra-filters-wrapper')?.remove();
        document.getElementById('camera-pagination')?.remove();
        document.getElementById('nvr-pagination')?.remove();
        document.getElementById('antenna-pagination')?.remove();
        document.getElementById('switch-pagination')?.remove();
        document.getElementById('sfp-pagination')?.remove();
        document.getElementById('ap-pagination')?.remove();
        document.getElementById('ups-pagination')?.remove();
        document.getElementById('suppressor-pagination')?.remove();
        document.getElementById('pdu-pagination')?.remove();
        document.getElementById('patchpanel-pagination')?.remove();
        document.getElementById('bandeja-fibra-pagination')?.remove();
        document.getElementById('organizador-pagination')?.remove();
        document.getElementById('patchcord-pagination')?.remove();
        document.getElementById('patchcord-fibra-pagination')?.remove();
    }
}
