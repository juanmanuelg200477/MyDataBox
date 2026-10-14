-- ════════════════════════════════════════════════════════════════
--  PROYECTOS — cotizaciones y propuestas, con sus documentos
--
--  · projects       → cada proyecto: nombre, proveedor, monto, estado,
--                     próximo paso y el contexto que explica en qué va.
--  · project_files  → sus documentos (PDF, imágenes, Word). El archivo
--                     vive en Storage, en el bucket privado 'proyectos';
--                     la tabla guarda su ruta, nombre, tipo y tamaño.
--
--  Permisos, los mismos del inventario:
--    · Ver     → cualquier usuario con sesión iniciada.
--    · Cambiar → todos menos el rol 'viewer' (puede mirar, no tocar).
--
--  Cómo aplicarla:  cd astro_app  &&  npx supabase db push
--  (o pegarla en Supabase → SQL Editor → Run). Se puede ejecutar más de
--  una vez sin romper nada.
-- ════════════════════════════════════════════════════════════════

-- ── Tablas ──────────────────────────────────────────────────────
create table if not exists public.projects (
    -- Los ids los genera el cliente (genId), como en el resto de la app
    id                  text        primary key,
    name                text        not null,
    vendor              text,
    amount              numeric(14, 2),
    currency            text        not null default 'GTQ' check (currency in ('GTQ', 'USD')),
    status              text        not null default 'En evaluación',
    quote_date          date,
    next_step           text,
    context             text,
    context_updated_at  timestamptz,
    created_by          uuid        default auth.uid() references auth.users (id) on delete set null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create table if not exists public.project_files (
    id          text        primary key,
    -- Al borrar el proyecto se van sus filas; los archivos del bucket los
    -- borra la app antes (Storage no se entera de este cascade).
    project_id  text        not null references public.projects (id) on delete cascade,
    name        text        not null,              -- nombre original, para mostrarlo
    path        text        not null unique,       -- ruta dentro del bucket
    mime        text,
    size        bigint,
    created_by  uuid        default auth.uid() references auth.users (id) on delete set null,
    created_at  timestamptz not null default now()
);

create index if not exists project_files_project_idx
    on public.project_files (project_id, created_at);

-- "Actualizado hace…" lo marca la base y no el reloj de cada equipo
create or replace function public.projects_touch()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
    before update on public.projects
    for each row execute function public.projects_touch();

-- ── Permisos de las tablas ──────────────────────────────────────
do $$
declare
    t text;
    -- 'is distinct from' para que un usuario sin rol cuente como editor
    no_viewer constant text :=
        '(auth.jwt() -> ''user_metadata'' ->> ''role'') is distinct from ''viewer''';
begin
    foreach t in array array['projects', 'project_files'] loop
        execute format('alter table public.%I enable row level security', t);

        execute format('drop policy if exists %I on public.%I', t || '_select', t);
        execute format('drop policy if exists %I on public.%I', t || '_insert', t);
        execute format('drop policy if exists %I on public.%I', t || '_update', t);
        execute format('drop policy if exists %I on public.%I', t || '_delete', t);

        execute format(
            'create policy %I on public.%I for select to authenticated using (true)',
            t || '_select', t);
        execute format(
            'create policy %I on public.%I for insert to authenticated with check (%s)',
            t || '_insert', t, no_viewer);
        execute format(
            'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
            t || '_update', t, no_viewer, no_viewer);
        execute format(
            'create policy %I on public.%I for delete to authenticated using (%s)',
            t || '_delete', t, no_viewer);
    end loop;
end $$;

-- ── Bucket de archivos ──────────────────────────────────────────
-- Privado: los archivos solo se abren con sesión iniciada, no hay enlace
-- público que se pueda reenviar. 50 MB por archivo (el máximo del plan
-- gratuito de Supabase) y solo PDF, imágenes y Word.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'proyectos', 'proyectos', false, 52428800,
    array[
        'application/pdf',
        'image/png', 'image/jpeg', 'image/webp', 'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- ── Permisos de los archivos ────────────────────────────────────
drop policy if exists "proyectos_archivos_select" on storage.objects;
drop policy if exists "proyectos_archivos_insert" on storage.objects;
drop policy if exists "proyectos_archivos_update" on storage.objects;
drop policy if exists "proyectos_archivos_delete" on storage.objects;

create policy "proyectos_archivos_select"
    on storage.objects for select to authenticated
    using (bucket_id = 'proyectos');

create policy "proyectos_archivos_insert"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'proyectos'
        and (auth.jwt() -> 'user_metadata' ->> 'role') is distinct from 'viewer'
    );

create policy "proyectos_archivos_update"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'proyectos'
        and (auth.jwt() -> 'user_metadata' ->> 'role') is distinct from 'viewer'
    )
    with check (
        bucket_id = 'proyectos'
        and (auth.jwt() -> 'user_metadata' ->> 'role') is distinct from 'viewer'
    );

create policy "proyectos_archivos_delete"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'proyectos'
        and (auth.jwt() -> 'user_metadata' ->> 'role') is distinct from 'viewer'
    );
