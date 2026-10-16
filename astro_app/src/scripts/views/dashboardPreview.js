// ════════════════════════════════════════════════════════════════
//  DASHBOARD CARD PREVIEW
//  Modal centrado con detalle expandido de cada card del dashboard.
//  ─ Gráfica grande
//  ─ KPIs adicionales
//  ─ Filtros (búsqueda, región, estado)
//  ─ Tabla detallada
//  ─ Exportación CSV
//  
//  Aquí se abre y se filtra. Lo de cada tarjeta está en
//  ./dashboardPreview/tarjetas.js y las gráficas en graficos.js.
// ════════════════════════════════════════════════════════════════
import { icons } from '../icons.js';
import { escapeHtml } from '../utils.js';
import { BUILDERS } from './dashboardPreview/tarjetas.js';

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
