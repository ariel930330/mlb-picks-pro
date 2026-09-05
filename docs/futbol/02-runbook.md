# RUNBOOK — SOCCER · HAXIOM EDGE (Fase 1)

## Archivos
| Archivo | Qué es |
|---|---|
| `deportes/futbol.js` | Motor completo + interfaz (un archivo por deporte, `deportes/LEEME.md`). Módulos internos: VERSIONES/CONFIG, REGISTRO DE MERCADOS, NÚCLEO MATEMÁTICO, MODELO, ADAPTADOR API-FOOTBALL, CANDIDATOS/EV, PUERTAS/SCORES/TIERS, POD, CORRIDA, INTERFAZ |
| `deportes/futbol.css` | Estilos, todo bajo `#dep-futbol` |
| `futbol-setup.sql` | Tablas Supabase + RLS. Bloques 1-9 append-only; bloque 10 (`futbol_tablero`) es el tablero vigente, la única tabla que se actualiza en sitio |
| `tests/futbol.test.mjs` | 67 pruebas (Master §10). `node tests/futbol.test.mjs` |
| `docs/futbol/01-auditoria.md` | Auditoría Master §1 |
| `docs/futbol/03-informe-fase1.md` | Informe de cierre de fase (implementado / probado / validado / bloqueado) |

## Requisitos de datos
- **API-Football** (api-sports.io v3, plan Pro). Key en `app_config.af_key` (se carga con la sesión del dueño; `saveAfKey('...')` en consola para cambiarla).
- **Supabase**: correr `futbol-setup.sql` UNA vez en el SQL Editor. Sin las tablas, el análisis corre igual pero no guarda (el tablero lo avisa).
- Sesión de dueño para guardar (RLS: escritura solo dueños; lectura pública).

## Ejecución
1. Abrir la app → botón **SOCCER** → elegir fecha del slate (zona del Este, S4) → **Analizar slate**.
2. La corrida: fixtures por competición → cuotas (todas las casas, paginado) → bajas → resultados de temporada actual y anterior (modelo, ajuste walk-forward por competición) → alineaciones para partidos a ≤120 min → candidatos → puertas → scores → tiers → correlación → POD → snapshot → guardado → auditoría.
3. Coste típico: ~85 llamadas por corrida con 20 competiciones (+ hasta 120 llamadas de estadísticas de partidos jugados para llenar el caché de xG cuando hay sesión).
4. **Calificar**: liquida las señales de días cerrados contra el marcador final (`/fixtures?id=`) y calcula CLV contra el cierre capturado. Requiere sesión.

## Robot
`?deporte=futbol&auto=1` analiza el slate de HOY y guarda; `?deporte=futbol&auto=grade` califica. El núcleo expone `window.__auto` con `listo/done/ok/msg/resumen` (mismo contrato que MLB). Para señales OFICIALES (no watchlist) el robot debe correr con XI publicado: ventana ≈T-40 a T-5 de cada partido, y una corrida ≤T-15 captura el cierre (`futbol_cierres`).

## Ventanas (SE §8) tal como se aplican
| Ventana | Cuándo | Efecto |
|---|---|---|
| T-24h+ / T-24h / T-6h / T-90 | por tiempo al inicio | candidatos evaluados; los que califican quedan en watchlist con `provisional_tier` (LINEUP_BLOCK) |
| XI | ≤60 min o alineaciones publicadas (≈T-40) | pueden abrirse Lean/Strong/Elite (PAPER) |
| T-30 / T-5 | ≤30 / ≤5 min | recheck de precio; frescura por tier (S11) |
| INICIADO | kickoff pasado | no se evalúa (estado ≠ NS) |

## Navegación entre fechas
El tablero vive en Supabase, no en la memoria del navegador. Al abrir la página se carga el análisis guardado del día, y con la barra de fechas se puede ir a cualquier otro **sin gastar llamadas a la API**.

| Control | Qué hace |
|---|---|
| `‹` y `›` | Día anterior y siguiente |
| Campo de fecha | Ir a una fecha concreta |
| `Hoy` | Volver al día actual (zona del Este) |
| Desplegable | Solo las fechas que ya tienen análisis guardado |

Un aviso arriba del tablero dice si lo que ves es **guardado** (morado, con la hora de la última corrida) o **en vivo** (verde, de esta sesión). Analizar de nuevo sobrescribe el tablero de esa fecha y el aviso pasa a en vivo.

Al abrir un partido guardado, el modal trae del histórico el resto de selecciones evaluadas de ese partido, no solo las tres del tablero.

Solo se guardan los partidos que dejaron algún pick. Un día con 52 partidos y picks en 39 mostrará 39 tarjetas al recargar; el conteo completo sigue en el resumen del snapshot.

