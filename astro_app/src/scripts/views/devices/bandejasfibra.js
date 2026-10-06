// ─────────────────────────────────────────────────────────────
// BANDEJAS DE FIBRA — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { generatePagination, deleteStandaloneDevice, setupSimpleFilters } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageBandejasFibra = 1;
const BANDEJAS_FIBRA_PER_PAGE = 20;
let bandejaFibraFilters = {};

export function renderBandejasFibraTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    const devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'bandejas de fibra');

    if (!thead.dataset.isBandejaFibra) {
        thead.dataset.isBandejaFibra = 'true';
        thead.innerHTML = `<tr>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;width:36px;text-align:center;">#</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Nombre</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Región</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Área</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Marca</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Rack/Nodo</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Acciones</th>
        </tr>`;
        setupSimpleFilters('bandeja-fibra', bandejaFibraFilters, allDevs, 'bandejas de fibra', () => {
            currentPageBandejasFibra = 1;
            renderBandejasFibraTable(getAllDevices());
        });
    }

    const globalSearch = (bandejaFibraFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';
        if (globalSearch) {
            const str = `${d.name} ${regName} ${d.area} ${d.brand} ${d.rackNode}`.toLowerCase();
            if (!str.includes(globalSearch)) return false;
        }
        return Object.entries(bandejaFibraFilters).every(([key, val]) => {
            if (!val || key === 'globalSearch') return true;
            const dVal = key === 'regionName' ? regName : d[key];
            return String(dVal || '') === String(val);
        });
    });

    const totalPages = Math.ceil(filteredDevs.length / BANDEJAS_FIBRA_PER_PAGE) || 1;
    if (currentPageBandejasFibra > totalPages) currentPageBandejasFibra = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPageBandejasFibra - 1) * BANDEJAS_FIBRA_PER_PAGE, currentPageBandejasFibra * BANDEJAS_FIBRA_PER_PAGE);

    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">No hay bandejas de fibra que coincidan con los filtros.</td></tr>`;
    } else {
        const _startIdxBandejasFibra = (currentPageBandejasFibra - 1) * BANDEJAS_FIBRA_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            return `<tr>
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxBandejasFibra + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap;">${d.rackNode || '—'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-bfibra" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-bfibra" data-id="${d.id}">${icons.trash}</button>
                </td>
            </tr>`;
        }).join('');
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    if (countDisplay) countDisplay.textContent = devs.length;
    if (showingDisplay) showingDisplay.textContent = paginatedDevs.length;
    if (totalDisplay) totalDisplay.textContent = filteredDevs.length;

    let pagContainer = document.getElementById('bandeja-fibra-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'bandeja-fibra-pagination';
        pagContainer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:15px 0 0 0;margin-top:15px;border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }
    if (filteredDevs.length > BANDEJAS_FIBRA_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, BANDEJAS_FIBRA_PER_PAGE, currentPageBandejasFibra, (p) => { currentPageBandejasFibra = p; renderBandejasFibraTable(getAllDevices()); });
    } else { pagContainer.style.display = 'none'; pagContainer.innerHTML = ''; }

    document.querySelectorAll('#devices-tbody .btn-edit-bfibra').forEach(btn =>
        btn.addEventListener('click', e => showBandejaFibraForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-bfibra').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showBandejaFibraForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;
    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    showModal('Bandeja de Fibra', `
        <div class="form-row">
            <div class="form-group"><label>Nombre / Etiqueta</label><input id="fbf-name" value="${d?.name || ''}" placeholder="Ej: BF-RACK-01"></div>
            <div class="form-group"><label>Marca</label><input id="fbf-brand" value="${d?.brand || ''}" placeholder="Ej: Panduit"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fbf-region"><option value="" disabled selected>Selecciona...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fbf-area"><option value="" disabled selected>Selecciona...</option>${areaOpts}</select></div>
        </div>
        <div class="form-group"><label>Rack o Nodo</label><input id="fbf-racknode" value="${d?.rackNode || ''}" placeholder="Ej: RACK-01, NODO-A"></div>
    `, () => {
        const name = document.getElementById('fbf-name').value.trim();
        if (!name) return alert('El nombre es requerido');
        const obj = {
            name, device: 'Bandejas de fibra',
            regionId: document.getElementById('fbf-region').value,
            area: document.getElementById('fbf-area').value,
            brand: document.getElementById('fbf-brand').value.trim(),
            rackNode: document.getElementById('fbf-racknode').value.trim(),
        };
        if (d) Object.assign(d, obj); else store.devices.push({ id: genId(), ...obj });
        save(); closeModal(); renderBandejasFibraTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir Bandeja de Fibra');
}
