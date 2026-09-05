// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SOCCER · HAXIOM EDGE · Signal Engine v1.1 + Prop of the Day v1.0          ║
// ║  Fase 1 (SE §11): 1X2, Doble Oportunidad, Hándicap Asiático, Match Goals,  ║
// ║  Team Goals, BTTS. DNB bloqueado (etiqueta "Home/Away" sin tipar, SE 1.1.1)║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Reglas de casa (deportes/LEEME.md): todo vive dentro de esta función; los botones
// van por data-ac; el CSS cuelga de #dep-futbol; las tablas se declaran en `tablas`
// y se usan por `db`; el bot es AUTO y solo se expone con ?deporte=futbol.
//
// Documentos que mandan: docs/futbol/*.md. La auditoría (01-auditoria.md) lista
// cada SUPUESTO Sx que aparece abajo; ninguno es una propuesta, son valores que los
// documentos dejan a configuración y que el dueño puede cambiar.
(function () {
'use strict';

// ══ 0 · VERSIONES Y CONFIGURACIÓN ═════════════════════════════════════════════
const VERSIONES = Object.freeze({
  criterios:   'haxiom_soccer_policy_v1',     // SE §7 + §7.1 + POD v1.0
  modelo:      'soccer_joint_score_v1',       // familias A (Dixon-Coles) y B (bivariado sobre xG)
  features:    'soccer_features_v1',
  calibracion: 'market_prior_shrinkage_v0',   // S19: sin calibración empírica todavía → shrinkage al prior de mercado; toda salida es PAPER (Master §6, SE §9.1)
  reglas:      'soccer_settlement_v1',        // regulación 90' + descuento; AH por estados; sin reglas por casa (book_rule_unverified)
  datos:       'api-football_v3',
  fase:        1,
});
const CONFIG = Object.freeze({
  zona: 'America/New_York',                                   // S4
  casas: { aprobadas: 'TODAS', sharp: [4], nombres: { 4: 'Pinnacle' } },   // S10 (autorizado 5-sep-2026)
  novig: { referencia: 'shin', metodos: ['mult', 'add', 'power', 'shin'] },  // S6
  lcb: { k: 1.0, draws: 64, escala_sd: 0.5 },                  // S3 / S18: bootstrap paramétrico sobre λ
  frescura_min: { detected: 1440, lean: 120, strong: 60, elite: 30 },      // S11 (SE §7 no fija minutos)
  acuerdo_max_pp: 6.0,                                        // S14 (mismo límite que POD §8)
  outlier_pp: 0.03,                                           // S15: mejor precio > 3 pp sobre la mediana = stale outlier
  derivada_max_pp: 0.05,                                      // coherencia DC vs 1X2 (SE 4.1 mkt_derivative_gap)
  estabilidad_min: 50,                                        // Lean: "no fragile input dominates"
  ess_pleno: 20,
  calibracion: { metodo: 'market_prior_shrinkage', K_m: 60 },   // S19: p_cal = p_mkt + w·(p_model − p_mkt), w = ESS/(ESS+K_m)
  xg: { peso: 0.6, cobertura_min: 0.6, stats_por_corrida: 120 },   // S13
  lineups_ventana_min: 120,                                   // se piden alineaciones a ≤120 min del inicio
  correlacion: { cap_por_familia: 1 },                        // S16 (SE §1.3: una tesis por partido/lado)
  caps: { por_tier: null, por_partido: null },                // S9
  // SE §7 — literal
  tiers: {
    elite:  { ev: .045, pct: .98, lcb: .010, dq: 95 },
    strong: { ev: .030, pct: .95, lcb: .000, dq: 90 },
    lean:   { ev: .015, pct: .85, lcb: null, dq: 80 },
  },
  // SE §7.1 — pesos por mercado (Team/xG, XI/GK, Role/min, Tactics, Context, Market/value, Quality)
  pesos: {
    resultado: [25, 20, 5, 15, 5, 20, 10],    // 1X2 / DNB / DC / AH
    total:     [25, 20, 5, 15, 10, 15, 10],   // Match Goals / BTTS
    equipo:    [25, 20, 5, 20, 5, 15, 10],    // Team Goals
  },
  rejilla: { max: 10 },
  ajuste: { H: [60, 120, 240], rho: [-0.03, -0.08], K: [4, 8], fraccion_prueba: 0.4 },   // S8 (walk-forward)
  bivariado: { lambda3: 0.12 },                               // S12
  pod: {                                                      // POD §7, §8, §12, §14, §21 — literal
    casas_min: 3, odds_lo: -175, odds_hi: 125, centavos_max: 15, quote_max_min: 5,
    p_cal_min: 62.0, conf_min: 86, edge_min: 5.5, completitud_min: 95, stress_pp: 2.5, stress_edge_min: 3.0, separacion_min: 3.0,
    desacuerdo_max: 6.0,
    mercados: { 240: 'PLAYER_SHOTS', 241: 'PLAYER_SHOTS', 265: 'PLAYER_SHOTS', 270: 'PLAYER_SHOTS', 276: 'PLAYER_SHOTS',
                242: 'PLAYER_SOT', 264: 'PLAYER_SOT', 269: 'PLAYER_SOT', 275: 'PLAYER_SOT',
                266: 'PLAYER_FOULS_COMMITTED', 271: 'PLAYER_FOULS_COMMITTED', 277: 'PLAYER_FOULS_COMMITTED',
                272: 'PLAYER_TACKLES', 278: 'PLAYER_TACKLES', 273: 'PLAYER_PASSES_ATT', 279: 'PLAYER_PASSES_ATT',
                267: 'GK_SAVES', 268: 'GK_SAVES', 274: 'GK_SAVES' },
  },
  supuestos: [
    'S1 competiciones: las 20 del dueño', 'S2 proveedor único API-Football', 'S3 k de EV_LCB = 1.0',
    'S4 zona America/New_York', 'S5 clima no disponible (no se imputa)', 'S6 no-vig de referencia Shin',
    'S7 XI oficial desde que /fixtures/lineups responde (≈T-40)', 'S8 λ, ρ, K por competición vía walk-forward',
    'S9 sin caps de publicación', 'S10 todas las casas aprobadas; Pinnacle única sharp', 'S11 frescura por tier (min)',
    'S12 λ3 bivariado 0.12', 'S13 mezcla xG 0.6 / goles 0.4 en familia B', 'S14 desacuerdo máximo 6 pp',
    'S15 outlier de precio 3 pp', 'S16 una tesis por partido y lado', 'S18 SD de λ = 0.5·√(1/ESS_att + 1/ESS_def)', 'S19 calibración provisional: shrinkage al prior de mercado con K_m=60 (sustituir por calibración empírica SE §9)',
  ],
});
// S1 · Competiciones del dueño (ids verificados contra /leagues el 5-sep-2026)
const COMPETICIONES = [
  { id: 39,  nombre: 'PREMIER LEAGUE',        pais: 'Inglaterra' },
  { id: 140, nombre: 'LA LIGA',               pais: 'España' },
  { id: 78,  nombre: 'BUNDESLIGA',            pais: 'Alemania' },
  { id: 135, nombre: 'SERIE A',               pais: 'Italia' },
  { id: 61,  nombre: 'LIGUE 1',               pais: 'Francia' },
  { id: 40,  nombre: 'CHAMPIONSHIP',          pais: 'Inglaterra' },
  { id: 179, nombre: 'SCOTTISH PREMIERSHIP',  pais: 'Escocia' },
  { id: 94,  nombre: 'LIGA PORTUGAL',         pais: 'Portugal' },
  { id: 203, nombre: 'SÜPER LIG',             pais: 'Turquía' },
  { id: 88,  nombre: 'EREDIVISIE',            pais: 'Países Bajos' },
  { id: 119, nombre: 'SUPERLIGAEN',           pais: 'Dinamarca' },
  { id: 103, nombre: 'ELITESERIEN',           pais: 'Noruega' },
  { id: 144, nombre: 'PRO LEAGUE',            pais: 'Bélgica' },
  { id: 207, nombre: 'SUPER LEAGUE',          pais: 'Suiza' },
  { id: 307, nombre: 'SAUDI PRO LEAGUE',      pais: 'Arabia Saudita' },
  { id: 253, nombre: 'MLS',                   pais: 'Estados Unidos' },
  { id: 262, nombre: 'LIGA MX',               pais: 'México' },
  { id: 2,   nombre: 'CHAMPIONS LEAGUE',      pais: 'UEFA' },
  { id: 3,   nombre: 'EUROPA LEAGUE',         pais: 'UEFA' },
  { id: 848, nombre: 'CONFERENCE LEAGUE',     pais: 'UEFA' },
];
// ══ 1 · REGISTRO CANÓNICO DE MERCADOS (SE §1.1.1, Master §2) ══════════════════
// Cada mercado conserva la etiqueta original del proveedor, su periodo, su objeto de
// probabilidad, sus estados de liquidación y la familia de correlación (tesis).
const PERIODO = 'REGULATION_90_PLUS_STOPPAGE';
const MERCADOS = Object.freeze({
  '1X2':             { bet: 1,  etiqueta: 'Match Winner',      periodo: PERIODO, sels: ['HOME', 'DRAW', 'AWAY'], vias: 3, linea: false, estados: ['win', 'loss'], fase: 1, pesos: 'resultado', nombre: '1X2' },
  'DOUBLE_CHANCE':   { bet: 12, etiqueta: 'Double Chance',     periodo: PERIODO, sels: ['1X', '12', 'X2'], vias: 3, linea: false, estados: ['win', 'loss'], fase: 1, pesos: 'resultado', derivadoDe: '1X2', nombre: 'DOBLE OPORTUNIDAD' },
  'ASIAN_HANDICAP':  { bet: 4,  etiqueta: 'Asian Handicap',    periodo: PERIODO, sels: ['HOME', 'AWAY'], vias: 2, linea: true, estados: ['win', 'half_win', 'push', 'half_loss', 'loss'], fase: 1, pesos: 'resultado', nombre: 'HÁNDICAP ASIÁTICO' },
  'MATCH_GOALS':     { bet: 5,  etiqueta: 'Goals Over/Under',  periodo: PERIODO, sels: ['OVER', 'UNDER'], vias: 2, linea: true, estados: ['win', 'half_win', 'push', 'half_loss', 'loss'], fase: 1, pesos: 'total', nombre: 'GOLES DEL PARTIDO' },
  'TEAM_GOALS_HOME': { bet: 16, etiqueta: 'Total - Home',      periodo: PERIODO, sels: ['OVER', 'UNDER'], vias: 2, linea: true, estados: ['win', 'half_win', 'push', 'half_loss', 'loss'], fase: 1, pesos: 'equipo', nombre: 'GOLES LOCAL' },
  'TEAM_GOALS_AWAY': { bet: 17, etiqueta: 'Total - Away',      periodo: PERIODO, sels: ['OVER', 'UNDER'], vias: 2, linea: true, estados: ['win', 'half_win', 'push', 'half_loss', 'loss'], fase: 1, pesos: 'equipo', nombre: 'GOLES VISITA' },
  'BTTS':            { bet: 8,  etiqueta: 'Both Teams Score',  periodo: PERIODO, sels: ['YES', 'NO'], vias: 2, linea: false, estados: ['win', 'loss'], fase: 1, pesos: 'total', nombre: 'AMBOS ANOTAN' },
  // Bloqueado en Fase 1: el proveedor solo ofrece "Home/Away" (bet 2), etiqueta de dos vías SIN tipar.
  // SE §1.1.1: "an untyped Moneyline label is never accepted". Se registra, no se precia.
  'DNB':             { bet: null, etiquetaAmbigua: 'Home/Away (bet 2)', periodo: PERIODO, sels: ['HOME', 'AWAY'], vias: 2, linea: false, estados: ['win', 'push', 'loss'], fase: 1, bloqueo: 'SETTLEMENT_BLOCK', pesos: 'resultado', nombre: 'DRAW NO BET' },
  // Fase 2 (SE §11): registrados para el snapshot, NO evaluados (nunca prorrateados).
  'FH_GOALS':        { bet: 6,  etiqueta: 'Goals Over/Under First Half', periodo: 'FIRST_HALF_PLUS_STOPPAGE', fase: 2, nombre: 'GOLES 1ª MITAD' },
  'MATCH_CORNERS':   { bet: 45, etiqueta: 'Corners Over Under', periodo: PERIODO, fase: 2, nombre: 'CÓRNERS' },
  'TEAM_CORNERS_HOME': { bet: 57, etiqueta: 'Home Corners Over/Under', periodo: PERIODO, fase: 2, nombre: 'CÓRNERS LOCAL' },
  'TEAM_CORNERS_AWAY': { bet: 58, etiqueta: 'Away Corners Over/Under', periodo: PERIODO, fase: 2, nombre: 'CÓRNERS VISITA' },
  'FH_CORNERS':      { bet: 77, etiqueta: 'Corners 1x2 / First Half', periodo: 'FIRST_HALF_PLUS_STOPPAGE', fase: 2, nombre: 'CÓRNERS 1ª MITAD' },
  'TEAM_WIN_EITHER_HALF': { bet: null, periodo: 'H1_OR_H2', fase: 2, nombre: 'GANA ALGUNA MITAD' },
});
const BET_A_MERCADO = {}; for (const k in MERCADOS) if (MERCADOS[k].bet) BET_A_MERCADO[MERCADOS[k].bet] = k;
// Tesis de exposición (SE §1.3): 1X2/DC/AH/team totals del mismo lado son UNA opinión.
function tesisDe(mercado, sel, linea) {
  if (mercado === '1X2') return sel;                                   // HOME / DRAW / AWAY
  if (mercado === 'DOUBLE_CHANCE') return sel === '1X' ? 'HOME' : sel === 'X2' ? 'AWAY' : 'NO_DRAW';
  if (mercado === 'ASIAN_HANDICAP') return sel;
  if (mercado === 'MATCH_GOALS') return sel;                           // OVER / UNDER
  if (mercado === 'BTTS') return sel === 'YES' ? 'OVER' : 'UNDER';
  if (mercado === 'TEAM_GOALS_HOME') return sel === 'OVER' ? 'HOME' : 'AWAY';
  if (mercado === 'TEAM_GOALS_AWAY') return sel === 'OVER' ? 'AWAY' : 'HOME';
  return mercado + ':' + sel;
}
// Reason codes SE §10.1 (positivos y negativos) + POD §26
const RC = Object.freeze({
  VALUE: 'VALUE', LINEUP_CONFIRMED: 'LINEUP_CONFIRMED', GOALKEEPER_CONFIRMED: 'GOALKEEPER_CONFIRMED',
  MARKET_COHERENT: 'MARKET_COHERENT', LOWER_BOUND_PASS: 'LOWER_BOUND_PASS', PRICE_EXPIRED: 'PRICE_EXPIRED',
  LINEUP_BLOCK: 'LINEUP_BLOCK', SETTLEMENT_BLOCK: 'SETTLEMENT_BLOCK', DATA_BLOCK: 'DATA_BLOCK',
  MODEL_DISAGREEMENT: 'MODEL_DISAGREEMENT', CORRELATION_BLOCK: 'CORRELATION_BLOCK', REST_TRAVEL_STABLE: 'REST_TRAVEL_STABLE',
});
const ESTADOS = Object.freeze({ ELITE: 'Elite Signal', STRONG: 'Strong Signal', LEAN: 'Lean Signal', DETECTED: 'Signal Detected', NONE: 'No Signal' });
const RANGO_ESTADO = { 'Elite Signal': 4, 'Strong Signal': 3, 'Lean Signal': 2, 'Signal Detected': 1, 'No Signal': 0 };

// ══ 2 · NÚCLEO MATEMÁTICO (SE §3) ═════════════════════════════════════════════
const sum = a => a.reduce((s, x) => s + x, 0);
const media = a => a.length ? sum(a) / a.length : NaN;
const mediana = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Cuotas: la original se conserva; se normaliza a decimal y americana (SE §3)
const decAAm = d => { d = +d; if (!(d > 1)) return null; return d >= 2 ? Math.round((d - 1) * 100) : -Math.round(100 / (d - 1)); };
const amADec = a => { a = +a; if (!a || a > -100 && a < 100) return null; return a > 0 ? 1 + a / 100 : 1 + 100 / (-a); };
// No-vig: cuatro métodos por casa (SE §3 / 4.1 mkt_devig_spread); referencia = Shin (S6)
const NOVIG = {
  mult: q => { const s = sum(q); return q.map(x => x / s); },
  add:  q => { const k = (sum(q) - 1) / q.length; let p = q.map(x => x - k); if (p.some(x => x <= 0)) { p = p.map(x => Math.max(1e-4, x)); const t = sum(p); p = p.map(x => x / t); } return p; },
  power: q => { let lo = .2, hi = 8; for (let i = 0; i < 80; i++) { const k = (lo + hi) / 2; (sum(q.map(x => Math.pow(x, k))) > 1) ? lo = k : hi = k; } const k = (lo + hi) / 2, p = q.map(x => Math.pow(x, k)), t = sum(p); return p.map(x => x / t); },
  shin: q => { const S = sum(q), pz = (z, x) => (Math.sqrt(z * z + 4 * (1 - z) * x * x / S) - z) / (2 * (1 - z)); const f = z => sum(q.map(x => pz(z, x)));
    if (f(0) <= 1) return NOVIG.mult(q); let lo = 0, hi = .95; for (let i = 0; i < 100; i++) { const z = (lo + hi) / 2; f(z) > 1 ? lo = z : hi = z; }
    const z = (lo + hi) / 2, p = q.map(x => pz(z, x)), t = sum(p); return p.map(x => x / t); },
};
// Quita el margen a UNA casa: recibe decimales del set completo y mutuamente excluyente.
function noVigCasa(decs) {
  if (!decs || decs.some(d => !(d > 1))) return null;
  const q = decs.map(d => 1 / d), overround = sum(q) - 1, out = { overround };
  for (const m of CONFIG.novig.metodos) out[m] = NOVIG[m](q);
  out.ref = out[CONFIG.novig.referencia];
  return out;
}
// Consenso robusto entre casas aprobadas: mediana por selección (SE 4.1 mkt_consensus_novig_p)
function consenso(filas) {          // filas = [{book_id, decs:[...]}]
  const porCasa = filas.map(f => ({ book_id: f.book_id, nv: noVigCasa(f.decs) })).filter(x => x.nv);
  if (!porCasa.length) return null;
  const n = porCasa[0].nv.ref.length, porMetodo = {};
  for (const m of CONFIG.novig.metodos) { const v = [...Array(n)].map((_, i) => mediana(porCasa.map(c => c.nv[m][i]))); const t = sum(v); porMetodo[m] = v.map(x => x / t); }
  const ref = porMetodo[CONFIG.novig.referencia];
  const spread = Math.max(...[...Array(n)].map((_, i) => { const v = CONFIG.novig.metodos.map(m => porMetodo[m][i]); return Math.max(...v) - Math.min(...v); }));
  const disp = [...Array(n)].map((_, i) => { const v = porCasa.map(c => c.nv.ref[i]); return Math.max(...v) - Math.min(...v); });
  const sharp = porCasa.find(c => CONFIG.casas.sharp.includes(c.book_id));
  return { p: ref, porMetodo, devig_spread: spread, dispersion: disp, overround: mediana(porCasa.map(c => c.nv.overround)),
           sharp_p: sharp ? sharp.nv.ref : null, casas: porCasa.length, porCasa };
}
// Distribuciones
const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const pois = (k, l) => Math.exp(-l) * Math.pow(l, k) / fact(k);
const tauDC = (x, y, lh, la, rho) => x === 0 && y === 0 ? 1 - lh * la * rho : x === 0 && y === 1 ? 1 + lh * rho : x === 1 && y === 0 ? 1 + la * rho : x === 1 && y === 1 ? 1 - rho : 1;
function rejillaDC(lh, la, rho, MAX = CONFIG.rejilla.max) {
  const G = []; let norm = 0;
  for (let x = 0; x <= MAX; x++) { G[x] = []; for (let y = 0; y <= MAX; y++) { const v = tauDC(x, y, lh, la, rho) * pois(x, lh) * pois(y, la); G[x][y] = v; norm += v; } }
  for (let x = 0; x <= MAX; x++) for (let y = 0; y <= MAX; y++) G[x][y] /= norm;
  return G;
}
// Bivariado de Poisson (Karlis-Ntzoufras): X = X1+X3, Y = X2+X3, λ3 compartido (S12)
function rejillaBiv(lh, la, l3, MAX = CONFIG.rejilla.max) {
  const l1 = Math.max(.05, lh - l3), l2 = Math.max(.05, la - l3), G = []; let norm = 0;
  const e = Math.exp(-(l1 + l2 + l3));
  for (let x = 0; x <= MAX; x++) { G[x] = []; for (let y = 0; y <= MAX; y++) { let s = 0;
    for (let k = 0; k <= Math.min(x, y); k++) s += Math.pow(l1, x - k) / fact(x - k) * Math.pow(l2, y - k) / fact(y - k) * Math.pow(l3, k) / fact(k);
    G[x][y] = e * s; norm += G[x][y]; } }
  for (let x = 0; x <= MAX; x++) for (let y = 0; y <= MAX; y++) G[x][y] /= norm;
  return G;
}
const mezclaRejillas = (A, B) => A.map((f, x) => f.map((v, y) => (v + B[x][y]) / 2));
const sumaRejilla = (G, f) => { let p = 0; for (let x = 0; x < G.length; x++) for (let y = 0; y < G.length; y++) if (f(x, y)) p += G[x][y]; return p; };
// Liquidación por estados (SE §3, Master §2): +1 win · +0.5 half-win · 0 push · −0.5 half-loss · −1 loss
function unidad(valor, linea, lado) {        // lado 'over': gana si valor > línea ; 'under': gana si valor < línea
  const q = Math.round(linea * 4);
  if (((q % 2) + 2) % 2 !== 0) return 0.5 * (unidad(valor, (q - 1) / 4, lado) + unidad(valor, (q + 1) / 4, lado));
  const d = lado === 'over' ? valor - linea : linea - valor;
  return Math.abs(d) < 1e-9 ? 0 : d > 0 ? 1 : -1;
}
// Unidad de retorno de una selección dado el marcador (x local, y visita)
function unidadSel(mercado, sel, linea, x, y) {
  switch (mercado) {
    case '1X2': return (sel === 'HOME' ? x > y : sel === 'AWAY' ? y > x : x === y) ? 1 : -1;
    case 'DOUBLE_CHANCE': return (sel === '1X' ? x >= y : sel === 'X2' ? y >= x : x !== y) ? 1 : -1;
    case 'DNB': return x === y ? 0 : ((sel === 'HOME' ? x > y : y > x) ? 1 : -1);
    case 'BTTS': return ((x > 0 && y > 0) === (sel === 'YES')) ? 1 : -1;
    case 'ASIAN_HANDICAP': { const m = sel === 'HOME' ? x - y : y - x; return unidad(m, -linea, 'over'); }   // cubre si margen > −línea; el cuarto parte la apuesta en las dos líneas vecinas
    case 'MATCH_GOALS': return unidad(x + y, linea, sel === 'OVER' ? 'over' : 'under');
    case 'TEAM_GOALS_HOME': return unidad(x, linea, sel === 'OVER' ? 'over' : 'under');
    case 'TEAM_GOALS_AWAY': return unidad(y, linea, sel === 'OVER' ? 'over' : 'under');
  }
  return null;
}
// Masa por estado y EV al precio decimal d (SE §3 "Asian-line EV")
function masaEstados(G, mercado, sel, linea) {
  const m = { win: 0, half_win: 0, push: 0, half_loss: 0, loss: 0 };
  for (let x = 0; x < G.length; x++) for (let y = 0; y < G.length; y++) { const u = unidadSel(mercado, sel, linea, x, y); const p = G[x][y];
    if (u === 1) m.win += p; else if (u === .5) m.half_win += p; else if (u === 0) m.push += p; else if (u === -.5) m.half_loss += p; else m.loss += p; }
  return m;
}
const evDeMasa = (m, d) => m.win * (d - 1) + m.half_win * (d - 1) / 2 - m.half_loss / 2 - m.loss;
const pCobertura = m => m.win + m.half_win * .5 + m.push * .5;      // solo para mostrar; el edge_pp exige comparabilidad
// PRNG determinista (mismo snapshot ⇒ mismo resultado)
function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const normal = r => { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const hashFNV = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };

// ══ 3 · MODELO: FUERZAS POR COMPETICIÓN (SE §3, §5, §5.1) ═════════════════════
// Acumuladores con decaimiento exponencial exp(−λ·días) aplicado de forma perezosa,
// separados local/visita, con Σw y Σw² para el ESS. Dos familias:
//   A · goles → Dixon-Coles (ρ versionado)          B · mezcla xG/goles → bivariado (λ3)
function nuevoAcum() { return { t: null, w: 0, w2: 0, gf: 0, ga: 0 }; }
function decae(a, t, lam) { if (a.t == null) { a.t = t; return; } const f = Math.exp(-lam * Math.max(0, (t - a.t) / 864e5)); a.w *= f; a.w2 *= f * f; a.gf *= f; a.ga *= f; a.t = t; }
function Fuerzas(H, K) {
  const lam = Math.log(2) / H, eq = new Map();
  const get = id => { if (!eq.has(id)) eq.set(id, { H: nuevoAcum(), A: nuevoAcum(), nombre: '' }); return eq.get(id); };
  const lg = { H: nuevoAcum(), A: nuevoAcum() };
  return {
    H, K,
    agrega(p, gH, gA) {                 // p = partido (ids + fecha), gH/gA = valor observado (goles o mezcla xG)
      const t = +new Date(p.date), h = get(p.homeId), a = get(p.awayId); h.nombre = p.home; a.nombre = p.away;
      for (const acc of [h.H, a.A, lg.H, lg.A]) decae(acc, t, lam);
      h.H.w++; h.H.w2++; h.H.gf += gH; h.H.ga += gA;
      a.A.w++; a.A.w2++; a.A.gf += gA; a.A.ga += gH;
      lg.H.w++; lg.H.w2++; lg.H.gf += gH; lg.A.w++; lg.A.w2++; lg.A.gf += gA;
    },
    lambdas(homeId, awayId, t) {
      const h = eq.get(homeId), a = eq.get(awayId); if (!h || !a) return null;
      for (const acc of [h.H, a.A, lg.H, lg.A]) decae(acc, t, lam);
      const muH = lg.H.w > 0 ? lg.H.gf / lg.H.w : 1.45, muA = lg.A.w > 0 ? lg.A.gf / lg.A.w : 1.15;
      const attH = ((h.H.gf + K * muH) / (h.H.w + K)) / muH, defH = ((h.H.ga + K * muA) / (h.H.w + K)) / muA;
      const attA = ((a.A.gf + K * muA) / (a.A.w + K)) / muA, defA = ((a.A.ga + K * muH) / (a.A.w + K)) / muH;
      const ess = acc => acc.w2 > 0 ? acc.w * acc.w / acc.w2 : 0;
      return { lh: Math.max(.15, muH * attH * defA), la: Math.max(.15, muA * attA * defH), muH, muA,
               essH: ess(h.H), essA: ess(a.A), attH, defH, attA, defA, nombreH: h.nombre, nombreA: a.nombre };
    },
    equipos: () => eq,
  };
}
// Walk-forward sobre la temporada anterior: elige (H, ρ, K) que minimiza el log loss 1X2
// de la familia A. Nunca mira el partido objetivo (SE §5 "never pick a window after seeing the result").
function ajustar(partidosPrev) {
  const ps = [...partidosPrev].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (ps.length < 60) return { H: 120, rho: -0.05, K: 6, ajustado: false, n: ps.length };
  const desde = Math.floor(ps.length * (1 - CONFIG.ajuste.fraccion_prueba));
  let mejor = null;
  for (const H of CONFIG.ajuste.H) for (const K of CONFIG.ajuste.K) for (const rho of CONFIG.ajuste.rho) {
    const F = Fuerzas(H, K); let ll = 0, n = 0;
    ps.forEach((p, i) => { if (i >= desde) { const L = F.lambdas(p.homeId, p.awayId, +new Date(p.date)); if (L) { const G = rejillaDC(L.lh, L.la, rho);
      const pr = [sumaRejilla(G, (x, y) => x > y), sumaRejilla(G, (x, y) => x === y), sumaRejilla(G, (x, y) => x < y)];
      const o = p.hg > p.ag ? 0 : p.hg === p.ag ? 1 : 2; ll -= Math.log(Math.max(1e-6, pr[o])); n++; } } F.agrega(p, p.hg, p.ag); });
    const s = n ? ll / n : 9;
    if (!mejor || s < mejor.logloss) mejor = { H, rho, K, logloss: s, n, ajustado: true };
  }
  return mejor;
}
function construirModelo(partidosPrev, partidosCur, xgDe) {
  const cfg = ajustar(partidosPrev);
  const A = Fuerzas(cfg.H, cfg.K), B = Fuerzas(cfg.H, cfg.K);
  const todos = [...partidosPrev, ...partidosCur].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  let conXg = 0;
  for (const p of todos) { A.agrega(p, p.hg, p.ag);
    const x = xgDe(p.id); const w = CONFIG.xg.peso;
    if (x && x.xg_h != null && x.xg_a != null) { conXg++; B.agrega(p, w * x.xg_h + (1 - w) * p.hg, w * x.xg_a + (1 - w) * p.ag); } else B.agrega(p, p.hg, p.ag); }
  const cobertura = todos.length ? conXg / todos.length : 0;
  return { cfg, A, B, partidos: todos.length, cobertura_xg: cobertura, xg_suficiente: cobertura >= CONFIG.xg.cobertura_min };
}
// Distribuciones conjuntas de un partido con incertidumbre (bootstrap paramétrico, S18)
function distribucionesPartido(modelo, homeId, awayId, kickoff, semilla) {
  const LA = modelo.A.lambdas(homeId, awayId, kickoff), LB = modelo.B.lambdas(homeId, awayId, kickoff);
  if (!LA || !LB) return null;
  const GA = rejillaDC(LA.lh, LA.la, modelo.cfg.rho), GB = rejillaBiv(LB.lh, LB.la, CONFIG.bivariado.lambda3);
  const G = mezclaRejillas(GA, GB);
  const K = modelo.cfg.K, sdH = CONFIG.lcb.escala_sd * Math.sqrt(1 / (LA.essH + K) + 1 / (LA.essA + K)), sdA = sdH;
  const r = prng(semilla), draws = [];
  for (let i = 0; i < CONFIG.lcb.draws; i++) { const zh = normal(r), za = normal(r);
    draws.push(mezclaRejillas(rejillaDC(LA.lh * Math.exp(sdH * zh), LA.la * Math.exp(sdA * za), modelo.cfg.rho), rejillaBiv(LB.lh * Math.exp(sdH * zh), LB.la * Math.exp(sdA * za), CONFIG.bivariado.lambda3))); }
  const ess = Math.min(LA.essH, LA.essA);
  return { G, GA, GB, LA, LB, draws, ess, sd_log: sdH, familias: ['A:dixon_coles_goles', 'B:bivariado_' + (modelo.xg_suficiente ? 'xg' : 'goles(xg_insuficiente)')] };
}

// ══ 4 · ADAPTADOR API-FOOTBALL (Master §3, §10) ═══════════════════════════════
const AF = (() => {
  const BASE = 'https://v3.football.api-sports.io';
  let usados = 0, restantes = null;
  async function get(path, intento = 0) {
    const key = (typeof getAfKey === 'function' ? getAfKey() : '') || '';
    if (!key) throw new Error('Sin key de API-Football (app_config.af_key).');
    let r;
    try { r = await fetch(BASE + path, { headers: { 'x-apisports-key': key } }); }
    catch (e) { if (intento < 2) { await new Promise(s => setTimeout(s, 800 * (intento + 1))); return get(path, intento + 1); } throw e; }
    usados++;
    const rem = r.headers.get('x-ratelimit-requests-remaining'); if (rem != null) restantes = +rem;
    if (r.status === 429 && intento < 3) { await new Promise(s => setTimeout(s, 1500 * (intento + 1))); return get(path, intento + 1); }
    if (!r.ok) throw new Error('API-Football HTTP ' + r.status + ' en ' + path);
    const j = await r.json();
    const errs = j.errors; const nErr = Array.isArray(errs) ? errs.length : (errs ? Object.keys(errs).length : 0);
    if (nErr) throw new Error('API-Football: ' + JSON.stringify(errs));
    return j;
  }
  // Solo /odds pagina. /fixtures RECHAZA el parámetro page: la 1ª llamada va siempre sin él.
  async function todas(path) { const f = await get(path); let out = f.response || []; const total = f.paging?.total || 1;
    for (let p = 2; p <= total && p <= 30; p++) { const j = await get(`${path}${path.includes('?') ? '&' : '?'}page=${p}`); out = out.concat(j.response || []); } return out; }
  return { get, todas, usados: () => usados, restantes: () => restantes, reinicia: () => { usados = 0; } };
})();
// Normaliza las cuotas de un fixture: cada valor conserva la etiqueta original y se mapea a UN canónico.
function normalizarCuotas(o) {
  const out = [];
  for (const bk of o.bookmakers || []) for (const bet of bk.bets || []) {
    const mk = BET_A_MERCADO[bet.id]; const esPOD = CONFIG.pod.mercados[bet.id];
    for (const v of bet.values || []) { const dec = +v.odd; if (!(dec > 1)) continue;
      const base = { book_id: bk.id, book: bk.name, bet_id: bet.id, etiqueta: bet.name, valor: v.value, dec, am: decAAm(dec) };
      if (bet.id === 2) { out.push({ ...base, mercado: 'HOME_AWAY_UNTYPED', sel: v.value.toUpperCase(), linea: null }); continue; }
      if (esPOD) { const m = /^(.+?)\s+-\s+(\d+(?:\.\d+)?)$/.exec(v.value); if (m) out.push({ ...base, mercado: esPOD, jugador: m[1], umbral: +m[2], sel: 'OVER', linea: +m[2] - 0.5, lado_unico: true }); continue; }
      if (!mk) continue;
      const M = MERCADOS[mk]; if (M.fase !== 1) { out.push({ ...base, mercado: mk, fase: 2, sel: v.value, linea: null }); continue; }
      let sel = null, linea = null, m;
      if (mk === '1X2') sel = { Home: 'HOME', Draw: 'DRAW', Away: 'AWAY' }[v.value];
      else if (mk === 'DOUBLE_CHANCE') sel = { 'Home/Draw': '1X', 'Home/Away': '12', 'Draw/Away': 'X2' }[v.value];
      else if (mk === 'BTTS') sel = { Yes: 'YES', No: 'NO' }[v.value];
      else if (mk === 'ASIAN_HANDICAP') { m = /^(Home|Away)\s+([+-]?\d+(?:\.\d+)?)$/.exec(v.value); if (m) { sel = m[1].toUpperCase(); const L = +m[2]; linea = sel === 'HOME' ? L : -L; } }   // formato del proveedor: 'Home -1' y 'Away -1' son los DOS lados de la línea −1 del local (visitante +1)
      else { m = /^(Over|Under)\s+(\d+(?:\.\d+)?)$/.exec(v.value); if (m) { sel = m[1].toUpperCase(); linea = +m[2]; } }
      if (!sel) continue;
      out.push({ ...base, mercado: mk, sel, linea });
    }
  }
  return out;
}

// ══ 5 · CANDIDATOS, PRECIOS Y EV ══════════════════════════════════════════════
// Agrupa cotizaciones en sets completos por casa (SE §5: "exact mutually exclusive outcome set from the same book/time")
function setsPorCasa(cuotas, mercado, linea) {
  const M = MERCADOS[mercado], porCasa = new Map();
  for (const q of cuotas) { if (q.mercado !== mercado) continue;
    if (M.linea) { const lq = mercado === 'ASIAN_HANDICAP' ? (q.sel === 'HOME' ? q.linea : -q.linea) : q.linea; if (Math.abs(lq - linea) > 1e-9) continue; }
    if (!porCasa.has(q.book_id)) porCasa.set(q.book_id, { book_id: q.book_id, book: q.book, por: {} });
    porCasa.get(q.book_id).por[q.sel] = q; }
  const filas = [];
  for (const c of porCasa.values()) { if (M.sels.every(s => c.por[s])) filas.push({ book_id: c.book_id, book: c.book, decs: M.sels.map(s => c.por[s].dec), q: c.por }); }
  return filas;
}
function lineasDe(cuotas, mercado) { const s = new Set(); for (const q of cuotas) if (q.mercado === mercado && q.linea != null) s.add(mercado === 'ASIAN_HANDICAP' ? (q.sel === 'HOME' ? q.linea : -q.linea) : q.linea); return [...s].sort((a, b) => a - b); }
// Precio ejecutable: mejor cuota aprobada que NO sea un outlier aislado (SE 4.1 mkt_median_line / stale outlier, S15)
function precioEjecutable(filas, idx, pMediana) {
  const ordenadas = filas.map(f => ({ dec: f.decs[idx], book: f.book, book_id: f.book_id })).sort((a, b) => b.dec - a.dec);
  let excluidas = 0;
  for (const o of ordenadas) { const implied = 1 / o.dec; if (pMediana - implied <= CONFIG.outlier_pp) return { ...o, excluidas }; excluidas++; }
  return null;
}
// Construye TODOS los candidatos de un partido (Fase 1)
function candidatosDe(fx, cuotas, dist, ctx) {
  const C = [];
  const push = (mercado, sel, linea, filas, cons, idx, derivado) => {
    const M = MERCADOS[mercado]; const pM = cons.p[idx];
    const px = precioEjecutable(filas, idx, pM); if (!px) return C.push({ ...base(mercado, sel, linea), sin_precio: true, codes: [RC.DATA_BLOCK], detalle: 'todas las cotizaciones son outliers o no hay precio', estado: ESTADOS.NONE });
    const masa = dist ? masaEstados(dist.G, mercado, sel, linea) : null;
    const pA = dist ? pCobertura(masaEstados(dist.GA, mercado, sel, linea)) : null, pB = dist ? pCobertura(masaEstados(dist.GB, mercado, sel, linea)) : null;
    // S19 · calibración provisional: el consenso es el prior (SE 4.1) y el modelo lo mueve con peso w = ESS/(ESS+K_m)
    const w = dist ? dist.ess / (dist.ess + CONFIG.calibracion.K_m) : 0;
    const evModelo = masa ? evDeMasa(masa, px.dec) : null, evMercado = pM * (px.dec - 1) - (1 - pM);
    const ev = masa ? w * evModelo + (1 - w) * evMercado : null;
    let se = null, lcb = null;
    if (dist) { const evs = dist.draws.map(g => evDeMasa(masaEstados(g, mercado, sel, linea), px.dec)); const m = media(evs);
      const within = media(evs.map(e => (e - m) * (e - m))); const evA = evDeMasa(masaEstados(dist.GA, mercado, sel, linea), px.dec), evB = evDeMasa(masaEstados(dist.GB, mercado, sel, linea), px.dec);
      const between = (evA - evB) * (evA - evB) / 4; se = w * Math.sqrt(within + between); lcb = ev - CONFIG.lcb.k * se; }
    const conPush = masa && (masa.push + masa.half_win + masa.half_loss) > 1e-9;
    const pRaw = masa ? pCobertura(masa) : null, pModel = masa ? pM + w * (pRaw - pM) : null;
    C.push({ ...base(mercado, sel, linea), filas: filas.length, casas: filas.map(f => f.book), cons, p_novig: pM, sharp_p: cons.sharp_p ? cons.sharp_p[idx] : null,
      dispersion: cons.dispersion[idx], overround: cons.overround, devig_spread: cons.devig_spread, book: px.book, book_id: px.book_id, dec: px.dec, am: decAAm(px.dec), outliers_excluidos: px.excluidas,
      derivado, masa, p_model: pModel, p_raw: pRaw, w_modelo: +w.toFixed(3), ev_modelo: evModelo, ev_mercado: evMercado, p_A: pA, p_B: pB, edge_pp: (masa && !conPush) ? (pModel - pM) : null, ev, se, ev_lcb: lcb, fair_dec: pModel > 0 ? 1 / pModel : null,
      con_push: !!conPush, codes: [], estado: null });
  };
  const base = (mercado, sel, linea) => ({ key: `${fx.id}|${mercado}|${sel}|${linea ?? ''}`, fixture_id: fx.id, mercado, nombre: MERCADOS[mercado].nombre, sel, linea, tesis: tesisDe(mercado, sel, linea), periodo: MERCADOS[mercado].periodo, settlement_rule_id: VERSIONES.reglas + ':' + mercado });
  // 1X2 (set de 3 salidas por casa)
  const f1 = setsPorCasa(cuotas, '1X2', null), c1 = f1.length ? consenso(f1) : null;
  if (c1) MERCADOS['1X2'].sels.forEach((s, i) => push('1X2', s, null, f1, c1, i, false));
  // Doble oportunidad: P_market derivada del 1X2 (suma de estados, sin renormalizar); las cuotas DC solo dan precio + coherencia
  const fdc = setsPorCasa(cuotas, 'DOUBLE_CHANCE', null);
  if (c1 && fdc.length) { const pd = [c1.p[0] + c1.p[1], c1.p[0] + c1.p[2], c1.p[1] + c1.p[2]];
    const cdc = consenso(fdc); const gap = cdc ? Math.max(...pd.map((p, i) => Math.abs(p - cdc.p[i] * 2 / sum(cdc.p) * (sum(pd) / 2) ))) : 0;   // gap aproximado de derivada
    const consDC = { p: pd, porMetodo: {}, devig_spread: c1.devig_spread, dispersion: cdc ? cdc.dispersion : [0, 0, 0], overround: cdc ? cdc.overround : null, sharp_p: c1.sharp_p ? [c1.sharp_p[0] + c1.sharp_p[1], c1.sharp_p[0] + c1.sharp_p[2], c1.sharp_p[1] + c1.sharp_p[2]] : null, casas: fdc.length, derivative_gap: gap };
    MERCADOS['DOUBLE_CHANCE'].sels.forEach((s, i) => push('DOUBLE_CHANCE', s, null, fdc, consDC, i, true)); }
  // BTTS
  const fb = setsPorCasa(cuotas, 'BTTS', null), cb = fb.length ? consenso(fb) : null;
  if (cb) MERCADOS['BTTS'].sels.forEach((s, i) => push('BTTS', s, null, fb, cb, i, false));
  // Con línea: AH, totales, team totals — cada línea es un candidato distinto (SE §5)
  for (const mk of ['ASIAN_HANDICAP', 'MATCH_GOALS', 'TEAM_GOALS_HOME', 'TEAM_GOALS_AWAY']) for (const L of lineasDe(cuotas, mk)) {
    const f = setsPorCasa(cuotas, mk, L), c = f.length ? consenso(f) : null; if (!c) continue;
    MERCADOS[mk].sels.forEach((s, i) => push(mk, s, mk === 'ASIAN_HANDICAP' ? (s === 'HOME' ? L : -L) : L, f, c, i, false)); }
  // DNB: bloqueado por etiqueta sin tipar (SE 1.1.1)
  const ha = cuotas.filter(q => q.mercado === 'HOME_AWAY_UNTYPED');
  if (ha.length) C.push({ ...base('DNB', 'HOME', null), estado: ESTADOS.NONE, codes: [RC.SETTLEMENT_BLOCK], detalle: `"Home/Away" (bet 2) en ${new Set(ha.map(q => q.book_id)).size} casa(s): etiqueta de dos vías sin tipar; no se acepta (SE §1.1.1)`, bloqueado: true });
  return C;
}

// ══ 6 · CALIDAD, PUERTAS, SCORES Y TIERS (SE §7, §7.1; Master §6) ═════════════
function dqDe(c, ctx) {
  const req = { cotizacion: !!c.dec, set_completo: !!c.cons, modelo_A: c.p_A != null, modelo_B: c.p_B != null, bajas: ctx.injury_feed, arbitro: !!ctx.fx.referee, sede: !!ctx.fx.venue, inicio: !!ctx.fx.kickoff };
  const faltan = Object.keys(req).filter(k => !req[k]);
  const completitud = 100 * (Object.keys(req).length - faltan.length) / Object.keys(req).length;
  const frescura = clamp(100 * (1 - Math.max(0, ctx.quote_age_min - 30) / (1440 - 30)), 0, 100);
  const acuerdo = c.dispersion != null ? clamp(100 * (1 - c.dispersion / .05), 0, 100) : 0;
  const alineacion = ctx.lineup === 'CONFIRMED' ? 100 : ctx.injury_feed ? 40 : 0;
  const dq = Math.round(.40 * completitud + .25 * frescura + .20 * acuerdo + .15 * alineacion);
  return { dq, completitud, frescura, acuerdo, alineacion, faltan };
}
// Siete componentes SE §7.1 (0–100) con transformación documentada + los cinco scores del Master §6
function scoresDe(c, ctx, dq) {
  const ess = ctx.dist ? ctx.dist.ess : 0;
  const teamXg = clamp(100 * Math.min(1, ess / CONFIG.ess_pleno) * (ctx.xg_suficiente ? 1 : .7), 0, 100);
  const xiGk = ctx.lineup === 'CONFIRMED' ? (ctx.gk_confirmed ? 100 : 80) : (ctx.injury_feed ? 30 : 15);
  const roleMin = 100;                                    // mercados de equipo: no aplica (documentado)
  const tactics = 0;                                      // familia 4.7/4.9 NO disponible → 0, marcado unavailable
  const context = (ctx.rest_known ? 50 : 0) + (ctx.injury_feed ? 25 : 0) + (ctx.fx.referee ? 25 : 0);
  const evPart = c.ev != null ? clamp(c.ev / .08, 0, 1) : 0, lcbPart = c.ev_lcb != null && c.ev_lcb > 0 ? 1 : 0;
  const marketValue = clamp(100 * (.5 * evPart + .2 * lcbPart + .15 * Math.min(1, (c.filas || 0) / 8) + .15 * (1 - Math.min(1, (c.dispersion || 0) / .05))), 0, 100);
  const comp = [teamXg, xiGk, roleMin, tactics, context, marketValue, dq.dq];
  const pesos = CONFIG.pesos[MERCADOS[c.mercado].pesos] || CONFIG.pesos.resultado;
  const composite = sum(comp.map((v, i) => v * pesos[i])) / 100;
  const acuerdo = c.p_A != null && c.p_B != null && Math.abs(c.p_A - c.p_B) <= CONFIG.acuerdo_max_pp / 100;
  const estabilidad = c.se != null ? clamp(100 * (1 - Math.min(1, c.se / .05)), 0, 100) : 0;
  const cinco = { edge_strength: Math.round(100 * evPart), confidence: Math.round(100 * (acuerdo ? 1 : .5) * Math.min(1, ess / CONFIG.ess_pleno)), data_quality: dq.dq,
                  stability: Math.round(estabilidad), market_quality: Math.round(100 * (.5 * Math.min(1, (c.filas || 0) / 8) + .3 * (1 - Math.min(1, (c.overround || .1) / .1)) + .2 * (1 - Math.min(1, (c.dispersion || 0) / .05)))) };
  return { componentes: { team_xg: teamXg, xi_gk: xiGk, role_min: roleMin, tactics, context, market_value: marketValue, quality: dq.dq }, pesos, composite: +composite.toFixed(2), acuerdo, estabilidad, cinco, unavailable: ['tactics'] };
}
// Puertas duras SE §7 (universales) → si falla alguna: No Signal
function puertasUniversales(c, ctx) {
  const codes = [], det = [];
  if (c.bloqueado || c.sin_precio) return { ok: false, codes: c.codes, det: [c.detalle] };
  if (ctx.quote_age_min > CONFIG.frescura_min.detected) { codes.push(RC.DATA_BLOCK); det.push(`cotización con ${Math.round(ctx.quote_age_min)} min de edad`); }
  if (ctx.fx.status !== 'NS' && ctx.fx.status !== 'TBD') { codes.push(RC.DATA_BLOCK); det.push('evento no está programado (estado ' + ctx.fx.status + ')'); }
  if (!ctx.dist) { codes.push(RC.DATA_BLOCK); det.push('sin modelo para esta competición o equipo (cobertura insuficiente)'); }
  if (c.derivado && c.cons.derivative_gap > CONFIG.derivada_max_pp) { codes.push(RC.DATA_BLOCK); det.push(`incoherencia derivada DC vs 1X2 de ${(c.cons.derivative_gap * 100).toFixed(1)} pp`); }
  if (c.outliers_excluidos) det.push(`${c.outliers_excluidos} cotización(es) fuera de consenso ignorada(s)`);
  return { ok: !codes.length, codes, det };
}
function asignarTiers(cands, ctxDe) {
  // 1 · puertas universales, DQ, scores
  for (const c of cands) { const ctx = ctxDe(c); c.ctx_resumen = { lineup: ctx.lineup, gk: ctx.gk_confirmed, quote_age_min: Math.round(ctx.quote_age_min), ventana: ctx.ventana, injury_feed: ctx.injury_feed, bajas: ctx.bajas };
    const pu = puertasUniversales(c, ctx); c.detalles = pu.det;
    if (!pu.ok) { c.estado = ESTADOS.NONE; c.codes = [...new Set([...(c.codes || []), ...pu.codes])]; continue; }
    c.dq = dqDe(c, ctx); c.scores = scoresDe(c, ctx, c.dq); }
  // 2 · percentil dentro del slate (A1): candidatos ejecutables con EV > 0
  const ejec = cands.filter(c => c.estado !== ESTADOS.NONE && c.ev != null && c.ev > 0).sort((a, b) => b.scores.composite - a.scores.composite || b.ev - a.ev);
  ejec.forEach((c, i) => { c.percentil = +((ejec.length - i) / ejec.length).toFixed(4); c.rank = i + 1; });
  // 3 · tier de Elite hacia abajo con razón de downgrade; XI sin confirmar → Signal Detected con tier provisional
  for (const c of cands) { if (c.estado === ESTADOS.NONE) continue;
    const ctx = ctxDe(c), T = CONFIG.tiers, codes = [], down = [];
    if (!(c.ev > 0)) { c.estado = ESTADOS.NONE; c.codes = [RC.VALUE + '_ABSENT']; c.detalles.push('EV ≤ 0 al precio ejecutable'); continue; }
    codes.push(RC.VALUE); if (c.scores.acuerdo) codes.push('MODEL_AGREEMENT'); if (c.ev_lcb > 0) codes.push(RC.LOWER_BOUND_PASS); if (!c.outliers_excluidos) codes.push(RC.MARKET_COHERENT);
    const fresca = lim => ctx.quote_age_min <= lim;
    const elite = c.ev >= T.elite.ev && c.percentil >= T.elite.pct && c.ev_lcb >= T.elite.lcb && c.dq.dq >= T.elite.dq && c.scores.acuerdo && fresca(CONFIG.frescura_min.elite);
    if (!elite) down.push('Elite: ' + [c.ev < T.elite.ev && `EV ${(c.ev * 100).toFixed(1)}% < 4.5%`, c.percentil < T.elite.pct && `percentil ${Math.round(c.percentil * 100)} < 98`, c.ev_lcb < T.elite.lcb && `EV_LCB ${(c.ev_lcb * 100).toFixed(1)}% < 1.0%`, c.dq.dq < T.elite.dq && `DQ ${c.dq.dq} < 95`, !c.scores.acuerdo && 'modelos en desacuerdo', !fresca(CONFIG.frescura_min.elite) && 'cotización no fresca'].filter(Boolean).join(', '));
    const strong = !elite && c.ev >= T.strong.ev && c.percentil >= T.strong.pct && c.ev_lcb >= T.strong.lcb && c.dq.dq >= T.strong.dq && c.scores.acuerdo && fresca(CONFIG.frescura_min.strong);
    if (!elite && !strong) down.push('Strong: ' + [c.ev < T.strong.ev && `EV < 3.0%`, c.percentil < T.strong.pct && `percentil ${Math.round(c.percentil * 100)} < 95`, c.ev_lcb < T.strong.lcb && 'EV_LCB < 0', c.dq.dq < T.strong.dq && `DQ ${c.dq.dq} < 90`, !c.scores.acuerdo && 'modelos en desacuerdo', !fresca(CONFIG.frescura_min.strong) && 'cotización no fresca'].filter(Boolean).join(', '));
    const lean = !elite && !strong && c.ev >= T.lean.ev && c.percentil >= T.lean.pct && c.dq.dq >= T.lean.dq && c.scores.estabilidad >= CONFIG.estabilidad_min && fresca(CONFIG.frescura_min.lean);
    if (!elite && !strong && !lean) down.push('Lean: ' + [c.ev < T.lean.ev && `EV < 1.5%`, c.percentil < T.lean.pct && `percentil ${Math.round(c.percentil * 100)} < 85`, c.dq.dq < T.lean.dq && `DQ ${c.dq.dq} < 80`, c.scores.estabilidad < CONFIG.estabilidad_min && 'insumo frágil domina (estabilidad baja)', !fresca(CONFIG.frescura_min.lean) && 'cotización no fresca'].filter(Boolean).join(', '));
    const tier = elite ? ESTADOS.ELITE : strong ? ESTADOS.STRONG : lean ? ESTADOS.LEAN : null;
    if (!c.scores.acuerdo) codes.push(RC.MODEL_DISAGREEMENT);
    c.downgrade = down;
    if (tier && ctx.lineup !== 'CONFIRMED') { c.estado = ESTADOS.DETECTED; c.provisional = tier; codes.push(RC.LINEUP_BLOCK); c.detalles.push('XI oficial no disponible todavía: calificaría como ' + tier + ' (SE §8 "qualify provisionally")'); }
    else if (tier) { c.estado = tier; codes.push(RC.LINEUP_CONFIRMED); if (ctx.gk_confirmed) codes.push(RC.GOALKEEPER_CONFIRMED); }
    else c.estado = ESTADOS.DETECTED;
    c.codes = [...new Set(codes)];
  }
  // 4 · correlación (SE §1.3, S16): una tesis por partido; el resto se bloquea con CORRELATION_BLOCK
  const reservadas = new Map();
  const orden = cands.filter(c => RANGO_ESTADO[c.estado] >= 2).sort((a, b) => RANGO_ESTADO[b.estado] - RANGO_ESTADO[a.estado] || b.scores.composite - a.scores.composite || b.ev - a.ev);
  for (const c of orden) { const fam = `${c.fixture_id}|${c.tesis}`; const n = reservadas.get(fam) || 0;
    if (n >= CONFIG.correlacion.cap_por_familia) { c.correlacion_con = fam; c.estado_previo_corr = c.estado; c.estado = ESTADOS.DETECTED; c.codes.push(RC.CORRELATION_BLOCK); c.detalles.push('misma tesis que una señal mejor rankeada del partido'); }
    else reservadas.set(fam, n + 1); }
  // 5 · precio mínimo aceptable por tier (SE §5 "acceptable price boundary for that exact line") y expiración
  for (const c of cands) { if (!c.masa) continue;
    const req = c.estado === ESTADOS.ELITE ? CONFIG.tiers.elite.ev : c.estado === ESTADOS.STRONG ? CONFIG.tiers.strong.ev : CONFIG.tiers.lean.ev;
    const wm = c.w_modelo, A = wm * (c.masa.win + c.masa.half_win / 2) + (1 - wm) * c.p_novig, B = wm * (c.masa.loss + c.masa.half_loss / 2) + (1 - wm) * (1 - c.p_novig);   // EV(d) = A·(d−1) − B con la mezcla S19
    c.min_dec = A > 0 ? +((req + B) / A + 1).toFixed(3) : null; c.min_am = c.min_dec ? decAAm(c.min_dec) : null; }
  return cands;
}

// ══ 7 · PROP OF THE DAY (POD v1.0) ════════════════════════════════════════════
// Cobertura medida el 5-sep-2026: API-Football publica props como escaleras de UN lado
// ("Jugador - 1") con 1-2 casas por línea. POD §4/§7 exigen ≥3 casas y ambos lados a la
// misma línea. El motor aplica esas puertas literalmente y documenta la no-selección.
const POD_MSG_NONE = 'NO QUALIFYING SOCCER PROP OF THE DAY - The current slate does not contain a sufficiently strong and reliable opportunity.';
function evaluarPOD(partidos, ahora) {
  const cands = [], elim = {};
  const el = code => { elim[code] = (elim[code] || 0) + 1; };
  for (const fx of partidos) { const porClave = new Map();
    for (const q of fx.cuotas.filter(q => CONFIG.pod.mercados[q.bet_id])) { const k = `${fx.id}|${q.jugador}|${q.mercado}|${q.linea}`;
      if (!porClave.has(k)) porClave.set(k, { fixture_id: fx.id, jugador: q.jugador, mercado: q.mercado, linea: q.linea, over: new Map(), under: new Map() });
      porClave.get(k)[q.sel === 'OVER' ? 'over' : 'under'].set(q.book_id, q); }
    for (const c of porClave.values()) { cands.push(c);
      if (fx.lineup !== 'CONFIRMED') { c.reason = 'XI_UNCONFIRMED'; el(c.reason); continue; }
      if (!c.under.size) { c.reason = 'OPPOSITE_PRICE_MISSING'; el(c.reason); continue; }
      const casas = [...c.over.keys()].filter(b => c.under.has(b));
      if (casas.length < CONFIG.pod.casas_min) { c.reason = 'MARKET_DEPTH_BLOCK'; el(c.reason); continue; }
      // (a partir de aquí: no-vig por casa POD §9, P_cal §8, mínimos §12, stress §14, SPS §13 — no alcanzable con la oferta actual)
      c.reason = 'DATA_BLOCK'; el(c.reason); c.detalle = 'modelo de props pendiente de un proveedor con props two-sided'; } }
  return { status: 'No Selection', message: POD_MSG_NONE, candidates: cands.length, eliminated: elim, cands, criteria_version: 'HAXIOM-SOCCER-POD-v1.0', evaluated_at: ahora.toISOString() };
}

// ══ 8 · CORRIDA COMPLETA (SE §2 workflow) ═════════════════════════════════════
const db = Deportes.clienteDe('futbol');
const fechaSlate = d => (d || new Date()).toLocaleDateString('en-CA', { timeZone: CONFIG.zona });
const $f = id => document.getElementById(id);
let ESTADO = { snapshot: null, partidos: [], cands: [], pod: null, compet: [], msg: '', guardado: null };
const modelos = new Map();          // competición → modelo (por corrida)
const AUTO = { listo: false, done: false, ok: false, msg: '', guardado: false };

async function partidosJugados(comp, season) {
  const a = async s => ((await AF.get(`/fixtures?league=${comp.id}&season=${s}&status=FT`)).response || []).map(f => mapa(f, s));
  const mapa = (f, s) => ({ id: f.fixture.id, date: f.fixture.date, homeId: f.teams.home.id, awayId: f.teams.away.id, home: f.teams.home.name, away: f.teams.away.name, hg: f.goals.home, ag: f.goals.away, ht_hg: f.score?.halftime?.home ?? null, ht_ag: f.score?.halftime?.away ?? null, season: s });
  const [cur, prev] = await Promise.all([a(season), a(season - 1)]);
  return { cur: cur.filter(p => p.hg != null && p.ag != null), prev: prev.filter(p => p.hg != null && p.ag != null) };
}
// Caché de partidos + estadísticas (xG) en Supabase; missing = null, nunca 0.
async function xgCache(comp, season, jugados, presupuesto) {
  const xg = new Map(); let leidos = 0, nuevos = 0;
  try { const { data } = await db.from('futbol_partidos').select('fixture_id,xg_h,xg_a,stats_at').eq('competition_id', comp.id).in('season', [season, season - 1]);
    (data || []).forEach(r => { leidos++; xg.set(r.fixture_id, { xg_h: r.xg_h, xg_a: r.xg_a, stats_at: r.stats_at }); }); } catch (e) { /* tabla ausente: se sigue sin caché */ }
  if (typeof isOwner === 'function' && isOwner()) {
    const todos = [...jugados.prev, ...jugados.cur];
    const sinFila = todos.filter(p => !xg.has(p.id));
    if (sinFila.length) { try { await db.from('futbol_partidos').insert(sinFila.map(p => ({ fixture_id: p.id, competition_id: comp.id, season: p.season, match_date: p.date, home_id: p.homeId, away_id: p.awayId, home: p.home, away: p.away, hg: p.hg, ag: p.ag, ht_hg: p.ht_hg, ht_ag: p.ht_ag }))); sinFila.forEach(p => xg.set(p.id, { xg_h: null, xg_a: null, stats_at: null })); } catch (e) { console.warn('futbol_partidos insert:', e.message); } }
    const pendientes = todos.filter(p => { const r = xg.get(p.id); return r && !r.stats_at; }).sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, presupuesto.restante);
    for (const p of pendientes) { if (presupuesto.restante <= 0) break; presupuesto.restante--;
      try { const j = await AF.get(`/fixtures/statistics?fixture=${p.id}`); const r = j.response || []; const stat = (t, n) => { const s = t?.statistics?.find(x => x.type === n); return s && s.value != null ? +String(s.value).replace('%', '') : null; };
        const h = r.find(t => t.team.id === p.homeId), a = r.find(t => t.team.id === p.awayId);
        const fila = { xg_h: stat(h, 'expected_goals'), xg_a: stat(a, 'expected_goals'), stats: { definition_version: 'api-football_statistics_v3', home: h?.statistics || null, away: a?.statistics || null }, stats_at: new Date().toISOString() };
        await db.from('futbol_partidos').update(fila).eq('fixture_id', p.id); xg.set(p.id, fila); nuevos++; } catch (e) { console.warn('stats', p.id, e.message); } }
  }
  return { xg, leidos, nuevos };
}
function ventanaDe(minutos, lineup) {
  if (minutos <= 0) return 'INICIADO'; if (minutos <= 5) return 'T-5'; if (minutos <= 30) return 'T-30';
  if (lineup === 'CONFIRMED' || minutos <= 60) return 'XI'; if (minutos <= 90) return 'T-90'; if (minutos <= 360) return 'T-6h'; if (minutos <= 1440) return 'T-24h'; return 'T-24h+';
}
async function correrAnalisis(fecha, opciones = {}) {
  const t0 = Date.now(), ahora = new Date(); AF.reinicia();
  const slate = fecha || fechaSlate(ahora); const season = ahora.getUTCFullYear();
  const presupuesto = { restante: CONFIG.xg.stats_por_corrida };
  const compet = [], partidos = [];
  const seleccion = opciones.competiciones || COMPETICIONES.map(c => c.id);
  for (const comp of COMPETICIONES) { if (!seleccion.includes(comp.id)) continue;
    const st = { id: comp.id, nombre: comp.nombre, partidos: 0, con_cuotas: 0, modelo: null, error: null };
    try {
      const fxr = (await AF.get(`/fixtures?league=${comp.id}&season=${season}&date=${slate}`)).response || [];
      const programados = fxr.filter(f => ['NS', 'TBD'].includes(f.fixture.status.short));
      st.partidos = fxr.length;
      if (!programados.length) { compet.push(st); continue; }
      const [odds, inj] = await Promise.all([AF.todas(`/odds?league=${comp.id}&season=${season}&date=${slate}`), AF.get(`/injuries?league=${comp.id}&season=${season}&date=${slate}`).catch(() => ({ response: null }))]);
      const injBy = {}; (inj.response || []).forEach(r => (injBy[r.fixture.id] = injBy[r.fixture.id] || []).push({ player: r.player.name, team: r.team.name, type: r.player.type, reason: r.player.reason }));
      const injuryFeed = inj.response != null;
      if (!odds.length) { st.sin_cuotas = true; compet.push(st); continue; }
      // Modelo de la competición (una vez por corrida)
      if (!modelos.has(comp.id)) { const jug = await partidosJugados(comp, season); const cache = await xgCache(comp, season, jug, presupuesto);
        modelos.set(comp.id, { ...construirModelo(jug.prev, jug.cur, id => cache.xg.get(id)), cache_leidos: cache.leidos, stats_nuevas: cache.nuevos, temporada: season }); }
      const modelo = modelos.get(comp.id); st.modelo = { partidos: modelo.partidos, cobertura_xg: +modelo.cobertura_xg.toFixed(2), ajuste: modelo.cfg };
      for (const o of odds) { const f = programados.find(x => x.fixture.id === o.fixture.id); if (!f) continue;
        const kickoff = new Date(f.fixture.date), minutos = (kickoff - ahora) / 6e4;
        const fx = { id: f.fixture.id, comp, home: f.teams.home.name, away: f.teams.away.name, homeId: f.teams.home.id, awayId: f.teams.away.id, kickoff: f.fixture.date, status: f.fixture.status.short,
                     referee: f.fixture.referee || null, venue: f.fixture.venue?.name || null, ciudad: f.fixture.venue?.city || null, round: f.league?.round || null, minutos, quote_time: o.update, bajas: injBy[f.fixture.id] || [], injury_feed: injuryFeed };
        fx.cuotas = normalizarCuotas(o); fx.casas = new Set(fx.cuotas.map(q => q.book_id)).size;
        fx.lineup = 'UNCONFIRMED'; fx.gk_confirmed = false; fx.formacion = null;
        if (minutos <= CONFIG.lineups_ventana_min && minutos > -5) { try { const lu = (await AF.get(`/fixtures/lineups?fixture=${fx.id}`)).response || [];
          if (lu.length === 2 && lu.every(t => (t.startXI || []).length === 11)) { fx.lineup = 'CONFIRMED'; fx.gk_confirmed = lu.every(t => t.startXI.some(p => p.player.pos === 'G')); fx.formacion = lu.map(t => t.formation); fx.xi = lu.map(t => ({ team: t.team.name, xi: t.startXI.map(p => p.player.name), banca: (t.substitutes || []).map(p => p.player.name) })); fx.lineup_time = ahora.toISOString(); } } catch (e) { fx.lineup_error = e.message; } }
        fx.ventana = ventanaDe(minutos, fx.lineup);
        fx.dist = distribucionesPartido(modelo, fx.homeId, fx.awayId, +kickoff, fx.id);
        fx.modelo_ok = !!fx.dist; fx.xg_suficiente = modelo.xg_suficiente;
        partidos.push(fx); st.con_cuotas++; }
      compet.push(st);
    } catch (e) { st.error = e.message; compet.push(st); console.warn('[futbol]', comp.nombre, e.message); }
  }
  // Candidatos + calificación
  let cands = [];
  for (const fx of partidos) { const cs = candidatosDe(fx, fx.cuotas, fx.dist, {}); cs.forEach(c => { c.fx = fx; }); cands = cands.concat(cs); }
  const ctxDe = c => { const fx = c.fx; return { fx, dist: fx.dist, lineup: fx.lineup, gk_confirmed: fx.gk_confirmed, injury_feed: fx.injury_feed, bajas: fx.bajas.length, quote_age_min: fx.quote_time ? (ahora - new Date(fx.quote_time)) / 6e4 : 1e9, ventana: fx.ventana, xg_suficiente: fx.xg_suficiente, rest_known: false }; };
  asignarTiers(cands, ctxDe);
  const pod = evaluarPOD(partidos, ahora);
  // Snapshot inmutable
  const insumo = partidos.map(p => ({ id: p.id, q: p.quote_time, n: p.cuotas.length, l: p.lineup })).concat([VERSIONES, { slate }]);
  const hash = hashFNV(JSON.stringify(insumo));
  const snapshot = { snapshot_id: `SNAP-SOC-${slate}-${ahora.toISOString().slice(11, 19).replace(/:/g, '')}-${hash.slice(0, 6)}`, slate_date: slate, analysis_time: ahora.toISOString(), versions: VERSIONES,
    competitions: compet, input_hash: hash, requests_used: AF.usados(), counts: contar(partidos, cands) };
  ESTADO = { snapshot, partidos, cands, pod, compet, ms: Date.now() - t0, guardado: null, msg: '' };
  // Cierres: partidos a ≤15 min del inicio → última cotización válida
  ESTADO.cierres = partidos.filter(p => p.minutos <= 15 && p.minutos > -5).map(p => ({ fixture_id: p.id, minutes_to_ko: +p.minutos.toFixed(1), consensus: Object.fromEntries(cands.filter(c => c.fixture_id === p.id && c.cons).map(c => [`${c.mercado}|${c.sel}|${c.linea ?? ''}`, { p_novig: +c.p_novig.toFixed(4), best_dec: c.dec, books: c.filas }])) }));
  return ESTADO;
}
function contar(partidos, cands) { const c = { partidos: partidos.length, candidatos: cands.length, por_estado: {} }; for (const x of cands) c.por_estado[x.estado] = (c.por_estado[x.estado] || 0) + 1; return c; }
// Objeto de decisión SE §10 / §1.2 por candidato
function registroDe(c, snap) {
  const fx = c.fx, M = MERCADOS[c.mercado];
  return {
    identity: { signal_id: `SIG-${fx.id}-${c.mercado}-${c.sel}-${c.linea ?? 'na'}-${snap.snapshot_id.slice(-6)}`, candidate_key: c.key, sport: 'SOCCER', competition_id: fx.comp.id, competition: fx.comp.nombre, season: modelos.get(fx.comp.id)?.temporada, fixture_id: fx.id, home: fx.home, away: fx.away, scheduled_start: fx.kickoff, timezone: CONFIG.zona, pregame: true, evaluation_timestamp: snap.analysis_time, quote_timestamp: fx.quote_time },
    market: { source_market_name: M.etiqueta || M.etiquetaAmbigua, canonical_market_id: c.mercado, market_type: M.linea ? 'line' : 'outcome', team_scope: c.mercado.includes('HOME') ? 'HOME' : c.mercado.includes('AWAY') ? 'AWAY' : 'MATCH', period_scope: M.periodo, overtime_scope: 'EXCLUDED', selection: c.sel, line: c.linea, book: c.book, odds_decimal: c.dec, odds_american: c.am, best_available_price: c.dec, minimum_acceptable_price: c.min_dec, minimum_acceptable_american: c.min_am, settlement_rule_id: c.settlement_rule_id, book_rule_unverified: true, active_books: c.filas, outliers_excluded: c.outliers_excluidos },
    model: c.masa ? { home_goals_mean: +c.fx.dist.LA.lh.toFixed(3), away_goals_mean: +c.fx.dist.LA.la.toFixed(3), family_A: { p: c.p_A, lambdas: [c.fx.dist.LA.lh, c.fx.dist.LA.la] }, family_B: { p: c.p_B, lambdas: [c.fx.dist.LB.lh, c.fx.dist.LB.la] }, families: c.fx.dist.familias, p_model_raw: c.p_raw, model_weight: c.w_modelo, calibrated_probability: c.p_model, calibration_version: VERSIONES.calibracion, ev_model_raw: c.ev_modelo, ev_market: c.ev_mercado, fair_decimal: c.fair_dec, settlement_mass: c.masa, edge_pp: c.edge_pp, ev: c.ev, ev_se: c.se, ev_lower_bound: c.ev_lcb, lcb_method: `parametric bootstrap ${CONFIG.lcb.draws} draws, k=${CONFIG.lcb.k}`, ess: c.fx.dist.ess, distribution_version: VERSIONES.modelo } : null,
    market_state: c.cons ? { consensus_novig_p: c.p_novig, novig_method: CONFIG.novig.referencia, devig_spread: c.devig_spread, sharp_novig_p: c.sharp_p, price_dispersion: c.dispersion, overround: c.overround, derivative_gap: c.cons.derivative_gap ?? null, stale_quote: c.ctx_resumen?.quote_age_min > CONFIG.frescura_min.detected, quote_age_min: c.ctx_resumen?.quote_age_min } : { unavailable_reason: c.detalle || 'sin set completo' },
    context: { lineup_state: fx.lineup, lineup_time: fx.lineup_time || null, formation: fx.formacion, goalkeeper_confirmed: fx.gk_confirmed, injuries_reported: fx.bajas, injury_feed: fx.injury_feed, referee: fx.referee, venue: fx.venue, round: fx.round, window: fx.ventana, weather: 'unavailable (S5)', tactics: 'unavailable (4.7/4.9 no disponibles)' },
    quality: c.dq ? { data_quality: c.dq.dq, dq_parts: c.dq, model_agreement: c.scores.acuerdo, components: c.scores.componentes, weights: c.scores.pesos, composite: c.scores.composite, five_scores: c.scores.cinco, unavailable_components: c.scores.unavailable, hard_gates_passed: c.estado !== ESTADOS.NONE } : null,
    signal: { state: c.estado, provisional_tier: c.provisional || null, rank_percentile: c.percentil ?? null, rank: c.rank ?? null, reason_codes: c.codes, downgrade_reasons: c.downgrade || [], details: c.detalles || [], correlation_family: `${fx.id}|${c.tesis}`, expires_at: fx.kickoff, recheck_at: null, validation_status: 'PAPER' },
    audit: { snapshot_id: snap.snapshot_id, input_hash: snap.input_hash, versions: VERSIONES, assumptions: CONFIG.supuestos },
  };
}
// Persistencia append-only (solo dueño)
async function guardar() {
  const S = ESTADO; if (!S.snapshot) return { ok: false, msg: 'nada que guardar' };
  if (!(typeof isOwner === 'function' && isOwner())) return { ok: false, msg: 'sin sesión: el snapshot no se guardó (solo lectura)' };
  const snap = S.snapshot;
  try {
    const { error: e1 } = await db.from('futbol_snapshots').insert({ snapshot_id: snap.snapshot_id, slate_date: snap.slate_date, analysis_time: snap.analysis_time, versions: snap.versions, competitions: snap.competitions, counts: snap.counts, input_hash: snap.input_hash, requests_used: snap.requests_used });
    if (e1) throw e1;
    const cuotas = S.partidos.map(p => ({ snapshot_id: snap.snapshot_id, fixture_id: p.id, quote_time: p.quote_time || null, books: p.casas, quotes: p.cuotas.map(q => ({ book_id: q.book_id, book: q.book, bet_id: q.bet_id, etiqueta: q.etiqueta, valor: q.valor, mercado: q.mercado, sel: q.sel, linea: q.linea, dec: q.dec, am: q.am })) }));
    for (let i = 0; i < cuotas.length; i += 50) { const { error } = await db.from('futbol_cuotas').insert(cuotas.slice(i, i + 50)); if (error) throw error; }
    const filas = S.cands.map(c => { const rf = registroDe(c, snap); const r = c.estado === ESTADOS.NONE ? { identity: rf.identity, market: rf.market, signal: rf.signal, compact: true } : rf; return { snapshot_id: snap.snapshot_id, signal_id: r.identity.signal_id, candidate_key: c.key, slate_date: snap.slate_date, competition_id: c.fx.comp.id, competition: c.fx.comp.nombre, fixture_id: c.fixture_id, home: c.fx.home, away: c.fx.away, kickoff: c.fx.kickoff,
      canonical_market: c.mercado, selection: c.sel, line: c.linea, book: c.book || null, odds_decimal: c.dec || null, odds_american: c.am || null, fair_decimal: c.fair_dec || null, p_model: c.p_model ?? null, p_novig: c.p_novig ?? null, edge_pp: c.edge_pp ?? null, ev: c.ev ?? null, ev_lcb: c.ev_lcb ?? null,
      composite: c.scores?.composite ?? null, percentile: c.percentil ?? null, data_quality: c.dq?.dq ?? null, state: c.estado, provisional_tier: c.provisional || null, reason_codes: c.codes || [], min_decimal: c.min_dec || null, expires_at: c.fx.kickoff, validation: 'PAPER', record: r }; });
    for (let i = 0; i < filas.length; i += 100) { const { error } = await db.from('futbol_senales').insert(filas.slice(i, i + 100)); if (error) throw error; }
    const { error: e3 } = await db.from('futbol_pod').insert({ snapshot_id: snap.snapshot_id, slate_date: snap.slate_date, status: S.pod.status, message: S.pod.message, candidates: S.pod.candidates, eliminated: S.pod.eliminated, record: null }); if (e3) throw e3;
    if (S.cierres.length) { const { error } = await db.from('futbol_cierres').insert(S.cierres.map(c => ({ ...c, snapshot_id: snap.snapshot_id }))); if (error) throw error; }
    // Auditoría: transiciones frente al último estado conocido de cada candidato
    const prev = new Map(); try { const { data } = await db.from('futbol_senales').select('candidate_key,state,created_at').eq('slate_date', snap.slate_date).neq('snapshot_id', snap.snapshot_id).order('created_at', { ascending: false }).limit(5000); (data || []).forEach(r => { if (!prev.has(r.candidate_key)) prev.set(r.candidate_key, r.state); }); } catch (e) { /* sin historial */ }
    const trans = S.cands.filter(c => prev.has(c.key) && prev.get(c.key) !== c.estado).map(c => ({ snapshot_id: snap.snapshot_id, candidate_key: c.key, process: 'analysis', prev_state: prev.get(c.key), new_state: c.estado, reason_codes: c.codes || [], detail: { ev: c.ev, dec: c.dec, downgrade: c.downgrade || [] } }));
    if (trans.length) { const { error } = await db.from('futbol_auditoria').insert(trans); if (error) throw error; }
    S.transiciones = trans;
    return { ok: true, msg: `guardado ${snap.snapshot_id}: ${filas.length} registros, ${cuotas.length} partidos, ${trans.length} transiciones` };
  } catch (e) { const falta = /futbol_|schema cache|does not exist|relation/i.test(e.message || ''); return { ok: false, msg: (falta ? 'Faltan las tablas: corre futbol-setup.sql en Supabase. ' : '') + (e.message || String(e)) }; }
}
// Calificación (SE §9 "signal outcomes" + CLV) sobre señales publicadas de días cerrados
async function calificar() {
  if (!(typeof requireAuth === 'function' && requireAuth())) return;
  ESTADO.msg = 'Calificando…'; pintar();
  try {
    const hoy = fechaSlate(); const { data: sen, error } = await db.from('futbol_senales').select('signal_id,candidate_key,snapshot_id,fixture_id,canonical_market,selection,line,odds_decimal,p_novig,state,slate_date').lt('slate_date', hoy).in('state', [ESTADOS.ELITE, ESTADOS.STRONG, ESTADOS.LEAN]).order('created_at', { ascending: false }).limit(2000);
    if (error) throw error;
    const { data: ya } = await db.from('futbol_resultados').select('signal_id'); const hechas = new Set((ya || []).map(r => r.signal_id));
    const pend = (sen || []).filter(s => !hechas.has(s.signal_id)); const porFx = [...new Set(pend.map(s => s.fixture_id))];
    const finales = new Map();
    for (const id of porFx) { try { const f = (await AF.get(`/fixtures?id=${id}`)).response?.[0]; if (f && ['FT', 'AET', 'PEN'].includes(f.fixture.status.short)) finales.set(id, { hg: f.score.fulltime.home, ag: f.score.fulltime.away, abandonado: false }); else if (f && ['CANC', 'ABD', 'PST'].includes(f.fixture.status.short)) finales.set(id, { abandonado: true }); } catch (e) { /* sin marcador */ } }
    const { data: cierres } = await db.from('futbol_cierres').select('fixture_id,consensus').in('fixture_id', porFx.length ? porFx : [0]);
    const cierreDe = (fx, k) => (cierres || []).filter(c => c.fixture_id === fx).map(c => c.consensus?.[k]?.p_novig).find(v => v != null) ?? null;
    const filas = [];
    for (const s of pend) { const r = finales.get(s.fixture_id); if (!r) continue;
      let settlement, ret; if (r.abandonado) { settlement = 'void'; ret = 0; } else { const u = unidadSel(s.canonical_market, s.selection, s.line, r.hg, r.ag); settlement = u === 1 ? 'win' : u === .5 ? 'half_win' : u === 0 ? 'push' : u === -.5 ? 'half_loss' : 'loss'; ret = u > 0 ? u * (s.odds_decimal - 1) : u; }
      const cp = cierreDe(s.fixture_id, `${s.canonical_market}|${s.selection}|${s.line ?? ''}`);
      filas.push({ signal_id: s.signal_id, candidate_key: s.candidate_key, snapshot_id: s.snapshot_id, fixture_id: s.fixture_id, hg: r.hg ?? null, ag: r.ag ?? null, settlement, return_units: +ret.toFixed(4), close_p_novig: cp, clv_pp: cp != null && s.p_novig != null ? +((cp - s.p_novig) * 100).toFixed(2) : null, state_at_pub: s.state }); }
    if (filas.length) { const { error: e2 } = await db.from('futbol_resultados').insert(filas); if (e2) throw e2; }
    ESTADO.msg = `Calificadas ${filas.length} señal(es); ${pend.length - filas.length} sin marcador final todavía.`;
  } catch (e) { ESTADO.msg = 'Calificación: ' + e.message; }
  pintar(); cargarHistorial();
}

// ══ 9 · INTERFAZ ══════════════════════════════════════════════════════════════
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct1 = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
const p0 = v => v == null ? '—' : Math.round(v * 100) + '%';
const amTxt = a => a == null ? '—' : (a > 0 ? '+' + a : String(a));
const horaLocal = iso => { try { return new Date(iso).toLocaleString('es-MX', { timeZone: CONFIG.zona, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET'; } catch { return ''; } };
const selTxt = c => { const fx = c.fx; const s = c.sel;
  if (c.mercado === '1X2') return s === 'HOME' ? fx.home : s === 'AWAY' ? fx.away : 'EMPATE';
  if (c.mercado === 'DOUBLE_CHANCE') return s === '1X' ? `${fx.home} o EMPATE` : s === 'X2' ? `${fx.away} o EMPATE` : 'NO EMPATE';
  if (c.mercado === 'ASIAN_HANDICAP') return `${s === 'HOME' ? fx.home : fx.away} ${c.linea >= 0 ? '+' : ''}${c.linea}`;
  if (c.mercado === 'BTTS') return s === 'YES' ? 'SÍ' : 'NO';
  return `${s === 'OVER' ? 'MÁS DE' : 'MENOS DE'} ${c.linea}`; };
const claseTier = e => e === ESTADOS.ELITE ? 'elite' : e === ESTADOS.STRONG ? 'strong' : e === ESTADOS.LEAN ? 'lean' : e === ESTADOS.DETECTED ? 'detected' : 'none';
const etiquetaEstado = e => ({ [ESTADOS.ELITE]: 'ELITE SIGNAL · PAPER', [ESTADOS.STRONG]: 'STRONG SIGNAL · PAPER', [ESTADOS.LEAN]: 'LEAN SIGNAL · PAPER', [ESTADOS.DETECTED]: 'SIGNAL DETECTED', [ESTADOS.NONE]: 'NO SIGNAL' }[e] || e);
let pestana = 'tablero', modalFx = null, historial = null, filtroComp = null;

const HTML = String.raw`
<div class="sc-shell">
  <div class="sc-top">
    <div class="sc-brand"><span class="sc-logo">⚽</span><div><div class="sc-title">SOCCER · HAXIOM EDGE</div><div class="sc-sub">Signal Engine v1.1 · Prop of the Day v1.0 · Fase 1 · <b class="sc-paper">PAPER</b> (sin calibración validada)</div></div></div>
    <div class="sc-controls">
      <input type="date" id="sc-fecha" data-ch="cambiarFecha(this.value)" title="Fecha del slate (zona del Este)">
      <button class="sc-btn" id="sc-run" data-ac="analizar()">▶ Analizar slate</button>
      <button class="sc-btn ghost" data-ac="calificar()" title="Liquida señales de días cerrados y calcula CLV">✓ Calificar</button>
    </div>
  </div>
  <div class="sc-tabs">
    <button class="sc-tab active" data-ac="verPestana('tablero')">Tablero</button>
    <button class="sc-tab" data-ac="verPestana('partidos')">Partidos</button>
    <button class="sc-tab" data-ac="verPestana('pod')">Prop of the Day</button>
    <button class="sc-tab" data-ac="verPestana('historial')">Historial</button>
    <button class="sc-tab" data-ac="verPestana('auditoria')">Auditoría</button>
    <button class="sc-tab" data-ac="verPestana('config')">Criterios</button>
  </div>
  <div id="sc-msg" class="sc-msg" hidden></div>
  <div id="sc-area"><div class="sc-empty">Elige la fecha y pulsa <b>Analizar slate</b>. El motor evalúa las 20 competiciones, registra un snapshot inmutable y califica cada candidato contra los umbrales del Signal Engine §7.</div></div>
  <div id="sc-modal"></div>
</div>`;

function pintar() {
  const area = $f('sc-area'); if (!area) return;
  const msg = $f('sc-msg'); if (msg) { msg.hidden = !ESTADO.msg; msg.innerHTML = esc(ESTADO.msg); }
  document.querySelectorAll('#dep-futbol .sc-tab').forEach(b => b.classList.toggle('active', (b.dataset.ac || '').includes(`'${pestana}'`)));
  area.innerHTML = pestana === 'tablero' ? htmlTablero() : pestana === 'partidos' ? htmlPartidos() : pestana === 'pod' ? htmlPOD() : pestana === 'historial' ? htmlHistorial() : pestana === 'auditoria' ? htmlAuditoria() : htmlConfig();
}
function htmlResumen() {
  const S = ESTADO; if (!S.snapshot) return '';
  const n = S.snapshot.counts.por_estado, k = e => n[e] || 0;
  return `<div class="sc-kpis">
    <div class="sc-kpi"><span>Snapshot</span><b class="mono">${esc(S.snapshot.snapshot_id)}</b><small>${esc(S.snapshot.analysis_time.slice(11, 19))} UTC · ${S.snapshot.requests_used} llamadas · ${(S.ms / 1000).toFixed(1)} s</small></div>
    <div class="sc-kpi"><span>Partidos</span><b>${S.partidos.length}</b><small>${S.compet.filter(c => c.con_cuotas).length} competiciones con cuotas</small></div>
    <div class="sc-kpi"><span>Candidatos</span><b>${S.cands.length}</b><small>${k(ESTADOS.DETECTED)} en watchlist · ${k(ESTADOS.NONE)} sin señal</small></div>
    <div class="sc-kpi elite"><span>Elite</span><b>${k(ESTADOS.ELITE)}</b><small>EV ≥4.5% · LCB ≥1% · DQ ≥95</small></div>
    <div class="sc-kpi strong"><span>Strong</span><b>${k(ESTADOS.STRONG)}</b><small>EV ≥3% · LCB ≥0 · DQ ≥90</small></div>
    <div class="sc-kpi lean"><span>Lean</span><b>${k(ESTADOS.LEAN)}</b><small>EV ≥1.5% · DQ ≥80</small></div>
  </div>
  <div class="sc-note">${S.guardado ? (S.guardado.ok ? '☁ ' : '⚠ ') + esc(S.guardado.msg) : ''} ${S.partidos.some(p => p.lineup !== 'CONFIRMED') ? '· Las señales oficiales requieren XI confirmado (SE §8); antes de eso los candidatos que califican aparecen en la watchlist con su tier provisional.' : ''}</div>`;
}
function tarjeta(c, provisional) {
  const fx = c.fx, e = provisional ? c.provisional : c.estado, cl = claseTier(e), r = c.scores || {};
  const evidencia = [
    c.p_A != null ? `Familia A (Dixon-Coles, goles) ${p0(c.p_A)} · Familia B (bivariado, ${fx.xg_suficiente ? 'xG' : 'goles'}) ${p0(c.p_B)} → ensamble ${p0(c.p_raw)}; con peso ${Math.round(c.w_modelo * 100)}% sobre el consenso ${p0(c.p_novig)}${c.sharp_p != null ? ` (Pinnacle ${p0(c.sharp_p)})` : ''} → calibrada ${p0(c.p_model)}` : null,
    c.ev != null ? `EV ${pct1(c.ev)} a ${amTxt(c.am)} (${c.dec}) en ${esc(c.book)} · EV inferior ${pct1(c.ev_lcb)} (k=${CONFIG.lcb.k}, ${CONFIG.lcb.draws} draws)` : null,
    `${c.filas} casas en la línea exacta · dispersión ${c.dispersion != null ? (c.dispersion * 100).toFixed(1) + ' pp' : '—'} · overround ${c.overround != null ? (c.overround * 100).toFixed(1) + '%' : '—'}`,
  ].filter(Boolean);
  const riesgos = [
    fx.lineup !== 'CONFIRMED' ? 'XI oficial sin confirmar (LINEUP_BLOCK)' : null,
    fx.bajas.length ? `Bajas reportadas: ${fx.bajas.slice(0, 3).map(b => esc(b.player)).join(', ')}${fx.bajas.length > 3 ? ` +${fx.bajas.length - 3}` : ''}` : null,
    !r.acuerdo ? 'Las dos familias de modelo discrepan más de 6 pp' : null,
    !fx.xg_suficiente ? 'xG con cobertura insuficiente: familia B usa goles' : null,
    c.outliers_excluidos ? `${c.outliers_excluidos} cotización(es) fuera de consenso ignorada(s)` : null,
    'Sin calibración validada: salida PAPER (SE §9.1)',
  ].filter(Boolean);
  return `<div class="sc-card ${cl}" data-ac="abrirPartido(${fx.id})">
    <div class="sc-card-hd"><span class="sc-tier ${cl}">${etiquetaEstado(e)}${provisional ? ' · PROVISIONAL' : ''}</span><span class="sc-comp">${esc(fx.comp.nombre)}</span></div>
    <div class="sc-card-sel">${esc(selTxt(c))}<span class="sc-mkt">${esc(c.nombre)}${c.linea != null && c.mercado !== 'ASIAN_HANDICAP' ? ' ' + c.linea : ''}</span></div>
    <div class="sc-card-mu">${esc(fx.home)} <i>vs</i> ${esc(fx.away)} · ${horaLocal(fx.kickoff)} · ${fx.ventana}</div>
    <div class="sc-card-grid">
      <div><span>Cuota</span><b>${amTxt(c.am)}</b><small>${c.dec} · ${esc(c.book || '')}</small></div>
      <div><span>Mínimo</span><b>${amTxt(c.min_am)}</b><small>para su tier</small></div>
      <div><span>EV</span><b class="${c.ev > 0 ? 'pos' : ''}">${pct1(c.ev)}</b><small>LCB ${pct1(c.ev_lcb)}</small></div>
      <div><span>Proyección</span><b>${fx.dist ? fx.dist.LA.lh.toFixed(2) + ' – ' + fx.dist.LA.la.toFixed(2) : '—'}</b><small>goles esperados</small></div>
      <div><span>Score</span><b>${r.composite ?? '—'}</b><small>percentil ${c.percentil != null ? Math.round(c.percentil * 100) : '—'} · no es prob.</small></div>
      <div><span>DQ</span><b>${c.dq ? c.dq.dq : '—'}</b><small>calidad de dato</small></div>
    </div>
    <div class="sc-card-ev"><b>Evidencia</b><ol>${evidencia.map(t => `<li>${t}</li>`).join('')}</ol></div>
    <div class="sc-card-ev risk"><b>Riesgos</b><ul>${riesgos.map(t => `<li>${t}</li>`).join('')}</ul></div>
    <div class="sc-card-ft"><span class="mono">${c.codes.map(esc).join(' · ')}</span><span>${esc(ESTADO.snapshot.analysis_time.slice(0, 16).replace('T', ' '))} UTC</span></div>
  </div>`;
}
function htmlTablero() {
  const S = ESTADO; if (!S.snapshot) return '<div class="sc-empty">Sin corrida todavía.</div>';
  const de = e => S.cands.filter(c => c.estado === e).sort((a, b) => b.scores.composite - a.scores.composite);
  const secciones = [[ESTADOS.ELITE, 'ELITE SIGNAL', 'Primera prioridad de asignación. Raro por diseño.'], [ESTADOS.STRONG, 'STRONG SIGNAL', 'Modelos de acuerdo, EV inferior ≥ 0, precio y XI estables.'], [ESTADOS.LEAN, 'LEAN SIGNAL', 'Elegible, prioridad más baja.']]
    .map(([e, t, d]) => { const L = de(e); return `<section class="sc-sec ${claseTier(e)}"><header><h3>${t} <span>${L.length}</span></h3><p>${d}</p></header>${L.length ? `<div class="sc-cards">${L.map(c => tarjeta(c)).join('')}</div>` : `<div class="sc-none">Ninguna selección alcanzó ${t}. No se fuerza una señal.</div>`}</section>`; }).join('');
  const prov = S.cands.filter(c => c.estado === ESTADOS.DETECTED && c.provisional).sort((a, b) => RANGO_ESTADO[b.provisional] - RANGO_ESTADO[a.provisional] || b.scores.composite - a.scores.composite);
  const watch = S.cands.filter(c => c.estado === ESTADOS.DETECTED && !c.provisional).sort((a, b) => (b.scores?.composite || 0) - (a.scores?.composite || 0)).slice(0, 40);
  return htmlResumen() + secciones + `
  <section class="sc-sec detected"><header><h3>WATCHLIST · SIGNAL DETECTED <span>${prov.length + watch.length}</span></h3><p>Edge detectado pero no calificado: falta XI oficial, EV/percentil/DQ insuficientes, o correlación con una señal mejor. Sin asignación automática (SE §7).</p></header>
    ${prov.length ? `<h4>Calificarían con XI confirmado (tier provisional)</h4><div class="sc-cards">${prov.slice(0, 12).map(c => tarjeta(c, true)).join('')}</div>` : ''}
    ${watch.length ? `<table class="sc-table"><thead><tr><th>Partido</th><th>Selección</th><th>Cuota</th><th>EV</th><th>LCB</th><th>DQ</th><th>Score</th><th>Pct</th><th>Motivo</th></tr></thead><tbody>${watch.map(c => `<tr data-ac="abrirPartido(${c.fx.id})"><td>${esc(c.fx.home)} v ${esc(c.fx.away)}<small>${esc(c.fx.comp.nombre)}</small></td><td><b>${esc(selTxt(c))}</b> <small>${esc(c.nombre)}</small></td><td>${amTxt(c.am)}</td><td class="${c.ev > 0 ? 'pos' : ''}">${pct1(c.ev)}</td><td>${pct1(c.ev_lcb)}</td><td>${c.dq?.dq ?? '—'}</td><td>${c.scores?.composite ?? '—'}</td><td>${c.percentil != null ? Math.round(c.percentil * 100) : '—'}</td><td><small>${esc((c.downgrade || []).slice(-1)[0] || c.codes.join(', '))}</small></td></tr>`).join('')}</tbody></table>` : ''}
  </section>`;
}
function htmlPartidos() {
  const S = ESTADO; if (!S.snapshot) return '<div class="sc-empty">Sin corrida todavía.</div>';
  const comps = S.compet.filter(c => c.partidos || c.error);
  const chips = `<div class="sc-chips">${comps.map(c => `<button class="sc-chip ${filtroComp === c.id ? 'on' : ''} ${c.sin_cuotas || c.error ? 'off' : ''}" data-ac="filtrarComp(${c.id})" title="${esc(c.error || (c.sin_cuotas ? 'sin cuotas en el proveedor' : ''))}">${esc(c.nombre)} <b>${c.con_cuotas || 0}</b>${c.sin_cuotas ? ' · sin cuotas' : ''}${c.error ? ' · error' : ''}</button>`).join('')}</div>`;
  const lista = S.partidos.filter(p => !filtroComp || p.comp.id === filtroComp).sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
  const mejor = fx => S.cands.filter(c => c.fixture_id === fx.id && c.ev != null).sort((a, b) => RANGO_ESTADO[b.estado] - RANGO_ESTADO[a.estado] || (b.scores?.composite || 0) - (a.scores?.composite || 0))[0];
  return htmlResumen() + chips + `<div class="sc-fixtures">${lista.map(fx => { const m = mejor(fx); const e = m ? m.estado : ESTADOS.NONE;
    return `<div class="sc-fx ${claseTier(m?.provisional && e === ESTADOS.DETECTED ? m.provisional : e)}" data-ac="abrirPartido(${fx.id})">
      <div class="sc-fx-top"><span>${esc(fx.comp.nombre)}</span><span>${horaLocal(fx.kickoff)}</span></div>
      <div class="sc-fx-teams">${esc(fx.home)}<i>vs</i>${esc(fx.away)}</div>
      <div class="sc-fx-meta">${fx.dist ? `λ ${fx.dist.LA.lh.toFixed(2)} – ${fx.dist.LA.la.toFixed(2)}` : 'sin modelo'} · ${fx.casas} casas · ${fx.lineup === 'CONFIRMED' ? '✓ XI' : 'XI pendiente'} · ${fx.ventana}${fx.bajas.length ? ` · 🩹 ${fx.bajas.length}` : ''}</div>
      ${m ? `<div class="sc-fx-best"><span class="sc-tier ${claseTier(e)}">${etiquetaEstado(e)}${m.provisional && e === ESTADOS.DETECTED ? ' → ' + etiquetaEstado(m.provisional) : ''}</span> <b>${esc(selTxt(m))}</b> <small>${esc(m.nombre)} · ${amTxt(m.am)} · EV ${pct1(m.ev)}</small></div>` : '<div class="sc-fx-best"><small>sin candidato con EV</small></div>'}
    </div>`; }).join('')}</div>`;
}
function htmlPOD() {
  const P = ESTADO.pod; if (!P) return '<div class="sc-empty">Sin corrida todavía.</div>';
  const elim = Object.entries(P.eliminated).sort((a, b) => b[1] - a[1]);
  return `<div class="sc-pod"><div class="sc-pod-hd"><span class="sc-tier none">${esc(P.status.toUpperCase())}</span><span>${esc(P.criteria_version)} · ${esc(P.evaluated_at.slice(0, 16).replace('T', ' '))} UTC</span></div>
    <p class="sc-pod-msg">${esc(P.message)}</p>
    <div class="sc-pod-grid"><div><span>Candidatos evaluados</span><b>${P.candidates}</b></div>${elim.map(([k, v]) => `<div><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>
    <p class="sc-pod-note">Medición del 5-sep-2026 (§6.7 de la auditoría): el proveedor publica props de jugador como escaleras de un solo lado con 1-2 casas por línea. El protocolo exige ≥3 casas independientes y ambos lados a la misma línea (§4, §7): ningún candidato puede alcanzar Official con esta oferta. El motor lo evalúa en cada corrida y registra la no-selección con sus reason codes (§26).</p></div>`;
}
function htmlHistorial() {
  if (!historial) { cargarHistorial(); return '<div class="sc-loading">Cargando historial…</div>'; }
  if (historial.error) return `<div class="sc-empty">${esc(historial.error)}</div>`;
  const rows = historial.filas; if (!rows.length) return '<div class="sc-empty">Sin señales publicadas guardadas todavía. Inicia sesión y corre un análisis para que se guarden.</div>';
  const porDia = {}; rows.forEach(r => (porDia[r.slate_date] = porDia[r.slate_date] || []).push(r));
  const res = r => historial.res.get(r.signal_id);
  const rec = arr => { const g = arr.map(res).filter(x => x && ['win', 'loss', 'half_win', 'half_loss'].includes(x.settlement)); const u = g.reduce((s, x) => s + (+x.return_units), 0); return { n: g.length, w: g.filter(x => x.settlement.includes('win')).length, u, clv: media(g.map(x => x.clv_pp).filter(v => v != null)) }; };
  const tot = rec(rows);
  return `<div class="sc-hist-sum"><div><span>Señales</span><b>${rows.length}</b></div><div><span>Liquidadas</span><b>${tot.n}</b></div><div><span>Récord</span><b>${tot.w}-${tot.n - tot.w}</b></div><div><span>Unidades</span><b class="${tot.u >= 0 ? 'pos' : 'neg'}">${tot.u >= 0 ? '+' : ''}${tot.u.toFixed(2)}</b></div><div><span>CLV medio</span><b>${isNaN(tot.clv) ? '—' : (tot.clv >= 0 ? '+' : '') + tot.clv.toFixed(2) + ' pp'}</b></div></div>
  <p class="sc-note">Paper tracking prospectivo (SE §9.1). Cada fila es la señal tal como se publicó: no se reescribe. Récord y unidades no prueban rentabilidad futura.</p>
  ${Object.keys(porDia).sort().reverse().map(d => { const L = porDia[d], r = rec(L); return `<section class="sc-sec"><header><h3>${esc(d)} <span>${L.length}</span></h3><p>${r.n ? `récord ${r.w}-${r.n - r.w} · ${r.u >= 0 ? '+' : ''}${r.u.toFixed(2)} u` : 'sin liquidar'}</p></header>
    <table class="sc-table"><thead><tr><th>Partido</th><th>Selección</th><th>Tier</th><th>Cuota</th><th>EV</th><th>Final</th><th>Resultado</th><th>CLV</th></tr></thead><tbody>${L.map(r => { const x = res(r); return `<tr><td>${esc(r.home)} v ${esc(r.away)}<small>${esc(r.competition)}</small></td><td><b>${esc(r.selection)}</b> <small>${esc(MERCADOS[r.canonical_market]?.nombre || r.canonical_market)}${r.line != null ? ' ' + r.line : ''}</small></td><td><span class="sc-tier ${claseTier(r.state)}">${etiquetaEstado(r.state)}</span></td><td>${amTxt(r.odds_american)}</td><td>${pct1(r.ev)}</td><td>${x && x.hg != null ? `${x.hg}-${x.ag}` : '—'}</td><td class="${x ? (x.settlement.includes('win') ? 'pos' : x.settlement.includes('loss') ? 'neg' : '') : ''}">${x ? esc(x.settlement) : 'pendiente'}</td><td>${x && x.clv_pp != null ? (x.clv_pp >= 0 ? '+' : '') + x.clv_pp + ' pp' : '—'}</td></tr>`; }).join('')}</tbody></table></section>`; }).join('')}`;
}
async function cargarHistorial() {
  try { const { data, error } = await db.from('futbol_senales').select('signal_id,slate_date,competition,home,away,canonical_market,selection,line,odds_american,ev,state').in('state', [ESTADOS.ELITE, ESTADOS.STRONG, ESTADOS.LEAN]).order('created_at', { ascending: false }).limit(1000);
    if (error) throw error; const { data: res } = await db.from('futbol_resultados').select('signal_id,settlement,return_units,hg,ag,clv_pp');
    historial = { filas: data || [], res: new Map((res || []).map(r => [r.signal_id, r])) }; }
  catch (e) { historial = { error: /futbol_|relation|schema cache/i.test(e.message) ? 'Faltan las tablas de SOCCER en Supabase: corre futbol-setup.sql en el SQL Editor.' : e.message }; }
  if (pestana === 'historial') pintar();
}
function htmlAuditoria() {
  const S = ESTADO; if (!S.snapshot) return '<div class="sc-empty">Sin corrida todavía.</div>';
  const comps = S.compet.map(c => `<tr><td>${esc(c.nombre)}</td><td>${c.partidos}</td><td>${c.con_cuotas || 0}</td><td>${c.modelo ? `${c.modelo.partidos} partidos · xG ${Math.round(c.modelo.cobertura_xg * 100)}% · H=${c.modelo.ajuste.H}d ρ=${c.modelo.ajuste.rho} K=${c.modelo.ajuste.K}${c.modelo.ajuste.ajustado ? '' : ' (sin ajuste: pocos datos)'}` : (c.sin_cuotas ? 'sin cuotas en el proveedor' : c.error ? esc(c.error) : 'sin partidos programados')}</td></tr>`).join('');
  const trans = (S.transiciones || []).map(t => `<tr><td class="mono">${esc(t.candidate_key)}</td><td>${esc(t.prev_state)}</td><td>${esc(t.new_state)}</td><td><small>${esc(t.reason_codes.join(', '))}</small></td></tr>`).join('');
  return `<div class="sc-audit"><h3>Snapshot ${esc(S.snapshot.snapshot_id)}</h3>
    <table class="sc-table kv"><tr><th>Hash del insumo</th><td class="mono">${esc(S.snapshot.input_hash)}</td></tr><tr><th>Versiones</th><td class="mono">${esc(Object.entries(VERSIONES).map(([k, v]) => k + '=' + v).join(' · '))}</td></tr><tr><th>Llamadas API</th><td>${S.snapshot.requests_used} (restantes hoy: ${AF.restantes() ?? '—'})</td></tr><tr><th>Guardado</th><td>${S.guardado ? esc(S.guardado.msg) : 'no'}</td></tr></table>
    <h3>Competiciones</h3><table class="sc-table"><thead><tr><th>Competición</th><th>Partidos</th><th>Con cuotas</th><th>Modelo</th></tr></thead><tbody>${comps}</tbody></table>
    <h3>Transiciones de estado en esta corrida</h3>${trans ? `<table class="sc-table"><thead><tr><th>Candidato</th><th>Antes</th><th>Ahora</th><th>Códigos</th></tr></thead><tbody>${trans}</tbody></table>` : '<p class="sc-note">Ninguna (o sin snapshot previo guardado del mismo slate).</p>'}
    <h3>Cierres capturados</h3><p class="sc-note">${S.cierres?.length || 0} partido(s) a ≤15 min del inicio.</p></div>`;
}
function htmlConfig() {
  const T = CONFIG.tiers;
  return `<div class="sc-audit"><h3>Umbrales de tier (Signal Engine §7, literales)</h3>
    <table class="sc-table"><thead><tr><th>Estado</th><th>EV</th><th>Percentil</th><th>EV inferior</th><th>DQ</th><th>Otros</th></tr></thead><tbody>
    <tr><td>ELITE SIGNAL</td><td>≥ ${T.elite.ev * 100}%</td><td>≥ ${T.elite.pct * 100}</td><td>≥ ${T.elite.lcb * 100}%</td><td>≥ ${T.elite.dq}</td><td>XI confirmado, modelos de acuerdo, cotización ≤${CONFIG.frescura_min.elite} min, sin correlación</td></tr>
    <tr><td>STRONG SIGNAL</td><td>≥ ${T.strong.ev * 100}%</td><td>≥ ${T.strong.pct * 100}</td><td>≥ 0</td><td>≥ ${T.strong.dq}</td><td>XI confirmado, modelos de acuerdo, cotización ≤${CONFIG.frescura_min.strong} min</td></tr>
    <tr><td>LEAN SIGNAL</td><td>≥ ${T.lean.ev * 100}%</td><td>≥ ${T.lean.pct * 100}</td><td>—</td><td>≥ ${T.lean.dq}</td><td>XI confirmado, estabilidad ≥${CONFIG.estabilidad_min}, cotización ≤${CONFIG.frescura_min.lean} min</td></tr>
    <tr><td>SIGNAL DETECTED</td><td>&gt; 0</td><td>—</td><td>—</td><td>—</td><td>watchlist; sin asignación</td></tr><tr><td>NO SIGNAL</td><td colspan="5">falla de puerta universal (precio, frescura, integridad, modelo, coherencia, liquidación)</td></tr></tbody></table>
    <h3>Pesos por mercado (SE §7.1)</h3><table class="sc-table"><thead><tr><th>Grupo</th><th>Team/xG</th><th>XI/GK</th><th>Role/min</th><th>Tactics</th><th>Context</th><th>Market/value</th><th>Quality</th></tr></thead><tbody>${Object.entries(CONFIG.pesos).map(([k, v]) => `<tr><td>${k}</td>${v.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="sc-note">"Tactics" no tiene insumo en el proveedor (familias 4.7 y 4.9 del diccionario): se puntúa 0 y se marca como no disponible. El score compuesto ordena candidatos; <b>no es una probabilidad de ganar</b>.</p>
    <h3>Registro de mercados</h3><table class="sc-table"><thead><tr><th>Canónico</th><th>Etiqueta del proveedor</th><th>Periodo</th><th>Estados</th><th>Fase</th></tr></thead><tbody>${Object.entries(MERCADOS).map(([k, m]) => `<tr><td class="mono">${k}</td><td>${esc(m.etiqueta || m.etiquetaAmbigua || '—')}${m.bloqueo ? ' <b>(bloqueado: ' + m.bloqueo + ')</b>' : ''}</td><td class="mono">${esc(m.periodo)}</td><td class="mono">${(m.estados || []).join(', ')}</td><td>${m.fase}</td></tr>`).join('')}</tbody></table>
    <h3>Supuestos de configuración (auditoría §7)</h3><ul class="sc-list">${CONFIG.supuestos.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="sc-note">Versiones: <span class="mono">${esc(Object.entries(VERSIONES).map(([k, v]) => k + '=' + v).join(' · '))}</span></p></div>`;
}
function htmlModal(fx) {
  const cs = ESTADO.cands.filter(c => c.fixture_id === fx.id).sort((a, b) => RANGO_ESTADO[b.estado] - RANGO_ESTADO[a.estado] || (b.scores?.composite || 0) - (a.scores?.composite || 0) || (b.ev || -9) - (a.ev || -9));
  const d = fx.dist;
  const fila = c => `<tr class="${claseTier(c.estado)}"><td><b>${esc(selTxt(c))}</b><small>${esc(c.nombre)}${c.derivado ? ' (derivado del 1X2)' : ''}</small></td><td>${amTxt(c.am)}<small>${c.dec ?? ''} ${esc(c.book || '')}</small></td><td>${p0(c.p_novig)}</td><td>${p0(c.p_model)}<small>A ${p0(c.p_A)} · B ${p0(c.p_B)}</small></td><td class="${c.ev > 0 ? 'pos' : ''}">${pct1(c.ev)}<small>LCB ${pct1(c.ev_lcb)}</small></td><td>${c.dq?.dq ?? '—'}</td><td>${c.scores?.composite ?? '—'}<small>${c.percentil != null ? 'p' + Math.round(c.percentil * 100) : ''}</small></td><td><span class="sc-tier ${claseTier(c.estado)}">${etiquetaEstado(c.estado)}</span>${c.provisional ? `<small>→ ${etiquetaEstado(c.provisional)}</small>` : ''}</td><td><small>${esc(c.codes.join(', '))}${(c.detalles || []).length ? '<br>' + esc(c.detalles.join(' · ')) : ''}${(c.downgrade || []).length ? '<br>' + esc(c.downgrade.join(' | ')) : ''}</small></td></tr>`;
  return `<div class="sc-overlay" data-ac="cerrarPartido()"><div class="sc-mbox" data-ac="nada()">
    <div class="sc-mhd"><div><div class="sc-mtitle">${esc(fx.home)} <i>vs</i> ${esc(fx.away)}</div><div class="sc-msub">${esc(fx.comp.nombre)} · ${horaLocal(fx.kickoff)} · ${esc(fx.venue || '')}${fx.referee ? ' · árbitro ' + esc(fx.referee) : ''} · ${fx.casas} casas · ventana ${fx.ventana}</div></div><button class="sc-close" data-ac="cerrarPartido()">✕</button></div>
    <div class="sc-mgrid">
      <div><span>Modelo</span>${d ? `<b>λ ${d.LA.lh.toFixed(2)} – ${d.LA.la.toFixed(2)}</b><small>A: DC ρ=${modelos.get(fx.comp.id).cfg.rho} · B: bivariado λ3=${CONFIG.bivariado.lambda3} (${fx.xg_suficiente ? 'xG' : 'goles'}) · ESS ${d.ess.toFixed(1)} · sd(log λ) ${d.sd_log.toFixed(3)}</small>` : '<b>no disponible</b><small>cobertura insuficiente</small>'}</div>
      <div><span>1X2 ensamble</span>${d ? `<b>${p0(sumaRejilla(d.G, (x, y) => x > y))} · ${p0(sumaRejilla(d.G, (x, y) => x === y))} · ${p0(sumaRejilla(d.G, (x, y) => x < y))}</b><small>local · empate · visita</small>` : '<b>—</b>'}</div>
      <div><span>Alineaciones</span><b>${fx.lineup === 'CONFIRMED' ? '✓ XI oficial' : 'sin confirmar'}</b><small>${fx.formacion ? fx.formacion.join(' vs ') : (fx.lineup_error ? esc(fx.lineup_error) : 'se piden a ≤' + CONFIG.lineups_ventana_min + ' min del inicio')}${fx.gk_confirmed ? ' · porteros confirmados' : ''}</small></div>
      <div><span>Bajas reportadas</span><b>${fx.bajas.length}</b><small>${fx.bajas.slice(0, 6).map(b => esc(b.player) + (b.reason ? ' (' + esc(b.reason) + ')' : '')).join(', ') || (fx.injury_feed ? 'ninguna' : 'feed no disponible')}</small></div>
    </div>
    <table class="sc-table wide"><thead><tr><th>Selección</th><th>Cuota</th><th>Consenso</th><th>Modelo</th><th>EV</th><th>DQ</th><th>Score</th><th>Estado</th><th>Códigos / motivos</th></tr></thead><tbody>${cs.map(fila).join('')}</tbody></table>
    <p class="sc-note">Mercados de Fase 2 presentes en el snapshot pero no evaluados: ${[...new Set(fx.cuotas.filter(q => q.fase === 2).map(q => MERCADOS[q.mercado]?.nombre))].join(', ') || 'ninguno'}. Props de jugador registrados: ${fx.cuotas.filter(q => CONFIG.pod.mercados[q.bet_id]).length}.</p>
  </div></div>`;
}
// ── Acciones (privadas; el núcleo las despacha por data-ac) ──
async function analizar() {
  const btn = $f('sc-run'); if (btn) btn.disabled = true;
  ESTADO.msg = 'Evaluando las 20 competiciones… (fixtures, cuotas, bajas, resultados y alineaciones)'; pintar();
  try { const fecha = $f('sc-fecha')?.value || fechaSlate(); await correrAnalisis(fecha); ESTADO.msg = ''; pintar();
    ESTADO.guardado = await guardar(); pintar(); if (typeof isOwner === 'function' && isOwner()) cargarHistorial(); }
  catch (e) { ESTADO.msg = 'Error: ' + e.message; pintar(); console.error(e); }
  if (btn) btn.disabled = false;
}
function verPestana(p) { pestana = p; pintar(); }
function cambiarFecha() { /* la fecha se lee al analizar */ }
function abrirPartido(id) { const fx = ESTADO.partidos.find(p => p.id === id); if (!fx) return; modalFx = fx; const m = $f('sc-modal'); if (m) m.innerHTML = htmlModal(fx); }
function cerrarPartido() { modalFx = null; const m = $f('sc-modal'); if (m) m.innerHTML = ''; }
function nada() {}
function filtrarComp(id) { filtroComp = filtroComp === id ? null : id; pintar(); }
function iniciar() { const f = $f('sc-fecha'); if (f) f.value = fechaSlate(); pintar(); autoArranca(); }
// Bot (contrato del núcleo): ?deporte=futbol&auto=1 → analiza el slate de HOY (zona del Este) y guarda.
function autoArranca() {
  const modo = new URLSearchParams(location.search).get('auto'); if (!modo) return;
  let lanzado = false;
  const intenta = async () => { if (lanzado || !(typeof isOwner === 'function' && isOwner())) return; lanzado = true; AUTO.listo = true; AUTO.modo = modo;
    try { if (modo === 'grade') { await calificar(); AUTO.ok = true; AUTO.msg = ESTADO.msg; AUTO.resumen = { modo: 'grade', deporte: 'futbol', msg: ESTADO.msg }; }
      else { const hoy = fechaSlate(); const f = $f('sc-fecha'); if (f) f.value = hoy; await correrAnalisis(hoy); pintar(); ESTADO.guardado = await guardar(); pintar();
        AUTO.guardado = !!ESTADO.guardado.ok; AUTO.ok = true; const n = ESTADO.snapshot.counts.por_estado;
        AUTO.msg = `${ESTADO.partidos.length} partidos · ${ESTADO.cands.length} candidatos · Elite ${n[ESTADOS.ELITE] || 0} · Strong ${n[ESTADOS.STRONG] || 0} · Lean ${n[ESTADOS.LEAN] || 0} · guardado: ${AUTO.guardado ? 'sí' : 'NO (' + ESTADO.guardado.msg + ')'}`;
        AUTO.resumen = { modo: 'analysis', deporte: 'futbol', fecha: hoy, snapshot: ESTADO.snapshot.snapshot_id, partidos: ESTADO.partidos.length, candidatos: ESTADO.cands.length, por_estado: n, guardado: AUTO.guardado, pod: ESTADO.pod.status,
          senales: ESTADO.cands.filter(c => RANGO_ESTADO[c.estado] >= 2).map(c => ({ tier: c.estado, partido: `${c.fx.home} v ${c.fx.away}`, competicion: c.fx.comp.nombre, seleccion: selTxt(c), mercado: c.nombre, cuota: c.am, ev: c.ev, lcb: c.ev_lcb, dq: c.dq.dq, minimo: c.min_am })) }; } }
    catch (e) { AUTO.ok = false; AUTO.msg = e?.message || String(e); } finally { AUTO.done = true; } };
  try { sb.auth.onAuthStateChange(() => setTimeout(intenta, 400)); } catch (e) { /* sin supabase */ }
  setTimeout(intenta, 1500);
}

Deportes.registrar({
  id: 'futbol', nombre: 'SOCCER', icono: '⚽', titulo: 'SOCCER · HAXIOM EDGE', sub: 'Signal Engine v1.1 · Prop of the Day v1.0 · API-Football · Supabase',
  css: 'deportes/futbol.css', html: HTML,
  tablas: ['futbol_snapshots', 'futbol_cuotas', 'futbol_senales', 'futbol_pod', 'futbol_partidos', 'futbol_cierres', 'futbol_resultados', 'futbol_auditoria'],
  auto: AUTO, iniciar,
  manejadores: { analizar, calificar, verPestana, cambiarFecha, abrirPartido, cerrarPartido, nada, filtrarComp },
});

// Solo para las pruebas automatizadas (Node/vm): en el navegador `module` no existe y nada sale de aquí.
if (typeof module !== 'undefined' && module.exports) module.exports = { VERSIONES, CONFIG, COMPETICIONES, MERCADOS, RC, ESTADOS, decAAm, amADec, NOVIG, noVigCasa, consenso, rejillaDC, rejillaBiv, mezclaRejillas, sumaRejilla, unidad, unidadSel, masaEstados, evDeMasa, Fuerzas, ajustar, construirModelo, distribucionesPartido, normalizarCuotas, setsPorCasa, candidatosDe, asignarTiers, dqDe, scoresDe, evaluarPOD, tesisDe, registroDe, hashFNV, prng, correrAnalisis, _estado: () => ESTADO, _modelos: modelos };
})();
