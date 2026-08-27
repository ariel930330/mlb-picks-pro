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
--  envenenar los pesos del modelo.
--
--  SOLUCION
--  Una lista blanca de user_id. Solo quien este en app_owners escribe.
--
--  POR QUE UNA TABLA Y NO UIDs EN LAS POLITICAS
--  Para dar de alta o de baja una cuenta -por ejemplo la del robot- basta con
--  insertar o borrar una fila, sin reescribir 20 politicas.
--
--  NO TE PUEDE DEJAR FUERA
--  La lista se siembra con TODAS las cuentas que existen ahora mismo, o sea la
--  tuya y la del robot. Si por lo que sea quedara vacia, el script se detiene
--  con un error ANTES de tocar ninguna politica.
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
-- Si la siembra dejo la lista vacia, NO se tocan las politicas.
do $$
declare n int;
begin
  select count(*) into n from public.app_owners;
  if n = 0 then
    raise exception 'app_owners quedo VACIA. No se cambia ninguna politica para no dejarte fuera.';
  end if;
  raise notice 'app_owners tiene % cuenta(s). Se aplican las politicas.', n;
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

-- predictions
drop policy if exists "predictions auth write"  on public.predictions;
drop policy if exists "predictions auth update" on public.predictions;
drop policy if exists "predictions auth delete" on public.predictions;
create policy "predictions owner write"  on public.predictions for insert to authenticated with check (public.es_dueno());
create policy "predictions owner update" on public.predictions for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "predictions owner delete" on public.predictions for delete to authenticated using (public.es_dueno());

-- signals
drop policy if exists "signals auth write"  on public.signals;
drop policy if exists "signals auth update" on public.signals;
drop policy if exists "signals auth delete" on public.signals;
create policy "signals owner write"  on public.signals for insert to authenticated with check (public.es_dueno());
create policy "signals owner update" on public.signals for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "signals owner delete" on public.signals for delete to authenticated using (public.es_dueno());

-- prop_picks
drop policy if exists "props auth write"  on public.prop_picks;
drop policy if exists "props auth update" on public.prop_picks;
drop policy if exists "props auth delete" on public.prop_picks;
create policy "props owner write"  on public.prop_picks for insert to authenticated with check (public.es_dueno());
create policy "props owner update" on public.prop_picks for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "props owner delete" on public.prop_picks for delete to authenticated using (public.es_dueno());

-- model_weights  (los pesos del modelo y la calibracion Platt)
drop policy if exists "weights auth write"  on public.model_weights;
drop policy if exists "weights auth update" on public.model_weights;
drop policy if exists "weights auth delete" on public.model_weights;
create policy "weights owner write"  on public.model_weights for insert to authenticated with check (public.es_dueno());
create policy "weights owner update" on public.model_weights for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "weights owner delete" on public.model_weights for delete to authenticated using (public.es_dueno());

-- analysis_cache
drop policy if exists "cache auth write"  on public.analysis_cache;
drop policy if exists "cache auth update" on public.analysis_cache;
drop policy if exists "cache auth delete" on public.analysis_cache;
create policy "cache owner write"  on public.analysis_cache for insert to authenticated with check (public.es_dueno());
create policy "cache owner update" on public.analysis_cache for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "cache owner delete" on public.analysis_cache for delete to authenticated using (public.es_dueno());

-- soccer_results
drop policy if exists "soccer_results auth write"  on public.soccer_results;
drop policy if exists "soccer_results auth update" on public.soccer_results;
drop policy if exists "soccer_results auth delete" on public.soccer_results;
create policy "soccer_results owner write"  on public.soccer_results for insert to authenticated with check (public.es_dueno());
create policy "soccer_results owner update" on public.soccer_results for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "soccer_results owner delete" on public.soccer_results for delete to authenticated using (public.es_dueno());

-- soccer_picks
drop policy if exists "soccer_picks auth write"  on public.soccer_picks;
drop policy if exists "soccer_picks auth update" on public.soccer_picks;
drop policy if exists "soccer_picks auth delete" on public.soccer_picks;
create policy "soccer_picks owner write"  on public.soccer_picks for insert to authenticated with check (public.es_dueno());
create policy "soccer_picks owner update" on public.soccer_picks for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "soccer_picks owner delete" on public.soccer_picks for delete to authenticated using (public.es_dueno());

-- ── 5) Comprobacion ─────────────────────────────────────────────────────────
-- Deben salir tus cuentas (la tuya y la del robot).
select u.email, o.created_at
  from public.app_owners o
  join auth.users u on u.id = o.user_id
 order by o.created_at;

-- Y ninguna politica de escritura debe seguir diciendo "true".
select tablename, policyname, cmd,
       coalesce(qual, with_check) as condicion
  from pg_policies
 where schemaname = 'public'
   and cmd <> 'SELECT'
 order by tablename, cmd;
