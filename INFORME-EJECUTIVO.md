# MLB Picks Pro — Informe Ejecutivo y Guía de Uso

> Sistema de análisis y proyección de apuestas de MLB. App web de un solo archivo
> (`index.html`), datos en vivo, modelo estadístico mezclado con el mercado, y
> validación del propio modelo. Repo: `ariel930330/mlb-picks-pro`.

---

## 1. Resumen ejecutivo

**Qué es:** una herramienta que cada día toma los partidos de MLB, proyecta cada
mercado de apuestas (ganador, total, hándicap, primeras 5 innings, ponches de
pitcher y props de bateadores), y los **compara contra las cuotas reales de las
casas** para mostrar dónde hay valor (edge), cuánto apostar (Kelly) y, sobre todo,
**si el modelo de verdad acierta** (calibración + CLV).

**Filosofía:** el mercado de apuestas es más "sharp" que cualquier modelo casero,
así que el sistema **no confía 100% en el modelo**: mezcla su proyección con el
mercado (70/30) y se mide a sí mismo en vez de prometer ganancias.

**Estado:** funcional y desplegado (GitHub Pages). El código está completo; lo que
falta es **acumular datos reales** para que la validación tenga sentido estadístico.

---

## 2. Arquitectura técnica

| Componente | Rol |
|---|---|
| **`index.html`** | Toda la app (HTML + CSS + JS vanilla, sin backend propio) |
| **MLB Stats API** (`statsapi.mlb.com`) | Datos en vivo: calendario, pitchers, stats, splits, alineaciones, bullpen, marcadores |
| **The Odds API** | Cuotas reales de casas de EE.UU. (ML, total, run line, props de Ks y bateadores) |
| **Open-Meteo** | Clima (temperatura/viento) — gratis, sin key |
| **Supabase** | Base de datos: historial de picks, pesos del modelo, cache del análisis. Seguridad por RLS |
| **GitHub Pages** | Hosting del sitio |

**Caché de sesión:** las llamadas a stats de MLB se cachean en memoria; el
calendario nunca se cachea (cambia). **Caché del análisis:** el resultado completo
se guarda en `localStorage` (este equipo) y en Supabase (`analysis_cache`, cualquier
equipo) → al refrescar no se vuelve a analizar.

---

## 3. El modelo — cómo proyecta

### 3.1 Probabilidad de victoria (núcleo)
Regresión logística **entrenada** con ~13,070 partidos (2019-2024, ~58.4% accuracy).
Combina, normalizado 0-1:
- Calidad de cada **abridor** (FIP, ERA, K/9, BB/9)
- **Ofensiva** de cada equipo (OPS)
- **Bullpen** (ERA de relevistas)
- **Racha** reciente y **ventaja de local**

`P(gana local) = sigmoid(w1·pitcherL + w2·pitcherV + ... + ventaja_local)`

### 3.2 Carreras esperadas (totales)
Cada equipo: su ofensiva vs el pitcheo rival, mezclando **abridor (~60% del juego)
+ bullpen (resto, cerca del promedio)**, ajustado por **park factor** y **temperatura**.
Evita sub-proyectar totales en duelos de ases.

### 3.3 Mercados derivados
| Mercado | Modelo |
|---|---|
| **Money Line** | Directo de la regresión logística |
| **Total (O/U)** | Normal sobre las carreras esperadas |
| **Run Line -1.5** | Consistente con la prob. de victoria vía probit (`margen = SD·Φ⁻¹(P)`) |
| **Primeras 5 (F5)** | Logit solo de abridores, regresado hacia 50% |
| **Ks de pitcher** | Poisson alrededor de los K esperados |
| **Props bateadores** | P(≥1 hit), bases totales, HR — todo por Poisson |

---

## 4. Refinamiento de inputs (basura entra → basura sale)

El modelo no usa stats crudas de temporada. Aplica:

1. **Regresión a la media:** tasas de muestras chicas se acercan a la liga (un .400
   en 30 turnos cuenta como ~.260; un 2.40 de ERA en 30 IP como ~3.46). Bateadores
   (prior 250 PA) y pitchers (priors por innings).
