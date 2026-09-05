# AUDITORÍA — HAXIOM EDGE SOCCER (Master Prompt §1)

Fecha: 2026-09-05 · Auditor: Claude (Fable 5.1) · Proyecto: mlb-picks-pro / deportes/futbol
Estado: **auditoría completa · Fase 1 implementada y probada (ver 03-informe-fase1.md) · validación PAPER pendiente**.

---

## 0. Documentos reconocidos

| Archivo | Documento | Versión | Estado de lectura |
|---|---|---|---|
| `00-master-prompt-soccer.docx/.md` | HAXIOM EDGE — SOCCER Algorithm Master Prompt for Claude | sin número de versión (§1–§11) | Leído completo |
| `HAXIOM_EDGE_Soccer_Signal_Engine_v1.docx/.md` | HAXIOM EDGE Soccer Signal Engine — Metrics, Feature Engineering, Qualification & Final-Market Validation | **v1.1, septiembre 2026** (§1–§12.1) | Leído completo, incluido §4 entero (≈545 métricas) |
| `HAXIOM_EDGE_SOCCER_Prop_of_the_Day_Selection_Protocol.docx/.md` | HAXIOM EDGE SOCCER Prop of the Day Selection Protocol | **criterios v1.0, 3-sep-2026** (§1–§27) | Leído completo |
| Proyecto existente | Repo `mlb-picks-pro` (index.html + core.js + deportes/mlb.js + bot/ + Supabase) | commit `a19e579` | Inspeccionado; la arquitectura de `deportes/LEEME.md` se respeta |

Ningún otro adjunto. No se reclama haber leído nada más. Jerarquía entre documentos: **Signal Engine y POD Protocol = especificación de dominio (mandan); Master Prompt = orden de trabajo y valores "bootstrap" que ceden ante los otros dos** (Master §1.6).

Regla del dueño (5-sep-2026): *no proponer nada; regirse explícitamente por los documentos*. Toda desviación queda registrada en §7 como SUPUESTO DE CONFIGURACIÓN, nunca como propuesta.

---

## 1. Inventario de requisitos

### 1.1 Master Prompt
| § | Requisito | Tipo |
|---|---|---|
| Rol | Algoritmo SOLO SOCCER; tiers Elite / Strong / Lean + estado interno No Signal; nunca forzar pick ni llenar cuota; SOCCER y ligas en MAYÚSCULAS en texto de usuario | Regla dura |
| 1 | Auditar antes de implementar: reconocer documentos, inventario, matriz de trazabilidad, diccionario de datos, contradicciones, confirmado vs propuesto, solo preguntas bloqueantes; continuar a implementación tras el audit | Proceso |
| 2 | 15 mercados (1X2, Moneyline resuelto, DNB, DC, AH, Team to Win Either Half, Match Goals, Team Goals, FH Goals, FH Team Goals, BTTS, Match/Team/FH/FH Team Corners); periodo/línea/outcomes/liquidación explícitos; cuartos asiáticos con 5 estados; EV desde el pago real; abandonos/void por regla del proveedor; DC sin renormalizar; TWEH sin doble conteo | Mercados |
| 3 | Adaptadores independientes del proveedor; implementar TODAS las métricas suministradas; missing ≠ 0; imputación documentada; snapshots punto-en-el-tiempo; pregame y live separados | Datos |
| 4 | Modelos por mercado; distribuciones conjuntas local/visita; mitades modeladas explícitamente (NO dividir entre 2); córners aparte de goles; incertidumbre cuantificada; calibración por mercado/competición; proyección ≠ probabilidad ≠ edge ≠ confianza | Modelos |
| 5 | Normalizar cuotas conservando la original; no-vig con el set completo (1X2 con empate); registrar cuando el no-vig no es fiable; EV por estado de pago; cotas conservadoras con método estadístico explícito; sin mezclar cotizaciones no contemporáneas; rechazar stale; señal válida solo para selección+línea+precio+casa+timestamp; precio límite por línea | Precios |
| 6 | Cinco scores 0–100 (Edge Strength, Confidence, Data Quality, Stability, Market Quality) + puertas + flags; composite bootstrap 0.35/0.25/0.20/0.10/0.10 y bandas 85/72/60 **solo si mis documentos no dan pesos** (sí los dan: SE §7 y §7.1 prevalecen); mínimos por tier; evaluar de Elite hacia abajo registrando el downgrade; "Confidence 85 ≠ 85% de ganar" | Scoring |
| 7 | Ranking con desempates transparentes; dedup y correlación; sin parlays; caps configurables (límites, no cuotas); reevaluar ante cambios; expirar; registrar toda transición; **sin staking/bankroll** | Ciclo de vida |
| 8 | Registro máquina por candidato (≈30 campos) + tarjeta pública concisa; separar score de probabilidad | Salida |
| 9 | Backtest punto-en-el-tiempo, walk-forward, sin fuga; hit rate, ROI, EV medio, calibración, Brier/log loss, CLV, drawdown; paper tracking y aprobación humana; nunca prometer rentabilidad | Validación |
| 10 | Respetar el repo; adaptadores, pipelines, modelos, pricing, gating, ranking, ciclo de vida, almacenamiento versionado, API/schema, monitoreo; 10 grupos de tests obligatorios | Implementación |
| 11 | Entregables: inventario/trazabilidad/huecos, arquitectura/diccionario/mapeos/registro de liquidación, código+config+schemas, backtesting+tests+fixtures, runbook, informe honesto | Entrega |

