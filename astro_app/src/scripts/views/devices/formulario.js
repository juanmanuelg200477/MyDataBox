// ─────────────────────────────────────────────────────────────
// FORMULARIO GENÉRICO — alta, edición y baja de los dispositivos
// sin formulario propio (Firewall, Routers, Servidores...).
// Extraído de devices.js sin cambios de lógica.
// ─────────────────────────────────────────────────────────────
import { store, genId, save } from '../../store.js';
import { showModal, closeModal } from '../../modal.js';
import { currentSubcategory } from './navegacion.js';
import { renderDevicesTable } from './tabla.js';

// ─────────────────────────────────────────────────────────────
// CRUD: Standalone Device
// ─────────────────────────────────────────────────────────────
export function showStandaloneDeviceForm(id) {
    const d = id ? store.devices.find(x => x.id === id) : null;
    if (!d && store.categories.length === 0) {
        return alert('Por favor crea primero al menos un "Tipo" en "Gestionar Tipos" antes de añadir dispositivos.');
    }

    const regOpts = store.regions.map(r =>
        `<option value="${r.id}" ${d && d.regionId === r.id ? 'selected' : ''}>${r.name}</option>`
    ).join('');

    const catOpts = store.categories.map(c =>
        `<option value="${c.name}" ${d && d.device === c.name ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    showModal('Dispositivo', `
        <div class="form-row">
            <div class="form-group">
                <label>Nombre</label>
                <input id="fd-name" value="${d ? d.name : ''}" placeholder="Ej: CAM-GARITA-01">
            </div>
            <div class="form-group">
                <label>Tipo / Categoría</label>
                <select id="fd-device">
                    ${!d ? '<option value="" disabled selected>Selecciona tipo…</option>' : ''}
                    ${d && d.device && !store.categories.find(c => c.name === d.device)
            ? `<option value="${d.device}" selected>${d.device} (Legado)</option>` : ''}
                    ${catOpts}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Descripción</label>
            <textarea id="fd-desc" placeholder="Descripción…">${d ? d.description || '' : ''}</textarea>
        </div>
        <div class="form-row" id="gs-fr-model">
            <div class="form-group" id="gs-fg-brand">
                <label>Marca</label>
                <input id="fd-brand" value="${d ? d.brand : ''}" placeholder="Ej: Hikvision">
            </div>
            <div class="form-group" id="gs-fg-model">
                <label>Modelo</label>
                <input id="fd-model" value="${d ? d.model : ''}" placeholder="Ej: DS-2CD2143G2-I">
            </div>
        </div>
        <div class="form-row" id="gs-fr-serial">
            <div class="form-group" id="gs-fg-serial">
                <label>Serie</label>
                <input id="fd-serial" value="${d ? d.serial : ''}" placeholder="Nro. de serie">
            </div>
            <div class="form-group" id="gs-fg-status">
                <label>Estado</label>
                <select id="fd-status">
                    <option ${d && d.status === 'Disponible' ? 'selected' : ''}>Disponible</option>
                    <option ${d && d.status === 'Stock' ? 'selected' : ''}>Stock</option>
                    <option ${d && d.status === 'En reposo' ? 'selected' : ''}>En reposo</option>
                    <option ${d && d.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                    <option ${d && d.status === 'Desuso' ? 'selected' : ''}>Desuso</option>
                    <option ${d && d.status === 'Activo' ? 'selected' : ''}>Activo</option>
                    <option ${d && d.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
            </div>
        </div>
        <div class="form-row" id="gs-fr-ip">
            <div class="form-group" id="gs-fg-ip">
                <label>IP</label>
                <input id="fd-ip" value="${d ? d.ip : ''}" placeholder="192.168.1.1"
                       oninput="this.value=this.value.replace(/[^0-9.]/g,'')">
            </div>
            <div class="form-group" id="gs-fg-mac">
                <label>MAC</label>
                <input id="fd-mac" value="${d ? d.mac : ''}" placeholder="AA:BB:CC:DD:EE:FF">
            </div>
        </div>
        <div class="form-row" id="gs-fr-ports" style="display:none">
            <div class="form-group" id="gs-fg-ports" style="display:none">
                <label>Cantidad de Puertos</label>
                <select id="fd-ports">
                    <option value="24" ${d && d.ports === '24' ? 'selected' : ''}>24 Puertos</option>
                    <option value="48" ${d && d.ports === '48' ? 'selected' : ''}>48 Puertos</option>
                </select>
            </div>
            <div class="form-group" id="gs-fg-fiber-ports" style="display:none">
                <label>Puertos de Fibra (SFP)</label>
                <select id="fd-fiber-ports">
                    <option value="0" ${d && d.fiberPorts === '0' ? 'selected' : ''}>0 Puertos SFP</option>
                    <option value="2" ${d && d.fiberPorts === '2' ? 'selected' : ''}>2 Puertos SFP</option>
                    <option value="4" ${d && d.fiberPorts === '4' ? 'selected' : ''}>4 Puertos SFP</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Región</label>
                <select id="fd-region">${regOpts}</select>
            </div>
            <div class="form-group">
                <label>Área</label>
                <select id="fd-area">
                    ${store.areas.map(a =>
                `<option value="${a.name}" ${d && d.area === a.name ? 'selected' : ''}>${a.name}</option>`
            ).join('')}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Comentario</label>
            <textarea id="fd-comment" placeholder="Notas…">${d ? d.comment || '' : ''}</textarea>
        </div>
    `, () => {
        const name = document.getElementById('fd-name').value.trim();
        if (!name) return alert('El nombre es requerido');

        const obj = {
            name,
            device: document.getElementById('fd-device').value.trim(),
            description: document.getElementById('fd-desc').value.trim(),
            brand: document.getElementById('fd-brand').value.trim(),
            model: document.getElementById('fd-model').value.trim(),
            serial: document.getElementById('fd-serial').value.trim(),
            status: document.getElementById('fd-status').value,
            ip: document.getElementById('fd-ip').value.trim(),
            mac: document.getElementById('fd-mac').value.trim(),
            regionId: document.getElementById('fd-region').value,
            area: document.getElementById('fd-area').value,
            ports: document.getElementById('fd-ports')?.value || null,
            fiberPorts: document.getElementById('fd-fiber-ports')?.value || null,
            comment: document.getElementById('fd-comment').value.trim()
        };

        // Strip irrelevant fields for passive elements
        const val = obj.device.toLowerCase();
        if (val.includes('organizador') || val.includes('bandeja') || val.includes('supresor') || val.includes('patch panel') || val.includes('patchcord')) {
            obj.model = '';
            obj.serial = '';
            obj.ip = '';
            obj.mac = '';
            obj.status = 'Stock';
        }

        if (d) Object.assign(d, obj);
        else store.devices.push({ id: genId(), ...obj });

        save();
        closeModal();
        renderDevicesTable(currentSubcategory && currentSubcategory !== '__all__' ? currentSubcategory : null);
    }, id ? 'Guardar cambios' : 'Crear dispositivo');

    // Reactive form fields
    const updateFormFn = () => {
        const val = document.getElementById('fd-device')?.value.toLowerCase() || '';
        const isBasic = val.includes('organizador') || val.includes('bandeja') || val.includes('supresor') || val.includes('patchcord');
        const isPatch = val.includes('patch panel');
        const isSwitch = val.includes('switch');
        const hideExtra = isBasic || isPatch;

        ['gs-fg-model', 'gs-fg-serial', 'gs-fg-ip', 'gs-fg-mac', 'gs-fg-status'].forEach(fid => {
            const el = document.getElementById(fid);
            if (el) el.style.display = hideExtra ? 'none' : '';
        });

        const frSerial = document.getElementById('gs-fr-serial');
        if (frSerial) frSerial.style.display = hideExtra ? 'none' : '';

        const frIp = document.getElementById('gs-fr-ip');
        if (frIp) frIp.style.display = hideExtra ? 'none' : '';

        const frPorts = document.getElementById('gs-fr-ports');
        if (frPorts) frPorts.style.display = (isPatch || isSwitch) ? 'flex' : 'none';

        const fgPorts = document.getElementById('gs-fg-ports');
        if (fgPorts) fgPorts.style.display = (isPatch || isSwitch) ? 'block' : 'none';

        const fgFiber = document.getElementById('gs-fg-fiber-ports');
        if (fgFiber) fgFiber.style.display = isSwitch ? 'block' : 'none';
    };

    document.getElementById('fd-device')?.addEventListener('change', updateFormFn);
    if (document.getElementById('fd-device')?.value) updateFormFn();
}

export function deleteStandaloneDevice(id) {
    if (!confirm('¿Eliminar este dispositivo?')) return;

    // Rack devices have synthetic ids like "rack_{rackId}_{unit}"
    if (id && id.startsWith('rack_')) {
        const parts = id.split('_'); // ['rack', rackId, unit]
        const rackId = parts[1];
        const unit = parts.slice(2).join('_'); // unit may contain underscores
        const rack = store.racks.find(r => r.id === rackId);
        if (rack && rack.slots) delete rack.slots[unit];
    } else {
        store.devices = store.devices.filter(d => String(d.id) !== String(id));
    }

    save();
    renderDevicesTable(currentSubcategory && currentSubcategory !== '__all__' ? currentSubcategory : null);
}

export function deleteRackDeviceFromList(rackId, unit) {
    if (!confirm('¿Eliminar definitivamente este dispositivo del bastidor?')) return;
    const rack = store.racks.find(r => r.id === rackId);
    if (rack && rack.slots && rack.slots[unit]) {
        delete rack.slots[unit];
        save();
        renderDevicesTable(currentSubcategory && currentSubcategory !== '__all__' ? currentSubcategory : null);
    }
}
