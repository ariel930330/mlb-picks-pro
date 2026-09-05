# INFORME DE FASE 1 — SOCCER · HAXIOM EDGE (Master §11.6)

Fecha: 2026-09-05 · Versiones: `haxiom_soccer_policy_v1` · `soccer_joint_score_v1` · `soccer_features_v1` · `market_prior_shrinkage_v0` · `soccer_settlement_v1` · `api-football_v3`

## IMPLEMENTADO
- Registro canónico de mercados con etiqueta original, periodo, estados de liquidación y familia de correlación (SE §1.1.1, Master §2). Fase 1: 1X2, DOBLE OPORTUNIDAD (derivada del 1X2 sin renormalizar), HÁNDICAP ASIÁTICO (todas las líneas, cinco estados, cuartos partidos), GOLES DEL PARTIDO, GOLES LOCAL/VISITA, AMBOS ANOTAN. Fase 2 registrada en snapshot y NO evaluada (mitades, córners, gana alguna mitad): nunca se prorratea.
- DNB **bloqueado** con SETTLEMENT_BLOCK: el proveedor solo publica "Home/Away" (bet 2), etiqueta de dos vías sin tipar (SE §1.1.1). La línea asiática 0 (con push) sí se evalúa como ASIAN_HANDICAP.
- Adaptador API-Football con reintentos, respeto de rate limit, paginación solo donde existe, normalización de cuotas conservando la original (decimal + americana).
- No-vig por casa con cuatro métodos (multiplicativo, aditivo, potencia, Shin) y consenso robusto por mediana de casas aprobadas; Pinnacle como `mkt_sharp_novig_p` separado (S10).
- Precio ejecutable = mejor cuota aprobada que no sea outlier aislado (S15); línea distinta = candidato distinto.
- Modelo por competición: fuerzas ataque/defensa local/visita con recencia exponencial y shrinkage; **ajuste walk-forward** de (H, ρ, K) sobre la temporada anterior (S8); dos familias: A Dixon-Coles sobre goles, B bivariado de Poisson sobre mezcla xG/goles (xG desde `/fixtures/statistics`, cacheado en `futbol_partidos`).
- **Edge en puntos porcentuales para TODO mercado** (SE §3: "edge_pp = p_model − p_no_vig; store both"): la probabilidad del modelo se normaliza a la misma escala que el de-vig del mercado, p = A/(A+B) con A = win + half_win/2 y B = loss + half_loss/2. Así el edge existe también en asiáticos de cuarto y líneas enteras, y EV = riesgo·(p·d − 1) coincide exactamente con la suma por estados. Se guardan edge_pp, edge_percent, edge_units, cuota justa (decimal y americana) y masa en riesgo.
- EV por estados de liquidación; **EV_LCB = EV − k·SE** con bootstrap paramétrico determinista (64 draws, S3/S18) + varianza entre familias.
- Calibración provisional **S19**: `p_cal = p_mkt + w·(p_model − p_mkt)`, `w = ESS/(ESS+60)`; EV mezclado igual. Sustituir por calibración empírica en cuanto haya muestra (SE §9).
- Puertas universales (precio, frescura, integridad del evento, modelo, coherencia derivada, liquidación) → NO SIGNAL con reason codes SE §10.1; puertas de tier SE §7 literales (EV, percentil del slate, LCB, DQ, acuerdo de familias ≤6 pp, frescura por tier S11); XI sin confirmar → SIGNAL DETECTED con `provisional_tier` y LINEUP_BLOCK; correlación por tesis de partido (S16) → CORRELATION_BLOCK; precio mínimo aceptable por línea y tier; expiración al kickoff.
- Scores SE §7.1 (siete componentes, pesos por mercado) + los cinco scores del Master §6 como explicación; DQ (completitud, frescura, acuerdo, alineación).
- Objeto de decisión SE §10 / §1.2 (identidad, mercado, modelo, estado de mercado, contexto, calidad, señal, auditoría) por candidato; tarjeta pública Master §8.
- Snapshot inmutable con hash del insumo; persistencia append-only en Supabase (`futbol_snapshots`, `futbol_cuotas`, `futbol_senales`, `futbol_pod`, `futbol_partidos`, `futbol_cierres`, `futbol_resultados`, `futbol_auditoria`); transiciones de estado auditadas.
- Captura de cierre (≤15 min al inicio) y calificación con liquidación real + CLV.
- POD v1.0: snapshot de props, puertas §4/§7 con reason codes §26 y no-selección oficial.
- Interfaz: tablero por tier (PAPER), watchlist con tier provisional, partidos por competición con modal de todos los candidatos y motivos, POD, historial (récord, unidades, CLV), auditoría, criterios. Bot `?deporte=futbol&auto=1|grade`.

