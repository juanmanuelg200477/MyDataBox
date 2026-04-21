import { store, save, genId } from '../store.js';
import { icons } from '../icons.js';
import { showModal, closeModal } from '../modal.js';
import { filterTable } from '../utils.js';

export function initAreas() {
    const tbody = document.getElementById('areas-tbody');
    if (!tbody) return;
    
    document.getElementById('btn-add-area')?.addEventListener('click', () => showAreaForm(null));
    document.getElementById('search-areas')?.addEventListener('input', (e) => filterTable(e.target, 'areas-tbody'));
    
    renderAreasTable();
}

function renderAreasTable() {
    const tbody = document.getElementById('areas-tbody');
    const emptyState = document.getElementById('areas-empty-state');
    const tableContainer = document.getElementById('areas-table-container');
    const countDisplay = document.getElementById('areas-count');
    const showingDisplay = document.getElementById('areas-showing-count');

    if (store.areas.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        countDisplay.textContent = '0';
    } else {
        tableContainer.style.display = 'block';
        emptyState.style.display = 'none';
        countDisplay.textContent = store.areas.length;
        showingDisplay.textContent = `Mostrando ${store.areas.length} de ${store.areas.length}`;
        
        tbody.innerHTML = store.areas.map(a => {
            const reg = store.regions.find(r => r.id === a.regionId);
            return `<tr data-search="${a.name} ${reg ? reg.name : ''}">
                <td><strong>${a.name}</strong></td>
                <td><span class="badge badge-teal">${reg ? reg.name : '—'}</span></td>
                <td style="color:var(--text-muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description || '—'}</td>
                <td>
                    <button class="btn-icon btn-edit" data-id="${a.id}">${icons.edit}</button>
                    <button class="btn-icon danger btn-delete" data-id="${a.id}">${icons.trash}</button>
                </td>
            </tr>`;
        }).join('');

        document.querySelectorAll('#areas-tbody .btn-edit').forEach(btn => 
            btn.addEventListener('click', (e) => showAreaForm(e.currentTarget.dataset.id))
        );
        document.querySelectorAll('#areas-tbody .btn-delete').forEach(btn => 
            btn.addEventListener('click', (e) => deleteArea(e.currentTarget.dataset.id))
        );
    }
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
        save(); closeModal(); renderAreasTable();
    }, id ? 'Guardar cambios' : 'Crear área');
}

function deleteArea(id) {
    if (!confirm('¿Eliminar esta área?')) return;
    store.areas = store.areas.filter(a => a.id !== id);
    save(); renderAreasTable();
}
