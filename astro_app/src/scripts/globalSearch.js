import { navigate } from 'astro:transitions/client';
import { store, load, getAllDevices } from './store.js';
import { icons } from './icons.js';

// ════════════════════════════════════════════════════════════════
//  BÚSQUEDA GLOBAL
//
//  Un solo buscador para todo el inventario (dispositivos, bastidores,
//  regiones, áreas y contactos). Antes había que adivinar en qué
//  sección estaba cada cosa y buscar ahí dentro.
//
//  Se abre con el botón de la barra superior o con Ctrl/Cmd + K.
//  Estilos en ../styles/search.css
// ════════════════════════════════════════════════════════════════

const OVERLAY_ID    = 'gs-overlay';
const MAX_PER_GROUP = 6;

// Cada grupo define cómo se titula y a dónde lleva un resultado.
// Regiones, áreas y contactos no tienen página de detalle: llevan a su listado.
const GROUPS = [
    { key: 'devices',  label: 'Dispositivos', icon: icons.server, href: r => `/device?id=${encodeURIComponent(r.id)}` },
    { key: 'racks',    label: 'Bastidores',   icon: icons.rack,   href: r => `/rack?id=${encodeURIComponent(r.id)}` },
    { key: 'regions',  label: 'Regiones',     icon: icons.globe,  href: () => '/regiones' },
    { key: 'areas',    label: 'Áreas',        icon: icons.grid,   href: () => '/areas' },
    { key: 'contacts', label: 'Contactos',    icon: icons.users,  href: () => '/contactos' }
];

let _storeLoaded  = false;
let _flatItems    = [];
let _activeIndex  = 0;
let _keyHandler   = null;
let _prevOverflow = '';

function joinInfo(parts) {
    return parts.filter(Boolean).join(' · ');
}

function buildSources() {
    const regionName = id => (id ? store.regions.find(r => r.id === id)?.name ?? '' : '');
    const areaName   = id => (id ? store.areas.find(a => a.id === id)?.name ?? '' : '');

    return {
        devices: getAllDevices().map(d => ({
            id: d.id,
            title: d.name || 'Sin nombre',
            subtitle: joinInfo([d.device, d.rack ? `Rack ${d.rack}` : null, d.ip, d.area]),
            haystack: joinInfo([d.name, d.device, d.brand, d.model, d.serial, d.ip, d.mac, d.area, d.rack]).toLowerCase()
        })),
        racks: store.racks.map(r => ({
            id: r.id,
            title: r.name || 'Sin nombre',
            subtitle: joinInfo([r.type, regionName(r.regionId), areaName(r.areaId), r.height ? `${r.height}U` : null]),
            haystack: joinInfo([r.name, r.type, r.status, r.description, regionName(r.regionId), areaName(r.areaId)]).toLowerCase()
        })),
        regions: store.regions.map(r => ({
            id: r.id,
            title: r.name || 'Sin nombre',
            subtitle: r.location || '',
            haystack: joinInfo([r.name, r.location]).toLowerCase()
        })),
        areas: store.areas.map(a => ({
            id: a.id,
            title: a.name || 'Sin nombre',
            subtitle: joinInfo([regionName(a.regionId), a.description]),
            haystack: joinInfo([a.name, a.description, regionName(a.regionId)]).toLowerCase()
        })),
        contacts: store.contacts.map(c => ({
            id: c.id,
            title: c.name || 'Sin nombre',
            subtitle: joinInfo([c.role, c.phone, c.email, regionName(c.regionId)]),
            haystack: joinInfo([c.name, c.role, c.phone, c.email, regionName(c.regionId)]).toLowerCase()
        }))
    };
}

function collect(query) {
    const needle = query.toLowerCase().trim();
    if (!needle) return [];

    const sources = buildSources();
    const groups  = [];

    for (const group of GROUPS) {
        const hits = sources[group.key].filter(row => row.haystack.includes(needle));
        if (hits.length) groups.push({ group, hits: hits.slice(0, MAX_PER_GROUP), total: hits.length });
    }
    return groups;
}

