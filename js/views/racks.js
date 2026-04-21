function renderRacks(app) {
    setBreadcrumb('Infraestructura', 'Bastidores');
    app.innerHTML = `<div class="view-transition">
        <div class="page-header">
            <h1>Bastidores</h1>
            <div class="page-header-actions">
                <button class="btn btn-primary" onclick="showRackForm()">${icons.plus} Añadir</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Resultados <span style="background:var(--primary);color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-left:6px">${store.racks.length}</span></h2>
                <div class="search-box">${icons.search}<input type="text" placeholder="Buscar bastidor..." oninput="filterTable(this,'racks-tbody')"></div>
            </div>
            ${store.racks.length ? `<table>
                <thead><tr><th>Nombre</th><th>Región</th><th>Área</th><th>Estado</th><th>Tipo</th><th>Altura</th><th>Dispositivos</th><th>Espacio</th><th>Acciones</th></tr></thead>
                <tbody id="racks-tbody">${store.racks.map(r => {
                    const reg = store.regions.find(x => x.id === r.regionId);
                    const area = store.areas.find(x => x.id === r.areaId);
                    const slotCount = r.slots ? Object.keys(r.slots).length : 0;
                    const totalU = parseInt(r.height) || 42;
                    const pct = Math.round((slotCount / totalU) * 100);
                    const barColor = pct < 30 ? 'var(--success)' : pct < 70 ? 'var(--warning)' : 'var(--danger)';
                    return `<tr data-search="${r.name} ${reg ? reg.name : ''} ${area ? area.name : ''}">
                        <td><span class="link" onclick="navigate('rackView',{rackId:'${r.id}'})">${r.name}</span></td>
                        <td>${reg ? reg.name : '—'}</td>
                        <td><span class="badge badge-purple">${area ? area.name : '—'}</span></td>
                        <td><span class="badge ${r.status === 'Activo' ? 'badge-active' : 'badge-warning'}">${r.status}</span></td>
                        <td>${r.type || '—'}</td>
                        <td style="font-family:'JetBrains Mono',monospace">${totalU}U</td>
                        <td style="font-family:'JetBrains Mono',monospace">${slotCount}</td>
                        <td>
                            <div class="space-bar">
                                <div class="space-bar-fill"><div style="width:${pct}%;background:${barColor}"></div></div>
                                <span class="space-bar-pct">${pct}%</span>
                            </div>
                        </td>
                        <td style="white-space:nowrap">
                            <button class="btn-icon" onclick="navigate('rackView',{rackId:'${r.id}'})" title="Ver">${icons.eye}</button>
                            <button class="btn-icon" onclick="showRackForm('${r.id}')" title="Editar">${icons.edit}</button>
                            <button class="btn-icon danger" onclick="deleteRack('${r.id}')" title="Eliminar">${icons.trash}</button>
                        </td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
            <div class="table-count">Mostrando ${store.racks.length} de ${store.racks.length}</div>`
                : `<div class="empty-state">${icons.rack}<p>No hay bastidores creados</p><small>Crea regiones y áreas, luego añade bastidores</small></div>`}
        </div>
    </div>`;
}

function showRackForm(id) {
    if (!store.regions.length) return alert('Primero debes crear al menos una región');
    const r = id ? store.racks.find(x => x.id === id) : null;
    const regOpts = store.regions.map(rg => `<option value="${rg.id}" ${r && r.regionId === rg.id ? 'selected' : ''}>${rg.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.id}" ${r && r.areaId === a.id ? 'selected' : ''}>${a.name}</option>`).join('');
    showModal('Bastidor', `
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="f-region" onchange="updateAreaOptions()">${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="f-area">${areaOpts}</select></div>
        </div>
        <div class="form-group"><label>Nombre</label><input id="f-name" value="${r ? r.name : ''}" placeholder="Ej: RACK-COINCO-01"></div>
        <div class="form-row">
            <div class="form-group"><label>Estado</label><select id="f-status"><option ${r && r.status === 'Activo' ? 'selected' : ''}>Activo</option><option ${r && r.status === 'En Reposo' ? 'selected' : ''}>En Reposo</option></select></div>
            <div class="form-group"><label>Tipo</label><select id="f-type"><option ${r && r.type === 'Rack' ? 'selected' : ''}>Rack</option><option ${r && r.type === 'Gabinete' ? 'selected' : ''}>Gabinete</option></select></div>
        </div>
        <div class="form-group"><label>Descripción</label><textarea id="f-desc" placeholder="Descripción del bastidor...">${r ? r.description : ''}</textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Anchura (cm)</label><input id="f-width" type="number" value="${r ? r.width : ''}" placeholder="Ej: 60"></div>
            <div class="form-group"><label>Altura (U) — Máx. 50</label><input id="f-height" type="number" min="1" max="50" value="${r ? r.height : ''}" placeholder="Ej: 42"></div>
        </div>
    `, () => {
        const regionId = document.getElementById('f-region').value;
        const areaId = document.getElementById('f-area').value;
        const name = document.getElementById('f-name').value.trim();
        const status = document.getElementById('f-status').value;
        const type = document.getElementById('f-type').value;
        const description = document.getElementById('f-desc').value.trim();
        const width = document.getElementById('f-width').value;
        let height = parseInt(document.getElementById('f-height').value) || 42;
        if (height > 50) height = 50; if (height < 1) height = 1;
        if (!name) return alert('El nombre es requerido');
        if (r) { Object.assign(r, { regionId, areaId, name, status, type, description, width, height: String(height) }); }
        else store.racks.push({ id: genId(), regionId, areaId, name, status, type, description, width, height: String(height), slots: {} });
        save(); closeModal();
        if (!id) navigate('rackView', { rackId: store.racks[store.racks.length - 1].id });
        else render();
    }, id ? 'Guardar cambios' : 'Crear bastidor');
}

function updateAreaOptions() {
    const regId = document.getElementById('f-region').value;
    const areaSelect = document.getElementById('f-area');
    if (!areaSelect) return;
    const filtered = store.areas.filter(a => a.regionId === regId);
    areaSelect.innerHTML = filtered.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

function deleteRack(id) {
    if (!confirm('¿Eliminar este bastidor y todos sus dispositivos?')) return;
    store.racks = store.racks.filter(r => r.id !== id);
    save(); render();
}

function renderRackView(app) {
    const rack = store.racks.find(r => r.id === viewState.rackId);
    if (!rack) return navigate('racks');
    const reg = store.regions.find(r => r.id === rack.regionId);
    const area = store.areas.find(a => a.id === rack.areaId);
    const totalU = parseInt(rack.height) || 42;
    const slotCount = rack.slots ? Object.keys(rack.slots).length : 0;
    const pct = Math.round((slotCount / totalU) * 100);

    setBreadcrumb('Infraestructura', 'Bastidores', rack.name);

    let rackRows = '';
    for (let u = totalU; u >= 1; u--) {
        const dev = rack.slots && rack.slots[u];
        if (dev) {
            rackRows += `<tr>
                <td class="rack-u-num">${u}</td>
                <td class="rack-u-slot occupied">
                    <div class="rack-device" style="background:${dev.color || '#38a169'}" onclick="navigate('rackDevice',{rackId:'${rack.id}',unit:${u}})">${dev.name}</div>
                </td>
            </tr>`;
        } else {
            rackRows += `<tr>
                <td class="rack-u-num">${u}</td>
                <td class="rack-u-slot" onclick="navigate('rackDevice',{rackId:'${rack.id}',unit:${u}})"></td>
            </tr>`;
        }
    }

    app.innerHTML = `<div class="view-transition">
        <div class="page-header">
            <h1>${icons.rack} ${rack.name}</h1>
            <div class="page-header-actions">
                <button class="btn btn-outline" onclick="navigate('racks')">← Volver</button>
                <button class="btn btn-primary" onclick="showRackForm('${rack.id}')">${icons.edit} Editar bastidor</button>
            </div>
        </div>
        <div class="rack-view">
            <div>
                <div class="rack-specs">
                    <div class="rack-specs-header">${icons.rack} Especificaciones</div>
                    <table>
                        <tr><td>Nombre</td><td><strong>${rack.name}</strong></td></tr>
                        <tr><td>Región</td><td><span class="link">${reg ? reg.name : '—'}</span></td></tr>
                        <tr><td>Área</td><td>${area ? area.name : '—'}</td></tr>
                        <tr><td>Estado</td><td><span class="badge ${rack.status === 'Activo' ? 'badge-active' : 'badge-warning'}">${rack.status}</span></td></tr>
                        <tr><td>Tipo</td><td>${rack.type || '—'}</td></tr>
                        <tr><td>Descripción</td><td>${rack.description || '—'}</td></tr>
                        <tr><td>Anchura</td><td>${rack.width ? rack.width + ' cm' : '—'}</td></tr>
                        <tr><td>Altura</td><td><strong>${totalU}U</strong></td></tr>
                        <tr><td>Espacio usado</td><td>
                            <div class="space-bar">
                                <div class="space-bar-fill" style="width:80px"><div style="width:${pct}%;background:${pct < 30 ? 'var(--success)' : pct < 70 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
                                <span class="space-bar-pct">${pct}%</span>
                            </div>
                        </td></tr>
                        <tr><td>Dispositivos</td><td><strong>${slotCount}</strong></td></tr>
                    </table>
                </div>
            </div>
            <div class="rack-elevation">
                <div class="rack-elevation-header">
                    <h3>Elevación del Bastidor</h3>
                    <span style="font-size:12px;color:var(--text-muted)">Click en un slot para agregar dispositivo</span>
                </div>
                <table class="rack-table">${rackRows}</table>
            </div>
        </div>
    </div>`;
}

function renderRackDevice(app) {
    const rack = store.racks.find(r => r.id === viewState.rackId);
    if (!rack) return navigate('racks');
    const unit = viewState.unit;
    const existing = rack.slots && rack.slots[unit];
    const reg = store.regions.find(r => r.id === rack.regionId);
    const area = store.areas.find(a => a.id === rack.areaId);

    setBreadcrumb('Infraestructura', 'Bastidores', rack.name, `U${unit}`);

    app.innerHTML = `<div class="view-transition">
        <div class="page-header">
            <h1>Dispositivo — ${rack.name} / U${unit}</h1>
            <div class="page-header-actions">
                <button class="btn btn-outline" onclick="navigate('rackView',{rackId:'${rack.id}'})">← Volver al rack</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h2>${existing ? 'Editar dispositivo' : 'Agregar dispositivo'}</h2></div>
            <div style="padding:20px">
                <div class="form-row">
                    <div class="form-group"><label>Nombre</label><input id="fd-name" value="${existing ? existing.name : ''}" placeholder="Ej: SW-CORE-01"></div>
                    <div class="form-group"><label>Dispositivo</label><input id="fd-device" value="${existing ? existing.device : ''}" placeholder="Ej: Switch L3"></div>
                </div>
                <div class="form-group"><label>Descripción</label><textarea id="fd-desc" placeholder="Descripción del dispositivo...">${existing ? existing.description : ''}</textarea></div>
                <div class="form-row">
                    <div class="form-group"><label>Rack</label><input id="fd-rack" value="${rack.name}" readonly style="background:#f7fafc;cursor:not-allowed"></div>
                    <div class="form-group"><label>Marca</label><input id="fd-brand" value="${existing ? existing.brand : ''}" placeholder="Ej: Cisco"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Modelo</label><input id="fd-model" value="${existing ? existing.model : ''}" placeholder="Ej: C9200-24P"></div>
                    <div class="form-group"><label>Serie</label><input id="fd-serial" value="${existing ? existing.serial : ''}" placeholder="Nro. de serie"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>IP</label><input id="fd-ip" value="${existing ? existing.ip : ''}" placeholder="192.168.1.1" oninput="this.value=this.value.replace(/[^0-9.]/g,'')"></div>
                    <div class="form-group"><label>MAC</label><input id="fd-mac" value="${existing ? existing.mac : ''}" placeholder="AA:BB:CC:DD:EE:FF"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Estado</label>
                        <select id="fd-status">
                            <option ${existing && existing.status === 'Disponible' ? 'selected' : ''}>Disponible</option>
                            <option ${existing && existing.status === 'No disponible' ? 'selected' : ''}>No disponible</option>
                            <option ${existing && existing.status === 'En reposo' ? 'selected' : ''}>En reposo</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Color en rack</label><input id="fd-color" type="color" value="${existing ? existing.color : '#38a169'}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Región</label><input value="${reg ? reg.name : '—'}" readonly style="background:#f7fafc;cursor:not-allowed"></div>
                    <div class="form-group"><label>Área</label>
                        <select id="fd-area">
                            ${FIXED_AREAS.map(a => `<option ${existing && existing.area === a ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group"><label>Comentario</label><textarea id="fd-comment" placeholder="Notas adicionales...">${existing ? existing.comment || '' : ''}</textarea></div>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;padding-top:16px;border-top:1px solid var(--border)">
                    ${existing ? `<button class="btn btn-danger" onclick="deleteRackDevice('${rack.id}',${unit})">${icons.trash} Eliminar</button>` : ''}
                    <button class="btn btn-outline" onclick="navigate('rackView',{rackId:'${rack.id}'})">Cancelar</button>
                    <button class="btn btn-success" onclick="saveRackDevice('${rack.id}',${unit})">${icons.save} Guardar</button>
                </div>
            </div>
        </div>
    </div>`;
}

function saveRackDevice(rackId, unit) {
    const rack = store.racks.find(r => r.id === rackId);
    if (!rack) return;
    const name = document.getElementById('fd-name').value.trim();
    if (!name) return alert('El nombre es requerido');
    if (!rack.slots) rack.slots = {};
    rack.slots[unit] = {
        name,
        device: document.getElementById('fd-device').value.trim(),
        description: document.getElementById('fd-desc').value.trim(),
        brand: document.getElementById('fd-brand').value.trim(),
        model: document.getElementById('fd-model').value.trim(),
        serial: document.getElementById('fd-serial').value.trim(),
        ip: document.getElementById('fd-ip').value.trim(),
        mac: document.getElementById('fd-mac').value.trim(),
        status: document.getElementById('fd-status').value,
        color: document.getElementById('fd-color').value,
        area: document.getElementById('fd-area').value,
        comment: document.getElementById('fd-comment').value.trim()
    };
    save();
    navigate('rackView', { rackId });
}

function deleteRackDevice(rackId, unit) {
    if (!confirm('¿Eliminar este dispositivo del rack?')) return;
    const rack = store.racks.find(r => r.id === rackId);
    if (rack && rack.slots) delete rack.slots[unit];
    save();
    navigate('rackView', { rackId });
}
