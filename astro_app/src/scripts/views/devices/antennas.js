// ─────────────────────────────────────────────────────────────
// ANTENAS — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageAntennas = 1;
const ANTENAS_PER_PAGE = 20;
let antennaFilters = {};

export function renderAntennasTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'antenas');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isAntenna) {
        thead.dataset.isAntenna = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'IP', 'MAC', 'Pto SW', 'Usuario', 'Contraseña', 'Mantenimiento'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupAntennaFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (antennaFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.ip} ${d.mac} ${d.swPort}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(antennaFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            const deviceValue = key === 'regionName' ? regName : d[key];
            return String(deviceValue || '') === String(filterValue);
        });

        return dropdownFiltersOK;
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / ANTENAS_PER_PAGE) || 1;
    if (currentPageAntennas > totalPages) currentPageAntennas = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPageAntennas - 1) * ANTENAS_PER_PAGE, currentPageAntennas * ANTENAS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--text-muted);">No hay antenas que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxAntennas = (currentPageAntennas - 1) * ANTENAS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Up' ? 'badge-active' : d.status === 'Down' ? 'badge-danger' : 'badge-warning';
            return `<tr data-category="Antenas">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxAntennas + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.ip || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.mac || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.swPort || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.user || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.password || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.maintenance || '—'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-antenna" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-antenna" data-id="${d.id}">${icons.trash}</button>
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
    let pagContainer = document.getElementById('antenna-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'antenna-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > ANTENAS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, ANTENAS_PER_PAGE, currentPageAntennas, (newPage) => {
            currentPageAntennas = newPage;
            renderAntennasTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-antenna').forEach(btn =>
        btn.addEventListener('click', e => showAntennaForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-antenna').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showAntennaForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    showModal('Gestión de Antena', `
        <div class="form-row">
            <div class="form-group"><label>Nombre de la Antena</label><input id="fa-name" value="${d ? d.name || '' : ''}" placeholder="Ej: ANT-EDIF-01"></div>
            <div class="form-group"><label>Estado</label><select id="fa-status">
                <option ${d && d.status === 'Up' ? 'selected' : ''}>Up</option>
                <option ${d && d.status === 'Down' ? 'selected' : ''}>Down</option>
                <option ${d && d.status === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fa-region"><option value="" disabled selected>Selecciona región...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fa-area"><option value="" disabled selected>Selecciona área...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fa-brand" value="${d ? d.brand || '' : ''}" placeholder="Ej: Ubiquiti, Mikrotik..."></div>
            <div class="form-group"><label>Modelo</label><input id="fa-model" value="${d ? d.model || '' : ''}" placeholder="Modelo"></div>
            <div class="form-group"><label>Serie</label><input id="fa-serial" value="${d ? d.serial || '' : ''}" placeholder="Número de serie"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>IP</label><input id="fa-ip" value="${d ? d.ip || '' : ''}" placeholder="192.168.1.20"></div>
            <div class="form-group"><label>MAC</label><input id="fa-mac" value="${d ? d.mac || '' : ''}" placeholder="AA:BB:CC:DD:EE:FF"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Puerto SW</label><input id="fa-swport" value="${d ? d.swPort || '' : ''}" placeholder="Ej: Gi1/0/10"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Usuario</label><input id="fa-user" value="${d ? d.user || '' : ''}" placeholder="Usuario de acceso"></div>
            <div class="form-group"><label>Contraseña</label><input type="text" id="fa-password" value="${d ? d.password || '' : ''}" placeholder="Contraseña"></div>
        </div>
        <div class="form-group">
            <label>Mantenimiento (Detalles / Fecha)</label>
            <textarea id="fa-maintenance" placeholder="Anota fechas de alineación, revisiones, observaciones...">${d ? d.maintenance || '' : ''}</textarea>
        </div>
    `, () => {
        const name = document.getElementById('fa-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const obj = {
            name,
            device: 'Antenas',
            status: document.getElementById('fa-status').value,
            regionId: document.getElementById('fa-region').value,
            area: document.getElementById('fa-area').value,
            brand: document.getElementById('fa-brand').value.trim(),
            model: document.getElementById('fa-model').value.trim(),
            serial: document.getElementById('fa-serial').value.trim(),
            ip: document.getElementById('fa-ip').value.trim(),
            mac: document.getElementById('fa-mac').value.trim(),
            swPort: document.getElementById('fa-swport').value.trim(),
            user: document.getElementById('fa-user').value.trim(),
            password: document.getElementById('fa-password').value.trim(),
            maintenance: document.getElementById('fa-maintenance').value.trim()
        };

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderAntennasTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir Antena');
}

function setupAntennaFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        antennaFilters[key] = value;
        currentPageAntennas = 1;
        renderAntennasTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en Antenas...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = antennaFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allAntennasCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'antenas');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allAntennasCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allAntennasCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('antenna-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'antenna-filters-wrapper';
    wrapper.style.display = 'contents';

    const allAntennas = allAntennasCtx;

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `antenna-filter-${key}`;
        select.name = `antenna-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allAntennas.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, antennaFilters.brand));

    filterContainer.appendChild(wrapper);
}
