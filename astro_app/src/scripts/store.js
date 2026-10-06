import { supabase } from './supabase.js';
import { toastError } from './toast.js';
import { recordAudit, auditEntries } from './auditLog.js';

// ── STORE EN MEMORIA ────────────────────────────────────────
// Sigue siendo el mismo objeto que usan todos los views.
// Supabase lo llena en load() y lo sincroniza en save().

export let store = {
    regions:      [],
    areas:        [],
    contacts:     [],
    racks:        [],
    devices:      [],
    categories:   [],
    ispIncidents: [],
    ispLinks:     []
};

// Copia del último estado guardado en BD (para calcular diff en save)
let _snapshot = null;

export function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── MAPEO Store ↔ Base de datos ─────────────────────────────

// Campos base de un dispositivo (el resto va a `attributes` JSONB)
const DEVICE_CORE = new Set([
    'id','name','device','status','regionId','area',
    'brand','model','serial','ip','mac','description','comment','color'
]);

function deviceToDb(d, rackId = null, rackUnit = null) {
    const attrs = {};
    for (const k of Object.keys(d)) {
        if (!DEVICE_CORE.has(k)) attrs[k] = d[k];
    }
    // Resolvemos area_id a partir del nombre del área
    const areaId = store.areas.find(a => a.name === d.area)?.id ?? null;
    return {
        id:          d.id,
        name:        d.name        ?? null,
        device_type: d.device      ?? null,
        status:      d.status      ?? null,
        region_id:   d.regionId    ?? null,
        area_id:     areaId,
        rack_id:     rackId        ?? null,
        rack_unit:   rackUnit !== null ? parseInt(rackUnit) : null,
        brand:       d.brand       ?? null,
        model:       d.model       ?? null,
        serial:      d.serial      ?? null,
        ip:          d.ip          ?? null,
        mac:         d.mac         ?? null,
        description: d.description ?? null,
        comment:     d.comment     ?? null,
        color:       d.color       ?? null,
        attributes:  Object.keys(attrs).length ? attrs : null
    };
}

function deviceFromDb(row) {
    // Resolvemos nombre del área a partir del area_id
    const area = store.areas.find(a => a.id === row.area_id);
    return {
        id:          row.id,
        name:        row.name,
        device:      row.device_type,
        status:      row.status,
        regionId:    row.region_id,
        area:        area?.name ?? '',
        brand:       row.brand,
        model:       row.model,
        serial:      row.serial,
        ip:          row.ip,
        mac:         row.mac,
        description: row.description,
        comment:     row.comment,
        color:       row.color,
        ...(row.attributes ?? {})
    };
}

function regionToDb(r) {
    return { id: r.id, name: r.name, location: r.location ?? null };
}
function regionFromDb(row) {
    return { id: row.id, name: row.name, location: row.location };
}

function areaToDb(a) {
    return { id: a.id, region_id: a.regionId, name: a.name, description: a.description ?? null };
}
function areaFromDb(row) {
    return { id: row.id, regionId: row.region_id, name: row.name, description: row.description };
}

function contactToDb(c) {
    return { id: c.id, region_id: c.regionId, name: c.name, phone: c.phone ?? null, role: c.role ?? null, email: c.email ?? null };
}
function contactFromDb(row) {
    return { id: row.id, regionId: row.region_id, name: row.name, phone: row.phone, role: row.role, email: row.email };
}

function rackToDb(r) {
    return {
        id:          r.id,
        region_id:   r.regionId,
        area_id:     r.areaId      ?? null,
        name:        r.name,
        status:      r.status      ?? null,
        type:        r.type        ?? null,
        description: r.description ?? null,
        width:       r.width       ? parseFloat(r.width) : null,
        height:      r.height      ? parseInt(r.height)  : 42
    };
}
function rackFromDb(row) {
    return {
        id:          row.id,
        regionId:    row.region_id,
        areaId:      row.area_id,
        name:        row.name,
        status:      row.status,
        type:        row.type,
        description: row.description,
        width:       row.width,
        height:      String(row.height ?? 42),
        slots:       {}
    };
}

function categoryToDb(c) { return { id: c.id, name: c.name }; }
function categoryFromDb(row) { return { id: row.id, name: row.name }; }