### 1.2 Signal Engine v1.1
| § | Requisito clave |
|---|---|
| 1.1 / 1.1.1 | Registro canónico de 15 mercados con objeto de probabilidad y control de liquidación; Moneyline sin tipar = bloqueado; European handicap y derivados adicionales solo si pasan reglas y precio |
| 1.2 | Campos de salida no negociables (Identidad, Mercado, Modelo, Contexto, Calificación, Publicación, Auditoría) |
| 1.3 | Prohibiciones: fuga de información futura; forma cruda/tabla/H2H/narrativa como evidencia; mezclar 90'/ET/penales; XI asumido sin fuente; cruzar proveedores sin crosswalk; publicar con cotización vieja; contar correlaciones como confirmaciones |
| 2 | Flujo de 7 etapas (Evaluación continua → Market Scan → Contexto → Boards activos → Calificación → Asignación Elite>Strong>Lean>Detected → Validación final) |
| 2.1 | Snapshots: event time + ingestion time; append-only; toda corrección = nueva versión |
| 3 | Núcleo matemático: conversión de cuotas, no-vig (multiplicativo/aditivo/power/Shin comparados), edge_pp, EV two-way/three-way/asiático por estados, push, Poisson/Dixon-Coles/bivariado/NB/Skellam, BTTS, totales, FH team total sin prorratear, TWEH con intersección conjunta, xPts, recencia exp(−λ·días), ajuste por rival, shrinkage, mezcla de escenarios XI, **EV_LCB = EV − k·SE(EV)**, varianza de ensamble, ECE, Brier, log loss, RPS, CLV, ESS |
| 4 | Diccionario maestro ≈545 métricas en 22 familias (ver §3 de esta auditoría) |
| 5 | 20 reglas de ingeniería de features |
| 5.1 | Stack por capas; **ensamble de al menos dos familias distintas** |
| 6 | Modelos por mercado con drivers primarios, contexto y bloqueos automáticos |
| 7 | 11 puertas duras; estados: Signal Detected (watchlist) / **Lean: EV≥1.5%, rank≥p85, DQ≥80** / **Strong: EV≥3.0%, rank≥p95, EV_LCB≥0, modelos de acuerdo, DQ≥90** / **Elite: EV≥4.5%, rank≥p98, EV_LCB≥1.0%, contexto confirmado, mejor precio vivo, sin conflicto, DQ≥95** |
| 7.1 | Pesos iniciales por mercado (7 componentes: Team/xG, XI/GK, Role/min, Tactics, Context, Market/value, Quality) |
| 8 | Ventanas T-24h / T-6h / T-90 / XI oficial (T-75..T-60) / T-30 / T-5 / post-release / live |
| 8.1 | 11 kill switches automáticos |
| 9 / 9.1 | Backtesting, calibración, monitoreo y estándar de promoción |
| 10 / 10.1 | Objeto de decisión bot-ready y 20 reason codes |
| 11 | **Fase 1** (odds/reglas punto-en-el-tiempo, mapeo canónico, calendario, escenarios XI/GK, eventos oficiales, xG/fuerza ajustada, rejilla conjunta, motor EV, puertas, captura de cierre → 1X2/Moneyline, DNB, DC, AH, Match Goals, Team Goals, BTTS y señales de jugador básicas) · **Fase 2** (periodos, formación/rol/minutos, pressing/buildup/transición, balón parado, córners, árbitro/clima, correlación, live monitoring → TWEH, FH Goals, FH Team Goals, córners) · **Fase 3** (tracking, físico, simulación conjunta, live completo, drift/failure injection/champion-challenger) |
| 11.1 | Checklist de aceptación (11 puntos) |
| 12 | Registro de fuentes; nota de gobernanza |

