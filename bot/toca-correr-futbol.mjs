// ============================================================================
//  ¿Toca correr un análisis de SOCCER ahora?
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE. Una señal solo puede ser OFICIAL con el XI confirmado
//  (Signal Engine §8: "Official release may open only after lineup swing passes").
//  API-Football publica las alineaciones unos 40 minutos antes del inicio, así que
//  una corrida a media mañana solo puede producir watchlist. Para que el motor dé
//  señales de verdad hay que correrlo DENTRO de esa ventana, partido por partido.
//
//  Y hay una segunda razón: el cierre. El valor de línea (CLV) necesita la última
//  cotización antes del pitido inicial, y el motor la captura cuando quedan ≤15
//  minutos. Sin una corrida ahí, el historial se queda sin CLV para siempre.
//
//  QUÉ HACE. Con UNA sola llamada a /fixtures?date= (1,170 partidos del día en una
//  página) saca el calendario, se queda con las 20 competiciones del dueño y calcula
//  dos momentos por racimo de partidos:
//
//     T-35 min → ventana de alineaciones: es cuando salen las señales oficiales
//     T-10 min → cierre: captura la última cotización para el CLV
//
//  Si el momento ya llegó y no hay una corrida posterior, dice que SÍ. Si está en el
//  futuro cercano, dice cuántos segundos dormir para despertarse justo ahí. El
//  workflow duerme y vuelve a preguntar, así que un solo disparo cubre toda la tarde.
//
//  Salida: "SI <motivo>" o "NO <motivo>", más correr/dormir/ventana en $GITHUB_OUTPUT.
// ============================================================================
import { appendFileSync } from 'node:fs';

// Las 20 competiciones del dueño (mismos ids que deportes/futbol.js).
const LIGAS = new Set([39, 140, 78, 135, 61, 40, 179, 94, 203, 88, 119, 103, 144, 207, 307, 253, 262, 2, 3, 848]);

const T_XI     = 35;   // minutos antes del inicio: las alineaciones ya deberían estar
const T_CIERRE = 10;   // minutos antes: última cotización, para el CLV
const RACIMO   = 15;   // partidos que arrancan dentro de estos minutos comparten corrida
const GRACIA   = 12;   // se corre aunque el momento se haya pasado hace poco
const MIN_ENTRE = 6;   // suelo entre dos corridas seguidas
const MAX_ESPERA = 260; // minutos que el job puede quedarse dormido
const VENTANA_XI     = 120;  // el motor solo mira partidos a ≤2 h del inicio
const VENTANA_CIERRE = 25;   // en el cierre basta con los que ya están encima

const SB_URL = 'https://xirpwbmekufozsddnaok.supabase.co';
const SB_KEY = 'sb_publishable_G3k6Se24l9d0kGfbuRZATQ_qYoV7RFK';   // pública por diseño, ya va en el index.html

