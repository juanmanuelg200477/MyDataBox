// ════════════════════════════════════════════════════════════════
//  DASHBOARD CARD PREVIEW · colores, gráficas grandes y filtros
//  Extraído de dashboardPreview.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { store } from '../../store.js';

export const PAL = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#e11d48'];

export const STATUS_COLORS = {
    'Activo': '#10b981', 'Up': '#10b981', 'Online': '#10b981',
    'Disponible': '#3b82f6', 'Nuevo': '#8b5cf6', 'Stock': '#f59e0b',
    'Mantenimiento': '#f97316', 'En reposo': '#94a3b8',
    'Inactivo': '#ef4444', 'Down': '#ef4444', 'Offline': '#ef4444', 'Falla': '#ef4444',
    'Desuso': '#64748b'
};

// ── Donut grande ────────────────────────────────────────────────
export function buildDonutLarge(items, centerNum, centerLbl) {
    const total = items.reduce((s, i) => s + i.value, 0);
    if (!total) return '<div class="dbp-empty-state">Sin datos para mostrar</div>';

    const size = 220;
    const R = size * 0.42;
    const cx = size / 2, cy = size / 2;
    const circum = 2 * Math.PI * R;
    const gaps = items.length > 1 ? items.length * 4 : 0;
    const usable = circum - gaps;

    let offset = 0;
    const segs = items.map(item => {
        const len = (item.value / total) * usable;
        const dashOff = circum - offset;
        offset += len + (items.length > 1 ? 4 : 0);
        return { ...item, len, dashOff };
    });

    const svgSegs = segs.map(s => `
        <circle cx="${cx}" cy="${cy}" r="${R}"
            fill="none" stroke="${s.color}"
            stroke-width="${size * 0.11}"
            stroke-linecap="round"
            stroke-dasharray="0 ${circum}"
            stroke-dashoffset="${s.dashOff}"
            transform="rotate(-90 ${cx} ${cy})"
            data-len="${s.len.toFixed(3)}"
            data-circ="${circum.toFixed(3)}"
            style="transition:stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1);
                   filter:drop-shadow(0 0 6px ${s.color}66)"/>
    `).join('');

    const legend = segs.map(s => {
        const pct = Math.round((s.value / total) * 100);
        return `<div class="dbp-leg-row">
            <span class="dbp-leg-dot" style="background:${s.color}"></span>
            <span class="dbp-leg-name">${s.label}</span>
            <span class="dbp-leg-num" style="color:${s.color}">${s.value}</span>
            <span class="dbp-leg-pct">${pct}%</span>
        </div>`;
    }).join('');

    return `
        <div class="dbp-donut-wrap">
            <div class="dbp-svg-host">
                <!-- Solo viewBox: el tamaño en pantalla lo decide el CSS, para que
                     el marco y el dibujo midan siempre lo mismo (ver .dbp-svg-host). -->
                <svg viewBox="0 0 ${size} ${size}" overflow="visible">
                    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
                        stroke="var(--surface-3)" stroke-width="${size * 0.11}"/>
                    ${svgSegs}
                </svg>
                <div class="dbp-svg-center">
                    <span class="dbp-c-n">${centerNum}</span>
                    <span class="dbp-c-l">${centerLbl}</span>
                </div>
            </div>
            <div class="dbp-legend">${legend}</div>
        </div>
    `;
}

// ── Bar chart horizontal grande ─────────────────────────────────
export function buildBarLarge(items) {
    if (!items.length) return '<div class="dbp-empty-state">Sin datos para mostrar</div>';
    const max = Math.max(...items.map(i => i.value));
    return `<div class="dbp-bars">
        ${items.map((it, i) => {
            const clr = it.color || PAL[i % PAL.length];
            const pct = max ? Math.round((it.value / max) * 100) : 0;
            return `<div class="dbp-bar-row">
                <span class="dbp-bar-lbl" title="${it.label}">${it.label}</span>
                <div class="dbp-bar-track">
                    <div class="dbp-bar-fill" style="width:0%;background:linear-gradient(90deg,${clr}cc,${clr})" data-w="${pct}">
                        <span class="dbp-bar-n">${it.value}</span>
                    </div>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

// ── Region select genérico ──────────────────────────────────────
export function regionFilter(colIdx) {
    if (!store.regions.length) return '';
    return `<select class="dbp-filter-select" data-col="${colIdx}">
        <option value="">Todas las regiones</option>
        ${store.regions.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
    </select>`;
}

export function genericSelect(colIdx, label, values) {
    if (!values.length) return '';
    return `<select class="dbp-filter-select" data-col="${colIdx}">
        <option value="">${label}</option>
        ${values.map(v => `<option value="${v}">${v}</option>`).join('')}
    </select>`;
}
