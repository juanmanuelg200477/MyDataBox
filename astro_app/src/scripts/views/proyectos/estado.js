// ════════════════════════════════════════════════════════════════
//  PROYECTOS — estado de la vista
//
//  st es la vista abierta (null si no hay ninguna). Los demás módulos
//  lo leen; solo initProjects() y limpiar() lo cambian, con
//  fijarEstado(), porque un import no se puede reasignar.
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════

// ── Estado de la vista ──────────────────────────────────────────
export let st = null;

// Lo usan initProjects() y limpiar() (projects.js)
export function fijarEstado(nuevo) {
    st = nuevo;
}

// La vista elegida se recuerda en este navegador (es comodidad de cada quien)
const VISTA_KEY = 'databox:proyectos:vista';

export function vistaGuardada() {
    try { return localStorage.getItem(VISTA_KEY) === 'mini' ? 'mini' : 'tarjetas'; }
    catch { return 'tarjetas'; }
}

export function guardarVista(vista) {
    try { localStorage.setItem(VISTA_KEY, vista); } catch { /* modo privado */ }
}

export function escuchar(obj, ev, fn, op) {
    obj.addEventListener(ev, fn, op);
    st.escuchas.push([obj, ev, fn, op]);
}

export const proyecto = (id) => st.proyectos.find(p => p.id === id);
export const archivoVisto = (p) => p.files.find(f => f.id === st.sel.get(p.id)) ?? p.files[0] ?? null;
export const tarjeta = (id) => document.getElementById(`pj-${id}`);
