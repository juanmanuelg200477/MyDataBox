// ─────────────────────────────────────────────────────────────
// SFP — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageSfps = 1;
const SFPS_PER_PAGE = 20;
let sfpFilters = {};

export function renderSfpsTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'sfp');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isSfp) {
        thead.dataset.isSfp = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'Velocidad', 'Puerto', 'De', 'Hacia'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupSfpFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (sfpFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';
        const switchName = d.connectedSwitchId ? (store.devices.find(sw => sw.id === d.connectedSwitchId) || {}).name || '' : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.speed} ${switchName} ${d.port} ${d.towards}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(sfpFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            let deviceValue;
            if (key === 'regionName') deviceValue = regName;
            else if (key === 'connectedSwitchName') deviceValue = switchName;
            else deviceValue = d[key];
            return String(deviceValue || '') === String(filterValue);
        });

        return dropdownFiltersOK;
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / SFPS_PER_PAGE) || 1;
    if (currentPageSfps > totalPages) currentPageSfps = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPageSfps - 1) * SFPS_PER_PAGE, currentPageSfps * SFPS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:30px; color:var(--text-muted);">No hay módulos SFP que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxSfps = (currentPageSfps - 1) * SFPS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const fromSwitchName = d.connectedSwitchId ? (store.devices.find(sw => sw.id === d.connectedSwitchId) || {}).name || '—' : '—';
            const toSwitchName = d.towardsSwitchId ? (store.devices.find(sw => sw.id === d.towardsSwitchId) || {}).name || (d.towards || '—') : (d.towards || '—');
            const statusClass = d.status === 'Up' ? 'badge-active' : d.status === 'Down' ? 'badge-danger' : 'badge-warning';

            return `<tr data-category="SFP">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxSfps + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.speed || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.port || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${fromSwitchName}</td>
                <td style="white-space:nowrap; font-size:12px;">${toSwitchName}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-sfp" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-sfp" data-id="${d.id}">${icons.trash}</button>
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
    let pagContainer = document.getElementById('sfp-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'sfp-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > SFPS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, SFPS_PER_PAGE, currentPageSfps, (newPage) => {
            currentPageSfps = newPage;
            renderSfpsTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-sfp').forEach(btn =>
        btn.addEventListener('click', e => showSfpForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-sfp').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showSfpForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    // Todos los switches del store
    const allSwitches = store.devices.filter(dev => (dev.device || '').toLowerCase() === 'switch');
    const currentArea = d?.area || '';

    // Switches del área actual (para "De")
    const switchesInArea = currentArea ? allSwitches.filter(sw => sw.area === currentArea) : allSwitches;

    // Helper: genera options excluyendo un ID y pre-seleccionando otro
    const buildOpts = (switches, excludeId, selectedId) =>
        switches
            .filter(sw => sw.id !== excludeId)
            .map(sw => `<option value="${sw.id}" ${sw.id === selectedId ? 'selected' : ''}>${sw.name}${sw.area ? ' — ' + sw.area : ''}</option>`)
            .join('');

    showModal('Gestión de Módulo SFP', `
        <div class="form-row">
            <div class="form-group"><label>Nombre / Etiqueta</label><input id="fsfp-name" value="${d ? d.name || '' : ''}" placeholder="Ej: SFP-SW-CORE-01-P25"></div>
            <div class="form-group"><label>Estado</label><select id="fsfp-status">
                <option ${d && d.status === 'Up' ? 'selected' : ''}>Up</option>
                <option ${d && d.status === 'Down' ? 'selected' : ''}>Down</option>
                <option ${d && d.status === 'Stock' ? 'selected' : ''}>Stock</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fsfp-region"><option value="" disabled selected>Selecciona región...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fsfp-area"><option value="" disabled selected>Selecciona área...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fsfp-brand" value="${d ? d.brand || '' : ''}" placeholder="Ej: Finisar, Ubiquiti..."></div>
            <div class="form-group"><label>Modelo</label><input id="fsfp-model" value="${d ? d.model || '' : ''}" placeholder="Modelo"></div>
            <div class="form-group"><label>Serie</label><input id="fsfp-serial" value="${d ? d.serial || '' : ''}" placeholder="Número de serie"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Velocidad</label><input id="fsfp-speed" value="${d ? d.speed || '' : ''}" placeholder="Ej: 1G, 10G, 25G..."></div>
            <div class="form-group"><label>Puerto</label><input id="fsfp-port" value="${d ? d.port || '' : ''}" placeholder="Ej: SFP 1, Gi1/0/25"></div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>De <span style="font-size:11px;color:var(--text-muted);font-weight:400;">(switches del área seleccionada)</span></label>
                <select id="fsfp-from-switch">
                    <option value="">— Seleccionar switch —</option>
                    ${buildOpts(switchesInArea, d?.towardsSwitchId, d?.connectedSwitchId)}
                </select>
            </div>
            <div class="form-group">
                <label>Hacia <span style="font-size:11px;color:var(--text-muted);font-weight:400;">(todos los switches)</span></label>
                <select id="fsfp-to-switch">
                    <option value="">— Seleccionar switch —</option>
                    ${buildOpts(allSwitches, d?.connectedSwitchId, d?.towardsSwitchId)}
                </select>
            </div>
        </div>
    `, () => {
        const name = document.getElementById('fsfp-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const obj = {
            name,
            device: 'SFP',
            status: document.getElementById('fsfp-status').value,
            regionId: document.getElementById('fsfp-region').value,
            area: document.getElementById('fsfp-area').value,
            brand: document.getElementById('fsfp-brand').value.trim(),
            model: document.getElementById('fsfp-model').value.trim(),
            serial: document.getElementById('fsfp-serial').value.trim(),
            speed: document.getElementById('fsfp-speed').value.trim(),
            port: document.getElementById('fsfp-port').value.trim(),
            connectedSwitchId: document.getElementById('fsfp-from-switch').value,
            towardsSwitchId: document.getElementById('fsfp-to-switch').value,
        };

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderSfpsTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir SFP');

    // ── Reactive: "De" se filtra por área; "Hacia" muestra todos ──
    const areaEl = document.getElementById('fsfp-area');
    const fromEl = document.getElementById('fsfp-from-switch');
    const toEl   = document.getElementById('fsfp-to-switch');

    // Cuando cambia el área → actualiza "De" con switches de esa área
    areaEl.addEventListener('change', () => {
        const area = areaEl.value;
        const dePool = area ? allSwitches.filter(sw => sw.area === area) : allSwitches;
        const fromVal = fromEl.value;
        const toVal   = toEl.value;
        fromEl.innerHTML = '<option value="">— Seleccionar switch —</option>' +
            buildOpts(dePool, toVal, fromVal);
        // "Hacia" no cambia con el área, solo excluye el "De" seleccionado
        toEl.innerHTML = '<option value="">— Seleccionar switch —</option>' +
            buildOpts(allSwitches, fromVal, toVal);
    });

    // Cuando cambia "De" → actualiza "Hacia" excluyendo ese switch
    fromEl.addEventListener('change', () => {
        const fromVal = fromEl.value;
        const toVal   = toEl.value;
        toEl.innerHTML = '<option value="">— Seleccionar switch —</option>' +
            buildOpts(allSwitches, fromVal, toVal);
    });

    // Cuando cambia "Hacia" → actualiza "De" excluyendo ese switch (dentro del área)
    toEl.addEventListener('change', () => {
        const area = areaEl.value;
        const dePool = area ? allSwitches.filter(sw => sw.area === area) : allSwitches;
        const fromVal = fromEl.value;
        const toVal   = toEl.value;
        fromEl.innerHTML = '<option value="">— Seleccionar switch —</option>' +
            buildOpts(dePool, toVal, fromVal);
    });
}

function setupSfpFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        sfpFilters[key] = value;
        currentPageSfps = 1;
        renderSfpsTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en SFPs...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = sfpFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allSfpsCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'sfp');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allSfpsCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allSfpsCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('sfp-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'sfp-filters-wrapper';
    wrapper.style.display = 'contents';

    const allSfps = allDevs.filter(d => (d.device || '').toLowerCase() === 'sfp');

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `sfp-filter-${key}`;
        select.name = `sfp-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allSfps.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, sfpFilters.brand));

    const uniqueSpeeds = [...new Set(allSfps.map(c => c.speed).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('speed', 'Velocidad', uniqueSpeeds, sfpFilters.speed));

    const connectedSwitches = allSfps.map(sfp => {
        if (!sfp.connectedSwitchId) return null;
        const sw = store.devices.find(d => d.id === sfp.connectedSwitchId);
        return sw ? sw.name : null;
    }).filter(Boolean);
    const uniqueSwitches = [...new Set(connectedSwitches)].sort();
    wrapper.appendChild(createSelect('connectedSwitchName', 'Dispositivo', uniqueSwitches, sfpFilters.connectedSwitchName));

    filterContainer.appendChild(wrapper);
}
