# Cómo añadir un deporte

Cada deporte es **un archivo** en esta carpeta. No se conocen entre ellos, no
comparten variables y no pueden pisarse. Si dos lo intentan, la página avisa a
gritos al cargar en vez de portarse raro tres semanas después.

## Los archivos

| Archivo | Qué lleva |
|---|---|
| `../index.html` | El armazón: cabecera, login, y un hueco vacío. **No menciona ningún deporte.** |
| `../core.js` | Lo compartido: sesión, keys, matemática de cuotas, distribuciones, y el registro. |
| `mlb.js` | Todo el béisbol. |
| `mlb.css` | Los estilos del béisbol. |

## Añadir uno

**1.** Crea `deportes/futbol.js` con esta forma:

```js
(function () {
'use strict';

// Todo lo tuyo va aquí dentro. Nada de esto se ve desde fuera.
const MI_HTML = String.raw`
  <div class="toolbar">
    <button class="btn" onclick="analizarFutbol()">Analizar</button>
  </div>
  <div id="fut-area"></div>
`;

async function analizarFutbol(){ /* ... */ }

Deportes.registrar({
  id: 'futbol',                       // corto y único
  nombre: 'Fútbol',
  icono: '⚽',
  titulo: 'Fútbol Picks Pro',         // cabecera cuando está activo
  sub: 'API-Football · Supabase',
  css: 'deportes/futbol.css',         // opcional
  html: MI_HTML,
  manejadores: { analizarFutbol },    // lo ÚNICO que sale al exterior
  activar() { /* al entrar a su pestaña */ },
});

})();
```

**2.** Una línea en `index.html`, junto a las otras:

```html
<script src="deportes/futbol.js"></script>
```

Ya está. El selector de deportes aparece solo en cuanto hay más de uno.

## Quitar uno

Borra el archivo y borra esa línea. Nada más — no hay que buscar dónde empieza
y dónde acaba dentro de un archivo de miles de líneas, que es exactamente lo que
costó caro con la primera versión del fútbol.

## Las tres reglas

**1 · Lo tuyo se queda dentro de tu archivo.** El `(function(){ … })()` que lo
envuelve hace que tus funciones y variables no existan fuera. Lo único que sale
es lo que pongas en `manejadores`.

**2 · Los ids del DOM son tuyos y de nadie más.** El registro los apunta. Si otro
deporte usa uno que ya está cogido, revienta al cargar con el nombre del dueño.
Por costumbre, ponles tu prefijo: `fut-area`, `nba-tabla`.

**3 · Los manejadores también.** Si dos deportes declaran `analizar()`, el
segundo no lo pisa: falla y te dice de quién era. Ponles nombre propio.

## Qué te da el núcleo

Sesión y permisos (`sb`, `session`, `isOwner`), las dos keys (`getOddsKey`,
`getAfKey`), cuotas (`amProb`, `amDec`, `bestAm`, `consensus`, `kelly`,
`stakePct`), distribuciones (`poissonOver`, `nbOver`, `binomOver`, `normOver`),
y utilidades (`$`, `avg`, `median`, `cl`, `sf`, `pct`, `horaET`, `mapLimit`).

**Lo que el núcleo NO tiene, a propósito:** ninguna constante medida para un
deporte. Si un número salió de medir béisbol, vive en `mlb.js`. Esa es la regla
que evita que se vuelvan a mezclar.

## Comprobarlo

En la consola del navegador:

```js
Deportes.diagnostico()
```

Dice qué deportes hay, cuál está activo, cuántos manejadores publica cada uno y
cuántos ids del DOM tiene cada quien.
