// ════════════════════════════════════════════════════════════════
//  PLANOS · Constantes, unidades y estado compartido
//
//  _ctx es el editor de planos abierto: solo renderPlanos() lo cambia,
//  con fijarCtx(), porque un import no se puede reasignar. M guarda los
//  nodos del lienzo abierto (lo llena initCanvasEngine()).
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════

// ── Constantes ──────────────────────────────────────────────────
const PX_PER_MM = 96 / 25.4;          // 96 DPI estándar: 1 mm ≈ 3.78 px
export const RULER_SIZE = 22;
export const HANDLE_SIZE = 8;                // tamaño visual del grip
export const CLOSE_THRESHOLD = 12;           // distancia en px para cerrar polilínea

export const STROKE_COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

// Herramientas principales del rail izquierdo
export const TOOLS_TOP = [
    { id: 'select', name: 'Seleccionar',         key: 'S', icon: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>' },
    { id: 'hand',   name: 'Mover lienzo (Pan)',  key: 'H', icon: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>' },
    { id: 'shape',  name: 'Formas',              key: 'R', icon: '<rect x="3" y="3" width="8" height="8"/><circle cx="17" cy="7" r="4"/><polygon points="12 14 5 21 19 21"/>', dropdown: 'shapes' },
    { id: 'symbol', name: 'Símbolos de red',     key: 'N', icon: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>', dropdown: 'symbols' },
    { id: 'text',   name: 'Texto',               key: 'T', icon: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>' },
    { id: 'pen',    name: 'Mano alzada',         key: 'F', icon: '<path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>' },
    { id: 'eraser', name: 'Borrar',              key: 'E', icon: '<path d="M20 20H7L3 16a2 2 0 010-2.83L13.17 3a2 2 0 012.83 0l5 5a2 2 0 010 2.83L11 20"/>' }
];

// Variantes del dropdown de Formas
export const SHAPES = [
    { id: 'line',     name: 'Línea',           desc: 'Cada click = segmento · ESC = fin', icon: '<line x1="4" y1="20" x2="20" y2="4"/>' },
    { id: 'polygon',  name: 'Polígono',        desc: 'Conectado · Enter = cerrar',         icon: '<polygon points="12 3 22 9 19 22 5 22 2 9"/>' },
    { id: 'rect',     name: 'Rectángulo',      desc: 'Shift = cuadrado',                   icon: '<rect x="3" y="3" width="18" height="18"/>' },
    { id: 'circle',   name: 'Círculo',         desc: 'Desde centro',                       icon: '<circle cx="12" cy="12" r="10"/>' },
    { id: 'ellipse',  name: 'Elipse',          desc: 'Eje X/Y libres',                     icon: '<ellipse cx="12" cy="12" rx="10" ry="6"/>' },
    { id: 'triangle', name: 'Triángulo',       desc: 'Equilátero',                         icon: '<polygon points="12 3 22 21 2 21"/>' },
    { id: 'arrow',    name: 'Flecha',          desc: 'Dirección',                          icon: '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/>' }
];

// Variantes del dropdown de Símbolos de red (más adelante define cómo se dibujan)
export const SYMBOLS = [
    // Core network
    { id: 'router',    name: 'Router',          cat: 'Core',     defaultSize: 64 },
    { id: 'switch',    name: 'Switch',          cat: 'Core',     defaultSize: 80 },
    { id: 'firewall',  name: 'Firewall',        cat: 'Core',     defaultSize: 64 },
    { id: 'modem',     name: 'Módem / ONT',     cat: 'Core',     defaultSize: 64 },
    // Servidores
    { id: 'server',    name: 'Servidor',        cat: 'Compute',  defaultSize: 56 },
    { id: 'nvr',       name: 'NVR / DVR',       cat: 'Compute',  defaultSize: 60 },
    // Video
    { id: 'cam_dome',  name: 'Cámara Domo',     cat: 'Video',    defaultSize: 48 },
    { id: 'cam_bullet',name: 'Cámara Bullet',   cat: 'Video',    defaultSize: 48 },
    // Wireless
    { id: 'ap',        name: 'Access Point',    cat: 'Wireless', defaultSize: 50 },
    { id: 'antenna',   name: 'Antena',          cat: 'Wireless', defaultSize: 50 },
    // Endpoint
    { id: 'pc',        name: 'PC',              cat: 'Endpoint', defaultSize: 56 },
    { id: 'laptop',    name: 'Laptop',          cat: 'Endpoint', defaultSize: 56 },
    { id: 'phone',     name: 'Teléfono IP',     cat: 'Endpoint', defaultSize: 48 },
    { id: 'printer',   name: 'Impresora',       cat: 'Endpoint', defaultSize: 56 },
    // Infraestructura
    { id: 'rack',      name: 'Rack',            cat: 'Infra',    defaultSize: 56 },
    { id: 'ups',       name: 'UPS / SAI',       cat: 'Infra',    defaultSize: 50 },
    { id: 'patch',     name: 'Patch Panel',     cat: 'Infra',    defaultSize: 70 },
    // Red externa
    { id: 'cloud',     name: 'Nube',            cat: 'WAN',      defaultSize: 70 },
    { id: 'internet',  name: 'Internet',        cat: 'WAN',      defaultSize: 70 }
];

// ── Conversión de unidades ──────────────────────────────────────
function pxToMm(px)  { return px / PX_PER_MM; }
export function pxToCm(px)  { return px / (PX_PER_MM * 10); }
export function fmtLen(px)  {
    const mm = pxToMm(px);
    if (mm >= 10) return `${pxToCm(px).toFixed(2)} cm`;
    return `${mm.toFixed(1)} mm`;
}
export function fmtLenFull(px) {
    return `${Math.round(px)} px · ${pxToMm(px).toFixed(1)} mm · ${pxToCm(px).toFixed(2)} cm`;
}

// ── Estado global del editor ────────────────────────────────────
export let _ctx = null;

// Lo usa renderPlanos() (blueprint-section.js)
export function fijarCtx(nuevo) {
    _ctx = nuevo;
}

// ── Motor del lienzo ─────────────────────────────────────────────
// Nodos del editor abierto y su devicePixelRatio. Antes eran variables
// locales de initCanvasEngine() que compartían sus funciones internas;
// ahora esas funciones viven fuera (más abajo) y leen de aquí. Solo hay un
// motor vivo a la vez: initCanvasEngine() retira el anterior antes de
// llenar M otra vez.
export const M = {};
