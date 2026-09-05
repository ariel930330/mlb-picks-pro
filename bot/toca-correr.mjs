// ============================================================================
//  ¿Toca correr un análisis ahora?
// ----------------------------------------------------------------------------
//  El cron dispara cada 30 minutos durante la ventana de béisbol, pero un
//  análisis completo cuesta ~183 créditos de The Odds API con 15 juegos y la cuota es de 20,000
//  al mes. Correr en cada disparo serían ~1,400/día: no cabe.
//
//  Este portero usa SOLO la API de MLB, que es gratis, para decidir. Si no toca,
//  el workflow termina sin abrir el navegador y sin gastar un crédito.
//
//  REGLA — POR OLEADAS, NO POR PARTIDO:
//  El análisis es de TODA la jornada, no de un partido, así que correrlo una vez
//  por juego repetiría el mismo trabajo 15 veces. Los partidos salen en racimos
//  (varios entre 6:40 y 7:45 pm ET), así que se agrupan: los que empiezan dentro
//  de una misma ventana comparten una corrida, disparada 60 minutos antes del
//  PRIMERO del grupo.
//
//  Salida: imprime "SI <motivo>" o "NO <motivo>" y escribe correr=true|false en
//  $GITHUB_OUTPUT.
// ============================================================================
// Extensión .mjs a propósito: fuerza modo módulo. El paso que instala Playwright
// crea un package.json sin "type":"module", y este script corre ANTES de eso — con
// extensión .js reventaría con "Cannot use import statement outside a module".
import { appendFileSync } from 'node:fs';

// SE MIRA HACIA ADELANTE, NO UNA VENTANA ESTRECHA.
// Antes se disparaba solo si faltaban entre 60 y 25 minutos. Eso obliga a que el cron
// caiga justo dentro de esa franja, y el cron de GitHub NO es puntual: se retrasa y a
// veces se pierde. Con la ventana estrecha, un disparo con 20 minutos de retraso ya
// no servia y la oleada se quedaba sin analizar en silencio.
//
// Ahora la pregunta es otra: hay una oleada en la proxima hora y cuarto que TODAVIA
// no se haya analizado? Si la hay, se corre — aunque el disparo venga tarde. Y si ya
// se cubrio, no se gasta. Un retraso hace que el analisis salga mas cerca del juego,
// que es peor que a los 60 minutos, pero infinitamente mejor que no salir.
const MIN_ANTES   = 75;   // se analiza si el primer juego del grupo entra en este plazo
// Cuanto mas chico, mas cerca de cada juego se analiza — y mas se gasta.
//
// EL PRESUPUESTO MANDA, y la cuenta que habia aqui estaba MAL. Se decia "~94
// creditos por analisis"; el numero real, contado sobre los mercados que el codigo
// pide hoy, es 12 por juego (3 de F5 + 3 de props de abridor + 6 de props de
// bateador) mas 3 de la llamada general. Con los 15 juegos de una jornada normal
// son 183, no 94.
//
//   RACIMO_MIN  oleadas/dia   al mes
//        120         3         16,470   cabe en la cuota de 20,000
//         75         4         21,960   NO cabe
//         45         5         27,450   NO cabe (un 37% de mas)
//
// Por eso se queda en 120. El coste es real: un juego que arranca 2 horas despues
// del primero de su grupo se analiza con ~3 horas de antelacion en vez de 1, asi
// que le tocan alineaciones mas verdes.
//
// PARA BAJARLO A 45 sin pasarse habria que apagar los props de bateador, que son
// 6 de los 12 creditos por juego: 5 oleadas saldrian a 93 por analisis, 13,950 al
// mes. Es la unica combinacion que da ambas cosas.
const RACIMO_MIN  = 120;  // juegos que arrancan dentro de estos minutos = una sola oleada
// Una oleada se da por CUBIERTA si ya hubo un analisis despues de que ella entrara en
// el plazo. Asi no se paga dos veces por la misma, aunque el cron dispare varias veces
// dentro de su hora y cuarto.
const MIN_ENTRE   = 25;   // suelo absoluto entre dos analisis, pase lo que pase
// Cuanto puede quedarse el job esperando a una oleada futura. El tope duro de un job
// en GitHub son 6 horas; se deja margen para la instalacion de Chromium y el analisis.
const MAX_ESPERA  = 270;  // minutos
const SB_URL  = 'https://xirpwbmekufozsddnaok.supabase.co';
const SB_KEY  = 'sb_publishable_G3k6Se24l9d0kGfbuRZATQ_qYoV7RFK';   // key publica, ya va en el index.html

