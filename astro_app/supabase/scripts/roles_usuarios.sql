-- ════════════════════════════════════════════════════════════════
--  Roles de usuario
--
--  Asigna el rol de cada cuenta en Raw User Meta Data. De ahí lo toma
--  el token de sesión (auth.jwt() -> 'user_metadata' ->> 'role'), que
--  es lo que leen las políticas de RLS.
--
--  Esto NO se ejecuta con `supabase db push`: vive fuera de
--  migrations/ a propósito, porque modifica datos de cuentas y no la
--  estructura de la base. Se pega a mano en Supabase → SQL Editor.
--
--  Roles usados por la aplicación:
--    owner  → Juan. Único que ve el historial de sesiones.
--    admin  → puede editar el inventario, no ve sesiones.
--    viewer → solo lectura.
--
--  IMPORTANTE: el token ya emitido conserva el rol viejo. Después de
--  ejecutar esto hay que cerrar sesión y volver a entrar para que el
--  cambio tenga efecto.
-- ════════════════════════════════════════════════════════════════

-- El `||` fusiona: conserva lo que ya hubiera (email_verified, etc.) y
-- solo añade o reemplaza la clave "role".
update auth.users as u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
                         || jsonb_build_object('role', v.rol),
    updated_at = now()
from (values
    ('juan.garcia@comayma.com',      'owner'),
    ('adriana.gonzalez@comayma.com', 'admin'),
    ('databoxit@databoxcomayma.com', 'viewer')
) as v (correo, rol)
where u.email = v.correo;

-- Comprobación: las tres filas deben mostrar su rol.
select email,
       raw_user_meta_data ->> 'role' as rol,
       raw_user_meta_data
from auth.users
order by email;
