// ============================================================================
//  Corre el análisis en un navegador headless
// ----------------------------------------------------------------------------
//  La app es una página estática: toda la lógica vive en el navegador. Así que
//  para automatizarla se abre de verdad, con un Chromium sin ventana.
//
//  Las credenciales se rellenan en el formulario de login NORMAL, no van por la
//  URL: en la URL quedarían en los logs de Actions y en el historial.
//
//  La espera NO mira el DOM. La página expone window.__auto y eso es el contrato:
//  el DOM cambia cada vez que se mueve un botón y el robot no debe romperse por
//  eso. Se espera a __auto.done, que solo se pone en true cuando el análisis
//  TERMINÓ y el guardado en Supabase se resolvió.
//
//  Sale con código 1 si algo falló, para que GitHub avise en vez de fallar en
//  silencio — que es exactamente el problema que ya nos costó caro una vez.
// ============================================================================
import { chromium } from 'playwright';

const URL   = process.env.APP_URL || 'https://ariel930330.github.io/mlb-picks-pro/index.html';
const EMAIL = process.env.BOT_EMAIL;
const PASS  = process.env.BOT_PASSWORD;
// MODO=grade abre la página en modo calificar (auto=grade): califica el día que
// cerró y arma el resumen de resultados. Cualquier otro valor = análisis normal.
const MODO  = process.env.MODO === 'grade' ? 'grade' : '1';
const TIMEOUT_MS = 9 * 60 * 1000;   // un análisis completo ronda los 6 s, pero la
                                     // primera carga en frío del runner es lenta

if (!EMAIL || !PASS) {
  console.error('Faltan BOT_EMAIL / BOT_PASSWORD en los secretos del repositorio.');
  process.exit(1);
}

const nav = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await nav.newContext({ timezoneId: 'America/New_York', locale: 'es-MX' });
const pg  = await ctx.newPage();

// Los errores de la página se ven en el log del workflow: sin esto, un fallo de JS
// dentro del navegador sería invisible desde fuera.
pg.on('console', m => { if (['error','warning'].includes(m.type())) console.log(`  [navegador] ${m.text()}`); });
pg.on('pageerror', e => console.log(`  [navegador] ERROR ${e.message}`));

let codigo = 0;
try {
  const url = `${URL}?auto=${MODO}&cb=${Date.now()}`;   // cb: evita la caché de Pages
  console.log(`Abriendo ${URL}?auto=${MODO}${MODO==='grade'?' (calificar)':''}`);
  await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

  // Login. El modal puede estar oculto: se abre con el botón de sesión si hace falta.
  await pg.waitForSelector('#login-email', { state: 'attached', timeout: 60000 });
  const visible = await pg.isVisible('#login-email');
  if (!visible) {
    await pg.evaluate(() => { const m = document.getElementById('login-modal'); if (m) m.style.display = 'flex'; });
  }
  await pg.fill('#login-email', EMAIL);
  await pg.fill('#login-pass',  PASS);
  await pg.press('#login-pass', 'Enter');

  // ¿Entró la sesión? Si las credenciales están mal, se dice claro en vez de
  // esperar nueve minutos a un timeout que no explica nada.
  await pg.waitForFunction(() => window.__auto && window.__auto.listo, { timeout: 60000 })
    .catch(async () => {
      const err = await pg.textContent('#login-err').catch(() => '');
      throw new Error(`no se pudo iniciar sesión${err ? `: ${err.trim()}` : ' (revisa BOT_EMAIL / BOT_PASSWORD)'}`);
    });
  console.log('Sesión iniciada · análisis en marcha');

  await pg.waitForFunction(() => window.__auto && window.__auto.done, { timeout: TIMEOUT_MS });
  const st = await pg.evaluate(() => window.__auto);

  // Se deja el resultado en disco para que avisar.mjs mande el aviso de Telegram.
  // Va aparte del envío a propósito: si el aviso falla, el análisis ya está guardado
  // y no tiene por qué arrastrar al workflow.
  const { writeFileSync } = await import('node:fs');
  writeFileSync('bot/resultado.json', JSON.stringify(
    { ok: st.ok, msg: st.msg, guardado: st.guardado, resumen: st.resumen || null }, null, 2));

  console.log(`Fecha analizada : ${st.fecha || '?'}`);
  console.log(`Resultado       : ${st.ok ? 'OK' : 'FALLÓ'} · ${st.msg}`);
  console.log(`Guardado nube   : ${st.guardado ? 'sí' : 'NO'}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### ${st.ok ? '✅' : '❌'} Análisis automático\n\n`
      + `- **Jornada:** ${st.fecha || '?'}\n`
      + `- **Resultado:** ${st.msg}\n`
      + `- **Guardado en Supabase:** ${st.guardado ? 'sí' : 'no'}\n`);
  }

  // Guardar sin confirmar es peor que no correr: deja el historial incompleto y
  // nadie se entera. Se trata como fallo.
  if (!st.ok || !st.guardado) codigo = 1;

} catch (e) {
  console.error(`FALLO: ${e.message}`);
  await pg.screenshot({ path: 'bot/fallo.png', fullPage: false }).catch(() => {});
  codigo = 1;
} finally {
  await nav.close();
}
process.exit(codigo);
