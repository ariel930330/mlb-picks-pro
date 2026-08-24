-- ============================================================================
--  RECALCULO DE prop_picks
-- ----------------------------------------------------------------------------
--  Motivo: al consolidar las cuotas de varias casas se tomaba la linea mediana
--  por un lado y el mejor precio de cualquier casa por otro, sin exigir que
--  fueran de la misma linea. Ademas los mercados del abridor no mezclaban con
--  el mercado (BLEND_MKT). Las dos cosas inflaban el edge.
--
--  Los valores nuevos salen del endpoint historico de The Odds API, tomando el
--  snapshot de la hora exacta en que se guardo cada pick, y usando SOLO las
--  casas que colgaban la misma linea del pick.
--
--  16 de 43 picks mostraban el precio de OTRA linea. Los 16 pasaron de pagar
--  mas de 1:1 a pedir mas de lo que pagan. El edge medio baja de 0.160 a 0.070.
-- ============================================================================

-- 1) columnas nuevas: sin ellas el pick no es auditable ---------------------
alter table public.prop_picks add column if not exists fair       numeric;  -- prob. del mercado sin vig, en la linea del pick
alter table public.prop_picks add column if not exists price      integer;  -- mejor precio americano EN ESA LINEA
alter table public.prop_picks add column if not exists ev         numeric;  -- valor esperado a 1 unidad
alter table public.prop_picks add column if not exists books      integer;  -- casas que colgaban esa linea
alter table public.prop_picks add column if not exists model_prob numeric;  -- prob. CRUDA del modelo, antes de mezclar

-- 2) valores corregidos -----------------------------------------------------
--    prob pasa a ser la probabilidad FINAL (ya mezclada 70% mercado / 30% modelo)
--    y model_prob guarda la cruda, que es lo que antes vivia en prob.

