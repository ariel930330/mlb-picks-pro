-- ============================================================================
--  DISPARADOR DEL ANALISIS DESDE SUPABASE
-- ----------------------------------------------------------------------------
--  POR QUE
--  El cron de GitHub Actions no ejecuta. Medido en este repo: de ~59 disparos
--  que debian ocurrir entre el 28 y el 29 de agosto, ocurrieron CERO dentro de
--  la ventana. Su planificador es "mejor esfuerzo" y con carga alta simplemente
--  no corre. No hay ajuste que lo arregle.
--
--  QUE HACE ESTO
--  Un cron dentro de Postgres -que si es puntual- llama a la API de GitHub y
--  lanza el workflow. El trabajo pesado sigue en Actions, que funciona bien
--  cuando algo lo llama; lo unico que cambia es quien aprieta el boton.
--
--      Postgres (cada 20 min)  ->  pg_net  ->  API de GitHub  ->  workflow
--
--  El workflow sigue decidiendo solo si toca analizar o no: el portero es
--  gratis, asi que llamarlo de mas no cuesta creditos de The Odds API.
--
--  ANTES DE CORRER ESTO necesitas un token de GitHub. Instrucciones al final.
-- ============================================================================

-- ── 1) Extensiones ──────────────────────────────────────────────────────────
-- pg_cron  = el reloj.  pg_net = poder llamar a una URL desde la base.
-- Si alguna da error de permisos, actívala en el panel:
--   Database -> Extensions -> busca pg_cron / pg_net -> Enable
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── 2) Donde vive el token ──────────────────────────────────────────────────
-- RLS activado y SIN politicas: nadie lo lee desde la app ni con la key publica.
-- El cron corre como superusuario de la base, asi que el si lo ve.
create table if not exists public.gh_config (
  id         int primary key default 1 check (id = 1),
  token      text,
  repo       text not null default 'ariel930330/mlb-picks-pro',
  workflow   text not null default 'analisis-auto.yml',
  rama       text not null default 'main',
  updated_at timestamptz default now()
);
alter table public.gh_config enable row level security;

-- ── 3) Bitacora, para poder ver si el disparo salio ─────────────────────────
-- Sin esto, cuando no llegue un analisis no habria forma de saber si el problema
-- fue el disparo o el workflow. Es exactamente el fallo silencioso que ya nos
-- costo dias con los props y las senales.
create table if not exists public.gh_disparos (
  id         bigserial primary key,
  cuando     timestamptz default now(),
  request_id bigint,
  nota       text
);
alter table public.gh_disparos enable row level security;
drop policy if exists "disparos lectura publica" on public.gh_disparos;
create policy "disparos lectura publica" on public.gh_disparos for select using (true);

-- ── 4) La funcion que lanza el workflow ─────────────────────────────────────
create or replace function public.lanzar_analisis()
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
    insert into public.gh_disparos(nota) values ('SIN TOKEN: rellena public.gh_config');
    return null;
  end if;

  select net.http_post(
    url     := format('https://api.github.com/repos/%s/actions/workflows/%s/dispatches',
                      c.repo, c.workflow),
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || c.token,
                 'Accept',        'application/vnd.github+json',
                 'Content-Type',  'application/json',
                 'User-Agent',    'supabase-pg-cron'),
    body    := jsonb_build_object('ref', c.rama)
  ) into rid;

  insert into public.gh_disparos(request_id, nota) values (rid, 'dispatch enviado');
  return rid;
end;
$fn$;

revoke all on function public.lanzar_analisis() from public, anon, authenticated;

-- ── 5) El horario ───────────────────────────────────────────────────────────
-- pg_cron trabaja en UTC. 14:00-02:00 UTC = 10 am - 10 pm hora del Este, que
-- cubre desde antes del primer juego hasta despues del ultimo.
-- Cada 20 minutos basta: el portero mira una hora y cuarto hacia adelante, asi
-- que ninguna oleada se cuela entre dos disparos.
select cron.unschedule('mlb-dia')   where exists (select 1 from cron.job where jobname = 'mlb-dia');
select cron.unschedule('mlb-noche') where exists (select 1 from cron.job where jobname = 'mlb-noche');

select cron.schedule('mlb-dia',   '*/20 14-23 * * *', $cmd$ select public.lanzar_analisis(); $cmd$);
select cron.schedule('mlb-noche', '*/20 0-2 * * *',   $cmd$ select public.lanzar_analisis(); $cmd$);

-- ── 6) PEGA AQUI TU TOKEN ───────────────────────────────────────────────────
-- Cambia SOLO el texto entre comillas. Instrucciones para sacarlo, abajo.
insert into public.gh_config (id, token) values (1, 'PEGA_AQUI_TU_TOKEN')
on conflict (id) do update set token = excluded.token, updated_at = now();

-- ── 7) Prueba: lanza uno ahora mismo ────────────────────────────────────────
select public.lanzar_analisis() as request_id;

-- ── 8) Comprobaciones ───────────────────────────────────────────────────────
-- (a) los dos trabajos programados deben aparecer:
select jobname, schedule, active from cron.job order by jobname;

-- (b) el disparo de prueba, y que contesto GitHub.
--     status 204 = aceptado (GitHub no devuelve cuerpo en este endpoint)
--     status 401 = el token esta mal
--     status 403 = al token le falta el permiso Actions: Read and write
--     status 404 = el repo o el nombre del workflow no cuadran
select d.cuando, d.nota, r.status_code, left(r.content, 200) as respuesta
  from public.gh_disparos d
  left join net._http_response r on r.id = d.request_id
 order by d.cuando desc limit 5;

-- ============================================================================
--  COMO SACAR EL TOKEN DE GITHUB (2 minutos)
-- ----------------------------------------------------------------------------
--  https://github.com/settings/personal-access-tokens/new
--
--    Token name          lo que quieras, p.ej. "supabase cron"
--    Expiration          90 dias o "No expiration"
--    Repository access   Only select repositories -> mlb-picks-pro
--    Permissions         Repository permissions -> Actions -> Read and write
--
--  Genera y copia el token (empieza por github_pat_). Pegalo en el paso 6 y
--  corre este archivo otra vez: es idempotente.
--
--  ES UN TOKEN DE ALCANCE MINIMO: solo puede lanzar Actions en ESE repositorio.
--  No lee tu codigo privado, no toca otros repos, no puede borrar nada.
--
--  Para cambiarlo mas adelante, sin volver a correr todo:
--    update public.gh_config set token = 'el_nuevo', updated_at = now() where id = 1;
--
--  Para apagar el disparador:
--    select cron.unschedule('mlb-dia');
--    select cron.unschedule('mlb-noche');
-- ============================================================================