### 1.3 POD Protocol v1.0
| § | Requisito clave |
|---|---|
| 1–2 | UNA prop oficial o no-selección documentada; slate completo; solo mercados two-sided estándar; Over y Under; opuesto faltante = bloqueo; líneas alternas no son candidatos |
| 3 | Elegibles: Shots, SOT, Passes attempted, Passes completed, Tackles, Interceptions, Fouls committed, Fouls drawn, Saves |
| 4 | Inelegibles: goleadores, asistencias, tarjetas, offsides, FH/first-event, ladders/milestones, proveedores incompatibles, ET-inclusive, boosts/SGP, suplentes o no confirmados, <3 casas, opuesto incompleto, evento raro/error/stale, línea no reproducible |
| 5 | Snapshot registrado e inmutable; determinismo por Snapshot ID + versiones |
| 6 | Completitud ≥95%; campos duros eliminan |
| 7 | ≥3 casas independientes en la línea exacta; ambos lados; −175..+125; ≤15¢ de la mediana; mediana de no-vig por casa; ≤5 min al validar; recheck antes de Official |
| 8 | P_cal = clamp(P_ensemble − U_role − U_data − U_context); ≥2 familias; desacuerdo >6.0 = MODEL_DISAGREEMENT; P_cal ≥62.0% |
| 9 | No-vig por casa (Over+Under=100) y **mediana** = P_market |
| 10 | Edge_gap = P_cal − P_market ≥ 5.5 pp; EV = p·b − (1−p) > 0 |
| 11 | Confianza = 0.25·C1 + 0.20·C2 + 0.15·C3 + 0.15·C4 + 0.15·C5 + 0.10·C6 ≥ 86 |
| 12 | Tabla de mínimos (11 requisitos; cualquiera elimina) |
| 13 | Edge_quality = min(100, 10·Edge_gap); Reliability = (Role + Completitud + Market)/3; **Solid_Prop_Score = 0.35·Conf + 0.30·P_cal + 0.20·Edge_quality + 0.15·Reliability**; rankear sin redondear |
| 14 | Stress: P_stress = P_cal − 2.5; Stress_edge ≥ 3.0 |
| 15 | Familias de features obligatorias por mercado |
| 16–20 | Participación/rol/carga; matchup por features registradas; shrinkage; correlación; checks generales |
| 21–22 | Separación runner-up ≥3.0; desempate determinista en 9 pasos |
| 23–24 | Estados Candidate/Official/Pass/Invalidated/No Selection; playable limit; línea nueva = candidato nuevo |
| 25–26 | Registro de salida (7 grupos) y 17 reason codes; append-only |
| 27 | Determinismo total |

---

## 2. Registro canónico de mercados y liquidación (SE §1.1.1 + Master §2)

| canonical_market_id | Selecciones | Periodo | Objeto de probabilidad | Estados de liquidación | Fase |
|---|---|---|---|---|---|
| `1X2` | Home/Draw/Away | REGULATION_90_PLUS_STOPPAGE | rejilla conjunta | win/loss | 1 |
| `MONEYLINE` | alias resuelto → `1X2`, `DNB` o `TO_QUALIFY` | según resolución | — | bloqueado si ambiguo | 1 (mapeo) |
| `DNB` | Home/Away | regulación | masa win/draw/loss | win / push / loss | 1 |
| `DOUBLE_CHANCE` | 1X / X2 / 12 | regulación | suma de dos estados 1X2 (sin renormalizar) | win/loss | 1 |
| `ASIAN_HANDICAP` | equipo + línea entera/media/cuarto | regulación | distribución del margen | win / half-win / push / half-loss / loss | 1 |
| `MATCH_GOALS` | Over/Under | regulación | distribución del total | por tipo de línea | 1 |
| `TEAM_GOALS` | Over/Under por equipo | regulación | marginal del equipo | por tipo de línea | 1 |
| `BTTS` | Yes/No | regulación | masa conjunta | win/loss | 1 |
| `TEAM_WIN_EITHER_HALF` | Home/Away | H1 ∪ H2 | simulación conjunta por periodos | win/loss | 2 |
| `FH_GOALS` | Over/Under | H1 + descuento | distribución H1 (NO prorrateo) | por línea | 2 |
| `FH_TEAM_GOALS` | Over/Under por equipo | H1 | marginal H1 | por línea | 2 |
| `MATCH_CORNERS` | Over/Under | regulación | distribución de córners | por línea | 2 |
| `TEAM_CORNERS` | Over/Under por equipo | regulación | marginal | por línea | 2 |
| `FH_CORNERS` | Over/Under | H1 | distribución H1 | por línea | 2 |
| `FH_TEAM_CORNERS` | Over/Under por equipo | H1 | marginal H1 | por línea | 2 |
| Props POD (`PLAYER_SHOTS`, `PLAYER_SOT`, `PLAYER_PASSES_ATT`, `PLAYER_PASSES_CMP`, `PLAYER_TACKLES`, `PLAYER_INTERCEPTIONS`, `PLAYER_FOULS_COMMITTED`, `PLAYER_FOULS_DRAWN`, `GK_SAVES`) | Over/Under línea estándar | regulación (ET-inclusive = inelegible) | conteo por jugador | win / push (entera) / loss | 1 + POD |

Mapeo API-Football → canónico (bet ids verificados contra `/odds/bets` en sesiones previas): 1→`1X2`, 2→`DNB`, 12→`DOUBLE_CHANCE`, 4→`ASIAN_HANDICAP`, 5→`MATCH_GOALS`, 16/17→`TEAM_GOALS` home/away, 8→`BTTS`, 6→`FH_GOALS`, 45/57/58/77→córners match/home/away/FH; props de jugador: ids por confirmar en Fase 1 (medición de cobertura, §6.7). **European handicap** aparece en SE §1.1 y §6 pero NO en §1.1.1 ni en Master §2 → fuera de alcance hasta inclusión explícita (A2).

---

## 3. Inventario del diccionario maestro (SE §4) frente a los datos disponibles

Proveedor único hoy: **API-Football (api-sports.io v3, plan Pro)**. **D** = campo directo · **C** = calculable con definición versionada · **N** = no disponible.

