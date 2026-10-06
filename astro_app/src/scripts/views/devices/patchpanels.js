// ─────────────────────────────────────────────────────────────
// PATCH PANELS — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPagePatchPanels = 1;
const PATCH_PANELS_PER_PAGE = 20;
let patchPanelFilters = {};

export function renderPatchPanelsTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'patch panels');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isPatchPanel) {
        thead.dataset.isPatchPanel = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Categoría UTP', 'Puertos', 'Rack/Nodo', 'Switch Conectado'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupPatchPanelFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (patchPanelFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';
        const switchName = d.connectedSwitchId ? (store.devices.find(sw => sw.id === d.connectedSwitchId) || {}).name || '' : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.categoryUTP} ${d.ports} ${d.rackNode} ${switchName}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(patchPanelFilters).every(([key, filterValue]) => {
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
    const totalPages = Math.ceil(filteredDevs.length / PATCH_PANELS_PER_PAGE) || 1;
    if (currentPagePatchPanels > totalPages) currentPagePatchPanels = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPagePatchPanels - 1) * PATCH_PANELS_PER_PAGE, currentPagePatchPanels * PATCH_PANELS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--text-muted);">No hay patch panels que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxPatchPanels = (currentPagePatchPanels - 1) * PATCH_PANELS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const switchName = d.connectedSwitchId ? (store.devices.find(sw => sw.id === d.connectedSwitchId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Activo' ? 'badge-active' : d.status === 'Stock' ? 'badge-info' : 'badge-warning';

            return `<tr data-category="Patch Panels">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxPatchPanels + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.categoryUTP || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.ports || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.rackNode || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${switchName}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-patchpanel" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-patchpanel" data-id="${d.id}">${icons.trash}</button>
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
    let pagContainer = document.getElementById('patchpanel-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'patchpanel-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > PATCH_PANELS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, PATCH_PANELS_PER_PAGE, currentPagePatchPanels, (newPage) => {
            currentPagePatchPanels = newPage;
            renderPatchPanelsTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-patchpanel').forEach(btn =>
        btn.addEventListener('click', e => showPatchPanelForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-patchpanel').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showPatchPanelForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');
    const switchOpts = store.devices.filter(dev => dev.device === 'Switch').map(sw => `<option value="${sw.id}" ${d && d.connectedSwitchId === sw.id ? 'selected' : ''}>${sw.name}</option>`).join('');

    showModal('Gestión de Patch Panel', `
        <div class="form-row">
            <div class="form-group"><label>Nombre / Etiqueta</label><input id="fpp-name" value="${d?.name || ''}" placeholder="Ej: PP-RACK-01"></div>
            <div class="form-group"><label>Estado</label><select id="fpp-status">
                <option ${d?.status === 'Activo' ? 'selected' : ''}>Activo</option>
                <option ${d?.status === 'Stock' ? 'selected' : ''}>Stock</option>
                <option ${d?.status === 'Falla' ? 'selected' : ''}>Falla</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fpp-region"><option value="" disabled selected>Selecciona...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fpp-area"><option value="" disabled selected>Selecciona...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fpp-brand" value="${d?.brand || ''}" placeholder="Ej: Panduit, Siemon..."></div>
            <div class="form-group"><label>Categoría UTP</label><select id="fpp-categoryUTP">
                <option value="Cat 5e" ${d?.categoryUTP === 'Cat 5e' ? 'selected' : ''}>Cat 5e</option>
                <option value="Cat 6" ${d?.categoryUTP === 'Cat 6' ? 'selected' : ''}>Cat 6</option>
                <option value="Cat 6A" ${d?.categoryUTP === 'Cat 6A' ? 'selected' : ''}>Cat 6A</option>
            </select></div>
            <div class="form-group"><label>Puertos</label><input id="fpp-ports" type="number" value="${d?.ports || '24'}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Rack o Nodo</label><input id="fpp-racknode" value="${d?.rackNode || ''}" placeholder="Ej: RACK-01, NODO-A"></div>
            <div class="form-group">
                <label>Switch Conectado</label>
                <select id="fpp-switch"><option value="">-- Ninguno --</option>${switchOpts}</select>
            </div>
        </div>
    `, () => {
        const name = document.getElementById('fpp-name').value.trim();
        if (!name) return alert('El nombre es requerido');
        const obj = {
            name,
            device: 'Patch Panels',
            status: document.getElementById('fpp-status').value,
            regionId: document.getElementById('fpp-region').value,
            area: document.getElementById('fpp-area').value,
            brand: document.getElementById('fpp-brand').value.trim(),
            categoryUTP: document.getElementById('fpp-categoryUTP').value,
            ports: document.getElementById('fpp-ports').value,
            rackNode: document.getElementById('fpp-racknode').value.trim(),
            connectedSwitchId: document.getElementById('fpp-switch').value,
        };
        if (d) Object.assign(d, obj); else store.devices.push({ id: genId(), ...obj });
        save(); closeModal(); renderPatchPanelsTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir Patch Panel');
}

function setupPatchPanelFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        patchPanelFilters[key] = value;
        currentPagePatchPanels = 1;
        renderPatchPanelsTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en patch panels...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = patchPanelFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allPatchPanelsCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'patch panels');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allPatchPanelsCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allPatchPanelsCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('patchpanel-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'patchpanel-filters-wrapper';
    wrapper.style.display = 'contents';

    const allPatchPanels = allPatchPanelsCtx;

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `patchpanel-filter-${key}`;
        select.name = `patchpanel-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allPatchPanels.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, patchPanelFilters.brand));

    const uniqueCategories = [...new Set(allPatchPanels.map(c => c.categoryUTP).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('categoryUTP', 'Categoría', uniqueCategories, patchPanelFilters.categoryUTP));

    filterContainer.appendChild(wrapper);
}
