// ─────────────────────────────────────────────────────────────
// SUPRESORES — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageSuppressors = 1;
const SUPPRESSORS_PER_PAGE = 20;
let suppressorFilters = {};

export function renderSuppressorsTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'supresores');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isSuppressor) {
        thead.dataset.isSuppressor = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'Rack/Nodo', 'Cantidad', 'Entrada', 'Salida', 'Switch Conectado'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupSuppressorFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (suppressorFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';
        const switchName = d.connectedSwitchId ? (store.devices.find(sw => sw.id === d.connectedSwitchId) || {}).name || '' : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.rackNode} ${switchName}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(suppressorFilters).every(([key, filterValue]) => {
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
    const totalPages = Math.ceil(filteredDevs.length / SUPPRESSORS_PER_PAGE) || 1;
    if (currentPageSuppressors > totalPages) currentPageSuppressors = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPageSuppressors - 1) * SUPPRESSORS_PER_PAGE, currentPageSuppressors * SUPPRESSORS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:30px; color:var(--text-muted);">No hay supresores que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxSuppressors = (currentPageSuppressors - 1) * SUPPRESSORS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const switchName = d.connectedSwitchId ? (store.devices.find(sw => sw.id === d.connectedSwitchId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Activo' ? 'badge-active' : d.status === 'Stock' ? 'badge-info' : 'badge-warning';

            return `<tr data-category="Supresores">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxSuppressors + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.rackNode || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.quantity || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.input || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.output || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${switchName}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-suppressor" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-suppressor" data-id="${d.id}">${icons.trash}</button>
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
    let pagContainer = document.getElementById('suppressor-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'suppressor-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > SUPPRESSORS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, SUPPRESSORS_PER_PAGE, currentPageSuppressors, (newPage) => {
            currentPageSuppressors = newPage;
            renderSuppressorsTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-suppressor').forEach(btn =>
        btn.addEventListener('click', e => showSuppressorForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-suppressor').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showSuppressorForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');
    const switchOpts = store.devices.filter(dev => dev.device === 'Switch').map(sw => `<option value="${sw.id}" ${d && d.connectedSwitchId === sw.id ? 'selected' : ''}>${sw.name}</option>`).join('');

    showModal('Gestión de Supresor', `
        <div class="form-row">
            <div class="form-group"><label>Nombre / Etiqueta</label><input id="fsp-name" value="${d?.name || ''}" placeholder="Ej: SUP-RACK-01"></div>
            <div class="form-group"><label>Estado</label><select id="fsp-status">
                <option ${d?.status === 'Activo' ? 'selected' : ''}>Activo</option>
                <option ${d?.status === 'Stock' ? 'selected' : ''}>Stock</option>
                <option ${d?.status === 'Falla' ? 'selected' : ''}>Falla</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fsp-region"><option value="" disabled selected>Selecciona...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fsp-area"><option value="" disabled selected>Selecciona...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fsp-brand" value="${d?.brand || ''}" placeholder="Ej: Tripp-Lite, Forza..."></div>
            <div class="form-group"><label>Modelo</label><input id="fsp-model" value="${d?.model || ''}"></div>
            <div class="form-group"><label>Serie</label><input id="fsp-serial" value="${d?.serial || ''}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Rack o Nodo</label><input id="fsp-racknode" value="${d?.rackNode || ''}" placeholder="Ej: RACK-01, NODO-A"></div>
            <div class="form-group"><label>Cantidad</label><input id="fsp-quantity" type="number" value="${d?.quantity || '1'}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Entrada</label><input id="fsp-input" value="${d?.input || ''}" placeholder="Ej: NEMA 5-15P"></div>
            <div class="form-group"><label>Salida</label><input id="fsp-output" value="${d?.output || ''}" placeholder="Ej: 8 x NEMA 5-15R"></div>
        </div>
        <div class="form-group">
            <label>Switch Conectado</label>
            <select id="fsp-switch"><option value="">-- Ninguno --</option>${switchOpts}</select>
        </div>
    `, () => {
        const name = document.getElementById('fsp-name').value.trim();
        if (!name) return alert('El nombre es requerido');
        const obj = {
            name,
            device: 'Supresores',
            status: document.getElementById('fsp-status').value,
            regionId: document.getElementById('fsp-region').value,
            area: document.getElementById('fsp-area').value,
            brand: document.getElementById('fsp-brand').value.trim(),
            model: document.getElementById('fsp-model').value.trim(),
            serial: document.getElementById('fsp-serial').value.trim(),
            rackNode: document.getElementById('fsp-racknode').value.trim(),
            quantity: document.getElementById('fsp-quantity').value,
            input: document.getElementById('fsp-input').value.trim(),
            output: document.getElementById('fsp-output').value.trim(),
            connectedSwitchId: document.getElementById('fsp-switch').value,
        };
        if (d) Object.assign(d, obj); else store.devices.push({ id: genId(), ...obj });
        save(); closeModal(); renderSuppressorsTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir Supresor');
}

function setupSuppressorFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        suppressorFilters[key] = value;
        currentPageSuppressors = 1;
        renderSuppressorsTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en supresores...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = suppressorFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allSuppressorsCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'supresores');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allSuppressorsCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allSuppressorsCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('suppressor-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'suppressor-filters-wrapper';
    wrapper.style.display = 'contents';

    const allSuppressors = allSuppressorsCtx;

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `suppressor-filter-${key}`;
        select.name = `suppressor-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allSuppressors.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, suppressorFilters.brand));

    const uniqueRackNodes = [...new Set(allSuppressors.map(c => c.rackNode).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('rackNode', 'Rack/Nodo', uniqueRackNodes, suppressorFilters.rackNode));

    filterContainer.appendChild(wrapper);
}