2. **Splits zurdo/derecho (platoon):** usa el OPS del equipo **vs la mano del abridor
   rival** (no el OPS general); los bateadores se ajustan por su matchup de mano.
3. **Forma reciente:** OPS de los últimos 30 días vs el de temporada (±8%).
4. **Alineación confirmada:** cuando se publica (~1-3 h antes), la pestaña de
   bateadores filtra a los **titulares reales** (✓) y el modelo penaliza si faltan
   estrellas.
5. **Bullpen real:** ERA de los relevistas (no la del equipo completa).
6. **Clima + park factor:** temperatura y **viento direccional** (componente que sopla
   hacia el jardín = más carreras; hacia home = menos), con la orientación de cada
   estadio. Park factor (Coors infla, Petco deprime). Estadios techados neutralizados.
7. **BvP (bateador vs pitcher):** historial de carrera de cada bateador vs el abridor
   rival, regresado fuerte (opcional, por costo de API).
8. **Recalibración aprendida (Platt scaling):** el botón 🧠 Recalibrar ajusta las
   probabilidades del modelo con tu propio historial de resultados, corrigiendo la
   sobre/sub-confianza. Se aplica a todas las proyecciones futuras.
9. **Reentrenamiento regularizado:** el botón "Reentrenar con mi historial" (Modelo IA)
   ajusta los pesos base de la regresión hacia tus resultados, partiendo del modelo
   entrenado (13,070 partidos) y empujándolos **suavemente** (regularización L2) para
   no sobre-ajustar con muestras chicas.

---

## 5. Integración con el mercado (lo que da valor real)

1. **De-vig:** convierte la cuota americana a probabilidad y le quita la comisión de
   la casa → "probabilidad justa del mercado".
2. **Blend (shrinkage 70/30):** `prob_final = 70% mercado + 30% modelo`. El mercado
   es más sharp; esto desinfla los edges falsos.
3. **Edge:** `prob_final − prob_justa_del_mercado`. Es el indicador de valor.
4. **Kelly:** tamaño de apuesta sugerido (medio-Kelly), **capado al 5%** del bankroll.
5. **Line shopping:** muestra la mejor cuota disponible entre casas.
6. **Consenso:** promedia varias casas para la probabilidad justa.

> Sin cuotas, el edge se mide contra el breakeven de -110 (orientativo, no valor real).

---

## 6. Pestañas de la app

| Pestaña | Qué muestra |
|---|---|
| **Picks del Día** | Tarjeta por partido: ganador %, mejores picks ordenados por **edge**, con stake. Filtros (Todos / +EV / Alta conf.) y botón Copiar |
| **Parlays** | Combinadas de **3 y 4 patas**, una pata por partido (sin correlación), cuota real, ordenadas por valor |
| **Pitchers K** | Por abridor: ERA/FIP/K9, Ks esperados, línea real de la casa + edge (o proyección si no hay línea; openers marcados) |
| **Bateadores** | Top 2 más probables por categoría: P(Hit), Bases totales, H+R+RBI, BB, HR. Ajustado por pitcher/mano/estadio/clima; ✓ = titular confirmado |
| **Señales** | Historial del **tablero de convicción**: cada juego con su equipo señalado, tier, convicción y DQ, calificado por marcador final (ML y F5). Mide si el tablero acierta —y si acierta más en ELITE que en LEAN— por tier, por Data Quality y contra el modelo |
| **Modelo IA** | Pesos del modelo (ajustables) |
| **Validación** | Calibración (predicho vs real) + CLV — ¿el modelo sirve? |

---

## 7. Validación — ¿el modelo de verdad sirve?

- **Calibración:** agrupa los picks por probabilidad dicha y compara con el % real
  de aciertos. Si dices 60% y ganas 52%, estás **sobreconfiado** (sale en rojo).
  Métricas: **Brier score** (más bajo = mejor) y **error de calibración**.
- **CLV (Closing Line Value):** ¿apostaste a mejor número que el de cierre? Es el
  **mejor termómetro** de un modelo (te dice en ~1 semana lo que el ROI tarda meses
  en revelar). **CLV positivo sostenido = el modelo aporta valor real.**

---

## 8. Seguridad y persistencia

