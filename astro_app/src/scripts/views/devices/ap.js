// ─────────────────────────────────────────────────────────────
// AP — extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, save, genId, getAllDevices } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';
import { escapeHtml } from '../../utils.js';
import { generatePagination, deleteStandaloneDevice } from '../devices.js';

// Estado del módulo (movido desde devices.js)
let currentPageAps = 1;
const APS_PER_PAGE = 20;
let apFilters = {};

// ─────────────────────────────────────────────────────────────
// Redes del AP
//
// Un punto de acceso publica varias redes a la vez (corporativa,
// invitados, IoT…), cada una con su VLAN y su clave. Se guardan en
// `ssids`, que viaja en la columna `attributes` del dispositivo: no
// hace falta tocar la base de datos.
//
// Los AP registrados antes de esto tienen un solo SSID en campos
// planos; se leen igual para no perder nada.
// ─────────────────────────────────────────────────────────────
function redesDe(d) {
    if (Array.isArray(d?.ssids) && d.ssids.length) return d.ssids;
    if (d?.ssid) return [{ ssid: d.ssid, vlan: d.vlan || '', password: d.password || '' }];
    return [];
}

// Una línea por red, para que SSID, VLAN y contraseña queden alineados
// entre sí en las tres columnas de la tabla.
function columnaRedes(d, campo) {
    const redes = redesDe(d);
    if (!redes.length) return '—';
    return redes.map(n => `<div>${escapeHtml(n[campo] || '—')}</div>`).join('');
}

