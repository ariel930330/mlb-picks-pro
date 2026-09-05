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
// --ver imprime el mensaje TAL CUAL y no envia nada. Sirve para revisar el formato
// sin gastar un mensaje ni depender de que el token este puesto.
const SOLO_VER = process.argv.includes('--ver');
if ((!TOKEN || !CHAT) && !SOLO_VER) {
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

// ── SOCCER ────────────────────────────────────────────────────────────────
// El algoritmo del futbol no tiene nada que ver con el del beisbol, asi que su
// aviso tampoco: aqui lo que importa es el nivel de la senal, el edge y hasta que
// cuota sigue valiendo la pena. El "tier" va con su color para que se lea de un
// vistazo, igual que en la pagina.
const ICONO = { 'Elite Signal': '\u{1F7E2}', 'Strong Signal': '\u{1F535}', 'Lean Signal': '\u{1F7E0}' };
const pp = v => v == null ? '\u2014' : `${v >= 0 ? '+' : ''}${(+v).toFixed(2)} pp`;
function mensajeFutbol(s) {
  const cab = `\u26BD <b>SOCCER \u00b7 HAXIOM EDGE</b> \u00b7 ${esc(s.fecha || '')} \u00b7 ${hora}`;
  const n = s.por_estado || {};
  const linea = `${s.partidos} partido(s)${s.ventana ? ` en ventana de ${s.ventana} min` : ''} \u00b7 ${s.candidatos} selecciones`
    + `\n${s.xi_confirmados || 0} con XI confirmado${s.cierres ? ` \u00b7 ${s.cierres} cierre(s) capturado(s)` : ''}`;
  const sen = (s.senales || []).slice(0, 6);
  if (!sen.length) {
    return `${cab}\n\n${linea}\n\n<i>Sin se\u00f1ales publicables en esta corrida.`
      + `${n['Signal Detected'] ? ` ${n['Signal Detected']} en watchlist.` : ''} No se fuerza una jugada.</i>`;
  }
  const cuerpo = sen.map(x => `${ICONO[x.tier] || '\u26AA'} <b>${esc(x.seleccion)}</b> \u00b7 ${esc(x.mercado)}`
    + `\n   ${esc(x.partido)} <i>(${esc(x.competicion)})</i>`
    + `\n   <code>${am(x.cuota)}</code> en ${esc(x.casa || '?')} \u00b7 edge <b>${pp(x.edge_pp)}</b> \u00b7 EV ${pct(x.ev)}`
    + `\n   score ${Math.round(x.score)} \u00b7 vale hasta <code>${am(x.minimo)}</code>`).join('\n\n');
  return `${cab}\n\n${linea}\n\n${cuerpo}`
    + `${(s.senales || []).length > sen.length ? `\n\n<i>y ${s.senales.length - sen.length} m\u00e1s en la p\u00e1gina</i>` : ''}`
    + `\n\n<i>PAPER: sin calibraci\u00f3n validada todav\u00eda (SE \u00a79.1).</i>`;
}

let txt;
if (!r.ok) {
  const que = (r.resumen && r.resumen.deporte === 'futbol') ? 'El análisis de SOCCER falló'
            : (r.resumen && r.resumen.modo === 'grade') ? 'La calificación falló' : 'El análisis falló';
  txt = `⚠️ <b>${que}</b>\n<code>${esc(r.msg)}</code>\n\n<i>${hora}</i>`;
} else if (r.resumen && r.resumen.deporte === 'futbol') {
  txt = mensajeFutbol(r.resumen);
  if (r.resumen.guardado === false) txt += `\n\n\u26A0 <b>No se guard\u00f3 en Supabase.</b>`;
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
        // El stake se OMITE si no viene, en vez de escribir "null%". Pasa cuando el
        // aviso se rearma desde lo guardado en Supabase, que no almacena el tamaño
        // de apuesta. Mejor no decirlo que decir una cifra inventada.
        + `Edge <b>${pct(p.edge)}</b> · Confianza <b>${Math.round((p.conf ?? 0) * 100)}%</b>`
        + (p.stake != null ? ` · Stake <b>${p.stake}%</b>` : '') + `\n`
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

if (SOLO_VER) { console.log(txt); process.exit(0); }
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
if (/chat not found/i.test(d)) {
  console.log('  -> El TG_CHAT no existe para este bot.');
  if (!String(CHAT).startsWith('-'))
    console.log('     Si es un GRUPO, el id es NEGATIVO y empieza por -100 en los supergrupos.'
              + ` El tuyo (…${String(CHAT).slice(-4)}) no lleva signo, asi que apunta a un chat personal.`);
  console.log('     Saca el id correcto con el modo "ver-chats" del workflow.');
} else if (/kicked|not a member|chat_write_forbidden/i.test(d))
  console.log('  -> El bot ya no esta en ese grupo, o no tiene permiso para escribir. Vuelve a anadirlo y dale permiso de enviar mensajes.');
else if (/group chat was upgraded|migrate_to_chat_id/i.test(d))
  console.log('  -> El grupo se convirtio en SUPERGRUPO y su id CAMBIO. Saca el nuevo con el modo "ver-chats" y actualiza TG_CHAT.');
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
