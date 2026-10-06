-- ════════════════════════════════════════════════════════════════
--  RLS en las tablas del inventario
--
--  Motivo: una comprobación con la clave pública (la misma que viaja
--  dentro del JavaScript de la app) demostró que regions, areas,
--  contacts, racks y devices se podían LEER sin iniciar sesión. Al
--  publicar el sitio, eso quedaría accesible desde internet: IPs, MACs,
--  números de serie y los datos de contacto del personal.
--
--  Reglas que se aplican:
--    · Leer   → cualquier usuario autenticado.
--    · Escribir → autenticados que NO tengan el rol 'viewer'.
--
--  Lo segundo cierra un hueco que ya existía: el rol 'viewer' solo se
--  respetaba en la interfaz (se ocultaban los botones), así que un
--  viewer podía escribir igualmente desde la consola del navegador.
--  Si el usuario no tiene rol definido se le trata como editor, que es
--  el comportamiento que la app ya asume por defecto.
--
--  Cómo aplicarla:  cd astro_app  &&  npx supabase db push
-- ════════════════════════════════════════════════════════════════

do $$
declare
    t text;
    tablas text[] := array[
        'regions', 'areas', 'contacts', 'categories',
        'racks', 'devices', 'isp_links', 'isp_incidents'
    ];
    -- 'is distinct from' en vez de '<>' para que un rol NULL (usuario sin
    -- metadata) cuente como editor y no quede bloqueado por accidente.
    no_viewer constant text :=
        '(auth.jwt() -> ''user_metadata'' ->> ''role'') is distinct from ''viewer''';
begin
    foreach t in array tablas loop
        -- Si alguna tabla no existe en este proyecto, se omite sin fallar.
        if to_regclass('public.' || quote_ident(t)) is null then
            raise notice 'Omitida (no existe): %', t;
            continue;
        end if;

        execute format('alter table public.%I enable row level security', t);

        -- Idempotente: CREATE POLICY no admite IF NOT EXISTS.
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
