// ─────────────────────────────────────────────────────────────
// UPS — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice, getConnectableDeviceOptions } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageUps = 1;
const UPS_PER_PAGE = 20;
let upsFilters = {};

export function renderUpsTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'ups');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isUps) {
        thead.dataset.isUps = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'KVA', 'Fecha Cambio', 'Dispositivo Conectado', 'Cambio Bat. 1', 'Cambio Bat. 2'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupUpsFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (upsFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';
        const connectedDev = getAllDevices().find(dev => dev.id === d.connectedDeviceId);
        const connectedDevName = connectedDev ? connectedDev.name : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.kva} ${connectedDevName}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(upsFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            let deviceValue;
            if (key === 'regionName') deviceValue = regName;
            else if (key === 'connectedDeviceName') deviceValue = connectedDevName;
            else deviceValue = d[key];
            return String(deviceValue || '') === String(filterValue);
        });

        return dropdownFiltersOK;
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / UPS_PER_PAGE) || 1;
    if (currentPageUps > totalPages) currentPageUps = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPageUps - 1) * UPS_PER_PAGE, currentPageUps * UPS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:30px; color:var(--text-muted);">No hay UPS que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxUps = (currentPageUps - 1) * UPS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const connectedDev = getAllDevices().find(dev => dev.id === d.connectedDeviceId);
            const connectedDevName = connectedDev ? connectedDev.name : '—';
            const statusClass = d.status === 'Online' ? 'badge-active' : d.status === 'Batería' ? 'badge-warning' : 'badge-danger';

            return `<tr data-category="UPS">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxUps + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.kva || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.changeDate || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${connectedDevName}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.battery1?.changeDate || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.battery2?.changeDate || '—'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-ups" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-ups" data-id="${d.id}">${icons.trash}</button>
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
    let pagContainer = document.getElementById('ups-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'ups-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > UPS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, UPS_PER_PAGE, currentPageUps, (newPage) => {
            currentPageUps = newPage;
            renderUpsTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-ups').forEach(btn =>
        btn.addEventListener('click', e => showUpsForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-ups').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showUpsForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');
    const deviceOpts = getConnectableDeviceOptions(d ? d.connectedDeviceId : null);

    showModal('Gestión de UPS', `
        <div class="form-row"><div class="form-group"><label>Nombre / Etiqueta</label><input id="fups-name" value="${d?.name || ''}" placeholder="Ej: UPS-RACK-01"></div><div class="form-group"><label>Estado</label><select id="fups-status"><option ${d?.status === 'Online' ? 'selected' : ''}>Online</option><option ${d?.status === 'Batería' ? 'selected' : ''}>Batería</option><option ${d?.status === 'Falla' ? 'selected' : ''}>Falla</option><option ${d?.status === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>Región</label><select id="fups-region"><option value="" disabled selected>Selecciona...</option>${regOpts}</select></div><div class="form-group"><label>Área</label><select id="fups-area"><option value="" disabled selected>Selecciona...</option>${areaOpts}</select></div></div>
        <div class="form-row"><div class="form-group"><label>Marca</label><input id="fups-brand" value="${d?.brand || ''}" placeholder="Ej: APC, Tripp-Lite..."></div><div class="form-group"><label>Modelo</label><input id="fups-model" value="${d?.model || ''}"></div><div class="form-group"><label>Serie</label><input id="fups-serial" value="${d?.serial || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label>Capacidad (KVA)</label><input id="fups-kva" value="${d?.kva || ''}" placeholder="Ej: 1.5, 3..."></div><div class="form-group"><label>Fecha de Cambio (UPS)</label><input id="fups-change-date" type="date" value="${d?.changeDate || ''}"></div></div>
        <div class="form-group"><label>Dispositivo Protegido</label><select id="fups-device">${deviceOpts}</select></div>
        <fieldset style="border:1px solid var(--border); padding:15px; border-radius:8px; margin-top:20px;"><legend style="padding:0 10px; font-weight:600; font-size:14px;">Batería 1</legend><div class="form-row"><div class="form-group"><label>Marca</label><input id="fups-b1-brand" value="${d?.battery1?.brand || ''}"></div><div class="form-group"><label>Modelo</label><input id="fups-b1-model" value="${d?.battery1?.model || ''}"></div></div><div class="form-row"><div class="form-group"><label>Serie</label><input id="fups-b1-serial" value="${d?.battery1?.serial || ''}"></div><div class="form-group"><label>Fecha de Cambio</label><input id="fups-b1-change-date" type="date" value="${d?.battery1?.changeDate || ''}"></div></div></fieldset>
        <fieldset style="border:1px solid var(--border); padding:15px; border-radius:8px; margin-top:15px;"><legend style="padding:0 10px; font-weight:600; font-size:14px;">Batería 2</legend><div class="form-row"><div class="form-group"><label>Marca</label><input id="fups-b2-brand" value="${d?.battery2?.brand || ''}"></div><div class="form-group"><label>Modelo</label><input id="fups-b2-model" value="${d?.battery2?.model || ''}"></div></div><div class="form-row"><div class="form-group"><label>Serie</label><input id="fups-b2-serial" value="${d?.battery2?.serial || ''}"></div><div class="form-group"><label>Fecha de Cambio</label><input id="fups-b2-change-date" type="date" value="${d?.battery2?.changeDate || ''}"></div></div></fieldset>
    `, () => {
        const name = document.getElementById('fups-name').value.trim();
        if (!name) return alert('El nombre es requerido');
        const obj = {
            name, device: 'UPS', status: document.getElementById('fups-status').value,
            regionId: document.getElementById('fups-region').value, area: document.getElementById('fups-area').value,
            brand: document.getElementById('fups-brand').value.trim(), model: document.getElementById('fups-model').value.trim(),
            serial: document.getElementById('fups-serial').value.trim(), kva: document.getElementById('fups-kva').value.trim(),
            changeDate: document.getElementById('fups-change-date').value, connectedDeviceId: document.getElementById('fups-device').value,
            battery1: { brand: document.getElementById('fups-b1-brand').value.trim(), model: document.getElementById('fups-b1-model').value.trim(), serial: document.getElementById('fups-b1-serial').value.trim(), changeDate: document.getElementById('fups-b1-change-date').value },
            battery2: { brand: document.getElementById('fups-b2-brand').value.trim(), model: document.getElementById('fups-b2-model').value.trim(), serial: document.getElementById('fups-b2-serial').value.trim(), changeDate: document.getElementById('fups-b2-change-date').value }
        };
        if (d) Object.assign(d, obj); else store.devices.push({ id: genId(), ...obj });
        save(); closeModal(); renderUpsTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir UPS');
}

function setupUpsFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        upsFilters[key] = value;
        currentPageUps = 1;
        renderUpsTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en UPS...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = upsFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allUpsCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'ups');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allUpsCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allUpsCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('ups-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'ups-filters-wrapper';
    wrapper.style.display = 'contents';

    const allUps = allUpsCtx;

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `ups-filter-${key}`;
        select.name = `ups-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allUps.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, upsFilters.brand));

    const uniqueKvas = [...new Set(allUps.map(c => c.kva).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('kva', 'KVA', uniqueKvas, upsFilters.kva));

    filterContainer.appendChild(wrapper);
}
