import { supabase } from './supabase.js';

// ════════════════════════════════════════════════════════════════
//  REGISTRO DE SESIONES
//
//  Deja constancia de quién entra, cuándo y si sigue conectado.
//  Solo el rol 'owner' puede leerlo (lo impone RLS, no la interfaz).
//
//  "Conectado" se decide con last_seen_at y no con ended_at, porque
//  cerrar la pestaña o quedarse sin batería no dispara ningún aviso:
//  si no se refresca en MINUTOS_ACTIVO, se da por desconectado.
// ════════════════════════════════════════════════════════════════

const CLAVE_FILA   = 'databox_session_row';
const MINUTOS_ACTIVO = 5;
const LATIDO_MS    = 2 * 60 * 1000;

let _latido = null;

function rolDe(user) {
    return user?.user_metadata?.role ?? 'admin';
}

// El identificador se genera aquí y no en la base de datos a propósito.
// Pedirlo de vuelta con .select() obligaría a Postgres a comprobar la
// política de lectura sobre la fila recién creada, y esa política solo
// deja leer al dueño: a todos los demás les rechazaba el registro entero.
function nuevoId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    // Respaldo para navegadores que no exponen randomUUID.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, caracter => {
        const azar = Math.random() * 16 | 0;
        return (caracter === 'x' ? azar : (azar & 0x3 | 0x8)).toString(16);
    });
}

export function esOwner(user) {
    return rolDe(user) === 'owner';
}

// Abre la sesión si es nueva, o refresca la que ya estaba en curso.
// Se llama en cada carga de página: así cubre tanto el inicio de sesión
// como las recargas, sin duplicar filas.
export async function registrarSesion(user) {
    if (!user) return;

    let filaId = null;
    try { filaId = sessionStorage.getItem(CLAVE_FILA); } catch {}

    if (filaId) {
        await refrescarSesion();
    } else {
        const idNuevo = nuevoId();
        try {
            const { error } = await supabase
                .from('user_sessions')
                .insert({
                    id:         idNuevo,
                    user_id:    user.id,
                    user_email: user.email ?? null,
                    user_role:  rolDe(user),
                    user_agent: navigator.userAgent?.slice(0, 300) ?? null
                });

            if (error) { console.warn('[sesiones] no se pudo registrar:', error.message); return; }
            try { sessionStorage.setItem(CLAVE_FILA, idNuevo); } catch {}
        } catch (err) {
            console.warn('[sesiones] no se pudo registrar:', err?.message ?? err);
        }
    }

    iniciarLatido();
}

export async function refrescarSesion() {
    let filaId = null;
    try { filaId = sessionStorage.getItem(CLAVE_FILA); } catch {}
    if (!filaId) return;

    try {
        await supabase
            .from('user_sessions')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', filaId);
    } catch (err) {
        console.warn('[sesiones] no se pudo refrescar:', err?.message ?? err);
    }
}

// Un solo intervalo por documento: el módulo sobrevive a las
// navegaciones de Astro y si no se acumularían latidos.
function iniciarLatido() {
    if (_latido) return;
    _latido = setInterval(refrescarSesion, LATIDO_MS);
}

export async function cerrarSesionRegistro() {
    let filaId = null;
    try { filaId = sessionStorage.getItem(CLAVE_FILA); } catch {}
    if (!filaId) return;

    const ahora = new Date().toISOString();
    try {
        await supabase
            .from('user_sessions')
            .update({ ended_at: ahora, last_seen_at: ahora })
            .eq('id', filaId);
    } catch (err) {
        console.warn('[sesiones] no se pudo cerrar:', err?.message ?? err);
    }
    try { sessionStorage.removeItem(CLAVE_FILA); } catch {}
    if (_latido) { clearInterval(_latido); _latido = null; }
}

// ── Lectura (solo owner; si no, RLS devuelve vacío) ─────────────
export async function listarSesiones(limite = 50) {
    const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limite);

    if (error) throw new Error(error.message);

    const corte = Date.now() - MINUTOS_ACTIVO * 60 * 1000;
    return (data ?? []).map(s => ({
        ...s,
        activo: !s.ended_at && new Date(s.last_seen_at).getTime() > corte
    }));
}
