import { store, getAllDevices } from '../store.js';

export function initDashboard() {
    if (!document.getElementById('db-wrap')) return;

    renderKPIs();
    renderStatusChart();
    renderRegionsChart();
    renderRacksChart();
    renderCategoriesChart();
    renderIncidents();
    renderIsps();
    renderActivity();
}

// ── Animated counter ──────────────────────────────────────
function animateCount(el, target) {
    let start = null;
    const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 900, 1);
        el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// ── KPIs ──────────────────────────────────────────────────
function renderKPIs() {
    const allDevs = getAllDevices();
    [
        ['stat-regions', store.regions.length],
        ['stat-areas', store.areas.length],
        ['stat-racks', store.racks.length],
        ['stat-devices', allDevs.length],
        ['stat-contacts', store.contacts.length],
        ['stat-isps', (store.ispLinks || []).length],
    ].forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, val);
    });
}

// ── SVG Donut builder ─────────────────────────────────────
// items: [{label, value, color}]
// Returns full HTML string for a .dbc-donut wrapper
function buildDonut(items, centerNum, centerLbl, size = 150) {
    const total = items.reduce((s, i) => s + i.value, 0);
    if (!total) return '<div class="db-empty">Sin datos</div>';

    const R = size * 0.44;
    const cx = size / 2;
    const cy = size / 2;
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

    const svgSegs = segs.map(s =>
        `<circle cx="${cx}" cy="${cy}" r="${R}"
            fill="none"
            stroke="${s.color}"
            stroke-width="${size * 0.115}"
            stroke-linecap="round"
            stroke-dasharray="0 ${circum}"
            stroke-dashoffset="${s.dashOff}"
            transform="rotate(-90 ${cx} ${cy})"
            data-len="${s.len.toFixed(3)}"
            data-circ="${circum.toFixed(3)}"
            style="transition:stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1);
                   filter:drop-shadow(0 0 4px ${s.color}66)"/>`
    ).join('');

    const legendRows = segs.map(s => {
        const pct = Math.round((s.value / total) * 100);
        return `<div class="dbc-leg-row">
            <span class="dbc-leg-dot" style="background:${s.color}"></span>
            <span class="dbc-leg-name">${s.label}</span>
            <span class="dbc-leg-num" style="color:${s.color}">${s.value}</span>
            <span class="dbc-leg-pct">${pct}%</span>
        </div>`;
    }).join('');

    return `<div class="dbc-donut">
        <div class="dbc-svg-wrap">
            <!-- Solo viewBox: el tamaño en pantalla lo decide el CSS, para que
                 el marco y el dibujo midan siempre lo mismo (ver .dbc-svg-wrap). -->
            <svg viewBox="0 0 ${size} ${size}" overflow="visible">
                <circle cx="${cx}" cy="${cy}" r="${R}"
                    fill="none" stroke="var(--surface-3)"
                    stroke-width="${size * 0.115}"/>
                ${svgSegs}
            </svg>
            <div class="dbc-center">
                <span class="dbc-c-num">${centerNum}</span>
                <span class="dbc-c-lbl">${centerLbl}</span>
            </div>
        </div>
        <div class="dbc-legend">${legendRows}</div>
    </div>`;
}

// ── Status donut ──────────────────────────────────────────
function renderStatusChart() {
    const el = document.getElementById('chart-status');
    if (!el) return;

    const allDevs = getAllDevices();
    const statusColors = {
        'Activo':        '#10b981',
        'Up':            '#10b981',
        'Online':        '#10b981',
        'Disponible':    '#3b82f6',
        'Nuevo':         '#8b5cf6',
        'Stock':         '#f59e0b',
        'Mantenimiento': '#f97316',
        'En reposo':     '#94a3b8',
        'Inactivo':      '#ef4444',
        'Down':          '#ef4444',
        'Offline':       '#ef4444',
        'Falla':         '#ef4444',
        'Desuso':        '#64748b',
    };
    const sMap = {};
    allDevs.forEach(d => { const s = d.status || 'Sin estado'; sMap[s] = (sMap[s] || 0) + 1; });

    const items = Object.entries(sMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value, color: statusColors[label] || '#94a3b8' }));

    el.innerHTML = buildDonut(items, allDevs.length, 'dispositivos');
    animateDonut(el);
}