| Familia | # | D | C | N | Notas |
|---|---|---|---|---|---|
| 4.1 Mercado y precio | 35 | 18 | 12 | 5 | Cuotas por casa con timestamp propio; mediana/dispersión/overround/no-vig (C). N: liquidez/límites, tickets públicos, reliability histórico de casas (se construye). "Sharp book" requiere lista aprobada (Q1) |
| 4.2 Resultado y goles | 23 | 8 | 15 | 0 | Resultados + rejilla conjunta |
| 4.3 xG y calidad de chance | 27 | 1 | 4 | 22 | Solo `expected_goals` agregado por equipo-partido (post-partido). N: xG por tiro, PSxG, xG por tipo, xGOT |
| 4.4 Creación de tiro | 23 | 8 | 6 | 9 | Tiros, SOT, bloqueados, dentro/fuera del área (D). N: distancia, ángulo, presión |
| 4.5 Posesión y territorio | 19 | 2 | 1 | 16 | Posesión % y pases (D). N: field tilt, box entries, xT |
| 4.6 Buildup y pases | 26 | 3 | 2 | 21 | Pases totales/precisos (D). N: progresivos, line-breaking |
| 4.7 Pressing | 20 | 0 | 0 | 20 | N completo |
| 4.8 Supresión defensiva | 24 | 6 | 6 | 12 | Tiros/SOT permitidos, tackles, intercepciones, bloqueos, duelos (D) |
| 4.9 Transición | 16 | 0 | 0 | 16 | N completo |
| 4.10 Balón parado y córners | 24 | 3 | 5 | 16 | Córners, penales (D). N: xG de córner, primer contacto |
| 4.11 Portero | 22 | 3 | 3 | 16 | Saves, goles concedidos, `goals_prevented` (D) |
| 4.12 Props ofensivos | 28 | 12 | 6 | 10 | Minutos, titularidades, tiros, SOT, goles, asistencias, pases clave, regates (D). N: xG/xA por jugador |
| 4.13 Props defensivos/disciplina | 20 | 14 | 4 | 2 | Tackles, intercepciones, bloqueos, duelos, faltas, tarjetas, offsides (D) |
| 4.14 Alineaciones y roles | 22 | 8 | 6 | 8 | XI, formación, banca, posición (D, ≈T-40). C: minutos esperados. N: on/off xG, red de pases |
| 4.15 Calendario y fatiga | 22 | 4 | 12 | 6 | Descanso, densidad, fase (C). N: viaje/altitud/zona horaria sin geocodificar |
| 4.16 Sede, clima, árbitro | 24 | 4 | 8 | 12 | Sede (D). Árbitro por nombre → tasas por 90 con shrinkage (C). **Clima N** (S5) |
| 4.17 Fuerza y normalización | 17 | 0 | 12 | 5 | Fuerzas jerárquicas, Elo, forma ajustada (C). N: prior de plantilla licenciado |
| 4.18 Derivados de mercado | 33 | 0 | 33 | 0 | Todos desde la rejilla y periodos |
| 4.19 Córners, tarjetas, eventos | 30 | 6 | 20 | 4 | Conteos oficiales (D) → distribuciones (C) |
| 4.20 Live | 24 | 10 | 4 | 10 | Fuera de alcance hasta validar pregame (Fase 3) |
| 4.21 Tracking y físico | 24 | 0 | 0 | 24 | N completo |
| 4.22 Calidad de datos | 22 | 0 | 22 | 0 | Interno |
| **Total** | **≈545** | **≈110** | **≈181** | **≈254** | **≈47% del diccionario no es obtenible con el proveedor actual.** SE §4: "el diccionario es intencionalmente más amplio que el modelo de lanzamiento"; §11 acota el lanzamiento a Fase 1 |

Consecuencia (Master §3 "block releases when a critical input is unavailable"): los mercados de Fase 1 tienen sus insumos críticos (cuotas, resultados, xG agregado, XI, bajas). Fase 2 también en lo básico (córners oficiales, marcador al descanso). Sin insumo: 4.7, 4.9, 4.21 y la mayor parte de 4.3 → se registran como **no disponibles**, no se inventan ni se imputan.

---

## 4. Diccionario de datos (campos de Fase 1 obtenibles hoy)

Todo campo lleva `source`, `event_time`, `ingestion_time`, `definition_version`.

