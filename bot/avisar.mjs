// ============================================================================
//  Aviso por Telegram cuando el robot termina un análisis
// ----------------------------------------------------------------------------
//  Las notificaciones push del navegador necesitan un servidor que las envíe, y
//  aquí no hay ninguno: la app es una página estática. Pero el robot SÍ corre en
//  algún sitio y sabe cuándo acabó, así que el aviso sale de él.
//
//  Tiene una ventaja sobre las push del navegador: llega aunque nunca abras la
//  app, y sirve de vigilante — si no llega nada en todo el día, el robot no corrió.
//
//  Lee bot/resultado.json, que escribe correr-analisis.mjs.
//  Secretos: TG_TOKEN y TG_CHAT. Si faltan, no falla: solo avisa y sale.
// ============================================================================
import { readFileSync } from 'node:fs';

const TOKEN = process.env.TG_TOKEN;
const CHAT  = process.env.TG_CHAT;
if (!TOKEN || !CHAT) {
  console.log('Sin TG_TOKEN / TG_CHAT: no se manda aviso. (Ver bot/LEEME.md)');
  process.exit(0);
}

// Modo prueba: manda un mensaje de ejemplo SIN correr ningun analisis. Existe para
// poder comprobar que el token y el chat estan bien sin gastar 94 creditos de The
// Odds API solo para ver si llega un mensaje.
const PRUEBA = process.argv.includes('--prueba');

let r;
if (PRUEBA) {
  r = { ok: true, guardado: true, resumen: {
    fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
    partidos: 11, picks: 8, guardado: true, aviso: null,
    pod: { nombre: 'PRUEBA · Bobby Witt Jr.', equipo: 'KC', rival: 'Cleveland',
           mercado: 'Bases totales', lado: 'over', linea: 1.5, unidad: 'TB',
           precio: 115, edge: 0.064, conf: 0.78, stake: 2.1, proy: 1.94, casas: 3 },
  }};
} else {
  try { r = JSON.parse(readFileSync('bot/resultado.json', 'utf8')); }
  catch { console.log('No hay bot/resultado.json: nada que avisar.'); process.exit(0); }
}

const pct  = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
const am   = v => v == null ? '—' : (v > 0 ? `+${v}` : `${v}`);
const esc  = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const hora = new Date().toLocaleTimeString('es-MX',
  { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET';

let txt;
if (!r.ok) {
  txt = `⚠️ <b>El análisis falló</b>\n<code>${esc(r.msg)}</code>\n\n<i>${hora}</i>`;
} else {
  const s = r.resumen || {};
  const p = s.pod;
  const cab = `<b>MLB Picks</b> · ${esc(s.fecha || '')} · ${hora}`;

  if (p) {
    // El Prop del Día va primero y completo: es lo único que hay que decidir.
    txt = `${cab}\n\n`
        + `⭐ <b>PROP DEL DÍA</b>\n`
        + `<b>${esc(p.nombre)}</b> (${esc(p.equipo)}) vs ${esc(p.rival)}\n`
        + `<b>${p.lado === 'over' ? 'OVER' : 'UNDER'} ${p.linea}${esc(p.unidad)}</b>  <code>${am(p.precio)}</code>\n`
        + `<i>${esc(p.mercado)}</i> · proyección ${p.proy}${esc(p.unidad)}\n\n`
        + `Edge <b>${pct(p.edge)}</b> · Confianza <b>${Math.round((p.conf ?? 0) * 100)}%</b> · Stake <b>${p.stake}%</b>\n`
        + (p.casas ? `<i>${p.casas} casa(s) en esta línea</i>\n` : '')
        + `\n${s.picks} pick(s) con valor · ${s.partidos} partidos`;
  } else {
    txt = `${cab}\n\n`
        + `Sin picks con valor en esta corrida.\n`
        + `<i>${esc(s.aviso || 'Ninguna proyección superó el piso de valor.')}</i>\n\n`
        + `${s.partidos} partidos analizados`;
  }
  if (s.guardado === false) txt += `\n\n⚠️ <b>No se guardó en Supabase.</b>`;
}

if (PRUEBA) txt = `🧪 <b>Prueba de conexión</b>\n<i>Mensaje de ejemplo, no es un pick real.</i>\n\n` + txt;

const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: CHAT, text: txt, parse_mode: 'HTML', disable_web_page_preview: true }),
});
const j = await res.json().catch(() => ({}));

if (res.ok) { console.log('Aviso enviado por Telegram.'); process.exit(0); }

// Los errores de Telegram son cripticos, asi que se traducen a lo que hay que hacer.
const d = j.description || `HTTP ${res.status}`;
console.log(`No se pudo enviar el aviso: ${d}`);
if (/not found/i.test(d) && !/chat/i.test(d))
  console.log('  -> El TG_TOKEN esta mal o el bot fue revocado. Saca uno nuevo con /token en @BotFather.');
else if (/chat not found/i.test(d))
  console.log('  -> El TG_CHAT esta mal, o todavia no le escribiste al bot. Mandale un mensaje y reintenta.');
else if (/blocked|deactivated/i.test(d))
  console.log('  -> Bloqueaste al bot en Telegram. Desbloquealo y reintenta.');
else if (/parse/i.test(d))
  console.log('  -> Fallo el formato del mensaje. Esto es un bug: avisa.');

// En la PRUEBA si se falla, porque el unico objetivo de esa corrida es saber si
// funciona. En una corrida normal NO, porque el analisis ya se guardo y un aviso
// perdido no puede tumbar el trabajo bueno.
if (PRUEBA) process.exit(1);
