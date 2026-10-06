-- ════════════════════════════════════════════════════════════════
--  RLS del inventario — corrección de la migración anterior
--
--  La migración 20261006180000 se aplicó sin errores, pero la lectura
--  anónima siguió funcionando. Motivo: esas tablas ya tenían políticas
--  permisivas previas (las plantillas de un clic de Supabase, del tipo
--  "Enable read access for all users", creadas para el rol `public`,
--  que incluye a `anon`). Las políticas de Postgres se combinan con OR,
--  así que basta UNA permisiva para que el resto no sirva de nada; y la
--  migración anterior solo borraba las políticas con los nombres que
--  ella misma generaba.
--
--  Aquí se eliminan TODAS las políticas de cada tabla antes de crear
--  las definitivas. Es intencionadamente destructivo con las políticas
--  (no con los datos): el estado de partida era "cualquiera en internet
--  puede leer el inventario", así que no hay nada ahí que valga la pena
--  conservar.
--
--  Reglas finales:
--    · Leer    → cualquier usuario autenticado.
--    · Escribir → autenticados que NO tengan el rol 'viewer'.
--
--  Cómo aplicarla:  cd astro_app  &&  npx supabase db push
--  Verificar:       node rls-check.mjs   (todo debe salir 'vacía/filtrada')
-- ════════════════════════════════════════════════════════════════

do $$
declare
    t text;
    pol record;
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
        if to_regclass('public.' || quote_ident(t)) is null then
            raise notice 'Omitida (no existe): %', t;
            continue;
        end if;

        -- Borrón y cuenta nueva: cualquier política heredada que permita
        -- acceso anónimo desaparece aquí.
        for pol in
            select policyname
            from pg_policies
            where schemaname = 'public' and tablename = t
        loop
            raise notice 'Eliminando política "%" de %', pol.policyname, t;
            execute format('drop policy %I on public.%I', pol.policyname, t);
        end loop;

        execute format('alter table public.%I enable row level security', t);

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
