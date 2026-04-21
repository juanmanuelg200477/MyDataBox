function renderAreas(app) {
    setBreadcrumb('Organización', 'Áreas');
    app.innerHTML = `<div class="view-transition">
        <div class="page-header">
            <h1>Áreas</h1>
            <div class="page-header-actions">
                <button class="btn btn-primary" onclick="showAreaForm()">${icons.plus} Añadir</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Resultados <span style="background:var(--primary);color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-left:6px">${store.areas.length}</span></h2>
                <div class="search-box">${icons.search}<input type="text" placeholder="Buscar área..." oninput="filterTable(this,'areas-tbody')"></div>
            </div>
            ${store.areas.length ? `<table>
                <thead><tr><th>Nombre</th><th>Región</th><th>Descripción</th><th>Acciones</th></tr></thead>
                <tbody id="areas-tbody">${store.areas.map(a => {
                    const reg = store.regions.find(r => r.id === a.regionId);
                    return `<tr data-search="${a.name} ${reg ? reg.name : ''}">
                        <td><strong>${a.name}</strong></td>
                        <td><span class="badge badge-teal">${reg ? reg.name : '—'}</span></td>
                        <td style="color:var(--text-muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description || '—'}</td>
                        <td>
                            <button class="btn-icon" onclick="showAreaForm('${a.id}')">${icons.edit}</button>
                            <button class="btn-icon danger" onclick="deleteArea('${a.id}')">${icons.trash}</button>
                        </td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
            <div class="table-count">Mostrando ${store.areas.length} de ${store.areas.length}</div>`
                : `<div class="empty-state">${icons.grid}<p>No hay áreas creadas</p><small>Crea regiones primero, luego añade áreas</small></div>`}
        </div>
    </div>`;
}

function showAreaForm(id) {
    if (!store.regions.length) return alert('Primero debes crear al menos una región');
    const a = id ? store.areas.find(x => x.id === id) : null;
    const regOpts = store.regions.map(r => `<option value="${r.id}" ${a && a.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    showModal('Área', `
        <div class="form-group"><label>Región</label><select id="f-region">${regOpts}</select></div>
        <div class="form-group"><label>Nombre</label><input id="f-name" value="${a ? a.name : ''}" placeholder="Ej: DATA CENTER"></div>
        <div class="form-group"><label>Descripción / Comentario</label><textarea id="f-desc" placeholder="Descripción breve del área...">${a ? a.description : ''}</textarea></div>
    `, () => {
        const regionId = document.getElementById('f-region').value;
        const name = document.getElementById('f-name').value.trim();
        const description = document.getElementById('f-desc').value.trim();
        if (!name) return alert('El nombre es requerido');
        if (a) { a.regionId = regionId; a.name = name; a.description = description; }
        else store.areas.push({ id: genId(), regionId, name, description });
        save(); closeModal(); render();
    }, id ? 'Guardar cambios' : 'Crear área');
}

function deleteArea(id) {
    if (!confirm('¿Eliminar esta área?')) return;
    store.areas = store.areas.filter(a => a.id !== id);
    save(); render();
}
