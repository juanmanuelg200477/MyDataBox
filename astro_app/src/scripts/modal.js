import { icons } from './icons.js';

const OVERLAY_ID = 'modal-overlay';

let _activeOverlay = null;
let _escHandler = null;
let _prevBodyOverflow = '';

export function showModal(title, bodyHTML, onSave, saveLabel = 'Guardar') {
    // Nunca apilamos overlays: antes se podían crear dos nodos con el mismo id
    // y closeModal() eliminaba el primero del árbol (el de abajo), dejando el
    // visible huérfano y bloqueando toda la UI sin forma de cerrarlo.
    closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'form-overlay';
    overlay.id = OVERLAY_ID;
    overlay.onclick = e => { if (e.target === overlay) closeModal(); };
    overlay.innerHTML = `<div class="form-modal">
        <div class="form-modal-header">
            <h3>${title}</h3>
            <button class="form-modal-close" id="btn-close-modal">${icons.close}</button>
        </div>
        <div class="form-modal-body">${bodyHTML}</div>
        <div class="form-modal-footer">
            <button class="btn btn-outline" id="btn-cancel-modal">Cancelar</button>
            ${onSave ? `<button class="btn btn-primary" id="modal-save">${saveLabel}</button>` : ''}
        </div>
    </div>`;
    document.body.appendChild(overlay);

    _activeOverlay    = overlay;
    _prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    _escHandler = e => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', _escHandler);

    // Buscamos dentro del overlay y no por id global, para no depender de
    // que este sea el único overlay presente en el documento.
    if (onSave) overlay.querySelector('#modal-save').onclick = onSave;
    overlay.querySelector('#btn-close-modal').onclick  = closeModal;
    overlay.querySelector('#btn-cancel-modal').onclick = closeModal;

    setTimeout(() => overlay.querySelector('input,select')?.focus(), 100);
}

export function closeModal() {
    if (_escHandler) {
        document.removeEventListener('keydown', _escHandler);
        _escHandler = null;
    }

    if (_activeOverlay) {
        _activeOverlay.remove();
        _activeOverlay    = null;
        document.body.style.overflow = _prevBodyOverflow;
        _prevBodyOverflow = '';
    }

    // Red de seguridad: overlays que hayan quedado de una navegación anterior.
    const orphans = document.querySelectorAll(`#${OVERLAY_ID}`);
    if (orphans.length) {
        orphans.forEach(el => el.remove());
        document.body.style.overflow = '';
    }
}
