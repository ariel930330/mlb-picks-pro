# INFORME DE FASE 1 — SOCCER · HAXIOM EDGE (Master §11.6)

Fecha: 2026-09-05 · Versiones: `haxiom_soccer_policy_v1` · `soccer_joint_score_v1` · `soccer_features_v1` · `market_prior_shrinkage_v0` · `soccer_settlement_v1` · `api-football_v3`

## IMPLEMENTADO
- Registro canónico de mercados con etiqueta original, periodo, estados de liquidación y familia de correlación (SE §1.1.1, Master §2). Fase 1: 1X2, DOBLE OPORTUNIDAD (derivada del 1X2 sin renormalizar), HÁNDICAP ASIÁTICO (todas las líneas, cinco estados, cuartos partidos), GOLES DEL PARTIDO, GOLES LOCAL/VISITA, AMBOS ANOTAN. Fase 2 registrada en snapshot y NO evaluada (mitades, córners, gana alguna mitad): nunca se prorratea.
- DNB **bloqueado** con SETTLEMENT_BLOCK: el proveedor solo publica "Home/Away" (bet 2), etiqueta de dos vías sin tipar (SE §1.1.1). La línea asiática 0 (con push) sí se evalúa como ASIAN_HANDICAP.
- Adaptador API-Football con reintentos, respeto de rate limit, paginación solo donde existe, normalización de cuotas conservando la original (decimal + americana).
- No-vig por casa con cuatro métodos (multiplicativo, aditivo, potencia, Shin) y consenso robusto por mediana de casas aprobadas; Pinnacle como `mkt_sharp_novig_p` separado (S10).
- Precio ejecutable = mejor cuota aprobada que no sea outlier aislado (S15); línea distinta = candidato distinto.
- Modelo por competición: fuerzas ataque/defensa local/visita con recencia exponencial y shrinkage; **ajuste walk-forward** de (H, ρ, K) sobre la temporada anterior (S8); dos familias: A Dixon-Coles sobre goles, B bivariado de Poisson sobre mezcla xG/goles (xG desde `/fixtures/statistics`, cacheado en `futbol_partidos`).
- EV por estados de liquidación; **EV_LCB = EV − k·SE** con bootstrap paramétrico determinista (64 draws, S3/S18) + varianza entre familias.
- Calibración provisional **S19**: `p_cal = p_mkt + w·(p_model − p_mkt)`, `w = ESS/(ESS+60)`; EV mezclado igual. Sustituir por calibración empírica en cuanto haya muestra (SE §9).
- Puertas universales (precio, frescura, integridad del evento, modelo, coherencia derivada, liquidación) → NO SIGNAL con reason codes SE §10.1; puertas de tier SE §7 literales (EV, percentil del slate, LCB, DQ, acuerdo de familias ≤6 pp, frescura por tier S11); XI sin confirmar → SIGNAL DETECTED con `provisional_tier` y LINEUP_BLOCK; correlación por tesis de partido (S16) → CORRELATION_BLOCK; precio mínimo aceptable por línea y tier; expiración al kickoff.
- Scores SE §7.1 (siete componentes, pesos por mercado) + los cinco scores del Master §6 como explicación; DQ (completitud, frescura, acuerdo, alineación).
- Objeto de decisión SE §10 / §1.2 (identidad, mercado, modelo, estado de mercado, contexto, calidad, señal, auditoría) por candidato; tarjeta pública Master §8.
- Snapshot inmutable con hash del insumo; persistencia append-only en Supabase (`futbol_snapshots`, `futbol_cuotas`, `futbol_senales`, `futbol_pod`, `futbol_partidos`, `futbol_cierres`, `futbol_resultados`, `futbol_auditoria`); transiciones de estado auditadas.
- Captura de cierre (≤15 min al inicio) y calificación con liquidación real + CLV.
- POD v1.0: snapshot de props, puertas §4/§7 con reason codes §26 y no-selección oficial.
- Interfaz: tablero por tier (PAPER), watchlist con tier provisional, partidos por competición con modal de todos los candidatos y motivos, POD, historial (récord, unidades, CLV), auditoría, criterios. Bot `?deporte=futbol&auto=1|grade`.

## PROBADO
- `tests/futbol.test.mjs`: 48 pruebas, todas pasan (conversión de cuotas; no-vig 3 vías; DNB push y bloqueo; DC unión; AH cuartos/enteros/medios; totales de cuarto; separación de periodos; coherencia BTTS/1X2/totales; bivariado; insumos faltantes/stale/outlier/línea; fronteras de tier; sin señales forzadas; XI provisional; frescura; pesos; S19; formato AH del proveedor; correlación; precio mínimo; expiración; determinismo; walk-forward sin fuga; fuerzas/ESS; fixture dorado independiente; POD no-selección).
- Corrida real 2026-09-06 (17 competiciones con cuotas, 52 partidos, 5,922 candidatos, 84 llamadas, 51 s): sin errores; render de todas las pestañas y del modal.

## VALIDADO
- Nada en el sentido SE §9.1: **no existe calibración empírica ni CLV fuera de muestra**. Todo es PAPER. La validación es prospectiva y empieza cuando se corra el SQL y el robot capture snapshots y cierres.

## BLOQUEADO
| Qué | Por qué | Qué lo desbloquea |
|---|---|---|
| Prop of the Day (Official) | El proveedor publica props como escaleras de un lado con 1-2 casas por línea; POD §4/§7 exigen ≥3 casas y ambos lados | Proveedor de cuotas con props two-sided |
| EUROPA LEAGUE y CONFERENCE LEAGUE | Sin cobertura de cuotas en el proveedor para 2026 | Cobertura del proveedor |
| DNB | Etiqueta "Home/Away" sin tipar | Confirmación documentada de la regla de la casa (o usar AH 0) |
| Familia B con xG | Caché de estadísticas vacío al inicio (requiere sesión y corridas) | Se llena solo, 120 partidos por corrida |
| Backtest histórico | No hay cuotas históricas punto-en-el-tiempo | Snapshots propios acumulados |
| Modelo agreement "genuino" | Mientras xG < 60% de cobertura, B usa goles (distinta distribución, mismo insumo) | Caché de xG |
| Clima, tracking, pressing, transición, xG por tiro | No disponibles en el proveedor | Otro proveedor |

## PROPUESTO (no implementado; requiere decisión del dueño)
- Nada fuera de los documentos. Los supuestos S1–S19 están en `CONFIG` y en la auditoría §7; el dueño puede cambiarlos.

## RIESGOS QUE DEBE VIGILAR EL PAPER TRACKING
1. Sesgo favorito-longshot del modelo (EV grandes en cuotas +300 o más). El Signal Engine no fija rango de cuotas para señales (solo el POD lo hace): se registra tal cual y la calibración por banda de cuota (SE §9) decidirá.
2. Percentil dentro del slate (A1): en días con pocos candidatos, Elite/Strong dependen de la posición relativa, no de un umbral absoluto.
3. Sin corridas en ventana XI (≈T-40 a T-5) no habrá señales oficiales, solo watchlist.
