-- ============================================================================
--  DISPARADOR DE LA CALIFICACIÓN AUTOMÁTICA (medianoche del Este)
-- ----------------------------------------------------------------------------
--  Igual que cron-supabase.sql pero para el workflow calificar-auto.yml: un
--  cron dentro de Postgres llama a la API de GitHub y lanza la calificación
--  después de la medianoche del Este, cuando los juegos del día ya están finales.
--
--  Reusa la MISMA tabla public.gh_config (el token) que ya creó cron-supabase.sql.
--  CORRE PRIMERO cron-supabase.sql (crea gh_config, pg_cron, pg_net y el token).
--  Este archivo solo agrega la función y el horario de la calificación.
--
--  Es idempotente: se puede correr las veces que haga falta.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- La función que lanza el workflow de CALIFICACIÓN. Usa el mismo token/repo/rama
-- de gh_config, pero apunta al workflow calificar-auto.yml (no al de análisis).
create or replace function public.lanzar_calificar()
returns bigint
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c   record;
  rid bigint;
begin
  select * into c from public.gh_config where id = 1;

  if c is null or coalesce(c.token,'') = '' then
    insert into public.gh_disparos(nota) values ('CALIFICAR SIN TOKEN: rellena public.gh_config (corre cron-supabase.sql)');
    return null;
  end if;

  select net.http_post(
    url     := format('https://api.github.com/repos/%s/actions/workflows/%s/dispatches',
                      c.repo, 'calificar-auto.yml'),
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || c.token,
                 'Accept',        'application/vnd.github+json',
                 'Content-Type',  'application/json',
                 'User-Agent',    'supabase-pg-cron'),
    body    := jsonb_build_object('ref', c.rama)
  ) into rid;

  insert into public.gh_disparos(request_id, nota) values (rid, 'dispatch CALIFICAR enviado');
  return rid;
end;
$fn$;

revoke all on function public.lanzar_calificar() from public, anon, authenticated;

-- ── El horario ──────────────────────────────────────────────────────────────
-- pg_cron trabaja en UTC. La temporada de MLB va de abril a octubre = siempre
-- horario de verano del Este (EDT = UTC-4). 06:00 UTC = 2:00 AM EDT: después de
-- la medianoche del Este y con margen para que TODOS los juegos (incluidos los de
-- la Costa Oeste y las entradas extra) ya estén finales. Un solo disparo al día.
--
-- Si un juego rarísimo terminara pasadas las 2 AM ET, queda 'pendiente' y se
-- califica en la siguiente corrida — nunca se califica de más.
select cron.unschedule('mlb-calificar') where exists (select 1 from cron.job where jobname = 'mlb-calificar');
select cron.schedule('mlb-calificar', '10 6 * * *', $cmd$ select public.lanzar_calificar(); $cmd$);

-- ── Prueba: lanza una calificación ahora mismo ──────────────────────────────
select public.lanzar_calificar() as request_id;

-- ── Comprobaciones ──────────────────────────────────────────────────────────
-- (a) el trabajo debe aparecer junto a los del análisis:
select jobname, schedule, active from cron.job order by jobname;

-- (b) el disparo de prueba y la respuesta de GitHub (204 = aceptado).
select d.cuando, d.nota, r.status_code, left(r.content, 200) as respuesta
  from public.gh_disparos d
  left join net._http_response r on r.id = d.request_id
 order by d.cuando desc limit 5;

-- Para apagarlo:  select cron.unschedule('mlb-calificar');
