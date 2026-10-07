import { store, save, genId } from '../store.js';
import { icons } from '../icons.js';
import { showModal, closeModal } from '../modal.js';
import { filterTable, labelTableCells, escapeHtml } from '../utils.js';

export function initContacts() {
    const tbody = document.getElementById('contacts-tbody');
    if (!tbody) return;
    
    document.getElementById('btn-add-contact')?.addEventListener('click', () => showContactForm(null));
    document.getElementById('search-contacts')?.addEventListener('input', (e) => filterTable(e.target, 'contacts-tbody'));
    
    renderContactsTable();
}

function renderContactsTable() {
    const tbody = document.getElementById('contacts-tbody');
    const emptyState = document.getElementById('contacts-empty-state');
    const tableContainer = document.getElementById('contacts-table-container');
    const countDisplay = document.getElementById('contacts-count');
    const showingDisplay = document.getElementById('contacts-showing-count');

    if (store.contacts.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        countDisplay.textContent = '0';
    } else {
        tableContainer.style.display = 'block';
        emptyState.style.display = 'none';
        countDisplay.textContent = store.contacts.length;
        showingDisplay.textContent = `Mostrando ${store.contacts.length} de ${store.contacts.length}`;
        
        tbody.innerHTML = store.contacts.map(c => {
            const reg    = store.regions.find(r => r.id === c.regionId);
            const nombre = escapeHtml(c.name);
            const region = escapeHtml(reg ? reg.name : '—');
            const cargo  = escapeHtml(c.role || '—');

            // En el teléfono lo natural es tocar el número para llamar o el
            // correo para escribir; en escritorio el enlace no estorba.
            const tel = c.phone
                ? `<a href="tel:${escapeHtml(c.phone.replace(/[^+\d]/g, ''))}" class="link">${escapeHtml(c.phone)}</a>`
                : '—';
            const mail = c.email
                ? `<a href="mailto:${escapeHtml(c.email)}" class="link">${escapeHtml(c.email)}</a>`
                : '—';

            return `<tr data-search="${escapeHtml(`${c.name} ${reg ? reg.name : ''} ${c.role ?? ''} ${c.email ?? ''}`)}">
                <td><strong>${nombre}</strong></td>
                <td><span class="badge badge-teal">${region}</span></td>
                <td>${cargo}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${tel}</td>
                <td>${mail}</td>
                <td>
                    <button class="btn-icon btn-edit" data-id="${c.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete" data-id="${c.id}">${icons.trash}</button>
                </td>
            </tr>`;
        }).join('');

        // Rotula cada celda para que en teléfono la fila se lea como tarjeta
        labelTableCells(tbody);

        document.querySelectorAll('#contacts-tbody .btn-edit').forEach(btn =>
            btn.addEventListener('click', (e) => showContactForm(e.currentTarget.dataset.id))
        );
        document.querySelectorAll('#contacts-tbody .btn-delete').forEach(btn => 
            btn.addEventListener('click', (e) => deleteContact(e.currentTarget.dataset.id))
        );
    }
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
        save(); closeModal(); renderContactsTable();
    }, id ? 'Guardar cambios' : 'Crear contacto');
}

function deleteContact(id) {
    if (!confirm('¿Eliminar este contacto?')) return;
    store.contacts = store.contacts.filter(c => c.id !== id);
    save(); renderContactsTable();
}
