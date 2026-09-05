// ============================================================================
//  Disparador del análisis, alojado en Vercel
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE. El cron de GitHub Actions entrega el 8% de lo que se le pide:
//  medido sobre 8 días, 4.4 disparos al día de 52 programados, y con huecos de
//  13 horas seguidas. El portero y el bucle que duerme compensan bastante, pero
//  una jornada completa de MLB (de las 2:55 PM a las 7:55 PM ET) no cabe en un
//  solo job, que tiene tope de 5 h 30.
//
//  Esto NO analiza nada: solo toca el timbre. El análisis sigue corriendo en
//  GitHub Actions, que es donde hay un navegador de verdad y tiempo sin límite.
//  Una función de Vercel no puede hacerlo: necesitaría Chromium empaquetado y
//  un análisis completo tarda minutos, muy por encima del tope de ejecución.
//
//  QUIÉN PUEDE LLAMARLO. Nadie sin la clave: cada disparo gasta ~183 créditos de
//  The Odds API (12 por juego × 15 juegos + 3), así que un endpoint abierto sería
//  una factura ajena.
//    · El cron de Vercel manda solo la cabecera Authorization con CRON_SECRET.
//    · A mano: ?clave=<CRON_SECRET>
//
//  VARIABLES DE ENTORNO (Vercel → Settings → Environment Variables):
//    CRON_SECRET   cualquier texto largo que inventes. Protege este endpoint.
//    GH_TOKEN      token de GitHub de permiso FINO, con UN solo permiso:
//                  Actions: Read and write, y solo en este repositorio.
//                  NO uses un token clásico ni uno con permisos amplios.
//    GH_REPO       opcional. Por defecto ariel930330/mlb-picks-pro
// ============================================================================

const REPO = process.env.GH_REPO || 'ariel930330/mlb-picks-pro';

module.exports = async function handler(req, res) {
  // ── Puerta ────────────────────────────────────────────────────────────────
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return res.status(500).json({ ok: false, error: 'falta CRON_SECRET en Vercel' });
  }
  const cabecera = req.headers.authorization || '';
  const autorizado = cabecera === `Bearer ${secreto}` || req.query?.clave === secreto;
  if (!autorizado) {
    // 404 y no 401: a quien pase por aquí sin clave no se le confirma que existe.
    return res.status(404).json({ ok: false });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ ok: false, error: 'falta GH_TOKEN en Vercel' });
  }

  // Qué workflow y con qué modo. Por defecto, el análisis normal.
  const modo = req.query?.modo === 'calificar' ? 'calificar' : 'analisis';
  const archivo = modo === 'calificar' ? 'calificar-auto.yml' : 'analisis-auto.yml';
  // forzar=1 analiza YA, sin esperar a que toque la oleada (para probar a mano).
  // Sin forzar se comporta como el cron: el portero decide y casi siempre dice que no.
  const forzar = req.query?.forzar === '1';
  const modoWf = forzar ? 'analizar-ya' : 'solo-si-toca';

  try {
    const r = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${archivo}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          ...(modo === 'analisis' ? { inputs: { modo: modoWf } } : {}),
        }),
      });

    // GitHub contesta 204 sin cuerpo cuando acepta el disparo.
    if (r.status === 204) {
      return res.status(200).json({ ok: true, modo, archivo, forzar, cuando: new Date().toISOString() });
    }
    // Si no, se devuelve el motivo TAL CUAL: un 401 aquí casi siempre es el token
    // caducado o sin el permiso de Actions, y conviene verlo sin adivinar.
    const cuerpo = await r.text();
    return res.status(502).json({ ok: false, estado: r.status, github: cuerpo.slice(0, 300) });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message });
  }
}
