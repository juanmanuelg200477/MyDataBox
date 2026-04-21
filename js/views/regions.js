function renderRegions(app) {
    setBreadcrumb('Organización', 'Regiones');
    app.innerHTML = `<div class="view-transition">
        <div class="page-header">
            <h1>Regiones</h1>
            <div class="page-header-actions">
                <button class="btn btn-primary" onclick="showRegionForm()">${icons.plus} Añadir</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Resultados <span style="background:var(--primary);color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-left:6px">${store.regions.length}</span></h2>
                <div class="search-box">${icons.search}<input type="text" placeholder="Buscar región..." oninput="filterTable(this,'regions-tbody')"></div>
            </div>
            ${store.regions.length ? `<table>
                <thead><tr><th>Nombre</th><th>Ubicación</th><th>Áreas</th><th>Acciones</th></tr></thead>
                <tbody id="regions-tbody">${store.regions.map(r => {
                    const areaCount = store.areas.filter(a => a.regionId === r.id).length;
                    return `<tr data-search="${r.name} ${r.location}">
                        <td><span class="link" onclick="navigate('areas')">${r.name}</span></td>
                        <td>${r.location || '—'}</td>
                        <td><span class="badge badge-info">${areaCount}</span></td>
                        <td>
                            <button class="btn-icon" onclick="showRegionForm('${r.id}')" title="Editar">${icons.edit}</button>
                            <button class="btn-icon danger" onclick="deleteRegion('${r.id}')" title="Eliminar">${icons.trash}</button>
                        </td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
            <div class="table-count">Mostrando ${store.regions.length} de ${store.regions.length}</div>`
                : `<div class="empty-state">${icons.globe}<p>No hay regiones creadas</p><small>Añade tu primera región para comenzar</small></div>`}
        </div>
    </div>`;
}

function showRegionForm(id) {
    const r = id ? store.regions.find(x => x.id === id) : null;
    showModal('Región', `
        <div class="form-group"><label>Nombre</label><input id="f-name" value="${r ? r.name : ''}" placeholder="Ej: COINCO"></div>
        <div class="form-group"><label>Ubicación</label><input id="f-location" value="${r ? r.location : ''}" placeholder="Ej: Escuintla, Guatemala"></div>
    `, () => {
        const name = document.getElementById('f-name').value.trim();
        const location = document.getElementById('f-location').value.trim();
        if (!name) return alert('El nombre es requerido');
        if (r) { r.name = name; r.location = location; }
        else store.regions.push({ id: genId(), name, location });
        save(); closeModal(); render();
    }, id ? 'Guardar cambios' : 'Crear región');
}

function deleteRegion(id) {
    if (!confirm('¿Eliminar esta región? Se eliminarán las áreas y contactos asociados.')) return;
    store.areas = store.areas.filter(a => a.regionId !== id);
    store.contacts = store.contacts.filter(c => c.regionId !== id);
    store.regions = store.regions.filter(r => r.id !== id);
    save(); render();
}
