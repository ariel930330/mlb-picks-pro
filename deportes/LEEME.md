# Cómo añadir un deporte

Cada deporte es **un archivo** en esta carpeta. No se conocen entre ellos, no
comparten nada y no pueden pisarse. Si dos lo intentan, la página avisa a gritos
al cargar en vez de portarse raro tres semanas después.

## Los archivos

| Archivo | Qué lleva |
|---|---|
| `../index.html` | El armazón: cabecera, login, y un hueco. **No menciona ningún deporte.** |
| `../core.js` | Lo compartido: sesión, keys, cuotas, distribuciones, y el registro. |
| `mlb.js` / `mlb.css` | Todo el béisbol. |

## Añadir uno

**1.** Crea `deportes/futbol.js`:

```js
(function () {
'use strict';

// Cliente de Supabase acotado a TUS tablas. Si pides otra, falla al instante.
const db = Deportes.clienteDe('futbol');

// Tu bot. No es global: el núcleo lo expone como window.__auto solo si se pide
// tu deporte con ?deporte=futbol. El béisbol tiene el suyo, aparte.
const AUTO = { listo:false, done:false, ok:false, msg:'', guardado:false };

// Tu interfaz. Los botones NO usan onclick: usan data-ac.
const MI_HTML = String.raw`
  <div class="toolbar">
    <button class="btn" data-ac="analizar()">Analizar</button>
    <input type="checkbox" data-ch="ponerAlgo(this.checked)">
  </div>
  <div id="fut-area"></div>
`;

async function analizar(){ /* ... */ }
function ponerAlgo(on){ /* ... */ }

Deportes.registrar({
  id: 'futbol',
  nombre: 'Fútbol',
  icono: '⚽',
  titulo: 'Fútbol Picks Pro',
  sub: 'API-Football · Supabase',
  css: 'deportes/futbol.css',
  html: MI_HTML,
  tablas: ['futbol_picks', 'futbol_snapshots'],   // solo tú las tocas
  auto: AUTO,                                     // tu bot, no el de otro
  manejadores: { analizar, ponerAlgo },           // privados: nadie más los ve
});

})();
```

**2.** Crea `deportes/futbol.css` con **todas** las reglas colgando de tu
contenedor:

```css
#dep-futbol .card { ... }
#dep-futbol .toolbar { ... }
```

Así puedes tener tu propio `.card` sin pisar el del béisbol.

**3.** Una línea en `index.html`:

```html
<script src="deportes/futbol.js"></script>
```

El selector de deportes aparece solo en cuanto hay más de uno.

## Quitar uno

Borra los dos archivos y borra esa línea. Nada más.

## Las cinco reglas

**1 · Tu código no sale de tu archivo.** El `(function(){ … })()` que lo envuelve
hace que tus funciones y variables no existan fuera. Ni las tuyas se ven desde
otro deporte, ni las de otro se ven desde el tuyo.

**2 · Tus botones van por `data-ac`, no por `onclick`.** Un `onclick="x()"`
obliga a que `x` esté en `window`, donde cualquiera la alcanza. Con `data-ac` el
núcleo la busca en tu mapa privado. Fuera de tu archivo **no hay nombre por el
que invocarla**.

| Atributo | Evento | Ejemplo |
|---|---|---|
| `data-ac` | click | `data-ac="analizar()"` |
| `data-ch` | change | `data-ch="ponerAlgo(this.checked)"` |
| `data-in` | input | `data-in="mover('k', this.value)"` |

Argumentos que entiende: textos entre comillas, números, `true`/`false`/`null`,
`this`, `this.value` y `this.checked`. Varias llamadas seguidas se separan con
`;`.

**3 · Tu CSS cuelga de `#dep-<tu-id>`.** Sin eso, tu `.card` y el `.card` del
béisbol se pelean en silencio — y el CSS no pasa por el registro, así que nadie
te va a avisar.

**4 · Tus tablas de Supabase son tuyas.** Decláralas en `tablas` y usa
`db.from(...)`, no `sb.from(...)`. Pedir una tabla de otro deporte, o una que no
declaraste, falla al instante con el nombre del dueño.

**5 · Tu bot es tuyo.** El robot abre la página con `?deporte=futbol` y el núcleo
expone **solo** tu `AUTO` como `window.__auto`. El algoritmo del fútbol no tiene
nada que ver con el del béisbol, así que tampoco comparten el disparador.

## Qué te da el núcleo

Sesión (`session`, `isOwner`), las dos keys (`getOddsKey`, `getAfKey`), cuotas
(`amProb`, `amDec`, `bestAm`, `consensus`, `kelly`, `stakePct`), distribuciones
(`poissonOver`, `nbOver`, `binomOver`, `normOver`) y utilidades (`$`, `avg`,
`median`, `cl`, `sf`, `pct`, `horaET`, `mapLimit`).

**Lo que NO te da, a propósito:** ninguna constante medida para un deporte. Si un
número salió de medir béisbol, vive en `mlb.js`. Esa es la regla que evita que se
vuelvan a mezclar.

## Comprobarlo

En la consola: `Deportes.diagnostico()`

Dice qué deportes hay, cuántas acciones privadas tiene cada uno, qué tablas, qué
ids del DOM, quién tiene bot y cuál está expuesto ahora mismo.
