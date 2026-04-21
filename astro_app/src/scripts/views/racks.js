import { store, save, genId } from '../store.js';
import { icons } from '../icons.js';
import { showModal, closeModal } from '../modal.js';

let _rackFilters = { search: '', region: '', status: '' };

export function initRacks() {
    const tbody = document.getElementById('racks-tbody');
    if (!tbody) return;

    _rackFilters = { search: '', region: '', status: '' };

    // Populate region filter
    const regSel = document.getElementById('rack-region-filter');
    if (regSel) {
        regSel.innerHTML = '<option value="">Todas las regiones</option>' +
            store.regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }

    document.getElementById('btn-add-rack')?.addEventListener('click', () => showRackForm(null));

    document.getElementById('search-racks')?.addEventListener('input', e => {
        _rackFilters.search = e.target.value.toLowerCase();
        renderRacksTable();
    });
    document.getElementById('rack-region-filter')?.addEventListener('change', e => {
        _rackFilters.region = e.target.value;
        renderRacksTable();
    });
    document.getElementById('rack-status-filter')?.addEventListener('change', e => {
        _rackFilters.status = e.target.value;
        renderRacksTable();
    });

    renderRacksTable();
}

function renderRacksTable() {
    const tbody = document.getElementById('racks-tbody');
    const emptyState = document.getElementById('racks-empty-state');
    const tableContainer = document.getElementById('racks-table-container');
    const countDisplay = document.getElementById('racks-count');
    const showingDisplay = document.getElementById('racks-showing-count');

    if (store.racks.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        countDisplay.textContent = '0';
        return;
    }

    // Apply filters
    const filtered = store.racks.filter(r => {
        const reg = store.regions.find(x => x.id === r.regionId);
        const area = store.areas.find(x => x.id === r.areaId);
        const searchStr = `${r.name} ${reg ? reg.name : ''} ${area ? area.name : ''} ${r.type || ''}`.toLowerCase();

        if (_rackFilters.search && !searchStr.includes(_rackFilters.search)) return false;
        if (_rackFilters.region && r.regionId !== _rackFilters.region) return false;
        if (_rackFilters.status && r.status !== _rackFilters.status) return false;
        return true;
    });

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    countDisplay.textContent = store.racks.length;
    showingDisplay.textContent = `Mostrando ${filtered.length} de ${store.racks.length}`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--text-muted);font-style:italic;">Ningún bastidor coincide con los filtros aplicados.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((r, i) => {
        const reg = store.regions.find(x => x.id === r.regionId);
        const area = store.areas.find(x => x.id === r.areaId);
        const slotCount = r.slots ? Object.keys(r.slots).length : 0;
        const totalU = parseInt(r.height) || 42;
        const pct = Math.round((slotCount / totalU) * 100);
        const barColor = pct < 30 ? 'var(--success)' : pct < 70 ? 'var(--warning)' : 'var(--danger)';
        return `<tr>
            <td style="color:var(--text-muted);font-size:12px;font-family:'JetBrains Mono',monospace;text-align:center;width:40px;">${i + 1}</td>
            <td><a href="/rack?id=${r.id}" class="link">${r.name}</a></td>
            <td>${reg ? reg.name : '—'}</td>
            <td><span class="badge badge-purple">${area ? area.name : '—'}</span></td>
            <td><span class="badge ${r.status === 'Activo' ? 'badge-active' : 'badge-warning'}">${r.status}</span></td>
            <td>${r.type || '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace">${totalU}U</td>
            <td style="font-family:'JetBrains Mono',monospace">${slotCount}</td>
            <td>
                <div class="space-bar">
                    <div class="space-bar-fill"><div style="width:${pct}%;background:${barColor}"></div></div>
                    <span class="space-bar-pct">${pct}%</span>
                </div>
            </td>
            <td style="white-space:nowrap">
                <a href="/rack?id=${r.id}" class="btn-icon" title="Ver">${icons.eye}</a>
                <button class="btn-icon btn-edit" data-id="${r.id}" title="Editar">${icons.edit}</button>
                <button class="btn-icon danger btn-delete" data-id="${r.id}" title="Eliminar">${icons.trash}</button>
            </td>
        </tr>`;
    }).join('');

    document.querySelectorAll('#racks-tbody .btn-edit').forEach(btn =>
        btn.addEventListener('click', e => showRackForm(e.currentTarget.dataset.id))
    );
    document.querySelectorAll('#racks-tbody .btn-delete').forEach(btn =>
        btn.addEventListener('click', e => deleteRack(e.currentTarget.dataset.id))
    );
}

