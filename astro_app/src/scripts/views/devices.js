import { navigate } from 'astro:transitions/client';
import { store, save, genId, getAllDevices } from '../store.js';
import { icons } from '../icons.js';
import { showModal, closeModal } from '../modal.js';
// ── Módulos por tipo de dispositivo (extraídos de este archivo) ──
import { renderCamerasTable, showCameraForm } from './devices/cameras.js';
import { renderNvrsTable, showNvrForm } from './devices/nvr.js';
import { renderAntennasTable, showAntennaForm } from './devices/antennas.js';
import { renderSwitchesTable, showSwitchForm } from './devices/switches.js';
import { renderSfpsTable, showSfpForm } from './devices/sfp.js';
import { renderApsTable, showApForm } from './devices/ap.js';
import { renderUpsTable, showUpsForm } from './devices/ups.js';
import { renderSuppressorsTable, showSuppressorForm } from './devices/suppressors.js';
import { renderPdusTable, showPduForm } from './devices/pdu.js';
import { renderPatchPanelsTable, showPatchPanelForm } from './devices/patchpanels.js';
import { renderBandejasFibraTable, showBandejaFibraForm } from './devices/bandejasfibra.js';
import { renderOrganizadoresTable, showOrganizadorForm } from './devices/organizadores.js';
import { renderPatchcordsTable, showPatchcordForm } from './devices/patchcords.js';
import { renderPatchcordsFibraTable, showPatchcordFibraForm } from './devices/patchcordsfibra.js';
// ─────────────────────────────────────────────────────────────
// CATEGORY MAP — Predefined visual categories
// Each subcategory name should match the `device` field of devices
// (stored in store.categories names). Matching is case-insensitive.
// ─────────────────────────────────────────────────────────────
const CATEGORY_MAP = [
    {
        id: 'cctv',
        name: 'CCTV',
        description: 'Videovigilancia',
        gradient: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
        accent: '#a5b4fc',
        subcategories: ['Cámaras', 'Antenas', 'NVR'],
        svgPath: `<path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.914L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>`
    },
    {
        id: 'networks',
        name: 'Networks',
        description: 'Infraestructura de Red',
        gradient: 'linear-gradient(135deg, #0284c7 0%, #082f49 100%)',
        accent: '#7dd3fc',
        subcategories: ['Switch', 'SFP', 'Firewall', 'Planta Telefónica'],
        svgPath: `<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="18" cy="7" r="1" fill="currentColor"/><circle cx="14" cy="7" r="1" fill="currentColor"/>`
    },
    {
        id: 'isp',
        name: 'ISP',
        description: 'Conectividad e Internet',
        gradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
        accent: '#6ee7b7',
        subcategories: ['AP', 'Controladoras', 'Routers', 'Reportes', 'ISPs General'],
        svgPath: `<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>`
    },
    {
        id: 'servidores',
        name: 'Servidores',
        description: 'Infraestructura de Cómputo',
        gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
        accent: '#c4b5fd',
        subcategories: ['Servidores'],
        svgPath: `<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6" stroke-width="3" stroke-linecap="round"/><line x1="6" y1="18" x2="6.01" y2="18" stroke-width="3" stroke-linecap="round"/>`
    },
    {
        id: 'proteccion',
        name: 'Protección',
        description: 'Energía y Supresión',
        gradient: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)',
        accent: '#fcd34d',
        subcategories: ['UPS', 'Supresores', 'PDU'],
        svgPath: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`
    },
    {
        id: 'elementos',
        name: 'Elementos',
        description: 'Organización y Cableado',
        gradient: 'linear-gradient(135deg, #475569 0%, #0f172a 100%)',
        accent: '#cbd5e1',
        subcategories: ['Patch Panels', 'Bandejas de fibra', 'Organizadores', 'Patchcords', 'Patchcords de fibra'],
        svgPath: `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`
    },
    {
        id: 'general',
        name: 'General',
        description: 'Todos los Dispositivos',
        gradient: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
        accent: '#93c5fd',
        subcategories: [], // empty = show all
        svgPath: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`
    }
];

// Subcategory color palette (cycles)
const SUBCAT_PALETTE = [
    { gradient: 'linear-gradient(135deg,#1e3a8a,#2563eb)', light: 'rgba(59,130,246,0.06)', border: '#3b82f6' },
    { gradient: 'linear-gradient(135deg,#14532d,#166534)', light: 'rgba(34,197,94,0.06)', border: '#22c55e' },
    { gradient: 'linear-gradient(135deg,#3b0764,#4c1d95)', light: 'rgba(139,92,246,0.06)', border: '#8b5cf6' },
    { gradient: 'linear-gradient(135deg,#7c2d12,#9a3412)', light: 'rgba(249,115,22,0.06)', border: '#f97316' },
    { gradient: 'linear-gradient(135deg,#134e4a,#0f766e)', light: 'rgba(20,184,166,0.06)', border: '#14b8a6' },
    { gradient: 'linear-gradient(135deg,#701a75,#86198f)', light: 'rgba(217,70,239,0.06)', border: '#d946ef' },
    { gradient: 'linear-gradient(135deg,#1e3a5f,#1a4471)', light: 'rgba(14,165,233,0.06)', border: '#0ea5e9' },
    { gradient: 'linear-gradient(135deg,#3f1f00,#78350f)', light: 'rgba(245,158,11,0.06)', border: '#f59e0b' },
];

// Types that belong to "Elementos" — excluded from the General/Todos view
const ELEMENTOS_TYPES = new Set([
    'patch panels', 'bandejas de fibra', 'organizadores', 'patchcords', 'patchcords de fibra'
]);

// ─────────────────────────────────────────────────────────────
// Navigation State
// ─────────────────────────────────────────────────────────────
let currentCategoryId = null;
let currentSubcategory = null;
let allDevicesFilters = { search: '', region: '', area: '' };

// Tokens del hash que refleja el nivel actual en la barra de direcciones.
const NAV_HASH_ROOT  = 'inicio';
const NAV_PARAM_CAT  = 'cat';
const NAV_PARAM_SUB  = 'sub';

// Flags de sincronización con el historial (ver _pushNavState / _onHistoryPop)
let _restoringFromHistory = false;
let _navHistorySynced     = false;
let _navPopstateBound     = false;

// Estado de Cámaras movido a ./devices/cameras.js














// ISPs General state
let _ispLinksRegionId = null;

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
export function initDevices() {
    if (!document.getElementById('devices-module')) return;

    // Cada carga de página arranca su propia sincronización con el historial:
    // el primer nivel que se renderice reemplaza la entrada actual.
    _navHistorySynced = false;

    if (!_navPopstateBound) {
        _navPopstateBound = true;
        window.addEventListener('popstate', _onHistoryPop);
    }

    // Button: manage types (hidden as per request)
    const btnManageTypes = document.getElementById('btn-manage-types');
    if (btnManageTypes) btnManageTypes.style.display = 'none';

    // Button: add device (only visible in device table view)
    document.getElementById('btn-add-device')?.addEventListener('click', () => {
        if (currentSubcategory === 'Cámaras') showCameraForm(null);
        else if (currentSubcategory === 'NVR') showNvrForm(null);
        else if (currentSubcategory === 'Antenas') showAntennaForm(null);
        else if (currentSubcategory === 'Switch') showSwitchForm(null);
        else if (currentSubcategory === 'SFP') showSfpForm(null);
        else if (currentSubcategory === 'AP') showApForm(null);
        else if (currentSubcategory === 'UPS') showUpsForm(null);
        else if (currentSubcategory === 'Supresores') showSuppressorForm(null);
        else if (currentSubcategory === 'PDU') showPduForm(null);
        else if (currentSubcategory === 'Patch Panels') showPatchPanelForm(null);
        else if (currentSubcategory === 'Bandejas de fibra') showBandejaFibraForm(null);
        else if (currentSubcategory === 'Organizadores') showOrganizadorForm(null);
        else if (currentSubcategory === 'Patchcords') showPatchcordForm(null);
        else if (currentSubcategory === 'Patchcords de fibra') showPatchcordFibraForm(null);
        else showStandaloneDeviceForm(null);
    });

    // Button: add category type
    document.getElementById('btn-add-category')?.addEventListener('click', () => showCategoryForm(null));

    // Filters
    document.getElementById('search-devices')?.addEventListener('input', filterDeviceTable);
    document.getElementById('dev-region-filter')?.addEventListener('change', filterDeviceTable);
    document.getElementById('dev-area-filter')?.addEventListener('change', filterDeviceTable);
    document.getElementById('dev-status-filter')?.addEventListener('change', filterDeviceTable);

    // Populate region/area selects
    const regSel = document.getElementById('dev-region-filter');
    if (regSel && store.regions.length) {
        regSel.innerHTML = '<option value="">Todas las regiones</option>' +
            store.regions.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
    }
    const areaSel = document.getElementById('dev-area-filter');
    if (areaSel && store.areas.length) {
        areaSel.innerHTML = '<option value="">Todas las áreas</option>' +
            store.areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    }

    // MagicBento navigation listeners
    document.removeEventListener('nav-category', window._bentoNavCatHandler);
    window._bentoNavCatHandler = (e) => navigateToSubcategories(e.detail);
    document.addEventListener('nav-category', window._bentoNavCatHandler);

    document.removeEventListener('nav-subcategory', window._bentoNavSubHandler);
    window._bentoNavSubHandler = (e) => navigateToDeviceTable(e.detail);
    document.addEventListener('nav-subcategory', window._bentoNavSubHandler);

    // Restauramos el nivel desde la URL (recarga de página o enlace compartido)
    _applyNavState(_readNavFromLocation());
}

// ─────────────────────────────────────────────────────────────
// VIEW HELPERS
// ─────────────────────────────────────────────────────────────
function showView(id) {
    document.querySelectorAll('.dev-view').forEach(v => v.style.display = 'none');
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
    // Reveal module after first navigation (eliminates flash of unstyled content)
    const mod = document.getElementById('devices-module');
    if (mod && mod.style.visibility === 'hidden') {
        mod.style.visibility = 'visible';
        mod.style.opacity    = '1';
    }
}

function updateBreadcrumb() {
    const bc = document.getElementById('dev-breadcrumb');
    const title = document.getElementById('dev-page-title');
    const btnAdd = document.getElementById('btn-add-device');
    if (!bc) return;

    const linkStyle = `all: unset; cursor: pointer; color: var(--text-muted); font-weight: 500; font-size: 14px;`;
    const linkHover = `this.style.textDecoration='underline'`;
    const linkUnhover = `this.style.textDecoration='none'`;

    if (!currentCategoryId) {
        bc.style.display = 'none';
        title.textContent = 'Dispositivos';
        btnAdd.style.display = 'none';
        return;
    }

    bc.style.display = 'flex';

    if (currentCategoryId === '__manage__') {
        bc.innerHTML = `
            <button style="${linkStyle}" onmouseover="${linkHover}" onmouseout="${linkUnhover}" id="bc-home">Dispositivos</button>
            <span class="dev-bc-sep">›</span>
            <span class="dev-bc-current">Gestionar Tipos</span>`;
        title.textContent = 'Tipos de Dispositivo';
        btnAdd.style.display = 'none';
    } else {
        const cat = CATEGORY_MAP.find(c => c.id === currentCategoryId);
        const catName = cat?.name || '';

        if (!currentSubcategory) {
            // Subcategory grid level
            bc.innerHTML = `
                <button style="${linkStyle}" onmouseover="${linkHover}" onmouseout="${linkUnhover}" id="bc-home">Dispositivos</button>
                <span class="dev-bc-sep">›</span>
                <span class="dev-bc-current">${catName}</span>`;
            title.textContent = catName;
            btnAdd.style.display = 'none';
        } else {
            // Device table level
            const hasSubcats = cat && cat.subcategories.length > 0;
            bc.innerHTML = `
                <button style="${linkStyle}" onmouseover="${linkHover}" onmouseout="${linkUnhover}" id="bc-home">Dispositivos</button>
                <span class="dev-bc-sep">›</span>
                ${hasSubcats
                    ? `<button style="${linkStyle}" onmouseover="${linkHover}" onmouseout="${linkUnhover}" id="bc-cat">${catName}</button>`
                    : `<span class="dev-bc-current">${catName}</span>`}
                <span class="dev-bc-sep">›</span>
                <span class="dev-bc-current">${currentSubcategory === '__all__' ? 'Todos' : currentSubcategory}</span>`;
            title.textContent = currentSubcategory === '__all__' ? 'Todos los Dispositivos' : currentSubcategory;
            // Hide add button in General/Todos view — no single device type to add
            btnAdd.style.display = currentSubcategory === '__all__' ? 'none' : 'inline-flex';
        }
    }

    // Attach breadcrumb nav events (re-attached on each render)
    document.getElementById('bc-home')?.addEventListener('click', navigateToCategories);
    document.getElementById('bc-cat')?.addEventListener('click', () => navigateToSubcategories(currentCategoryId));
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────
// ── Sincronización con el historial del navegador ────────────
// El árbol Dispositivos → categoría → subcategoría vivía solo en memoria,
// así que los 3 niveles compartían UNA entrada de historial: un solo
// "atrás" los deshacía todos de golpe (se percibía como retroceder 2
// páginas). Ahora cada nivel escribe su propio paso.
//
// Se usa el HASH y no query params a propósito: el ClientRouter de Astro
// compara pathname+search para decidir si una entrada es "la misma página",
// de modo que con el hash el back/forward se resuelve como navegación
// intra-página (sin refetch ni swap). Y se delega en navigate() de Astro en
// vez de llamar a history.replaceState() directo para no pisar el
// history.state del router (index/scrollX/scrollY) — era precisamente eso
// lo que antes rompía los links del sidebar en el primer clic.
function _buildNavHash(cat, sub) {
    if (!cat) return `#${NAV_HASH_ROOT}`;
    const params = new URLSearchParams();
    params.set(NAV_PARAM_CAT, cat);
    if (sub) params.set(NAV_PARAM_SUB, sub);
    return `#${params}`;
}

function _readNavFromLocation() {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === NAV_HASH_ROOT) return { cat: null, sub: null };
    // Fallback a query params: los enlaces antiguos ?cat=…&sub=… siguen sirviendo.
    const params = new URLSearchParams(hash || window.location.search.replace(/^\?/, ''));
    return { cat: params.get(NAV_PARAM_CAT), sub: params.get(NAV_PARAM_SUB) };
}

