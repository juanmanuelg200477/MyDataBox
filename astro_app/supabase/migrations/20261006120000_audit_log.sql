-- ════════════════════════════════════════════════════════════════
--  audit_log — historial de actividad de DataBox IT
--
--  Registra QUIÉN cambió QUÉ y CUÁNDO.
--
--  Es una bitácora INMUTABLE a propósito: no se crean políticas de
--  UPDATE ni de DELETE, así que ni la app ni un usuario autenticado
--  pueden reescribir ni borrar el historial. Si algún día hace falta
--  purgar entradas viejas, se hace desde el SQL Editor a conciencia.
--
--  Cómo aplicarla:
--    Supabase → tu proyecto → SQL Editor → New query → pegar → Run.
--  El script es idempotente: se puede volver a ejecutar sin romper nada.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
    id          uuid        primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),

    -- Quién. Se guarda también el correo porque la cuenta puede borrarse
    -- más adelante y la entrada del historial debe seguir siendo legible.
    user_id     uuid        references auth.users (id) on delete set null,
    user_email  text,

    -- Qué pasó.
    action      text        not null check (action in ('insert', 'update', 'delete')),

    -- Sobre qué: 'device' | 'rack' | 'region' | 'area' | 'contact' |
    -- 'category' | 'isp_link' | 'isp_incident'
    entity_type text        not null,
    -- Los ids del inventario los genera el cliente (genId) y son texto,
    -- no uuid: por eso este campo es text y no tiene clave foránea.
    entity_id   text,
    -- Nombre en el momento del cambio, para que el historial se entienda
    -- aunque la entidad se renombre o se elimine después.
    entity_name text,

    -- Detalle opcional del cambio (p. ej. {"ip": {"antes": "...", "despues": "..."}}).
    changes     jsonb
);

-- El listado se consulta casi siempre por fecha descendente.
create index if not exists audit_log_created_at_idx
    on public.audit_log (created_at desc);

-- Y para ver el historial de un equipo concreto.
create index if not exists audit_log_entity_idx
    on public.audit_log (entity_type, entity_id);

alter table public.audit_log enable row level security;

-- ── Políticas ───────────────────────────────────────────────────
-- Se eliminan antes de crearlas porque CREATE POLICY no admite
-- IF NOT EXISTS, y así el script se puede reejecutar.

drop policy if exists "audit_log_select_authenticated" on public.audit_log;
drop policy if exists "audit_log_insert_own"           on public.audit_log;

-- Leer: cualquier usuario autenticado ve la bitácora del equipo.
create policy "audit_log_select_authenticated"
    on public.audit_log
    for select
    to authenticated
    using (true);

-- Escribir: solo entradas a su propio nombre. Evita que alguien pueda
-- atribuirle un cambio a otra persona.
create policy "audit_log_insert_own"
    on public.audit_log
    for insert
    to authenticated
    with check (user_id = auth.uid());