const salida = (correr, motivo, dormir = 0, ventana = VENTANA_XI) => {
  console.log(`${correr ? 'SI' : 'NO'}  ${motivo}${dormir ? `  (esperando ${Math.round(dormir / 60)} min)` : ''}`);
  console.log(`RESULTADO correr=${correr} dormir=${Math.round(dormir)} ventana=${ventana}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT,
      `correr=${correr}\ndormir=${Math.round(dormir)}\nventana=${ventana}\nmotivo=${motivo}\n`);
  }
  process.exit(0);
};

// La jornada se cuenta en HORA DEL ESTE, igual que en la app (supuesto S4): así el
// portero y el motor hablan siempre de la misma fecha.
const hoyET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const hhmm = ms => new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });

const AF_KEY = (process.env.AF_KEY || '').trim();
if (!AF_KEY) {
  // Sin key no se puede saber a qué hora juegan, y correr a ciegas gastaría llamadas
  // en momentos inútiles. Se dice claro qué falta en vez de fallar en silencio.
  salida(false, 'falta el secreto AF_KEY (la key de API-Football). Añádelo en Settings > Secrets and variables > Actions.');
}

// ── Calendario del día: UNA llamada ─────────────────────────────────────────
let partidos = [];
try {
  const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${hoyET}`, { headers: { 'x-apisports-key': AF_KEY } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const errs = j.errors, nErr = Array.isArray(errs) ? errs.length : (errs ? Object.keys(errs).length : 0);
  if (nErr) throw new Error(JSON.stringify(errs));
  partidos = (j.response || [])
    .filter(f => LIGAS.has(f.league.id))
    .filter(f => ['NS', 'TBD'].includes(f.fixture.status.short))
    .map(f => ({ t: new Date(f.fixture.date).getTime(), liga: f.league.name,
                 mu: `${f.teams.home.name} v ${f.teams.away.name}` }))
    .filter(g => isFinite(g.t))
    .sort((a, b) => a.t - b.t);
  console.log(`Restantes hoy: ${r.headers.get('x-ratelimit-requests-remaining') ?? '?'} llamadas de API-Football`);
} catch (e) {
  // Si el proveedor no responde no se inventa nada: no correr es lo barato y seguro.
  salida(false, `no se pudo leer el calendario (${e.message})`);
}

if (!partidos.length) salida(false, `sin partidos por jugar el ${hoyET} en las 20 competiciones`);

// ── Racimos: los que arrancan juntos comparten corrida ──────────────────────
const racimos = [];
for (const g of partidos) {
  const ult = racimos[racimos.length - 1];
  if (ult && (g.t - ult[0].t) <= RACIMO * 60000) ult.push(g);
  else racimos.push([g]);
}
const ahora = Date.now();
console.log(`Jornada ${hoyET} · ${partidos.length} partidos por jugar en ${racimos.length} racimo(s):`);
for (const r of racimos) {
  console.log(`  ${hhmm(r[0].t)} ET · ${r.length} partido(s) · ${r.slice(0, 3).map(x => x.mu).join(' | ')}${r.length > 3 ? ` +${r.length - 3}` : ''}`);
}

// ── Corridas ya hechas hoy ─────────────────────────────────────────────────
let corridas = [];
try {
  const r = await fetch(`${SB_URL}/rest/v1/futbol_snapshots?select=analysis_time&slate_date=eq.${hoyET}&order=analysis_time.desc&limit=200`,
    { headers: { apikey: SB_KEY } });
  if (r.ok) corridas = (await r.json()).map(x => new Date(x.analysis_time).getTime()).filter(isFinite);
} catch { /* si Supabase no responde se corre igual: mejor de más que perder una ventana */ }
const ultima = corridas.length ? Math.max(...corridas) : null;
const minDesde = ultima ? (ahora - ultima) / 60000 : Infinity;
console.log(`Corridas de hoy: ${corridas.length}${ultima ? ` · la última hace ${Math.round(minDesde)} min` : ''}`);

// ── Momentos que hay que cubrir ────────────────────────────────────────────
// Dos por racimo: la ventana de alineaciones y el cierre. Un momento está cubierto
// si YA hubo una corrida después de él.
const momentos = [];
for (const r of racimos) {
  momentos.push({ t: r[0].t - T_XI * 60000,     tipo: 'alineaciones', ventana: VENTANA_XI,     racimo: r });
  momentos.push({ t: r[0].t - T_CIERRE * 60000, tipo: 'cierre',       ventana: VENTANA_CIERRE, racimo: r });
}
momentos.sort((a, b) => a.t - b.t);
const cubierto = m => corridas.some(c => c >= m.t);

for (const m of momentos) {
  if (cubierto(m)) continue;
  const faltan = (m.t - ahora) / 60000;
  const etiqueta = `${m.tipo} del racimo de ${hhmm(m.racimo[0].t)} ET (${m.racimo.length} partido(s))`;

  if (faltan <= 0) {
    // El momento ya pasó. Se corre solo si fue hace poco: un cierre de hace dos horas
    // ya no sirve para nada, y la ventana de alineaciones tampoco.
    if (-faltan > GRACIA) { console.log(`  (${etiqueta} se pasó hace ${Math.round(-faltan)} min: ya no sirve)`); continue; }
    if (minDesde < MIN_ENTRE) salida(false, `${etiqueta} toca, pero se corrió hace ${Math.round(minDesde)} min (suelo ${MIN_ENTRE})`);
    salida(true, `${etiqueta} · empezaba hace ${Math.round(-faltan)} min`, 0, m.ventana);
  }
  if (faltan <= 1) {
    if (minDesde < MIN_ENTRE) salida(false, `${etiqueta} toca, pero se corrió hace ${Math.round(minDesde)} min (suelo ${MIN_ENTRE})`);
    salida(true, etiqueta, 0, m.ventana);
  }
  // Todavía no toca: si cabe en el job, el disparo que llegó se queda esperándolo.
  if (faltan <= MAX_ESPERA) salida(true, `esperando a la ${etiqueta}`, faltan * 60, m.ventana);
  salida(false, `la ${etiqueta} está a ${Math.round(faltan)} min: demasiado para esperar despierto`);
}
salida(false, 'no queda ninguna ventana por cubrir hoy');