// dormir = segundos a esperar ANTES de analizar. Existe porque el cron de GitHub es
// poco de fiar: descarta la mayoria de los disparos y retrasa el resto. En vez de
// necesitar que caiga uno justo en el momento bueno, el que SI cae se queda esperando
// hasta la oleada. Un solo disparo al dia puede cubrir varias oleadas.
const salida = (correr, motivo, dormir = 0) => {
  console.log(`${correr ? 'SI' : 'NO'}  ${motivo}${dormir ? `  (esperando ${Math.round(dormir/60)} min)` : ''}`);
  console.log(`RESULTADO correr=${correr} dormir=${Math.round(dormir)}`);   // lo lee el bucle del workflow
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `correr=${correr}\ndormir=${Math.round(dormir)}\nmotivo=${motivo}\n`);
  }
  process.exit(0);
};

// Fecha de hoy EN HORA DEL ESTE. La jornada de MLB se cuenta así: un juego de las
// 9pm ET ya es del día siguiente en UTC, y pedir esa fecha traería otra jornada.
const hoyET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

let juegos = [];
try {
  // hydrate=team hace falta: sin él la respuesta trae solo id/link/name y las
  // abreviaturas salen vacías (comprobado — el log quedaría lleno de "@").
  const r = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${hoyET}&hydrate=team`);
  if (!r.ok) throw new Error(`MLB API ${r.status}`);
  const d = await r.json();
  juegos = (d.dates?.[0]?.games || [])
    .filter(g => g.gameType === 'R')
    .filter(g => !['Final', 'Game Over'].includes(g.status?.detailedState))
    .map(g => ({
      pk: g.gamePk,
      t: new Date(g.gameDate).getTime(),
      mu: `${g.teams?.away?.team?.abbreviation}@${g.teams?.home?.team?.abbreviation}`,
    }))
    .filter(g => isFinite(g.t))
    .sort((a, b) => a.t - b.t);
} catch (e) {
  // Si MLB no responde no se inventa nada: no correr es la opción barata y segura.
  salida(false, `no se pudo leer el calendario (${e.message})`);
}

if (!juegos.length) salida(false, `sin juegos pendientes el ${hoyET}`);

// Agrupar en oleadas: se abre grupo nuevo cuando hay un hueco de RACIMO_MIN
const oleadas = [];
for (const g of juegos) {
  const ult = oleadas[oleadas.length - 1];
  if (ult && (g.t - ult[0].t) <= RACIMO_MIN * 60000) ult.push(g);
  else oleadas.push([g]);
}

const ahora = Date.now();
const fmt = ms => new Date(ms).toLocaleTimeString('en-US',
  { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });

console.log(`Jornada ${hoyET} · ${juegos.length} juegos pendientes en ${oleadas.length} oleada(s):`);
for (const o of oleadas) {
  const faltan = Math.round((o[0].t - ahora) / 60000);
  console.log(`  ${fmt(o[0].t)} ET · ${o.length} juego(s) · ${o.map(x => x.mu).join(' ')} · faltan ${faltan} min`);
}

// Hora del ULTIMO analisis de esta jornada.
// Se lee de analysis_cache.updated_at, no de signals.created_at: saveSignals ACTUALIZA
// las filas existentes en vez de insertar, asi que su created_at se queda clavado en
// la primera corrida del dia y nunca sirve para saber cuando se analizo por ultima vez.
// analysis_cache se reescribe en cada analisis, que es justo lo que hace falta.
let ultimo = null;
try {
  const r = await fetch(
    `${SB_URL}/rest/v1/analysis_cache?select=updated_at&game_date=eq.${hoyET}&limit=1`,
    { headers: { apikey: SB_KEY } });
  if (r.ok) { const [x] = await r.json(); if (x?.updated_at) ultimo = new Date(x.updated_at).getTime(); }
} catch { /* si Supabase no responde se corre igual: mejor gastar de mas que saltarse una oleada */ }
const minDesde = ultimo ? (Date.now() - ultimo) / 60000 : Infinity;
console.log(`Ultimo analisis de la jornada: ${ultimo ? Math.round(minDesde) + ' min' : 'ninguno'}`);

// Cubierta = hubo un analisis DESPUES de que esa oleada entrara en su plazo. Con esto
// da igual que el cron dispare tres veces dentro de la misma hora y cuarto: solo se
// paga la primera. Y despues de analizar una oleada, ella queda cubierta y el bucle
// del workflow pasa sola a la siguiente.
// o[0].t ya es un número de milisegundos (sale de new Date(...).getTime() al leer el
// calendario). Aquí llamaba a .getTime() otra vez y reventaba — y solo reventaba
// DESPUÉS del primer análisis del día, porque antes `ultimo` es null y el && corta
// antes de llegar. Resultado: la primera corrida del día pasaba y TODAS las demás
// fallaban, así que las oleadas de la tarde y la noche no se analizaban nunca.
const cubierta = o => ultimo != null && ultimo >= (o[0].t - MIN_ANTES * 60000);

// Se recorren TODAS las oleadas de una vez y se decide con la primera que sirva. Es
// importante NO salir en la primera cubierta: si la de las 6:40 ya se analizo, hay que
// seguir mirando la de las 9:38, que es justo lo que mantiene vivo el bucle del
// workflow despues de cada analisis.
let esperaMin = null, oEspera = null;
for (const o of oleadas) {
  const faltan = (o[0].t - ahora) / 60000;
  if (faltan <= 0) continue;                    // ya empezo
  if (cubierta(o)) { console.log(`  (la oleada de ${fmt(o[0].t)} ET ya se analizo)`); continue; }

  if (faltan <= MIN_ANTES) {
    // Lista para analizar YA. El unico freno es el suelo duro entre analisis.
    if (minDesde < MIN_ENTRE) {
      salida(false, `la oleada de ${fmt(o[0].t)} ET toca, pero se analizo hace ${Math.round(minDesde)} min (suelo ${MIN_ENTRE})`);
    }
    salida(true, `oleada de ${fmt(o[0].t)} ET a ${Math.round(faltan)} min · ${o.map(x => x.mu).join(' ')}`);
  }

  // Todavia no entra en plazo. Se apunta la primera y se deja de buscar: si vale la
  // pena esperarla, el job se queda despierto hasta ella.
  esperaMin = faltan - MIN_ANTES;
  oEspera = o;
  break;
}

// Esperar despierto es lo que salva el dia: como GitHub se come casi todos los
// disparos, el que llega no puede decir "no toca" y morirse.
if (oEspera && esperaMin <= MAX_ESPERA) {
  salida(true, `esperando a la oleada de ${fmt(oEspera[0].t)} ET (${oEspera.length} juego(s)) · ${oEspera.map(x => x.mu).join(' ')}`,
         esperaMin * 60);
}
salida(false, oEspera
  ? `la oleada de ${fmt(oEspera[0].t)} ET esta a ${Math.round(esperaMin)} min de entrar en plazo: demasiado para esperar despierto`
  : 'no queda ninguna oleada por analizar hoy');
