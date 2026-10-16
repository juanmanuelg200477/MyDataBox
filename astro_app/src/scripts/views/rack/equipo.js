// ─────────────────────────────────────────────────────────────
// BASTIDOR — un equipo en una U: elegirlo, ver su ficha, guardarlo o retirarlo.
// Extraído de rackLogic.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, isViewer, save } from '../../store.js';
import { icons } from '../../icons.js';
import { rackLayout } from '../../rackLayout.js';
import { pintarDetalles } from './ficha.js';

export function renderRackDevice(app, rackId, unit) {
    const rack = store.racks.find(r => String(r.id) === String(rackId));
    if (!rack) { window.location.href = '/bastidores'; return; }
    // Una U tapada por un equipo de varias U no es un hueco libre: lleva a
    // la ficha de ese equipo en vez de ofrecer montar otro encima.
    const dueno = rackLayout(rack).owner[unit];
    if (dueno && dueno.base !== unit) {
        history.replaceState(history.state, '', `/rack?id=${rack.id}&u=${dueno.base}`);
        return renderRackDevice(app, rackId, dueno.base);
    }
    const existing  = rack.slots && rack.slots[unit];
    if (isViewer() && !existing) { window.location.href = `/rack?id=${rackId}`; return; }
    const rackAreaName = store.areas.find(a => a.id === rack.areaId)?.name || '';

    document.getElementById('breadcrumb').innerHTML = `<span>DataBox IT</span><span class="sep">›</span><span>Bastidores</span><span class="sep">›</span><span>${rack.name}</span><span class="sep">›</span><span class="current">U${unit}</span>`;

    // Build the category list from all unique device types in the store.
    // 'General' is a view category, not a device type — never appears in d.device.
    const deviceTypes = [...new Set(
        store.devices.map(d => d.device).filter(Boolean)
    )].sort();
    // Also include custom categories that might have no devices yet
    const customNames = (store.categories || []).map(c => c.name).filter(n => !deviceTypes.includes(n));
    const allTypes = [...deviceTypes, ...customNames].sort();

    app.innerHTML = `
    <style>
        .rd-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            margin-top: 16px;
            animation: fadeSlideIn 0.25s ease;
        }
        @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .rd-card-header {
            padding: 14px 20px;
            background: var(--bg);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .rd-type-pill {
            background: var(--primary);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            padding: 4px 10px;
            border-radius: 20px;
        }
        .rd-device-name {
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            color: var(--text);
        }
        .rd-card-body { padding: 20px; }
        .rd-section-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            color: var(--text-muted);
            margin: 20px 0 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--border);
        }
        .rd-section-label:first-child { margin-top: 0; }
        .rd-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: 14px;
        }
        .rd-field { display: flex; flex-direction: column; gap: 3px; }
        .rd-field-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: var(--text-muted);
        }
        .rd-field-value {
            font-size: 14px;
            font-weight: 500;
            color: var(--text);
        }
        .rd-field-value.mono {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
        }
        .rd-field-value.muted { color: var(--text-muted); font-style: italic; font-size: 13px; }
        .rd-color-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 20px;
            padding: 12px 16px;
            background: var(--bg);
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        .rd-color-swatch {
            width: 36px; height: 36px; border-radius: 8px;
            border: 2px solid var(--border); cursor: pointer;
            transition: transform 0.15s;
        }
        .rd-color-swatch:hover { transform: scale(1.08); }
        .rd-ports-btn {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-top: 20px;
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px solid rgba(59, 130, 246, 0.35);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.03));
            color: var(--text);
            text-decoration: none;
            transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .rd-ports-btn:hover { border-color: var(--primary); box-shadow: 0 6px 18px -8px rgba(59, 130, 246, 0.6); transform: translateY(-1px); }
        .rd-ports-ico {
            display: grid;
            place-items: center;
            flex: none;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: var(--primary);
            color: #fff;
        }
        .rd-ports-ico svg { width: 22px; height: 22px; }
        .rd-ports-txt { flex: 1; display: grid; gap: 2px; min-width: 0; }
        .rd-ports-txt strong { font-size: 14px; }
        .rd-ports-txt small { font-size: 12px; color: var(--text-muted); }
        .rd-ports-flecha { font-size: 24px; line-height: 1; color: var(--primary); }
        .rd-actions-container {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
        }
        @media (max-width: 768px) {
            .rd-actions-container {
                flex-direction: column-reverse;
                align-items: stretch;
                padding-bottom: 80px; /* Space for the floating nav menu on mobile */
            }
            .rd-actions-container .btn {
                width: 100%;
                justify-content: center;
                padding: 12px;
            }
        }
    </style>

    <div class="view-transition">
        <div class="page-header">
            <h1>Dispositivo — ${rack.name} / U${unit}</h1>
            <div class="page-header-actions">
                <a href="/rack?id=${rack.id}" class="btn btn-outline">← Volver al rack</a>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h2>${existing ? (isViewer() ? 'Detalles del Dispositivo' : 'Editar Dispositivo Montado') : 'Asignar Dispositivo Físico'}</h2>
            </div>
            <div style="padding:20px">
                <div class="form-row" style="${isViewer() ? 'display:none;' : ''}">
                    <div class="form-group">
                        <label>Categoría (Tipo)</label>
                        <select id="fd-category">
                            <option value="">Seleccione tipo...</option>
                            ${allTypes.map(t =>
                                `<option value="${t}" ${existing && existing.device === t ? 'selected' : ''}>${t}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Dispositivo disponible en [${rackAreaName || 'sin área'}]</label>
                        <select id="fd-global-device">
                            <option value="">Esperando categoría...</option>
                        </select>
                    </div>
                </div>

                <div id="rd-detail-panel"></div>

                <div class="rd-actions-container">
                    ${existing
                        ? `<button class="btn btn-danger" id="btn-delete-rd">${icons.trash} Retirar del Rack</button>`
                        : ''}
                    <a href="/rack?id=${rack.id}" class="btn btn-outline">Cancelar</a>
                    <button class="btn btn-success" id="btn-save-rd" style="display:none; justify-content: center;">${icons.save} Guardar en Rack</button>
                </div>
            </div>
        </div>
    </div>`;

    // ── Helpers ────────────────────────────────────────────────
    let currentDevObj = existing || null;
    const catSelect   = document.getElementById('fd-category');
    const devSelect   = document.getElementById('fd-global-device');
    const detailPanel = document.getElementById('rd-detail-panel');
    const btnSave     = document.getElementById('btn-save-rd');

    // La ficha de detalles (y sus ayudantes) vive en ficha.js
    const paintDetails = (devObj) => pintarDetalles({ unit, rack, existing, detailPanel, btnSave }, devObj);

    // ── Update device dropdown ─────────────────────────────────
    const updateDevSelect = () => {
        const cat = catSelect.value;
        if (!cat) {
            devSelect.innerHTML = '<option value="">Esperando categoría...</option>';
            paintDetails(null);
            return;
        }
        const pool = store.devices.filter(d => d.device === cat && d.area === rackAreaName);
        devSelect.innerHTML = '<option value="">— Seleccionar equipo —</option>';
        if (existing && existing.device === cat) {
            devSelect.innerHTML += `<option value="CURRENT_MOUNTED">★ ${existing.name} (instalado actualmente)</option>`;
        }
        pool.forEach(d => {
            const hint = [d.ip, d.serial ? 'S/N: ' + d.serial : ''].filter(Boolean).join(' · ');
            devSelect.innerHTML += `<option value="${d.id}">${d.name}${hint ? ' — ' + hint : ''}</option>`;
        });
        if (devSelect.options.length === 1) {
            devSelect.innerHTML = `<option value="">Sin dispositivos de este tipo en "${rackAreaName}"</option>`;
        }
        devSelect.dispatchEvent(new Event('change'));
    };

    catSelect.addEventListener('change', updateDevSelect);
    devSelect.addEventListener('change', () => {
        const id = devSelect.value;
        if (!id) { currentDevObj = null; paintDetails(null); return; }
        if (id === 'CURRENT_MOUNTED') { currentDevObj = existing; paintDetails(existing); return; }
        const found = store.devices.find(d => d.id === id) || null;
        currentDevObj = found;
        paintDetails(currentDevObj);
    });

    if (existing) {
        updateDevSelect();
        devSelect.value = 'CURRENT_MOUNTED';
        // updateDevSelect dispara dispatchEvent('change') internamente, lo que resetea
        // currentDevObj a null. Lo restauramos aquí explícitamente.
        currentDevObj = existing;
        paintDetails(existing);
    }

    // ── Save ───────────────────────────────────────────────────
    const btnSaveRd = document.getElementById('btn-save-rd');
    btnSaveRd?.addEventListener('click', async () => {
        if (btnSaveRd.disabled) return;
        if (!currentDevObj) return alert('Selecciona un dispositivo primero');

        // Se bloquea ANTES de mutar el store: este formulario se pinta inline
        // (no es un modal que se destruya al guardar), así que un doble clic
        // durante el await duplicaba el push a store.devices. Un id repetido
        // rompe el upsert por lote y aborta TODO el guardado del ciclo.
        btnSaveRd.disabled      = true;
        btnSaveRd.style.opacity = '0.6';

        const selectedId = devSelect.value;
        const newColor   = document.getElementById('fd-color')?.value || '#38a169';
        if (!rack.slots) rack.slots = {};

        if (existing && selectedId !== 'CURRENT_MOUNTED') {
            // Return previously mounted device to global pool
            // El tamaño en U es de su lugar en el bastidor: al salir se pierde
            delete existing.uHeight;
            store.devices.push(existing);
        }
        if (selectedId !== 'CURRENT_MOUNTED') {
            // Entra midiendo 1U; se agranda desde el bastidor con "Tamaño"
            rack.slots[unit] = { ...currentDevObj, color: newColor };
            delete rack.slots[unit].uHeight;
            store.devices = store.devices.filter(d => d.id !== currentDevObj.id);
        } else {
            rack.slots[unit].color = newColor;
        }
        // Await para que Supabase complete antes de navegar.
        // Sin await, load() en la siguiente página obtiene datos viejos.
        if (!await save()) {
            // No navegamos: el aviso de error se destruiría con la página y el
            // usuario se quedaría sin saber que su cambio no llegó al servidor.
            btnSaveRd.disabled      = false;
            btnSaveRd.style.opacity = '';
            return;
        }
        window.location.href = `/rack?id=${rackId}`;
    });

    // ── Delete / Retire ────────────────────────────────────────
    const btnDeleteRd = document.getElementById('btn-delete-rd');
    btnDeleteRd?.addEventListener('click', async () => {
        if (btnDeleteRd.disabled) return;
        if (confirm(`¿Retirar este dispositivo de la ${unit}U? Volverá al módulo de Dispositivos.`)) {
            btnDeleteRd.disabled      = true;
            btnDeleteRd.style.opacity = '0.6';
            const retirado = rack.slots[unit];
            delete retirado.uHeight;
            store.devices.push(retirado);
            delete rack.slots[unit];
            if (!await save()) {
                btnDeleteRd.disabled      = false;
                btnDeleteRd.style.opacity = '';
                return;
            }
            window.location.href = `/rack?id=${rackId}`;
        }
    });
}