| Campo | Definición | Unidad / rango | Fuente | Refresco | Si falta | Mercados |
|---|---|---|---|---|---|---|
| `fixture_id`, `competition_id`, `season_id`, `home_team_id`, `away_team_id`, `scheduled_start`, `venue_id`, `referee_name`, `status` | Identidad del evento | ids; ISO-8601 UTC; NS/1H/HT/2H/FT/AET/PEN/PST/CANC/ABD | `/fixtures?league&season&date` | cada corrida | DATA_BLOCK | todos |
| `quote.book_id`, `book_name`, `market_source_label`, `bet_id`, `selection`, `line`, `odds_decimal`, `odds_american`, `quote_timestamp`, `ingestion_time` | Cotización por casa | decimal >1; americana; línea en cuartos | `/odds?league&season&date` (paginado) | cada corrida (append-only) | sin candidato | todos |
| `mkt_consensus_novig_p` | mediana de no-vig por casa (Shin de referencia; mult./aditivo/power guardados) | 0–1 | C | derivado | set incompleto → `unavailable_reason` | todos |
| `mkt_overround`, `mkt_price_dispersion`, `mkt_active_books`, `mkt_quote_age_ms`, `mkt_stale_quote` | diagnósticos | %, pp, n, ms, bool | C | derivado | — | todos |
| `mkt_close_price` | última cotización válida antes del inicio | decimal | corrida de cierre | 1 por partido | CLV no calculable | evaluación (nunca feature) |
| `result.home_goals`, `away_goals`, `ht_home`, `ht_away` | marcador final y al descanso | enteros | `/fixtures` (`goals`, `score.halftime`) | post-partido | no liquidable | liquidación, FH |
| `stat.*` (shots, on/off/blocked/inside/outside, fouls, corners, offsides, possession, yellow, red, gk_saves, passes, passes_accurate, expected_goals, goals_prevented) | stats de equipo por partido | conteos; %; xG | `/fixtures/statistics?fixture` | post-partido | derivada `missing`, nunca 0 | fuerzas, córners, xG |
| `player_match.*` (minutes, position, substitute, shots, shots_on, passes, passes_accuracy, tackles, interceptions, fouls_committed, fouls_drawn, saves, duels, dribbles, cards) | stats de jugador por partido | conteos; min 0–120 | `/fixtures/players?fixture` | post-partido | prop no evaluable | POD |
| `lineup_confirmed_xi`, `formation`, `bench`, `gk_confirmed`, `lineup_source_time` | XI oficial | 11 con posición G/D/M/F | `/fixtures/lineups?fixture` (≈T-40) | cada corrida ≤T-60 | `lineup_state=UNCONFIRMED` → LINEUP_BLOCK / XI_UNCONFIRMED | todos |
| `injury.*` (player, team, type, reason, fixture_id) | bajas/dudas | texto tipado | `/injuries?league&season&date` | cada corrida | `injury_feed_missing` en dq | escenarios XI |
| `venue.*` (name, city, capacity, surface) | sede | texto | `/venues` | onboarding | `venue_unknown` | contexto |
| `comp_stage`, `round` | fase/jornada | texto | `/fixtures` | por corrida | — | scope ET |
| `season_results[]` | resultados temporada actual y anterior | lista | `/fixtures?league&season&status=FT` (**sin `page`**: /fixtures lo rechaza) | por corrida (cache) | sin modelo | fuerzas |

Declarados N: todo 4.7, 4.9, 4.21; xG por tiro/PSxG/xGOT; field tilt/box entries/xT; clima (S5); liquidez/límites; prior de plantilla.

---

## 5. Matriz de trazabilidad (requisito → dato → módulo → test)

Módulos = secciones internas de `deportes/futbol.js` (un archivo por deporte, `deportes/LEEME.md`) + tablas Supabase declaradas en `tablas` + `tests/futbol.test.mjs` (Node, extrae el archivo a un contexto aislado).

| § | Requisito | Dato | Módulo / configuración | Test |
|---|---|---|---|---|
| Master §2, SE §1.1.1 | Registro canónico y liquidación | `bet_id`, `line`, `selection` | `REGISTRO_MERCADOS` | `moneyline sin tipar bloqueado`; `cada mercado con periodo+línea+estados` |
| SE §3, Master §5 | Conversión de cuotas | `odds_*` | `PRECIOS.decimalA/americanoA` | `ida y vuelta; rechazo ≤1` |
| SE §3, Master §5, POD §9 | No-vig 1X2 con 3 salidas; two-way por casa; mediana; método registrado | cuotas | `PRECIOS.noVig`, `PRECIOS.consenso` | `suma 1; 1X2 exige empate; mediana ignora casa desviada` |
| SE §3, Master §2 | EV por estado de pago; cuartos | dist + línea | `LIQUIDACION.estados`, `LIQUIDACION.ev` | `AH −0.25/+0.75; push entero; total 2.75` |
| SE §3 | DNB push; DC suma sin renormalizar | rejilla | `LIQUIDACION.dnb/dc` | `reembolso; unión sin doble conteo` |
| SE §3, Master §2 | TWEH con intersección | periodos | `MODELO.periodos` (Fase 2) | `P(H1∪H2) < P(H1)+P(H2)` |
| SE §3, §5.1 | Rejilla conjunta; ≥2 familias | resultados, xG | `MODELO.fuerzas`, `MODELO.rejilla`, `MODELO.familias[]` | `suma 1; BTTS/1X2/totales coherentes` |
| SE §3 | Recencia, ajuste por rival, shrinkage, ESS | resultados | `MODELO.fuerzas` (config λ, prior) | `ESS fórmula; recencia monótona` |
| SE §3, §7 | EV_LCB = EV − k·SE | modelo | `INCERTIDUMBRE.evLCB` | `lcb ≤ ev` |
| SE §5.1, §7, POD §8 | Acuerdo de modelos | modelo | `PUERTAS.acuerdoModelos` | `dirección opuesta bloquea Strong/Elite; POD >6 elimina` |
| SE §2.1, POD §5, Master §3 | Snapshot append-only con hash | todo | `ALMACEN.snapshot` → `futbol_snapshots`, `futbol_cuotas` | `mismo id ⇒ mismo resultado; no sobreescribe` |
| SE §7 | 11 puertas duras | varios | `PUERTAS.evaluar` → reason codes SE §10.1 | `cada puerta bloquea sola` |
| SE §7 | Tiers y mínimos | scores | `ASIGNACION.tier` | `fronteras; downgrade registrado; No Signal` |
| SE §7.1, Master §6 | Score por componentes; 5 scores explicables | features | `SCORE.*` | `pesos suman 100` |
| SE §8, §8.1 | Ventanas y kill switches | timestamps | `CICLO.ventana`, `CICLO.killSwitches` | `Official solo tras XI; precio fuera expira` |
| SE §1.2, §10, Master §8 | Objeto de decisión + tarjeta | todo | `SALIDA.registro/tarjeta` → `futbol_senales` | `campos obligatorios; null≠unknown≠n/a` |
| Master §7, SE §1.3 | Dedup y correlación | candidatos | `ASIGNACION.correlacion` | `segunda expresión bloqueada` |
| POD §5–§14, §21–§24 | Motor POD | props, XI, cuotas | `POD.*` → `futbol_pod` | `mínimos §12; stress; separación; desempate §22; estados §23` |
| SE §9, Master §9 | Backtesting punto-en-el-tiempo, calibración, CLV | snapshots propios | `VALIDACION.*`, `futbol_cierres`, `futbol_resultados` | `solo información anterior al timestamp` |
| Master §10 | 10 grupos de tests | — | `tests/futbol.test.mjs` | todos |

