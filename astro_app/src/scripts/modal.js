import { icons } from './icons.js';

export function showModal(title, bodyHTML, onSave, saveLabel = 'Guardar') {
    const overlay = document.createElement('div');
    overlay.className = 'form-overlay';
    overlay.id = 'modal-overlay';
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

    if (onSave) document.getElementById('modal-save').onclick = onSave;
    document.getElementById('btn-close-modal').onclick = closeModal;
    document.getElementById('btn-cancel-modal').onclick = closeModal;

    setTimeout(() => overlay.querySelector('input,select')?.focus(), 100);
}

export function closeModal() {
    const m = document.getElementById('modal-overlay');
    if (m) m.remove();
}
