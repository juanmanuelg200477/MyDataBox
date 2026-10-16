// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — orientación y pantalla completa
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { toastError } from '../../../toast.js';
import { E, esTelefonoVertical } from './estado.js';

// ── Teléfono: horizontal y pantalla completa ────────────────────
export function revisarOrientacion() {
    E?.ed?.classList.toggle('girar', esTelefonoVertical());
}

export async function girar() {
    try {
        if (!document.fullscreenElement) await E.raiz.requestFullscreen({ navigationUI: 'hide' });
        await screen.orientation.lock('landscape');
    } catch {
        toastError('Este navegador no deja girar la pantalla desde aquí: gira el teléfono a lo horizontal.', { duration: 4500 });
    }
}

// En pantalla completa solo se ve lo que está dentro del elemento: los
// avisos tienen que vivir ahí mientras tanto (los diálogos ya lo hacen).
export function alPantallaCompleta() {
    if (!E) return;
    const fs = document.fullscreenElement;
    if (fs && (fs === E.raiz || fs.contains(E.raiz) || E.raiz.contains(fs))) {
        let pila = document.getElementById('toast-stack');
        if (!pila) {
            pila = document.createElement('div');
            pila.id = 'toast-stack';
            pila.className = 'toast-stack';
            pila.setAttribute('role', 'status');
            pila.setAttribute('aria-live', 'polite');
        }
        if (pila.parentElement !== fs) fs.appendChild(pila);
    } else {
        devolverAvisos();
    }
    revisarOrientacion();
}

export function devolverAvisos() {
    const pila = document.getElementById('toast-stack');
    if (pila && pila.parentElement !== document.body) document.body.appendChild(pila);
}

export function salirPantallaCompleta(raiz) {
    const fs = document.fullscreenElement;
    if (!fs || !(fs === raiz || raiz.contains(fs))) return;
    try { screen.orientation?.unlock?.(); } catch { /* sin soporte */ }
    document.exitFullscreen?.().catch(() => {});
}
