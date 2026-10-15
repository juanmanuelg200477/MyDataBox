// ════════════════════════════════════════════════════════════════
//  MAPAS — piezas comunes de interfaz
//  Diálogos de cristal (claros en la lista, oscuros dentro del mapa),
//  confirmaciones, selector de imágenes y formatos.
// ════════════════════════════════════════════════════════════════
import { escapeHtml as esc } from '../../utils.js';

export { esc };

const svg = (c) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c}</svg>`;
export const I = {
    x:         svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    mas:       svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
    menos:     svg('<path d="M5 12h14"/>'),
    atras:     svg('<path d="m15 18-6-6 6-6"/>'),
    lapiz:     svg('<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>'),
    basura:    svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    restaurar: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
    imagen:    svg('<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>'),
    mapa:      svg('<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>'),
    pin:       svg('<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'),
    buscar:    svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    candado:   svg('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    abierto:   svg('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'),
    capas:     svg('<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>'),
    resumen:   svg('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
    ajustes:   svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    ajustar:   svg('<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'),
    panel:     svg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>'),
    externo:   svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    regla:     svg('<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>'),
    deshacer:  svg('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>'),
    check:     svg('<path d="M20 6 9 17l-5-5"/>'),
    flecha:    svg('<path d="m9 18 6-6-6-6"/>'),
    girar:     svg('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>'),
    camara:    svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>')
};

// ── Formatos ────────────────────────────────────────────────────
const fechaDia = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function haceCuanto(iso) {
    if (!iso) return '';
    const seg = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(seg);
    if (abs < 45) return 'hace un momento';
    if (abs < 3600) return relativo.format(Math.round(seg / 60), 'minute');
    if (abs < 86400) return relativo.format(Math.round(seg / 3600), 'hour');
    if (abs < 86400 * 7) return relativo.format(Math.round(seg / 86400), 'day');
    return `el ${fechaDia.format(new Date(iso))}`;
}

export const metros = (n) => `${Number(n).toLocaleString('es-GT', { maximumFractionDigits: 1 })} m`;

export const sinAcentos = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Diálogo de cristal ──────────────────────────────────────────
// Devuelve { caja, cerrar }. Los botones llevan data-r; al pulsar uno se
// llama a alPulsar(r) y, si devuelve algo distinto de false, se cierra.
// Escape y el clic fuera cierran (alPulsar(null)).
const abiertos = [];

export function dialogo({ titulo = '', cuerpo = '', botones = [], oscuro = false, ancho = 460, alPulsar = () => {}, clase = '' }) {
    const capa = document.createElement('div');
    capa.className = `mp-dlg ${oscuro ? 'oscuro' : ''} ${clase}`;
    capa.innerHTML = `<div class="mp-dlg-caja" role="dialog" aria-modal="true" style="--ancho:${ancho}px">
        ${titulo ? `<div class="mp-dlg-cab"><h3>${titulo}</h3><button type="button" class="mp-dlg-x" data-r="" aria-label="Cerrar">${I.x}</button></div>` : ''}
        <div class="mp-dlg-cuerpo">${cuerpo}</div>
        ${botones.length ? `<div class="mp-dlg-pie">${botones.map(b =>
            `<button type="button" class="mp-btn ${b.clase ?? ''}" data-r="${b.r}">${b.texto}</button>`).join('')}</div>` : ''}
    </div>`;

    let cerrado = false;
    const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        document.removeEventListener('keydown', teclas, true);
        const i = abiertos.indexOf(capa);
        if (i >= 0) abiertos.splice(i, 1);
        capa.classList.add('saliendo');
        setTimeout(() => capa.remove(), 160);
    };
    const pulsar = async (r) => {
        const salida = await alPulsar(r === '' ? null : r);
        if (salida !== false) cerrar();
    };
    const teclas = (e) => {
        if (abiertos[abiertos.length - 1] !== capa) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); pulsar(null); }
    };
    capa.addEventListener('click', (e) => {
        if (e.target === capa) { pulsar(null); return; }
        const b = e.target.closest('[data-r]');
        if (b && !b.disabled) pulsar(b.dataset.r);
    });
    document.addEventListener('keydown', teclas, true);
    // Si el mapa está a pantalla completa, solo se ve lo que va dentro de él
    (document.fullscreenElement ?? document.body).appendChild(capa);
    abiertos.push(capa);
    // Para cerrarlo desde fuera (al salir de la página) como si se cancelara
    capa.cancelar = () => { Promise.resolve(alPulsar(null)).catch(() => {}); cerrar(); };
    setTimeout(() => capa.querySelector('input:not([type=hidden]):not([type=color]), textarea, select')?.focus(), 60);
    return { caja: capa.querySelector('.mp-dlg-caja'), cerrar };
}

export const hayDialogo = () => abiertos.length > 0;

// Al cambiar de página el <body> se reemplaza: los diálogos abiertos no
// deben quedarse contados (bloquearían los atajos al volver).
export function cerrarDialogos() {
    [...abiertos].reverse().forEach(capa => capa.cancelar());
}

export function confirmar({ titulo, mensaje, boton = 'Eliminar', peligro = true, oscuro = false, icono = I.basura }) {
    return new Promise((resolver) => {
        dialogo({
            oscuro,
            ancho: 420,
            clase: 'mp-dlg-confirmar',
            cuerpo: `<div class="mp-conf">
                <div class="mp-conf-ico ${peligro ? 'peligro' : ''}">${icono}</div>
                <h3>${titulo}</h3>
                <p>${mensaje}</p>
            </div>`,
            botones: [
                { r: 'no', texto: 'Cancelar', clase: 'mp-btn-suave' },
                { r: 'si', texto: boton, clase: peligro ? 'mp-btn-peligro' : 'mp-btn-primario' }
            ],
            alPulsar: (r) => resolver(r === 'si')
        });
    });
}

// ── Imágenes ────────────────────────────────────────────────────
export function elegirImagen() {
    return new Promise((resolver) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/webp';
        input.onchange = () => resolver(input.files?.[0] ?? null);
        // Si se cierra el selector sin elegir, no hay evento: no pasa nada
        input.click();
    });
}

const TIPOS_OK = /^image\/(png|jpe?g|webp)$/i;

// Redimensiona en el navegador antes de subir: las portadas y fotos se
// ven a tamaño de tarjeta, no hace falta subir 12 megapíxeles.
export async function prepararImagen(file, { max = 1600, calidad = 0.86 } = {}) {
    if (!TIPOS_OK.test(file.type)) throw new Error('Elige una imagen PNG, JPG o WebP.');
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch { throw new Error('No se pudo leer la imagen. Prueba con otra en PNG o JPG.'); }
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * escala));
    const h = Math.max(1, Math.round(bmp.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', calidad));
    if (!blob) throw new Error('No se pudo procesar la imagen.');
    return { blob, w, h };
}

// El plano conserva su calidad: si no es enorme se sube tal cual. Solo se
// reduce si pasa de 6000 px por lado o de 20 MB. Aparte se hace una
// miniatura para la lista.
export async function prepararPlano(file) {
    if (!TIPOS_OK.test(file.type)) throw new Error('El plano debe ser una imagen PNG, JPG o WebP.');
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch { throw new Error('No se pudo leer la imagen del plano.'); }
    const { width, height } = bmp;
    bmp.close?.();
    const original = Math.max(width, height) <= 6000 && file.size <= 20 * 1024 * 1024;
    const plano = original ? { blob: file, w: width, h: height } : await prepararImagen(file, { max: 6000, calidad: 0.92 });
    const mini = await prepararImagen(file, { max: 900, calidad: 0.8 });
    return { plano, mini };
}

export const extension = (blob) => (blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp');
