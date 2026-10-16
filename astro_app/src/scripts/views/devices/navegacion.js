// ─────────────────────────────────────────────────────────────
// NAVEGACIÓN — Dispositivos → categoría → subcategoría, con su paso
// en el historial del navegador y la miga de pan.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { navigate } from 'astro:transitions/client';
import { CATEGORY_MAP, subcatLabel } from './categorias.js';
import { renderDevicesTable } from './tabla.js';
import { renderCategoriesTable } from './tipos.js';

// ─────────────────────────────────────────────────────────────
// Navigation State
// ─────────────────────────────────────────────────────────────
let currentCategoryId = null;
export let currentSubcategory = null;

// Tokens del hash que refleja el nivel actual en la barra de direcciones.
const NAV_HASH_ROOT  = 'inicio';
const NAV_PARAM_CAT  = 'cat';
const NAV_PARAM_SUB  = 'sub';

// Flags de sincronización con el historial (ver _pushNavState / _onHistoryPop)
let _restoringFromHistory = false;
let _navHistorySynced     = false;
let _navPopstateBound     = false;

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
                <span class="dev-bc-current">${currentSubcategory === '__all__' ? 'Todos' : subcatLabel(currentSubcategory)}</span>`;
            title.textContent = currentSubcategory === '__all__' ? 'Todos los Dispositivos' : subcatLabel(currentSubcategory);
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

export function _readNavFromLocation() {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === NAV_HASH_ROOT) return { cat: null, sub: null };
    // Fallback a query params: los enlaces antiguos ?cat=…&sub=… siguen sirviendo.
    const params = new URLSearchParams(hash || window.location.search.replace(/^\?/, ''));
    return { cat: params.get(NAV_PARAM_CAT), sub: params.get(NAV_PARAM_SUB) };
}

export function _applyNavState({ cat, sub }) {
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

// Cada carga de página arranca su propia sincronización con el historial:
// el primer nivel que se renderice reemplaza la entrada actual. El listener
// de popstate vive en window (sobrevive a las view transitions): uno solo.
export function prepararHistorial() {
    _navHistorySynced = false;

    if (!_navPopstateBound) {
        _navPopstateBound = true;
        window.addEventListener('popstate', _onHistoryPop);
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
    showView('view-categories');
}

export function navigateToSubcategories(categoryId) {
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

export function navigateToDeviceTable(subcategoryName) {
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
