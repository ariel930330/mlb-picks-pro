// ============================================================================
//  ¿Toca correr un análisis ahora?
// ----------------------------------------------------------------------------
//  El cron dispara cada 30 minutos durante la ventana de béisbol, pero un
//  análisis completo cuesta ~94 créditos de The Odds API y la cuota es de 20,000
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
// RACIMO_MIN 120 es TEMPORAL, por presupuesto — no es una decision de modelo.
// El backtest de agosto se comio 10,000 creditos y quedan 6,465 para 23 dias, o sea
// 281 al dia = 3 analisis. Con 45 min salian 3.6 oleadas diarias (338 creditos) y NO
// alcanzaba. Con 120 salen 2.0 (188 al dia, 4,324 en total) y sobran ~2,100 de margen
// para corridas manuales y dobles carteleras.
//
// EL COSTE: un juego que empieza 2 horas despues del primero de su grupo se analiza
// con 3 horas de antelacion en vez de 1, asi que le tocan alineaciones mas verdes.
//
// EL 19 DE SEPTIEMBRE se reinicia la cuota a 20,000: ahi hay que volver a poner 45.
const RACIMO_MIN  = 120;  // juegos que arrancan dentro de estos minutos = una sola oleada
// Una oleada se da por CUBIERTA si ya hubo un analisis despues de que ella entrara en
// el plazo. Asi no se paga dos veces por la misma, aunque el cron dispare varias veces
// dentro de su hora y cuarto.
const MIN_ENTRE   = 25;   // suelo absoluto entre dos analisis, pase lo que pase
const SB_URL  = 'https://xirpwbmekufozsddnaok.supabase.co';
const SB_KEY  = 'sb_publishable_G3k6Se24l9d0kGfbuRZATQ_qYoV7RFK';   // key publica, ya va en el index.html

const salida = (correr, motivo) => {
  console.log(`${correr ? 'SI' : 'NO'}  ${motivo}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `correr=${correr}\nmotivo=${motivo}\n`);
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

// ¿Hay una oleada dentro del plazo que TODAVIA no se haya cubierto?
for (const o of oleadas) {
  const faltan = (o[0].t - ahora) / 60000;
  if (faltan > MIN_ANTES || faltan <= 0) continue;

  // Cubierta = hubo un analisis DESPUES de que esta oleada entrara en su plazo. Con
  // esto da igual que el cron dispare tres veces dentro de la misma hora y cuarto:
  // solo se paga la primera.
  const entroEnPlazo = o[0].t.getTime() - MIN_ANTES * 60000;
  if (ultimo && ultimo >= entroEnPlazo) {
    salida(false, `la oleada de ${fmt(o[0].t)} ET ya se analizo (hace ${Math.round(minDesde)} min)`);
  }
  // Suelo duro: pase lo que pase, nunca dos analisis pegados.
  if (minDesde < MIN_ENTRE) {
    salida(false, `se analizo hace ${Math.round(minDesde)} min (suelo ${MIN_ENTRE})`);
  }
  salida(true, `oleada de ${fmt(o[0].t)} ET a ${Math.round(faltan)} min · ${o.map(x => x.mu).join(' ')}`);
}

const prox = oleadas.map(o => (o[0].t - ahora) / 60000).filter(m => m > 0).sort((a, b) => a - b)[0];
salida(false, prox != null
  ? `ninguna oleada en ventana; la próxima empieza en ${Math.round(prox)} min`
  : 'todas las oleadas ya empezaron');
