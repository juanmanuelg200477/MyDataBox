import { store, save, genId } from '../store.js';
import { icons } from '../icons.js';
import { showModal, closeModal } from '../modal.js';
import { labelTableCells, renderPager } from '../utils.js';

const PAGE_SIZE = 10;

// Estado de la vista. El módulo persiste entre navegaciones de Astro,
// así que initAreas() lo reinicia al entrar.
let _page  = 1;
let _query = '';

export function initAreas() {
    const tbody = document.getElementById('areas-tbody');
    if (!tbody) return;

    _page  = 1;
    _query = '';

    document.getElementById('btn-add-area')?.addEventListener('click', () => showAreaForm(null));

    // La búsqueda ya no oculta filas: filtra el conjunto completo y vuelve
    // a paginar, porque si no solo buscaría dentro de la página visible.
    document.getElementById('search-areas')?.addEventListener('input', (e) => {
        _query = e.target.value;
        _page  = 1;
        renderAreasTable();
    });

    renderAreasTable();
}

// Áreas que pasan el filtro, con el nombre de su región ya resuelto.
function getFiltered() {
    const conRegion = store.areas.map(a => ({
        ...a,
        regionName: store.regions.find(r => r.id === a.regionId)?.name ?? ''
    }));

    const q = _query.toLowerCase().trim();
    if (!q) return conRegion;

    return conRegion.filter(a =>
        `${a.name} ${a.regionName} ${a.description ?? ''}`.toLowerCase().includes(q)
    );
}

function renderAreasTable() {
    const tbody          = document.getElementById('areas-tbody');
    const emptyState     = document.getElementById('areas-empty-state');
    const tableContainer = document.getElementById('areas-table-container');
    const countDisplay   = document.getElementById('areas-count');
    const showingDisplay = document.getElementById('areas-showing-count');
    if (!tbody) return;

    if (store.areas.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display     = 'flex';
        countDisplay.textContent     = '0';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display     = 'none';
    countDisplay.textContent     = store.areas.length;

    const filtradas    = getFiltered();
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));

    // Tras borrar o filtrar, la página actual puede quedar fuera de rango
    if (_page > totalPaginas) _page = totalPaginas;

    const inicio = (_page - 1) * PAGE_SIZE;
    const pagina = filtradas.slice(inicio, inicio + PAGE_SIZE);

    if (pagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="cell-no-results">Sin resultados para “${_query}”</td></tr>`;
        showingDisplay.textContent = `Mostrando 0 de ${store.areas.length}`;
        renderPager('areas-pager', { page: 1, totalPages: 1, onChange: () => {} });
        return;
    }

    tbody.innerHTML = pagina.map(a => `
        <tr>
            <td><strong>${a.name}</strong></td>
            <td><span class="badge badge-teal">${a.regionName || '—'}</span></td>
            <td class="cell-truncate">${a.description || '—'}</td>
            <td>
                <button class="btn-icon btn-edit" data-id="${a.id}">${icons.edit}</button>
                <button class="btn-icon danger btn-delete" data-id="${a.id}">${icons.trash}</button>
            </td>
        </tr>`).join('');

    showingDisplay.textContent =
        `Mostrando ${inicio + 1}–${inicio + pagina.length} de ${filtradas.length}`;

    // Rotula cada celda para que en teléfono la fila se lea como tarjeta
    labelTableCells(tbody);

    renderPager('areas-pager', {
        page: _page,
        totalPages: totalPaginas,
        onChange: (p) => {
            _page = p;
            renderAreasTable();
            document.getElementById('areas-table-container')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    document.querySelectorAll('#areas-tbody .btn-edit').forEach(btn =>
        btn.addEventListener('click', (e) => showAreaForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#areas-tbody .btn-delete').forEach(btn =>
        btn.addEventListener('click', (e) => deleteArea(e.currentTarget.dataset.id))
    );
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
