function renderDevices(app) {
    setBreadcrumb('Infraestructura', 'Dispositivos');
    const allDevs = getAllDevices();

    app.innerHTML = `<div class="view-transition">
        <div class="page-header">
            <h1>Dispositivos</h1>
            <div class="page-header-actions">
                <button class="btn btn-primary" onclick="showStandaloneDeviceForm()">${icons.plus} Añadir</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Resultados <span style="background:var(--primary);color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-left:6px">${allDevs.length}</span></h2>
                <div style="display:flex;gap:8px;align-items:center">
                    <div class="search-box">${icons.search}<input type="text" placeholder="Buscar dispositivo..." oninput="filterDeviceTable(this)"></div>
                    <select id="dev-area-filter" onchange="filterDeviceTable()" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-family:inherit;background:var(--bg)">
                        <option value="">Todas las áreas</option>
                        ${FIXED_AREAS.map(a => `<option value="${a}">${a}</option>`).join('')}
                    </select>
                </div>
            </div>
            ${allDevs.length ? `<div style="overflow-x:auto"><table>
                <thead><tr><th>Nombre</th><th>Estado</th><th>Región</th><th>Área</th><th>Rack</th><th>Dispositivo</th><th>Marca</th><th>Modelo</th><th>Serie</th><th>IP</th><th>MAC</th><th>Acciones</th></tr></thead>
                <tbody id="devices-tbody">${allDevs.map((d, i) => {
                    const regName = d.rackRegion ? (store.regions.find(r => r.id === d.rackRegion) || {}).name || '—' : (d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—');
                    const statusClass = d.status === 'Disponible' || d.status === 'Nuevo' ? 'badge-active' : d.status === 'Stock' ? 'badge-info' : d.status === 'En reposo' ? 'badge-warning' : 'badge-inactive';
                    return `<tr data-search="${d.name} ${regName} ${d.area || ''} ${d.rack || ''} ${d.device || ''} ${d.brand || ''} ${d.model || ''} ${d.ip || ''}" data-area="${d.area || ''}">
                        <td><strong class="link">${d.name}</strong></td>
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
                            ${d.id ? `<button class="btn-icon" onclick="showStandaloneDeviceForm('${d.id}')">${icons.edit}</button>
                            <button class="btn-icon danger" onclick="deleteStandaloneDevice('${d.id}')">${icons.trash}</button>` : `<button class="btn-icon" title="En rack" disabled style="opacity:0.3">${icons.eye}</button>`}
                        </td>
                    </tr>`;
                }).join('')}</tbody>
            </table></div>
            <div class="table-count">Mostrando <span id="dev-showing">${allDevs.length}</span> de ${allDevs.length}</div>`
                : `<div class="empty-state">${icons.server}<p>No hay dispositivos registrados</p><small>Añade dispositivos directamente o desde un bastidor</small></div>`}
        </div>
    </div>`;
}

function showStandaloneDeviceForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;
    const regOpts = store.regions.map(r => `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    showModal('Dispositivo', `
        <div class="form-row">
            <div class="form-group"><label>Nombre</label><input id="fd-name" value="${d ? d.name : ''}" placeholder="Ej: CAM-GARITA-01"></div>
            <div class="form-group"><label>Dispositivo</label><input id="fd-device" value="${d ? d.device : ''}" placeholder="Ej: Cámara IP"></div>
        </div>
        <div class="form-group"><label>Descripción</label><textarea id="fd-desc" placeholder="Descripción...">${d ? d.description || '' : ''}</textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="fd-brand" value="${d ? d.brand : ''}" placeholder="Ej: Hikvision"></div>
            <div class="form-group"><label>Modelo</label><input id="fd-model" value="${d ? d.model : ''}" placeholder="Ej: DS-2CD2143G2-I"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Serie</label><input id="fd-serial" value="${d ? d.serial : ''}" placeholder="Nro. de serie"></div>
            <div class="form-group"><label>Estado</label>
                <select id="fd-status">
                    <option ${d && d.status === 'Stock' ? 'selected' : ''}>Stock</option>
                    <option ${d && d.status === 'Desuso' ? 'selected' : ''}>Desuso</option>
                    <option ${d && d.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>IP</label><input id="fd-ip" value="${d ? d.ip : ''}" placeholder="192.168.1.1" oninput="this.value=this.value.replace(/[^0-9.]/g,'')"></div>
            <div class="form-group"><label>MAC</label><input id="fd-mac" value="${d ? d.mac : ''}" placeholder="AA:BB:CC:DD:EE:FF"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fd-region">${regOpts}</select></div>
            <div class="form-group"><label>Área</label>
                <select id="fd-area">
                    ${FIXED_AREAS.map(a => `<option ${d && d.area === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-group"><label>Comentario</label><textarea id="fd-comment" placeholder="Notas...">${d ? d.comment || '' : ''}</textarea></div>
    `, () => {
        const name = document.getElementById('fd-name').value.trim();
        if (!name) return alert('El nombre es requerido');
        const obj = {
            name,
            device: document.getElementById('fd-device').value.trim(),
            description: document.getElementById('fd-desc').value.trim(),
            brand: document.getElementById('fd-brand').value.trim(),
            model: document.getElementById('fd-model').value.trim(),
            serial: document.getElementById('fd-serial').value.trim(),
            status: document.getElementById('fd-status').value,
            ip: document.getElementById('fd-ip').value.trim(),
            mac: document.getElementById('fd-mac').value.trim(),
            regionId: document.getElementById('fd-region').value,
            area: document.getElementById('fd-area').value,
            comment: document.getElementById('fd-comment').value.trim()
        };
        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });
        save(); closeModal(); render();
    }, id ? 'Guardar cambios' : 'Crear dispositivo');
}

function deleteStandaloneDevice(id) {
    if (!confirm('¿Eliminar este dispositivo?')) return;
    store.devices = store.devices.filter(d => d.id !== id);
    save(); render();
}

function filterDeviceTable(searchInput) {
    const search = searchInput ? searchInput.value.toLowerCase() : document.querySelector('#devices-tbody')?.closest('.card')?.querySelector('.search-box input')?.value?.toLowerCase() || '';
    const areaFilter = document.getElementById('dev-area-filter')?.value || '';
    const rows = document.querySelectorAll('#devices-tbody tr');
    let count = 0;
    rows.forEach(row => {
        const text = row.dataset.search?.toLowerCase() || '';
        const area = row.dataset.area || '';
        const matchSearch = !search || text.includes(search);
        const matchArea = !areaFilter || area === areaFilter;
        const show = matchSearch && matchArea;
        row.style.display = show ? '' : 'none';
        if (show) count++;
    });
    const showing = document.getElementById('dev-showing');
    if (showing) showing.textContent = count;
}
