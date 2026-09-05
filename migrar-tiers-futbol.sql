-- ============================================================================
--  Migración de niveles de señal de FÚTBOL  ·  HAXIOM-SOCCER-v1.1
-- ----------------------------------------------------------------------------
--  El Master Prompt (§6) pide cuatro niveles: Elite / Strong / Lean / No Signal.
--  La app ya los usa. Este archivo solo pone al día los picks que YA estaban
--  guardados con los nombres viejos, para que el historial sea comparable.
--
--  NO es obligatorio: la app traduce los nombres viejos al vuelo (scTierNorm),
--  así que si no lo corres nada se rompe. Pero cualquier consulta que hagas tú
--  directo en SQL vería dos vocabularios mezclados, y eso confunde.
--
--  Cómo correrlo: Supabase → SQL Editor → pega TODO → Run.
--  Es seguro repetirlo: si ya no queda nada viejo, no cambia nada.
-- ============================================================================

-- ── 1. Qué hay antes de tocar nada ──────────────────────────────────────────
select tier, count(*) as picks
  from public.soccer_picks
 group by tier
 order by picks desc;

-- ── 2. La traducción ────────────────────────────────────────────────────────
--  OFFICIAL PLAY  → ELITE SIGNAL    (modelo + los umbrales más estrictos)
--  STRONG LEAN    → STRONG SIGNAL   (modelo + umbrales de segundo nivel)
--  VALOR DE LÍNEA → LEAN SIGNAL     ┐ sin modelo no hay confianza que medir,
--  VALOR MENOR    → LEAN SIGNAL     ┘ así que el techo es LEAN
--  NO BET         → NO SIGNAL
--
--  OJO con el cambio de fondo: antes VALOR DE LÍNEA tenía el MISMO rango que
--  OFFICIAL PLAY (los dos valían 3), o sea que un pick sin modelo podía
--  desbancar a uno con modelo. Ahora LEAN vale 1 y ELITE vale 3. Los picks
--  viejos marcados VALOR DE LÍNEA BAJAN de categoría, y eso es lo correcto:
--  se publicaron bajo un criterio que estaba mal.

update public.soccer_picks
   set tier = case tier
        when 'OFFICIAL PLAY'  then 'ELITE SIGNAL'
        when 'STRONG LEAN'    then 'STRONG SIGNAL'
        when 'VALOR DE LÍNEA' then 'LEAN SIGNAL'
        when 'VALOR MENOR'    then 'LEAN SIGNAL'
        when 'NO BET'         then 'NO SIGNAL'
        else tier
      end
 where tier in ('OFFICIAL PLAY','STRONG LEAN','VALOR DE LÍNEA','VALOR MENOR','NO BET');

-- ── 3. Cómo quedó ───────────────────────────────────────────────────────────
select tier, count(*) as picks,
       count(*) filter (where result = 'win')  as ganados,
       count(*) filter (where result = 'loss') as perdidos,
       count(*) filter (where result is null)  as sin_calificar
  from public.soccer_picks
 group by tier
 order by case tier when 'ELITE SIGNAL' then 1 when 'STRONG SIGNAL' then 2
                    when 'LEAN SIGNAL'  then 3 else 4 end;

-- ── 4. Que no vuelvan a entrar nombres viejos ───────────────────────────────
--  Sin esto, una versión vieja de la app abierta en otra pestaña podría volver
--  a escribir 'OFFICIAL PLAY' y ensuciar el historial otra vez.
alter table public.soccer_picks
  drop constraint if exists soccer_picks_tier_valido;

alter table public.soccer_picks
  add constraint soccer_picks_tier_valido
  check (tier in ('ELITE SIGNAL','STRONG SIGNAL','LEAN SIGNAL','NO SIGNAL'));
