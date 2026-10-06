// ─────────────────────────────────────────────────────────────
// CÁMARAS — tabla, formulario y filtros especializados.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice, filterDeviceTable } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageCameras = 1;
const CAMERAS_PER_PAGE = 30;
let cameraFilters = {};

export function renderCamerasTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto'; // Permitir scroll por gran cantidad de columnas
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'cámaras');

    // 1. Cabeceras Dinámicas y Filtros Excel
    if (!thead.dataset.isCamera) {
        thead.dataset.isCamera = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'Resolución', 'Tipo', 'IP', 'MAC', 'Channel', 'NVR', 'Pto SW', 'Usuario 1', 'Pass 1', 'Usuario 2', 'Pass 2', 'Mant.'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        // Setup top-level filters for cameras
        setupCameraFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (cameraFilters.globalSearch || '').toLowerCase();

    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';

        // Global search
        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.ip} ${d.mac} ${d.nvr} ${d.channel} ${d.swPort}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        // Dropdown filters
        const dropdownFiltersOK = Object.entries(cameraFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            const deviceValue = key === 'regionName'
                ? regName
                : d[key];
            return (deviceValue || '') === filterValue;
        });

        return dropdownFiltersOK;
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / CAMERAS_PER_PAGE) || 1;
    if (currentPageCameras > totalPages) currentPageCameras = totalPages;

    const paginatedDevs = filteredDevs.slice((currentPageCameras - 1) * CAMERAS_PER_PAGE, currentPageCameras * CAMERAS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="21" style="text-align:center; padding:30px; color:var(--text-muted);">No hay cámaras que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxCameras = (currentPageCameras - 1) * CAMERAS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Up' ? 'badge-active' : d.status === 'Down' ? 'badge-danger' : 'badge-warning';
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.ip} ${d.mac} ${d.nvr} ${d.channel} ${d.swPort}`.toLowerCase();

            return `<tr data-search="${searchStr}" data-region="${regName}" data-area="${d.area || ''}" data-status="${d.status || ''}" data-category="Cámaras">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxCameras + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.resolution || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.cameraType || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.ip || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.mac || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.channel || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.nvr || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.swPort || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.user1 || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.pass1 || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.user2 || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.pass2 || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.maintenance || '—'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-cam" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-cam" data-id="${d.id}">${icons.trash}</button>
                </td>
            </tr>`;
        }).join('');
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    if (countDisplay) countDisplay.textContent = devs.length;
    if (showingDisplay) showingDisplay.textContent = paginatedDevs.length;
    if (totalDisplay) totalDisplay.textContent = filteredDevs.length;

    // Componente visual de Paginación
    let pagContainer = document.getElementById('camera-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'camera-pagination';
        pagContainer.style.display = 'flex';
        pagContainer.style.justifyContent = 'space-between';
        pagContainer.style.alignItems = 'center';
        pagContainer.style.padding = '15px 0 0 0';
        pagContainer.style.marginTop = '15px';
        pagContainer.style.borderTop = '1px solid var(--border)';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > CAMERAS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, CAMERAS_PER_PAGE, currentPageCameras, (newPage) => {
            currentPageCameras = newPage;
            renderCamerasTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-cam').forEach(btn =>
        btn.addEventListener('click', e => showCameraForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-cam').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );

    filterDeviceTable(); // Aplicar también filtro global si está activo
}

export function showCameraForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    showModal('Gestión de Cámara CCTV', `
        <div class="form-row">
            <div class="form-group"><label>Nombre de Cámara</label><input id="fc-name" value="${d ? d.name || '' : ''}" placeholder="Ej: CAM-GARITA-01"></div>
            <div class="form-group"><label>Estado</label><select id="fc-status">
                <option ${d && d.status === 'Up' ? 'selected' : ''}>Up</option>
                <option ${d && d.status === 'Down' ? 'selected' : ''}>Down</option>
                <option ${d && d.status === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fc-region"><option value="" disabled selected>Selecciona región...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fc-area"><option value="" disabled selected>Selecciona área...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fc-brand" value="${d ? d.brand || '' : ''}" placeholder="Ej: Hikvision, Dahua..."></div>
            <div class="form-group"><label>Modelo</label><input id="fc-model" value="${d ? d.model || '' : ''}" placeholder="Modelo"></div>
            <div class="form-group"><label>Serie</label><input id="fc-serial" value="${d ? d.serial || '' : ''}" placeholder="Número de serie"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Resolución</label><input id="fc-resolution" value="${d ? d.resolution || '' : ''}" placeholder="Ej: 2MP, 4MP, 4K..."></div>
            <div class="form-group"><label>Tipo de Cámara</label><input id="fc-type" value="${d ? d.cameraType || '' : ''}" placeholder="Ej: Bala, Domo, PTZ..."></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>IP</label><input id="fc-ip" value="${d ? d.ip || '' : ''}" placeholder="192.168.1.100"></div>
            <div class="form-group"><label>MAC</label><input id="fc-mac" value="${d ? d.mac || '' : ''}" placeholder="AA:BB:CC:DD:EE:FF"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>NVR Asignado</label><input id="fc-nvr" value="${d ? d.nvr || '' : ''}" placeholder="Nombre o IP de NVR"></div>
            <div class="form-group"><label>Channel (Canal)</label><input id="fc-channel" value="${d ? d.channel || '' : ''}" placeholder="Ej: CH 01"></div>
            <div class="form-group"><label>Puerto SW</label><input id="fc-swport" value="${d ? d.swPort || '' : ''}" placeholder="Ej: Gi1/0/5"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Usuario 1</label><input id="fc-user1" value="${d ? d.user1 || '' : ''}" placeholder="Usuario principal"></div>
            <div class="form-group"><label>Contraseña 1</label><input type="text" id="fc-pass1" value="${d ? d.pass1 || '' : ''}" placeholder="Contraseña 1"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Usuario 2</label><input id="fc-user2" value="${d ? d.user2 || '' : ''}" placeholder="Usuario secundario"></div>
            <div class="form-group"><label>Contraseña 2</label><input type="text" id="fc-pass2" value="${d ? d.pass2 || '' : ''}" placeholder="Contraseña 2"></div>
        </div>
        <div class="form-group">
            <label>Mantenimiento (Detalles / Fecha)</label>
            <textarea id="fc-maintenance" placeholder="Anota fechas de limpieza, revisiones, observaciones...">${d ? d.maintenance || '' : ''}</textarea>
        </div>
    `, () => {
        const name = document.getElementById('fc-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const obj = {
            name,
            device: 'Cámaras', // Obligatoriamente asignado a esta categoría
            status: document.getElementById('fc-status').value,
            regionId: document.getElementById('fc-region').value,
            area: document.getElementById('fc-area').value,
            brand: document.getElementById('fc-brand').value.trim(),
            model: document.getElementById('fc-model').value.trim(),
            serial: document.getElementById('fc-serial').value.trim(),
            resolution: document.getElementById('fc-resolution').value.trim(),
            cameraType: document.getElementById('fc-type').value.trim(),
            ip: document.getElementById('fc-ip').value.trim(),
            mac: document.getElementById('fc-mac').value.trim(),
            nvr: document.getElementById('fc-nvr').value.trim(),
            channel: document.getElementById('fc-channel').value.trim(),
            swPort: document.getElementById('fc-swport').value.trim(),
            user1: document.getElementById('fc-user1').value.trim(),
            pass1: document.getElementById('fc-pass1').value.trim(),
            user2: document.getElementById('fc-user2').value.trim(),
            pass2: document.getElementById('fc-pass2').value.trim(),
            maintenance: document.getElementById('fc-maintenance').value.trim()
        };

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderCamerasTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir cámara');
}

function setupCameraFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        cameraFilters[key] = value;
        currentPageCameras = 1;
        renderCamerasTable(getAllDevices());
    };

    // 1. Handle existing filters
    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.closest('.search-box').style.display = ''; // Make sure it's visible
        searchInput.placeholder = "Buscar en cámaras...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = cameraFilters.globalSearch || ''; // Restore value on re-render
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allCamerasCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'cámaras');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allCamerasCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allCamerasCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    // 2. Remove old custom camera filters to prevent duplication
    document.getElementById('cam-filters-wrapper')?.remove();

    // 3. Create and append new filters
    const wrapper = document.createElement('div');
    wrapper.id = 'cam-filters-wrapper';
    wrapper.style.display = 'contents'; // Use 'contents' to not break parent flex layout

    const allCameras = allDevs.filter(d => (d.device || '').toLowerCase() === 'cámaras');

    const createSelect = (key, placeholder, options, selected) => {
        // Clone the 'region' select element to ensure an identical visual style.
        // This copies all classes, attributes, and inline styles.
        // If it doesn't exist, create a standard select as a fallback.
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');

        // Assign a new unique ID and name.
        select.id = `cam-filter-${key}`;
        select.name = `cam-filter-${key}`;

        // Populate the new select with its specific options.
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');

        // Assign the correct event handler and set the current value.
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";

        return select;
    };

    const uniqueBrands = [...new Set(allCameras.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, cameraFilters.brand));

    const uniqueResolutions = [...new Set(allCameras.map(c => c.resolution).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('resolution', 'Resolución', uniqueResolutions, cameraFilters.resolution));

    const uniqueNvrs = [...new Set(allCameras.map(c => c.nvr).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('nvr', 'NVR', uniqueNvrs, cameraFilters.nvr));

    filterContainer.appendChild(wrapper);
}