function _applyNavState({ cat, sub }) {
    const known = cat ? CATEGORY_MAP.find(c => c.id === cat) : null;
    if (!known) { navigateToCategories(); return; }
    // Las categorías sin subcategorías (General) resuelven su propia vista:
    // delegamos para que rendericen la tabla unificada y no la genérica.
    if (sub && known.subcategories.length) {
        currentCategoryId = cat;
        navigateToDeviceTable(sub);
    } else {
        navigateToSubcategories(cat);
    }
}

function _onHistoryPop() {
    // El listener vive en window (sobrevive a las view transitions), así que
    // ignoramos los popstate disparados desde otras páginas.
    if (!document.getElementById('devices-module')) return;
    _restoringFromHistory = true;
    try {
        _applyNavState(_readNavFromLocation());
    } finally {
        _restoringFromHistory = false;
    }
}

function _pushNavState(cat, sub) {
    // Al restaurar desde el historial no volvemos a escribir en él:
    // duplicaría entradas y dejaría el "atrás" atrapado.
    if (_restoringFromHistory) return;

    const hash = _buildNavHash(cat, sub);
    // El primer nivel renderizado tras cargar la página reemplaza la entrada
    // actual; a partir de ahí cada paso del usuario añade la suya.
    const replace = !_navHistorySynced;
    _navHistorySynced = true;

    // La URL ya refleja este nivel (recarga o enlace directo): nada que escribir.
    if (window.location.hash === hash) return;

    const url = window.location.pathname + window.location.search + hash;
    navigate(url, replace ? { history: 'replace' } : undefined);
}

function navigateToCategories() {
    currentCategoryId = null;
    currentSubcategory = null;
    _pushNavState(null, null);
    updateBreadcrumb();
    renderCategoryGrid();
    showView('view-categories');
}

function navigateToSubcategories(categoryId) {
    const cat = CATEGORY_MAP.find(c => c.id === categoryId);
    if (!cat) return;

    currentCategoryId = categoryId;
    currentSubcategory = null;

    // "General" or category with no subcategories → go straight to device table.
    // Registra UN solo paso de historial: no hay nivel intermedio que deshacer.
    if (cat.subcategories.length === 0) {
        currentSubcategory = '__all__';
        _pushNavState(categoryId, '__all__');
        updateBreadcrumb();
        renderDevicesTable(null);
        showView('view-devices');
        return;
    }

    _pushNavState(categoryId, null);
    updateBreadcrumb();

    // Tell the MagicBento subcategory component which category was selected
    document.dispatchEvent(new CustomEvent('render-subcategories', { detail: categoryId }));
    showView('view-subcategories');
}

function navigateToDeviceTable(subcategoryName) {
    currentSubcategory = subcategoryName;
    _pushNavState(currentCategoryId, subcategoryName);
    updateBreadcrumb();
    renderDevicesTable(subcategoryName);
    showView('view-devices');
}

function navigateToManageTypes() {
    currentCategoryId = '__manage__';
    currentSubcategory = null;
    updateBreadcrumb();
    renderCategoriesTable();
    showView('view-manage-types');
}

// ─────────────────────────────────────────────────────────────
// RENDER: Category Grid
// ─────────────────────────────────────────────────────────────
function renderCategoryGrid() {
    // The grid is now a React component (MagicBento).
    // Navigation is handled via the 'nav-category' custom event listener in initDevices().
}

