// ─────────────────────────────────────────────────────────────
// COMÚN — paginación, filtros sencillos y lista de equipos conectables
// que comparten las tablas de cada tipo de dispositivo.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { getAllDevices, store } from '../../store.js';
import { CATEGORY_MAP } from './categorias.js';

export function generatePagination(container, totalItems, itemsPerPage, currentPage, onPageClick) {
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    let paginationHTML = `<div style="display:flex; gap:4px; align-items:center;">`;

    // Prev button
    paginationHTML += `<button class="btn btn-sm btn-outline" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} title="Anterior">&laquo;</button>`;

    const maxPagesToShow = 7;
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor((maxPagesToShow - 3) / 2);
        const maxPagesAfterCurrent = Math.ceil((maxPagesToShow - 3) / 2);
        if (currentPage <= maxPagesBeforeCurrent + 1) {
            startPage = 1;
            endPage = maxPagesToShow - 2;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - (maxPagesToShow - 3);
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }

    if (startPage > 1) {
        paginationHTML += `<button class="btn btn-sm btn-outline" data-page="1">1</button>`;
        if (startPage > 2) paginationHTML += `<span class="pagination-ellipsis" style="padding: 0 5px; user-select: none;">&hellip;</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) paginationHTML += `<span class="pagination-ellipsis" style="padding: 0 5px; user-select: none;">&hellip;</span>`;
        paginationHTML += `<button class="btn btn-sm btn-outline" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHTML += `<button class="btn btn-sm btn-outline" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} title="Siguiente">&raquo;</button></div>`;
    const pageInfo = `<div style="font-size:13px; color:var(--text-muted); font-weight:500;">Página ${currentPage} de ${totalPages}</div>`;
    container.innerHTML = `${pageInfo}${paginationHTML}`;

    container.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newPage = parseInt(e.currentTarget.dataset.page, 10);
            if (newPage && newPage >= 1 && newPage <= totalPages && newPage !== currentPage) onPageClick(newPage);
        });
    });
}

export function getConnectableDeviceOptions(selectedId) {
    const excludedMainCategories = ['Protección', 'Elementos'];
    const excludedSubcategories = CATEGORY_MAP
        .filter(c => excludedMainCategories.includes(c.name))
        .flatMap(c => c.subcategories);

    excludedSubcategories.push('UPS');

    const connectableDevices = getAllDevices().filter(d => {
        const deviceType = (d.device || '').toLowerCase();
        return !excludedSubcategories.map(s => s.toLowerCase()).includes(deviceType);
    });

    const grouped = connectableDevices.reduce((acc, dev) => {
        const groupName = dev.device || 'Sin Categoría';
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(dev);
        return acc;
    }, {});

    let optionsHTML = '<option value="">-- Ninguno --</option>';
    for (const groupName in grouped) {
        optionsHTML += `<optgroup label="${groupName}">`;
        optionsHTML += grouped[groupName].map(dev =>
            `<option value="${dev.id}" ${selectedId === dev.id ? 'selected' : ''}>${dev.name}</option>`
        ).join('');
        optionsHTML += `</optgroup>`;
    }
    return optionsHTML;
}

export function setupSimpleFilters(prefix, filtersObj, allDevs, deviceTypeLower, onUpdate) {
    const filterContainer = document.getElementById('dev-region-filter')?.parentElement;
    if (!filterContainer) return;

    const searchInput = document.getElementById('search-devices');
    if (searchInput) {
        searchInput.placeholder = `Buscar en ${deviceTypeLower}...`;
        searchInput.oninput = (e) => { filtersObj.globalSearch = e.target.value; onUpdate(); };
        searchInput.value = filtersObj.globalSearch || '';
    }
    document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

    const typeDevs = allDevs.filter(d => (d.device || '').toLowerCase() === deviceTypeLower);
    const regionSelect = document.getElementById('dev-region-filter');
    if (regionSelect) {
        const ctxRegions = [...new Set(typeDevs.map(c => c.regionId ? (store.regions.find(r => r.id === c.regionId) || {}).name || '' : '').filter(Boolean).sort())];
        regionSelect.innerHTML = `<option value="">Región</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
        regionSelect.onchange = (e) => { filtersObj.regionName = e.target.value; onUpdate(); };
    }
    const areaSelect = document.getElementById('dev-area-filter');
    if (areaSelect) {
        const ctxAreas = [...new Set(typeDevs.map(c => c.area).filter(Boolean).sort())];
        areaSelect.innerHTML = `<option value="">Área</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
        areaSelect.onchange = (e) => { filtersObj.area = e.target.value; onUpdate(); };
    }

    document.getElementById(`${prefix}-filters-wrapper`)?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = `${prefix}-filters-wrapper`;
    wrapper.style.display = 'contents';

    const uniqueBrands = [...new Set(typeDevs.map(c => c.brand).filter(Boolean).sort())];
    if (uniqueBrands.length > 0) {
        const brandSel = regionSelect ? regionSelect.cloneNode(false) : document.createElement('select');
        brandSel.id = `${prefix}-filter-brand`;
        brandSel.innerHTML = `<option value="">Marca</option>` + uniqueBrands.map(b => `<option value="${b}" ${filtersObj.brand === b ? 'selected' : ''}>${b}</option>`).join('');
        brandSel.onchange = (e) => { filtersObj.brand = e.target.value; onUpdate(); };
        wrapper.appendChild(brandSel);
    }

    filterContainer.appendChild(wrapper);
}