-- 2026-08-20 Randy Dobnak Ks over 3,5
update public.prop_picks set model_prob=0.749, prob=0.528, fair=0.433, price=122, ev=0.172, edge=0.095, books=6 where id=1257;
-- 2026-08-20 Kyle Bradish Ks under 5,5
update public.prop_picks set model_prob=0.581, prob=0.487, fair=0.447, price=112, ev=0.033, edge=0.04, books=6 where id=1258;
-- 2026-08-20 Robert Gasser Ks under 5,5 | precio 125 -> -145 (era de otra linea)
update public.prop_picks set model_prob=0.753, prob=0.617, fair=0.559, price=-145, ev=0.043, edge=0.058, books=5 where id=1259;
-- 2026-08-20 Ian Seymour Ks over 5,5
update public.prop_picks set model_prob=0.659, prob=0.508, fair=0.443, price=120, ev=0.117, edge=0.065, books=6 where id=1260;
-- 2026-08-20 George Kirby Ks over 4,5 | precio 125 -> -134 (era de otra linea)
update public.prop_picks set model_prob=0.542, prob=0.546, fair=0.547, price=-134, ev=-0.047, edge=-0.002, books=6 where id=1261;
-- 2026-08-20 Dominic Canzone TB over 0,5 | precio 152 -> -175 (era de otra linea)
update public.prop_picks set model_prob=0.848, prob=0.668, fair=0.591, price=-175, ev=0.05, edge=0.077, books=2 where id=1262;
-- 2026-08-20 Colson Montgomery TB over 0,5 | precio 158 -> -152 (era de otra linea)
update public.prop_picks set model_prob=0.815, prob=0.635, fair=0.559, price=-152, ev=0.054, edge=0.077, books=2 where id=1263;
-- 2026-08-20 Richie Palacios Hit over 0,5
update public.prop_picks set model_prob=0.778, prob=0.601, fair=0.526, price=-123, ev=0.09, edge=0.076, books=3 where id=1264;
-- 2026-08-20 Tristan Peters Hit over 0,5
update public.prop_picks set model_prob=0.773, prob=0.603, fair=0.531, price=-130, ev=0.068, edge=0.073, books=3 where id=1265;
-- 2026-08-20 Gerrit Cole Ks over 6,5
update public.prop_picks set model_prob=0.58, prob=0.538, fair=0.52, price=-122, ev=-0.021, edge=0.018, books=5 where id=1266;
-- 2026-08-20 Samuel Basallo TB over 0,5 | precio 178 -> -164 (era de otra linea)
update public.prop_picks set model_prob=0.798, prob=0.643, fair=0.576, price=-164, ev=0.034, edge=0.067, books=2 where id=1267;
-- 2026-08-20 George Lombard Jr. TB over 0,5
update public.prop_picks set model_prob=0.8, prob=0.632, fair=0.56, price=-145, ev=0.068, edge=0.072, books=3 where id=1268;
-- 2026-08-20 George Lombard Jr. Hit over 0,5
update public.prop_picks set model_prob=0.733, prob=0.603, fair=0.547, price=-136, ev=0.046, edge=0.056, books=3 where id=1269;
-- 2026-08-20 Ben Rice Hit over 0,5
update public.prop_picks set model_prob=0.766, prob=0.669, fair=0.627, price=-200, ev=0.003, edge=0.042, books=3 where id=1270;
-- 2026-08-21 Hunter Dobbins Ks over 3,5
update public.prop_picks set model_prob=0.83, prob=0.626, fair=0.538, price=-127, ev=0.118, edge=0.088, books=6 where id=1271;
-- 2026-08-21 Sean Burke Ks over 6,5
update public.prop_picks set model_prob=0.687, prob=0.521, fair=0.45, price=112, ev=0.105, edge=0.071, books=4 where id=1272;
-- 2026-08-21 Sean Manaea Ks over 5,5 | precio 130 -> -132 (era de otra linea)
update public.prop_picks set model_prob=0.724, prob=0.601, fair=0.548, price=-132, ev=0.056, edge=0.053, books=5 where id=1273;
-- 2026-08-21 Jesús Luzardo Ks under 7,5
update public.prop_picks set model_prob=0.702, prob=0.593, fair=0.546, price=-129, ev=0.053, edge=0.047, books=7 where id=1274;
-- 2026-08-21 Ryan Gusto Ks under 4,5 | precio 135 -> -156 (era de otra linea)
update public.prop_picks set model_prob=0.609, prob=0.59, fair=0.581, price=-156, ev=-0.032, edge=0.008, books=5 where id=1275;
-- 2026-08-21 Munetaka Murakami TB over 0,5
update public.prop_picks set model_prob=0.842, prob=0.636, fair=0.548, price=-135, ev=0.107, edge=0.088, books=3 where id=1276;
-- 2026-08-21 Jesús Sánchez TB over 0,5
update public.prop_picks set model_prob=0.74, prob=0.548, fair=0.465, price=102, ev=0.106, edge=0.082, books=3 where id=1277;
-- 2026-08-21 Alec Bohm Hit over 0,5 | precio 209 -> -235 (era de otra linea)
update public.prop_picks set model_prob=0.684, prob=0.666, fair=0.659, price=-235, ev=-0.05, edge=0.008, books=1 where id=1278;
-- 2026-08-21 Randal Grichuk Hit over 0,5
update public.prop_picks set model_prob=0.817, prob=0.664, fair=0.598, price=-164, ev=0.069, edge=0.066, books=3 where id=1279;
-- 2026-08-22 Blade Tidwell Ks over 3,5
update public.prop_picks set model_prob=0.787, prob=0.6, fair=0.52, price=-118, ev=0.108, edge=0.08, books=6 where id=1280;
-- 2026-08-22 Eury Pérez Ks under 6,5
update public.prop_picks set model_prob=0.747, prob=0.608, fair=0.549, price=-132, ev=0.069, edge=0.059, books=6 where id=1281;
-- 2026-08-22 Patrick Sandoval Ks under 5,5
update public.prop_picks set model_prob=0.634, prob=0.51, fair=0.457, price=111, ev=0.077, edge=0.053, books=7 where id=1282;
-- 2026-08-22 Max Muncy TB over 0,5
update public.prop_picks set model_prob=0.83, prob=0.651, fair=0.574, price=-155, ev=0.07, edge=0.077, books=3 where id=1283;
-- 2026-08-22 Jose Siri TB over 0,5
update public.prop_picks set model_prob=0.85, prob=0.622, fair=0.524, price=-122, ev=0.131, edge=0.098, books=3 where id=1284;
-- 2026-08-22 Donovan Walton Hit over 0,5
update public.prop_picks set model_prob=0.718, prob=0.56, fair=0.492, price=-109, ev=0.074, edge=0.068, books=4 where id=1285;
-- 2026-08-22 Drew Anderson Ks over 4,5
update public.prop_picks set model_prob=0.787, prob=0.517, fair=0.402, price=139, ev=0.237, edge=0.116, books=4 where id=1286;
-- 2026-08-23 Cal Quantrill Ks over 3,5 | precio 134 -> -156 (era de otra linea)
update public.prop_picks set model_prob=0.82, prob=0.652, fair=0.579, price=-156, ev=0.069, edge=0.072, books=6 where id=1287;
-- 2026-08-23 Kyle Leahy Ks over 3,5
update public.prop_picks set model_prob=0.721, prob=0.619, fair=0.575, price=-147, ev=0.04, edge=0.044, books=6 where id=1288;
-- 2026-08-23 Jackson Kent Ks over 3,5 | precio 150 -> -154 (era de otra linea)
update public.prop_picks set model_prob=0.567, prob=0.575, fair=0.579, price=-154, ev=-0.051, edge=-0.004, books=4 where id=1289;
-- 2026-08-23 Griffin Conine TB over 0,5 | precio 167 -> -140 (era de otra linea)
update public.prop_picks set model_prob=0.836, prob=0.636, fair=0.551, price=-140, ev=0.091, edge=0.086, books=2 where id=1290;
-- 2026-08-23 Brian Serven TB over 0,5
update public.prop_picks set model_prob=0.832, prob=0.601, fair=0.502, price=-115, ev=0.123, edge=0.099, books=2 where id=1291;
-- 2026-08-23 Austin Hedges Hit over 0,5
update public.prop_picks set model_prob=0.848, prob=0.67, fair=0.593, price=-169, ev=0.066, edge=0.076, books=3 where id=1292;
-- 2026-08-24 Ranger Suarez Ks under 5,5 | precio 120 -> -152 (era de otra linea)
update public.prop_picks set model_prob=0.785, prob=0.637, fair=0.574, price=-152, ev=0.057, edge=0.063, books=5 where id=1293;
-- 2026-08-24 Drew Rasmussen Ks over 4,5 | precio 125 -> -148 (era de otra linea)
update public.prop_picks set model_prob=0.776, prob=0.631, fair=0.568, price=-148, ev=0.057, edge=0.062, books=5 where id=1294;
-- 2026-08-24 Ryan Feltner Ks under 3,5
update public.prop_picks set model_prob=0.67, prob=0.524, fair=0.461, price=111, ev=0.105, edge=0.063, books=6 where id=1295;
-- 2026-08-24 Andrés Chaparro TB over 1,5
update public.prop_picks set model_prob=0.893, prob=0.514, fair=0.352, price=167, ev=0.373, edge=0.162, books=1 where id=1296;
-- 2026-08-24 Jake Burger TB over 0,5 | precio 164 -> -155 (era de otra linea)
update public.prop_picks set model_prob=0.781, prob=0.632, fair=0.568, price=-155, ev=0.04, edge=0.064, books=2 where id=1297;
-- 2026-08-24 Otto Lopez Hit over 0,5 | precio 209 -> -256 (era de otra linea)
update public.prop_picks set model_prob=0.672, prob=0.674, fair=0.675, price=-256, ev=-0.062, edge=-0.001, books=1 where id=1298;
-- 2026-08-24 Framber Valdez HA under 6,5 | precio 100 -> -155 (era de otra linea)
update public.prop_picks set model_prob=0.792, prob=0.635, fair=0.568, price=-155, ev=0.045, edge=0.067, books=2 where id=1299;

-- 3) comprobacion ----------------------------------------------------------
select game_date, count(*) filter (where ev >= 0) as con_valor,
       count(*) filter (where ev <  0) as sin_valor,
       round(avg(edge)::numeric,3) as edge_medio
  from public.prop_picks group by game_date order by game_date;

-- 4) OPCIONAL: picks de hoy sin calificar que quedaron con EV negativo -------
--    Nunca debieron guardarse. Descomenta si los quieres fuera del historial.
--  2026-08-24 Otto Lopez Hit over 0,5  ->  EV -0.062
-- delete from public.prop_picks where id=1298;
