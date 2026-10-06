// ─────────────────────────────────────────────────────────────
// NVR — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageNvrs = 1;
const NVRS_PER_PAGE = 20;
let nvrFilters = {};

export function renderNvrsTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'nvr');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isNvr) {
        thead.dataset.isNvr = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'IP', 'MAC', 'Dominio', 'Canales', 'Discos/GB', 'Pto SW', 'Pto. Saliente', 'Mantenimiento'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupNvrFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (nvrFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.ip} ${d.mac} ${d.channels} ${d.swPort}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(nvrFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            const deviceValue = key === 'regionName' ? regName : d[key];
            return String(deviceValue || '') === String(filterValue);
        });

        return dropdownFiltersOK;
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / NVRS_PER_PAGE) || 1;
    if (currentPageNvrs > totalPages) currentPageNvrs = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPageNvrs - 1) * NVRS_PER_PAGE, currentPageNvrs * NVRS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="18" style="text-align:center; padding:30px; color:var(--text-muted);">No hay NVRs que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxNvrs = (currentPageNvrs - 1) * NVRS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Up' ? 'badge-active' : d.status === 'Down' ? 'badge-danger' : 'badge-warning';
            return `<tr data-category="NVR">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxNvrs + i + 1}</td>
                <td style="white-space:nowrap;"><a href="/nvr?id=${d.id}" class="link" style="color:var(--primary);text-decoration:none;font-weight:600;">${d.name}</a></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.ip || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.mac || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.domain || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.channels || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.disks || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.swPort || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.outPort || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.maintenance || '—'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-nvr" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-nvr" data-id="${d.id}">${icons.trash}</button>
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
    let pagContainer = document.getElementById('nvr-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'nvr-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > NVRS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, NVRS_PER_PAGE, currentPageNvrs, (newPage) => {
            currentPageNvrs = newPage;
            renderNvrsTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-nvr').forEach(btn =>
        btn.addEventListener('click', e => showNvrForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-nvr').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showNvrForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    showModal('Gestión de NVR', `
        <div class="form-row">
            <div class="form-group"><label>Nombre del NVR</label><input id="fn-name" value="${d ? d.name || '' : ''}" placeholder="Ej: NVR-PRINCIPAL-01"></div>
            <div class="form-group"><label>Estado</label><select id="fn-status">
                <option ${d && d.status === 'Up' ? 'selected' : ''}>Up</option>
                <option ${d && d.status === 'Down' ? 'selected' : ''}>Down</option>
                <option ${d && d.status === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fn-region"><option value="" disabled selected>Selecciona región...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fn-area"><option value="" disabled selected>Selecciona área...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fn-brand" value="${d ? d.brand || '' : ''}" placeholder="Ej: Hikvision, Dahua..."></div>
            <div class="form-group"><label>Modelo</label><input id="fn-model" value="${d ? d.model || '' : ''}" placeholder="Modelo"></div>
            <div class="form-group"><label>Serie</label><input id="fn-serial" value="${d ? d.serial || '' : ''}" placeholder="Número de serie"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>IP</label><input id="fn-ip" value="${d ? d.ip || '' : ''}" placeholder="192.168.1.10"></div>
            <div class="form-group"><label>MAC</label><input id="fn-mac" value="${d ? d.mac || '' : ''}" placeholder="AA:BB:CC:DD:EE:FF"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Canales</label><input id="fn-channels" type="number" value="${d ? d.channels || '' : ''}" placeholder="Ej: 16"></div>
            <div class="form-group"><label>Discos / GB</label><input id="fn-disks" value="${d ? d.disks || '' : ''}" placeholder="Ej: 2x4TB"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Dominio</label><input id="fn-domain" value="${d ? d.domain || '' : ''}" placeholder="Ej: nvr.empresa.com"></div>
            <div class="form-group"><label>Puerto Saliente</label><input id="fn-outport" value="${d ? d.outPort || '' : ''}" placeholder="Ej: 8000, 554"></div>
            <div class="form-group"><label>Puerto SW</label><input id="fn-swport" value="${d ? d.swPort || '' : ''}" placeholder="Ej: Gi1/0/24"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Usuario</label><input id="fn-user" value="${d ? d.user || '' : ''}" placeholder="Ej: admin"></div>
            <div class="form-group"><label>Contraseña</label><input id="fn-password" value="${d ? d.password || '' : ''}" placeholder="Contraseña del NVR"></div>
        </div>
        <div class="form-group">
            <label>Mantenimiento (Detalles / Fecha)</label>
            <textarea id="fn-maintenance" placeholder="Anota fechas de limpieza, revisiones, observaciones...">${d ? d.maintenance || '' : ''}</textarea>
        </div>
    `, () => {
        const name = document.getElementById('fn-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const obj = {
            name,
            device: 'NVR',
            status: document.getElementById('fn-status').value,
            regionId: document.getElementById('fn-region').value,
            area: document.getElementById('fn-area').value,
            brand: document.getElementById('fn-brand').value.trim(),
            model: document.getElementById('fn-model').value.trim(),
            serial: document.getElementById('fn-serial').value.trim(),
            ip: document.getElementById('fn-ip').value.trim(),
            mac: document.getElementById('fn-mac').value.trim(),
            domain: document.getElementById('fn-domain').value.trim(),
            channels: document.getElementById('fn-channels').value,
            disks: document.getElementById('fn-disks').value.trim(),
            swPort: document.getElementById('fn-swport').value.trim(),
            outPort: document.getElementById('fn-outport').value.trim(),
            user: document.getElementById('fn-user').value.trim(),
            password: document.getElementById('fn-password').value.trim(),
            maintenance: document.getElementById('fn-maintenance').value.trim()
        };

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderNvrsTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir NVR');
}

function setupNvrFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        nvrFilters[key] = value;
        currentPageNvrs = 1;
        renderNvrsTable(getAllDevices());
    };

    // Re-use existing filters
    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en NVRs...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = nvrFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allNvrsCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'nvr');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allNvrsCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allNvrsCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    // Create new filters
    document.getElementById('nvr-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'nvr-filters-wrapper';
    wrapper.style.display = 'contents';

    const allNvrs = allNvrsCtx;

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `nvr-filter-${key}`;
        select.name = `nvr-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allNvrs.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, nvrFilters.brand));

    const uniqueChannels = [...new Set(allNvrs.map(c => c.channels).filter(Boolean).sort((a, b) => a - b))];
    wrapper.appendChild(createSelect('channels', 'Canales', uniqueChannels, nvrFilters.channels));

    filterContainer.appendChild(wrapper);
}
