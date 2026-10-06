import { store, save, genId, logHistory, isViewer } from '../store.js';

// ─────────────────────────────────────────────────────────────
// NVR PROFILE — Vista de perfil completo + hoja de credenciales
// ─────────────────────────────────────────────────────────────

export function initNvrProfile(app) {
    const params = new URLSearchParams(window.location.search);
    const nvrId = params.get('id');

    // Buscar en dispositivos sueltos
    let nvr = store.devices.find(d =>
        String(d.id) === String(nvrId) && (d.device || '').toLowerCase() === 'nvr'
    );

    // Si no se encuentra, buscar en slots de racks
    if (!nvr) {
        for (const rack of store.racks) {
            for (const [unit, dev] of Object.entries(rack.slots || {})) {
                if ((dev.device || '').toLowerCase() === 'nvr') {
                    if (String(dev.id) === String(nvrId) || `rack_${rack.id}_${unit}` === nvrId) {
                        nvr = dev;
                        break;
                    }
                }
            }
            if (nvr) break;
        }
    }

    if (!nvr) { window.location.href = '/dispositivos'; return; }

    logHistory('device', nvr.id, nvr.name);
    if (!Array.isArray(nvr.credentials)) nvr.credentials = [];

    document.getElementById('breadcrumb').innerHTML =
        `<span>DataBox IT</span><span class="sep">›</span>` +
        `<a href="/dispositivos" style="color:#64748b;text-decoration:none">Dispositivos</a>` +
        `<span class="sep">›</span><span>NVR</span>` +
        `<span class="sep">›</span><span class="current">${nvr.name}</span>`;

    renderNvrProfile(app, nvr, false);
}

