import { store, save, genId } from '../store.js';
import { icons } from '../icons.js';
import { showModal, closeModal } from '../modal.js';
import { filterTable, labelTableCells } from '../utils.js';

export function initRegions() {
    const tbody = document.getElementById('regions-tbody');
    if (!tbody) return;

    document.getElementById('btn-add-region')?.addEventListener('click', () => showRegionForm(null));
    document.getElementById('search-regions')?.addEventListener('input', (e) => filterTable(e.target, 'regions-tbody'));

    renderRegionsTable();
}

// ── Render table ─────────────────────────────────────────
function renderRegionsTable() {
    const tbody         = document.getElementById('regions-tbody');
    const emptyState    = document.getElementById('regions-empty-state');
    const tableContainer= document.getElementById('regions-table-container');
    const countDisplay  = document.getElementById('regions-count');
    const showingDisplay= document.getElementById('regions-showing-count');

    if (store.regions.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        countDisplay.textContent = '0';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    countDisplay.textContent = store.regions.length;
    showingDisplay.textContent = `Mostrando ${store.regions.length} de ${store.regions.length}`;

    tbody.innerHTML = store.regions.map(r => {
        const areaCount = store.areas.filter(a => a.regionId === r.id).length;

        return `<tr data-search="${r.name} ${r.location || ''}">
            <td><a href="/areas" class="link">${r.name}</a></td>
            <td>${r.location || '—'}</td>
            <td><span class="badge badge-info">• ${areaCount}</span></td>
            <td style="white-space:nowrap">
                <button class="btn-icon btn-edit"   data-id="${r.id}" title="Editar">${icons.edit}</button>
                <button class="btn-icon danger btn-delete" data-id="${r.id}" title="Eliminar">${icons.trash}</button>
            </td>
        </tr>`;
    }).join('');

    // Rotula cada celda para que en teléfono la fila se lea como tarjeta
    labelTableCells(tbody);

    document.querySelectorAll('#regions-tbody .btn-edit').forEach(btn =>
        btn.addEventListener('click', e => showRegionForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#regions-tbody .btn-delete').forEach(btn =>
        btn.addEventListener('click', e => deleteRegion(e.currentTarget.dataset.id))
    );
}

// ── Region form ───────────────────────────────────────────
function showRegionForm(id) {
    const r = id ? store.regions.find(x => x.id === id) : null;
    showModal('Región', `
        <div class="form-group">
            <label>Nombre</label>
            <input id="f-name" value="${r ? r.name : ''}" placeholder="Ej: COINCO">
        </div>
        <div class="form-group">
            <label>Ubicación</label>
            <input id="f-location" value="${r ? (r.location || '') : ''}" placeholder="Ej: Escuintla, Guatemala">
        </div>
    `, () => {
        const name     = document.getElementById('f-name').value.trim();
        const location = document.getElementById('f-location').value.trim();
        if (!name) return alert('El nombre es requerido');
        if (r) {
            r.name = name; r.location = location;
        } else {
            store.regions.push({ id: genId(), name, location });
        }
        save(); closeModal(); renderRegionsTable();
    }, id ? 'Guardar cambios' : 'Crear región');
}

function deleteRegion(id) {
    if (!confirm('¿Eliminar esta región? Se eliminarán las áreas y contactos asociados.')) return;
    store.areas    = store.areas.filter(a => a.regionId !== id);
    store.contacts = store.contacts.filter(c => c.regionId !== id);
    store.regions  = store.regions.filter(r => r.id !== id);
    save(); renderRegionsTable();
}
