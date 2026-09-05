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
// poder comprobar que el token y el chat estan bien sin gastar ~183 creditos de The
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

const rec = (o) => o && o.n ? `${o.w}-${o.l}` : '0-0';
const marca = (o) => o && o.n ? (o.w/o.n>=0.6?'🟢':o.w/o.n>=0.5?'🟡':'🔴') : '⚪';

let txt;
if (!r.ok) {
  const que = (r.resumen && r.resumen.modo === 'grade') ? 'La calificación falló' : 'El análisis falló';
  txt = `⚠️ <b>${que}</b>\n<code>${esc(r.msg)}</code>\n\n<i>${hora}</i>`;
} else if (r.resumen && r.resumen.modo === 'grade') {
  // Resumen de RESULTADOS de ayer (job de medianoche ET).
  const s = r.resumen;
  const sig = s.senales || {}, pr = s.props || {};
  const p = s.pod;
  txt = `<b>Resultados MLB</b> · ${esc(s.fecha || '')} · ${hora}\n\n`
      + `${marca(sig)} <b>Señales</b> ${rec(sig)}${sig.n ? ` <i>(${Math.round(sig.w / sig.n * 100)}%)</i>` : ''}\n`
      + `${marca(pr)} <b>Props</b> ${rec(pr)}${pr.n ? ` <i>(${Math.round(pr.w / pr.n * 100)}%)</i>` : ''}\n`;
  if (p) {
    const ico = p.result === 'win' ? '✅' : p.result === 'loss' ? '❌' : p.result === 'push' ? '➖' : '⏳';
    txt += `\n⭐ <b>Prop del Día</b> ${ico}\n`
         + `${esc(p.nombre)} · <b>${p.lado === 'over' ? 'OVER' : 'UNDER'} ${p.linea}${esc(p.unidad)}</b> <code>${am(p.precio)}</code>`
         + (p.actual != null ? ` · real <b>${p.actual}</b>` : '') + `\n<i>${esc(p.mercado)}</i>\n`;
  }
  if (!sig.n && !pr.n) txt += `\n<i>No había señales ni props que calificar de ayer.</i>`;
  txt += `\n\n<i>Calificadas: ${s.calificadas?.senales || 0} señales · ${s.calificadas?.props || 0} props</i>`;
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

// Diagnostico: sin esto, cuando el mensaje no llega no hay forma de saber si el
// problema es el token, el chat, o que ni siquiera se intento. Nunca se imprimen
// los valores, solo su longitud y las ultimas cifras del chat.
console.log(`TG_TOKEN: ${TOKEN.length} caracteres · TG_CHAT: …${String(CHAT).slice(-4)}`);
console.log(`Enviando ${txt.length} caracteres a Telegram…`);

let res, j;
try {
  res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text: txt, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  j = await res.json().catch(() => ({}));
} catch (e) {
  console.log(`No se pudo contactar con Telegram: ${e.message}`);
  process.exit(PRUEBA ? 1 : 0);
}

// SE COMPRUEBAN LAS DOS COSAS: el estado HTTP **y** el campo ok que devuelve Telegram.
// Antes solo se miraba res.ok, y por eso el paso salia en verde sin que llegara
// ningun mensaje: basta con que Telegram conteste 200 diciendo ok:false para que el
// robot cantara exito. Un aviso que no llega pero se reporta como enviado es peor
// que uno que falla a gritos.
console.log(`Respuesta de Telegram: HTTP ${res.status} · ok=${j.ok}`);

if (res.ok && j.ok === true) {
  console.log('Aviso ENVIADO. Revisa Telegram.');
  process.exit(0);
}

const d = j.description || `HTTP ${res.status}`;
console.log(`NO se envio: ${d}`);
if (/chat not found/i.test(d))
  console.log('  -> El TG_CHAT no existe. Vuelve a sacarlo de getUpdates: es el numero de "chat":{"id":…}, no el update_id ni el message_id. Y tienes que haberle escrito al bot antes.');
else if (/not found|unauthorized/i.test(d))
  console.log('  -> El TG_TOKEN esta mal o el bot fue revocado. Saca uno nuevo con /token en @BotFather.');
else if (/blocked|deactivated/i.test(d))
  console.log('  -> Bloqueaste al bot en Telegram. Desbloquealo y reintenta.');
else if (/parse|entities/i.test(d))
  console.log('  -> Fallo el formato del mensaje. Esto es un bug: avisa.');
else
  console.log(`  -> Respuesta completa: ${JSON.stringify(j)}`);

// En la PRUEBA si se falla: el unico objetivo de esa corrida es saber si funciona.
// En una corrida normal no, porque el analisis ya se guardo y un aviso perdido no
// puede tumbar el trabajo bueno.
process.exit(PRUEBA ? 1 : 0);