// ── Regions donut ─────────────────────────────────────────
function renderRegionsChart() {
    const el = document.getElementById('chart-regions');
    if (!el) return;

    const allDevs = getAllDevices();
    const pal = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#e11d48'];

    const items = store.regions.map((r, i) => ({
        label: r.name,
        value: allDevs.filter(d => d.region === r.name || d.regionId === r.id).length,
        color: pal[i % pal.length],
    })).filter(r => r.value > 0).sort((a, b) => b.value - a.value);

    el.innerHTML = buildDonut(items, store.regions.length, 'regiones');
    animateDonut(el);
}

// ── Animate donut segments ────────────────────────────────
function animateDonut(container) {
    requestAnimationFrame(() => {
        // Frame 1: fijar estado inicial por CSS (el browser necesita un estilo
        // previo explícito para disparar la transición desde 0)
        container.querySelectorAll('circle[data-len]').forEach(seg => {
            seg.style.strokeDasharray = `0 ${seg.dataset.circ}`;
        });
        requestAnimationFrame(() => {
            // Frame 2: cambiar al valor final → la transición CSS anima
            container.querySelectorAll('circle[data-len]').forEach(seg => {
                seg.style.strokeDasharray = `${seg.dataset.len} ${seg.dataset.circ}`;
            });
        });
    });
}

// ── Racks chart ───────────────────────────────────────────
function renderRacksChart() {
    const el = document.getElementById('chart-racks');
    const chip = document.getElementById('db-racks-chip');
    if (!el) return;

    const racks = store.racks || [];
    if (chip) chip.textContent = `${racks.length} racks`;

    if (!racks.length) { el.innerHTML = '<div class="db-empty">Sin bastidores registrados</div>'; return; }

    const sorted = [...racks].map(r => {
        const slots = r.slots ? Object.keys(r.slots).length : 0;
        const total = parseInt(r.height) || 42;
        const pct = Math.round((slots / total) * 100);
        return { ...r, slots, total, pct };
    }).sort((a, b) => b.pct - a.pct);

    el.innerHTML = sorted.map(r => {
        const reg = store.regions.find(x => x.id === r.regionId)?.name || '—';
        const clr = r.pct < 40 ? '#10b981' : r.pct < 75 ? '#f59e0b' : '#ef4444';
        const free = r.total - r.slots;
        return `<div class="dbc-rack-row">
            <div class="dbc-rack-hdr">
                <span class="dbc-rack-name" onclick="window.location.href='/rack?id=${r.id}'">${r.name}</span>
                <span class="dbc-rack-pct" style="color:${clr}">${r.pct}%</span>
            </div>
            <div class="dbc-rack-meta">${reg} · ${r.slots} ocupadas · ${free} libres</div>
            <div class="db-bar-bg" style="height:6px;margin-top:5px">
                <div class="db-bar-fill" style="width:0%;background:linear-gradient(90deg,${clr}bb,${clr}ff)" data-w="${r.pct}"></div>
            </div>
        </div>`;
    }).join('');

    requestAnimationFrame(() =>
        el.querySelectorAll('.db-bar-fill').forEach(b => b.style.width = b.dataset.w + '%')
    );
}