function ispLinkToDb(l) {
    return {
        id:                l.id,
        region_id:         l.regionId         ?? null,
        name:              l.name             ?? null,
        isp_code:          l.ispCode          ?? null,
        segment:           l.segment          ?? null,
        internet:          l.internet         ?? null,
        type:              l.type             ?? null,
        ips:               l.ips              ?? null,
        mask:              l.mask             ?? null,
        gateway:           l.gateway          ?? null,
        dns:               l.dns              ?? null,
        dns_alt:           l.dnsAlt           ?? null,
        fw_port:           l.fwPort           ?? null,
        contact_tel:       l.contactTel       ?? null,
        contact_whatsapp:  l.contactWhatsapp  ?? null,
        contact_tickets:   l.contactTickets   ?? null,
        manager_name:      l.managerName      ?? null,
        manager_tel:       l.managerTel       ?? null,
        manager_email:     l.managerEmail     ?? null,
        monitoring_name:   l.monitoringName   ?? null,
        monitoring_link:   l.monitoringLink   ?? null,
        monitoring_user:   l.monitoringUser   ?? null,
        monitoring_pass:   l.monitoringPass   ?? null,
    };
}
function ispLinkFromDb(row) {
    return {
        id:               row.id,
        regionId:         row.region_id,
        name:             row.name,
        ispCode:          row.isp_code,
        segment:          row.segment,
        internet:         row.internet,
        type:             row.type,
        ips:              row.ips,
        mask:             row.mask,
        gateway:          row.gateway,
        dns:              row.dns,
        dnsAlt:           row.dns_alt,
        fwPort:           row.fw_port,
        contactTel:       row.contact_tel,
        contactWhatsapp:  row.contact_whatsapp,
        contactTickets:   row.contact_tickets,
        managerName:      row.manager_name,
        managerTel:       row.manager_tel,
        managerEmail:     row.manager_email,
        monitoringName:   row.monitoring_name,
        monitoringLink:   row.monitoring_link,
        monitoringUser:   row.monitoring_user,
        monitoringPass:   row.monitoring_pass,
    };
}

function incidentToDb(i) {
    return {
        id:                i.id,
        region_id:         i.regionId         ?? null,
        isp:               i.isp              ?? null,
        ticket_no:         i.ticketNo         ?? null,
        incident_date:     i.date             ?? null,
        resolved_date:     i.resolvedDate     ?? null,
        resolution_time:   i.resolutionTime   ?? null,
        severity:          i.severity         ?? null,
        status:            i.status           ?? null,
        incident_type:     i.type             ?? null,
        description:       i.description      ?? null,
        affected_services: i.affectedServices ?? null,
    };
}
function incidentFromDb(row) {
    return {
        id:               row.id,
        regionId:         row.region_id,
        isp:              row.isp,
        ticketNo:         row.ticket_no,
        date:             row.incident_date,
        resolvedDate:     row.resolved_date,
        resolutionTime:   row.resolution_time,
        severity:         row.severity,
        status:           row.status,
        type:             row.incident_type,
        description:      row.description,
        affectedServices: row.affected_services,
    };
}

// ── LOAD (async) ────────────────────────────────────────────
// Llamado en cada page-load desde los módulos Astro.

export async function load() {
    try {
        const [
            { data: regions,      error: e1 },
            { data: areas,        error: e2 },
            { data: contacts,     error: e3 },
            { data: categories,   error: e4 },
            { data: racks,        error: e5 },
            { data: devices,      error: e6 },
            { data: ispIncidents, error: e7 },
            { data: ispLinks,     error: e8 }
        ] = await Promise.all([
            supabase.from('regions')       .select('*').order('name'),
            supabase.from('areas')         .select('*').order('name'),
            supabase.from('contacts')      .select('*').order('name'),
            supabase.from('categories')    .select('*').order('name'),
            supabase.from('racks')         .select('*').order('name'),
            supabase.from('devices')       .select('*').order('name'),
            supabase.from('isp_incidents') .select('*').order('incident_date', { ascending: false }),
            supabase.from('isp_links')     .select('*').order('name')
        ]);

        if (e1 || e2 || e3 || e4 || e5 || e6) {
            throw new Error((e1 || e2 || e3 || e4 || e5 || e6).message);
        }
        if (e7) console.warn('[DataBox] isp_incidents no disponible:', e7.message);
        if (e8) console.warn('[DataBox] isp_links no disponible:', e8.message);

        store.regions      = (regions      ?? []).map(regionFromDb);
        store.areas        = (areas        ?? []).map(areaFromDb);
        store.contacts     = (contacts     ?? []).map(contactFromDb);
        store.categories   = (categories   ?? []).map(categoryFromDb);
        store.ispIncidents = (ispIncidents ?? []).map(incidentFromDb);
        store.ispLinks     = (ispLinks     ?? []).map(ispLinkFromDb);

        // Construimos racks primero (necesarios para asignar slots)
        store.racks   = (racks ?? []).map(rackFromDb);
        store.devices = [];

        // Distribuimos dispositivos: montados → rack.slots, el resto → store.devices
        (devices ?? []).forEach(row => {
            const dev = deviceFromDb(row);
            if (row.rack_id && row.rack_unit !== null) {
                const rack = store.racks.find(r => r.id === row.rack_id);
                if (rack) rack.slots[row.rack_unit] = dev;
            } else {
                store.devices.push(dev);
            }
        });

        _snapshot = JSON.parse(JSON.stringify(store));

    } catch (err) {
        console.warn('[DataBox] Fallo al cargar de Supabase, usando localStorage:', err.message);
        const d = localStorage.getItem('infrabox_data');
        if (d) Object.assign(store, JSON.parse(d));
    }
}

