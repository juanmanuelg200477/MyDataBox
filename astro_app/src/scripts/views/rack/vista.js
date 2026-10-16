// ─────────────────────────────────────────────────────────────
// BASTIDOR — vista del rack con sus U, ficha y gemelo digital.
// Extraído de rackLogic.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, logHistory, isViewer } from '../../store.js';
import { icons } from '../../icons.js';
import { rackLayout, usedUnits } from '../../rackLayout.js';
import { initRackArrange } from '../rackArrange.js';

export function renderRackView(app, rackId) {
    const rack = store.racks.find(r => String(r.id) === String(rackId));
    if (!rack) { window.location.href='/bastidores'; return; }
    
    logHistory('rack', rack.id, rack.name);
    
    // Set manual breadcrumb (not using standard setBreadcrumb globally)
    document.getElementById('breadcrumb').innerHTML = `<span>DataBox IT</span><span class="sep">›</span><span>Bastidores</span><span class="sep">›</span><span class="current">${rack.name}</span>`;

    const reg = store.regions.find(r => r.id === rack.regionId);
    const area = store.areas.find(a => a.id === rack.areaId);
    const layout = rackLayout(rack);
    const totalU = layout.total;
    const slotCount = rack.slots ? Object.keys(rack.slots).length : 0;
    // Uso de espacio en U ocupadas, no en equipos: uno de 2U llena dos
    const pct = Math.round((usedUnits(rack) / totalU) * 100);

    const rackRows = rackRowsHtml(rack, layout);

    app.innerHTML = `<style>
        .rack-view-container {
            display: flex;
            gap: 40px;
            align-items: flex-start;
            flex-wrap: wrap;
        }
        .rack-specs-wrapper {
            flex: 1;
            min-width: 300px;
        }
        .rack-digital-twin {
            position: relative; /* referencia del menú de acomodar (rackArrange.js) */
            width: 100%;
            max-width: 380px;
            background: #1a1a24;
            border-radius: 12px;
            padding: 24px 16px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.5), inset 0 2px 10px rgba(255,255,255,0.1);
            border: 2px solid #2a2a35;
            flex-shrink: 0;
            margin: 0 auto;
        }
        .rack-digital-twin-header {
            text-align: center;
            color: #fff;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 2px dashed #333;
        }
        .rack-digital-twin-header h3 { margin: 0; font-size: 16px; letter-spacing: 1px; text-transform: uppercase; color: #e2e8f0; }
        
        .rack-rails {
            background: #0f0f13;
            border-left: 24px solid #2a2a35;
            border-right: 24px solid #2a2a35;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.9);
            position: relative;
            border-radius: 4px;
        }
        /* Agujeros de los tornillos del riel (Screw holes) */
        .rack-rails::before, .rack-rails::after {
            content: '';
            position: absolute;
            top: 0; bottom: 0;
            width: 8px;
            background-image: radial-gradient(circle, #09090b 45%, transparent 55%);
            background-size: 100% 38px; /* cada U mide 38px */
            background-position: center 10px;
            pointer-events: none;
        }
        .rack-rails::before { left: -16px; }
        .rack-rails::after { right: -16px; }

        .dt-rack-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            position: relative;
            z-index: 2;
        }
        .dt-rack-table td {
            height: 38px;
            padding: 0;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            box-sizing: border-box;
            position: relative;
        }
        .rack-u-num {
            width: 32px;
            text-align: center;
            color: #64748b;
            font-size: 11px;
            background: rgba(0,0,0,0.6);
            font-family: 'JetBrains Mono', monospace;
            border-right: 2px solid #000;
        }
        .mobile-plus-btn-container {
            display: flex;
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            text-decoration: none;
            background: rgba(255, 255, 255, 0.001); /* iOS WebKit click target fix */
            align-items: center;
            justify-content: flex-end;
            padding-right: 12px;
            box-sizing: border-box;
            cursor: pointer;
        }
        .mobile-plus-btn {
            display: none;
        }
        @media (max-width: 768px) {
            .mobile-plus-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                background-color: #475569; /* Gris */
                color: #ffffff;
                font-size: 14px;
                font-weight: bold;
                border-radius: 4px; /* Un cuadrado redondito en vez de circulo, lucira mas DCIM */
                opacity: 0.8;
            }
        }
        .rack-u-slot.empty a:hover, tr:hover .rack-u-slot.empty a {
            background: rgba(59, 130, 246, 0.1);
            box-shadow: inset 0 0 10px rgba(59, 130, 246, 0.3);
        }
        .rack-u-slot {
            width: 100%;
        }
        .rack-u-slot.occupied a {
            display: flex;
            position: absolute;
            left: 2px;
            right: 2px;
            top: 1px;
            bottom: 1px;
            align-items: center;
            justify-content: center;
            color: #fff;
            text-decoration: none !important;
            font-size: 12px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
            box-shadow: inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.5);
            border: 1px solid rgba(0,0,0,0.8);
            border-top: 1px solid rgba(255,255,255,0.4);
            border-radius: 3px;
            box-sizing: border-box;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 8px;
        }
        .rack-u-slot.occupied a:hover {
            filter: brightness(1.15);
            transform: scale(1.02);
            z-index: 10;
            position: relative;
        }

        /* ── Teléfono ───────────────────────────────────────── */
        @media (max-width: 768px) {
            .rack-view-container { gap: 20px; }
            /* min-width:300px obligaba a un ancho que no siempre cabe */
            .rack-specs-wrapper { min-width: 0; width: 100%; }

            /* La tabla de especificaciones es de dos columnas
               (etiqueta / valor): debe ajustar el texto en vez de
               provocar scroll lateral, que es lo que hace la regla
               general de tablas en móvil. */
            .table-details { white-space: normal; }
            .table-details td { word-break: break-word; }

            /* El nombre del equipo se salía del riel cuando era largo */
            .rack-u-slot.occupied a {
                font-size: 10.5px;
                padding: 0 6px;
                overflow: hidden;
                white-space: nowrap;
            }
            .rack-digital-twin { padding: 18px 12px; }
            .rack-digital-twin-header h3 { font-size: 14px; }
        }
    </style>
    <div class="view-transition">
        <div class="page-header">
            <h1>${icons.rack} ${rack.name}</h1>
            <div class="page-header-actions">
                <a href="/bastidores" class="btn btn-outline">← Volver</a>
            </div>
        </div>
        
        <div class="rack-view-container">
            <div class="rack-specs-wrapper">
                <div class="card">
                    <div class="card-header">
                        <h2>Especificaciones Técnicas</h2>
                    </div>
                    <table class="table-details" style="width:100%;border-collapse:collapse;">
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted);width:40%">Nombre</td><td style="padding:12px"><strong>${rack.name}</strong></td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Región</td><td style="padding:12px"><span class="badge badge-teal">${reg ? reg.name : '—'}</span></td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Área</td><td style="padding:12px">${area ? area.name : '—'}</td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Estado</td><td style="padding:12px"><span class="badge ${rack.status === 'Activo' ? 'badge-active' : 'badge-warning'}">${rack.status}</span></td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Tipo</td><td style="padding:12px">${rack.type || '—'}</td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Descripción</td><td style="padding:12px">${rack.description || '—'}</td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Anchura</td><td style="padding:12px">${rack.width ? rack.width + ' cm' : '—'}</td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Altura</td><td style="padding:12px;font-family:'JetBrains Mono'"><strong>${totalU}U</strong></td></tr>
                        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-muted)">Dispositivos</td><td style="padding:12px;font-family:'JetBrains Mono'"><strong>${slotCount}</strong> alojados</td></tr>
                        <tr><td style="padding:12px;color:var(--text-muted)">Uso de espacio</td><td style="padding:12px">
                            <div class="space-bar" style="max-width:150px">
                                <div class="space-bar-fill"><div style="width:${pct}%;background:${pct < 30 ? 'var(--success)' : pct < 70 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
                                <span class="space-bar-pct">${pct}%</span>
                            </div>
                        </td></tr>
                    </table>
                </div>
            </div>

            <div class="rack-digital-twin">
                <div class="rack-digital-twin-header">
                    <h3>PANELES FRONTALES</h3>
                    <span style="font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace">ELEVACIÓN ${totalU}U • CLICK PARA EDITAR</span>
                </div>
                <div class="rack-rails">
                    <table class="dt-rack-table">${rackRows}</table>
                </div>
            </div>
        </div>
    </div>`;

    // Desplazar y cambiar tamaño (solo PC y solo para quien puede editar)
    if (!isViewer()) {
        initRackArrange({
            rack,
            twin:  app.querySelector('.rack-digital-twin'),
            table: app.querySelector('.dt-rack-table'),
            renderRows: (vista) => rackRowsHtml(rack, vista),
            onChange: () => renderRackView(app, rack.id)
        });
    }
}