// ── Categories horizontal bar chart ──────────────────────
function renderCategoriesChart() {
    const el = document.getElementById('chart-categories');
    if (!el) return;

    const allDevs = getAllDevices();
    const catMap = {};
    allDevs.forEach(d => {
        const k = d.device || d.category || d.type || 'Sin categoría';
        catMap[k] = (catMap[k] || 0) + 1;
    });

    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!sorted.length) { el.innerHTML = '<div class="db-empty">Sin dispositivos</div>'; return; }

    const max = sorted[0][1];
    const pal = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#e11d48'];

    el.innerHTML = sorted.map(([cat, n], i) => {
        const clr = pal[i % pal.length];
        const pct = Math.round((n / max) * 100);
        return `<div class="dbc-cat-row">
            <span class="dbc-cat-name" title="${cat}">${cat}</span>
            <div class="dbc-cat-bar">
                <div class="dbc-cat-fill" style="width:0%;background:linear-gradient(90deg,${clr}cc,${clr})" data-w="${pct}">
                    <span class="dbc-cat-n">${n}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    requestAnimationFrame(() =>
        el.querySelectorAll('.dbc-cat-fill').forEach(b => b.style.width = b.dataset.w + '%')
    );
}

// ── Incidents ─────────────────────────────────────────────
function renderIncidents() {
    const kpisEl = document.getElementById('chart-incidents-kpis');
    const listEl = document.getElementById('chart-incidents-list');
    const incidents = store.ispIncidents || [];

    const abiertos = incidents.filter(i => i.status === 'Abierto').length;
    const enproceso = incidents.filter(i => i.status === 'En proceso').length;
    const criticos = incidents.filter(i => i.severity === 'Crítico').length;

    if (kpisEl) {
        kpisEl.innerHTML = [
            { l: 'Total', v: incidents.length, c: '#64748b' },
            { l: 'Abiertos', v: abiertos, c: '#ef4444' },
            { l: 'En proceso', v: enproceso, c: '#f59e0b' },
            { l: 'Críticos', v: criticos, c: '#8b5cf6' },
        ].map(k => `<div class="dbc-inc-kpi" style="border-color:${k.c}22;background:${k.c}08">
            <span class="dbc-inc-n" style="color:${k.c}">${k.v}</span>
            <span class="dbc-inc-l" style="color:${k.c}">${k.l}</span>
        </div>`).join('');
    }

    if (!listEl) return;
    const open = incidents.filter(i => i.status === 'Abierto' || i.status === 'En proceso').slice(0, 5);
    if (!open.length) { listEl.innerHTML = '<div class="db-empty">Sin incidentes activos ✓</div>'; return; }

    const sevC = { 'Crítico': '#ef4444', 'Alto': '#f97316', 'Medio': '#f59e0b', 'Bajo': '#10b981' };
    const stC = { 'Abierto': '#ef4444', 'En proceso': '#f59e0b' };

    listEl.innerHTML = open.map(inc => {
        const reg = store.regions.find(r => r.id === inc.regionId)?.name || '';
        const sc = sevC[inc.severity] || '#94a3b8';
        const tc = stC[inc.status] || '#64748b';
        const dt = inc.date ? new Date(inc.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }) : '';
        return `<div class="dbc-inc-item">
            <div class="dbc-inc-dot" style="background:${sc}"></div>
            <div class="dbc-inc-body">
                <span class="dbc-inc-isp">${inc.isp || '—'}</span>
                <span class="dbc-inc-meta">${reg}${reg && dt ? ' · ' : ''}${dt}</span>
            </div>
            <span class="dbc-inc-tag" style="background:${tc}18;color:${tc}">${inc.status}</span>
        </div>`;
    }).join('');
}

// ── ISPs ──────────────────────────────────────────────────
function renderIsps() {
    const el = document.getElementById('chart-isps');
    if (!el) return;

    const ispLinks = store.ispLinks || [];
    if (!ispLinks.length) { el.innerHTML = '<div class="db-empty">Sin ISPs registrados</div>'; return; }

    const byRegion = {};
    ispLinks.forEach(isp => {
        const name = store.regions.find(r => r.id === isp.regionId)?.name || 'Sin región';
        if (!byRegion[name]) byRegion[name] = [];
        byRegion[name].push(isp);
    });

    const pal = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    el.innerHTML = Object.entries(byRegion).map(([region, isps], i) => {
        const clr = pal[i % pal.length];
        const names = isps.slice(0, 2).map(s => s.name).join(', ') + (isps.length > 2 ? ` +${isps.length - 2}` : '');
        return `<div class="dbc-isp-row">
            <div class="dbc-isp-dot" style="background:${clr}"></div>
            <div class="dbc-isp-body">
                <span class="dbc-isp-name">${region}</span>
                <span class="dbc-isp-sub">${names}</span>
            </div>
            <span class="dbc-isp-bdg" style="background:${clr}18;color:${clr}">${isps.length}</span>
        </div>`;
    }).join('');
}

// ── Activity ──────────────────────────────────────────────
function renderActivity() {
    const el = document.getElementById('chart-activity');
    if (!el) return;

    const history = JSON.parse(localStorage.getItem('infrabox_history') || '[]');
    if (!history.length) { el.innerHTML = '<div class="db-empty">Sin actividad registrada</div>'; return; }

    const rackSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z"/></svg>`;
    const devSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/></svg>`;

    el.innerHTML = history.slice(0, 9).map(h => {
        const isRack = h.type === 'rack';
        const path = isRack ? `/rack?id=${h.id}` : `/device?id=${h.id}`;
        const clr = isRack ? '#8b5cf6' : '#3b82f6';
        const time = new Date(h.time).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `<div class="dbc-act-row" onclick="window.location.href='${path}'">
            <div class="dbc-act-ico" style="background:${clr}18;color:${clr}">${isRack ? rackSvg : devSvg}</div>
            <div class="dbc-act-body">
                <span class="dbc-act-name">${h.name}</span>
                <span class="dbc-act-type">${isRack ? 'Bastidor' : 'Dispositivo'}</span>
            </div>
            <span class="dbc-act-time">${time}</span>
        </div>`;
    }).join('');
}