- **Supabase RLS:** lectura pública, escritura solo el **dueño autenticado**
  (login email+password). Nadie puede borrar/alterar tu historial.
- **Cache del análisis:** local (este equipo) + nube (cualquier equipo).
- La "anon key" es pública por diseño; la seguridad la dan las políticas RLS
  (ver `supabase-setup.sql`).

---

## 9. Limitaciones honestas (qué NO es)

- **No garantiza ganar.** Es una herramienta de *valor esperado*; a corto plazo
  ganar/perder es azar.
- **El modelo aún no está probado.** La validación se llena con el uso; hasta tener
  ~100+ picks calificados, no sabes si está bien calibrado.
- **Edge sin cuotas = orientativo** (solo aplica cuando no hay cuotas/key; con cuotas
  el edge es real contra el mercado).
- **Props limitados por el feed:** las casas postean Ks/props por tandas (horas antes);
  algunos no aparecen al analizar temprano. (Limitación de la fuente, no de la app.)
- **Aproximaciones menores:** la orientación de los estadios (para el viento) es
  aproximada; los techos retráctiles se tratan como domo (sin clima).
- **Aprendizaje limitado por tus datos:** el modelo se **recalibra** (Platt) y se
  **reentrena** (regresión regularizada hacia el prior) con tu historial, pero ambos
  necesitan acumular ~50-100+ juegos calificados para moverse de forma fiable. Con
  pocos datos se quedan cerca del modelo base (a propósito, para no sobre-ajustar).

---

## 10. GUÍA DE USO (paso a paso)

### Preparación (una sola vez)
1. **Supabase:** corre el SQL de `supabase-setup.sql` (crea tablas + seguridad).
2. **Crea tu usuario:** Supabase → Authentication → Users → Add user (email+password).
3. **The Odds API (opcional):** saca una key gratis en the-odds-api.com (500 req/mes)
   y pégala en el campo "The Odds API key" del toolbar.

### Día a día
1. **Inicia sesión** (botón Entrar) con tu usuario de Supabase.
2. **Elige la fecha** y presiona **Analizar partidos**.
   - 💡 Hazlo **cerca del horario de los juegos** para aprovechar alineaciones
     confirmadas y props ya posteadas.
3. Revisa **Picks del Día**: ordenados por edge. Filtra **+EV** para ver solo valor.
4. **Apuesta con criterio:** el % de "apostar X%" es tu stake sugerido (cap 5%). No
   te fíes de edges enormes — el blend ya los modera, pero el modelo no es infalible.
5. (Opcional) **Props Ks / bateadores:** marca los checkboxes para traer líneas reales
   (gastan más cuota de The Odds API).

### Después de los juegos
6. **Señales → ⚡ Auto-calificar:** califica las señales del tablero (ML y F5 del equipo
   señalado) desde el marcador final de MLB. El mismo botón califica las predicciones
   que alimentan Validación.
7. **Validación → 📸 Capturar cierre:** córrelo cerca del inicio de los juegos para
   medir CLV.

### Cada cierto tiempo
8. **Revisa Validación:** si *Predicho ≈ Real* y el *CLV es positivo*, vas bien. Si
   la calibración sale roja o el CLV es negativo, **no le creas a los edges**.

---

## 11. Glosario rápido

| Término | Significado |
|---|---|
| **Edge** | Ventaja: prob. del modelo − prob. justa del mercado. >0 = valor |
| **Stake** | Cuánto apostar (% del bankroll, medio-Kelly, cap 5%) |
| **De-vig** | Quitar la comisión de la casa para sacar la probabilidad real |
| **Blend** | Mezcla 70% mercado + 30% modelo |
| **ML / RL / F5** | Money Line / Run Line -1.5 / Primeras 5 innings |
| **CLV** | Closing Line Value: ¿le ganaste al número de cierre? |
| **Brier** | Qué tan buenas son tus probabilidades (más bajo = mejor) |
| **Platoon** | Ventaja/desventaja del bateador según la mano del pitcher |
| **PF** | Park Factor: cuánto el estadio favorece anotar |
| **wOBA** | Ofensiva ponderada por valor real de carreras |

---

*Generado para el proyecto MLB Picks Pro.*
