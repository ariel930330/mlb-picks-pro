# RUNBOOK — SOCCER · HAXIOM EDGE (Fase 1)

## Archivos
| Archivo | Qué es |
|---|---|
| `deportes/futbol.js` | Motor completo + interfaz (un archivo por deporte, `deportes/LEEME.md`). Módulos internos: VERSIONES/CONFIG, REGISTRO DE MERCADOS, NÚCLEO MATEMÁTICO, MODELO, ADAPTADOR API-FOOTBALL, CANDIDATOS/EV, PUERTAS/SCORES/TIERS, POD, CORRIDA, INTERFAZ |
| `deportes/futbol.css` | Estilos, todo bajo `#dep-futbol` |
| `futbol-setup.sql` | Tablas Supabase (append-only) + RLS |
| `tests/futbol.test.mjs` | 54 pruebas (Master §10). `node tests/futbol.test.mjs` |
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

## Edge y EV no son lo mismo (SE §3)
- **Edge** (en puntos porcentuales) compara la probabilidad del modelo con la del mercado **sin comisión**. Dice si el modelo discrepa del mercado.
- **EV** compara el modelo con el **precio que de verdad puedes tomar**, que ya lleva comisión. Dice si esa discrepancia deja dinero.
- Por eso una selección puede tener edge positivo y EV negativo: el modelo acierta pero la comisión se lo come. Los tiers se deciden por **EV** (SE §7); el edge se guarda y se muestra como evidencia.
- En mercados que devuelven parte del importe (asiáticos de cuarto, líneas enteras) la tarjeta indica qué porcentaje se devuelve.

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
