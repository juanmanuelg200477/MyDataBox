function renderContacts(app) {
    setBreadcrumb('Contactos');
    app.innerHTML = `<div class="view-transition">
        <div class="page-header">
            <h1>Contactos</h1>
            <div class="page-header-actions">
                <button class="btn btn-primary" onclick="showContactForm()">${icons.plus} Añadir</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Resultados <span style="background:var(--primary);color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-left:6px">${store.contacts.length}</span></h2>
                <div class="search-box">${icons.search}<input type="text" placeholder="Buscar contacto..." oninput="filterTable(this,'contacts-tbody')"></div>
            </div>
            ${store.contacts.length ? `<table>
                <thead><tr><th>Nombre</th><th>Región</th><th>Cargo</th><th>Teléfono</th><th>Correo</th><th>Acciones</th></tr></thead>
                <tbody id="contacts-tbody">${store.contacts.map(c => {
                    const reg = store.regions.find(r => r.id === c.regionId);
                    return `<tr data-search="${c.name} ${reg ? reg.name : ''} ${c.role} ${c.email}">
                        <td><strong>${c.name}</strong></td>
                        <td><span class="badge badge-teal">${reg ? reg.name : '—'}</span></td>
                        <td>${c.role || '—'}</td>
                        <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${c.phone || '—'}</td>
                        <td><span class="link">${c.email || '—'}</span></td>
                        <td>
                            <button class="btn-icon" onclick="showContactForm('${c.id}')">${icons.edit}</button>
                            <button class="btn-icon danger" onclick="deleteContact('${c.id}')">${icons.trash}</button>
                        </td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
            <div class="table-count">Mostrando ${store.contacts.length} de ${store.contacts.length}</div>`
                : `<div class="empty-state">${icons.users}<p>No hay contactos registrados</p><small>Añade contactos asignados a cada región</small></div>`}
        </div>
    </div>`;
}

function showContactForm(id) {
    if (!store.regions.length) return alert('Primero debes crear al menos una región');
    const c = id ? store.contacts.find(x => x.id === id) : null;
    const regOpts = store.regions.map(r => `<option value="${r.id}" ${c && c.regionId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    showModal('Contacto', `
        <div class="form-group"><label>Región</label><select id="f-region">${regOpts}</select></div>
        <div class="form-group"><label>Nombre completo</label><input id="f-name" value="${c ? c.name : ''}" placeholder="Nombre del contacto"></div>
        <div class="form-row">
            <div class="form-group"><label>Teléfono</label><input id="f-phone" value="${c ? c.phone : ''}" placeholder="+502 0000-0000"></div>
            <div class="form-group"><label>Cargo</label><input id="f-role" value="${c ? c.role : ''}" placeholder="Ej: Jefe de IT"></div>
        </div>
        <div class="form-group"><label>Correo electrónico</label><input id="f-email" type="email" value="${c ? c.email : ''}" placeholder="correo@ejemplo.com"></div>
    `, () => {
        const regionId = document.getElementById('f-region').value;
        const name = document.getElementById('f-name').value.trim();
        const phone = document.getElementById('f-phone').value.trim();
        const role = document.getElementById('f-role').value.trim();
        const email = document.getElementById('f-email').value.trim();
        if (!name) return alert('El nombre es requerido');
        if (c) { Object.assign(c, { regionId, name, phone, role, email }); }
        else store.contacts.push({ id: genId(), regionId, name, phone, role, email });
        save(); closeModal(); render();
    }, id ? 'Guardar cambios' : 'Crear contacto');
}

function deleteContact(id) {
    if (!confirm('¿Eliminar este contacto?')) return;
    store.contacts = store.contacts.filter(c => c.id !== id);
    save(); render();
}
