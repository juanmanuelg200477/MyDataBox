// ════════════════════════════════════════════════════════════════
//  PROYECTOS — iconos, números, fechas y textos
//  Extraído de projects.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { escapeHtml as esc } from '../../utils.js';
import { tipoDe } from '../../projectsStore.js';

// ── Iconos (trazos de Lucide) ───────────────────────────────────
const svg = (c) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c}</svg>`;
export const I = {
    mas:       svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
    lapiz:     svg('<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>'),
    basura:    svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    x:         svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    subir:     svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>'),
    bajar:     svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
    expandir:  svg('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>'),
    externo:   svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    calendario:svg('<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>'),
    tienda:    svg('<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/>'),
    clip:      svg('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>'),
    reloj:     svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    nota:      svg('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>'),
    bandera:   svg('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>'),
    presentar: svg('<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>'),
    izq:       svg('<path d="m15 18-6-6 6-6"/>'),
    der:       svg('<path d="m9 18 6-6-6-6"/>'),
    archivo:   svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>'),
    imagen:    svg('<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>'),
    carpeta:   svg('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
    minimizar: svg('<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/>'),
    maximizar: svg('<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>')
};

export const iconoTipo = (f) => {
    const t = tipoDe(f);
    if (t === 'imagen') return I.imagen;
    return `<span class="pj-tipo-txt">${t === 'pdf' ? 'PDF' : t === 'docx' || t === 'doc' ? 'W' : '•'}</span>`;
};

// ── Formatos ────────────────────────────────────────────────────
const nf2 = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });
const simbolo = (cur) => (cur === 'USD' ? 'US$' : 'Q');
export const monto = (n, cur) => `${simbolo(cur)} ${nf2.format(n)}`;
export const montoCorto = (n, cur) => n >= 1e6
    ? `${simbolo(cur)} ${(n / 1e6).toLocaleString('es-GT', { maximumFractionDigits: 2 })} M`
    : `${simbolo(cur)} ${nf0.format(n)}`;

const fechaDia = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
const fechaCompleta = new Intl.DateTimeFormat('es-GT', { dateStyle: 'long', timeStyle: 'short' });
// '2026-10-12' es una fecha sin hora: se arma en hora local para que no
// "retroceda" un día por la zona horaria.
export const fechaCorta = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return fechaDia.format(new Date(y, m - 1, d)); };
export const fechaHora = (iso) => (iso ? fechaCompleta.format(new Date(iso)) : '');

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

export function tamano(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toLocaleString('es-GT', { maximumFractionDigits: 1 })} MB`;
}

// Contexto con formato mínimo: líneas que empiezan por "-" son lista y
// **texto** resalta. Todo se escapa antes: no se interpreta HTML.
export function textoBonito(texto) {
    const negrita = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    let html = '';
    let lista = false;
    for (const linea of esc(texto).split(/\r?\n/)) {
        const item = linea.match(/^\s*[-•*]\s+(.*)$/);
        if (item) {
            if (!lista) { html += '<ul>'; lista = true; }
            html += `<li>${negrita(item[1])}</li>`;
            continue;
        }
        if (lista) { html += '</ul>'; lista = false; }
        html += linea.trim() ? `<p>${negrita(linea)}</p>` : '<div class="pj-ctx-aire"></div>';
    }
    return lista ? `${html}</ul>` : html;
}

export const sinAcentos = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const GUIA = `¿De qué se trata?
-

¿Por qué se necesita?
-

¿En qué vamos?
- `;
