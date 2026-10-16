// ─────────────────────────────────────────────────────────────
// ISPs GENERAL — ficha de un enlace y su formulario.
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, genId, save } from '../../store.js';
import { showModal, closeModal } from '../../modal.js';
import { renderIspLinksView } from './ispEnlaces.js';

export function showIspLinkDetail(id) {
    const l = (store.ispLinks || []).find(x => x.id === id);
    if (!l) return;

    const reg = store.regions.find(r => r.id === l.regionId);

    const row = (label, val, mono = false) => val
        ? `<div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
               <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);">${label}</span>
               <span class="isp-net-val" style="font-size:13px;font-weight:600;color:var(--text);${mono ? "font-family:'JetBrains Mono',monospace;" : ''}">${val}</span>
           </div>`
        : '';

    const section = (title, color, content) => `
    <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:${color};margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ${color}20;">${title}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px 16px;">
            ${content}
        </div>
    </div>`;

    const ipsList = l.ips
        ? l.ips.split('\n').filter(Boolean).map(ip =>
            `<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(59,130,246,0.08);font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--primary);border:1px solid rgba(59,130,246,0.15);margin:2px 4px 2px 0;">${ip.trim()}</span>`
          ).join('')
        : '—';

    const body = `
    <div style="max-height:calc(var(--vh-util) * 0.75);overflow-y:auto;padding-right:4px;">
        <!-- Header banner -->
        <div style="background:linear-gradient(135deg,#059669,#064e3b);border-radius:12px;padding:20px 24px;margin-bottom:20px;color:#fff;">
            <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">${l.name}</div>
            ${l.ispCode ? `<div style="font-size:12px;font-family:'JetBrains Mono',monospace;opacity:0.8;margin-top:4px;">${l.ispCode}</div>` : ''}
            <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
                ${l.type ? `<span style="background:rgba(255,255,255,0.15);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${l.type}</span>` : ''}
                ${reg ? `<span style="background:rgba(255,255,255,0.1);padding:3px 10px;border-radius:20px;font-size:12px;">📍 ${reg.name}</span>` : ''}
                ${l.internet ? `<span style="background:rgba(255,255,255,0.1);padding:3px 10px;border-radius:20px;font-size:12px;">🌐 ${l.internet}</span>` : ''}
            </div>
        </div>

        ${section('Red e IPs', '#3b82f6', `
            ${row('Segmento', l.segment, true)}
            ${row('Máscara', l.mask, true)}
            ${row('Gateway', l.gateway, true)}
            ${row('DNS Principal', l.dns, true)}
            ${row('DNS Alternativo', l.dnsAlt, true)}
            ${row('Puerto FW', l.fwPort)}
        `)}

        ${l.ips ? `
        <div style="margin-bottom:20px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#3b82f6;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid rgba(59,130,246,0.2);">IPs Utilizables</div>
            <div>${ipsList}</div>
        </div>` : ''}

        ${(l.contactTel || l.contactWhatsapp || l.contactTickets) ? section('Contacto ISP', '#22c55e', `
            ${row('Teléfono', l.contactTel)}
            ${row('WhatsApp', l.contactWhatsapp)}
            ${row('Número para Tickets', l.contactTickets)}
        `) : ''}

        ${(l.managerName || l.managerTel || l.managerEmail) ? section('Encargado del Área', '#a855f7', `
            ${row('Nombre', l.managerName)}
            ${row('Teléfono', l.managerTel)}
            ${row('Correo', l.managerEmail)}
        `) : ''}

        ${(l.monitoringName || l.monitoringLink || l.monitoringUser) ? section('Sistema de Monitoreo', '#f59e0b', `
            ${row('Sistema', l.monitoringName)}
            ${l.monitoringLink ? `<div style="display:flex;flex-direction:column;gap:2px;grid-column:1/-1;">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);">Enlace</span>
                <a href="${l.monitoringLink}" target="_blank" rel="noopener" style="font-size:13px;color:var(--primary);word-break:break-all;">${l.monitoringLink}</a>
            </div>` : ''}
            ${row('Usuario', l.monitoringUser)}
            ${l.monitoringPass ? `<div style="display:flex;flex-direction:column;gap:4px;">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);">Clave</span>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span id="det-pass-val" style="font-size:13px;font-weight:600;color:var(--text);font-family:'JetBrains Mono',monospace;letter-spacing:1px;">••••••••</span>
                    <button type="button" id="det-pass-toggle" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;align-items:center;" title="Mostrar clave">
                        <svg id="det-pass-eye" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </div>` : ''}
        `) : ''}
    </div>`;

    showModal(`ISP: ${l.name}`, body, null, null);

    // Wire password reveal toggle in detail modal
    if (l.monitoringPass) {
        document.getElementById('det-pass-toggle')?.addEventListener('click', () => {
            const valEl = document.getElementById('det-pass-val');
            const eyeEl = document.getElementById('det-pass-eye');
            if (!valEl) return;
            const hidden = valEl.textContent === '••••••••';
            valEl.textContent = hidden ? l.monitoringPass : '••••••••';
            valEl.style.letterSpacing = hidden ? '0' : '1px';
            eyeEl.innerHTML = hidden
                ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
                : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
        });
    }
}

export function showIspLinkForm(id, regionId) {
    const l = id ? (store.ispLinks || []).find(x => x.id === id) : null;
    const regOpts = store.regions.map(r =>
        `<option value="${r.id}" ${(l ? l.regionId : regionId) === r.id ? 'selected' : ''}>${r.name}</option>`
    ).join('');

    const typeOpts = ['Fibra','Radio','Cable','Satélite','Otro'].map(t =>
        `<option value="${t}" ${l?.type === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    const v = f => l?.[f] || '';

    const body = `
    <div style="max-height:calc(var(--vh-util) * 0.7);overflow-y:auto;padding-right:4px;">

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:var(--primary);margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(59,130,246,0.15);">Información General</div>
        <div class="form-row">
            <div class="form-group"><label>Nombre del ISP *</label><input id="fi-isp-name" value="${v('name')}" placeholder="Ej: Claro, Wind Telecom"></div>
            <div class="form-group"><label>Código / ID</label><input id="fi-isp-code" value="${v('ispCode')}" placeholder="Ej: CLR-001"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="fi-isp-region"><option value="">Selecciona...</option>${regOpts}</select></div>
            <div class="form-group"><label>Tipo de Conexión</label><select id="fi-isp-type"><option value="">Tipo...</option>${typeOpts}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Ancho de Banda (Internet)</label><input id="fi-isp-internet" value="${v('internet')}" placeholder="Ej: 100 Mbps, 1 Gbps"></div>
            <div class="form-group"><label>Segmento de Red</label><input id="fi-isp-segment" value="${v('segment')}" placeholder="Ej: 192.168.1.0/24" style="font-family:'JetBrains Mono',monospace;"></div>
        </div>

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#3b82f6;margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(59,130,246,0.15);">Red e IPs</div>
        <div class="form-row">
            <div class="form-group"><label>Máscara</label><input id="fi-isp-mask" value="${v('mask')}" placeholder="Ej: 255.255.255.0" style="font-family:'JetBrains Mono',monospace;"></div>
            <div class="form-group"><label>Gateway</label><input id="fi-isp-gw" value="${v('gateway')}" placeholder="Ej: 192.168.1.1" style="font-family:'JetBrains Mono',monospace;"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>DNS Principal</label><input id="fi-isp-dns" value="${v('dns')}" placeholder="Ej: 8.8.8.8" style="font-family:'JetBrains Mono',monospace;"></div>
            <div class="form-group"><label>DNS Alternativo</label><input id="fi-isp-dns2" value="${v('dnsAlt')}" placeholder="Ej: 8.8.4.4" style="font-family:'JetBrains Mono',monospace;"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Puerto del FW</label><input id="fi-isp-fwport" value="${v('fwPort')}" placeholder="Ej: eth0 / WAN1"></div>
        </div>
        <div class="form-group"><label>IPs Utilizables (una por línea)</label>
            <textarea id="fi-isp-ips" rows="3" placeholder="Ej:&#10;192.168.1.10&#10;192.168.1.11" style="font-family:'JetBrains Mono',monospace;font-size:12px;resize:vertical;">${v('ips')}</textarea>
        </div>

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#22c55e;margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(34,197,94,0.15);">Contacto ISP</div>
        <div class="form-row">
            <div class="form-group"><label>Teléfono</label><input id="fi-isp-tel" value="${v('contactTel')}" placeholder="Ej: +1 809 000 0000"></div>
            <div class="form-group"><label>WhatsApp</label><input id="fi-isp-wa" value="${v('contactWhatsapp')}" placeholder="Ej: +1 849 000 0000"></div>
        </div>
        <div class="form-group"><label>Número para Tickets</label><input id="fi-isp-tickets" value="${v('contactTickets')}" placeholder="Ej: 2228-3130"></div>

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#a855f7;margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(168,85,247,0.15);">Encargado del Área</div>
        <div class="form-row">
            <div class="form-group"><label>Nombre</label><input id="fi-isp-mgr-name" value="${v('managerName')}" placeholder="Nombre completo"></div>
            <div class="form-group"><label>Teléfono</label><input id="fi-isp-mgr-tel" value="${v('managerTel')}" placeholder="Ej: +1 809 000 0000"></div>
        </div>
        <div class="form-group"><label>Correo Electrónico</label><input id="fi-isp-mgr-email" value="${v('managerEmail')}" placeholder="encargado@empresa.com" type="email"></div>

        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#f59e0b;margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid rgba(245,158,11,0.15);">Sistema de Monitoreo</div>
        <div class="form-row">
            <div class="form-group"><label>Nombre del Sistema</label><input id="fi-isp-mon-name" value="${v('monitoringName')}" placeholder="Ej: Zabbix, PRTG, Cacti"></div>
            <div class="form-group"><label>Usuario</label><input id="fi-isp-mon-user" value="${v('monitoringUser')}" placeholder="Usuario de acceso"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Enlace / URL</label><input id="fi-isp-mon-link" value="${v('monitoringLink')}" placeholder="https://monitor.empresa.com"></div>
            <div class="form-group"><label>Clave</label>
                <div style="position:relative;">
                    <input id="fi-isp-mon-pass" type="password" value="${v('monitoringPass')}" placeholder="Contraseña" style="padding-right:40px;width:100%;box-sizing:border-box;">
                    <button type="button" id="fi-isp-mon-pass-toggle"
                            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;align-items:center;"
                            title="Mostrar/ocultar clave">
                        <svg id="fi-pass-eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    showModal(l ? `Editar ISP: ${l.name}` : 'Añadir ISP', body, () => {
        const name = document.getElementById('fi-isp-name').value.trim();
        if (!name) return alert('El nombre del ISP es requerido');

        const obj = {
            id:              l?.id || genId(),
            regionId:        document.getElementById('fi-isp-region').value || regionId || null,
            name,
            ispCode:         document.getElementById('fi-isp-code').value.trim(),
            segment:         document.getElementById('fi-isp-segment').value.trim(),
            internet:        document.getElementById('fi-isp-internet').value.trim(),
            type:            document.getElementById('fi-isp-type').value,
            ips:             document.getElementById('fi-isp-ips').value.trim(),
            mask:            document.getElementById('fi-isp-mask').value.trim(),
            gateway:         document.getElementById('fi-isp-gw').value.trim(),
            dns:             document.getElementById('fi-isp-dns').value.trim(),
            dnsAlt:          document.getElementById('fi-isp-dns2').value.trim(),
            fwPort:          document.getElementById('fi-isp-fwport').value.trim(),
            contactTel:      document.getElementById('fi-isp-tel').value.trim(),
            contactWhatsapp: document.getElementById('fi-isp-wa').value.trim(),
            contactTickets:  document.getElementById('fi-isp-tickets').value.trim(),
            managerName:     document.getElementById('fi-isp-mgr-name').value.trim(),
            managerTel:      document.getElementById('fi-isp-mgr-tel').value.trim(),
            managerEmail:    document.getElementById('fi-isp-mgr-email').value.trim(),
            monitoringName:  document.getElementById('fi-isp-mon-name').value.trim(),
            monitoringLink:  document.getElementById('fi-isp-mon-link').value.trim(),
            monitoringUser:  document.getElementById('fi-isp-mon-user').value.trim(),
            monitoringPass:  document.getElementById('fi-isp-mon-pass').value,
        };

        if (!store.ispLinks) store.ispLinks = [];
        if (l) {
            const idx = store.ispLinks.findIndex(x => x.id === l.id);
            if (idx !== -1) store.ispLinks[idx] = obj; else store.ispLinks.push(obj);
        } else {
            store.ispLinks.push(obj);
        }
        save(); closeModal();
        renderIspLinksView();
    }, l ? 'Guardar Cambios' : 'Añadir ISP');

    // Wire password show/hide toggle
    document.getElementById('fi-isp-mon-pass-toggle')?.addEventListener('click', () => {
        const input = document.getElementById('fi-isp-mon-pass');
        const icon  = document.getElementById('fi-pass-eye-icon');
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        icon.innerHTML = isHidden
            ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
            : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    });
}