function renderResults(listEl, query) {
    const groups = collect(query);
    listEl.textContent = '';
    _flatItems   = [];
    _activeIndex = 0;

    if (!query.trim()) {
        const hint = document.createElement('p');
        hint.className   = 'gs-hint';
        hint.textContent = 'Escribe para buscar en dispositivos, bastidores, regiones, áreas y contactos.';
        listEl.appendChild(hint);
        return;
    }

    if (!groups.length) {
        const empty = document.createElement('p');
        empty.className   = 'gs-hint';
        empty.textContent = `Sin resultados para “${query.trim()}”.`;
        listEl.appendChild(empty);
        return;
    }

    for (const { group, hits, total } of groups) {
        const header = document.createElement('div');
        header.className = 'gs-group';

        const name = document.createElement('span');
        name.textContent = group.label;
        header.appendChild(name);

        const count = document.createElement('span');
        count.className   = 'gs-group-count';
        // Avisamos cuando hay más coincidencias de las que caben en el grupo.
        count.textContent = total > hits.length ? `${hits.length} de ${total}` : String(total);
        header.appendChild(count);
        listEl.appendChild(header);

        for (const hit of hits) {
            const item = document.createElement('button');
            item.className = 'gs-item';
            item.type      = 'button';

            const ico = document.createElement('span');
            ico.className = 'gs-item-ico';
            ico.innerHTML = group.icon;

            const body = document.createElement('span');
            body.className = 'gs-item-body';

            // textContent: los nombres vienen de la base de datos.
            const title = document.createElement('span');
            title.className   = 'gs-item-title';
            title.textContent = hit.title;
            body.appendChild(title);

            if (hit.subtitle) {
                const sub = document.createElement('span');
                sub.className   = 'gs-item-sub';
                sub.textContent = hit.subtitle;
                body.appendChild(sub);
            }

            item.append(ico, body);
            item.onclick = () => go(group.href(hit));
            listEl.appendChild(item);

            _flatItems.push(item);
        }
    }

    highlight();
}

function highlight() {
    _flatItems.forEach((el, i) => el.classList.toggle('active', i === _activeIndex));
    _flatItems[_activeIndex]?.scrollIntoView({ block: 'nearest' });
}

function go(href) {
    closeSearch();
    navigate(href);
}

export function closeSearch() {
    if (_keyHandler) {
        document.removeEventListener('keydown', _keyHandler);
        _keyHandler = null;
    }
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = _prevOverflow;
    }
    _flatItems = [];
}

export async function openSearch() {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement('div');
    overlay.id        = OVERLAY_ID;
    overlay.className = 'gs-overlay';
    overlay.onclick   = e => { if (e.target === overlay) closeSearch(); };

    const panel = document.createElement('div');
    panel.className = 'gs-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Búsqueda global');

    const head = document.createElement('div');
    head.className = 'gs-head';

    const ico = document.createElement('span');
    ico.className = 'gs-head-ico';
    ico.innerHTML = icons.search;

    const input = document.createElement('input');
    input.className   = 'gs-input';
    input.type        = 'text';
    input.placeholder = 'Buscar en todo el inventario…';
    input.setAttribute('aria-label', 'Término de búsqueda');

    const esc = document.createElement('kbd');
    esc.className   = 'gs-kbd';
    esc.textContent = 'Esc';

    head.append(ico, input, esc);

    const list = document.createElement('div');
    list.className = 'gs-list';

    panel.append(head, list);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    _prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.focus();

    // Con los guards de ruta el store solo se carga en su propia página, así
    // que al abrir desde cualquier otra puede estar vacío.
    if (!_storeLoaded && !store.regions.length && !store.devices.length && !store.racks.length) {
        const loading = document.createElement('p');
        loading.className   = 'gs-hint';
        loading.textContent = 'Cargando inventario…';
        list.appendChild(loading);
        await load();
        _storeLoaded = true;
        if (!document.getElementById(OVERLAY_ID)) return; // se cerró mientras cargaba
    }

    renderResults(list, '');
    input.oninput = () => renderResults(list, input.value);

    _keyHandler = e => {
        if (e.key === 'Escape') { closeSearch(); return; }
        if (!_flatItems.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            _activeIndex = (_activeIndex + 1) % _flatItems.length;
            highlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            _activeIndex = (_activeIndex - 1 + _flatItems.length) % _flatItems.length;
            highlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            _flatItems[_activeIndex]?.click();
        }
    };
    document.addEventListener('keydown', _keyHandler);
}

// Atajo global. Se registra una sola vez por documento: el <body> se
// reemplaza en cada navegación, pero este módulo persiste.
let _shortcutBound = false;

export function initGlobalSearch() {
    document.getElementById('btn-global-search')?.addEventListener('click', openSearch);

    if (_shortcutBound) return;
    _shortcutBound = true;
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (document.getElementById(OVERLAY_ID)) closeSearch();
            else openSearch();
        }
    });
}
