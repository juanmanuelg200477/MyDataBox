// ─────────────────────────────────────────────────────────────
// PATCHCORDS DE FIBRA — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice, setupSimpleFilters } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPagePatchcordsFibra = 1;
const PATCHCORDS_FIBRA_PER_PAGE = 20;
let patchcordFibraFilters = {};

export function renderPatchcordsFibraTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    const devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'patchcords de fibra');

    if (!thead.dataset.isPatchcordFibra) {
        thead.dataset.isPatchcordFibra = 'true';
        thead.innerHTML = `<tr>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;width:36px;text-align:center;">#</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Nombre</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Región</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Área</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Marca</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Medida</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Cantidad</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Rack/Nodo</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Acciones</th>
        </tr>`;
        setupSimpleFilters('patchcord-fibra', patchcordFibraFilters, allDevs, 'patchcords de fibra', () => {
            currentPagePatchcordsFibra = 1;
            renderPatchcordsFibraTable(getAllDevices());
        });
    }

    const globalSearch = (patchcordFibraFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';
        if (globalSearch) {
            const str = `${d.name} ${regName} ${d.area} ${d.brand} ${d.medida} ${d.rackNode}`.toLowerCase();
            if (!str.includes(globalSearch)) return false;
        }
        return Object.entries(patchcordFibraFilters).every(([key, val]) => {
            if (!val || key === 'globalSearch') return true;
            const dVal = key === 'regionName' ? regName : d[key];
            return String(dVal || '') === String(val);
        });
    });

    const totalPages = Math.ceil(filteredDevs.length / PATCHCORDS_FIBRA_PER_PAGE) || 1;
    if (currentPagePatchcordsFibra > totalPages) currentPagePatchcordsFibra = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPagePatchcordsFibra - 1) * PATCHCORDS_FIBRA_PER_PAGE, currentPagePatchcordsFibra * PATCHCORDS_FIBRA_PER_PAGE);

    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">No hay patchcords de fibra que coincidan con los filtros.</td></tr>`;
    } else {
        const _startIdxPatchcordsFibra = (currentPagePatchcordsFibra - 1) * PATCHCORDS_FIBRA_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            return `<tr>
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxPatchcordsFibra + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap;">${d.medida || '—'}</td>
                <td style="white-space:nowrap;">${d.cantidad || '—'}</td>
                <td style="white-space:nowrap;">${d.rackNode || '—'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-pcf" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-pcf" data-id="${d.id}">${icons.trash}</button>
                </td>
            </tr>`;
        }).join('');
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    if (countDisplay) countDisplay.textContent = devs.length;
    if (showingDisplay) showingDisplay.textContent = paginatedDevs.length;
    if (totalDisplay) totalDisplay.textContent = filteredDevs.length;

    let pagContainer = document.getElementById('patchcord-fibra-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'patchcord-fibra-pagination';
        pagContainer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:15px 0 0 0;margin-top:15px;border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }
    if (filteredDevs.length > PATCHCORDS_FIBRA_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, PATCHCORDS_FIBRA_PER_PAGE, currentPagePatchcordsFibra, (p) => { currentPagePatchcordsFibra = p; renderPatchcordsFibraTable(getAllDevices()); });
    } else { pagContainer.style.display = 'none'; pagContainer.innerHTML = ''; }

    document.querySelectorAll('#devices-tbody .btn-edit-pcf').forEach(btn =>
        btn.addEventListener('click', e => showPatchcordFibraForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-pcf').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showPatchcordFibraForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;
    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    showModal('Patchcord de Fibra', `
        <div class="form-row">
            <div class="form-group"><label>Nombre / Etiqueta</label><input id="fpcf-name" value="${d?.name || ''}" placeholder="Ej: PCF-01"></div>
            <div class="form-group"><label>Marca</label><input id="fpcf-brand" value="${d?.brand || ''}" placeholder="Ej: Corning, Generic"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fpcf-region"><option value="" disabled selected>Selecciona...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fpcf-area"><option value="" disabled selected>Selecciona...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Medida</label><input id="fpcf-medida" value="${d?.medida || ''}" placeholder="Ej: 1m, 3m, 5ft"></div>
            <div class="form-group"><label>Cantidad</label><input id="fpcf-cantidad" type="number" min="1" value="${d?.cantidad || '1'}"></div>
            <div class="form-group"><label>Rack o Nodo</label><input id="fpcf-racknode" value="${d?.rackNode || ''}" placeholder="Ej: RACK-01"></div>
        </div>
    `, () => {
        const name = document.getElementById('fpcf-name').value.trim();
        if (!name) return alert('El nombre es requerido');
        const obj = {
            name, device: 'Patchcords de fibra',
            regionId: document.getElementById('fpcf-region').value,
            area: document.getElementById('fpcf-area').value,
            brand: document.getElementById('fpcf-brand').value.trim(),
            medida: document.getElementById('fpcf-medida').value.trim(),
            cantidad: document.getElementById('fpcf-cantidad').value,
            rackNode: document.getElementById('fpcf-racknode').value.trim(),
        };
        if (d) Object.assign(d, obj); else store.devices.push({ id: genId(), ...obj });
        save(); closeModal(); renderPatchcordsFibraTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir Patchcord de Fibra');
}
