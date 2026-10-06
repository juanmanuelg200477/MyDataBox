// ─────────────────────────────────────────────────────────────
// PDU — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPagePdus = 1;
const PDUS_PER_PAGE = 20;
let pduFilters = {};

export function renderPdusTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'pdu');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isPdu) {
        thead.dataset.isPdu = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'Cantidad'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupPduFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (pduFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(pduFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            const deviceValue = key === 'regionName' ? regName : d[key];
            return String(deviceValue || '') === String(filterValue);
        });

        return dropdownFiltersOK;
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / PDUS_PER_PAGE) || 1;
    if (currentPagePdus > totalPages) currentPagePdus = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPagePdus - 1) * PDUS_PER_PAGE, currentPagePdus * PDUS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);">No hay PDUs que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxPdus = (currentPagePdus - 1) * PDUS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Activo' ? 'badge-active' : d.status === 'Stock' ? 'badge-info' : 'badge-warning';

            return `<tr data-category="PDU">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxPdus + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.quantity || '—'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-pdu" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-pdu" data-id="${d.id}">${icons.trash}</button>
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
    let pagContainer = document.getElementById('pdu-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'pdu-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > PDUS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, PDUS_PER_PAGE, currentPagePdus, (newPage) => {
            currentPagePdus = newPage;
            renderPdusTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-pdu').forEach(btn =>
        btn.addEventListener('click', e => showPduForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-pdu').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showPduForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    showModal('Gestión de PDU', `
        <div class="form-row">
            <div class="form-group"><label>Nombre / Etiqueta</label><input id="fpdu-name" value="${d?.name || ''}" placeholder="Ej: PDU-RACK-01"></div>
            <div class="form-group"><label>Estado</label><select id="fpdu-status">
                <option ${d?.status === 'Activo' ? 'selected' : ''}>Activo</option>
                <option ${d?.status === 'Stock' ? 'selected' : ''}>Stock</option>
                <option ${d?.status === 'Falla' ? 'selected' : ''}>Falla</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fpdu-region"><option value="" disabled selected>Selecciona...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fpdu-area"><option value="" disabled selected>Selecciona...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fpdu-brand" value="${d?.brand || ''}" placeholder="Ej: APC, Tripp-Lite..."></div>
            <div class="form-group"><label>Modelo</label><input id="fpdu-model" value="${d?.model || ''}"></div>
            <div class="form-group"><label>Serie</label><input id="fpdu-serial" value="${d?.serial || ''}"></div>
        </div>
        <div class="form-group"><label>Cantidad</label><input id="fpdu-quantity" type="number" value="${d?.quantity || '1'}"></div>
    `, () => {
        const name = document.getElementById('fpdu-name').value.trim();
        if (!name) return alert('El nombre es requerido');
        const obj = {
            name, device: 'PDU', status: document.getElementById('fpdu-status').value,
            regionId: document.getElementById('fpdu-region').value, area: document.getElementById('fpdu-area').value,
            brand: document.getElementById('fpdu-brand').value.trim(), model: document.getElementById('fpdu-model').value.trim(),
            serial: document.getElementById('fpdu-serial').value.trim(), quantity: document.getElementById('fpdu-quantity').value,
        };
        if (d) Object.assign(d, obj); else store.devices.push({ id: genId(), ...obj });
        save(); closeModal(); renderPdusTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir PDU');
}

function setupPduFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        pduFilters[key] = value;
        currentPagePdus = 1;
        renderPdusTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en PDUs...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = pduFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allPdusCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'pdu');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allPdusCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allPdusCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('pdu-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'pdu-filters-wrapper';
    wrapper.style.display = 'contents';

    const allPdus = allPdusCtx;

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `pdu-filter-${key}`;
        select.name = `pdu-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allPdus.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, pduFilters.brand));

    filterContainer.appendChild(wrapper);
}