---

## 6. Contradicciones, ambigüedades, duplicados y huecos

### 6.1 Contradicciones (resueltas por jerarquía SE/POD > Master)
| # | Tema | Master | SE / POD | Resolución |
|---|---|---|---|---|
| C1 | Composite y bandas | 5 scores, 35/25/20/10/10, bandas 85/72/60 "solo si no hay pesos" | SE §7 tiers por EV + percentil + EV_LCB + DQ; SE §7.1 pesos por mercado | Mandan SE §7 y §7.1; los 5 scores se producen como explicación, no como criterio |
| C2 | Estados | Elite/Strong/Lean + No Signal | + Signal Detected (watchlist) | Se implementan los 5 |
| C3 | Alcance en lanzamiento | 15 mercados "donde datos lo permitan" | SE §11 fases | Se sigue SE §11 |
| C4 | Staking | no añadir | módulo aparte | **Sin unidades ni Kelly** |
| C5 | Mínimos de EV | configurables | SE 1.5/3.0/4.5%; POD edge 5.5 pp | Valores SE/POD |
| C7 | **Sobrescribir vs append-only** | §7: "Preserve original recommendations for honest tracking" | SE §2.1: append-only; POD §26: "Do not overwrite a prior Official record" | **Instrucción del dueño: el tablero se sobrescribe cuando una corrida posterior trae un pick mejor.** Se cumplen las dos cosas separando responsabilidades: `futbol_tablero` es lo VIGENTE y se reescribe; `futbol_senales`, `futbol_snapshots`, `futbol_cuotas` y `futbol_auditoria` siguen siendo append-only, así que el backtest punto-en-el-tiempo y el rastreo honesto se conservan intactos. La fila del tablero guarda además `mejor_edge` y `mejor_snapshot` |
| C6 | **Qué decide el tier** | §6: composite de los cinco scores + bandas + mínimos por tier | SE §7: EV + **percentil del slate** + EV inferior + DQ | **Instrucción del dueño (5-sep-2026): deciden Edge, Confianza y Data Quality.** Se implementa el esquema del Master §6 restringido a esos tres (S20); los mínimos de EV y EV inferior de SE §7 se conservan como puertas obligatorias, que el propio Master §6 exige configurar. **El percentil del slate deja de decidir** y solo se guarda para auditoría: era además mi interpretación de una línea ambigua (A1) y hacía que el tier dependiera de cuántos partidos hubiera ese día |

### 6.2 Ambigüedades (interpretación registrada; no bloquean)
| # | Ambigüedad | Interpretación |
|---|---|---|
| A1 | SE §7 percentil de rank: ¿slate, competición o histórico? | **Resuelta por C6**: el percentil ya no decide. Se sigue calculando sobre los candidatos ejecutables del mismo slate y se guarda en el registro para auditoría |
| A2 | European handicap en SE §1.1/§6 pero no en §1.1.1 ni Master §2 | Fuera de alcance |
| A3 | "Approved/sharp books" sin lista | **Q1** |
| A4 | Ventanas T-24h…T-5 presuponen proceso continuo; el proyecto corre por corridas | Ventana evaluada en cada corrida por tiempo al kickoff; Official solo si la corrida cae ≤T-60 con XI oficial (L3) |
| A5 | Zona horaria del slate (POD §5) | S4 |
| A6 | SE §3 no elige método de no-vig | Referencia versionada `novig_method` = Shin (S6); los cuatro se guardan |
| A7 | POD §7 "15 cents" | Diferencia absoluta ≤15 en precio americano vs mediana de precios americanos |
| A8 | POD §3 elegibles vs oferta real two-sided ≥3 casas | Se **mide** en Fase 1 (§6.7) |

