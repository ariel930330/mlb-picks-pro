-- ============================================================================
--  Borrar los datos de fútbol de Supabase  ·  OPCIONAL, y lo decides tú
-- ----------------------------------------------------------------------------
--  El código de fútbol ya se borró de la app. Esto borra los DATOS, que es
--  distinto: es irreversible y no hay deshacer. Por eso no lo corrí yo.
--
--  Lo que NO toca, a propósito:
--    · app_config.af_key   → tu key de API-Football. Se conserva.
--    · app_config.odds_api_key → la key de The Odds API, que usa el béisbol.
--    · Nada de MLB.
--
--  Cómo correrlo: Supabase → SQL Editor → pega TODO → Run.
-- ============================================================================

-- ── 1. Mira lo que vas a perder ANTES de borrarlo ───────────────────────────
select count(*)                                    as picks_totales,
       count(*) filter (where result is not null)  as ya_calificados,
       min(match_date)                             as desde,
       max(match_date)                             as hasta
  from public.soccer_picks;

-- Si sale 0 en "ya_calificados", no pierdes historial de resultados: solo picks
-- pendientes. Si sale un número alto, piénsalo: eso es historial real y ya no
-- se puede reconstruir, porque las cuotas de aquellos días no se recuperan.

-- ── 2. Guardar copia antes de borrar (recomendado) ──────────────────────────
-- Descomenta estas dos líneas si quieres conservar una copia por si acaso.
-- La tabla copia se queda ahí sin molestar y la puedes borrar después.
--
-- create table if not exists public.soccer_picks_respaldo as
--   select * from public.soccer_picks;

-- ── 3. El borrado ───────────────────────────────────────────────────────────
-- OPCIÓN A · vaciar la tabla pero dejarla en pie:
--   delete from public.soccer_picks;
--
-- OPCIÓN B · borrarla del todo (es lo que pediste: empezar de cero).
--   El motor nuevo va a necesitar tablas distintas de todos modos: el spec
--   HAXIOM pide instantáneas punto-en-el-tiempo y un objeto de decisión con
--   unos 30 campos, no los 16 que tenía ésta.
drop table if exists public.soccer_picks cascade;

-- ── 4. Comprobar ────────────────────────────────────────────────────────────
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name like '%soccer%';
-- Sin filas = ya no queda nada de fútbol.

-- ── 5. Que la key sigue ahí ─────────────────────────────────────────────────
select (af_key is not null)       as tiene_key_api_football,
       (odds_api_key is not null) as tiene_key_the_odds_api
  from public.app_config
 where user_id = auth.uid();
