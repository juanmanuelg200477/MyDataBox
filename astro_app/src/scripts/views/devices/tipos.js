// ─────────────────────────────────────────────────────────────
// TIPOS DE DISPOSITIVO — gestión de las categorías personalizadas.
// El botón "Gestionar Tipos" está oculto a petición; la vista solo se
// abre con navigateToManageTypes() (navegacion.js).
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, genId, save } from '../../store.js';
import { icons } from '../../icons.js';
import { showModal, closeModal } from '../../modal.js';

// ─────────────────────────────────────────────────────────────
// CRUD: Category Types (admin)
// ─────────────────────────────────────────────────────────────
export function renderCategoriesTable() {
    const tbody = document.getElementById('cats-tbody');
    const emptyState = document.getElementById('cats-empty-state');
    const tableContainer = document.getElementById('cats-table-container');
    if (!tbody) return;

    if (!store.categories || store.categories.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        tableContainer.style.display = 'block';
        emptyState.style.display = 'none';

        tbody.innerHTML = store.categories.map(c => `<tr>
            <td><strong>${c.name}</strong></td>
            <td style="text-align:right">
                <button class="btn-icon btn-edit-cat" data-id="${c.id}">${icons.edit}</button>
                <button class="btn-icon danger btn-delete-cat" data-id="${c.id}">${icons.trash}</button>
            </td>
        </tr>`).join('');

        document.querySelectorAll('.btn-edit-cat').forEach(b =>
            b.addEventListener('click', e => showCategoryForm(e.currentTarget.dataset.id))
        );
        document.querySelectorAll('.btn-delete-cat').forEach(b =>
            b.addEventListener('click', e => deleteCategory(e.currentTarget.dataset.id))
        );
    }
}

export function showCategoryForm(id) {
    if (!store.categories) store.categories = [];
    const c = id ? store.categories.find(x => x.id === id) : null;

    showModal('Tipo de Dispositivo', `
        <div class="form-group">
            <label>Nombre del Tipo / Categoría</label>
            <input id="fc-name" value="${c ? c.name : ''}"
                   placeholder="Ej: Switch, Cámaras, Firewall, UPS…">
        </div>
    `, () => {
        const name = document.getElementById('fc-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        if (c) {
            c.name = name;
        } else {
            store.categories.push({ id: genId(), name });
        }
        save();
        closeModal();
        renderCategoriesTable();
    }, id ? 'Guardar' : 'Crear');
}

function deleteCategory(id) {
    if (!confirm('¿Eliminar este tipo? Los dispositivos que ya lo usen no serán borrados.')) return;
    store.categories = store.categories.filter(c => c.id !== id);
    save();
    renderCategoriesTable();
}