// Filas del bastidor, de la U más alta a la 1. Un equipo de varias U se
// dibuja como un solo bloque (rowspan) que cubre todas sus filas.
function rackRowsHtml(rack, layout) {
    let html = '';
    for (let u = layout.total; u >= 1; u--) {
        const it = layout.owner[u];
        const num = `<td class="rack-u-num">${u}U</td>`;
        if (!it) {
            html += `<tr data-u="${u}" onclick="this.querySelector('a').click()" style="cursor:pointer;">
                ${num}
                <td class="rack-u-slot empty">
                    <a href="/rack?id=${rack.id}&u=${u}" class="mobile-plus-btn-container">
                        <span class="mobile-plus-btn">+</span>
                    </a>
                </td>
            </tr>`;
        } else if (u === it.top) {
            const h = it.top - it.base + 1;
            html += `<tr data-u="${u}">
                ${num}
                <td class="rack-u-slot occupied"${h > 1 ? ` rowspan="${h}"` : ''}>
                    <a href="/rack?id=${rack.id}&u=${it.base}" class="rack-device" data-base="${it.base}" style="background:${it.dev.color || '#38a169'}">${it.dev.name} - ${it.dev.device}</a>
                </td>
            </tr>`;
        } else {
            // Fila tapada por el bloque de un equipo de varias U
            html += `<tr data-u="${u}">${num}</tr>`;
        }
    }
    return html;
}