export function renderApsTable(allDevs) {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');

    tableContainer.style.overflowX = 'auto';
    let devs = allDevs.filter(d => (d.device || '').toLowerCase() === 'ap');

    // 1. Cabeceras Dinámicas y Filtros
    if (!thead.dataset.isAp) {
        thead.dataset.isAp = 'true';
        const colNames = ['#', 'Nombre', 'Estado', 'Región', 'Área', 'Marca', 'Modelo', 'Serie', 'IP', 'MAC', 'SSID', 'VLAN', 'Contraseña'];

        let headerHtml = '<tr>';
        colNames.forEach(name => headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">${name}</th>`);
        headerHtml += `<th style="white-space:nowrap; font-size:12px; padding:10px 8px;">Acciones</th></tr>`;
        thead.innerHTML = headerHtml;

        setupApFilters(allDevs);
    }

    // 2. Aplicar Filtros
    const globalSearchText = (apFilters.globalSearch || '').toLowerCase();
    const filteredDevs = devs.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';

        const redesTxt = redesDe(d).map(n => `${n.ssid} ${n.vlan}`).join(' ');

        if (globalSearchText) {
            const searchStr = `${d.name} ${regName} ${d.area} ${d.brand} ${d.model} ${d.serial} ${d.ip} ${d.mac} ${redesTxt}`.toLowerCase();
            if (!searchStr.includes(globalSearchText)) {
                return false;
            }
        }

        const dropdownFiltersOK = Object.entries(apFilters).every(([key, filterValue]) => {
            if (!filterValue || key === 'globalSearch') return true;
            // SSID y VLAN ya no son un valor suelto: basta con que alguna de
            // las redes del AP coincida.
            if (key === 'ssid') return redesDe(d).some(n => n.ssid === filterValue);
            if (key === 'vlan') return redesDe(d).some(n => n.vlan === filterValue);
            const deviceValue = key === 'regionName' ? regName : d[key];
            return String(deviceValue || '') === String(filterValue);
        });

        return dropdownFiltersOK;
    });

    // 3. Paginación
    const totalPages = Math.ceil(filteredDevs.length / APS_PER_PAGE) || 1;
    if (currentPageAps > totalPages) currentPageAps = totalPages;
    const paginatedDevs = filteredDevs.slice((currentPageAps - 1) * APS_PER_PAGE, currentPageAps * APS_PER_PAGE);

    // 4. Renderizado
    if (filteredDevs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:30px; color:var(--text-muted);">No hay Access Points que coincidan con los criterios de búsqueda.</td></tr>`;
    } else {
        const _startIdxAps = (currentPageAps - 1) * APS_PER_PAGE;
        tbody.innerHTML = paginatedDevs.map((d, i) => {
            const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';
            const statusClass = d.status === 'Up' ? 'badge-active' : d.status === 'Down' ? 'badge-danger' : 'badge-warning';

            return `<tr data-category="AP">
                <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${_startIdxAps + i + 1}</td>
                <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
                <td style="white-space:nowrap;"><span class="badge ${statusClass}">${d.status || '—'}</span></td>
                <td style="white-space:nowrap;">${regName}</td>
                <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
                <td style="white-space:nowrap;">${d.brand || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${d.model || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.serial || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.ip || '—'}</td>
                <td style="white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:11px;">${d.mac || '—'}</td>
                <td style="white-space:nowrap; font-size:12px;">${columnaRedes(d, 'ssid')}</td>
                <td style="white-space:nowrap; font-size:12px;">${columnaRedes(d, 'vlan')}</td>
                <td style="white-space:nowrap; font-size:12px;">${columnaRedes(d, 'password')}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon btn-edit-ap" data-id="${d.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete-ap" data-id="${d.id}">${icons.trash}</button>
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
    let pagContainer = document.getElementById('ap-pagination');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'ap-pagination';
        pagContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:15px 0 0 0; margin-top:15px; border-top:1px solid var(--border);';
        tableContainer.appendChild(pagContainer);
    }

    if (filteredDevs.length > APS_PER_PAGE) {
        pagContainer.style.display = 'flex';
        generatePagination(pagContainer, filteredDevs.length, APS_PER_PAGE, currentPageAps, (newPage) => {
            currentPageAps = newPage;
            renderApsTable(getAllDevices());
        });
    } else {
        pagContainer.style.display = 'none';
        pagContainer.innerHTML = '';
    }

    document.querySelectorAll('#devices-tbody .btn-edit-ap').forEach(btn =>
        btn.addEventListener('click', e => showApForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-ap').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
}

export function showApForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;

    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`).join('');

    // Un AP nuevo arranca con una fila vacía para que se vea qué hay que llenar.
    const redes = redesDe(d);
    const filasIniciales = (redes.length ? redes : [{}]).map(filaRedHtml).join('');

    showModal('Gestión de Access Point', `
        <div class="form-row">
            <div class="form-group"><label>Nombre del AP</label><input id="fap-name" value="${d ? d.name || '' : ''}" placeholder="Ej: AP-OFICINA-01"></div>
            <div class="form-group"><label>Estado</label><select id="fap-status">
                <option ${d && d.status === 'Up' ? 'selected' : ''}>Up</option>
                <option ${d && d.status === 'Down' ? 'selected' : ''}>Down</option>
                <option ${d && d.status === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fap-region"><option value="" disabled selected>Selecciona región...</option>${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="fap-area"><option value="" disabled selected>Selecciona área...</option>${areaOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fap-brand" value="${d ? d.brand || '' : ''}" placeholder="Ej: Ubiquiti, Aruba..."></div>
            <div class="form-group"><label>Modelo</label><input id="fap-model" value="${d ? d.model || '' : ''}" placeholder="Modelo"></div>
            <div class="form-group"><label>Serie</label><input id="fap-serial" value="${d ? d.serial || '' : ''}" placeholder="Número de serie"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>IP</label><input id="fap-ip" value="${d ? d.ip || '' : ''}" placeholder="192.168.1.50"></div>
            <div class="form-group"><label>MAC</label><input id="fap-mac" value="${d ? d.mac || '' : ''}" placeholder="AA:BB:CC:DD:EE:FF"></div>
        </div>
        <div style="margin-top:4px;padding-top:16px;border-top:1px dashed var(--border)">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
                <label style="font-size:11.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin:0;">
                    Redes WiFi (SSID)
                </label>
                <button type="button" class="btn btn-outline btn-sm" id="fap-ssid-add" style="font-size:12px;">+ Añadir SSID</button>
            </div>
            <div id="fap-ssid-list">${filasIniciales}</div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;">
                Un AP puede publicar varias redes. Las filas sin nombre se descartan.
            </div>
        </div>
    `, () => {
        const name = document.getElementById('fap-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const redes = leerRedesDelFormulario();

        const obj = {
            name,
            device: 'AP',
            status: document.getElementById('fap-status').value,
            regionId: document.getElementById('fap-region').value,
            area: document.getElementById('fap-area').value,
            brand: document.getElementById('fap-brand').value.trim(),
            model: document.getElementById('fap-model').value.trim(),
            serial: document.getElementById('fap-serial').value.trim(),
            ip: document.getElementById('fap-ip').value.trim(),
            mac: document.getElementById('fap-mac').value.trim(),
            ssids: redes,
            // Espejo en los campos planos: la tabla General y la ficha del
            // bastidor siguen leyendo d.ssid / d.vlan / d.password.
            ssid:     redes.map(n => n.ssid).join(', '),
            vlan:     redes.map(n => n.vlan).filter(Boolean).join(', '),
            password: redes.map(n => n.password).filter(Boolean).join(', ')
        };

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderApsTable(getAllDevices());
    }, id ? 'Guardar cambios' : 'Añadir AP');

    // showModal ya dejó el diálogo en el DOM, así que el repetidor se
    // engancha aquí mismo.
    const lista = document.getElementById('fap-ssid-list');
    const enlazarBorrado = () => {
        lista.querySelectorAll('.fap-ssid-del').forEach(btn => {
            btn.onclick = () => {
                // Siempre queda al menos una fila: si es la última, se vacía
                // en lugar de desaparecer y dejar el bloque huérfano.
                if (lista.querySelectorAll('.fap-ssid-row').length === 1) {
                    btn.closest('.fap-ssid-row').querySelectorAll('input').forEach(i => { i.value = ''; });
                    return;
                }
                btn.closest('.fap-ssid-row').remove();
            };
        });
    };
    document.getElementById('fap-ssid-add').onclick = () => {
        lista.insertAdjacentHTML('beforeend', filaRedHtml());
        enlazarBorrado();
        lista.lastElementChild.querySelector('.fap-ssid-name')?.focus();
    };
    enlazarBorrado();
}

function filaRedHtml(n = { ssid: '', vlan: '', password: '' }) {
    return `<div class="fap-ssid-row" style="display:grid;grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr) 36px;gap:10px;align-items:end;margin-bottom:10px;">
        <div class="form-group" style="margin:0"><label>SSID</label><input class="fap-ssid-name" value="${escapeHtml(n.ssid || '')}" placeholder="Ej: COMAYMA-CORP"></div>
        <div class="form-group" style="margin:0"><label>VLAN</label><input class="fap-ssid-vlan" value="${escapeHtml(n.vlan || '')}" placeholder="10"></div>
        <div class="form-group" style="margin:0"><label>Contraseña</label><input class="fap-ssid-pass" value="${escapeHtml(n.password || '')}" placeholder="Clave de la red"></div>
        <button type="button" class="btn-icon danger fap-ssid-del" title="Quitar esta red" style="margin-bottom:4px">${icons.trash}</button>
    </div>`;
}

function leerRedesDelFormulario() {
    return [...document.querySelectorAll('#fap-ssid-list .fap-ssid-row')]
        .map(f => ({
            ssid:     f.querySelector('.fap-ssid-name').value.trim(),
            vlan:     f.querySelector('.fap-ssid-vlan').value.trim(),
            password: f.querySelector('.fap-ssid-pass').value.trim()
        }))
        .filter(n => n.ssid);   // sin nombre no hay red que guardar
}

function setupApFilters(allDevs) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const handleUpdate = (key, value) => {
        apFilters[key] = value;
        currentPageAps = 1;
        renderApsTable(getAllDevices());
    };

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = "Buscar en APs...";
        searchInput.oninput = (e) => handleUpdate('globalSearch', e.target.value);
        searchInput.value = apFilters.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const allApsCtx = allDevs.filter(d => (d.device || '').toLowerCase() === 'ap');
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(allApsCtx.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => handleUpdate('regionName', e.target.value);
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(allApsCtx.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => handleUpdate('area', e.target.value);
    }

    document.getElementById('ap-filters-wrapper')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'ap-filters-wrapper';
    wrapper.style.display = 'contents';

    const allAps = allDevs.filter(d => (d.device || '').toLowerCase() === 'ap');

    const createSelect = (key, placeholder, options, selected) => {
        const select = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        select.id = `ap-filter-${key}`;
        select.name = `ap-filter-${key}`;
        select.innerHTML = `<option value="">${placeholder}</option>` +
            options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
        select.onchange = (e) => handleUpdate(key, e.target.value);
        select.value = selected || "";
        return select;
    };

    const uniqueBrands = [...new Set(allAps.map(c => c.brand).filter(Boolean).sort())];
    wrapper.appendChild(createSelect('brand', 'Marca', uniqueBrands, apFilters.brand));

    // Cada AP puede tener varias redes: el desplegable lista todas las que
    // existen, no el campo suelto de cada dispositivo.
    const todasLasRedes = allAps.flatMap(redesDe);

    const uniqueSsids = [...new Set(todasLasRedes.map(n => n.ssid).filter(Boolean))].sort();
    wrapper.appendChild(createSelect('ssid', 'SSID', uniqueSsids, apFilters.ssid));

    const uniqueVlans = [...new Set(todasLasRedes.map(n => n.vlan).filter(Boolean))].sort();
    wrapper.appendChild(createSelect('vlan', 'VLAN', uniqueVlans, apFilters.vlan));

    filterContainer.appendChild(wrapper);
}
