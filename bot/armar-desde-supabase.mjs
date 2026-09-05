// ============================================================================
//  Arma bot/resultado.json a partir del análisis YA GUARDADO en Supabase
// ----------------------------------------------------------------------------
//  Sirve para probar el aviso de Telegram con picks REALES sin abrir el
//  navegador y sin gastar un solo crédito de The Odds API.
//
//  No inventa nada: lee el snapshot del análisis del día y lo deja en el mismo
//  formato que escribe correr-analisis.mjs. Después, `node bot/avisar.mjs`
//  manda exactamente el mismo mensaje que mandaría en una corrida de verdad —
//  con el mismo código, no con una imitación.
//
//  Uso:  node bot/armar-desde-supabase.mjs [YYYY-MM-DD]
//        node bot/avisar.mjs
// ============================================================================
import { writeFileSync } from 'node:fs';

const SB_URL = 'https://xirpwbmekufozsddnaok.supabase.co';
const SB_KEY = 'sb_publishable_G3k6Se24l9d0kGfbuRZATQ_qYoV7RFK';   // pública, ya va en el core.js

const fecha = process.argv[2]
  || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const pide = async (tabla, query) => {
  const r = await fetch(`${SB_URL}/rest/v1/${tabla}?${query}`, { headers: { apikey: SB_KEY } });
  if (!r.ok) throw new Error(`${tabla}: HTTP ${r.status}`);
  return r.json();
};

// ── 1. El análisis del día ──────────────────────────────────────────────────
const cache = await pide('analysis_cache', `select=payload,updated_at&game_date=eq.${fecha}`);
if (!cache.length) {
  console.error(`No hay análisis guardado del ${fecha}. Corre uno primero.`);
  process.exit(1);
}
const payload = JSON.parse(cache[0].payload);
const snap = payload.snapshot || null;
const partidos = (payload.games || []).length;

// ── 2. Los picks guardados, para sacar la proyección del oficial ────────────
const picks = await pide('prop_picks',
  `select=player_id,market,side,target,proj,ev,edge,price,books&game_date=eq.${fecha}`);

// ── 3. El Prop del Día ──────────────────────────────────────────────────────
// Solo se manda si HAXIOM lo declaró OFICIAL. Si no hay oficial, el aviso lo
// dice — igual que en una corrida normal — en vez de coronar un candidato
// cualquiera, que es justo lo que el protocolo prohíbe.
const off = (snap?.pod?.status === 'Official') ? snap.pod.official : null;
let pod = null;
if (off) {
  const p = picks.find(x => x.player_id === off.player_id
    && String(x.market).toLowerCase() === String(off.mkt).toLowerCase()
    && x.side === off.side) || null;
  pod = {
    nombre: off.name, equipo: off.team, rival: off.opp,
    mercado: off.mktName, lado: off.side, linea: off.line, unidad: off.unidad || '',
    precio: off.price, edge: off.edge, conf: off.conf,
    stake: null,                       // el tamaño de apuesta no se guarda; se omite
    proy: p ? p.proj : null,
    casas: off.books,
  };
}

const r = {
  ok: true,
  msg: `reenvío del análisis guardado del ${fecha}`,
  guardado: true,
  resumen: {
    fecha,
    partidos,
    picks: picks.length,
    guardado: true,
    aviso: off ? null
      : `Hay ${picks.length} pick(s) guardados, pero HAXIOM no declaró ningún Prop del Día oficial (${snap?.pod?.status || 'sin snapshot'}).`,
    pod,
  },
};

writeFileSync('bot/resultado.json', JSON.stringify(r, null, 2));
console.log(`Análisis del ${fecha} · ${partidos} partidos · ${picks.length} picks`);
console.log(`Guardado a las ${cache[0].updated_at}`);
console.log(pod ? `Prop del Día: ${pod.nombre} ${pod.lado} ${pod.linea}${pod.unidad} @ ${pod.precio}`
                : `Sin Prop del Día oficial (${snap?.pod?.status || 'sin snapshot'})`);
console.log('Listo. Ahora: node bot/avisar.mjs');
