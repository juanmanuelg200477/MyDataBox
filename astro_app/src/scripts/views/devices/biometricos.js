// ─────────────────────────────────────────────────────────────
// BIOMÉTRICOS — lectores de huella / control de acceso y asistencia.
//
// Además de los datos comunes a todo dispositivo, estos guardan su
// configuración de red completa (máscara, puerta de enlace, DNS) y la
// dirección del servidor al que reportan las marcaciones.
//
// Esos cuatro campos no están en DEVICE_CORE, así que viajan solos en
// la columna `attributes` del dispositivo: no hace falta tocar la base
// de datos.
//
// Como cualquier otro dispositivo con área asignada, un biométrico
// aparece automáticamente en la lista de hosts al configurar un puerto
// de switch; esa lista se deriva del inventario del área.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { escapeHtml } from '../../utils.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

const TIPO = 'biométricos';          // valor guardado en d.device (en minúsculas para comparar)
const BIO_PER_PAGE = 20;

let currentPageBio = 1;
let bioFilters = {};

const esBiometrico = d => (d.device || '').toLowerCase() === TIPO;

export function renderBiometricosTable(allDevs) {
    const tbody          = document.getElementById('devices-tbody');
    const emptyState     = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead          = tableContainer.querySelector('table thead');
    const countDisplay   = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay   = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    const devs = allDevs.filter(esBiometrico);

    // 1. Cabeceras y filtros (solo la primera vez que se entra)
    if (!thead.dataset.isBio) {
        thead.dataset.isBio = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie',
                          'IP', 'Máscara', 'Gateway', 'DNS', 'Servidor', 'MAC'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupBioFilters(allDevs);
    }

    // 2. Filtros
    const globalSearchText = (bioFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.ip} ${d.mac} ${d.mask} ${d.gateway} ${d.dns} ${d.server}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) return false;
        }

        return Object.entries(bioFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            const deviceValue = key === 'regionName' ? regName : d[key];
            return String(deviceValue || '') === String(filterValue);
        });
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / BIO_PER_PAGE) || 1;
    if (currentPageBio > totalPages) currentPageBio = totalPages;
    const inicio = (currentPageBio - 1) * BIO_PER_PAGE;
    const paginatedDevs = filteredDevs.slice(inicio, inicio + BIO_PER_PAGE);

    // 4. Render
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--text-muted);">No hay biométricos que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const mono = 'white-space:nowrap; font-family:\'JetBrains Mono\',monospace; font-size:11px;';
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Up' ? 'badge-active' : d.status === 'Down' ? 'badge-danger' : 'badge-warning';
            const campo = v => escapeHtml(v || '—');

            return `<tr data-category="Biométricos">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${inicio + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${campo(d.name)}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${campo(d.status)}</span></td>
                <td style="white-space:nowrap;">${escapeHtml(regName)}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${campo(d.area)}</span></td>
                <td style="white-space:nowrap;">${campo(d.brand)}</td>
                <td style="white-space:nowrap; font-size:12px;">${campo(d.model)}</td>
                <td style="${mono}">${campo(d.serial)}</td>
                <td style="${mono}">${campo(d.ip)}</td>
                <td style="${mono}">${campo(d.mask)}</td>
                <td style="${mono}">${campo(d.gateway)}</td>
                <td style="${mono}">${campo(d.dns)}</td>
                <td style="${mono}">${campo(d.server)}</td>
                <td style="${mono}">${campo(d.mac)}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-bio" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-bio" data-id="${d.id}">${icons.trash}</button>
                </td>
            </tr>`;
        }).join('');
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    if (countDisplay)   countDisplay.textContent   = devs.length;
    if (showingDisplay) showingDisplay.textContent = paginatedDevs.length;
    if (totalDisplay)   totalDisplay.textContent   = filteredDevs.length;

    let pagContainer = document.getElementById('bio-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'bio-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > BIO_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, BIO_PER_PAGE, currentPageBio, (newPage) => {
            currentPageBio = newPage;
            renderBiometricosTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-bio').forEach(btn =>
        btn.addEventListener('click', e => showBiometricoForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-bio').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showBiometricoForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;
    const v = campo => escapeHtml(d ? d[campo] || '' : '');

    const regOpts  = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${escapeHtml(a.name)}" ${d && d.area === a.name ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('');

    showModal('Gestión de Biométrico', `
        <div class="form-row">
            <div class="form-group"><label>Nombre del biométrico</label><input id="fbio-name" value="${v('name')}" placeholder="Ej: BIO-RECEPCION-01"></div>
            <div class="form-group"><label>Estado</label><select id="fbio-status">
                <option ${d && d.status === 'Up' ? 'selected' : ''}>Up</option>
                <option ${d && d.status === 'Down' ? 'selected' : ''}>Down</option>
                <option ${d && d.status === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fbio-region"><option value="" disabled selected>Selecciona región...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fbio-area"><option value="" disabled selected>Selecciona área...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fbio-brand" value="${v('brand')}" placeholder="Ej: ZKTeco, Hikvision..."></div>
            <div class="form-group"><label>Modelo</label><input id="fbio-model" value="${v('model')}" placeholder="Modelo"></div>
            <div class="form-group"><label>Serie</label><input id="fbio-serial" value="${v('serial')}" placeholder="Número de serie"></div>
        </div>

        <div style="margin-top:4px;padding-top:16px;border-top:1px dashed var(--border)">
            <label style="display:block;font-size:11.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">
                Configuración de red
            </label>
            <div class="form-row">
                <div class="form-group"><label>IP</label><input id="fbio-ip" value="${v('ip')}" placeholder="192.168.1.80"></div>
                <div class="form-group"><label>Máscara</label><input id="fbio-mask" value="${v('mask')}" placeholder="255.255.255.0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Gateway</label><input id="fbio-gateway" value="${v('gateway')}" placeholder="192.168.1.1"></div>
                <div class="form-group"><label>DNS</label><input id="fbio-dns" value="${v('dns')}" placeholder="8.8.8.8"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>MAC</label><input id="fbio-mac" value="${v('mac')}" placeholder="AA:BB:CC:DD:EE:FF"></div>
                <div class="form-group"><label>Dirección del servidor</label><input id="fbio-server" value="${v('server')}" placeholder="IP o nombre del servidor de marcaciones"></div>
            </div>
        </div>
    `, () => {
        const name = document.getElementById('fbio-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const obj = {
            name,
            device:   'Biométricos',
            status:   document.getElementById('fbio-status').value,
            regionId: document.getElementById('fbio-region').value,
            area:     document.getElementById('fbio-area').value,
            brand:    document.getElementById('fbio-brand').value.trim(),
            model:    document.getElementById('fbio-model').value.trim(),
            serial:   document.getElementById('fbio-serial').value.trim(),
            ip:       document.getElementById('fbio-ip').value.trim(),
            mac:      document.getElementById('fbio-mac').value.trim(),
            mask:     document.getElementById('fbio-mask').value.trim(),
            gateway:  document.getElementById('fbio-gateway').value.trim(),
            dns:      document.getElementById('fbio-dns').value.trim(),
            server:   document.getElementById('fbio-server').value.trim()
        };

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderBiometricosTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir biométrico');
}

function setupBioFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        bioFilters[key] = value;
        currentPageBio = 1;
        renderBiometricosTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = 'Buscar en biométricos...';
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = bioFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const todos = allDevs.filter(esBiometrico);

    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(todos.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(todos.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('bio-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'bio-filters-wrapper';
    wrapper.style.display = 'contents';

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `bio-filter-${key}`;
        select.name = `bio-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${escapeHtml(opt)}" ${selected === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || '';
        return select;
    };

    const uniqueBrands = [...new Set(todos.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, bioFilters.brand));

    // Útil para ver de un vistazo qué equipos reportan a cada servidor.
    const uniqueServers = [...new Set(todos.map(c => c.server).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('server', 'Servidor', uniqueServers, bioFilters.server));

    filterContainer.appendChild(wrapper);
}