## CORREGIDO TRAS REVISIÓN (5-sep-2026, tarde)
Reporte del dueño: "el modelo no calcula edge". Confirmado; eran cuatro defectos:
1. **edge_pp era null en todo mercado con empuje o media apuesta** (hándicaps asiáticos, cuartos, líneas enteras) porque las dos probabilidades no estaban en la misma escala. Ahora se calcula siempre.
2. **Nunca se mostraba en pantalla.** Ahora está en tarjeta, modal, watchlist e historial, con la cuota justa frente a la disponible.
3. **Masa en riesgo mal definida en líneas de cuarto**: se usaba 1 − push, que ignora la mitad del importe devuelto en una "media pérdida". Eso inflaba la cuota justa y el EV de TODO asiático de cuarto (1,716 candidatos en la jornada de prueba). Ahora es A + B.
4. **El EV de mercado de la mezcla S19 ignoraba el empuje**, sobrestimando ese término en asiáticos y líneas enteras.

Además, los valores se guardan sin redondear y el redondeo pasó a ser solo de presentación (SE §13 / POD §13).

## CAMBIO DE CRITERIO PEDIDO POR EL DUEÑO (5-sep-2026)
"Que los picks los dé por Edge, Confianza y Data Quality". Implementado como el esquema del **Master §6**:
- **Score = 0.4375 · Edge Strength + 0.3125 · Confianza + 0.25 · Data Quality**. Los pesos son el bootstrap del Master §6 (0.35 / 0.25 / 0.20) restringido a los tres que nombró el dueño y renormalizado a 1. Bandas **85 / 72 / 60**, las del propio Master §6.
- **Cada tier exige además un mínimo en los tres por separado**: Elite 70 / 75 / 95, Strong 50 / 65 / 90, Lean 30 / 55 / 80. Los de calidad son los valores literales de SE §7. Los de edge equivalen a 3.5 / 2.5 / 1.5 puntos porcentuales.
- **Edge Strength** = mín(100, 20 · edge_pp): 5 pp = 100 (S21).
- **Confianza** = media a peso igual de los cuatro insumos que el Master §6 nombra: calibración validada, certeza del EV, soporte de muestra (ESS) y acuerdo entre las dos familias de modelo (S22). Sin calibración empírica ese cuarto se limita a 50, así que hoy la confianza no puede pasar de 87.5. Sube sola cuando exista calibración.
- **Se conservan como puertas obligatorias** los mínimos de EV y EV inferior de SE §7, más XI confirmado, acuerdo de modelos, frescura, estabilidad y correlación. El propio Master §6 exige configurarlos: "Composite score alone cannot qualify a signal".
- **Conflicto declarado (Master §1.6)**: SE §7 pedía además percentil ≥85/95/98 del slate. Ya no decide; se calcula y se guarda para auditoría. Ventaja: el criterio pasa a ser absoluto y deja de depender de cuántos partidos haya ese día.

Efecto medido sobre la jornada real del 6-sep-2026 (forzando XI confirmado y cotización de 4 minutos, que es el escenario de la ventana de publicación): **6 Strong y 10 Lean**, con edge de 3.1 a 7.0 puntos porcentuales. Con el criterio anterior bastaba el EV y entraban selecciones con edge de 2 pp.