### 6.3 Duplicados / features correlacionadas
- `team_gf_p90`/`team_ga_p90`/`team_gd_p90`/`team_expected_points`: un cluster (misma rejilla).
- `team_xg_share`/`team_xgd`/`team_xg_p90`: cluster xG.
- 1X2 / DNB / DC / AH / TEAM_GOALS / BTTS del mismo partido = **una tesis** (SE §1.3) → familia de correlación por partido y lado.
- POD: props del mismo jugador (shots–SOT; passes att–cmp) → solo el mejor calificado (POD §19).

### 6.4 Mercados no soportables hoy
- Live: sin feed sincronizado ni modelo validado → bloqueado (Master §3).
- Qualification/trophy, HT/FT, correct score, time bands: fuera de fases 1–2.
- Booking points, tarjetas, offsides, throw-ins, goal kicks: solo si "provider grading matches the sportsbook rulebook" (SE §1.1) → sin registro de reglas por casa, no se habilitan.

### 6.5 Datos no disponibles
| Insumo | Estado | Impacto |
|---|---|---|
| Cuotas históricas punto-en-el-tiempo | **No existen** en API-Football | El backtest SE §9 solo podrá hacerse con los snapshots capturados desde ahora. Ninguna validación retroactiva con precios reales; promoción = paper tracking prospectivo |
| Refresco 5–30 s (SE §2.1) | No factible (app estática + robot) | Snapshot por corrida; frescura medida y aplicada como puerta |
| XI oficial | ≈T-40 (no T-75/T-60) | Ventana "XI oficial" desde T-40 (S7) |
| xG por tiro, pressing, transición, tracking | N | Marcadas `unavailable`; Fase 1 usa fuerzas ajustadas por rival desde goles y xG agregado |
| Clima | N | S5 |
| Reglas de liquidación por casa | No las publica el proveedor | `settlement_rule_id` = regla canónica con `book_rule_unverified=true`; mercados cuya regla depende de la casa quedan fuera |

### 6.5b Hallazgos de implementación (5-sep-2026)
- **Hándicap asiático del proveedor**: "Home −1" y "Away −1" son los dos lados de la misma línea (visitante +1); no son líneas distintas. Implementado y probado.
- **EUROPA LEAGUE y CONFERENCE LEAGUE**: `/leagues` reporta `coverage.odds=false` en 2026 → sin candidatos (se muestran "sin cuotas").
- **No existe "Draw No Bet" de partido completo** en `/odds/bets` (solo 1ª y 2ª mitad); "Home/Away" (bet 2) queda bloqueado por SE §1.1.1. La línea asiática 0 cubre la economía del DNB dentro del registro AH.
- **Props de jugador**: escaleras de un lado ("Jugador - N") con 1-2 casas por línea → POD siempre no-selección (§6.7 confirmado).
- **Modelo sin calibrar**: log loss walk-forward ≈ 0.93–1.10 por competición; sin S19 los EV eran 50–300%.

### 6.6 Master §10 sin correlato en el repo
- "API/schema": no hay backend; el API es el esquema de tablas Supabase + el objeto de decisión SE §10 por fila.
- "Logging, retries, rate-limit": adaptador con reintentos y respeto de `x-ratelimit`; logs = `futbol_auditoria`.

### 6.7 Medición pendiente antes de habilitar POD
Cobertura real, por liga, de: (a) bet ids de props POD §3, (b) casas por línea, (c) ambos lados a la misma línea. Sin ≥3 casas two-sided el POD devuelve "NO QUALIFYING SOCCER PROP OF THE DAY" y así se reporta.

---

## 7. Confirmado por documentos vs supuestos de configuración

**Confirmado (no se toca):** §1–§2 de esta auditoría; umbrales SE §7 y POD §12; pesos SE §7.1 y POD §11/§13; reason codes SE §10.1 y POD §26; fases SE §11; prohibiciones SE §1.3; sin staking.