// ─────────────────────────────────────────────────────────────
// RENDER: Devices Table
// ─────────────────────────────────────────────────────────────
function renderDevicesTable(subcategoryFilter) {
    // Cleanup FIRST — this restores tableContainer.innerHTML if Reportes replaced it,
    // which would make devices-tbody null and cause the early return to fire incorrectly.
    _cleanupAllSpecializedFilters();

    // Vistas especializadas que NO necesitan devices-tbody — van antes del null-check
    if (!subcategoryFilter) {
        renderAllDevicesTable();
        return;
    }
    if (subcategoryFilter === 'Reportes') {
        renderReportesView();
        return;
    }
    if (subcategoryFilter === 'ISPs General') {
        renderIspLinksView();
        return;
    }

    // Para el resto de vistas, devices-tbody debe existir
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');
    if (!tbody) return;

    if (subcategoryFilter === 'Cámaras') {
        renderCamerasTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'NVR') {
        renderNvrsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Antenas') {
        renderAntennasTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Switch') {
        renderSwitchesTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'SFP') {
        renderSfpsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'AP') {
        renderApsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'UPS') {
        renderUpsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Supresores') {
        renderSuppressorsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'PDU') {
        renderPdusTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Patch Panels') {
        renderPatchPanelsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Bandejas de fibra') {
        renderBandejasFibraTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Organizadores') {
        renderOrganizadoresTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Patchcords') {
        renderPatchcordsTable(getAllDevices());
        return;
    }
    if (subcategoryFilter === 'Patchcords de fibra') {
        renderPatchcordsFibraTable(getAllDevices());
        return;
    }

    restoreNormalHeaders(tableContainer);
    let devs = getAllDevices();

    // Filter by subcategory (null or '__all__' = show everything)
    if (subcategoryFilter && subcategoryFilter !== '__all__') {
        devs = devs.filter(d =>
            (d.device || '').toLowerCase() === subcategoryFilter.toLowerCase()
        );
    }

    if (devs.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        countDisplay.textContent = '0';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    countDisplay.textContent = devs.length;
    showingDisplay.textContent = devs.length;
    totalDisplay.textContent = devs.length;

    tbody.innerHTML = devs.map((d, i) => {
        const regName = d.rackRegion
            ? (store.regions.find(r => r.id === d.rackRegion) || {}).name || '—'
            : (d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—');

        const statusClass = d.status === 'Disponible' || d.status === 'Nuevo'
            ? 'badge-active'
            : d.status === 'Stock' ? 'badge-info'
                : d.status === 'En reposo' ? 'badge-warning'
                    : 'badge-inactive';

        const isSwitch = (d.device || '').toLowerCase().includes('switch');
        const nameTag = isSwitch
            ? `<a href="/device?id=${d.id}" class="link" style="color:var(--primary);text-decoration:none">${d.name}</a>`
            : `<strong>${d.name}</strong>`;

        return `<tr
            data-search="${d.name} ${regName} ${d.area || ''} ${d.rack || ''} ${d.device || ''} ${d.brand || ''} ${d.model || ''} ${d.ip || ''}"
            data-region="${regName}" data-area="${d.area || ''}" data-status="${d.status || ''}" data-category="${d.device || ''}">
            <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${i + 1}</td>
            <td>${nameTag}</td>
            <td><span class="badge ${statusClass}">${d.status || '—'}</span></td>
            <td>${regName}</td>
            <td><span class="badge badge-purple">${d.area || '—'}</span></td>
            <td>${d.rack || '—'}</td>
            <td>${d.device || '—'}</td>
            <td>${d.brand || '—'}</td>
            <td style="font-size:12px">${d.model || '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${d.serial || '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${d.ip || '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${d.mac || '—'}</td>
            <td style="white-space:nowrap">
                ${!d.rackId
                ? `<button class="btn-icon btn-edit" data-id="${d.id}">${icons.edit}</button>
                       <button class="btn-icon danger btn-delete" data-id="${d.id}">${icons.trash}</button>`
                : `<a href="/rack?id=${d.rackId}&u=${d.rackUnit}" class="btn-icon" title="Editar en rack">${icons.edit}</a>
                       <button class="btn-icon danger btn-delete-rack" data-rackid="${d.rackId}" data-unit="${d.rackUnit}">${icons.trash}</button>`}
            </td>
        </tr>`;
    }).join('');

    document.querySelectorAll('#devices-tbody .btn-edit').forEach(btn =>
        btn.addEventListener('click', e => showStandaloneDeviceForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete').forEach(btn =>
        btn.addEventListener('click', e => deleteStandaloneDevice(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#devices-tbody .btn-delete-rack').forEach(btn =>
        btn.addEventListener('click', e => deleteRackDeviceFromList(e.currentTarget.dataset.rackid, e.currentTarget.dataset.unit))
    );

    filterDeviceTable();
}

// ─────────────────────────────────────────────────────────────
// FILTER: Device Table
// ─────────────────────────────────────────────────────────────
export function filterDeviceTable() {
    const search = (document.getElementById('search-devices')?.value || '').toLowerCase();
    const regFilter = document.getElementById('dev-region-filter')?.value || '';
    const areaFilter = document.getElementById('dev-area-filter')?.value || '';
    const statusFilter = document.getElementById('dev-status-filter')?.value || '';

    const rows = document.querySelectorAll('#devices-tbody tr');
    let count = 0;

    rows.forEach(row => {
        const text = (row.dataset.search || '').toLowerCase();
        const region = row.dataset.region || '';
        const area = row.dataset.area || '';
        const status = row.dataset.status || '';

        const ok =
            (!search || text.includes(search)) &&
            (!regFilter || region === regFilter) &&
            (!areaFilter || area === areaFilter) &&
            (!statusFilter || status === statusFilter || (statusFilter === 'Disponible' && status === 'Activo'));

        row.style.display = ok ? '' : 'none';
        if (ok) count++;
    });

    const showingEl = document.getElementById('dev-showing');
    if (showingEl) showingEl.textContent = count;
}

// ─────────────────────────────────────────────────────────────
// CRUD: Standalone Device
// ─────────────────────────────────────────────────────────────
function showStandaloneDeviceForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;
    if (!d && store.categories.length === 0) {
        return alert('Por favor crea primero al menos un "Tipo" en "Gestionar Tipos" antes de añadir dispositivos.');
    }

    const regOpts = store.regions.map(r =>
        `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`
    ).join('');

    const catOpts = store.categories.map(c =>
        `<option value="${c.name}" ${d && d.device === c.name ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    showModal('Dispositivo', `
        <div class="form-row">
            <div class="form-group">
                <label>Nombre</label>
                <input id="fd-name" value="${d ? d.name : ''}" placeholder="Ej: CAM-GARITA-01">
            </div>
            <div class="form-group">
                <label>Tipo / Categoría</label>
                <select id="fd-device">
                    ${!d ? '<option value="" disabled selected>Selecciona tipo…</option>' : ''}
                    ${d && d.device && !store.categories.find(c => c.name === d.device)
            ? `<option value="${d.device}" selected>${d.device} (Legado)</option>` : ''}
                    ${catOpts}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Descripción</label>
            <textarea id="fd-desc" placeholder="Descripción…">${d ? d.description || '' : ''}</textarea>
        </div>
        <div class="form-row" id="gs-fr-model">
            <div class="form-group" id="gs-fg-brand">
                <label>Marca</label>
                <input id="fd-brand" value="${d ? d.brand : ''}" placeholder="Ej: Hikvision">
            </div>
            <div class="form-group" id="gs-fg-model">
                <label>Modelo</label>
                <input id="fd-model" value="${d ? d.model : ''}" placeholder="Ej: DS-2CD2143G2-I">
            </div>
        </div>
        <div class="form-row" id="gs-fr-serial">
            <div class="form-group" id="gs-fg-serial">
                <label>Serie</label>
                <input id="fd-serial" value="${d ? d.serial : ''}" placeholder="Nro. de serie">
            </div>
            <div class="form-group" id="gs-fg-status">
                <label>Estado</label>
                <select id="fd-status">
                    <option ${d && d.status === 'Disponible' ? 'selected' : ''}>Disponible</option>
                    <option ${d && d.status === 'Stock' ? 'selected' : ''}>Stock</option>
                    <option ${d && d.status === 'En reposo' ? 'selected' : ''}>En reposo</option>
                    <option ${d && d.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                    <option ${d && d.status === 'Desuso' ? 'selected' : ''}>Desuso</option>
                    <option ${d && d.status === 'Activo' ? 'selected' : ''}>Activo</option>
                    <option ${d && d.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
            </div>
        </div>
        <div class="form-row" id="gs-fr-ip">
            <div class="form-group" id="gs-fg-ip">
                <label>IP</label>
                <input id="fd-ip" value="${d ? d.ip : ''}" placeholder="192.168.1.1"
                       oninput="this.value=this.value.replace(/[^0-9.]/g,'')">
            </div>
            <div class="form-group" id="gs-fg-mac">
                <label>MAC</label>
                <input id="fd-mac" value="${d ? d.mac : ''}" placeholder="AA:BB:CC:DD:EE:FF">
            </div>
        </div>
        <div class="form-row" id="gs-fr-ports" style="display:none">
            <div class="form-group" id="gs-fg-ports" style="display:none">
                <label>Cantidad de Puertos</label>
                <select id="fd-ports">
                    <option value="24" ${d && d.ports === '24' ? 'selected' : ''}>24 Puertos</option>
                    <option value="48" ${d && d.ports === '48' ? 'selected' : ''}>48 Puertos</option>
                </select>
            </div>
            <div class="form-group" id="gs-fg-fiber-ports" style="display:none">
                <label>Puertos de Fibra (SFP)</label>
                <select id="fd-fiber-ports">
                    <option value="0" ${d && d.fiberPorts === '0' ? 'selected' : ''}>0 Puertos SFP</option>
                    <option value="2" ${d && d.fiberPorts === '2' ? 'selected' : ''}>2 Puertos SFP</option>
                    <option value="4" ${d && d.fiberPorts === '4' ? 'selected' : ''}>4 Puertos SFP</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Región</label>
                <select id="fd-region">${regOpts}</select>
            </div>
            <div class="form-group">
                <label>Área</label>
                <select id="fd-area">
                    ${store.areas.map(a =>
                `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`
            ).join('')}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Comentario</label>
            <textarea id="fd-comment" placeholder="Notas…">${d ? d.comment || '' : ''}</textarea>
        </div>
    `, () => {
        const name = document.getElementById('fd-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const obj = {
            name,
            device: document.getElementById('fd-device').value.trim(),
            description: document.getElementById('fd-desc').value.trim(),
            brand: document.getElementById('fd-brand').value.trim(),
            model: document.getElementById('fd-model').value.trim(),
            serial: document.getElementById('fd-serial').value.trim(),
            status: document.getElementById('fd-status').value,
            ip: document.getElementById('fd-ip').value.trim(),
            mac: document.getElementById('fd-mac').value.trim(),
            regionId: document.getElementById('fd-region').value,
            area: document.getElementById('fd-area').value,
            ports: document.getElementById('fd-ports')?.value || null,
            fiberPorts: document.getElementById('fd-fiber-ports')?.value || null,
            comment: document.getElementById('fd-comment').value.trim()
        };

        // Strip irrelevant fields for passive elements
        const val = obj.device.toLowerCase();
        if (val.includes('organizador') || val.includes('bandeja') || val.includes('supresor') || val.includes('patch panel') || val.includes('patchcord')) {
            obj.model = '';
            obj.serial = '';
            obj.ip = '';
            obj.mac = '';
            obj.status = 'Stock';
        }

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderDevicesTable(currentSubcategory && currentSubcategory !== '__all__' ? currentSubcategory : null);
    }, id ? 'Guardar cambios' : 'Crear dispositivo');

    // Reactive form fields
    const updateFormFn = () => {
        const val = document.getElementById('fd-device')?.value.toLowerCase() || '';
        const isBasic = val.includes('organizador') || val.includes('bandeja') || val.includes('supresor') || val.includes('patchcord');
        const isPatch = val.includes('patch panel');
        const isSwitch = val.includes('switch');
        const hideExtra = isBasic || isPatch;

        ['gs-fg-model', 'gs-fg-serial', 'gs-fg-ip', 'gs-fg-mac', 'gs-fg-status'].forEach(fid => {
            const el = document.getElementById(fid);
            if (el) el.style.display = hideExtra ? 'none' : '';
        });

        const frSerial = document.getElementById('gs-fr-serial');
        if (frSerial) frSerial.style.display = hideExtra ? 'none' : '';

        const frIp = document.getElementById('gs-fr-ip');
        if (frIp) frIp.style.display = hideExtra ? 'none' : '';

        const frPorts = document.getElementById('gs-fr-ports');
        if (frPorts) frPorts.style.display = (isPatch || isSwitch) ? 'flex' : 'none';

        const fgPorts = document.getElementById('gs-fg-ports');
        if (fgPorts) fgPorts.style.display = (isPatch || isSwitch) ? 'block' : 'none';

        const fgFiber = document.getElementById('gs-fg-fiber-ports');
        if (fgFiber) fgFiber.style.display = isSwitch ? 'block' : 'none';
    };

    document.getElementById('fd-device')?.addEventListener('change', updateFormFn);
    if (document.getElementById('fd-device')?.value) updateFormFn();
}

export function deleteStandaloneDevice(id) {
    if (!confirm('¿Eliminar este dispositivo?')) return;

    // Rack devices have synthetic ids like "rack_{rackId}_{unit}"
    if (id && id.startsWith('rack_')) {
        const parts = id.split('_'); // ['rack', rackId, unit]
        const rackId = parts[1];
        const unit = parts.slice(2).join('_'); // unit may contain underscores
        const rack = store.racks.find(r => r.id === rackId);
        if (rack && rack.slots) delete rack.slots[unit];
    } else {
        store.devices = store.devices.filter(d => String(d.id) !== String(id));
    }

    save();
    renderDevicesTable(currentSubcategory && currentSubcategory !== '__all__' ? currentSubcategory : null);
}

function deleteRackDeviceFromList(rackId, unit) {
    if (!confirm('¿Eliminar definitivamente este dispositivo del bastidor?')) return;
    const rack = store.racks.find(r => r.id === rackId);
    if (rack && rack.slots && rack.slots[unit]) {
        delete rack.slots[unit];
        save();
        renderDevicesTable(currentSubcategory && currentSubcategory !== '__all__' ? currentSubcategory : null);
    }
}

// ─────────────────────────────────────────────────────────────
// CRUD: Category Types (admin)
// ─────────────────────────────────────────────────────────────
function renderCategoriesTable() {
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

function showCategoryForm(id) {
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

// ─────────────────────────────────────────────────────────────
// GENERAL: Todos los Dispositivos (unified view, excluding Elementos)
// ─────────────────────────────────────────────────────────────
function renderAllDevicesTable() {
    const tbody = document.getElementById('devices-tbody');
    const emptyState = document.getElementById('devices-empty-state');
    const tableContainer = document.getElementById('devices-table-container');
    const thead = tableContainer.querySelector('table thead');
    const countDisplay = document.getElementById('devices-count');
    const showingDisplay = document.getElementById('dev-showing');
    const totalDisplay = document.getElementById('devices-total');
    if (!tbody) return;

    tableContainer.style.overflowX = 'auto';

    if (!thead.dataset.isAllDevices) {
        thead.dataset.isAllDevices = 'true';
        thead.innerHTML = `<tr>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;width:36px;text-align:center;">#</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Nombre</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Tipo</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Estado</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Región</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Área</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Marca</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Modelo</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Serie</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">IP</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">MAC</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Canal</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">NVR</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Pto. SW</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Velocidad</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Puertos</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">SSID</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">KVA</th>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;">Mantenimiento</th>
        </tr>`;

        // Wire up filters
        const allBase = getAllDevices().filter(d => !ELEMENTOS_TYPES.has((d.device || '').toLowerCase()));
        const searchInput = document.getElementById('search-devices');
        if (searchInput) {
            searchInput.placeholder = 'Buscar dispositivo...';
            searchInput.value = allDevicesFilters.search;
            searchInput.oninput = (e) => { allDevicesFilters.search = e.target.value; renderAllDevicesTable(); };
        }
        document.getElementById('dev-status-filter')?.style.setProperty('display', 'none', 'important');

        const regionSelect = document.getElementById('dev-region-filter');
        if (regionSelect) {
            const ctxRegions = [...new Set(allBase.map(d => d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '').filter(Boolean).sort())];
            regionSelect.innerHTML = `<option value="">Todas las regiones</option>` + ctxRegions.map(r => `<option value="${r}">${r}</option>`).join('');
            regionSelect.value = allDevicesFilters.region;
            regionSelect.onchange = (e) => { allDevicesFilters.region = e.target.value; renderAllDevicesTable(); };
        }
        const areaSelect = document.getElementById('dev-area-filter');
        if (areaSelect) {
            const ctxAreas = [...new Set(allBase.map(d => d.area).filter(Boolean).sort())];
            areaSelect.innerHTML = `<option value="">Todas las áreas</option>` + ctxAreas.map(a => `<option value="${a}">${a}</option>`).join('');
            areaSelect.value = allDevicesFilters.area;
            areaSelect.onchange = (e) => { allDevicesFilters.area = e.target.value; renderAllDevicesTable(); };
        }
    }

    // Get all non-Elementos devices
    const allBase = getAllDevices().filter(d => !ELEMENTOS_TYPES.has((d.device || '').toLowerCase()));

    // Apply filters
    const search = allDevicesFilters.search.toLowerCase();
    const regFilter = allDevicesFilters.region;
    const areaFilter = allDevicesFilters.area;
    const filteredDevs = allBase.filter(d => {
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '' : '';
        if (search) {
            const str = `${d.name} ${regName} ${d.area} ${d.device} ${d.brand} ${d.model} ${d.serial} ${d.ip || ''} ${d.mac || ''}`.toLowerCase();
            if (!str.includes(search)) return false;
        }
        if (regFilter && regName !== regFilter) return false;
        if (areaFilter && d.area !== areaFilter) return false;
        return true;
    });

    if (filteredDevs.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        if (countDisplay) countDisplay.textContent = '0';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    if (countDisplay) countDisplay.textContent = allBase.length;
    if (showingDisplay) showingDisplay.textContent = filteredDevs.length;
    if (totalDisplay) totalDisplay.textContent = filteredDevs.length;

    // N/A placeholder
    const NA = `<span style="color:var(--text-muted);font-size:11px;font-style:italic;">N/A</span>`;

    const statusClass = (d) => {
        const s = d.status || '';
        if (['Up', 'Online', 'Activo', 'Disponible', 'Nuevo'].includes(s)) return 'badge-active';
        if (['Down', 'Falla', 'Inactivo', 'Desuso'].includes(s)) return 'badge-inactive';
        if (['Batería', 'Mantenimiento', 'En reposo'].includes(s)) return 'badge-warning';
        if (s === 'Stock') return 'badge-info';
        return 'badge-warning';
    };

    tbody.innerHTML = filteredDevs.map((d, i) => {
        const type = (d.device || '').toLowerCase();
        const regName = d.regionId ? (store.regions.find(r => r.id === d.regionId) || {}).name || '—' : '—';

        const isCamera   = type === 'cámaras';
        const isNvr      = type === 'nvr';
        const isAntenna  = type === 'antenas';
        const isSwitch   = type === 'switch';
        const isSfp      = type === 'sfp';
        const isAp       = type === 'ap';
        const isUps      = type === 'ups';

        // Which columns have meaningful data per type
        const hasIp          = isCamera || isNvr || isAntenna || isSwitch || isAp;
        const hasMac         = isCamera || isNvr || isAntenna || isSwitch || isAp;
        const hasChannel     = isCamera;                              // NVR channel the camera is assigned to
        const hasNvrField    = isCamera;                              // NVR name for cameras
        const hasSwPort      = isCamera || isNvr || isAntenna;        // Switch port
        const hasSpeed       = isSfp;
        const hasPorts       = isSwitch;
        const hasSsid        = isAp;
        const hasKva         = isUps;
        const hasMaintenance = isCamera || isNvr || isAntenna || isSwitch || isSfp;

        // For SFP, show connected switch in the Pto.SW column
        const sfpSwitchName = isSfp && d.connectedSwitchId
            ? (store.devices.find(sw => sw.id === d.connectedSwitchId) || {}).name || '—'
            : null;

        const swPortCell = hasSwPort
            ? (d.swPort || '—')
            : (isSfp ? (sfpSwitchName ? `${sfpSwitchName}${d.port ? ' · ' + d.port : ''}` : '—') : NA);

        return `<tr>
            <td style="width:36px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${i + 1}</td>
            <td style="white-space:nowrap;"><strong>${d.name}</strong></td>
            <td style="white-space:nowrap;font-size:12px;">${d.device || '—'}</td>
            <td style="white-space:nowrap;"><span class="badge ${statusClass(d)}">${d.status || '—'}</span></td>
            <td style="white-space:nowrap;">${regName}</td>
            <td style="white-space:nowrap;"><span class="badge badge-purple">${d.area || '—'}</span></td>
            <td style="white-space:nowrap;">${d.brand || '—'}</td>
            <td style="white-space:nowrap;font-size:12px;">${d.model || '—'}</td>
            <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11px;">${d.serial || '—'}</td>
            <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11px;">${hasIp   ? (d.ip  || '—') : NA}</td>
            <td style="white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:11px;">${hasMac  ? (d.mac || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasChannel     ? (d.channel  || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasNvrField    ? (d.nvr      || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${swPortCell}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasSpeed       ? (d.speed    || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasPorts       ? (d.ports    || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasSsid        ? (d.ssid     || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasKva         ? (d.kva      || '—') : NA}</td>
            <td style="white-space:nowrap;font-size:12px;">${hasMaintenance ? (d.maintenance || '—') : NA}</td>
        </tr>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// CLEANUP: Remove all specialized filters/pagination before switching type
// ─────────────────────────────────────────────────────────────
function _cleanupAllSpecializedFilters() {
    const tableContainer = document.getElementById('devices-table-container');
    if (!tableContainer) return;

    [
        'cam-filters-wrapper', 'nvr-filters-wrapper', 'antenna-filters-wrapper',
        'switch-filters-wrapper', 'sfp-filters-wrapper', 'ap-filters-wrapper',
        'ups-filters-wrapper', 'suppressor-filters-wrapper', 'pdu-filters-wrapper',
        'patchpanel-filters-wrapper', 'bandeja-fibra-filters-wrapper',
        'organizador-filters-wrapper', 'patchcord-filters-wrapper',
        'patchcord-fibra-filters-wrapper'
    ].forEach(id => document.getElementById(id)?.remove());

    [
        'camera-pagination', 'nvr-pagination', 'antenna-pagination',
        'switch-pagination', 'sfp-pagination', 'ap-pagination',
        'ups-pagination', 'suppressor-pagination', 'pdu-pagination',
        'patchpanel-pagination', 'bandeja-fibra-pagination',
        'organizador-pagination', 'patchcord-pagination', 'patchcord-fibra-pagination'
    ].forEach(id => document.getElementById(id)?.remove());

    const thead = tableContainer.querySelector('table thead');
    if (thead) {
        ['isCamera', 'isNvr', 'isAntenna', 'isSwitch', 'isSfp', 'isAp', 'isUps',
         'isSuppressor', 'isPdu', 'isPatchPanel', 'isBandejaFibra', 'isOrganizador',
         'isPatchcord', 'isPatchcordFibra', 'isAllDevices'].forEach(k => delete thead.dataset[k]);
    }

    // Reset General/Todos filters state so the setup reruns on next visit
    allDevicesFilters = { search: '', region: '', area: '' };

    // Reset ISPs General state
    _ispLinksRegionId = null;
    document.getElementById('isp-links-container')?.remove();

    // Restore the main "Resultados" card (hidden by ISPs General / Reportes views)
    const _mainCard  = document.getElementById('dev-main-card');
    if (_mainCard)  _mainCard.style.display   = '';

    // Restore header filters that may have been hidden by Reportes view
    const _areaFil   = document.getElementById('dev-area-filter');
    const _statusFil = document.getElementById('dev-status-filter');
    const _searchBox = document.querySelector('.search-box');
    const _regFil    = document.getElementById('dev-region-filter');
    if (_areaFil)   _areaFil.style.display   = '';
    if (_statusFil) _statusFil.style.display  = '';
    if (_searchBox) _searchBox.style.display  = '';
    if (_regFil)    _regFil.style.display     = '';

    // If Reportes replaced tableContainer.innerHTML, restore the original table structure
    // so that devices-tbody exists again for other views
    if (tableContainer && document.getElementById('incidents-tbody')) {
        tableContainer.innerHTML = `
            <div style="overflow-x:auto">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th><th>Estado</th><th>Región</th><th>Área</th>
                            <th>Rack</th><th>Categoría</th><th>Marca</th><th>Modelo</th>
                            <th>Serie</th><th>IP</th><th>MAC</th><th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="devices-tbody"></tbody>
                </table>
            </div>
            <div class="table-count">
                Mostrando <span id="dev-showing">0</span> de <span id="devices-total">0</span>
            </div>`;
        tableContainer.style.display = 'none';
    }
}

// ─────────────────────────────────────────────────────────────
// CÁMARAS: Componentes Especializados
// ─────────────────────────────────────────────────────────────
function restoreNormalHeaders(tableContainer) {
    const thead = tableContainer.querySelector('table thead');
    if (thead && (thead.dataset.isCamera || thead.dataset.isNvr || thead.dataset.isAntenna || thead.dataset.isSwitch || thead.dataset.isSfp || thead.dataset.isAp || thead.dataset.isUps || thead.dataset.isSuppressor || thead.dataset.isPdu || thead.dataset.isPatchPanel || thead.dataset.isBandejaFibra || thead.dataset.isOrganizador || thead.dataset.isPatchcord || thead.dataset.isPatchcordFibra)) {
        thead.dataset.isCamera = '';
        thead.dataset.isNvr = '';
        thead.dataset.isAntenna = '';
        thead.dataset.isSwitch = '';
        thead.dataset.isSfp = '';
        thead.dataset.isAp = '';
        thead.dataset.isUps = '';
        thead.dataset.isSuppressor = '';
        thead.dataset.isPdu = '';
        thead.dataset.isPatchPanel = '';
        thead.dataset.isBandejaFibra = '';
        thead.dataset.isOrganizador = '';
        thead.dataset.isPatchcord = '';
        thead.dataset.isPatchcordFibra = '';
        thead.innerHTML = `<tr>
            <th style="white-space:nowrap;font-size:12px;padding:10px 8px;width:36px;text-align:center;">#</th>
            <th>Dispositivo</th>
            <th>Estado</th>
            <th>Región</th>
            <th>Área</th>
            <th>Rack</th>
            <th>Tipo</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Serie</th>
            <th>IP</th>
            <th>MAC</th>
            <th>Acciones</th>
        </tr>`;

        // Restore filters
        const searchInput = document.getElementById('search-devices');
        if (searchInput) {
            searchInput.closest('.search-box').style.display = '';
            searchInput.placeholder = "Buscar dispositivo...";
            searchInput.oninput = filterDeviceTable;
            searchInput.value = ''; // Clear search
        }
        document.getElementById('dev-status-filter')?.style.setProperty('display', '');

        // Restore original event listeners
        const regionEl = document.getElementById('dev-region-filter');
        if (regionEl) {
            regionEl.options[0].textContent = 'Todas las regiones';
            regionEl.onchange = filterDeviceTable;
        }
        const areaEl = document.getElementById('dev-area-filter');
        if (areaEl) {
            areaEl.options[0].textContent = 'Todas las áreas';
            areaEl.onchange = filterDeviceTable;
        }

        document.getElementById('cam-filters-wrapper')?.remove();
        document.getElementById('nvr-filters-wrapper')?.remove();
        document.getElementById('antenna-filters-wrapper')?.remove();
        document.getElementById('switch-filters-wrapper')?.remove();
        document.getElementById('sfp-filters-wrapper')?.remove();
        document.getElementById('ap-filters-wrapper')?.remove();
        document.getElementById('ups-filters-wrapper')?.remove();
        document.getElementById('suppressor-filters-wrapper')?.remove();
        document.getElementById('pdu-filters-wrapper')?.remove();
        document.getElementById('patchpanel-filters-wrapper')?.remove();
        document.getElementById('bandeja-fibra-filters-wrapper')?.remove();
        document.getElementById('organizador-filters-wrapper')?.remove();
        document.getElementById('patchcord-filters-wrapper')?.remove();
        document.getElementById('patchcord-fibra-filters-wrapper')?.remove();
        document.getElementById('camera-pagination')?.remove();
        document.getElementById('nvr-pagination')?.remove();
        document.getElementById('antenna-pagination')?.remove();
        document.getElementById('switch-pagination')?.remove();
        document.getElementById('sfp-pagination')?.remove();
        document.getElementById('ap-pagination')?.remove();
        document.getElementById('ups-pagination')?.remove();
        document.getElementById('suppressor-pagination')?.remove();
        document.getElementById('pdu-pagination')?.remove();
        document.getElementById('patchpanel-pagination')?.remove();
        document.getElementById('bandeja-fibra-pagination')?.remove();
        document.getElementById('organizador-pagination')?.remove();
        document.getElementById('patchcord-pagination')?.remove();
        document.getElementById('patchcord-fibra-pagination')?.remove();
    }
}

// ─────────────────────────────────────────────────────────────
// REPORTES ISP — Registro de Inconvenientes
// ─────────────────────────────────────────────────────────────
const SEVERITY_CFG = {
    'Crítico': { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', dot: '#ef4444' },
    'Alto':    { bg: 'rgba(249,115,22,0.12)', color: '#ea580c', dot: '#f97316' },
    'Medio':   { bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04', dot: '#eab308' },
    'Bajo':    { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', dot: '#22c55e' },
};
const STATUS_CFG = {
    'Abierto':    { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
    'En Proceso': { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
    'Cerrado':    { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
};
const KNOWN_TYPES = ['Corte Total','Degradación de Servicio','Latencia Alta','Pérdida de Paquetes','Inestabilidad','Fallo de Equipo ISP','Otro'];
const INCIDENTS_PER_PAGE = 20;
let currentPageIncidents = 1;
let _incidentFilters = { isp: '', type: '', dateFrom: '', dateTo: '' };

function _getFilteredIncidents() {
    if (!store.ispIncidents) store.ispIncidents = [];
    return store.ispIncidents.filter(i => {
        if (_incidentFilters.isp      && i.isp  !== _incidentFilters.isp)  return false;
        if (_incidentFilters.type     && i.type !== _incidentFilters.type)  return false;
        if (_incidentFilters.dateFrom && i.date  < _incidentFilters.dateFrom) return false;
        if (_incidentFilters.dateTo   && i.date  > _incidentFilters.dateTo)   return false;
        return true;
    });
}

function _hideReportesHeaderFilters() {
    // Hide the "Resultados" card wrapper — Reportes renders inline into tableContainer
    // (but tableContainer IS inside the card, so we only hide the card-header, not the full card)
    ['dev-area-filter','dev-status-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const sb = document.querySelector('.search-box');
    if (sb) sb.style.display = 'none';
    const regFil = document.getElementById('dev-region-filter');
    if (regFil) regFil.style.display = 'none';
}

function _buildIncidentRow(inc, globalIdx) {
    const reg     = store.regions.find(r => r.id === inc.regionId);
    const sevCfg  = SEVERITY_CFG[inc.severity] || { bg:'rgba(100,116,139,0.1)', color:'#64748b', dot:'#94a3b8' };
    const stCfg   = STATUS_CFG[inc.status]     || { bg:'rgba(100,116,139,0.1)', color:'#64748b' };
    const fmtDate = d => d ? new Date(d).toLocaleDateString('es-DO', { day:'2-digit', month:'short', year:'numeric' }) : '—';
    const eyeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    return `
    <tr style="border-bottom:1px solid var(--border);transition:background 0.15s;" onmouseover="this.style.background='rgba(59,130,246,0.03)'" onmouseout="this.style.background=''">
        <td style="padding:11px 12px;width:40px;text-align:center;color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;">${globalIdx}</td>
        <td style="padding:11px 12px;min-width:100px;">
            <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${sevCfg.bg};color:${sevCfg.color};">
                <span style="width:7px;height:7px;border-radius:50%;background:${sevCfg.dot};flex-shrink:0;"></span>${inc.severity || '—'}
            </span>
        </td>
        <td style="padding:11px 12px;min-width:110px;">
            <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${stCfg.bg};color:${stCfg.color};">${inc.status || '—'}</span>
        </td>
        <td style="padding:11px 12px;min-width:120px;font-weight:700;font-size:13px;color:var(--text);white-space:nowrap;">${inc.isp || '—'}</td>
        <td style="padding:11px 12px;min-width:110px;font-size:12px;color:var(--text-muted);white-space:nowrap;">${reg ? reg.name : '—'}</td>
        <td style="padding:11px 12px;min-width:120px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--primary);">${inc.ticketNo || '—'}</td>
        <td style="padding:11px 12px;min-width:150px;font-size:12px;white-space:nowrap;">${inc.type || '—'}</td>
        <td style="padding:11px 12px;min-width:130px;font-size:12px;white-space:nowrap;">${fmtDate(inc.date)}</td>
        <td style="padding:11px 12px;min-width:140px;font-size:12px;white-space:nowrap;">${fmtDate(inc.resolvedDate)}</td>
        <td style="padding:11px 12px;min-width:110px;font-size:12px;white-space:nowrap;color:${inc.resolutionTime ? 'var(--text)' : 'var(--text-muted)'};">${inc.resolutionTime || '—'}</td>
        <td style="padding:11px 12px;min-width:260px;font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(inc.description||'').replace(/"/g,'&quot;')}">${inc.description || '—'}</td>
        <td style="padding:11px 12px;min-width:110px;white-space:nowrap;text-align:right;">
            <button class="btn-icon btn-view-inc" data-id="${inc.id}" title="Ver detalle">${eyeIcon}</button>
            <button class="btn-icon btn-edit-inc" data-id="${inc.id}" title="Editar">${icons.edit}</button>
            <button class="btn-icon danger btn-del-inc" data-id="${inc.id}" title="Eliminar">${icons.trash}</button>
        </td>
    </tr>`;
}

function renderReportesView() {
    const tableContainer = document.getElementById('devices-table-container');
    const emptyState     = document.getElementById('devices-empty-state');
    const btnAdd         = document.getElementById('btn-add-device');
    if (btnAdd) btnAdd.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';

    // Hide irrelevant header filters (cleanup was already called by renderDevicesTable)
    _hideReportesHeaderFilters();

    if (!store.ispIncidents) store.ispIncidents = [];
    const allInc     = store.ispIncidents;
    const filtered   = _getFilteredIncidents();
    const totalPages = Math.max(1, Math.ceil(filtered.length / INCIDENTS_PER_PAGE));
    if (currentPageIncidents > totalPages) currentPageIncidents = totalPages;
    const pageSlice  = filtered.slice((currentPageIncidents-1)*INCIDENTS_PER_PAGE, currentPageIncidents*INCIDENTS_PER_PAGE);

    // ── KPI (always over ALL incidents, not filtered) ─────────
    const total     = allInc.length;
    const abiertos  = allInc.filter(i => i.status  === 'Abierto').length;
    const enProceso = allInc.filter(i => i.status  === 'En Proceso').length;
    const cerrados  = allInc.filter(i => i.status  === 'Cerrado').length;
    const criticos  = allInc.filter(i => i.severity === 'Crítico').length;

    // ── Filter bar options ────────────────────────────────────
    const uniqueIsps  = [...new Set(allInc.map(i => i.isp).filter(Boolean))].sort();
    const uniqueTypes = [...new Set(allInc.map(i => i.type).filter(Boolean))].sort();

    const ispOpts  = uniqueIsps.map(v  => `<option value="${v}"  ${_incidentFilters.isp  === v  ? 'selected':''  }>${v}</option>`).join('');
    const typeOpts = uniqueTypes.map(v => `<option value="${v}" ${_incidentFilters.type === v ? 'selected':''   }>${v}</option>`).join('');

    // ── Table rows ────────────────────────────────────────────
    const startIdx  = (currentPageIncidents - 1) * INCIDENTS_PER_PAGE;
    const tableRows = pageSlice.length
        ? pageSlice.map((inc, i) => _buildIncidentRow(inc, startIdx + i + 1)).join('')
        : `<tr><td colspan="12" style="padding:50px;text-align:center;color:var(--text-muted);font-style:italic;">
               ${filtered.length === 0 && allInc.length === 0
                   ? 'No hay registros de inconvenientes. Usa el botón "Registrar Inconveniente" para añadir uno.'
                   : 'Ningún registro coincide con los filtros aplicados.'}
           </td></tr>`;

    // ── Pagination HTML ───────────────────────────────────────
    let pagHtml = '';
    if (totalPages > 1) {
        const pages = Array.from({length: totalPages}, (_,i) => i+1);
        pagHtml = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0 0;border-top:1px solid var(--border);margin-top:4px;">
            <span style="font-size:13px;color:var(--text-muted);">Mostrando <strong>${pageSlice.length}</strong> de <strong>${filtered.length}</strong> registros</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-outline btn-sm inc-page-btn" data-page="${currentPageIncidents-1}" ${currentPageIncidents===1?'disabled':''} style="padding:5px 10px;">‹</button>
                ${pages.map(p=>`<button class="btn ${p===currentPageIncidents?'btn-primary':'btn-outline'} btn-sm inc-page-btn" data-page="${p}" style="padding:5px 10px;min-width:34px;">${p}</button>`).join('')}
                <button class="btn btn-outline btn-sm inc-page-btn" data-page="${currentPageIncidents+1}" ${currentPageIncidents===totalPages?'disabled':''} style="padding:5px 10px;">›</button>
            </div>
        </div>`;
    }

    if (tableContainer) {
        tableContainer.style.display = 'block';
        tableContainer.innerHTML = `
        <div style="padding:4px 0 24px;">

            <!-- KPI row -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 140px), 1fr));gap:12px;margin-bottom:22px;">
                <div style="background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--primary);margin-bottom:6px;">Total Registros</div>
                    <div style="font-size:32px;font-weight:900;color:var(--text);line-height:1;">${total}</div>
                </div>
                <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#dc2626;margin-bottom:6px;">Abiertos</div>
                    <div style="font-size:32px;font-weight:900;color:#dc2626;line-height:1;">${abiertos}</div>
                </div>
                <div style="background:rgba(234,179,8,0.07);border:1px solid rgba(234,179,8,0.2);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#ca8a04;margin-bottom:6px;">En Proceso</div>
                    <div style="font-size:32px;font-weight:900;color:#ca8a04;line-height:1;">${enProceso}</div>
                </div>
                <div style="background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#16a34a;margin-bottom:6px;">Cerrados</div>
                    <div style="font-size:32px;font-weight:900;color:#16a34a;line-height:1;">${cerrados}</div>
                </div>
                <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#ef4444;margin-bottom:6px;">Críticos</div>
                    <div style="font-size:32px;font-weight:900;color:#ef4444;line-height:1;">${criticos}</div>
                </div>
            </div>

            <!-- Toolbar: title + filters + add button -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
                <span style="font-size:14px;font-weight:700;color:var(--text);">Registro de Inconvenientes con ISPs
                    ${filtered.length !== allInc.length ? `<span style="font-size:12px;font-weight:500;color:var(--primary);margin-left:8px;">(${filtered.length} de ${allInc.length})</span>` : ''}
                </span>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <select id="inc-filter-isp" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;background:var(--bg);color:var(--text);cursor:pointer;">
                        <option value="">Todos los ISPs</option>${ispOpts}
                    </select>
                    <select id="inc-filter-type" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;background:var(--bg);color:var(--text);cursor:pointer;">
                        <option value="">Todos los Tipos</option>${typeOpts}
                    </select>
                    <input type="date" id="inc-filter-from" value="${_incidentFilters.dateFrom}" title="Desde" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;background:var(--bg);color:var(--text);">
                    <input type="date" id="inc-filter-to"   value="${_incidentFilters.dateTo}"   title="Hasta" style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;background:var(--bg);color:var(--text);">
                    ${(_incidentFilters.isp || _incidentFilters.type || _incidentFilters.dateFrom || _incidentFilters.dateTo)
                        ? `<button id="inc-clear-filters" class="btn btn-outline btn-sm" style="color:#dc2626;border-color:#dc2626;">✕ Limpiar</button>` : ''}
                    <button id="btn-add-incident" class="btn btn-primary btn-sm" style="display:flex;align-items:center;gap:6px;">${icons.plus} Registrar</button>
                </div>
            </div>

            <!-- Registry table (scrollable) -->
            <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;">
                    <table style="width:max-content;min-width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:rgba(59,130,246,0.04);border-bottom:2px solid var(--border);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);">
                                <th style="padding:11px 12px;width:40px;text-align:center;">#</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Severidad</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Estado</th>
                                <th style="padding:11px 12px;white-space:nowrap;">ISP / Proveedor</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Región</th>
                                <th style="padding:11px 12px;white-space:nowrap;">No. Ticket</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Tipo</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Fecha Inicio</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Fecha Resolución</th>
                                <th style="padding:11px 12px;white-space:nowrap;">T. Solución</th>
                                <th style="padding:11px 12px;white-space:nowrap;">Descripción</th>
                                <th style="padding:11px 12px;white-space:nowrap;text-align:right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="incidents-tbody">${tableRows}</tbody>
                    </table>
                </div>
                ${pagHtml}
            </div>

        </div>`;
    }

    // Wire filters
    document.getElementById('inc-filter-isp')?.addEventListener('change', e => {
        _incidentFilters.isp = e.target.value; currentPageIncidents = 1; renderReportesView();
    });
    document.getElementById('inc-filter-type')?.addEventListener('change', e => {
        _incidentFilters.type = e.target.value; currentPageIncidents = 1; renderReportesView();
    });
    document.getElementById('inc-filter-from')?.addEventListener('change', e => {
        _incidentFilters.dateFrom = e.target.value; currentPageIncidents = 1; renderReportesView();
    });
    document.getElementById('inc-filter-to')?.addEventListener('change', e => {
        _incidentFilters.dateTo = e.target.value; currentPageIncidents = 1; renderReportesView();
    });
    document.getElementById('inc-clear-filters')?.addEventListener('click', () => {
        _incidentFilters = { isp:'', type:'', dateFrom:'', dateTo:'' };
        currentPageIncidents = 1; renderReportesView();
    });

    // Wire pagination
    document.querySelectorAll('.inc-page-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const pg = parseInt(e.currentTarget.dataset.page);
            if (!pg || pg < 1 || pg > totalPages) return;
            currentPageIncidents = pg; renderReportesView();
        });
    });

    // Wire action buttons
    document.getElementById('btn-add-incident')?.addEventListener('click', () => showIncidentForm(null));
    document.querySelectorAll('.btn-view-inc').forEach(b =>
        b.addEventListener('click', e => showIncidentDetail(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('.btn-edit-inc').forEach(b =>
        b.addEventListener('click', e => showIncidentForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('.btn-del-inc').forEach(b =>
        b.addEventListener('click', e => {
            if (!confirm('¿Eliminar este registro?')) return;
            store.ispIncidents = store.ispIncidents.filter(i => i.id !== e.currentTarget.dataset.id);
            save(); renderReportesView();
        })
    );
}

// ─── Detail View ────────────────────────────────────────────
function showIncidentDetail(id) {
    const inc = (store.ispIncidents || []).find(i => i.id === id);
    if (!inc) return;

    const reg       = store.regions.find(r => r.id === inc.regionId);
    const sevCfg    = SEVERITY_CFG[inc.severity] || { bg:'rgba(100,116,139,0.1)', color:'#64748b', dot:'#94a3b8' };
    const stCfg     = STATUS_CFG[inc.status]     || { bg:'rgba(100,116,139,0.1)', color:'#64748b' };
    const fmtDate   = d => d ? new Date(d).toLocaleDateString('es-DO', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : '—';
    const fmtShort  = d => d ? new Date(d).toLocaleDateString('es-DO', { day:'2-digit', month:'short', year:'numeric' }) : null;

    // Related incidents from same ISP (last 10 excluding current)
    const related = (store.ispIncidents || [])
        .filter(i => i.isp === inc.isp && i.id !== inc.id)
        .slice(0, 8);

    // SVG bar chart: incidents per month for this ISP (last 6 months)
    const now = new Date();
    const months = Array.from({length:6}, (_,k) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5-k), 1);
        return { label: d.toLocaleDateString('es-DO',{month:'short'}), key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` };
    });
    const byMonth = {};
    (store.ispIncidents||[]).filter(i => i.isp === inc.isp).forEach(i => {
        if (!i.date) return;
        const k = i.date.slice(0,7);
        byMonth[k] = (byMonth[k]||0) + 1;
    });
    const maxBar   = Math.max(1, ...months.map(m => byMonth[m.key]||0));
    const barW     = 36; const barGap = 10; const chartH = 80;
    const barsSvg  = months.map((m, mi) => {
        const val    = byMonth[m.key] || 0;
        const bh     = Math.round((val / maxBar) * chartH);
        const x      = mi * (barW + barGap);
        const isThis = m.key === (inc.date||'').slice(0,7);
        return `
        <g>
            <rect x="${x}" y="${chartH - bh}" width="${barW}" height="${bh}" rx="4"
                  fill="${isThis ? '#3b82f6' : '#94a3b8'}" opacity="${isThis ? '1' : '0.5'}"/>
            ${val ? `<text x="${x + barW/2}" y="${chartH - bh - 5}" text-anchor="middle" font-size="10" fill="var(--text)" font-weight="700">${val}</text>` : ''}
            <text x="${x + barW/2}" y="${chartH + 16}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${m.label}</text>
        </g>`;
    }).join('');
    const svgW = months.length * (barW + barGap) - barGap;

    // Timeline step component
    const step = (label, date, icon, done) => `
    <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
        <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;
             background:${done ? 'var(--primary)' : 'var(--border)'};color:${done ? '#fff' : 'var(--text-muted)'};">${icon}</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${done?'var(--text)':'var(--text-muted)'};margin-top:6px;">${label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${date || '—'}</div>
    </div>`;

    const lineColor = inc.resolvedDate ? 'var(--primary)' : 'var(--border)';

    showModal(`Reporte — ${inc.isp || ''}`, `
    <div style="display:flex;flex-direction:column;gap:20px;">

        <!-- Header badge row -->
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:700;background:${sevCfg.bg};color:${sevCfg.color};">
                <span style="width:8px;height:8px;border-radius:50%;background:${sevCfg.dot};"></span>${inc.severity || '—'}
            </span>
            <span style="padding:5px 14px;border-radius:20px;font-size:13px;font-weight:700;background:${stCfg.bg};color:${stCfg.color};">${inc.status || '—'}</span>
            ${inc.ticketNo ? `<span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--primary);font-weight:700;"># ${inc.ticketNo}</span>` : ''}
            <span style="margin-left:auto;font-size:12px;color:var(--text-muted);">${inc.type || ''}</span>
        </div>

        <!-- Info grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div style="padding:12px 14px;border-radius:10px;background:rgba(59,130,246,0.05);border:1px solid var(--border);">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:4px;">ISP / Proveedor</div>
                <div style="font-size:15px;font-weight:800;color:var(--text);">${inc.isp || '—'}</div>
            </div>
            <div style="padding:12px 14px;border-radius:10px;background:rgba(59,130,246,0.05);border:1px solid var(--border);">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:4px;">Región</div>
                <div style="font-size:15px;font-weight:800;color:var(--text);">${reg ? reg.name : '—'}</div>
            </div>
            <div style="padding:12px 14px;border-radius:10px;background:rgba(59,130,246,0.05);border:1px solid var(--border);">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:4px;">T. de Solución</div>
                <div style="font-size:15px;font-weight:800;color:${inc.resolutionTime ? 'var(--text)' : 'var(--text-muted)'};">${inc.resolutionTime || '—'}</div>
            </div>
            ${inc.affectedServices ? `
            <div style="padding:12px 14px;border-radius:10px;background:rgba(59,130,246,0.05);border:1px solid var(--border);grid-column:span 3;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:4px;">Servicios Afectados</div>
                <div style="font-size:13px;color:var(--text);">${inc.affectedServices}</div>
            </div>` : ''}
        </div>

        <!-- Timeline -->
        <div style="padding:16px;border-radius:10px;border:1px solid var(--border);background:rgba(59,130,246,0.03);">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:14px;">Línea de Tiempo</div>
            <div style="display:flex;align-items:flex-start;gap:0;position:relative;">
                ${step('Registrado', fmtShort(inc.date), '📋', !!inc.date)}
                <div style="flex:1;height:2px;background:${lineColor};margin-top:18px;"></div>
                ${step('En Proceso', inc.status === 'En Proceso' ? 'Activo' : (fmtShort(inc.resolvedDate) || 'Pendiente'), '⚙️', inc.status !== 'Abierto')}
                <div style="flex:1;height:2px;background:${inc.resolvedDate ? 'var(--primary)' : 'var(--border)'};margin-top:18px;"></div>
                ${step('Resuelto', fmtShort(inc.resolvedDate) || 'Pendiente', '✅', !!inc.resolvedDate)}
            </div>
        </div>

        <!-- Description -->
        ${inc.description ? `
        <div style="padding:14px 16px;border-radius:10px;border-left:4px solid var(--primary);background:rgba(59,130,246,0.04);">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--primary);margin-bottom:8px;">Descripción / Observaciones</div>
            <div style="font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;">${inc.description}</div>
        </div>` : ''}

        <!-- Bar chart: incidentes por mes para este ISP -->
        <div style="padding:16px;border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:16px;">
                Historial de Incidentes — ${inc.isp} (últimos 6 meses)
            </div>
            <svg width="${svgW}" height="${chartH + 24}" style="overflow:visible;display:block;margin:0 auto;">
                ${barsSvg}
            </svg>
        </div>

        <!-- Related incidents -->
        ${related.length ? `
        <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:10px;">Otros incidentes de ${inc.isp}</div>
            <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead><tr style="background:rgba(59,130,246,0.04);border-bottom:1px solid var(--border);">
                        <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text-muted);">Ticket</th>
                        <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text-muted);">Tipo</th>
                        <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text-muted);">Fecha</th>
                        <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text-muted);">Estado</th>
                    </tr></thead>
                    <tbody>${related.map(r => {
                        const sc = STATUS_CFG[r.status]||{bg:'rgba(100,116,139,0.1)',color:'#64748b'};
                        return `<tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:8px 12px;font-family:'JetBrains Mono',monospace;color:var(--primary);">${r.ticketNo||'—'}</td>
                            <td style="padding:8px 12px;color:var(--text);">${r.type||'—'}</td>
                            <td style="padding:8px 12px;color:var(--text-muted);">${fmtShort(r.date)||'—'}</td>
                            <td style="padding:8px 12px;"><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${sc.bg};color:${sc.color};">${r.status||'—'}</span></td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>
            </div>
        </div>` : ''}

    </div>`, null, null);
}

// ─── Incident Form ───────────────────────────────────────────
function showIncidentForm(id) {
    const inc = id ? (store.ispIncidents || []).find(i => i.id === id) : null;
    const regOpts = store.regions.map(r =>
        `<option value="${r.id}" ${inc && inc.regionId === r.id ? 'selected' : ''}>${r.name}</option>`
    ).join('');
    const hasCustomType = inc?.type && !KNOWN_TYPES.includes(inc.type);

    showModal(inc ? 'Editar Registro de Inconveniente' : 'Nuevo Registro de Inconveniente', `
        <div class="form-row">
            <div class="form-group">
                <label>ISP / Proveedor *</label>
                <input id="fi-isp" value="${inc?.isp || ''}" placeholder="Ej: Claro, Wind, Altice…">
            </div>
            <div class="form-group">
                <label>Región</label>
                <select id="fi-region">
                    <option value="">— Seleccionar región —</option>
                    ${regOpts}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>No. de Ticket</label>
                <input id="fi-ticket" value="${inc?.ticketNo || ''}" placeholder="Ej: TKT-2025-0042">
            </div>
            <div class="form-group">
                <label>Tipo de Inconveniente</label>
                <select id="fi-type">
                    <option value="">— Seleccionar tipo —</option>
                    ${KNOWN_TYPES.map(t => {
                        const sel = inc?.type === t || (t === 'Otro' && hasCustomType);
                        return `<option ${sel ? 'selected':''}>${t}</option>`;
                    }).join('')}
                </select>
                <input id="fi-type-custom" placeholder="Especificar tipo…"
                       value="${hasCustomType ? inc.type : ''}"
                       style="margin-top:6px;display:${hasCustomType ? 'block':'none'};">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Severidad</label>
                <select id="fi-severity">
                    <option value="">— Seleccionar —</option>
                    ${['Crítico','Alto','Medio','Bajo'].map(s =>
                        `<option ${inc?.severity === s ? 'selected':''}>${s}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Estado</label>
                <select id="fi-status">
                    ${['Abierto','En Proceso','Cerrado'].map(s =>
                        `<option ${(inc?.status||'Abierto') === s ? 'selected':''}>${s}</option>`
                    ).join('')}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Fecha de Inicio *</label>
                <input type="date" id="fi-date" value="${inc?.date || ''}">
            </div>
            <div class="form-group">
                <label>Fecha de Resolución</label>
                <input type="date" id="fi-resolved" value="${inc?.resolvedDate || ''}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Tiempo de Solución</label>
                <input id="fi-restime" value="${inc?.resolutionTime || ''}" placeholder="Ej: 4h 30min, 2 días…">
            </div>
            <div class="form-group">
                <label>Servicios Afectados</label>
                <input id="fi-services" value="${inc?.affectedServices || ''}" placeholder="Ej: Internet, VoIP, VPN…">
            </div>
        </div>
        <div class="form-group">
            <label>Descripción / Observaciones</label>
            <textarea id="fi-desc" rows="3" style="width:100%;resize:vertical;" placeholder="Detalle del inconveniente, gestiones realizadas, resolución…">${inc?.description || ''}</textarea>
        </div>
    `, () => {
        const ispVal  = document.getElementById('fi-isp').value.trim();
        const dateVal = document.getElementById('fi-date').value;
        if (!ispVal || !dateVal) { alert('ISP y Fecha de Inicio son obligatorios.'); return; }

        if (!store.ispIncidents) store.ispIncidents = [];
        const typeRaw    = document.getElementById('fi-type').value;
        const typeCustom = document.getElementById('fi-type-custom').value.trim();
        const typeVal    = typeRaw === 'Otro' ? (typeCustom || 'Otro') : typeRaw;

        const obj = {
            id:               inc?.id || genId(),
            isp:              ispVal,
            regionId:         document.getElementById('fi-region').value,
            ticketNo:         document.getElementById('fi-ticket').value.trim(),
            type:             typeVal,
            severity:         document.getElementById('fi-severity').value,
            status:           document.getElementById('fi-status').value,
            date:             dateVal,
            resolvedDate:     document.getElementById('fi-resolved').value,
            resolutionTime:   document.getElementById('fi-restime').value.trim(),
            affectedServices: document.getElementById('fi-services').value.trim(),
            description:      document.getElementById('fi-desc').value.trim(),
        };

        if (inc) {
            const idx = store.ispIncidents.findIndex(i => i.id === inc.id);
            if (idx !== -1) store.ispIncidents[idx] = obj;
        } else {
            store.ispIncidents.unshift(obj);
        }

        save(); closeModal(); renderReportesView();
    }, inc ? 'Guardar Cambios' : 'Registrar');

    // Wire "Otro" custom input toggle
    const fiType = document.getElementById('fi-type');
    const fiTypeCustom = document.getElementById('fi-type-custom');
    if (fiType && fiTypeCustom) {
        fiType.addEventListener('change', () => {
            fiTypeCustom.style.display = fiType.value === 'Otro' ? 'block' : 'none';
            if (fiType.value !== 'Otro') fiTypeCustom.value = '';
        });
    }
}

// ─────────────────────────────────────────────────────────────
// ISPs GENERAL
// ─────────────────────────────────────────────────────────────

const ISP_REGION_COLORS = [
    { bg:'rgba(59,130,246,0.08)',  border:'rgba(59,130,246,0.22)',  accent:'#3b82f6', text:'#2563eb'  },
    { bg:'rgba(34,197,94,0.08)',   border:'rgba(34,197,94,0.22)',   accent:'#22c55e', text:'#16a34a'  },
    { bg:'rgba(168,85,247,0.08)',  border:'rgba(168,85,247,0.22)',  accent:'#a855f7', text:'#9333ea'  },
    { bg:'rgba(249,115,22,0.08)',  border:'rgba(249,115,22,0.22)',  accent:'#f97316', text:'#ea580c'  },
    { bg:'rgba(20,184,166,0.08)',  border:'rgba(20,184,166,0.22)',  accent:'#14b8a6', text:'#0d9488'  },
    { bg:'rgba(239,68,68,0.08)',   border:'rgba(239,68,68,0.22)',   accent:'#ef4444', text:'#dc2626'  },
    { bg:'rgba(234,179,8,0.08)',   border:'rgba(234,179,8,0.22)',   accent:'#eab308', text:'#ca8a04'  },
    { bg:'rgba(14,165,233,0.08)',  border:'rgba(14,165,233,0.22)',  accent:'#0ea5e9', text:'#0284c7'  },
];

function _hideIspLinksHeaderFilters() {
    // Hide the entire "Resultados" card — ISPs General renders its own container
    const mainCard = document.getElementById('dev-main-card');
    if (mainCard) mainCard.style.display = 'none';
}

function renderIspLinksView() {
    const tableContainer = document.getElementById('devices-table-container');
    const emptyState     = document.getElementById('devices-empty-state');
    const btnAdd         = document.getElementById('btn-add-device');
    if (btnAdd) btnAdd.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';

    // NOTE: do NOT call _cleanupAllSpecializedFilters() here — it resets _ispLinksRegionId
    // renderDevicesTable already called it before dispatching here.
    _hideIspLinksHeaderFilters();

    if (!store.ispLinks) store.ispLinks = [];

    // Container where we render everything
    const viewEl = document.getElementById('view-devices');
    let container = document.getElementById('isp-links-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'isp-links-container';
        viewEl.appendChild(container);
    }

    if (_ispLinksRegionId === null) {
        _renderIspRegionGrid(container);
    } else {
        _renderIspListForRegion(container, _ispLinksRegionId);
    }
}

function _renderIspRegionGrid(container) {
    // Sort regions reverse-alphabetically so COINCO, CMY… appear first
    const regions = [...store.regions].sort((a, b) => b.name.localeCompare(a.name));
    if (regions.length === 0) {
        container.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--text-muted);">
            <p>No hay regiones creadas. Crea regiones primero en el módulo Regiones.</p>
        </div>`;
        return;
    }

    const arrowIcon  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    const globeIcon  = `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
    const globeSmIcon= `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
    const signalIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>`;

    const cards = regions.map((r, i) => {
        const c = ISP_REGION_COLORS[i % ISP_REGION_COLORS.length];
        const ispList = (store.ispLinks || []).filter(l => l.regionId === r.id);
        const count = ispList.length;
        const hasIsps = count > 0;

        // ISP preview pills (up to 4)
        const previewIsps = ispList.slice(0, 4).map(l => {
            const typeColors = {
                'Fibra':'#16a34a','Radio':'#ea580c','Cable':'#2563eb','Satélite':'#9333ea','Otro':'#64748b'
            };
            const tc = typeColors[l.type] || '#64748b';
            return `<div style="display:flex;align-items:center;gap:7px;padding:7px 10px;background:rgba(255,255,255,0.55);border:1px solid ${c.border};border-radius:10px;backdrop-filter:blur(4px);">
                <span style="color:${c.accent};flex-shrink:0;">${signalIcon}</span>
                <span style="font-size:12px;font-weight:700;color:var(--text);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.name}</span>
                ${l.internet ? `<span style="font-size:10.5px;color:var(--text-muted);flex-shrink:0;">${l.internet}</span>` : ''}
                ${l.type ? `<span style="flex-shrink:0;font-size:10px;font-weight:800;color:${tc};background:${tc}18;padding:1px 7px;border-radius:10px;">${l.type}</span>` : ''}
            </div>`;
        }).join('');

        const moreTag = count > 4
            ? `<div style="text-align:center;font-size:11.5px;font-weight:600;color:${c.accent};padding:4px 0;">+${count - 4} más</div>`
            : '';

        return `
        <div class="isp-region-card" data-region-id="${r.id}"
             style="background:${c.bg};border:1.5px solid ${c.border};border-radius:20px;padding:26px 28px;cursor:pointer;
                    transition:transform 0.28s cubic-bezier(.4,0,.2,1),box-shadow 0.28s,border-color 0.2s;position:relative;overflow:hidden;
                    display:flex;flex-direction:column;gap:0;"
             onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 20px 45px rgba(0,0,0,0.14)';this.style.borderColor='${c.accent}'"
             onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='${c.border}'">
            <!-- Watermark -->
            <div style="position:absolute;top:-14px;right:-14px;opacity:0.08;color:${c.accent};">${globeIcon}</div>
            <!-- Colored top stripe -->
            <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${c.accent},${c.accent}88);border-radius:20px 20px 0 0;"></div>
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:16px;margin-top:4px;">
                <div style="min-width:0;">
                    <div style="font-size:24px;font-weight:900;color:${c.text};letter-spacing:-0.6px;line-height:1.1;">${r.name}</div>
                    ${r.location ? `<div style="font-size:12.5px;color:var(--text-muted);margin-top:4px;font-weight:500;">${r.location}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                    <span style="background:${hasIsps ? c.accent : c.border};color:${hasIsps ? '#fff' : c.text};padding:4px 14px;border-radius:20px;font-size:13px;font-weight:800;">
                        ${count} ISP${count !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
            <!-- ISP list or empty hint -->
            <div style="flex:1;display:flex;flex-direction:column;gap:6px;min-height:${hasIsps ? '100px' : '80px'};">
                ${hasIsps ? previewIsps + moreTag
                    : `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:0.45;padding:10px 0;">
                           <div style="color:${c.accent};">${globeSmIcon}</div>
                           <span style="font-size:12px;font-weight:600;color:var(--text-muted);">Sin proveedores registrados</span>
                       </div>`}
            </div>
            <!-- Footer -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:1px solid ${c.border};">
                <span style="font-size:12px;color:${c.accent};font-weight:600;">${hasIsps ? 'Gestionar proveedores' : 'Añadir primer ISP'} →</span>
                <span style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${c.accent}22;color:${c.accent};flex-shrink:0;">${arrowIcon}</span>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
    <div style="padding:4px 0 24px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:20px;">
            ${cards}
        </div>
    </div>`;

    container.querySelectorAll('.isp-region-card').forEach(card => {
        card.addEventListener('click', () => {
            _ispLinksRegionId = card.dataset.regionId;
            renderIspLinksView();
        });
    });
}

function _renderIspListForRegion(container, regionId) {
    const region = store.regions.find(r => r.id === regionId);
    const links  = (store.ispLinks || []).filter(l => l.regionId === regionId);

    const backIcon  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const addIcon   = icons.plus;
    const eyeIcon   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

    const TYPE_COLORS = {
        'Fibra':    { bg:'rgba(34,197,94,0.1)',  color:'#16a34a'  },
        'Radio':    { bg:'rgba(249,115,22,0.1)', color:'#ea580c'  },
        'Cable':    { bg:'rgba(59,130,246,0.1)', color:'#2563eb'  },
        'Satélite': { bg:'rgba(168,85,247,0.1)', color:'#9333ea'  },
        'Otro':     { bg:'rgba(100,116,139,0.1)','color':'#64748b'},
    };

    const ispCards = links.length === 0
        ? `<div style="padding:60px;text-align:center;color:var(--text-muted);border:2px dashed var(--border);border-radius:20px;">
               <p style="margin:0 0 8px;font-size:16px;font-weight:700;">No hay ISPs en esta región</p>
               <small>Usa el botón "Añadir ISP" para registrar un proveedor</small>
           </div>`
        : links.map((l, i) => {
            const clr = ISP_REGION_COLORS[i % ISP_REGION_COLORS.length];
            const typeCfg = TYPE_COLORS[l.type] || TYPE_COLORS['Otro'];

            // min-width:0 y overflow-wrap son los que impiden que una IP larga
            // ensanche su columna y se salga de la tarjeta.
            const infoCell = (label, val, mono = false) => val
                ? `<div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
                       <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);">${label}</span>
                       <span class="isp-net-val" style="font-size:13px;font-weight:700;color:var(--text);${mono ? "font-family:'JetBrains Mono',monospace;" : ''}">${val}</span>
                   </div>` : '';

            const networkGrid = [
                infoCell('Segmento', l.segment, true),
                infoCell('Máscara', l.mask, true),
                infoCell('Gateway', l.gateway, true),
                infoCell('DNS', l.dns, true),
                infoCell('DNS Alt.', l.dnsAlt, true),
                infoCell('Puerto FW', l.fwPort),
            ].filter(Boolean).join('');

            const contactRow = [
                l.contactTel ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${l.contactTel}</span>` : '',
                l.contactTickets ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${l.contactTickets}</span>` : '',
            ].filter(Boolean).join('<span style="color:var(--border);padding:0 4px;">·</span>');

            return `
            <div class="isp-link-card" data-id="${l.id}"
                 style="background:var(--card);border:1.5px solid var(--border);border-radius:20px;overflow:hidden;cursor:pointer;
                        transition:transform 0.25s cubic-bezier(.4,0,.2,1),box-shadow 0.25s,border-color 0.2s;position:relative;"
                 onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 16px 40px rgba(0,0,0,0.13)';this.style.borderColor='${clr.accent}44'"
                 onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">

                <!-- Top accent bar -->
                <div style="height:5px;background:linear-gradient(90deg,${clr.accent},${clr.accent}66);"></div>

                <!-- Card body -->
                <div class="isp-card-body">

                    <!-- Header: name + type + actions -->
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px;">
                        <div style="min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                                <span style="font-size:20px;font-weight:900;color:var(--text);letter-spacing:-0.5px;">${l.name}</span>
                                <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;background:${typeCfg.bg};color:${typeCfg.color};">${l.type || 'N/A'}</span>
                            </div>
                            ${l.ispCode ? `<div style="font-size:11.5px;font-family:'JetBrains Mono',monospace;color:${clr.accent};font-weight:600;">${l.ispCode}</div>` : ''}
                            ${l.internet ? `<div style="margin-top:5px;font-size:12px;color:var(--text-muted);">🌐 <strong style="color:var(--text);">${l.internet}</strong> de ancho de banda</div>` : ''}
                        </div>
                        <div style="display:flex;gap:6px;flex-shrink:0;">
                            <button class="btn-icon btn-view-isp" data-id="${l.id}" title="Ver detalle completo"
                                    style="width:34px;height:34px;border-radius:10px;background:${clr.accent}15;color:${clr.accent};border:1px solid ${clr.accent}30;display:flex;align-items:center;justify-content:center;">${eyeIcon}</button>
                            <button class="btn-icon btn-edit-isp" data-id="${l.id}" title="Editar"
                                    style="width:34px;height:34px;border-radius:10px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;">${icons.edit}</button>
                            <button class="btn-icon danger btn-del-isp" data-id="${l.id}" title="Eliminar"
                                    style="width:34px;height:34px;border-radius:10px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);color:#dc2626;display:flex;align-items:center;justify-content:center;">${icons.trash}</button>
                        </div>
                    </div>

                    <!-- Network info grid -->
                    ${networkGrid ? `
                    <div style="background:${clr.bg};border:1px solid ${clr.border};border-radius:12px;padding:16px 18px;margin-bottom:14px;">
                        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:${clr.accent};margin-bottom:12px;">Configuración de Red</div>
                        <div class="isp-net-grid">
                            ${networkGrid}
                        </div>
                    </div>` : ''}

                    <!-- IPs usables -->
                    ${l.ips ? `
                    <div style="margin-bottom:14px;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);margin-bottom:6px;">IPs Utilizables</div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;">
                            ${l.ips.split('\n').filter(Boolean).map(ip =>
                                `<span style="padding:2px 8px;border-radius:6px;background:rgba(59,130,246,0.07);font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--primary);border:1px solid rgba(59,130,246,0.15);">${ip.trim()}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}

                    <!-- Footer: contact + monitoring -->
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:12px;border-top:1px solid var(--border);">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${contactRow || '<span style="font-size:12px;color:var(--text-muted);">Sin contacto</span>'}</div>
                        ${l.monitoringName
                            ? `<span style="font-size:11.5px;display:flex;align-items:center;gap:4px;color:var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>📡 ${l.monitoringName}</span>`
                            : `<span style="font-size:11.5px;color:var(--text-muted);opacity:0.6;">Sin monitoreo</span>`}
                    </div>
                </div>
            </div>`;
        }).join('');

    container.innerHTML = `
    <div style="padding:4px 0 20px;">
        <!-- Header row -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button id="isp-back-btn" class="btn btn-outline btn-sm" style="display:flex;align-items:center;gap:5px;">${backIcon} Regiones</button>
                <span style="font-size:16px;font-weight:800;color:var(--text);">ISPs en <span style="color:var(--primary);">${region ? region.name : ''}</span></span>
                <span style="background:rgba(59,130,246,0.1);color:var(--primary);padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;">${links.length}</span>
            </div>
            <button id="isp-add-btn" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;">${addIcon} Añadir ISP</button>
        </div>
        <!-- ISP cards — Responsive layout -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 340px),1fr));gap:18px;">
            ${ispCards}
        </div>
    </div>`;

    document.getElementById('isp-back-btn')?.addEventListener('click', () => {
        _ispLinksRegionId = null;
        renderIspLinksView();
    });
    document.getElementById('isp-add-btn')?.addEventListener('click', () => showIspLinkForm(null, regionId));

    container.querySelectorAll('.btn-view-isp').forEach(b =>
        b.addEventListener('click', e => { e.stopPropagation(); showIspLinkDetail(e.currentTarget.dataset.id); })
    );
    container.querySelectorAll('.btn-edit-isp').forEach(b =>
        b.addEventListener('click', e => { e.stopPropagation(); showIspLinkForm(e.currentTarget.dataset.id, regionId); })
    );
    container.querySelectorAll('.btn-del-isp').forEach(b =>
        b.addEventListener('click', e => {
            e.stopPropagation();
            if (!confirm('¿Eliminar este ISP?')) return;
            store.ispLinks = (store.ispLinks || []).filter(l => l.id !== e.currentTarget.dataset.id);
            save();
            renderIspLinksView();
        })
    );
    container.querySelectorAll('.isp-link-card').forEach(card => {
        card.addEventListener('click', () => showIspLinkDetail(card.dataset.id));
    });
}

function showIspLinkDetail(id) {
    const l = (store.ispLinks || []).find(x => x.id === id);
    if (!l) return;

    const reg = store.regions.find(r => r.id === l.regionId);

    const row = (label, val, mono = false) => val
        ? `<div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
               <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);">${label}</span>
               <span class="isp-net-val" style="font-size:13px;font-weight:600;color:var(--text);${mono ? "font-family:'JetBrains Mono',monospace;" : ''}">${val}</span>
           </div>`
        : '';

    const section = (title, color, content) => `
    <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:${color};margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ${color}20;">${title}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px 16px;">
            ${content}
        </div>
    </div>`;

    const ipsList = l.ips
        ? l.ips.split('\n').filter(Boolean).map(ip =>
            `<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(59,130,246,0.08);font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--primary);border:1px solid rgba(59,130,246,0.15);margin:2px 4px 2px 0;">${ip.trim()}</span>`
          ).join('')
        : '—';

    const body = `
    <div style="max-height:75vh;overflow-y:auto;padding-right:4px;">
        <!-- Header banner -->
        <div style="background:linear-gradient(135deg,#059669,#064e3b);border-radius:12px;padding:20px 24px;margin-bottom:20px;color:#fff;">
            <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">${l.name}</div>
            ${l.ispCode ? `<div style="font-size:12px;font-family:'JetBrains Mono',monospace;opacity:0.8;margin-top:4px;">${l.ispCode}</div>` : ''}
            <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
                ${l.type ? `<span style="background:rgba(255,255,255,0.15);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${l.type}</span>` : ''}
                ${reg ? `<span style="background:rgba(255,255,255,0.1);padding:3px 10px;border-radius:20px;font-size:12px;">📍 ${reg.name}</span>` : ''}
                ${l.internet ? `<span style="background:rgba(255,255,255,0.1);padding:3px 10px;border-radius:20px;font-size:12px;">🌐 ${l.internet}</span>` : ''}
            </div>
        </div>

        ${section('Red e IPs', '#3b82f6', `
            ${row('Segmento', l.segment, true)}
            ${row('Máscara', l.mask, true)}
            ${row('Gateway', l.gateway, true)}
            ${row('DNS Principal', l.dns, true)}
            ${row('DNS Alternativo', l.dnsAlt, true)}
            ${row('Puerto FW', l.fwPort)}
        `)}

        ${l.ips ? `
        <div style="margin-bottom:20px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#3b82f6;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid rgba(59,130,246,0.2);">IPs Utilizables</div>
            <div>${ipsList}</div>
        </div>` : ''}

        ${(l.contactTel || l.contactWhatsapp || l.contactTickets) ? section('Contacto ISP', '#22c55e', `
            ${row('Teléfono', l.contactTel)}
            ${row('WhatsApp', l.contactWhatsapp)}
            ${row('Número para Tickets', l.contactTickets)}
        `) : ''}

        ${(l.managerName || l.managerTel || l.managerEmail) ? section('Encargado del Área', '#a855f7', `
            ${row('Nombre', l.managerName)}
            ${row('Teléfono', l.managerTel)}
            ${row('Correo', l.managerEmail)}
        `) : ''}

        ${(l.monitoringName || l.monitoringLink || l.monitoringUser) ? section('Sistema de Monitoreo', '#f59e0b', `
            ${row('Sistema', l.monitoringName)}
            ${l.monitoringLink ? `<div style="display:flex;flex-direction:column;gap:2px;grid-column:1/-1;">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);">Enlace</span>
                <a href="${l.monitoringLink}" target="_blank" rel="noopener" style="font-size:13px;color:var(--primary);word-break:break-all;">${l.monitoringLink}</a>
            </div>` : ''}
            ${row('Usuario', l.monitoringUser)}
            ${l.monitoringPass ? `<div style="display:flex;flex-direction:column;gap:4px;">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);">Clave</span>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span id="det-pass-val" style="font-size:13px;font-weight:600;color:var(--text);font-family:'JetBrains Mono',monospace;letter-spacing:1px;">••••••••</span>
                    <button type="button" id="det-pass-toggle" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;align-items:center;" title="Mostrar clave">
                        <svg id="det-pass-eye" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </div>` : ''}
        `) : ''}
    </div>`;

    showModal(`ISP: ${l.name}`, body, null, null);

    // Wire password reveal toggle in detail modal
    if (l.monitoringPass) {
        document.getElementById('det-pass-toggle')?.addEventListener('click', () => {
            const valEl = document.getElementById('det-pass-val');
            const eyeEl = document.getElementById('det-pass-eye');
            if (!valEl) return;
            const hidden = valEl.textContent === '••••••••';
            valEl.textContent = hidden ? l.monitoringPass : '••••••••';
            valEl.style.letterSpacing = hidden ? '0' : '1px';
            eyeEl.innerHTML = hidden
                ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
                : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
        });
    }
}

function showIspLinkForm(id, regionId) {
    const l = id ? (store.ispLinks || []).find(x => x.id === id) : null;
    const regOpts = store.regions.map(r =>
        `<option value="${r.id}" ${(l ? l.regionId : regionId) === r.id ? 'selected' : ''}>${r.name}</option>`
    ).join('');

    const typeOpts = ['Fibra','Radio','Cable','Satélite','Otro'].map(t =>
        `<option value="${t}" ${l?.type === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    const v = f => l?.[f] || '';

    const body = `
    <div style="max-height:70vh;overflow-y:auto;padding-right:4px;">

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:var(--primary);margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(59,130,246,0.15);">Información General</div>
        <div class="form-row">
            <div class="form-group"><label>Nombre del ISP *</label><input id="fi-isp-name" value="${v('name')}" placeholder="Ej: Claro, Wind Telecom"></div>
            <div class="form-group"><label>Código / ID</label><input id="fi-isp-code" value="${v('ispCode')}" placeholder="Ej: CLR-001"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fi-isp-region"><option value="">Selecciona...</option>${regOpts}</select></div>
            <div class="form-group"><label>Tipo de Conexión</label><select id="fi-isp-type"><option value="">Tipo...</option>${typeOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Ancho de Banda (Internet)</label><input id="fi-isp-internet" value="${v('internet')}" placeholder="Ej: 100 Mbps, 1 Gbps"></div>
            <div class="form-group"><label>Segmento de Red</label><input id="fi-isp-segment" value="${v('segment')}" placeholder="Ej: 192.168.1.0/24" style="font-family:'JetBrains Mono',monospace;"></div>
        </div>

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#3b82f6;margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(59,130,246,0.15);">Red e IPs</div>
        <div class="form-row">
            <div class="form-group"><label>Máscara</label><input id="fi-isp-mask" value="${v('mask')}" placeholder="Ej: 255.255.255.0" style="font-family:'JetBrains Mono',monospace;"></div>
            <div class="form-group"><label>Gateway</label><input id="fi-isp-gw" value="${v('gateway')}" placeholder="Ej: 192.168.1.1" style="font-family:'JetBrains Mono',monospace;"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>DNS Principal</label><input id="fi-isp-dns" value="${v('dns')}" placeholder="Ej: 8.8.8.8" style="font-family:'JetBrains Mono',monospace;"></div>
            <div class="form-group"><label>DNS Alternativo</label><input id="fi-isp-dns2" value="${v('dnsAlt')}" placeholder="Ej: 8.8.4.4" style="font-family:'JetBrains Mono',monospace;"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Puerto del FW</label><input id="fi-isp-fwport" value="${v('fwPort')}" placeholder="Ej: eth0 / WAN1"></div>
        </div>
        <div class="form-group"><label>IPs Utilizables (una por línea)</label>
            <textarea id="fi-isp-ips" rows="3" placeholder="Ej:&#10;192.168.1.10&#10;192.168.1.11" style="font-family:'JetBrains Mono',monospace;font-size:12px;resize:vertical;">${v('ips')}</textarea>
        </div>

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#22c55e;margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(34,197,94,0.15);">Contacto ISP</div>
        <div class="form-row">
            <div class="form-group"><label>Teléfono</label><input id="fi-isp-tel" value="${v('contactTel')}" placeholder="Ej: +1 809 000 0000"></div>
            <div class="form-group"><label>WhatsApp</label><input id="fi-isp-wa" value="${v('contactWhatsapp')}" placeholder="Ej: +1 849 000 0000"></div>
        </div>
        <div class="form-group"><label>Número para Tickets</label><input id="fi-isp-tickets" value="${v('contactTickets')}" placeholder="Ej: 2228-3130"></div>

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#a855f7;margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(168,85,247,0.15);">Encargado del Área</div>
        <div class="form-row">
            <div class="form-group"><label>Nombre</label><input id="fi-isp-mgr-name" value="${v('managerName')}" placeholder="Nombre completo"></div>
            <div class="form-group"><label>Teléfono</label><input id="fi-isp-mgr-tel" value="${v('managerTel')}" placeholder="Ej: +1 809 000 0000"></div>
        </div>
        <div class="form-group"><label>Correo Electrónico</label><input id="fi-isp-mgr-email" value="${v('managerEmail')}" placeholder="encargado@empresa.com" type="email"></div>

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#f59e0b;margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(245,158,11,0.15);">Sistema de Monitoreo</div>
        <div class="form-row">
            <div class="form-group"><label>Nombre del Sistema</label><input id="fi-isp-mon-name" value="${v('monitoringName')}" placeholder="Ej: Zabbix, PRTG, Cacti"></div>
            <div class="form-group"><label>Usuario</label><input id="fi-isp-mon-user" value="${v('monitoringUser')}" placeholder="Usuario de acceso"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Enlace / URL</label><input id="fi-isp-mon-link" value="${v('monitoringLink')}" placeholder="https://monitor.empresa.com"></div>
            <div class="form-group"><label>Clave</label>
                <div style="position:relative;">
                    <input id="fi-isp-mon-pass" type="password" value="${v('monitoringPass')}" placeholder="Contraseña" style="padding-right:40px;width:100%;box-sizing:border-box;">
                    <button type="button" id="fi-isp-mon-pass-toggle"
                            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;align-items:center;"
                            title="Mostrar/ocultar clave">
                        <svg id="fi-pass-eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    showModal(l ? `Editar ISP: ${l.name}` : 'Añadir ISP', body, () => {
        const name = document.getElementById('fi-isp-name').value.trim();
        if (!name) return alert('El nombre del ISP es requerido');

        const obj = {
            id:              l?.id || genId(),
            regionId:        document.getElementById('fi-isp-region').value || regionId || null,
            name,
            ispCode:         document.getElementById('fi-isp-code').value.trim(),
            segment:         document.getElementById('fi-isp-segment').value.trim(),
            internet:        document.getElementById('fi-isp-internet').value.trim(),
            type:            document.getElementById('fi-isp-type').value,
            ips:             document.getElementById('fi-isp-ips').value.trim(),
            mask:            document.getElementById('fi-isp-mask').value.trim(),
            gateway:         document.getElementById('fi-isp-gw').value.trim(),
            dns:             document.getElementById('fi-isp-dns').value.trim(),
            dnsAlt:          document.getElementById('fi-isp-dns2').value.trim(),
            fwPort:          document.getElementById('fi-isp-fwport').value.trim(),
            contactTel:      document.getElementById('fi-isp-tel').value.trim(),
            contactWhatsapp: document.getElementById('fi-isp-wa').value.trim(),
            contactTickets:  document.getElementById('fi-isp-tickets').value.trim(),
            managerName:     document.getElementById('fi-isp-mgr-name').value.trim(),
            managerTel:      document.getElementById('fi-isp-mgr-tel').value.trim(),
            managerEmail:    document.getElementById('fi-isp-mgr-email').value.trim(),
            monitoringName:  document.getElementById('fi-isp-mon-name').value.trim(),
            monitoringLink:  document.getElementById('fi-isp-mon-link').value.trim(),
            monitoringUser:  document.getElementById('fi-isp-mon-user').value.trim(),
            monitoringPass:  document.getElementById('fi-isp-mon-pass').value,
        };

        if (!store.ispLinks) store.ispLinks = [];
        if (l) {
            const idx = store.ispLinks.findIndex(x => x.id === l.id);
            if (idx !== -1) store.ispLinks[idx] = obj; else store.ispLinks.push(obj);
        } else {
            store.ispLinks.push(obj);
        }
        save(); closeModal();
        renderIspLinksView();
    }, l ? 'Guardar Cambios' : 'Añadir ISP');

    // Wire password show/hide toggle
    document.getElementById('fi-isp-mon-pass-toggle')?.addEventListener('click', () => {
        const input = document.getElementById('fi-isp-mon-pass');
        const icon  = document.getElementById('fi-pass-eye-icon');
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        icon.innerHTML = isHidden
            ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
            : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    });
}

// ─────────────────────────────────────────────────────────────
// ACCESS POINTS (AP)
// ─────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────
// SFP: Componentes Especializados
// ─────────────────────────────────────────────────────────────




// ─────────────────────────────────────────────────────────────
// SWITCH: Componentes Especializados
// ─────────────────────────────────────────────────────────────




// ─────────────────────────────────────────────────────────────
// ANTENAS: Componentes Especializados
// ─────────────────────────────────────────────────────────────




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

// ─────────────────────────────────────────────────────────────
// NVR: Componentes Especializados
// ─────────────────────────────────────────────────────────────




// ─────────────────────────────────────────────────────────────
// UPS: Componentes Especializados
// ─────────────────────────────────────────────────────────────


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



// ─────────────────────────────────────────────────────────────
// SUPRESORES: Componentes Especializados
// ─────────────────────────────────────────────────────────────




// ─────────────────────────────────────────────────────────────
// PDU: Componentes Especializados
// ─────────────────────────────────────────────────────────────




// ─────────────────────────────────────────────────────────────
// PATCH PANELS: Componentes Especializados
// ─────────────────────────────────────────────────────────────




// ─────────────────────────────────────────────────────────────
// BANDEJAS DE FIBRA: Componentes Especializados
// ─────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────
// ORGANIZADORES: Componentes Especializados
// ─────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────
// PATCHCORDS: Componentes Especializados
// ─────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────
// PATCHCORDS DE FIBRA: Componentes Especializados
// ─────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────
// SHARED: Simple filter setup for passive element types
// ─────────────────────────────────────────────────────────────

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
