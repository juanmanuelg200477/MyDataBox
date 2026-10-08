import { store, getAllDevices } from '../store.js';
import { icons } from '../icons.js';
import { escapeHtml } from '../utils.js';

// ════════════════════════════════════════════════════════════════
//  DASHBOARD CARD PREVIEW
//  Modal centrado con detalle expandido de cada card del dashboard.
//  ─ Gráfica grande
//  ─ KPIs adicionales
//  ─ Filtros (búsqueda, región, estado)
//  ─ Tabla detallada
//  ─ Exportación CSV
// ════════════════════════════════════════════════════════════════

const PAL = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#e11d48'];

const STATUS_COLORS = {
    'Activo': '#10b981', 'Up': '#10b981', 'Online': '#10b981',
    'Disponible': '#3b82f6', 'Nuevo': '#8b5cf6', 'Stock': '#f59e0b',
    'Mantenimiento': '#f97316', 'En reposo': '#94a3b8',
    'Inactivo': '#ef4444', 'Down': '#ef4444', 'Offline': '#ef4444', 'Falla': '#ef4444',
    'Desuso': '#64748b'
};

let _escHandler = null;
let _state = { rows: [], headers: [], filename: 'preview' };

// ── Entrada principal ────────────────────────────────────────────
export function openCardPreview(cardKey) {
    closeCardPreview();
    const cfg = BUILDERS[cardKey];
    if (!cfg) return;

    const { title, subtitle, accent, kpis, chart, headers, rows, filters, filename } = cfg();

    _state = { rows, headers, filename: filename || cardKey };

    const overlay = document.createElement('div');
    overlay.className = 'dbp-overlay';
    overlay.id = 'dbp-overlay';
    overlay.style.setProperty('--dbp-accent', accent);
    overlay.onclick = e => { if (e.target === overlay) closeCardPreview(); };

    overlay.innerHTML = `
        <div class="dbp-modal" role="dialog" aria-modal="true">
            <header class="dbp-head">
                <div class="dbp-head-bar"></div>
                <div class="dbp-head-info">
                    <div class="dbp-eyebrow">Vista detallada</div>
                    <h2 class="dbp-title">${title}</h2>
                    <div class="dbp-sub">${subtitle}</div>
                </div>
                <button class="dbp-close" id="dbp-close" title="Cerrar (Esc)">${icons.close}</button>
            </header>

            <div class="dbp-kpis">
                ${kpis.map(k => `
                    <div class="dbp-kpi" style="--c:${k.color || accent}">
                        <span class="dbp-kpi-n">${k.value}</span>
                        <span class="dbp-kpi-l">${k.label}</span>
                    </div>
                `).join('')}
            </div>

            <div class="dbp-body">
                <section class="dbp-chart">
                    <div class="dbp-section-hdr">
                        <span class="dbp-section-title">Visualización</span>
                    </div>
                    <div class="dbp-chart-host">${chart}</div>
                </section>

                <section class="dbp-table-wrap">
                    <div class="dbp-section-hdr">
                        <span class="dbp-section-title">Detalle (${rows.length})</span>
                        <div class="dbp-tools">
                            ${filters || ''}
                            <div class="dbp-search">
                                ${icons.search}
                                <input type="text" id="dbp-search" placeholder="Buscar...">
                            </div>
                            <button class="dbp-btn dbp-btn-export" id="dbp-export" title="Exportar a CSV">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                <span>Exportar</span>
                            </button>
                        </div>
                    </div>
                    <div class="dbp-table-scroll">
                        <table class="dbp-table" id="dbp-table">
                            <thead>
                                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                            </thead>
                            <tbody id="dbp-tbody">
                                ${renderRows(rows, headers)}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('dbp-open');

    // Animar entrada
    requestAnimationFrame(() => overlay.classList.add('dbp-show'));

    // Animar barras y donuts si los hay
    setTimeout(() => animateInsideChart(overlay), 80);

    // Listeners
    document.getElementById('dbp-close').onclick = closeCardPreview;
    document.getElementById('dbp-export').onclick = () => exportCSV(_state.filename, _state.headers, _state.rows);

    const search = document.getElementById('dbp-search');
    search.addEventListener('input', () => applyFilters(overlay));

    overlay.querySelectorAll('.dbp-filter-select').forEach(sel => {
        sel.addEventListener('change', () => applyFilters(overlay));
    });

    _escHandler = e => { if (e.key === 'Escape') closeCardPreview(); };
    document.addEventListener('keydown', _escHandler);
}

export function closeCardPreview() {
    const m = document.getElementById('dbp-overlay');
    if (!m) return;
    m.classList.remove('dbp-show');
    document.body.classList.remove('dbp-open');
    if (_escHandler) {
        document.removeEventListener('keydown', _escHandler);
        _escHandler = null;
    }
    setTimeout(() => m.remove(), 220);
}

// ── Render rows ─────────────────────────────────────────────────
// Cada celda lleva su encabezado en data-label: en móvil la tabla se
// reordena por CSS como tarjetas y usa esa etiqueta en lugar del <thead>,
// que ahí se oculta. Así se evita el scroll horizontal que cortaba las
// palabras a media pantalla.
function renderRows(rows, headers) {
    const titulos = Array.isArray(headers) ? headers : [];
    if (!rows.length) {
        return `<tr><td colspan="${titulos.length || 1}" class="dbp-empty">Sin resultados</td></tr>`;
    }
    return rows.map(r => `<tr>${r.map((c, i) =>
        `<td data-label="${escapeHtml(titulos[i] ?? '')}">${c == null ? '—' : c}</td>`
    ).join('')}</tr>`).join('');
}

// ── Filtros ─────────────────────────────────────────────────────
function applyFilters(overlay) {
    const q = (overlay.querySelector('#dbp-search')?.value || '').toLowerCase().trim();
    const filterVals = {};
    overlay.querySelectorAll('.dbp-filter-select').forEach(sel => {
        if (sel.value) filterVals[sel.dataset.col] = sel.value;
    });

    const filtered = _state.rows.filter(row => {
        if (q) {
            const txt = row.map(c => String(c ?? '').toLowerCase()).join(' ');
            if (!txt.includes(q)) return false;
        }
        for (const [col, val] of Object.entries(filterVals)) {
            const idx = parseInt(col);
            const cell = String(row[idx] ?? '').toLowerCase();
            if (!cell.includes(val.toLowerCase())) return false;
        }
        return true;
    });

    const tbody = overlay.querySelector('#dbp-tbody');
    if (tbody) tbody.innerHTML = renderRows(filtered, _state.headers);

    const title = overlay.querySelector('.dbp-table-wrap .dbp-section-title');
    if (title) title.textContent = `Detalle (${filtered.length}${filtered.length !== _state.rows.length ? ` de ${_state.rows.length}` : ''})`;
}

// ── Export CSV ──────────────────────────────────────────────────
function exportCSV(name, headers, rows) {
    const escape = v => {
        const s = String(v == null ? '' : v).replace(/<[^>]+>/g, ''); // strip HTML
        if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };
    const lines = [headers.map(escape).join(';')];
    rows.forEach(r => lines.push(r.map(escape).join(';')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `databox-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Animaciones internas ────────────────────────────────────────
function animateInsideChart(root) {
    root.querySelectorAll('.dbp-bar-fill').forEach(b => {
        const w = b.dataset.w;
        if (w) b.style.width = w + '%';
    });
    root.querySelectorAll('circle[data-len]').forEach(seg => {
        seg.style.strokeDasharray = `${seg.dataset.len} ${seg.dataset.circ}`;
    });
}

// ── Donut grande ────────────────────────────────────────────────
function buildDonutLarge(items, centerNum, centerLbl) {
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
function buildBarLarge(items) {
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
function regionFilter(colIdx) {
    if (!store.regions.length) return '';
    return `<select class="dbp-filter-select" data-col="${colIdx}">
        <option value="">Todas las regiones</option>
        ${store.regions.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
    </select>`;
}

function genericSelect(colIdx, label, values) {
    if (!values.length) return '';
    return `<select class="dbp-filter-select" data-col="${colIdx}">
        <option value="">${label}</option>
        ${values.map(v => `<option value="${v}">${v}</option>`).join('')}
    </select>`;
}

// ════════════════════════════════════════════════════════════════
//  BUILDERS DE CADA CARD
// ════════════════════════════════════════════════════════════════
const BUILDERS = {
    // 1. ESTADO DEL INVENTARIO ─────────────────────────────────
    status() {
        const devs = getAllDevices();
        const sMap = {};
        devs.forEach(d => { const s = d.status || 'Sin estado'; sMap[s] = (sMap[s] || 0) + 1; });
        const items = Object.entries(sMap)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] || '#94a3b8' }));

        const activos = devs.filter(d => d.status === 'Activo' || d.status === 'Up').length;
        const inactivos = devs.filter(d => ['Inactivo', 'Down', 'Falla'].includes(d.status)).length;
        const salud = devs.length ? Math.round(activos / devs.length * 100) : 0;

        const rows = devs.map(d => {
            const region = store.regions.find(r => r.id === d.regionId)?.name || '—';
            const status = d.status || 'Sin estado';
            const clr = STATUS_COLORS[status] || '#94a3b8';
            return [
                `<strong>${d.name || '—'}</strong>`,
                d.device || '—',
                `<span class="dbp-pill" style="--c:${clr}">${status}</span>`,
                region,
                d.area || '—',
                d.ip || '—'
            ];
        });

        const uniqStatuses = [...new Set(devs.map(d => d.status).filter(Boolean))];

        return {
            title: 'Estado del Inventario',
            subtitle: 'Distribución completa de dispositivos por estado operativo',
            accent: '#10b981',
            kpis: [
                { label: 'Total dispositivos', value: devs.length, color: '#3b82f6' },
                { label: 'Activos', value: activos, color: '#10b981' },
                { label: 'Inactivos / Falla', value: inactivos, color: '#ef4444' },
                { label: 'Salud general', value: salud + '%', color: salud >= 80 ? '#10b981' : salud >= 50 ? '#f59e0b' : '#ef4444' }
            ],
            chart: buildDonutLarge(items, devs.length, 'dispositivos'),
            headers: ['Nombre', 'Categoría', 'Estado', 'Región', 'Área', 'IP'],
            rows,
            filters: `
                ${regionFilter(3)}
                ${genericSelect(2, 'Todos los estados', uniqStatuses)}
            `,
            filename: 'estado-inventario'
        };
    },

    // 2. DISTRIBUCIÓN REGIONAL ─────────────────────────────────
    regions() {
        const devs = getAllDevices();
        const items = store.regions.map((r, i) => ({
            label: r.name,
            value: devs.filter(d => d.regionId === r.id).length,
            color: PAL[i % PAL.length],
            id: r.id
        })).sort((a, b) => b.value - a.value);

        const itemsForChart = items.filter(x => x.value > 0);

        const rows = store.regions.map((r, i) => {
            const clr = PAL[i % PAL.length];
            const dCount = devs.filter(d => d.regionId === r.id).length;
            const racks = store.racks.filter(rk => rk.regionId === r.id).length;
            const areas = store.areas.filter(a => a.regionId === r.id).length;
            const isps = (store.ispLinks || []).filter(s => s.regionId === r.id).length;
            const pct = devs.length ? Math.round(dCount / devs.length * 100) : 0;
            return [
                `<span class="dbp-dot" style="background:${clr}"></span> <strong>${r.name}</strong>`,
                dCount,
                areas,
                racks,
                isps,
                `<span class="dbp-mini-bar"><span style="width:${pct}%;background:${clr}"></span></span> ${pct}%`
            ];
        });

        const topRegion = items[0]?.label || '—';

        return {
            title: 'Distribución Regional',
            subtitle: 'Cobertura e infraestructura desplegada por región',
            accent: '#3b82f6',
            kpis: [
                { label: 'Regiones', value: store.regions.length, color: '#3b82f6' },
                { label: 'Áreas totales', value: store.areas.length, color: '#10b981' },
                { label: 'Dispositivos', value: devs.length, color: '#8b5cf6' },
                { label: 'Región líder', value: topRegion, color: '#f59e0b' }
            ],
            chart: buildDonutLarge(itemsForChart, store.regions.length, 'regiones'),
            headers: ['Región', 'Dispositivos', 'Áreas', 'Bastidores', 'ISPs', '% del total'],
            rows,
            filters: '',
            filename: 'distribucion-regional'
        };
    },

    // 3. CAPACIDAD DE BASTIDORES ───────────────────────────────
    racks() {
        const racks = store.racks || [];
        const data = racks.map(r => {
            const slots = r.slots ? Object.keys(r.slots).length : 0;
            const total = parseInt(r.height) || 42;
            const pct = Math.round((slots / total) * 100);
            const reg = store.regions.find(x => x.id === r.regionId)?.name || '—';
            return { ...r, slots, total, pct, reg };
        }).sort((a, b) => b.pct - a.pct);

        const totalU = data.reduce((s, r) => s + r.total, 0);
        const usedU = data.reduce((s, r) => s + r.slots, 0);
        const promPct = data.length ? Math.round(data.reduce((s, r) => s + r.pct, 0) / data.length) : 0;
        const criticos = data.filter(r => r.pct >= 75).length;

        const chartItems = data.slice(0, 10).map(r => ({
            label: r.name,
            value: r.pct,
            color: r.pct < 40 ? '#10b981' : r.pct < 75 ? '#f59e0b' : '#ef4444'
        }));

        const rows = data.map(r => {
            const clr = r.pct < 40 ? '#10b981' : r.pct < 75 ? '#f59e0b' : '#ef4444';
            const free = r.total - r.slots;
            return [
                `<a href="/rack?id=${r.id}" class="dbp-link"><strong>${r.name}</strong></a>`,
                r.reg,
                r.total + 'U',
                r.slots,
                free,
                `<span class="dbp-mini-bar"><span style="width:${r.pct}%;background:${clr}"></span></span> <strong style="color:${clr}">${r.pct}%</strong>`
            ];
        });

        return {
            title: 'Capacidad de Bastidores',
            subtitle: 'Ocupación y disponibilidad de cada bastidor instalado',
            accent: '#8b5cf6',
            kpis: [
                { label: 'Bastidores', value: racks.length, color: '#8b5cf6' },
                { label: 'Unidades totales', value: totalU, color: '#3b82f6' },
                { label: 'Ocupación promedio', value: promPct + '%', color: promPct >= 75 ? '#ef4444' : promPct >= 40 ? '#f59e0b' : '#10b981' },
                { label: 'En estado crítico', value: criticos, color: '#ef4444' }
            ],
            chart: buildBarLarge(chartItems),
            headers: ['Bastidor', 'Región', 'Altura', 'Ocupadas', 'Libres', 'Ocupación'],
            rows,
            filters: regionFilter(1),
            filename: 'bastidores'
        };
    },

    // 4. DISPOSITIVOS POR CATEGORÍA ────────────────────────────
    categories() {
        const devs = getAllDevices();
        const catMap = {};
        devs.forEach(d => {
            const k = d.device || 'Sin categoría';
            if (!catMap[k]) catMap[k] = [];
            catMap[k].push(d);
        });

        const sorted = Object.entries(catMap).sort((a, b) => b[1].length - a[1].length);
        const items = sorted.map(([cat, arr], i) => ({
            label: cat,
            value: arr.length,
            color: PAL[i % PAL.length]
        }));

        const rows = sorted.map(([cat, arr], i) => {
            const clr = PAL[i % PAL.length];
            const activos = arr.filter(d => d.status === 'Activo').length;
            const inactivos = arr.filter(d => ['Inactivo', 'Down', 'Falla'].includes(d.status)).length;
            const pctTotal = devs.length ? Math.round(arr.length / devs.length * 100) : 0;
            const brands = [...new Set(arr.map(d => d.brand).filter(Boolean))];
            return [
                `<span class="dbp-dot" style="background:${clr}"></span> <strong>${cat}</strong>`,
                arr.length,
                activos,
                inactivos,
                brands.slice(0, 3).join(', ') + (brands.length > 3 ? ` +${brands.length - 3}` : '—'),
                `<span class="dbp-mini-bar"><span style="width:${pctTotal}%;background:${clr}"></span></span> ${pctTotal}%`
            ];
        });

        const topCat = sorted[0]?.[0] || '—';
        const totalCats = sorted.length;

        return {
            title: 'Dispositivos por Categoría',
            subtitle: 'Distribución del inventario por tipo de dispositivo',
            accent: '#f59e0b',
            kpis: [
                { label: 'Categorías', value: totalCats, color: '#f59e0b' },
                { label: 'Dispositivos', value: devs.length, color: '#3b82f6' },
                { label: 'Categoría líder', value: topCat, color: '#8b5cf6' },
                { label: 'Top 1 cantidad', value: sorted[0]?.[1].length || 0, color: '#10b981' }
            ],
            chart: buildBarLarge(items),
            headers: ['Categoría', 'Total', 'Activos', 'Inactivos', 'Marcas', '% del inventario'],
            rows,
            filters: '',
            filename: 'categorias'
        };
    },

    // 5. INCIDENTES ISP ────────────────────────────────────────
    incidents() {
        const inc = store.ispIncidents || [];
        const abiertos = inc.filter(i => i.status === 'Abierto').length;
        const proceso = inc.filter(i => i.status === 'En proceso').length;
        const resueltos = inc.filter(i => i.status === 'Resuelto' || i.status === 'Cerrado').length;
        const criticos = inc.filter(i => i.severity === 'Crítico').length;

        const sevMap = {};
        inc.forEach(i => { const s = i.severity || 'Sin clasificar'; sevMap[s] = (sevMap[s] || 0) + 1; });
        const sevColor = { 'Crítico': '#ef4444', 'Alto': '#f97316', 'Medio': '#f59e0b', 'Bajo': '#10b981' };
        const items = Object.entries(sevMap).map(([label, value]) => ({
            label, value, color: sevColor[label] || '#94a3b8'
        }));

        const rows = inc.slice().sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        }).map(i => {
            const reg = store.regions.find(r => r.id === i.regionId)?.name || '—';
            const dt = i.date ? new Date(i.date).toLocaleDateString('es-DO') : '—';
            const sc = sevColor[i.severity] || '#94a3b8';
            const stc = i.status === 'Abierto' ? '#ef4444' : i.status === 'En proceso' ? '#f59e0b' : '#10b981';
            return [
                dt,
                `<strong>${i.isp || '—'}</strong>`,
                reg,
                `<span class="dbp-pill" style="--c:${sc}">${i.severity || '—'}</span>`,
                `<span class="dbp-pill" style="--c:${stc}">${i.status || '—'}</span>`,
                i.description ? (i.description.length > 60 ? i.description.slice(0, 60) + '…' : i.description) : '—'
            ];
        });

        return {
            title: 'Incidentes ISP',
            subtitle: 'Historial completo de incidencias y su estado actual',
            accent: '#ef4444',
            kpis: [
                { label: 'Total registrados', value: inc.length, color: '#64748b' },
                { label: 'Abiertos', value: abiertos, color: '#ef4444' },
                { label: 'En proceso', value: proceso, color: '#f59e0b' },
                { label: 'Críticos', value: criticos, color: '#8b5cf6' }
            ],
            chart: buildDonutLarge(items, inc.length, 'incidentes'),
            headers: ['Fecha', 'ISP', 'Región', 'Severidad', 'Estado', 'Descripción'],
            rows,
            filters: `
                ${regionFilter(2)}
                ${genericSelect(4, 'Todos los estados', ['Abierto', 'En proceso', 'Resuelto', 'Cerrado'])}
                ${genericSelect(3, 'Todas las severidades', ['Crítico', 'Alto', 'Medio', 'Bajo'])}
            `,
            filename: 'incidentes-isp'
        };
    },

    // 6. ISPs REGISTRADOS ──────────────────────────────────────
    isps() {
        const ispLinks = store.ispLinks || [];
        const byRegion = {};
        ispLinks.forEach(isp => {
            const name = store.regions.find(r => r.id === isp.regionId)?.name || 'Sin región';
            if (!byRegion[name]) byRegion[name] = [];
            byRegion[name].push(isp);
        });

        const items = Object.entries(byRegion).map(([region, arr], i) => ({
            label: region,
            value: arr.length,
            color: PAL[i % PAL.length]
        }));

        const rows = ispLinks.map(isp => {
            const reg = store.regions.find(r => r.id === isp.regionId)?.name || '—';
            return [
                `<strong>${isp.name || '—'}</strong>`,
                isp.isp_code || isp.code || '—',
                reg,
                isp.type || isp.segment || '—',
                isp.ip || isp.gateway || '—',
                isp.contact || isp.manager || '—'
            ];
        });

        const uniqProviders = [...new Set(ispLinks.map(i => i.name).filter(Boolean))].length;

        return {
            title: 'ISPs Registrados',
            subtitle: 'Proveedores de servicio de internet y sus enlaces',
            accent: '#06b6d4',
            kpis: [
                { label: 'Enlaces totales', value: ispLinks.length, color: '#06b6d4' },
                { label: 'Proveedores únicos', value: uniqProviders, color: '#3b82f6' },
                { label: 'Regiones cubiertas', value: Object.keys(byRegion).length, color: '#10b981' },
                { label: 'Promedio por región', value: Object.keys(byRegion).length ? (ispLinks.length / Object.keys(byRegion).length).toFixed(1) : '0', color: '#f59e0b' }
            ],
            chart: buildBarLarge(items),
            headers: ['Nombre', 'Código', 'Región', 'Tipo / Segmento', 'IP / Gateway', 'Contacto'],
            rows,
            filters: regionFilter(2),
            filename: 'isps-registrados'
        };
    },

    // 7. ACTIVIDAD RECIENTE ────────────────────────────────────
    activity() {
        const history = JSON.parse(localStorage.getItem('infrabox_history') || '[]');
        const racksCount = history.filter(h => h.type === 'rack').length;
        const devsCount = history.filter(h => h.type === 'device').length;

        const today = new Date().toDateString();
        const todayCount = history.filter(h => new Date(h.time).toDateString() === today).length;

        const items = [
            { label: 'Bastidores', value: racksCount, color: '#8b5cf6' },
            { label: 'Dispositivos', value: devsCount, color: '#3b82f6' }
        ].filter(i => i.value > 0);

        const rows = history.map(h => {
            const dt = new Date(h.time);
            const isRack = h.type === 'rack';
            const path = isRack ? `/rack?id=${h.id}` : `/device?id=${h.id}`;
            const clr = isRack ? '#8b5cf6' : '#3b82f6';
            return [
                dt.toLocaleDateString('es-DO'),
                dt.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false }),
                `<span class="dbp-pill" style="--c:${clr}">${isRack ? 'Bastidor' : 'Dispositivo'}</span>`,
                `<a href="${path}" class="dbp-link"><strong>${h.name || '—'}</strong></a>`
            ];
        });

        return {
            title: 'Actividad Reciente',
            subtitle: 'Registro de últimos accesos a elementos del inventario',
            accent: '#f97316',
            kpis: [
                { label: 'Accesos totales', value: history.length, color: '#f97316' },
                { label: 'Hoy', value: todayCount, color: '#10b981' },
                { label: 'Bastidores', value: racksCount, color: '#8b5cf6' },
                { label: 'Dispositivos', value: devsCount, color: '#3b82f6' }
            ],
            chart: items.length ? buildDonutLarge(items, history.length, 'accesos') : '<div class="dbp-empty-state">Sin actividad registrada</div>',
            headers: ['Fecha', 'Hora', 'Tipo', 'Elemento'],
            rows,
            filters: genericSelect(2, 'Todos los tipos', ['Bastidor', 'Dispositivo']),
            filename: 'actividad-reciente'
        };
    }
};
