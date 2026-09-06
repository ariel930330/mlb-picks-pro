# El disparador de Vercel

## Por qué

El cron de GitHub Actions **entrega el 8% de lo que se le pide**. Medido sobre
ocho días con la API de GitHub:

| día | disparos | horas UTC |
|---|---|---|
| 4-sep | 5 | 01:03 04:01 **17:33** 19:54 22:18 |
| 3-sep | 5 | 01:11 03:59 **17:47** 20:55 23:12 |
| 2-sep | 5 | 00:34 03:59 **17:50** 20:56 23:14 |
| 1-sep | 5 | 02:05 04:37 **17:46** 20:10 22:38 |

Promedio: **4.4 al día de 52 programados**. Y fíjate en el hueco: de las 04:00 a
las 17:30 UTC no cae ninguno, trece horas y media seguidas.

El portero y el bucle que duerme compensan bastante, pero una jornada completa
—hoy, de las 2:55 PM a las 7:55 PM ET— **no cabe en un solo job**: el tope duro
de GitHub son 6 horas y el workflow se queda en 5 h 30.

## Qué hace, y qué NO hace

`api/disparar.js` **solo toca el timbre**. El análisis sigue corriendo en GitHub
Actions.

**Por qué no lo corre Vercel entero:** el análisis es código de navegador. Una
función de Vercel tendría que empaquetar Chromium (~50 MB) y un análisis
completo tarda minutos, muy por encima del tope de ejecución de una función. En
GitHub Actions hay un navegador de verdad, sin límite de tiempo, y para un
repositorio público los minutos son gratis.

```
Vercel Cron  ──▶  /api/disparar  ──▶  GitHub workflow_dispatch
                                            │
                                            ▼
                                   Chromium + análisis + Telegram
```

## Puesta en marcha (unos 5 minutos)

### 1 · Crear el token de GitHub

**Settings → Developer settings → Personal access tokens → Fine-grained tokens →
Generate new token**

| Campo | Valor |
|---|---|
| Repository access | **Only select repositories** → `mlb-picks-pro` |
| Permissions → Actions | **Read and write** |
| Todo lo demás | déjalo en *No access* |

Un token fino con un solo permiso y un solo repositorio. **No uses uno clásico**:
esos dan acceso a toda tu cuenta, y ya tuvimos uno expuesto en una captura.

### 2 · Inventar la clave del endpoint

Cualquier texto largo y aleatorio. Sirve para que nadie más pueda disparar
análisis a tu costa: cada uno gasta ~183 créditos de The Odds API.

### 3 · Guardarlos en Vercel

**Proyecto → Settings → Environment Variables**, marcando *Production*:

| Nombre | Valor |
|---|---|
| `GH_TOKEN` | el token del paso 1 |
| `CRON_SECRET` | la clave del paso 2 |

> Pégalos **en Vercel**, nunca en un chat ni en el repositorio. El repositorio es
> público.

### 4 · Desplegar y probar

El cron solo corre en **producción**, así que hace falta un despliegue de
producción (un push a `main` basta).

Para probar sin esperar, abre en el navegador:

```
https://mlb-picks-pro.vercel.app/api/disparar?clave=TU_CLAVE&forzar=1
```

- `{"ok":true,...}` → el disparo salió; míralo en la pestaña Actions.
- `{"ok":false,"estado":401}` → el token está mal o le falta el permiso Actions.
- `{"ok":false,"error":"falta GH_TOKEN..."}` → no se guardó la variable, o el
  despliegue es anterior a haberla guardado (hay que volver a desplegar).
- `404` → la clave no coincide.

## El horario

`vercel.json` trae **dos disparos al día**, que es lo que cabe en el plan
gratuito de Vercel:

| UTC | hora del Este | qué cubre |
|---|---|---|
| 17:00 | 1:00 PM | las oleadas de tarde |
| 22:30 | 6:30 PM | las de noche |

Cada disparo despierta un job que se queda dormido hasta su oleada y después
sigue con las siguientes, hasta agotar sus 5 h 30.

**Si tienes plan Pro**, se puede afinar mucho — cambia `vercel.json` por:

```json
{
  "crons": [
    { "path": "/api/disparar", "schedule": "0,30 14-23 * * *" },
    { "path": "/api/disparar", "schedule": "0,30 0-2 * * *" }
  ]
}
```

Eso son 28 disparos al día en vez de 2, y el portero sigue decidiendo cuáles
gastan créditos: casi todos terminan en «no toca» sin abrir el navegador.

## Esto NO sustituye al cron de GitHub

Los dos siguen encendidos, a propósito. Si Vercel falla, GitHub sigue dando sus
4 disparos; si GitHub se salta uno, Vercel lo cubre. El portero impide que se
dupliquen: una oleada ya analizada se marca como cubierta y el segundo disparo
termina sin gastar nada.

## Calificar

El mismo endpoint sirve, con `?modo=calificar`. Ahora mismo lo dispara Supabase
pg_cron a las 2 AM ET, con el respaldo del cron de GitHub a las 06:10 UTC. Si
quieres moverlo a Vercel, añade a `vercel.json`:

```json
{ "path": "/api/disparar?modo=calificar", "schedule": "10 6 * * *" }
```

## Nota sobre `vercel.json`

**No hay `vercel.json` en el repositorio, a propósito.** El endpoint
`/api/disparar` funciona sin él: Vercel detecta la carpeta `/api` sola.

Hubo uno con una clave `"_nota"` explicando por qué no había crons. **Vercel
rechaza cualquier propiedad que no esté en su esquema**, así que ese comentario
tumbó el despliegue en silencio: la web se quedó congelada catorce horas en una
versión vieja mientras los push seguían saliendo verdes en GitHub.

Si algún día añades crons, crea el archivo **solo con las claves del esquema**:

```json
{
  "crons": [
    { "path": "/api/disparar", "schedule": "0 17 * * *" }
  ]
}
```

Sin comentarios. JSON no los admite y Vercel tampoco perdona claves de más.