**Supuestos de configuración** (Master §1.7) — viven en `FUTBOL_CONFIG` con etiqueta `SUPUESTO`:
| Id | Supuesto | Por qué |
|---|---|---|
| S1 | Competiciones = las 20 del dueño (5-sep-2026): PREMIER LEAGUE (39), LA LIGA (140), BUNDESLIGA (78), SERIE A (135), LIGUE 1 (61), CHAMPIONSHIP (40), SCOTTISH PREMIERSHIP (179), LIGA PORTUGAL (94), SÜPER LIG (203), EREDIVISIE (88), SUPERLIGAEN (119), ELITESERIEN (103), PRO LEAGUE (144), SUPER LEAGUE SUIZA (207), SAUDI PRO LEAGUE (307), MLS (253), LIGA MX (262), CHAMPIONS LEAGUE (2), EUROPA LEAGUE (3), CONFERENCE LEAGUE (848). Ids **a verificar contra `/leagues`** | Decisión del dueño |
| S2 | Proveedor único = API-Football (key en `app_config.af_key`) | Decisión del dueño |
| S3 | `k` de EV_LCB = 1.0 hasta calibrar | SE no fija k |
| S4 | Slate y horas en America/New_York (como MLB) + hora local del estadio | POD §5 exige zona, no la fija |
| S5 | Clima: `unavailable` (no se imputa); Open-Meteo solo si el dueño lo autoriza | Master §3 |
| S6 | No-vig de referencia = Shin; los cuatro guardados | SE §3 |
| S7 | "XI oficial" desde que `/fixtures/lineups` responde (≈T-40) | Proveedor |
| S8 | λ, prior, ρ, k: estimados por competición con temporada actual + anterior, versionados; nunca mirando el partido objetivo | SE §5 |
| S9 | Caps de publicación: sin cap por defecto, campo presente | Master §7 |
| S10 | Todas las casas del proveedor aprobadas; Pinnacle (id 4) única sharp — **autorizado por el dueño 5-sep-2026** | SE §4.1/§7 |
| S11 | Frescura máxima de cotización por tier: Detected 1440 min · Lean 120 · Strong 60 · Elite 30 | SE §7 no fija minutos |
| S12 | λ3 del bivariado = 0.12 | SE §3 |
| S13 | Familia B: mezcla 0.6·xG + 0.4·goles; cobertura mínima de xG 60% | SE §5.1 |
| S14 | Desacuerdo máximo entre familias 6.0 pp (mismo valor que POD §8) | SE §7 |
| S15 | Outlier de precio: mejor cuota >3 pp sobre la mediana se ignora | SE §4.1 |
| S16 | Una tesis por partido y lado (cap de correlación 1) | SE §1.3 |
| S18 | SD de log λ = 0.5·√(1/ESS_att + 1/ESS_def) para el bootstrap de EV_LCB | SE §3 |
| S23 | **Tablero vigente sobrescribible**: 3 picks por partido, los de mayor edge, en `futbol_tablero` (upsert por `candidate_key`). El histórico `futbol_senales` sigue append-only. Instrucción del dueño, 5-sep-2026 | SE §2.1 / POD §26 |
| S24 | En `futbol_senales` solo se guardan los candidatos con estado (Elite/Strong/Lean/Detected). Los No Signal, que son miles por corrida y nunca pueden ser un pick, se resumen en el conteo del snapshot | SE §2.1 |
| S20 | **El pick lo deciden Edge Strength, Confianza y Data Quality** (Master §6), pesos 0.4375 / 0.3125 / 0.25 (el bootstrap 0.35/0.25/0.20 restringido a esos tres y renormalizado) y bandas 85 / 72 / 60 del propio Master §6. **Instrucción del dueño, 5-sep-2026** | Master §6 |
| S21 | Edge Strength = mín(100, 20·edge_pp); mínimos por tier 3.5 / 2.5 / 1.5 pp | Master §6 pide configurar mínimos |
| S22 | Confianza = media a peso igual de calibración validada, certeza del EV, soporte de muestra (ESS) y acuerdo entre familias — los cuatro insumos que nombra Master §6 | Master §6 |
| S19 | **Calibración provisional**: shrinkage al prior de mercado, w = ESS/(ESS+60). Sin él, el modelo sin calibrar da EV de 50–300% (Master §6 prohíbe publicarlos). Sustituir por calibración empírica SE §9 | SE §3 shrinkage, §4.1 market prior, §5.1 market residual |

---

## 8. Preguntas bloqueantes

**Q1 · Casas aprobadas y sharp.** SE §4.1/§7 exigen "approved books" y "designated high-information books"; los documentos no dan la lista. API-Football cotiza ~30 casas (10Bet, Marathonbet, Betfair, Pinnacle, SBO, Bwin, William Hill, Bet365, Dafabet, Ladbrokes, 1xBet, BetFred, 188Bet, Interwetten, Unibet, Bovada, Betcris, 888Sport, Tipico, Sportingbet, Betway, Betsson, NordicBet, Betano, Fonbet, Superbet, BetVictor…). Necesito (a) aprobadas y (b) sharp. Mientras: S10 provisional = todas aprobadas, Pinnacle única sharp.

**Q2 · Tablas en Supabase.** Yo no ejecuto DDL. Entregaré `futbol-setup.sql` con la Fase 1; hay que correrlo antes de la primera corrida guardada.

**Q3 · Diseño de la interfaz.** Los documentos fijan el contenido (SE §1.2/§10, Master §8, POD §25) pero no el diseño visual. ¿Referencia (captura, boceto, app) o construyo la tarjeta literal del §8 y la ajustas después?

---

## 9. Orden de implementación (SE §11, sin añadidos)

1. **Fase 1 — Required.** Adaptador API-Football con snapshots; registro canónico; calendario; escenarios XI/GK; eventos oficiales; fuerzas ajustadas por competición (goles + xG agregado) con recencia y shrinkage; rejilla conjunta con ≥2 familias; motor de precios/EV por estados; puertas; scores SE §7.1; tiers SE §7; ciclo de vida y reason codes; captura de cierre; objeto de decisión SE §10; tarjeta; tablas; tests Master §10. Medición §6.7 y, si pasa, motor POD.
2. **Fase 2 — High value.** Periodos (mitades), TWEH, FH Goals/FH Team Goals, córners con distribución propia, árbitro, correlación de tablero, monitoreo.
3. **Fase 3 — Advanced.** Live, tracking, drift, failure injection, champion/challenger.

Informe de cierre por fase: implementado / probado / validado / bloqueado / propuesto (Master §11.6).
