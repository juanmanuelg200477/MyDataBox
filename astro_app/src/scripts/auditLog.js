import { supabase } from './supabase.js';

// ════════════════════════════════════════════════════════════════
//  BITÁCORA DE AUDITORÍA
//
//  Registra quién cambió qué y cuándo en la tabla `audit_log`
//  (ver supabase/migrations/20261006120000_audit_log.sql).
//
//  IMPORTANTE — falla en silencio a propósito: esto es telemetría
//  secundaria, no datos del usuario. Si la tabla no responde, su
//  trabajo no se ve afectado, así que NO se muestra ningún toast.
//  Es justo lo contrario al criterio de save(), donde el fallo sí
//  tiene que verse porque se pierde información suya.
// ════════════════════════════════════════════════════════════════

let _identity = null;

async function getIdentity() {
    if (_identity) return _identity;
    try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!user) return null;
        _identity = { id: user.id, email: user.email ?? null };
        return _identity;
    } catch {
        return null;
    }
}

export async function recordAudit(entries) {
    if (!entries?.length) return;
    try {
        // La política de la tabla exige user_id = auth.uid(): sin sesión
        // el insert se rechazaría igualmente.
        const who = await getIdentity();
        if (!who) return;

        const rows = entries.map(e => ({
            user_id:     who.id,
            user_email:  who.email,
            action:      e.action,
            entity_type: e.entityType,
            entity_id:   e.entityId != null ? String(e.entityId) : null,
            entity_name: e.entityName ?? null,
            changes:     e.changes ?? null
        }));

        const { error } = await supabase.from('audit_log').insert(rows);
        if (error) console.warn('[audit] no se pudo registrar:', error.message);
    } catch (err) {
        console.warn('[audit] no se pudo registrar:', err?.message ?? err);
    }
}

// ── Lectura ──────────────────────────────────────────────────────
// A diferencia de la escritura, aquí los errores SÍ se propagan: el
// usuario ha pedido ver estos datos explícitamente, así que una pantalla
// vacía sin explicación sería engañosa.
export async function fetchAuditLog({ limit = 50, offset = 0, entityType = '', action = '' } = {}) {
    let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (entityType) query = query.eq('entity_type', entityType);
    if (action)     query = query.eq('action', action);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
}

// ── Cálculo de entradas a partir del diff del store ──────────────

function entityName(item) {
    // Los incidentes de ISP no tienen `name`; su identificador legible
    // es el número de ticket.
    return item.name ?? item.ticketNo ?? null;
}

function diffFields(before, after) {
    const changes = {};
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        const a = before[key];
        const b = after[key];
        // Los objetos grandes (rack.slots, device.interfaces) no se desglosan
        // campo a campo: inflarían la bitácora sin aportar legibilidad.
        if ((typeof a === 'object' && a !== null) || (typeof b === 'object' && b !== null)) continue;
        if (a !== b) changes[key] = { antes: a ?? null, despues: b ?? null };
    }
    return Object.keys(changes).length ? changes : null;
}

export function auditEntries(entityType, current, prev) {
    const previous = prev ?? [];
    const entries  = [];

    for (const item of current) {
        const before = previous.find(x => x.id === item.id);
        if (!before) {
            entries.push({ action: 'insert', entityType, entityId: item.id, entityName: entityName(item) });
        } else if (JSON.stringify(before) !== JSON.stringify(item)) {
            entries.push({
                action: 'update', entityType, entityId: item.id,
                entityName: entityName(item), changes: diffFields(before, item)
            });
        }
    }

    for (const gone of previous) {
        if (!current.find(c => c.id === gone.id)) {
            entries.push({ action: 'delete', entityType, entityId: gone.id, entityName: entityName(gone) });
        }
    }

    return entries;
}