## TABLERO VIGENTE Y 3 PICKS POR PARTIDO (5-sep-2026)
Instrucción del dueño: guardar los análisis, sobrescribirlos cuando una corrida posterior traiga un pick mejor, dar 3 picks por partido (los de mayor edge) y presentar cada partido como una tarjeta dentro de su liga.
- **`futbol_tablero`** (tabla nueva, bloque 10 de `futbol-setup.sql`): una fila por pick vigente, upsert por `candidate_key`. Guarda el pick actual y además `mejor_edge`, `mejor_snapshot` y `corridas`, de modo que se ve si mejoró y en qué corrida. Un pick que sale del top 3 no se borra: queda con `en_tablero = false`.
- **La fila se actualiza siempre a la evaluación de la corrida actual**, aunque el edge haya empeorado. El precio viejo ya no existe, y publicar un precio que no se puede tomar sería un fallo de los kill switches (SE §8.1). Lo que se recuerda del pasado es el mejor edge visto, no el precio.
- **3 picks por partido como máximo**, ordenados por edge descendente (`CONFIG.tablero.por_partido`). Entran solo candidatos con estado y edge positivo. La deduplicación por tesis (SE §1.3) se extendió a la watchlist, así que el tablero nunca enseña tres expresiones de la misma opinión.
- **`futbol_senales` deja de recibir los No Signal** (S24): eran ~5,500 filas por corrida que nunca pueden ser un pick. Se guardan los ~400 con estado, y el snapshot conserva el conteo completo.
- **Interfaz**: el tablero se organiza en competición → tarjeta de partido → sus 3 picks, con la liga ordenada por su mejor tier. Al abrir un partido, el modal muestra la ficha completa de cada pick (Master §8: evidencia, riesgos, barras de los tres scores) y debajo la tabla con todas las selecciones evaluadas. Se eliminó la pestaña "Partidos" porque quedaba duplicada.
- **Conflicto declarado (Master §1.6)**: SE §2.1 y POD §26 exigen append-only. Se cumple separando lo vigente (sobrescribible) del histórico (intacto), así que el backtest punto-en-el-tiempo no pierde nada.

Medido sobre la jornada real del 6-sep-2026 en el escenario de publicación: 71 picks en 40 de 52 partidos, ninguno con el orden de edge roto, ninguno con dos picks de la misma tesis, 12 partidos sin pick.

## PROBADO
- `tests/futbol.test.mjs`: 65 pruebas, todas pasan (conversión de cuotas; no-vig 3 vías; DNB push y bloqueo; DC unión; AH cuartos/enteros/medios; totales de cuarto; separación de periodos; coherencia BTTS/1X2/totales; bivariado; insumos faltantes/stale/outlier/línea; fronteras de tier; sin señales forzadas; XI provisional; frescura; pesos; S19; formato AH del proveedor; correlación; precio mínimo; expiración; determinismo; edge presente en todo mercado; EV igual a la suma por estados; EV cero a la cuota justa con empuje y cuartos; fórmula del compuesto y de la confianza; edge minúsculo no califica aunque el EV sea positivo; calidad baja bloquea sola; el percentil ya no decide; tope de 3 picks por partido y orden por edge; el tablero descarta correlacionados; sobrescritura con mejor/peor edge; salida del top 3 sin borrar filas; walk-forward sin fuga; fuerzas/ESS; fixture dorado independiente; POD no-selección).
- Verificación sobre la jornada real del 6-sep-2026: 5,872 candidatos con masa de liquidación en 7 mercados, **0 sin edge**, identidad EV = riesgo·(p·d − 1) intacta en todos, EV exactamente 0 a la cuota justa en todos, 1,716 líneas de cuarto con masa en riesgo media 0.908.
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
3. Sin corridas en ventana XI (≈T-40 a T-5) no habrá señales oficiales, solo watchlist. En la prueba del 6-sep las cotizaciones del proveedor tenían 3 a 4 horas de antigüedad y la puerta de frescura (S11) las bloqueaba; cerca del inicio eso no ocurre.
4. **Sesgo observado hacia el UNDER**: en la prueba forzada, las 16 señales eran totales por debajo. Puede ser real (el modelo proyecta menos goles que el mercado) o un sesgo del ajuste. Es lo primero que debe vigilar el paper tracking, segmentando por lado y por banda de cuota.
5. Con comisión normal, un EV apenas positivo ya implica un edge de ~2 pp, así que parte del edge medido es comisión y no habilidad del modelo. Por eso se exigen **las dos cosas** (edge y EV) y no una sola.
