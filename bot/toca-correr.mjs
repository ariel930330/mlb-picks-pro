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

const MIN_ANTES   = 60;   // objetivo: analizar 60 min antes del primer juego del grupo
const VENTANA     = 20;   // margen: se dispara si faltan entre 60 y 40 min
const RACIMO_MIN  = 45;   // juegos que arrancan dentro de estos minutos = una sola oleada

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

// ¿Alguna oleada cae dentro de la ventana de disparo?
for (const o of oleadas) {
  const faltan = (o[0].t - ahora) / 60000;
  if (faltan <= MIN_ANTES && faltan > MIN_ANTES - VENTANA) {
    salida(true, `oleada de ${fmt(o[0].t)} ET a ${Math.round(faltan)} min · ${o.map(x => x.mu).join(' ')}`);
  }
}

const prox = oleadas.map(o => (o[0].t - ahora) / 60000).filter(m => m > 0).sort((a, b) => a - b)[0];
salida(false, prox != null
  ? `ninguna oleada en ventana; la próxima empieza en ${Math.round(prox)} min`
  : 'todas las oleadas ya empezaron');
