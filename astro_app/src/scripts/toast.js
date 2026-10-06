import { icons } from './icons.js';

// ════════════════════════════════════════════════════════════════
//  NOTIFICACIONES
//
//  Canal visible para avisos al usuario. Nace para cubrir un hueco
//  concreto: cualquier fallo al sincronizar con Supabase terminaba en un
//  console.error invisible, así que el usuario creía que su cambio había
//  quedado guardado cuando solo estaba en memoria.
//
//  Estilos en ../styles/toast.css (importado desde Layout.astro).
// ════════════════════════════════════════════════════════════════

const CONTAINER_ID = 'toast-stack';

// Como máximo 4 avisos a la vez: una ráfaga de errores no debe tapar la app.
const MAX_VISIBLE = 4;

// Un error necesita más tiempo de lectura que una confirmación.
const DURATION_MS = { success: 4000, info: 4000, warning: 7000, error: 9000 };
const FALLBACK_DURATION_MS = 5000;

// Debe cubrir la animación toast-out de toast.css.
const EXIT_MS = 220;

const TYPE_ICON = {
    success: icons.check,
    error:   icons.alert,
    warning: icons.alert,
    info:    icons.info
};

// El <body> se reemplaza completo en cada view transition de Astro, así que
// el contenedor se busca (y se recrea si hace falta) en cada aviso.
function getStack() {
    let stack = document.getElementById(CONTAINER_ID);
    if (!stack) {
        stack = document.createElement('div');
        stack.id        = CONTAINER_ID;
        stack.className = 'toast-stack';
        stack.setAttribute('role', 'status');
        stack.setAttribute('aria-live', 'polite');
        document.body.appendChild(stack);
    }
    return stack;
}

function dismiss(toast) {
    if (!toast.isConnected || toast.dataset.leaving) return;
    toast.dataset.leaving = 'true';
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), EXIT_MS);
}

export function showToast(message, { type = 'info', title = '', detail = '', duration } = {}) {
    const stack = getStack();
    while (stack.children.length >= MAX_VISIBLE) stack.firstElementChild.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = TYPE_ICON[type] ?? icons.info;

    const body = document.createElement('div');
    body.className = 'toast-body';

    if (title) {
        const titleEl = document.createElement('strong');
        titleEl.className   = 'toast-title';
        titleEl.textContent = title;
        body.appendChild(titleEl);
    }

    // textContent y no innerHTML: el texto puede venir del mensaje de error de
    // Supabase, que a su vez puede incluir datos escritos por el usuario.
    const msgEl = document.createElement('span');
    msgEl.className   = 'toast-msg';
    msgEl.textContent = message;
    body.appendChild(msgEl);

    if (detail) {
        const detailEl = document.createElement('span');
        detailEl.className   = 'toast-detail';
        detailEl.textContent = detail;
        body.appendChild(detailEl);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Cerrar aviso');
    closeBtn.innerHTML = icons.close;
    closeBtn.onclick   = () => dismiss(toast);

    toast.append(icon, body, closeBtn);
    stack.appendChild(toast);

    const ms = duration ?? DURATION_MS[type] ?? FALLBACK_DURATION_MS;
    if (ms > 0) {
        let timer = setTimeout(() => dismiss(toast), ms);
        // Con el cursor encima se pausa el cierre: da tiempo a leer y a copiar
        // el detalle técnico de un error.
        toast.addEventListener('mouseenter', () => clearTimeout(timer));
        toast.addEventListener('mouseleave', () => { timer = setTimeout(() => dismiss(toast), ms); });
    }

    return toast;
}

export const toastSuccess = (message, opts) => showToast(message, { ...opts, type: 'success' });
export const toastError   = (message, opts) => showToast(message, { ...opts, type: 'error' });
