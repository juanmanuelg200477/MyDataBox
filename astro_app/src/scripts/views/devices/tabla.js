// ─────────────────────────────────────────────────────────────
// TABLA — elige la vista de cada subcategoría y pinta la tabla
// genérica de los tipos que no tienen una propia.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { getAllDevices, store } from '../../store.js';
import { icons } from '../../icons.js';
import { renderCamerasTable } from './cameras.js';
import { renderNvrsTable } from './nvr.js';
import { renderAntennasTable } from './antennas.js';
import { renderSwitchesTable } from './switches.js';
import { renderSfpsTable } from './sfp.js';
import { renderApsTable } from './ap.js';
import { renderBiometricosTable } from './biometricos.js';
import { renderUpsTable } from './ups.js';
import { renderSuppressorsTable } from './suppressors.js';
import { renderPdusTable } from './pdu.js';
import { renderPatchPanelsTable } from './patchpanels.js';
import { renderBandejasFibraTable } from './bandejasfibra.js';
import { renderOrganizadoresTable } from './organizadores.js';
import { renderPatchcordsTable } from './patchcords.js';
import { renderPatchcordsFibraTable } from './patchcordsfibra.js';
import { showStandaloneDeviceForm, deleteStandaloneDevice, deleteRackDeviceFromList } from './formulario.js';
import { _cleanupAllSpecializedFilters, renderAllDevicesTable, restoreNormalHeaders } from './general.js';
import { renderReportesView } from './ispReportes.js';
import { renderIspLinksView } from './ispEnlaces.js';

// ─────────────────────────────────────────────────────────────
// RENDER: Devices Table
// ─────────────────────────────────────────────────────────────
export function renderDevicesTable(subcategoryFilter) {
    // Cleanup FIRST — this restores tableContainer.innerHTML if Reportes replaced it,
    // which would make devices-tbody null and cause the early return to fire incorrectly.
    _cleanupAllSpecializedFilters();

    // Vistas especializadas que NO necesitan devices-tbody — van antes del null-check
    if (!subcategoryFilter) {
        renderAllDevicesTable();
        return;
    }
    if (subcategoryFilter === 'Reportes') {
        renderReportesView();
        return;
    }
    if (subcategoryFilter === 'ISPs General') {
        renderIspLinksView();
        return;
    }

    // Para el resto de vistas, devices-tbody debe existir
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');
    if (!tbody) return;

    if (subcategoryFilter === 'Cámaras') {
        renderCamerasTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'NVR') {
        renderNvrsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Antenas') {
        renderAntennasTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Switch') {
        renderSwitchesTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'SFP') {
        renderSfpsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'AP') {
        renderApsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Biométricos') {
        renderBiometricosTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'UPS') {
        renderUpsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Supresores') {
        renderSuppressorsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'PDU') {
        renderPdusTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Patch Panels') {
        renderPatchPanelsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Bandejas de fibra') {
        renderBandejasFibraTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Organizadores') {
        renderOrganizadoresTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Patchcords') {
        renderPatchcordsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Patchcords de fibra') {
        renderPatchcordsFibraTable(getAllDevices());
        return;
    }

    restoreNormalHeaders(tableContainer);
    let devs = getAllDevices();

    // Filter by subcategory (null or '__all__' = show everything)
    if (subcategoryFilter && subcategoryFilter !== '__all__') {
        devs = devs.filter(d =>
            (d.device || '').toLowerCase() === subcategoryFilter.toLowerCase()
        );
    }

    if (devs.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        countDisplay.textContent = '0';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    countDisplay.textContent = devs.length;
    showingDisplay.textContent = devs.length;
    totalDisplay.textContent = devs.length;

    tbody.innerHTML = devs.map((d, i) => {
        const regName = d.rackRegion
            ? (store.regions.find(r => r.id === d.rackRegion) || {}).name || '—'
            : (d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—');

        const statusClass = d.status === 'Disponible' || d.status === 'Nuevo'
            ? 'badge-active'
            : d.status === 'Stock' ? 'badge-info'
                : d.status === 'En reposo' ? 'badge-warning'
                    : 'badge-inactive';

        const isSwitch = (d.device || '').toLowerCase().includes('switch');
        const nameTag = isSwitch
            ? `<a href="/device?id=${d.id}" class="link" style="color:var(--primary);text-decoration:none">${d.name}</a>`
            : `<strong>${d.name}</strong>`;

        return `<tr
            data-search="${d.name} ${regName} ${d.area || ''} ${d.rack || ''} ${d.device || ''} ${d.brand || ''} ${d.model || ''} ${d.ip || ''}"
            data-region="${regName}" data-area="${d.area || ''}" data-status="${d.status || ''}" data-category="${d.device || ''}">
            <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${i + 1}</td>
            <td>${nameTag}</td>
            <td><span class="badge ${statusClass}">${d.status || '—'}</span></td>
            <td>${regName}</td>
            <td><span class="badge badge-purple">${d.area || '—'}</span></td>
            <td>${d.rack || '—'}</td>
            <td>${d.device || '—'}</td>
            <td>${d.brand || '—'}</td>
            <td style="font-size:12px">${d.model || '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${d.serial || '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${d.ip || '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${d.mac || '—'}</td>
            <td style="white-space:nowrap">
                ${!d.rackId
                ? `<button class="btn-icon btn-edit" data-id="${d.id}">${icons.edit}</button>
                       <button class="btn-icon danger btn-delete" data-id="${d.id}">${icons.trash}</button>`
                : `<a href="/rack?id=${d.rackId}&u=${d.rackUnit}" class="btn-icon" title="Editar en rack">${icons.edit}</a>
                       <button class="btn-icon danger btn-delete-rack" data-rackid="${d.rackId}" data-unit="${d.rackUnit}">${icons.trash}</button>`}
            </td>
        </tr>`;
    }).join('');

    document.querySelectorAll('#devices-tbody .btn-edit').forEach(btn =>
        btn.addEventListener('click', e => showStandaloneDeviceForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-rack').forEach(btn =>
        btn.addEventListener('click', e => deleteRackDeviceFromList(e.currentTarget.dataset.rackid, e.currentTarget.dataset.unit))
    );

    filterDeviceTable();
}

// ─────────────────────────────────────────────────────────────
// FILTER: Device Table
// ─────────────────────────────────────────────────────────────
export function filterDeviceTable() {
    const search = (document.getElementById('search-devices')?.value || '').toLowerCase();
    const regFilter = document.getElementById('dev-region-filter')?.value || '';
    const areaFilter = document.getElementById('dev-area-filter')?.value || '';
    const statusFilter = document.getElementById('dev-status-filter')?.value || '';

    const rows = document.querySelectorAll('#devices-tbody tr');
    let count = 0;

    rows.forEach(row => {
        const text = (row.dataset.search || '').toLowerCase();
        const region = row.dataset.region || '';
        const area = row.dataset.area || '';
        const status = row.dataset.status || '';

        const ok =
            (!search || text.includes(search)) &&
            (!regFilter || region === regFilter) &&
            (!areaFilter || area === areaFilter) &&
            (!statusFilter || status === statusFilter || (statusFilter === 'Disponible' && status === 'Activo'));

        row.style.display = ok ? '' : 'none';
        if (ok) count++;
    });

    const showingEl = document.getElementById('dev-showing');
    if (showingEl) showingEl.textContent = count;
}
