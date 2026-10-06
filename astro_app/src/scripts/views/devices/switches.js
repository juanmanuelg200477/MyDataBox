// ─────────────────────────────────────────────────────────────
// SWITCHES — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageSwitches = 1;
const SWITCHES_PER_PAGE = 20;
let switchFilters = {};

export function renderSwitchesTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'switch');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isSwitch) {
        thead.dataset.isSwitch = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'IP', 'MAC', 'Ptos Eth', 'Ptos Fibra', 'Fuentes', 'Mantenimiento'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupSwitchFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (switchFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.ip} ${d.mac} ${d.ports} ${d.fiberPorts}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(switchFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            const deviceValue = key === 'regionName' ? regName : d[key];
            return String(deviceValue || '') === String(filterValue);
        });

        return dropdownFiltersOK;
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / SWITCHES_PER_PAGE) || 1;
    if (currentPageSwitches > totalPages) currentPageSwitches = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPageSwitches - 1) * SWITCHES_PER_PAGE, currentPageSwitches * SWITCHES_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--text-muted);">No hay switches que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxSwitches = (currentPageSwitches - 1) * SWITCHES_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Up' ? 'badge-active' : d.status === 'Down' ? 'badge-danger' : 'badge-warning';
            const nameTag = `<a href="/device?id=${d.id}" class="link" style="color:var(--primary);text-decoration:none;font-weight:bold;">${d.name}</a>`;

            return `<tr data-category="Switch">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxSwitches + i + 1}</td>
                <td style="white-space:nowrap;">${nameTag}</td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.ip || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.mac || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.ports || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.fiberPorts || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.powerSources || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.maintenance || '—'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-switch" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-switch" data-id="${d.id}">${icons.trash}</button>
                </td>
            </tr>`;
        }).join('');
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    if (countDisplay) countDisplay.textContent = devs.length;
    if (showingDisplay) showingDisplay.textContent = paginatedDevs.length;
    if (totalDisplay) totalDisplay.textContent = filteredDevs.length;

    // Paginación
    let pagContainer = document.getElementById('switch-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'switch-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > SWITCHES_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, SWITCHES_PER_PAGE, currentPageSwitches, (newPage) => {
            currentPageSwitches = newPage;
            renderSwitchesTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-switch').forEach(btn =>
        btn.addEventListener('click', e => showSwitchForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-switch').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showSwitchForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    showModal('Gestión de Switch', `
        <div class="form-row">
            <div class="form-group"><label>Nombre del Switch</label><input id="fsw-name" value="${d ? d.name || '' : ''}" placeholder="Ej: SW-CORE-01"></div>
            <div class="form-group"><label>Estado</label><select id="fsw-status">
                <option ${d && d.status === 'Up' ? 'selected' : ''}>Up</option>
                <option ${d && d.status === 'Down' ? 'selected' : ''}>Down</option>
                <option ${d && d.status === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fsw-region"><option value="" disabled selected>Selecciona región...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fsw-area"><option value="" disabled selected>Selecciona área...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fsw-brand" value="${d ? d.brand || '' : ''}" placeholder="Ej: Cisco, Ubiquiti..."></div>
            <div class="form-group"><label>Modelo</label><input id="fsw-model" value="${d ? d.model || '' : ''}" placeholder="Modelo"></div>
            <div class="form-group"><label>Serie</label><input id="fsw-serial" value="${d ? d.serial || '' : ''}" placeholder="Número de serie"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>IP</label><input id="fsw-ip" value="${d ? d.ip || '' : ''}" placeholder="192.168.1.1"></div>
            <div class="form-group"><label>MAC</label><input id="fsw-mac" value="${d ? d.mac || '' : ''}" placeholder="AA:BB:CC:DD:EE:FF"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Puertos Ethernet</label><input id="fsw-ports" type="number" value="${d ? d.ports || '' : ''}" placeholder="Ej: 24"></div>
            <div class="form-group"><label>Puertos Fibra (SFP)</label><input id="fsw-fiberPorts" type="number" value="${d ? d.fiberPorts || '' : ''}" placeholder="Ej: 4"></div>
            <div class="form-group"><label>Fuentes de Poder</label><input id="fsw-power" type="number" value="${d ? d.powerSources || '' : ''}" placeholder="Ej: 2"></div>
        </div>
        <div class="form-group">
            <label>Mantenimiento (Detalles / Fecha)</label>
            <textarea id="fsw-maintenance" placeholder="Anota fechas de reinicio, actualizaciones, observaciones...">${d ? d.maintenance || '' : ''}</textarea>
        </div>
    `, () => {
        const name = document.getElementById('fsw-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const obj = {
            name,
            device: 'Switch',
            status: document.getElementById('fsw-status').value,
            regionId: document.getElementById('fsw-region').value,
            area: document.getElementById('fsw-area').value,
            brand: document.getElementById('fsw-brand').value.trim(),
            model: document.getElementById('fsw-model').value.trim(),
            serial: document.getElementById('fsw-serial').value.trim(),
            ip: document.getElementById('fsw-ip').value.trim(),
            mac: document.getElementById('fsw-mac').value.trim(),
            ports: document.getElementById('fsw-ports').value,
            fiberPorts: document.getElementById('fsw-fiberPorts').value,
            powerSources: document.getElementById('fsw-power').value,
            maintenance: document.getElementById('fsw-maintenance').value.trim()
        };

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderSwitchesTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir Switch');
}

function setupSwitchFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        switchFilters[key] = value;
        currentPageSwitches = 1;
        renderSwitchesTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en Switches...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = switchFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allSwitchesCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'switch');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allSwitchesCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allSwitchesCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('switch-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'switch-filters-wrapper';
    wrapper.style.display = 'contents';

    const allSwitches = allDevs.filter(d => (d.device || '').toLowerCase() === 'switch');

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `switch-filter-${key}`;
        select.name = `switch-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allSwitches.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, switchFilters.brand));

    const uniquePorts = [...new Set(allSwitches.map(c => c.ports).filter(Boolean).sort((a, b) => a - b))];
    wrapper.appendChild(createSelect('ports', 'Ptos Eth', uniquePorts, switchFilters.ports));

    const uniqueFiberPorts = [...new Set(allSwitches.map(c => c.fiberPorts).filter(Boolean).sort((a, b) => a - b))];
    wrapper.appendChild(createSelect('fiberPorts', 'Ptos Fibra', uniqueFiberPorts, switchFilters.fiberPorts));

    filterContainer.appendChild(wrapper);
}
