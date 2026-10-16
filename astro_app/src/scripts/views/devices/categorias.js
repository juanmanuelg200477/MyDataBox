// ─────────────────────────────────────────────────────────────
// CATEGORÍAS — las categorías de Dispositivos y sus subcategorías.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// CATEGORY MAP — Predefined visual categories
// Each subcategory name should match the `device` field of devices
// (stored in store.categories names). Matching is case-insensitive.
// ─────────────────────────────────────────────────────────────
export const CATEGORY_MAP = [
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
        subcategories: ['Switch', 'SFP', 'Firewall', 'Planta Telefónica', 'AP', 'Biométricos'],
        svgPath: `<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="18" cy="7" r="1" fill="currentColor"/><circle cx="14" cy="7" r="1" fill="currentColor"/>`
    },
    {
        id: 'isp',
        name: 'ISP',
        description: 'Conectividad e Internet',
        gradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
        accent: '#6ee7b7',
        subcategories: ['Controladoras', 'Routers', 'Reportes', 'ISPs General'],
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

// Nombre visible de una subcategoría cuando difiere del identificador.
// El identificador no se toca: es el que llevan guardados los dispositivos
// en su campo `device`, así que renombrarlo dejaría huérfano lo ya registrado.
const SUBCAT_LABELS = {
    'AP': 'Access Point'
};
export const subcatLabel = s => SUBCAT_LABELS[s] ?? s;

// Types that belong to "Elementos" — excluded from the General/Todos view
export const ELEMENTOS_TYPES = new Set([
    'patch panels', 'bandejas de fibra', 'organizadores', 'patchcords', 'patchcords de fibra'
]);
