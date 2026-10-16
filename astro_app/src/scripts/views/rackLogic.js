// ─────────────────────────────────────────────────────────────
// BASTIDORES — ruta de /rack: el bastidor entero o un equipo en una U.
// La vista vive en ./rack/vista.js y el equipo en ./rack/equipo.js.
// ─────────────────────────────────────────────────────────────
import { renderRackView } from './rack/vista.js';
import { renderRackDevice } from './rack/equipo.js';

export function renderRackRoute(app) {
    const params = new URLSearchParams(window.location.search);
    const rackId = params.get('id');
    const unit = params.get('u');
    
    if (rackId && unit) {
        renderRackDevice(app, rackId, parseInt(unit));
    } else if (rackId) {
        renderRackView(app, rackId);
    } else {
        window.location.href = '/bastidores';
    }
}