// ─────────────────────────────────────────────────────────────
// Render principal
// ─────────────────────────────────────────────────────────────
function renderNvrProfile(app, nvr, editMode) {
    const reg = store.regions.find(r => r.id === nvr.regionId);

    const statusClass = ['Up', 'Online', 'Activo'].includes(nvr.status)
        ? 'badge-active'
        : ['Down', 'Falla', 'Inactivo'].includes(nvr.status)
            ? 'badge-inactive'
            : 'badge-warning';

    app.innerHTML = `
    <style>
        /* ── Spreadsheet ── */
        .nvr-sheet-wrap { overflow-x: auto; }
        .nvr-sheet {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .nvr-sheet th {
            background: var(--bg);
            color: var(--text-muted);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .8px;
            text-transform: uppercase;
            padding: 10px 14px;
            border: 1px solid var(--border);
            text-align: center;
            white-space: nowrap;
        }
        .nvr-sheet th.group-header {
            background: var(--surface);
            color: var(--text);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: .5px;
            padding: 10px 14px;
        }
        .nvr-sheet td {
            padding: 9px 14px;
            border: 1px solid var(--border);
            vertical-align: middle;
            white-space: nowrap;
        }
        .nvr-sheet td.num-cell {
            text-align: center;
            color: var(--text-muted);
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            width: 40px;
        }
        .nvr-sheet td.val-cell {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            min-width: 160px;
        }
        .nvr-sheet tr:nth-child(even) td { background: rgba(0,0,0,.02); }
        .nvr-sheet tr:hover td { background: rgba(59,130,246,.04); }

        /* ── Inputs en modo edición ── */
        .nvr-sheet .cell-input {
            width: 100%;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 12px;
            font-family: 'JetBrains Mono', monospace;
            color: var(--text);
            box-sizing: border-box;
            min-width: 150px;
            transition: border-color .15s;
        }
        .nvr-sheet .cell-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(59,130,246,.15);
        }

        /* ── Info table ── */
        .nvr-info-table td {
            padding: 11px 14px;
            border-bottom: 1px solid var(--border);
            font-size: 14px;
        }
        .nvr-info-table td:first-child {
            color: var(--text-muted);
            width: 38%;
            font-size: 13px;
        }

        /* ── Botón añadir fila ── */
        .btn-add-row {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 14px;
            padding: 8px 16px;
            border: 1px dashed var(--border);
            border-radius: 8px;
            background: transparent;
            color: var(--primary);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all .15s;
        }
        .btn-add-row:hover {
            background: rgba(59,130,246,.07);
            border-color: var(--primary);
        }

        /* ── Animación ── */
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .view-transition { animation: fadeIn .25s ease; }
    </style>

    <div class="view-transition">
        <!-- HEADER ────────────────────────────── -->
        <div class="page-header" style="flex-wrap:wrap;gap:12px;">
            <div>
                <h1 style="font-size:26px;margin-bottom:6px;">${nvr.name}</h1>
                <span class="badge ${statusClass}" style="font-size:13px;">${nvr.status || '—'}</span>
                <span class="badge badge-info" style="font-size:13px;margin-left:6px;">NVR</span>
            </div>
            <div class="page-header-actions">
                <button onclick="window.history.back()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-weight:500;font-size:14px;padding:0;transition:color 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">← Volver Atrás</button>
            </div>
        </div>

        <!-- ESPECIFICACIONES ──────────────────── -->
        <div class="card" style="margin-bottom:20px;">
            <div class="card-header">
                <h2>Especificaciones Técnicas</h2>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap;padding:0;">
                <table class="nvr-info-table" style="width:100%;border-collapse:collapse;">
                    <tr><td>Nombre</td><td><strong>${nvr.name}</strong></td>
                        <td style="color:var(--text-muted);font-size:13px;width:38%;">Región</td>
                        <td style="font-size:14px;">${reg ? `<span class="badge badge-teal">${reg.name}</span>` : '—'}</td></tr>
                    <tr><td>Marca</td><td>${nvr.brand || '—'}</td>
                        <td style="color:var(--text-muted);font-size:13px;">Área</td>
                        <td>${nvr.area ? `<span class="badge badge-purple">${nvr.area}</span>` : '—'}</td></tr>
                    <tr><td>Modelo</td><td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${nvr.model || '—'}</td>
                        <td style="color:var(--text-muted);font-size:13px;">IP</td>
                        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;"><strong>${nvr.ip || '—'}</strong></td></tr>
                    <tr><td>Serie</td><td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${nvr.serial || '—'}</td>
                        <td style="color:var(--text-muted);font-size:13px;">MAC</td>
                        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${nvr.mac || '—'}</td></tr>
                    <tr><td>Dominio</td><td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${nvr.domain || '—'}</td>
                        <td style="color:var(--text-muted);font-size:13px;">Canales</td>
                        <td>${nvr.channels || '—'}</td></tr>
                    <tr><td>Discos / GB</td><td>${nvr.disks || '—'}</td>
                        <td style="color:var(--text-muted);font-size:13px;">Puerto Saliente</td>
                        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${nvr.outPort || '—'}</td></tr>
                    <tr><td>Puerto SW</td><td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${nvr.swPort || '—'}</td>
                        <td style="color:var(--text-muted);font-size:13px;">Mantenimiento</td>
                        <td style="font-size:13px;white-space:normal;">${nvr.maintenance || '—'}</td></tr>
                    <tr><td>Usuario</td><td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${nvr.user || '—'}</td>
                        <td style="color:var(--text-muted);font-size:13px;">Contraseña</td>
                        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">
                            ${nvr.password
            ? `<span style="display:inline-flex;align-items:center;gap:8px;">
                                       <span id="nvr-pass-val" style="letter-spacing:2px;">••••••••</span>
                                       <button id="nvr-pass-toggle" title="Mostrar/ocultar" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0;display:flex;align-items:center;">
                                           <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                       </button>
                                   </span>`
            : '—'}
                        </td></tr>
                </table>
            </div>
        </div>

        <!-- CREDENCIALES ──────────────────────── -->
        <div class="card">
            <div class="card-header">
                <h2>Credenciales de Acceso</h2>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${editMode
            ? `<button class="btn btn-outline" id="btn-cancel-creds" style="font-size:13px;">Cancelar</button>
                           <button class="btn btn-success" id="btn-save-creds" style="font-size:13px;">
                               <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                               Guardar
                           </button>`
            : (isViewer() ? '' : `<button class="btn btn-outline" id="btn-edit-creds" style="font-size:13px;">
                               <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                               Editar
                           </button>`)
        }
                </div>
            </div>

            <div style="padding:16px;">
                <div class="nvr-sheet-wrap">
                    <table class="nvr-sheet">
                        <thead>
                            <tr>
                                <th rowspan="2" style="width:40px;">#</th>
                                <th colspan="2" class="group-header">Cliente IVMS</th>
                                <th colspan="2" class="group-header">Acceso</th>
                                ${editMode ? '<th rowspan="2" style="width:50px;"></th>' : ''}
                            </tr>
                            <tr>
                                <th>Usuarios</th>
                                <th>Contraseñas</th>
                                <th>Usuarios</th>
                                <th>Contraseñas</th>
                            </tr>
                        </thead>
                        <tbody id="creds-tbody">
                            ${renderCredRows(nvr.credentials, editMode)}
                        </tbody>
                    </table>
                </div>

                ${editMode
            ? `<button class="btn-add-row" id="btn-add-row">
                           <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                           Añadir fila
                       </button>`
            : nvr.credentials.length === 0
                ? `<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:24px 0;">Sin credenciales registradas.${isViewer() ? '' : ' Haz clic en <strong>Editar</strong> para agregar.'}</p>`
                : ''
        }
            </div>
        </div>
    </div>`;

    // ── Wiring de eventos ─────────────────────────────────────

    // Toggle contraseña NVR
    const passToggle = document.getElementById('nvr-pass-toggle');
    const passVal = document.getElementById('nvr-pass-val');
    if (passToggle && passVal) {
        let visible = false;
        passToggle.addEventListener('click', () => {
            visible = !visible;
            passVal.textContent = visible ? (nvr.password || '') : '••••••••';
            passVal.style.letterSpacing = visible ? 'normal' : '2px';
        });
    }

    if (!editMode) {
        document.getElementById('btn-edit-creds')?.addEventListener('click', () => {
            if (!isViewer()) renderNvrProfile(app, nvr, true);
        });
        return;
    }

    // ── Modo edición ──────────────────────────────────────────

    // Cancelar
    document.getElementById('btn-cancel-creds')?.addEventListener('click', () => {
        renderNvrProfile(app, nvr, false);
    });

    // Guardar
    const btnSaveCreds = document.getElementById('btn-save-creds');
    btnSaveCreds?.addEventListener('click', async () => {
        if (btnSaveCreds.disabled) return;
        btnSaveCreds.disabled      = true;
        btnSaveCreds.style.opacity = '0.6';

        nvr.credentials = collectCredsFromDOM();
        // await: "Volver Atrás" está justo al lado y navega sin esperar nada;
        // sin esto, el load() de la página siguiente puede pisar las credenciales.
        if (!await save()) {
            // Seguimos en modo edición para que el usuario pueda reintentar.
            btnSaveCreds.disabled      = false;
            btnSaveCreds.style.opacity = '';
            return;
        }
        renderNvrProfile(app, nvr, false);
    });

    // Añadir fila
    document.getElementById('btn-add-row')?.addEventListener('click', () => {
        // Primero captura valores actuales del DOM para no perder lo escrito
        const current = collectCredsFromDOM();
        current.push({ id: genId(), userIvms: '', passIvms: '', userAccess: '', passAccess: '' });
        nvr.credentials = current;
        // Re-render solo el tbody
        document.getElementById('creds-tbody').innerHTML = renderCredRows(nvr.credentials, true);
        wireDeleteButtons(app, nvr);
        // Foco en el nuevo input
        const inputs = document.querySelectorAll('#creds-tbody .cell-input');
        inputs[inputs.length - 4]?.focus();
    });

    wireDeleteButtons(app, nvr);
}

// ─────────────────────────────────────────────────────────────
// Render de filas del spreadsheet
// ─────────────────────────────────────────────────────────────
function renderCredRows(credentials, editMode) {
    if (!editMode) {
        if (credentials.length === 0) return '';
        return credentials.map((c, i) => `
            <tr>
                <td class="num-cell">${i + 1}</td>
                <td class="val-cell">${escHtml(c.userIvms)}</td>
                <td class="val-cell">${escHtml(c.passIvms)}</td>
                <td class="val-cell">${escHtml(c.userAccess)}</td>
                <td class="val-cell">${escHtml(c.passAccess)}</td>
            </tr>`).join('');
    }

    // Modo edición
    return credentials.map((c, i) => `
        <tr data-cred-id="${c.id}">
            <td class="num-cell">${i + 1}</td>
            <td><input class="cell-input" data-field="userIvms" value="${escAttr(c.userIvms)}" placeholder="Usuario IVMS"></td>
            <td><input class="cell-input" data-field="passIvms" value="${escAttr(c.passIvms)}" placeholder="Contraseña IVMS"></td>
            <td><input class="cell-input" data-field="userAccess" value="${escAttr(c.userAccess)}" placeholder="Usuario Acceso"></td>
            <td><input class="cell-input" data-field="passAccess" value="${escAttr(c.passAccess)}" placeholder="Contraseña Acceso"></td>
            <td style="text-align:center;">
                <button class="btn-icon danger btn-del-row" data-cred-id="${c.id}" title="Eliminar fila">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </td>
        </tr>`).join('');
}

// ─────────────────────────────────────────────────────────────
// Lee los inputs del DOM y devuelve el array de credenciales
// ─────────────────────────────────────────────────────────────
function collectCredsFromDOM() {
    const rows = document.querySelectorAll('#creds-tbody tr[data-cred-id]');
    const result = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.cell-input');
        const cred = {
            id: row.dataset.credId,
            userIvms: inputs[0]?.value.trim() || '',
            passIvms: inputs[1]?.value.trim() || '',
            userAccess: inputs[2]?.value.trim() || '',
            passAccess: inputs[3]?.value.trim() || '',
        };
        result.push(cred);
    });
    return result;
}

// ─────────────────────────────────────────────────────────────
// Botones de borrar fila
// ─────────────────────────────────────────────────────────────
function wireDeleteButtons(app, nvr) {
    document.querySelectorAll('#creds-tbody .btn-del-row').forEach(btn => {
        btn.addEventListener('click', () => {
            const current = collectCredsFromDOM();
            const id = btn.dataset.credId;
            nvr.credentials = current.filter(c => c.id !== id);
            document.getElementById('creds-tbody').innerHTML = renderCredRows(nvr.credentials, true);
            wireDeleteButtons(app, nvr);
        });
    });
}

// ─────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────
function escHtml(str) {
    return (str || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
