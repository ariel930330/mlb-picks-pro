// ============================================================================
//  ¿A qué chats puede escribir el bot, y cuál es el id de cada uno?
// ----------------------------------------------------------------------------
//  Sacar el id de un GRUPO es más engorroso que el de un chat personal, y las
//  instrucciones típicas de internet fallan por tres motivos:
//
//    1. El id de un grupo es NEGATIVO. Los supergrupos empiezan por -100.
//       Si pones el id sin el signo, Telegram contesta "chat not found".
//    2. Por defecto los bots tienen el MODO PRIVACIDAD activado: no ven los
//       mensajes normales del grupo, así que getUpdates sale vacío aunque
//       hayas escrito ahí. Se arregla escribiendo un comando (/algo) o
//       haciendo al bot administrador.
//    3. Si el grupo se convierte en SUPERGRUPO, el id CAMBIA. Un id que
//       funcionaba deja de funcionar de un día para otro.
//
//  Este script lo resuelve: lista todos los chats que el bot ha visto, con su
//  id, tipo y nombre, y comprueba en cuáles puede escribir de verdad.
//
//  El token NUNCA se imprime: se lee del secreto TG_TOKEN y solo se usa.
// ============================================================================

const TOKEN = process.env.TG_TOKEN;
if (!TOKEN) {
  console.error('Falta TG_TOKEN en los secretos del repositorio.');
  process.exit(1);
}
const api = (m, q = '') => fetch(`https://api.telegram.org/bot${TOKEN}/${m}${q}`).then(r => r.json());

// ── Quién es el bot ─────────────────────────────────────────────────────────
const yo = await api('getMe');
if (!yo.ok) {
  console.error(`El token no vale: ${yo.description || '?'}`);
  console.error('Saca uno nuevo con /token en @BotFather y actualiza el secreto TG_TOKEN.');
  process.exit(1);
}
console.log(`Bot: @${yo.result.username}  (${yo.result.first_name})`);

// Un webhook activo se COME los updates: getUpdates devolvería vacío siempre.
const wh = await api('getWebhookInfo');
if (wh.ok && wh.result?.url) {
  console.log(`\nAVISO: hay un webhook puesto (${wh.result.url}).`);
  console.log('Mientras exista, getUpdates viene vacío. Quítalo con deleteWebhook si no lo usas.');
}

// ── Chats que ha visto ──────────────────────────────────────────────────────
const up = await api('getUpdates', '?limit=100');
if (!up.ok) { console.error(`getUpdates falló: ${up.description}`); process.exit(1); }

const chats = new Map();
for (const u of up.result || []) {
  const m = u.message || u.channel_post || u.edited_message || u.my_chat_member;
  const c = m?.chat;
  if (c && !chats.has(c.id)) chats.set(c.id, c);
}

if (!chats.size) {
  console.log('\nNo se ve ningún chat. Casi siempre es una de estas dos:');
  console.log('  · El bot no ha recibido nada en las últimas 24 h (Telegram no guarda más).');
  console.log('  · MODO PRIVACIDAD: el bot no ve los mensajes normales de un grupo.');
  console.log('\nQué hacer: entra al GRUPO y escribe un comando, con la arroba del bot:');
  console.log(`      /id@${yo.result.username}`);
  console.log('  Un comando SÍ le llega aunque tenga el modo privacidad puesto.');
  console.log('  Después vuelve a lanzar esto.');
  process.exit(0);
}

console.log(`\n${chats.size} chat(s) que el bot ha visto:\n`);
for (const c of chats.values()) {
  const nombre = c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || '(sin nombre)';
  const tipo = { private: 'personal', group: 'grupo', supergroup: 'supergrupo', channel: 'canal' }[c.type] || c.type;

  // La prueba de verdad no es que aparezca en la lista, sino que el bot pueda
  // escribir ahí. Un bot puede estar en un grupo y tener el envío prohibido.
  const p = await api('getChat', `?chat_id=${c.id}`);
  let estado;
  if (!p.ok) estado = `NO accesible (${p.description})`;
  else if (c.type === 'private') estado = 'OK';
  else {
    const m = await api('getChatMember', `?chat_id=${c.id}&user_id=${yo.result.id}`);
    const s = m.ok ? m.result.status : '?';
    estado = s === 'left' || s === 'kicked' ? `EXPULSADO o fuera (${s})`
           : m.ok && m.result.can_send_messages === false ? 'SIN permiso para escribir'
           : `OK (${s})`;
  }
  console.log(`  ${String(c.id).padEnd(16)} ${tipo.padEnd(11)} ${nombre}`);
  console.log(`  ${''.padEnd(16)} ${estado}\n`);
}

console.log('Copia el id del grupo — CON el signo menos — al secreto TG_CHAT');
console.log('  (GitHub → Settings → Secrets and variables → Actions → TG_CHAT)');
console.log('\nOJO: si el grupo se convierte en supergrupo, el id CAMBIA y hay que');
console.log('actualizarlo. Los supergrupos empiezan por -100.');