## Qué se guarda y qué se sobrescribe
| Tabla | Comportamiento |
|---|---|
| `futbol_tablero` | **Se sobrescribe.** Los 3 mejores picks de cada partido, por edge. Una corrida posterior reemplaza la fila con su evaluación actual y recuerda el mejor edge visto. Un pick que sale del top 3 queda con `en_tablero = false`, no se borra |
| `futbol_senales` | Append-only. Una fila por candidato con estado y por corrida. Los No Signal no se guardan |
| `futbol_snapshots`, `futbol_cuotas`, `futbol_cierres`, `futbol_auditoria` | Append-only. Es lo que hace posible el backtest punto-en-el-tiempo |

La fila del tablero se actualiza aunque el edge haya empeorado, porque el precio anterior ya no existe. Lo que se conserva del pasado es `mejor_edge` y en qué corrida se vio.

## Qué decide un pick
Tres números de 0 a 100, combinados en un score único (Master §6, instrucción del dueño del 5-sep-2026):

| Score | Peso | Cómo se calcula |
|---|---|---|
| **Edge** | 43.75% | mín(100, 20 × edge en puntos porcentuales). 5 pp = 100 |
| **Confianza** | 31.25% | media de calibración validada, certeza del EV, soporte de muestra y acuerdo entre las dos familias de modelo |
| **Calidad de dato** | 25% | completitud, frescura, acuerdo entre casas y estado de la alineación |

Bandas: **Elite ≥85 · Strong ≥72 · Lean ≥60**. Cada tier exige además un mínimo en los tres por separado (Elite 70/75/95, Strong 50/65/90, Lean 30/55/80) y sigue exigiendo EV positivo por encima del umbral de su tier, EV inferior, XI confirmado, acuerdo de modelos y frescura. El score **no es una probabilidad de ganar**.

Mientras no exista calibración empírica, ese cuarto de la confianza vale 50, así que la confianza máxima hoy es 87.5. Sube sola cuando la calibración se valide.

## Edge y EV no son lo mismo (SE §3)
- **Edge** (en puntos porcentuales) compara la probabilidad del modelo con la del mercado **sin comisión**. Dice si el modelo discrepa del mercado.
- **EV** compara el modelo con el **precio que de verdad puedes tomar**, que ya lleva comisión. Dice si esa discrepancia deja dinero.
- Por eso una selección puede tener edge positivo y EV negativo: el modelo acierta pero la comisión se lo come. Los tiers se deciden por **EV** (SE §7); el edge se guarda y se muestra como evidencia.
- En mercados que devuelven parte del importe (asiáticos de cuarto, líneas enteras) la tarjeta indica qué porcentaje se devuelve.

## Color por nivel
Cada nivel tiene su color y se aplica en todas partes: la pastilla del pick, el fondo y el borde de la fila, el borde y el resplandor de la tarjeta del partido, el punto de la liga y las filas de las tablas.

| Nivel | Color |
|---|---|
| ELITE SIGNAL | verde |
| STRONG SIGNAL | azul |
| LEAN SIGNAL | ámbar |
| SIGNAL DETECTED | gris |
| NO SIGNAL | sin color |

La tarjeta de un partido y la cabecera de una liga toman el **mejor** nivel que contienen, no el del primer pick por edge. El tablero lleva una leyenda con el conteo de cada nivel.

## Qué significa cada estado
- **ELITE / STRONG / LEAN · PAPER**: cumple SE §7 con XI confirmado. PAPER = sin calibración validada ni promoción (SE §9.1); se rastrea, no se publica como producción.
- **SIGNAL DETECTED**: EV > 0 pero no califica (XI pendiente, percentil/DQ/EV insuficientes, correlación). Watchlist.
- **NO SIGNAL**: falla de puerta universal (sin precio ejecutable, cotización vieja, sin modelo, etiqueta sin tipar, incoherencia derivada, EV ≤ 0).

## Diagnóstico
- Pestaña **Auditoría**: snapshot, hash, versiones, competiciones (partidos, cuotas, modelo, parámetros ajustados), transiciones, cierres.
- Pestaña **Criterios**: umbrales, pesos, registro de mercados, supuestos.
- Consola: `Deportes.diagnostico()`.
- Errores frecuentes: "Faltan las tablas" → correr `futbol-setup.sql`; "Sin key de API-Football" → sesión + `app_config.af_key`; competición "sin cuotas" → el proveedor no cubre cuotas (EUROPA LEAGUE y CONFERENCE LEAGUE en 2026).

## Promoción a producción (SE §9.1) — pendiente
Requiere: tracking PAPER prospectivo con muestra suficiente por mercado/competición, calibración (ECE/Brier) sin sobreconfianza, CLV y yield positivos fuera de muestra, estabilidad por temporada/ventana/casa, y aprobación humana. Hasta entonces todo es PAPER.
