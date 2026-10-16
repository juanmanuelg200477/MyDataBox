// ════════════════════════════════════════════════════════════════
//  APUNTES · Estado compartido
//
//  _ctx es la sección abierta. Los demás módulos lo leen; solo
//  renderApuntes() lo cambia, con fijarCtx(), porque un import no se
//  puede reasignar.
//  Extraído de notes-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════

export let _ctx = null;

// Lo usa renderApuntes() (notes-section.js)
export function fijarCtx(nuevo) {
    _ctx = nuevo;
}
