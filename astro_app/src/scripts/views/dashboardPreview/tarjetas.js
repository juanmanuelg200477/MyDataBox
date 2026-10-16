// ════════════════════════════════════════════════════════════════
//  DASHBOARD CARD PREVIEW · lo que muestra cada tarjeta
//  Extraído de dashboardPreview.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { getAllDevices, store } from '../../store.js';
import { usedUnits } from '../../rackLayout.js';
import { STATUS_COLORS, buildDonutLarge, regionFilter, genericSelect, PAL, buildBarLarge } from './graficos.js';

// ════════════════════════════════════════════════════════════════
//  BUILDERS DE CADA CARD
// ════════════════════════════════════════════════════════════════
export const BUILDERS = {
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
            const slots = usedUnits(r);   // U ocupadas: un equipo de 2U cuenta dos
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
