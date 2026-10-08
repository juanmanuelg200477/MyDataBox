-- ════════════════════════════════════════════════════════════════
--  Sesiones de usuario + purga automática de historiales
--
--  1. Tabla user_sessions: quién entró, cuándo y si sigue activo.
--  2. Límite de 50 registros en user_sessions y en audit_log: al
--     insertar, se borran los más antiguos que sobren. Se hace con un
--     disparador en la base de datos y no desde la app, porque si no
--     dependería de que alguien tuviera la página abierta.
--
--  Quién ve qué:
--    · El historial de sesiones solo lo lee el rol 'owner'.
--    · Cada usuario puede registrar y cerrar su propia sesión.
--  El control va en la base de datos, no solo en la interfaz: ocultar
--  una pestaña no impide que alguien consulte la tabla por su cuenta.
--
--  REQUISITO: en Supabase → Authentication → Users, el usuario dueño
--  debe tener en Raw User Meta Data:  { "role": "owner" }
--  Sin eso nadie podrá leer el historial de sesiones.
--
--  Cómo aplicarla:  cd astro_app  &&  npx supabase db push
-- ════════════════════════════════════════════════════════════════

create table if not exists public.user_sessions (
    id            uuid        primary key default gen_random_uuid(),
    user_id       uuid        references auth.users (id) on delete set null,
    -- Se guarda el correo porque la cuenta puede borrarse después y el
    -- historial debe seguir siendo legible.
    user_email    text,
    user_role     text,
    started_at    timestamptz not null default now(),
    -- Se refresca mientras la persona navega; es lo que permite saber si
    -- sigue conectada sin esperar a que cierre sesión.
    last_seen_at  timestamptz not null default now(),
    -- Se rellena al pulsar "Salir". Si queda vacío, la sesión se cerró
    -- sin avisar (cerrar pestaña, batería, etc.).
    ended_at      timestamptz,
    user_agent    text
);

create index if not exists user_sessions_started_at_idx
    on public.user_sessions (started_at desc);

alter table public.user_sessions enable row level security;

drop policy if exists "user_sessions_select_owner" on public.user_sessions;
drop policy if exists "user_sessions_insert_own"   on public.user_sessions;
drop policy if exists "user_sessions_update_own"   on public.user_sessions;

-- Leer: solo el dueño. Es el control real; la pestaña oculta en la
-- interfaz es únicamente comodidad.
create policy "user_sessions_select_owner"
    on public.user_sessions
    for select
    to authenticated
    using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'owner');

-- Registrar la propia entrada
create policy "user_sessions_insert_own"
    on public.user_sessions
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- Refrescar la actividad y marcar la salida de la propia sesión
create policy "user_sessions_update_own"
    on public.user_sessions
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- ── Purga automática ────────────────────────────────────────────
-- security definer: el disparador tiene que poder borrar aunque quien
-- inserta no tenga permiso de borrado (audit_log es inmutable para los
-- usuarios, justamente para que nadie pueda reescribir su rastro).

create or replace function public.limitar_registros()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
    columna text := TG_ARGV[0];
    maximo  int  := TG_ARGV[1]::int;
begin
    execute format(
        'delete from public.%I where id in (
             select id from public.%I order by %I desc offset %s
         )',
        TG_TABLE_NAME, TG_TABLE_NAME, columna, maximo
    );
    return null;
end;
$func$;

-- FOR EACH STATEMENT y no FOR EACH ROW: basta una limpieza por
-- operación, aunque se inserten varias filas de golpe.
drop trigger if exists audit_log_limite     on public.audit_log;
drop trigger if exists user_sessions_limite on public.user_sessions;

create trigger audit_log_limite
    after insert on public.audit_log
    for each statement
    execute function public.limitar_registros('created_at', '50');

create trigger user_sessions_limite
    after insert on public.user_sessions
    for each statement
    execute function public.limitar_registros('started_at', '50');
