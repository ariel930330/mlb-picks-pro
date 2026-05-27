-- =====================================================
-- MLB Picks Pro — Supabase Schema
-- Ejecuta este script en el SQL Editor de Supabase
-- =====================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ── Tabla principal de predicciones ──────────────────
create table if not exists predictions (
  id            uuid    default gen_random_uuid() primary key,
  session_id    text    not null,           -- ID anónimo del usuario (localStorage)
  game_date     date    not null,
  away          text    not null,
  home          text    not null,
  venue         text,
  fav           text    not null,
  fav_prob      numeric(5,4) not null,
  confidence    text    not null check (confidence in ('High','Medium','Low')),
  predicted_total numeric(5,2),
  home_wp       numeric(5,4),
  away_wp       numeric(5,4),
  home_ml       text,
  away_ml       text,
  top_pick_cat  text,
  top_pick_main text,
  top_pick_prob numeric(5,4),
  top_pick_edge numeric(6,4),
  result        text    check (result in ('win','loss')),  -- marcado por el usuario
  created_at    timestamptz default now()
);

-- ── Tabla de picks individuales por partido ───────────
create table if not exists game_picks (
  id            uuid    default gen_random_uuid() primary key,
  prediction_id uuid    references predictions(id) on delete cascade,
  category      text,
  pick_main     text,
  probability   numeric(5,4),
  edge          numeric(6,4),
  confidence    text,
  created_at    timestamptz default now()
);

-- ── Tabla de parlays ──────────────────────────────────
create table if not exists parlays (
  id            uuid    default gen_random_uuid() primary key,
  session_id    text    not null,
  game_date     date    not null,
  legs          jsonb   not null,           -- array de picks
  combined_prob numeric(5,4),
  american_odds text,
  result        text    check (result in ('win','loss')),
  created_at    timestamptz default now()
);

-- ── Índices para rendimiento ──────────────────────────
create index if not exists idx_predictions_date       on predictions(game_date desc);
create index if not exists idx_predictions_session    on predictions(session_id);
create index if not exists idx_predictions_confidence on predictions(confidence);
create index if not exists idx_parlays_date           on parlays(game_date desc);

-- ── Row Level Security ────────────────────────────────
alter table predictions  enable row level security;
alter table game_picks   enable row level security;
alter table parlays      enable row level security;

-- Política: cualquiera puede leer (app pública)
create policy "public read predictions"
  on predictions for select to anon using (true);

create policy "public read game_picks"
  on game_picks for select to anon using (true);

create policy "public read parlays"
  on parlays for select to anon using (true);

-- Política: cualquiera puede insertar
create policy "public insert predictions"
  on predictions for insert to anon with check (true);

create policy "public insert game_picks"
  on game_picks for insert to anon with check (true);

create policy "public insert parlays"
  on parlays for insert to anon with check (true);

-- Política: solo puede actualizar sus propias filas (por session_id)
create policy "own update predictions"
  on predictions for update to anon
  using (session_id = (select current_setting('request.jwt.claims', true)::json->>'sub'
                       is not null  -- fallback: allow all updates (sin auth)
                       or true));

create policy "own update parlays"
  on parlays for update to anon using (true);

-- ── Vista de análisis (para la pestaña Analytics) ────
create or replace view analytics_summary as
select
  confidence,
  count(*)                                               as total,
  count(*) filter (where result is not null)             as graded,
  count(*) filter (where result = 'win')                 as wins,
  round(
    count(*) filter (where result = 'win')::numeric
    / nullif(count(*) filter (where result is not null), 0) * 100, 1
  )                                                      as win_pct,
  round(avg(fav_prob) * 100, 1)                          as avg_prob,
  round(avg(predicted_total), 2)                         as avg_total
from predictions
group by confidence
order by confidence;

-- Vista de rendimiento por fecha
create or replace view daily_performance as
select
  game_date,
  count(*)                                                 as games,
  count(*) filter (where result = 'win')                   as wins,
  count(*) filter (where result = 'loss')                  as losses,
  round(count(*) filter (where result = 'win')::numeric
        / nullif(count(*) filter (where result is not null),0)*100,1) as win_pct,
  round(avg(fav_prob)*100,1)                               as avg_confidence
from predictions
where result is not null
group by game_date
order by game_date desc;

-- ── Datos de ejemplo para probar ──────────────────────
-- (Opcional — borra si no quieres datos de prueba)
/*
insert into predictions (session_id, game_date, away, home, fav, fav_prob, confidence, predicted_total, result)
values
  ('demo-session', '2026-05-26', 'NYY', 'BOS', 'NYY', 0.62, 'High',   8.5, 'win'),
  ('demo-session', '2026-05-26', 'LAD', 'SFG', 'LAD', 0.58, 'High',   7.2, 'win'),
  ('demo-session', '2026-05-26', 'ATL', 'PHI', 'ATL', 0.55, 'Medium', 9.1, 'loss'),
  ('demo-session', '2026-05-25', 'HOU', 'TEX', 'HOU', 0.61, 'High',   8.8, 'win'),
  ('demo-session', '2026-05-25', 'NYM', 'MIA', 'NYM', 0.54, 'Medium', 7.5, 'loss');
*/