// ── SAVE (fire-and-forget) ──────────────────────────────────
// Se llama sin await desde los views — el store en memoria ya está
// actualizado, así que la UI responde al instante. Supabase se
// sincroniza en segundo plano.

// Devuelve true si la sincronización con Supabase terminó bien. Los callers
// que naveguen después de guardar deben comprobarlo: si navegan tras un fallo,
// el aviso en pantalla se destruye con la página y el cambio se pierde sin que
// el usuario llegue a enterarse.
export async function save() {
    // Respaldo inmediato en localStorage (síncrono)
    localStorage.setItem('infrabox_data', JSON.stringify(store));
    // Await-eable para callers que necesiten esperar antes de navegar.
    try {
        await _syncToSupabase();
        return true;
    } catch (err) {
        console.error('[DataBox] Error al guardar:', err);
        toastError(
            'No se pudieron guardar los cambios en el servidor. Siguen visibles en esta pestaña, pero se perderán al recargar.',
            { title: 'Error al guardar', detail: err?.message }
        );
        return false;
    }
}

async function _syncToSupabase() {
    const prev = _snapshot ?? { regions: [], areas: [], contacts: [], racks: [], devices: [], categories: [], ispIncidents: [], ispLinks: [] };

    await Promise.all([
        _syncTable('regions',       store.regions,      prev.regions,      regionToDb),
        _syncTable('areas',         store.areas,        prev.areas,        areaToDb),
        _syncTable('contacts',      store.contacts,     prev.contacts,     contactToDb),
        _syncTable('categories',    store.categories,   prev.categories,   categoryToDb),
        _syncTable('isp_incidents', store.ispIncidents, prev.ispIncidents ?? [], incidentToDb).catch(err => console.warn('[DataBox] isp_incidents sync error:', err)),
        _syncTable('isp_links',     store.ispLinks,     prev.ispLinks     ?? [], ispLinkToDb).catch(err => console.warn('[DataBox] isp_links sync error:', err)),
        _syncDevicesAndRacks(store.racks, store.devices, prev.racks, prev.devices)
    ]);

    // La bitácora se escribe solo después de que la sincronización haya ido
    // bien: no tiene sentido registrar cambios que nunca llegaron a la BD.
    _recordAudit(prev);

    _snapshot = JSON.parse(JSON.stringify(store));
}

// Sin snapshot previo (p. ej. load() falló y se tiró de localStorage) no se
// puede distinguir qué cambió: todo parecería recién creado y llenaríamos la
// bitácora de altas falsas. En ese caso se omite.
function _recordAudit(prev) {
    if (!_snapshot) return;

    // Los dispositivos montados viven dentro de rack.slots. Se aplanan junto a
    // los sueltos para que mover un equipo de bastidor quede registrado.
    const flatten = (devices, racks) => [
        ...devices.map(d => ({ ...d, rackId: null, rackUnit: null })),
        ...racks.flatMap(r => Object.entries(r.slots ?? {}).map(([unit, d]) => ({ ...d, rackId: r.id, rackUnit: unit })))
    ];
    // Los racks se comparan sin `slots`: si no, montar un equipo registraría
    // además una modificación del bastidor, duplicando el mismo hecho.
    const withoutSlots = racks => racks.map(({ slots, ...rest }) => rest);

    const entries = [
        ...auditEntries('region',       store.regions,      prev.regions),
        ...auditEntries('area',         store.areas,        prev.areas),
        ...auditEntries('contact',      store.contacts,     prev.contacts),
        ...auditEntries('category',     store.categories,   prev.categories),
        ...auditEntries('isp_incident', store.ispIncidents, prev.ispIncidents),
        ...auditEntries('isp_link',     store.ispLinks,     prev.ispLinks),
        ...auditEntries('rack',         withoutSlots(store.racks), withoutSlots(prev.racks ?? [])),
        ...auditEntries('device',       flatten(store.devices, store.racks), flatten(prev.devices ?? [], prev.racks ?? []))
    ];

    recordAudit(entries);
}

