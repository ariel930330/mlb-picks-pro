# Análisis automático

Corre el análisis solo, una hora antes de cada oleada de partidos, sin que tengas
que abrir nada.

## Por qué así

La app es una página estática en GitHub Pages: toda la lógica vive en el navegador
y no hay servidor que corra solo. Así que el robot abre la página de verdad, en un
Chromium sin ventana, y la usa como la usarías tú.

## Lo que hace, paso a paso

1. Un cron dispara cada 30 minutos entre las 11 am y las 11 pm hora del Este.
2. **El portero** (`toca-correr.mjs`) mira el calendario de MLB —gratis— y decide si
   toca. Casi siempre dice que no y el workflow termina ahí, **sin gastar un solo
   crédito**.
3. Cuando falta ~1 hora para el primer juego de una oleada, abre el navegador,
   inicia sesión, corre el análisis y espera a que Supabase confirme el guardado.

## Por oleadas, no por partido

El análisis es de **toda la jornada**, no de un partido. Correrlo una vez por juego
repetiría el mismo trabajo 15 veces y costaría ~42,000 créditos al mes contra una
cuota de 20,000: no cabe.

Los partidos salen en racimos, así que los que empiezan dentro de 45 minutos entre
sí comparten una corrida, disparada 60 minutos antes del primero. Un día normal:

```
dispara     oleada      partidos
12:05 pm    1:05 pm     COL@WSH
 1:15 pm    2:15 pm     BAL@STL
 6:05 pm    7:05 pm     HOU@NYY  KC@TOR  MIL@NYM  LAD@ATL
 8:45 pm    9:45 pm     AZ@SF
```

4 corridas · ~376 créditos · **~11,000 al mes**, dentro de la cuota.

## Puesta en marcha

### 1. Crear una cuenta de Supabase SOLO para el robot

**No uses tu cuenta personal.** Si esas credenciales se filtran, se filtra tu
cuenta. Una cuenta aparte se puede desactivar sin tocar nada tuyo.

En el panel de Supabase: **Authentication → Users → Add user**. Ponle un correo
cualquiera que controles y una contraseña larga.

> Funciona porque la app trata como dueño a cualquier usuario autenticado
> (`isOwner = () => !!session`). El robot no necesita permisos especiales.

### 2. Darle la API key de The Odds

`app_config` es privada por usuario: cada quien solo ve su fila. La cuenta del robot
necesita la suya. En el **SQL Editor**, cambiando el correo por el que creaste:

```sql
insert into public.app_config (user_id, odds_api_key)
select id, (select odds_api_key from public.app_config limit 1)
  from auth.users
 where email = 'CORREO-DEL-ROBOT@ejemplo.com'
on conflict (user_id) do update set odds_api_key = excluded.odds_api_key;
```

Copia la key que ya tienes guardada, así no hay que escribirla en ningún lado.

### 3. Guardar las credenciales en GitHub

**Settings → Secrets and variables → Actions → New repository secret**:

| Nombre | Valor |
|---|---|
| `BOT_EMAIL` | el correo del robot |
| `BOT_PASSWORD` | su contraseña |

Los secretos no se exponen aunque el repositorio sea público: no se pasan a
workflows de forks y GitHub los tapa en los logs.

### 4. Probarlo

**Actions → Análisis automático → Run workflow**, marcando **forzar** para que
corra aunque no toque. Si sale verde, ya está.

## Cuando algo falla

El workflow **falla a propósito** si el análisis no terminó o si Supabase no
confirmó el guardado, así que GitHub te avisa por correo. Guardar a medias sin que
nadie se entere es peor que no correr.

Cada corrida deja un resumen en la pestaña Actions con la jornada, el resultado y
si guardó. Si reventó, sube una captura de la pantalla como artefacto.

## Los archivos

| Archivo | Qué hace |
|---|---|
| `toca-correr.mjs` | El portero. Decide si toca, con la API gratis de MLB. |
| `correr-analisis.mjs` | Abre el navegador, inicia sesión y espera a que termine. |
| `../.github/workflows/analisis-auto.yml` | El cron y el orden de los pasos. |

El runner espera a `window.__auto.done`, no al DOM. Es a propósito: el DOM cambia
cada vez que se mueve un botón, y el robot no debe romperse por eso.

## Los números, si quieres cambiarlos

En `toca-correr.mjs`:

