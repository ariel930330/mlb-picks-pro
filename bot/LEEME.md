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
| `MIN_ANTES` | 60 | Minutos antes del primer juego de la oleada. |
| `VENTANA` | 20 | Margen de disparo: entra si faltan entre 60 y 40 min. Tiene que ser mayor que el intervalo del cron o se saltarían oleadas. |
| `RACIMO_MIN` | 45 | Juegos que empiezan dentro de estos minutos = una sola oleada. Subirlo agrupa más y gasta menos; bajarlo analiza más cerca de cada juego y gasta más. |