async function _syncTable(table, current, prev, toDb) {
    const toUpsert = current
        .filter(item => {
            const p = (prev ?? []).find(x => x.id === item.id);
            return !p || JSON.stringify(p) !== JSON.stringify(item);
        })
        .map(toDb);

    const toDelete = (prev ?? [])
        .filter(p => !current.find(c => c.id === p.id))
        .map(p => p.id);

    const ops = [];
    if (toUpsert.length) ops.push(supabase.from(table).upsert(toUpsert));
    if (toDelete.length) ops.push(supabase.from(table).delete().in('id', toDelete));
    if (ops.length) await Promise.all(ops);
}

async function _syncDevicesAndRacks(currentRacks, currentDevices, prevRacks, prevDevices) {
    // Sincronizar metadata de racks (sin slots)
    await _syncTable('racks', currentRacks, prevRacks ?? [], rackToDb);

    // Aplanar todos los dispositivos actuales (standalone + montados en rack)
    const flatCurrent = [
        ...currentDevices.map(d => ({ d, rId: null, rU: null })),
        ...currentRacks.flatMap(r =>
            Object.entries(r.slots ?? {}).map(([u, d]) => ({ d, rId: r.id, rU: u }))
        )
    ];

    // Aplanar todos los dispositivos previos
    const flatPrev = [
        ...(prevDevices ?? []).map(d => ({ d, rId: null, rU: null })),
        ...(prevRacks ?? []).flatMap(r =>
            Object.entries(r.slots ?? {}).map(([u, d]) => ({ d, rId: r.id, rU: u }))
        )
    ];

    const toUpsert = flatCurrent
        .filter(({ d, rId, rU }) => {
            const p = flatPrev.find(x => x.d.id === d.id);
            if (!p) return true; // nuevo
            return JSON.stringify(d) !== JSON.stringify(p.d) || rId !== p.rId || rU !== p.rU;
        })
        .map(({ d, rId, rU }) => deviceToDb(d, rId, rU));

    const toDelete = flatPrev
        .filter(({ d }) => !flatCurrent.find(c => c.d.id === d.id))
        .map(({ d }) => d.id);

    const ops = [];
    if (toUpsert.length) ops.push(supabase.from('devices').upsert(toUpsert));
    if (toDelete.length) ops.push(supabase.from('devices').delete().in('id', toDelete));
    if (ops.length) await Promise.all(ops);
}

// ── HELPERS PÚBLICOS (sin cambios de firma) ─────────────────

export function getAllDevices() {
    const devs = [...store.devices];
    store.racks.forEach(r => {
        if (r.slots) {
            Object.entries(r.slots).forEach(([u, d]) => {
                devs.push({ ...d, id: `rack_${r.id}_${u}`, rackId: r.id, rackUnit: u, rack: r.name, rackRegion: r.regionId, rackArea: r.areaId });
            });
        }
    });
    return devs;
}

// Respaldo completo del inventario. Los dispositivos montados viajan dentro
// de rack.slots, igual que se guardan en memoria.
export function exportSnapshot() {
    return {
        app:          'DataBox IT',
        exportedAt:   new Date().toISOString(),
        regions:      store.regions,
        areas:        store.areas,
        contacts:     store.contacts,
        categories:   store.categories,
        racks:        store.racks,
        devices:      store.devices,
        ispLinks:     store.ispLinks,
        ispIncidents: store.ispIncidents
    };
}

export function isViewer() {
    return sessionStorage.getItem('databox_role') === 'viewer';
}

export function logHistory(type, id, name) {
    let history = JSON.parse(localStorage.getItem('infrabox_history') || '[]');
    history = history.filter(h => h.id !== id);
    history.unshift({ type, id, name, time: Date.now() });
    if (history.length > 8) history.pop();
    localStorage.setItem('infrabox_history', JSON.stringify(history));
}