| Constante | Valor | Qué es |
|---|---|---|
| `MIN_ANTES` | 75 | Se analiza si el primer juego de la oleada entra en este plazo. **No es una ventana estrecha, es un plazo**: el cron de GitHub se retrasa y a veces se pierde, así que un disparo tardío tiene que seguir sirviendo. Una oleada se da por cubierta si ya hubo un análisis después de que entrara en el plazo, así que no se paga dos veces. |
| `MIN_ENTRE` | 25 | Suelo duro entre dos análisis, pase lo que pase. |
| `RACIMO_MIN` | **120** | Juegos que empiezan dentro de estos minutos = una sola oleada. Subirlo agrupa más y gasta menos; bajarlo analiza más cerca de cada juego y gasta más.<br>**Está en 120 por presupuesto, no por criterio.** El backtest de agosto consumió 10,000 créditos; con 45 salían 3.6 oleadas/día (338 créditos) y no alcanzaba hasta el reinicio. **El 19 de septiembre, cuando la cuota vuelva a 20,000, hay que devolverlo a 45.** |

## Avisos por Telegram

Cuando el robot termina un análisis te manda un mensaje con el Prop del Día, los
picks que salieron y sus números. Llega **aunque nunca abras la app**, y sirve de
vigilante: si en todo el día no llega nada, el robot no corrió.

> Las notificaciones push del navegador necesitan un servidor que las envíe, y aquí
> no hay ninguno — la app es una página estática. Pero el robot sí corre en algún
> sitio y sabe cuándo acabó, así que el aviso sale de él.

### Puesta en marcha (unos 5 minutos)

**1 · Crear el bot.** En Telegram busca **@BotFather**, mándale `/newbot` y sigue los
dos pasos (nombre y usuario, que debe acabar en `bot`). Te devuelve un **token**, algo
como `8123456789:AAF...`. Guárdalo.

**2 · Hablarle a tu bot.** Búscalo por el usuario que le pusiste y mándale cualquier
cosa, por ejemplo `hola`. Esto es obligatorio: Telegram no deja que un bot escriba
primero a nadie.

**3 · Sacar tu chat id.** Abre en el navegador, cambiando `TU_TOKEN`:

```
https://api.telegram.org/botTU_TOKEN/getUpdates
```

Busca `"chat":{"id":123456789` — ese número es tu **chat id**.

**4 · Guardarlos en GitHub.** *Settings → Secrets and variables → Actions*:

| Nombre | Valor |
|---|---|
| `TG_TOKEN` | el token de @BotFather |
| `TG_CHAT` | tu chat id |

**5 · Probar.** *Actions → Análisis automático → Run workflow*, marcando **forzar**.

Si faltan los secretos no pasa nada: el paso avisa por el log y sigue. Y si el envío
falla, **no tumba el workflow** — el análisis ya está guardado, que es lo que importa.

### Qué llega

```
MLB Picks · 2026-08-29 · 6:00 PM ET

⭐ PROP DEL DÍA
Bobby Witt Jr. (KC) vs Cleveland
OVER 1.5TB  +115
Bases totales · proyección 1.94TB

Edge +6.4% · Confianza 78% · Stake 2.1%
3 casa(s) en esta línea

8 pick(s) con valor · 11 partidos
```

Si una corrida no deja picks, también avisa y dice por qué. Así sabes que el robot
está vivo aunque no haya nada que apostar.

---

## Calificación automática (después de medianoche ET)

Aparte del análisis, hay un segundo robot que **califica solo** el día que cerró y
manda por Telegram el récord de resultados.

- Workflow: `.github/workflows/calificar-auto.yml`
- Runner en modo calificar: `MODO=grade node bot/correr-analisis.mjs` (abre la app
  con `?auto=grade`). Califica señales y props contra el marcador final de la MLB.
  **No gasta créditos de The Odds API** (la MLB API es gratis).
- Disparo: Supabase pg_cron a las **2 AM ET** (06:00 UTC en temporada). Corre
  `cron-calificar.sql` UNA vez en el SQL Editor (reusa el token de `cron-supabase.sql`).
- Secretos: los MISMOS que el análisis (BOT_EMAIL, BOT_PASSWORD, TG_TOKEN, TG_CHAT).

El aviso de resultados se ve así:

```
Resultados MLB · 2026-09-02 · 2:10 AM ET

🟢 Señales 4-2 (67%)
🟢 Props 3-1 (75%)

⭐ Prop del Día ✅
Logan Gilbert · OVER 5.5K -130 · real 7
Ponches

Calificadas: 6 señales · 4 props
```