function showRackForm(id) {
    if (!store.regions.length) return alert('Primero debes crear al menos una región');
    const r = id ? store.racks.find(x => x.id === id) : null;
    const regOpts = store.regions.map(rg => `<option value="${rg.id}" ${r && r.regionId === rg.id ? 'selected' : ''}>${rg.name}</option>`).join('');
    const areaOpts = store.areas.map(a => `<option value="${a.id}" ${r && r.areaId === a.id ? 'selected' : ''}>${a.name}</option>`).join('');
    
    showModal('Bastidor', `
        <div class="form-row">
            <div class="form-group"><label>Región</label><select id="f-region">${regOpts}</select></div>
            <div class="form-group"><label>Área</label><select id="f-area">${areaOpts}</select></div>
        </div>
        <div class="form-group"><label>Nombre</label><input id="f-name" value="${r ? r.name : ''}" placeholder="Ej: RACK-COINCO-01"></div>
        <div class="form-row">
            <div class="form-group"><label>Estado</label><select id="f-status"><option ${r && r.status === 'Activo' ? 'selected' : ''}>Activo</option><option ${r && r.status === 'En Reposo' ? 'selected' : ''}>En Reposo</option></select></div>
            <div class="form-group"><label>Tipo</label><select id="f-type"><option ${r && r.type === 'Rack' ? 'selected' : ''}>Rack</option><option ${r && r.type === 'Gabinete' ? 'selected' : ''}>Gabinete</option></select></div>
        </div>
        <div class="form-group"><label>Descripción</label><textarea id="f-desc" placeholder="Descripción del bastidor...">${r ? r.description : ''}</textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Anchura (cm)</label><input id="f-width" type="number" value="${r ? r.width : ''}" placeholder="Ej: 60"></div>
            <div class="form-group"><label>Altura (U) — Máx. 50</label><input id="f-height" type="number" min="1" max="50" value="${r ? r.height : ''}" placeholder="Ej: 42"></div>
        </div>
    `, () => {
        const regionId = document.getElementById('f-region').value;
        const areaId = document.getElementById('f-area').value;
        const name = document.getElementById('f-name').value.trim();
        const status = document.getElementById('f-status').value;
        const type = document.getElementById('f-type').value;
        const description = document.getElementById('f-desc').value.trim();
        const width = document.getElementById('f-width').value;
        let height = parseInt(document.getElementById('f-height').value) || 42;
        if (height > 50) height = 50; if (height < 1) height = 1;
        if (!name) return alert('El nombre es requerido');
        
        let targetId = r ? r.id : genId();
        if (r) { 
            Object.assign(r, { regionId, areaId, name, status, type, description, width, height: String(height) }); 
        } else {
            store.racks.push({ id: targetId, regionId, areaId, name, status, type, description, width, height: String(height), slots: {} });
        }
        save(); closeModal();
        
        if (!id) window.location.href = `/rack?id=${targetId}`;
        else renderRacksTable();
    }, id ? 'Guardar cambios' : 'Crear bastidor');

    document.getElementById('f-region').addEventListener('change', () => {
        const regId = document.getElementById('f-region').value;
        const areaSelect = document.getElementById('f-area');
        if (!areaSelect) return;
        const filtered = store.areas.filter(a => a.regionId === regId);
        areaSelect.innerHTML = filtered.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    });
}

function deleteRack(id) {
    if (!confirm('¿Eliminar este bastidor y todos sus dispositivos?')) return;
    store.racks = store.racks.filter(r => r.id !== id);
    save(); renderRacksTable();
}
