-- ============================================================================
--  CERRAR LA ESCRITURA A UNA LISTA DE DUEÑOS
-- ----------------------------------------------------------------------------
--  PROBLEMA
--  Las politicas decian "to authenticated ... using (true)": CUALQUIER usuario
--  autenticado podia insertar, actualizar y BORRAR en predictions, signals,
--  prop_picks, model_weights, analysis_cache, soccer_results y soccer_picks.
--
--  Y los registros publicos estan ABIERTOS (disable_signup = false). La key
--  anonima esta en el codigo, que es publico a proposito. O sea que cualquiera
--  podia crearse una cuenta, confirmar el correo y borrarte el historial o
--  envenenar los pesos del modelo -que es lo peor, porque no se nota.
--
--  SOLUCION
--  Una lista blanca de user_id. Solo quien este en app_owners escribe.
--
--  POR QUE UNA TABLA Y NO UIDs EN LAS POLITICAS
--  Para dar de alta o de baja una cuenta -por ejemplo la del robot- basta con
--  insertar o borrar una fila, sin reescribir 21 politicas.
--
--  NO TE PUEDE DEJAR FUERA
--  La lista se siembra con TODAS las cuentas que existen ahora mismo. Si por lo
--  que sea quedara vacia, el script se detiene con un error ANTES de tocar
--  ninguna politica.
--
--  TABLAS QUE AUN NO EXISTEN
--  Se saltan y se avisan al final, en vez de reventar. soccer_results todavia no
--  esta creada: cuando la crees, vuelve a correr esto y quedara protegida.
--
--  Es idempotente: se puede correr las veces que haga falta.
-- ============================================================================

-- ── 1) La lista de dueños ───────────────────────────────────────────────────
create table if not exists public.app_owners (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nota       text,
  created_at timestamptz default now()
);

-- Siembra con todo lo que existe HOY. Aqui es donde se garantiza que no te
-- quedas fuera: si hoy puedes entrar, tu cuenta entra en la lista.
insert into public.app_owners (user_id, nota)
select id, coalesce(email, 'sin correo') from auth.users
on conflict (user_id) do nothing;

-- ── 2) Freno de seguridad ───────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from public.app_owners;
  if n = 0 then
    raise exception 'app_owners quedo VACIA. No se cambia ninguna politica para no dejarte fuera.';
  end if;
  raise notice 'app_owners tiene % cuenta(s).', n;
end $$;

-- ── 3) La funcion que consultan las politicas ───────────────────────────────
-- SECURITY DEFINER a proposito: sin eso, la consulta a app_owners quedaria
-- sujeta al RLS de app_owners y devolveria vacio SIEMPRE, bloqueando todo.
-- search_path fijo para que nadie pueda colar otra tabla con el mismo nombre.
create or replace function public.es_dueno()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_owners where user_id = auth.uid());
$$;

revoke all on function public.es_dueno() from public;
grant execute on function public.es_dueno() to authenticated;

-- La lista solo la ven los dueños. Nadie la escribe desde el cliente: se
-- administra desde aqui, el SQL Editor.
alter table public.app_owners enable row level security;
drop policy if exists "owners read" on public.app_owners;
create policy "owners read" on public.app_owners
  for select to authenticated using (public.es_dueno());

-- ── 4) Reemplazar las politicas de escritura ────────────────────────────────
-- La LECTURA publica se deja como estaba: la pagina tiene que poder mostrar el
-- historial sin iniciar sesion. Lo que se cierra es escribir y borrar.
--
-- Se borran las politicas de escritura CONSULTANDO pg_policies en vez de por
-- nombre: los nombres viejos no siguen ningun patron ("props auth write" para
-- prop_picks, "weights auth write" para model_weights, "cache auth write" para
-- analysis_cache), y asi tampoco se queda ninguna suelta si hay alguna que no
-- conociamos.
--
-- app_config NO entra en la lista a proposito: ya esta bien cerrada con
-- auth.uid() = user_id, que es mas estricto todavia (cada quien solo su fila).
do $$
declare
  t       text;
  p       record;
  tablas  text[] := array['predictions','signals','prop_picks','model_weights',
                          'analysis_cache','soccer_results','soccer_picks'];
  faltan  text[] := '{}';
  hechas  int := 0;
begin
  foreach t in array tablas loop
    if not exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      faltan := faltan || t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    for p in select policyname from pg_policies
              where schemaname='public' and tablename=t and cmd <> 'SELECT'
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    execute format('create policy %I on public.%I for insert to authenticated with check (public.es_dueno())', t||' owner write',  t);
    execute format('create policy %I on public.%I for update to authenticated using (public.es_dueno()) with check (public.es_dueno())', t||' owner update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.es_dueno())', t||' owner delete', t);
    hechas := hechas + 1;
  end loop;

  raise notice 'Tablas protegidas: %', hechas;
  if array_length(faltan,1) is not null then
    raise notice 'NO EXISTEN todavia (se saltaron): %. Cuando las crees, vuelve a correr este script.', array_to_string(faltan, ', ');
  end if;
end $$;

-- ── 5) Comprobacion ─────────────────────────────────────────────────────────
-- (a) Deben salir tus cuentas: la tuya y la del robot.
select u.email, o.created_at
  from public.app_owners o
  join auth.users u on u.id = o.user_id
 order by o.created_at;

-- (b) Ninguna politica de escritura debe seguir diciendo "true".
--     Todas deben decir es_dueno(), salvo app_config que usa auth.uid().
select tablename, cmd, coalesce(qual, with_check) as condicion,
       case when coalesce(qual, with_check) ilike '%es_dueno%'  then 'OK'
            when tablename = 'app_config'                        then 'OK (por usuario)'
            else '*** ABIERTA ***' end as estado
  from pg_policies
 where schemaname = 'public' and cmd <> 'SELECT'
 order by estado desc, tablename, cmd;
