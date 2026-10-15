-- ════════════════════════════════════════════════════════════════
--  MAPAS Y RUTAS — planos con dispositivos, bastidores e infraestructura
--
--  · maps            → cada mapa: nombre, tipo (sede, área, ruta…),
--                      portada, imagen del plano y su tamaño. Al borrarlo
--                      va a la papelera (deleted_at) y la app lo elimina
--                      del todo a los 5 días.
--  · map_items       → lo que hay puesto en un mapa: dispositivos y
--                      bastidores del inventario, puntos de
--                      infraestructura (mufas, postes…) y tramos de cable.
--                      Las posiciones van de 0 a 1 respecto a la imagen,
--                      así no dependen de su resolución.
--  · infra_elements  → catálogo de infraestructura que crea el usuario
--                      (tipos de fibra, UTP, mufas…). Se usa en todos los
--                      mapas; el metraje va en cada tramo, no aquí.
--  · rack_photos     → foto real de un bastidor (solo bastidores).
--
--  Permisos, los mismos del inventario:
--    · Ver     → cualquier usuario con sesión iniciada.
--    · Cambiar → todos menos el rol 'viewer'.
--
--  Cómo aplicarla:  cd astro_app  &&  npx supabase db push
--  Se puede ejecutar más de una vez sin romper nada.
-- ════════════════════════════════════════════════════════════════

-- ── Tablas ──────────────────────────────────────────────────────
create table if not exists public.maps (
    id           text        primary key,
    name         text        not null,
    kind         text        not null default 'Sede',
    region_id    text,
    description  text,
    cover_path   text,
    image_path   text,
    thumb_path   text,
    image_w      integer,
    image_h      integer,
    deleted_at   timestamptz,
    created_by   uuid        default auth.uid() references auth.users (id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create table if not exists public.infra_elements (
    id           text        primary key,
    kind         text        not null,
    name         text        not null,
    color        text,
    specs        jsonb       not null default '{}'::jsonb,
    created_by   uuid        default auth.uid() references auth.users (id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create table if not exists public.map_items (
    id           text        primary key,
    map_id       text        not null references public.maps (id) on delete cascade,
    kind         text        not null check (kind in ('device', 'rack', 'infra_point', 'infra_line')),
    -- device → id del dispositivo · rack → id del bastidor ·
    -- infra_* → id del elemento del catálogo
    ref_id       text        not null,
    x            double precision,
    y            double precision,
    points       jsonb,          -- tramos: [[x, y], …]
    ends         jsonb,          -- tramos: {"a": id del punto de inicio, "b": id del final}
    length_m     numeric(12, 2), -- metraje del tramo, opcional
    created_by   uuid        default auth.uid() references auth.users (id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists map_items_map_idx on public.map_items (map_id);
create index if not exists map_items_ref_idx on public.map_items (ref_id);

-- Un mismo dispositivo o bastidor solo puede estar una vez en cada mapa
create unique index if not exists map_items_unico
    on public.map_items (map_id, kind, ref_id)
    where kind in ('device', 'rack');

create table if not exists public.rack_photos (
    rack_id      text        primary key,
    path         text        not null,
    updated_at   timestamptz not null default now()
);

-- "Actualizado hace…" lo marca la base y no el reloj de cada equipo
create or replace function public.mapas_touch()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists maps_touch on public.maps;
create trigger maps_touch before update on public.maps
    for each row execute function public.mapas_touch();

drop trigger if exists infra_elements_touch on public.infra_elements;
create trigger infra_elements_touch before update on public.infra_elements
    for each row execute function public.mapas_touch();

drop trigger if exists map_items_touch on public.map_items;
create trigger map_items_touch before update on public.map_items
    for each row execute function public.mapas_touch();

drop trigger if exists rack_photos_touch on public.rack_photos;
create trigger rack_photos_touch before update on public.rack_photos
    for each row execute function public.mapas_touch();

-- ── Permisos de las tablas ──────────────────────────────────────
do $$
declare
    t text;
    no_viewer constant text :=
        '(auth.jwt() -> ''user_metadata'' ->> ''role'') is distinct from ''viewer''';
begin
    foreach t in array array['maps', 'map_items', 'infra_elements', 'rack_photos'] loop
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

-- ── Bucket de imágenes (portadas, planos y fotos de bastidores) ─
-- Privado: solo se ve con sesión iniciada. 50 MB por archivo (el máximo
-- del plan gratuito); los planos escaneados pueden pesar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mapas', 'mapas', false, 52428800, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mapas_archivos_select" on storage.objects;
drop policy if exists "mapas_archivos_insert" on storage.objects;
drop policy if exists "mapas_archivos_update" on storage.objects;
drop policy if exists "mapas_archivos_delete" on storage.objects;

create policy "mapas_archivos_select"
    on storage.objects for select to authenticated
    using (bucket_id = 'mapas');

create policy "mapas_archivos_insert"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'mapas'
        and (auth.jwt() -> 'user_metadata' ->> 'role') is distinct from 'viewer'
    );

create policy "mapas_archivos_update"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'mapas'
        and (auth.jwt() -> 'user_metadata' ->> 'role') is distinct from 'viewer'
    )
    with check (
        bucket_id = 'mapas'
        and (auth.jwt() -> 'user_metadata' ->> 'role') is distinct from 'viewer'
    );

create policy "mapas_archivos_delete"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'mapas'
        and (auth.jwt() -> 'user_metadata' ->> 'role') is distinct from 'viewer'
    );
