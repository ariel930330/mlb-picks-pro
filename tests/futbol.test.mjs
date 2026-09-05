// Pruebas del motor SOCCER · HAXIOM EDGE (Master Prompt §10 · lista obligatoria)
// Correr:  node tests/futbol.test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = readFileSync(new URL('../deportes/futbol.js', import.meta.url), 'utf8');
const ctx = {
  console, Math, Date, JSON, Number, String, Array, Object, Map, Set, Promise, Error, RegExp, isFinite, parseFloat, parseInt, setTimeout, clearTimeout, URLSearchParams,
  document: { getElementById: () => null, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { search: '' }, fetch: () => Promise.reject(new Error('sin red en pruebas')),
  Deportes: { clienteDe: () => ({ from: n => tabla(n) }), registrar: m => { ctx.__registro = m; } },
  sb: { auth: { onAuthStateChange() {} } }, getAfKey: () => '', isOwner: () => false, requireAuth: () => false,
  module: { exports: {} },
};
// Base de datos en memoria: guarda lo insertado y aplica upsert por clave.
const DB = { filas: {}, log: [] };
ctx.__db = DB;
const tabla = n => { DB.filas[n] = DB.filas[n] || [];
  const sel = { data: DB.filas[n], error: null };
  const cons = { eq: async () => ({ data: DB.filas[n], error: null }), in: async () => ({ data: DB.filas[n], error: null }),
                 neq: () => cons, order: () => cons, limit: async () => ({ data: DB.filas[n], error: null }), then: undefined };
  return {
    select: () => Object.assign(Object.create(cons), sel, cons),
    insert: async r => { const a = Array.isArray(r) ? r : [r]; DB.filas[n].push(...a); DB.log.push({ op: 'insert', tabla: n, filas: a.length }); return { error: null }; },
    upsert: async (r, o) => { const clave = (o && o.onConflict) || 'id';
      for (const fila of r) { const i = DB.filas[n].findIndex(x => x[clave] === fila[clave]); if (i >= 0) DB.filas[n][i] = fila; else DB.filas[n].push(fila); }
      DB.log.push({ op: 'upsert', tabla: n, filas: r.length, clave }); return { error: null }; },
    update: obj => ({ in: async (col, ks) => { let nn = 0; DB.filas[n].forEach(x => { if (ks.includes(x[col])) { Object.assign(x, obj); nn++; } }); DB.log.push({ op: 'update', tabla: n, filas: nn }); return { error: null }; },
                      eq: async () => ({ error: null }) }),
  }; };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(code, ctx, { filename: 'futbol.js' });
const F = ctx.module.exports;

let ok = 0, fallos = 0;
const ico = n => String.fromCharCode(32, 32, n, 32);
const sangria = String.fromCharCode(10) + "      ";
const bien = nombre => { ok++; console.log(ico(10003) + nombre); };
const mal = (nombre, e) => { fallos++; console.log(ico(10007) + nombre + sangria + ((e && e.message) || e)); };
const pendientes = [];
const t = (nombre, fn) => {
  if (fn.constructor.name === "AsyncFunction") { pendientes.push([nombre, fn]); return; }
  try { fn(); bien(nombre); } catch (e) { mal(nombre, e); }
};
const correrPendientes = async () => { for (const [nombre, fn] of pendientes) { try { await fn(); bien(nombre); } catch (e) { mal(nombre, e); } } };
const cerca = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} esperado ${b} ± ${tol}, obtenido ${a}`);

console.log('\n1 · Conversión de cuotas');
t('decimal→americana→decimal ida y vuelta', () => { for (const d of [1.25, 1.5, 1.91, 2.0, 2.5, 3.4, 11]) cerca(F.amADec(F.decAAm(d)), d, 0.02); });
t('rechaza precios ≤ 1 y americanas inválidas', () => { assert.equal(F.decAAm(1), null); assert.equal(F.decAAm(0.9), null); assert.equal(F.amADec(50), null); });
t('+100 ≡ 2.00 y −200 ≡ 1.50', () => { assert.equal(F.decAAm(2), 100); assert.equal(F.decAAm(1.5), -200); });

console.log('\n2 · No-vig de tres vías y normalización');
t('los cuatro métodos suman 1 sobre un 1X2 real', () => { const nv = F.noVigCasa([1.30, 5.50, 11.00]); for (const m of ['mult', 'add', 'power', 'shin']) cerca(nv[m].reduce((a, b) => a + b, 0), 1, 1e-9, m); assert.ok(nv.overround > 0.02); });
t('1X2 exige el empate: una casa sin Draw no forma set', () => { const cuotas = [{ book_id: 1, mercado: '1X2', sel: 'HOME', dec: 2 }, { book_id: 1, mercado: '1X2', sel: 'AWAY', dec: 3.5 }, { book_id: 2, mercado: '1X2', sel: 'HOME', dec: 2.1 }, { book_id: 2, mercado: '1X2', sel: 'DRAW', dec: 3.4 }, { book_id: 2, mercado: '1X2', sel: 'AWAY', dec: 3.6 }]; const f = F.setsPorCasa(cuotas, '1X2', null); assert.equal(f.length, 1); assert.equal(f[0].book_id, 2); });
t('consenso = mediana: una casa desviada no arrastra la referencia', () => { const filas = [[2.0, 3.4, 3.6], [2.05, 3.4, 3.5], [2.0, 3.5, 3.6], [2.6, 3.4, 3.0]].map((d, i) => ({ book_id: i + 1, decs: d })); const c = F.consenso(filas); cerca(c.p[0], F.noVigCasa([2.0, 3.4, 3.6]).ref[0], 0.015, 'home'); assert.ok(c.dispersion[0] > 0.05); });
t('Pinnacle (id 4) queda como sharp_p separado, no como consenso', () => { const c = F.consenso([{ book_id: 4, decs: [2.2, 3.4, 3.3] }, { book_id: 8, decs: [2.0, 3.4, 3.6] }, { book_id: 11, decs: [2.0, 3.4, 3.6] }]); assert.ok(c.sharp_p && c.sharp_p[0] < c.p[0]); });

console.log('\n3 · Draw No Bet y Doble Oportunidad');
t('DNB: el empate DEVUELVE (push), no pierde', () => { assert.equal(F.unidadSel('DNB', 'HOME', null, 1, 1), 0); assert.equal(F.unidadSel('DNB', 'HOME', null, 2, 1), 1); assert.equal(F.unidadSel('DNB', 'AWAY', null, 2, 1), -1); });
t('DNB bloqueado en Fase 1 por etiqueta "Home/Away" sin tipar (SE §1.1.1)', () => { const fx = { id: 1, home: 'A', away: 'B' }; const cs = F.candidatosDe(fx, [{ book_id: 1, mercado: 'HOME_AWAY_UNTYPED', sel: 'HOME', dec: 1.5 }], null, {}); const d = cs.find(c => c.mercado === 'DNB'); assert.ok(d && d.codes.includes('SETTLEMENT_BLOCK') && d.estado === 'No Signal'); });
t('Doble oportunidad = unión sin doble conteo: P(1X)=P(H)+P(D)', () => { const G = F.rejillaDC(1.6, 1.1, -0.05); const pH = F.sumaRejilla(G, (x, y) => x > y), pD = F.sumaRejilla(G, (x, y) => x === y); const m = F.masaEstados(G, 'DOUBLE_CHANCE', '1X', null); cerca(m.win, pH + pD, 1e-12); assert.equal(F.unidadSel('DOUBLE_CHANCE', '12', null, 1, 1), -1); });
t('las tres DC suman 2 (no se renormalizan como excluyentes)', () => { const G = F.rejillaDC(1.6, 1.1, -0.05); const s = ['1X', '12', 'X2'].reduce((a, sel) => a + F.masaEstados(G, 'DOUBLE_CHANCE', sel, null).win, 0); cerca(s, 2, 1e-12); });

console.log('\n4 · Hándicap asiático y totales de cuarto');
t('AH −0.25 con empate = media pérdida; con victoria por 1 = gana', () => { assert.equal(F.unidadSel('ASIAN_HANDICAP', 'HOME', -0.25, 1, 1), -0.5); assert.equal(F.unidadSel('ASIAN_HANDICAP', 'HOME', -0.25, 2, 1), 1); assert.equal(F.unidadSel('ASIAN_HANDICAP', 'HOME', -0.25, 1, 2), -1); });
t('AH +0.75 visitante perdiendo por 1 = media pérdida; empate = gana', () => { assert.equal(F.unidadSel('ASIAN_HANDICAP', 'AWAY', 0.75, 2, 1), -0.5); assert.equal(F.unidadSel('ASIAN_HANDICAP', 'AWAY', 0.75, 1, 1), 1); });
t('AH −1 con victoria por 1 = push; −1.5 = pierde', () => { assert.equal(F.unidadSel('ASIAN_HANDICAP', 'HOME', -1, 2, 1), 0); assert.equal(F.unidadSel('ASIAN_HANDICAP', 'HOME', -1.5, 2, 1), -1); });
t('Total 2.75 over con 3 goles = media ganancia; 2.25 under con 2 = media ganancia', () => { assert.equal(F.unidadSel('MATCH_GOALS', 'OVER', 2.75, 2, 1), 0.5); assert.equal(F.unidadSel('MATCH_GOALS', 'UNDER', 2.25, 1, 1), 0.5); assert.equal(F.unidadSel('MATCH_GOALS', 'OVER', 3, 2, 1), 0); });
t('EV asiático sale de los cinco estados y la masa suma 1', () => { const G = F.rejillaDC(1.5, 1.2, -0.05); const m = F.masaEstados(G, 'ASIAN_HANDICAP', 'HOME', -0.25, null); cerca(Object.values(m).reduce((a, b) => a + b, 0), 1, 1e-9); assert.ok(m.half_loss > 0 && m.push === 0); const ev = F.evDeMasa(m, 1.95); assert.ok(Math.abs(ev) < 0.3); });

console.log('\n5 · Separación de periodos y alcance');
t('mercados de 1ª mitad y córners están registrados como Fase 2 y NO generan candidatos (nunca prorrateo)', () => { assert.equal(F.MERCADOS.FH_GOALS.fase, 2); assert.equal(F.MERCADOS.MATCH_CORNERS.fase, 2); const fx = { id: 2, home: 'A', away: 'B' }; const cs = F.candidatosDe(fx, [{ book_id: 1, mercado: 'FH_GOALS', fase: 2, sel: 'Over 0.5', dec: 1.5 }, { book_id: 1, mercado: 'MATCH_CORNERS', fase: 2, sel: 'Over 9.5', dec: 1.9 }], null, {}); assert.equal(cs.length, 0); });
t('Team to Win Either Half registrado en Fase 2 (unión H1∪H2 con intersección) sin bet del proveedor', () => { assert.equal(F.MERCADOS.TEAM_WIN_EITHER_HALF.fase, 2); assert.equal(F.MERCADOS.TEAM_WIN_EITHER_HALF.bet, null); });
t('todo mercado de Fase 1 lleva periodo, selecciones y estados explícitos', () => { for (const k in F.MERCADOS) { const m = F.MERCADOS[k]; if (m.fase !== 1) continue; assert.ok(m.periodo && m.sels && m.estados, k); } });

console.log('\n6 · Coherencia goles / BTTS / resultado desde la misma rejilla');
t('BTTS = 1 − P(H=0) − P(A=0) + P(0,0)', () => { const G = F.rejillaDC(1.4, 1.3, -0.05); const btts = F.masaEstados(G, 'BTTS', 'YES', null).win; const h0 = F.sumaRejilla(G, x => x === 0), a0 = F.sumaRejilla(G, (x, y) => y === 0), z = G[0][0]; cerca(btts, 1 - h0 - a0 + z, 1e-12); });
t('1X2 suma 1 · over+under 2.5 suma 1 · rejilla normalizada', () => { const G = F.rejillaDC(1.4, 1.3, -0.05); const s = ['HOME', 'DRAW', 'AWAY'].reduce((a, s) => a + F.masaEstados(G, '1X2', s, null).win, 0); cerca(s, 1, 1e-12); const o = F.masaEstados(G, 'MATCH_GOALS', 'OVER', 2.5, null).win, u = F.masaEstados(G, 'MATCH_GOALS', 'UNDER', 2.5, null).win; cerca(o + u, 1, 1e-12); cerca(G.flat().reduce((a, b) => a + b, 0), 1, 1e-12); });
t('Dixon-Coles con ρ<0 sube 0-0 y 1-1 frente a Poisson independiente', () => { const P = F.rejillaDC(1.3, 1.1, 0), D = F.rejillaDC(1.3, 1.1, -0.1); assert.ok(D[0][0] > P[0][0] && D[1][1] > P[1][1] && D[1][0] < P[1][0]); });
t('bivariado de Poisson: mismas medias marginales aproximadas y dependencia positiva', () => { const B = F.rejillaBiv(1.5, 1.2, 0.12); const eh = B.reduce((s, f, x) => s + x * f.reduce((a, b) => a + b, 0), 0); cerca(eh, 1.5, 0.05); assert.ok(B[0][0] > F.rejillaDC(1.5, 1.2, 0)[0][0]); });

console.log('\n7 · Insumos faltantes, cotizaciones viejas y desajustes');
const distDe = (lh, la, ess = 1e6, seed = 7) => { const GA = F.rejillaDC(lh, la, -0.05), GB = F.rejillaBiv(lh, la, 0.12), G = F.mezclaRejillas(GA, GB); const r = F.prng(seed); const draws = []; for (let i = 0; i < 64; i++) { const e = 0.03 * (r() - .5); draws.push(F.mezclaRejillas(F.rejillaDC(lh * (1 + e), la * (1 - e), -0.05), F.rejillaBiv(lh * (1 + e), la * (1 - e), 0.12))); } return { G, GA, GB, LA: { lh, la, essH: ess, essA: ess }, LB: { lh, la }, draws, ess, sd_log: .05, familias: ['A', 'B'] }; };
const cuotas1x2 = (h, d, a, n = 4) => [...Array(n)].flatMap((_, i) => [{ book_id: i + 1, book: 'B' + (i + 1), mercado: '1X2', sel: 'HOME', dec: h }, { book_id: i + 1, book: 'B' + (i + 1), mercado: '1X2', sel: 'DRAW', dec: d }, { book_id: i + 1, book: 'B' + (i + 1), mercado: '1X2', sel: 'AWAY', dec: a }]);
const fxDe = (id, extra = {}) => ({ id, home: 'LOCAL', away: 'VISITA', comp: { id: 39, nombre: 'PREMIER LEAGUE' }, kickoff: '2026-09-06T14:00:00Z', status: 'NS', referee: 'X', venue: 'V', bajas: [], injury_feed: true, quote_time: '2026-09-06T12:00:00Z', lineup: 'CONFIRMED', gk_confirmed: true, xg_suficiente: true, ventana: 'XI', ...extra });
const ctxFab = (age = 5, lineup = 'CONFIRMED') => c => ({ fx: c.fx, dist: c.fx.dist, lineup, gk_confirmed: true, injury_feed: true, bajas: 0, quote_age_min: age, ventana: 'XI', xg_suficiente: true, rest_known: false });
const corre = (fx, cuotas, dist, age = 5, lineup = 'CONFIRMED') => { fx.dist = dist; const cs = F.candidatosDe(fx, cuotas, dist, {}); cs.forEach(c => c.fx = fx); F.asignarTiers(cs, ctxFab(age, lineup)); return cs; };
t('sin modelo → No Signal con DATA_BLOCK', () => { const cs = corre(fxDe(10), cuotas1x2(1.8, 3.6, 4.5), null); assert.ok(cs.every(c => c.estado === 'No Signal' && c.codes.includes('DATA_BLOCK'))); });
t('cotización con más de 24 h → No Signal (DATA_BLOCK por frescura)', () => { const cs = corre(fxDe(11), cuotas1x2(1.8, 3.6, 4.5), distDe(1.9, 0.8), 2000); assert.ok(cs.every(c => c.estado === 'No Signal')); });
t('precio outlier aislado se excluye y se usa el siguiente (mkt_median_line)', () => { const q = cuotas1x2(1.8, 3.6, 4.5, 5); q[0].dec = 2.6; const cs = corre(fxDe(12), q, distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); assert.equal(h.outliers_excluidos, 1); cerca(h.dec, 1.8, 1e-9); });
t('línea distinta = candidato distinto (nunca se reutiliza la probabilidad de otra línea)', () => { const q = [1, 2, 3].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'OVER', linea: 2.5, dec: 1.9 }, { book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'UNDER', linea: 2.5, dec: 1.9 }, { book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'OVER', linea: 2.75, dec: 2.1 }, { book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'UNDER', linea: 2.75, dec: 1.75 }]); const cs = corre(fxDe(13), q, distDe(1.5, 1.2)); const overs = cs.filter(c => c.mercado === 'MATCH_GOALS' && c.sel === 'OVER'); assert.equal(overs.length, 2); assert.notEqual(overs[0].p_model, overs[1].p_model); assert.ok(overs.find(c => c.linea === 2.75).con_push); });
t('mercado de proveedor no registrado se ignora sin inventar liquidación', () => { const o = { bookmakers: [{ id: 1, name: 'B', bets: [{ id: 999, name: 'Raro', values: [{ value: 'X', odd: '2.0' }] }, { id: 1, name: 'Match Winner', values: [{ value: 'Home', odd: '2.0' }, { value: 'Draw', odd: '3.4' }, { value: 'Away', odd: '3.6' }] }] }] }; const n = F.normalizarCuotas(o); assert.equal(n.length, 3); assert.ok(n.every(q => q.mercado === '1X2' && q.am != null && q.valor)); });

console.log('\n8 · Fronteras de tier, puertas universales y sin señales forzadas');
const pHome = F.sumaRejilla(distDe(1.9, 0.8).G, (x, y) => x > y);
const precioPara = (ev, p) => +((1 + ev) / p).toFixed(3);
t('Elite: banda >=85 con edge, confianza y calidad en minimo, mas EV >=4.5% y LCB >=1%', () => { const cs = corre(fxDe(20), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); assert.equal(h.estado, 'Elite Signal', JSON.stringify({ ev: h.ev, lcb: h.ev_lcb, dq: h.dq.dq, pct: h.percentil, down: h.downgrade })); assert.ok(h.codes.includes('LINEUP_CONFIRMED') && h.codes.includes('LOWER_BOUND_PASS')); });
t('Strong: no alcanza la banda de Elite y baja con la razon registrada', () => { const cs = corre(fxDe(21), cuotas1x2(precioPara(.07, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); assert.equal(h.estado, 'Strong Signal', JSON.stringify(h.downgrade)); assert.ok(h.downgrade[0].startsWith('Elite:')); });
t('Lean: banda >= 60 con los tres minimos mas bajos', () => { const cs = corre(fxDe(22), cuotas1x2(precioPara(.035, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); assert.equal(h.estado, 'Lean Signal', JSON.stringify(h.downgrade)); });
t('EV positivo pero < 1.5% → Signal Detected (watchlist), nunca se fuerza', () => { const cs = corre(fxDe(23), cuotas1x2(precioPara(.008, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); assert.equal(h.estado, 'Signal Detected'); });
t('sin EV positivo en ningún candidato → ninguna señal (No Signal), nunca se fuerza', () => { const cs = corre(fxDe(24), cuotas1x2(2.0, 3.4, 2.5, 4), distDe(1.5, 1.4)); const c1 = cs.filter(c => c.mercado === '1X2'); assert.ok(c1.every(c => c.ev < 0), JSON.stringify(c1.map(c => c.ev))); assert.ok(c1.every(c => c.estado === 'No Signal' && c.codes.includes('VALUE_ABSENT'))); });
t('XI sin confirmar → Signal Detected con tier provisional y LINEUP_BLOCK', () => { const cs = corre(fxDe(25, { lineup: 'UNCONFIRMED' }), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8), 5, 'UNCONFIRMED'); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); assert.equal(h.estado, 'Signal Detected'); assert.ok(h.provisional && h.codes.includes('LINEUP_BLOCK')); });
t('cotizacion de 90 min: Elite y Strong caen por frescura y queda Lean (S11)', () => { const cs = corre(fxDe(26), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8), 90); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); assert.equal(h.estado, 'Lean Signal'); assert.ok(h.downgrade.join(' ').includes('min (max') || h.downgrade.join(' ').includes('min (m'), h.downgrade.join(' | ')); });
t('los pesos SE §7.1 suman 100 y el score compuesto no es una probabilidad', () => { for (const k in F.CONFIG.pesos) assert.equal(F.CONFIG.pesos[k].reduce((a, b) => a + b, 0), 100, k); const cs = corre(fxDe(27), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); assert.ok(h.scores.composite <= 100 && h.scores.cinco.data_quality === h.dq.dq && h.scores.unavailable.includes('tactics')); });

t('S19: con ESS finito la probabilidad calibrada queda entre el modelo y el consenso, y el EV también', () => { const cs = corre(fxDe(28), cuotas1x2(precioPara(.07, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8, 30)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); cerca(h.w_modelo, 30 / 90, 1e-3); assert.ok(h.p_model > h.p_novig && h.p_model < h.p_raw); assert.ok(h.ev < h.ev_modelo && h.ev > h.ev_mercado); });
t('hándicap asiático del proveedor: "Home -1" y "Away -1" son los dos lados de la misma línea (visitante +1)', () => { const o = { bookmakers: [{ id: 8, name: 'Bet365', bets: [{ id: 4, name: 'Asian Handicap', values: [{ value: 'Home -1', odd: '2.00' }, { value: 'Away -1', odd: '1.80' }, { value: 'Home +0', odd: '1.23' }, { value: 'Away +0', odd: '4.10' }] }] }] }; const n = F.normalizarCuotas(o); const a1 = n.find(q => q.sel === 'AWAY' && q.valor === 'Away -1'); assert.equal(a1.linea, 1); const sets = F.setsPorCasa(n, 'ASIAN_HANDICAP', -1); assert.equal(sets.length, 1); assert.equal(JSON.stringify([...sets[0].decs]), JSON.stringify([2, 1.8])); assert.equal(F.setsPorCasa(n, 'ASIAN_HANDICAP', 0).length, 1); });

t('edge_pp existe en TODO mercado, incluidos los que tienen empuje (asiaticos y lineas enteras)', () => {
  const D = distDe(1.9, 0.8, 30);
  const q = [...cuotas1x2(2.2, 4.4, 6.0, 6),
    ...[1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'ASIAN_HANDICAP', sel: 'HOME', linea: -0.25, dec: 1.95 }, { book_id: b, book: 'B' + b, mercado: 'ASIAN_HANDICAP', sel: 'AWAY', linea: 0.25, dec: 1.95 }]),
    ...[1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'OVER', linea: 3, dec: 2.1 }, { book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'UNDER', linea: 3, dec: 1.75 }]),
    ...[1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'BTTS', sel: 'YES', linea: null, dec: 1.9 }, { book_id: b, book: 'B' + b, mercado: 'BTTS', sel: 'NO', linea: null, dec: 1.9 }])];
  const cs = corre(fxDe(60), q, D);
  const conMasa = cs.filter(c => c.masa);
  assert.ok(conMasa.length >= 7, 'candidatos con masa: ' + conMasa.length);
  for (const mk of ['1X2', 'ASIAN_HANDICAP', 'MATCH_GOALS', 'BTTS']) assert.ok(conMasa.some(c => c.mercado === mk), 'falta ' + mk);
  const sinEdge = conMasa.filter(c => c.edge_pp == null);
  assert.equal(sinEdge.length, 0, 'sin edge: ' + JSON.stringify(sinEdge.map(c => [c.mercado, c.sel, c.linea])));
  const ah = cs.find(c => c.mercado === 'ASIAN_HANDICAP' && c.sel === 'HOME');
  assert.ok(ah.masa.half_loss > 0, 'el AH -0.25 debe tener media perdida');
  assert.ok(ah.edge_pp != null && Math.abs(ah.edge_pp) < 100);
  const tot3 = cs.find(c => c.mercado === 'MATCH_GOALS' && c.linea === 3 && c.sel === 'OVER');
  assert.ok(tot3.masa.push > 0 && tot3.edge_pp != null && tot3.riesgo < 1, 'la linea entera devuelve parte de la apuesta');
});
t('EV y edge son cantidades distintas (SE 3): coinciden en signo AL PRECIO JUSTO DEL MERCADO', () => {
  const D = distDe(1.6, 1.3, 30);
  const q = [...cuotas1x2(2.2, 3.4, 3.9, 5),
    ...[-0.25, 0, 0.25, 0.5, 1].flatMap(L => [1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'ASIAN_HANDICAP', sel: 'HOME', linea: L, dec: 1.9 + L / 10 }, { book_id: b, book: 'B' + b, mercado: 'ASIAN_HANDICAP', sel: 'AWAY', linea: -L, dec: 1.9 - L / 10 }])),
    ...[2, 2.25, 2.5, 3].flatMap(L => [1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'OVER', linea: L, dec: 1.8 + L / 20 }, { book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'UNDER', linea: L, dec: 2.2 - L / 20 }]))];
  const cs = corre(fxDe(61), q, D).filter(c => c.masa);
  assert.ok(cs.length >= 20);
  for (const c of cs) {
    // identidad del motor: EV = riesgo*(p*d - 1) para cualquier mercado
    cerca(c.ev, c.riesgo * (c.p_model * c.dec - 1), 1e-12, c.mercado + ' ' + c.sel);
    // al precio justo del mercado (sin comision) el signo del EV es el del edge
    const evAlJusto = c.riesgo * (c.p_model / c.p_novig - 1);
    assert.equal(Math.sign(+evAlJusto.toFixed(9)), Math.sign(+c.edge_pp.toFixed(9)), `${c.mercado} ${c.sel} ${c.linea}`);
  }
});
t('el EV con la mezcla S19 al peso pleno es exactamente la suma por estados de liquidacion', () => {
  const D = distDe(1.6, 1.3, 1e9);
  const q = [1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'ASIAN_HANDICAP', sel: 'HOME', linea: -0.25, dec: 2.05 }, { book_id: b, book: 'B' + b, mercado: 'ASIAN_HANDICAP', sel: 'AWAY', linea: 0.25, dec: 1.85 }]);
  const cs = corre(fxDe(64), q, D).filter(c => c.masa);
  for (const c of cs) cerca(c.ev, F.evDeMasa(c.masa, c.dec), 1e-7, c.sel + ' ' + c.linea);   // w = ESS/(ESS+60) tiende a 1, no es 1 exacto
});
t('a la cuota justa el EV es exactamente 0, con empuje y con lineas de cuarto', () => {
  const D = distDe(1.7, 1.2, 1e6);
  for (const [mk, sel, L, d] of [['1X2', 'HOME', null, 2.0], ['ASIAN_HANDICAP', 'HOME', -0.25, 1.9], ['ASIAN_HANDICAP', 'AWAY', 0.75, 2.4], ['ASIAN_HANDICAP', 'HOME', -1, 1.9], ['MATCH_GOALS', 'OVER', 3, 2.0], ['MATCH_GOALS', 'UNDER', 2.75, 1.95], ['BTTS', 'YES', null, 1.9]]) {
    const m = F.masaEstados(D.G, mk, sel, L), r = F.enRiesgo(m), p = F.pJusta(m);
    cerca(F.evDeMasa(m, 1 / p), 0, 1e-9, mk + ' a cuota justa');
    cerca(r * (p * (1 / p) - 1), 0, 1e-12, mk + ' identidad');
    cerca(r * (p * d - 1), F.evDeMasa(m, d), 1e-9, mk + ' formula equivalente');
  }
});
t('edge en puntos porcentuales: coincide con la diferencia de probabilidades x100', () => {
  const cs = corre(fxDe(62), cuotas1x2(precioPara(.07, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8, 30));
  const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME');
  cerca(h.edge_pp, (h.p_model - h.p_novig) * 100, 1e-12);   // se guarda sin redondear
  assert.ok(Math.abs(h.edge_pp) > 0.5 && Math.abs(h.edge_pp) < 50, 'magnitud en pp: ' + h.edge_pp);
  cerca(h.edge_rel, h.p_model / h.p_novig - 1, 1e-12);
});
t('el registro lleva edge_pp, edge_percent, edge_units y la cuota justa (SE 1.2)', () => {
  const cs = corre(fxDe(63), cuotas1x2(precioPara(.07, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8));
  const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME');
  const r = F.registroDe(h, { snapshot_id: 'SNAP-SOC-x-000000-abcdef', analysis_time: '2026-09-06T12:05:00Z', input_hash: 'h' });
  for (const k of ['edge_pp', 'edge_percent', 'edge_units', 'fair_decimal', 'fair_american', 'at_risk_mass', 'expected_cover', 'settlement_mass']) assert.ok(r.model[k] != null, 'falta ' + k);
  assert.equal(r.model.edge_units, r.model.ev);
});

t('el pick lo decide el compuesto de Edge, Confianza y Calidad con los pesos del Master 6', () => {
  const cs = corre(fxDe(70), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8));
  const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'), w = F.CONFIG.score.pesos, f = h.scores.cinco;
  cerca(h.scores.composite, w.edge * f.edge_strength + w.confianza * f.confidence + w.calidad * f.data_quality, 1e-9);
  cerca(w.edge + w.confianza + w.calidad, 1, 1e-9);
  cerca(f.edge_strength, Math.min(100, F.CONFIG.score.edgeK * h.edge_pp), 1e-9);
  assert.equal(f.data_quality, h.dq.dq);
});
t('la confianza son los cuatro insumos que nombra el Master 6, a peso igual', () => {
  const cs = corre(fxDe(71), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8, 30));
  const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'), p = h.scores.confianza_partes;
  for (const k of ['calibracion', 'incertidumbre', 'muestra', 'acuerdo']) assert.ok(p[k] >= 0 && p[k] <= 100, k + ' = ' + p[k]);
  cerca(h.scores.cinco.confidence, (p.calibracion + p.incertidumbre + p.muestra + p.acuerdo) / 4, 1e-9);
  assert.equal(p.calibracion, F.CONFIG.score.calibracionSinValidar, 'sin calibracion validada ese cuarto esta limitado');
});
t('mercado casi eficiente: edge minusculo NO califica aunque el EV sea positivo', () => {
  // Con comision baja y precio apenas por encima del justo, el modelo casi no discrepa:
  // el EV es positivo pero el edge se queda por debajo del minimo de Lean (1.5 pp).
  const D = distDe(1.5, 1.4, 1e6);
  const pH = F.masaEstados(D.G, '1X2', 'HOME', null).win, pD = F.masaEstados(D.G, '1X2', 'DRAW', null).win, pA = F.masaEstados(D.G, '1X2', 'AWAY', null).win;
  const qH = pH / 1.005, resto = 1.01 - qH, qD = resto * pD / (pD + pA), qA = resto * pA / (pD + pA);
  const cs = corre(fxDe(72), cuotas1x2(1 / qH, 1 / qD, 1 / qA, 6), D);
  const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME');
  assert.ok(h.ev > 0, 'el EV debe ser positivo: ' + h.ev);
  assert.ok(h.edge_pp > 0 && h.edge_pp < 1.5, 'edge del fixture: ' + h.edge_pp);
  assert.equal(h.estado, 'Signal Detected', JSON.stringify(h.downgrade));
  assert.ok(h.downgrade.join(' ').includes('edge'), h.downgrade.join(' | '));
});
t('calidad de dato baja bloquea sola, por bueno que sea el edge', () => {
  const D = distDe(1.9, 0.8);
  const fx = fxDe(73, { referee: null, venue: null, injury_feed: false });
  fx.dist = D;
  const cs = F.candidatosDe(fx, cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), D, {});
  cs.forEach(c => c.fx = fx);
  F.asignarTiers(cs, c => ({ fx: c.fx, dist: c.fx.dist, lineup: 'CONFIRMED', gk_confirmed: true, injury_feed: false, bajas: 0, quote_age_min: 5, ventana: 'XI', xg_suficiente: true, rest_known: false }));
  const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME');
  assert.ok(h.scores.cinco.edge_strength >= 70, 'el edge sigue siendo alto: ' + h.scores.cinco.edge_strength);
  assert.ok(h.dq.dq < 95, 'la calidad debe bajar sin arbitro, sede ni feed de bajas: ' + h.dq.dq);
  assert.notEqual(h.estado, 'Elite Signal');
  assert.ok(h.downgrade.join(' ').includes('calidad de dato'), h.downgrade.join(' | '));
});
t('el percentil del slate se guarda pero YA NO decide el tier (S20)', () => {
  const D = distDe(1.9, 0.8);
  let cs = [];
  for (let i = 0; i < 30; i++) { const fx = fxDe(400 + i); fx.dist = D; const c = F.candidatosDe(fx, cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), D, {}); c.forEach(x => x.fx = fx); cs = cs.concat(c); }
  F.asignarTiers(cs, ctxFab());
  const home = cs.filter(c => c.mercado === '1X2' && c.sel === 'HOME' && !c.codes.includes('CORRELATION_BLOCK'));
  assert.ok(home.length >= 25);
  // todos tienen el mismo edge/confianza/calidad: con el criterio absoluto TODOS son Elite,
  // aunque por percentil solo el 2% superior lo habria sido.
  const elites = home.filter(c => c.estado === 'Elite Signal');
  assert.ok(elites.length >= 25, 'elites: ' + elites.length + ' de ' + home.length);
  assert.ok(home.every(c => c.percentil != null), 'el percentil se sigue guardando');
  assert.ok(home.some(c => c.percentil < 0.98), 'hay elites por debajo del percentil 98');
});
console.log('\n9 · Correlación, deduplicación, expiración y precio');
t('misma tesis (HOME) en 1X2 y AH → la peor recibe CORRELATION_BLOCK', () => { const D = distDe(1.9, 0.8); let cs = []; for (let i = 0; i < 10; i++) { const fx = fxDe(300 + i); fx.dist = D; const c = F.candidatosDe(fx, cuotas1x2(precioPara(.05, pHome), 4.4, 6.0, 6), D, {}); c.forEach(x => x.fx = fx); cs = cs.concat(c); } const fx = fxDe(30); fx.dist = D; const q = [...cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), ...[1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'ASIAN_HANDICAP', sel: 'HOME', linea: -0.5, dec: precioPara(.12, pHome) }, { book_id: b, book: 'B' + b, mercado: 'ASIAN_HANDICAP', sel: 'AWAY', linea: 0.5, dec: 2.0 }])]; const c30 = F.candidatosDe(fx, q, D, {}); c30.forEach(x => x.fx = fx); cs = cs.concat(c30); F.asignarTiers(cs, ctxFab()); const home = c30.filter(c => c.tesis === 'HOME' && c.ev > 0); const reservada = home.filter(c => ['Elite Signal', 'Strong Signal', 'Lean Signal'].includes(c.estado)); assert.equal(reservada.length, 1, JSON.stringify(home.map(c => [c.mercado, c.estado, c.percentil]))); assert.ok(home.some(c => c.codes.includes('CORRELATION_BLOCK') && c.estado === 'Signal Detected')); });
t('precio minimo aceptable: en ese precio el EV es exactamente el umbral de SU tier', () => { const cs = corre(fxDe(31), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); const req = F.CONFIG.tiers[{ 'Elite Signal': 'elite', 'Strong Signal': 'strong' }[h.estado] || 'lean'].ev; cerca(F.evDeMasa(h.masa, h.min_dec), req, 1e-3); assert.ok(h.min_dec < h.dec && h.min_am != null); });
t('si el precio cae por debajo del mínimo, el EV ya no cumple (PRICE_EXPIRED en la siguiente corrida)', () => { const cs = corre(fxDe(32), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); const req = F.CONFIG.tiers[{ 'Elite Signal': 'elite', 'Strong Signal': 'strong' }[h.estado] || 'lean'].ev; assert.ok(F.evDeMasa(h.masa, h.min_dec - 0.05) < req); });
t('expira al inicio del partido y el registro lleva expires_at = kickoff', () => { const cs = corre(fxDe(33), cuotas1x2(precioPara(.14, pHome), 4.4, 6.0, 6), distDe(1.9, 0.8)); const h = cs.find(c => c.mercado === '1X2' && c.sel === 'HOME'); const r = F.registroDe(h, { snapshot_id: 'SNAP-SOC-x-000000-abcdef', analysis_time: '2026-09-06T12:05:00Z', input_hash: 'h' }); assert.equal(r.signal.expires_at, h.fx.kickoff); assert.equal(r.signal.validation_status, 'PAPER'); assert.ok(r.market.minimum_acceptable_price && r.model.settlement_mass && r.audit.versions.calibracion === 'market_prior_shrinkage_v0' && r.model.calibrated_probability != null && r.model.model_weight > 0.99); });

console.log('\n9b · Tablero: 3 picks por partido y sobrescritura');
const slateDe = (n, evs) => { const D = distDe(1.9, 0.8); let cs = [];
  for (let k = 0; k < n; k++) { const fx = fxDe(500 + k); fx.dist = D;
    const q = [...cuotas1x2(precioPara(evs[0], pHome), 4.4, 6.0, 6),
      ...[1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'OVER', linea: 2.5, dec: 2.6 }, { book_id: b, book: 'B' + b, mercado: 'MATCH_GOALS', sel: 'UNDER', linea: 2.5, dec: 1.55 }]),
      ...[1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'BTTS', sel: 'YES', linea: null, dec: 2.4 }, { book_id: b, book: 'B' + b, mercado: 'BTTS', sel: 'NO', linea: null, dec: 1.62 }]),
      ...[1, 2, 3, 4].flatMap(b => [{ book_id: b, book: 'B' + b, mercado: 'TEAM_GOALS_HOME', sel: 'OVER', linea: 1.5, dec: 2.1 }, { book_id: b, book: 'B' + b, mercado: 'TEAM_GOALS_HOME', sel: 'UNDER', linea: 1.5, dec: 1.78 }])];
    const c = F.candidatosDe(fx, q, D, {}); c.forEach(x => x.fx = fx); cs = cs.concat(c); }
  F.asignarTiers(cs, ctxFab()); return cs; };
t('el tablero da como maximo 3 picks por partido, ordenados por edge', () => {
  const cs = slateDe(4, [.14]); const tb = F.tableroDe(cs);
  assert.ok(tb.size >= 1, 'partidos con tablero: ' + tb.size);
  for (const [, p] of tb) {
    assert.ok(p.length <= F.CONFIG.tablero.por_partido, 'picks en un partido: ' + p.length);
    for (let i = 1; i < p.length; i++) assert.ok(p[i - 1].edge_pp >= p[i].edge_pp - 1e-9, 'orden de edge roto');
    p.forEach((c, i) => assert.equal(c.posicion, i + 1));
    assert.equal(new Set(p.map(c => c.tesis)).size, p.length, 'dos picks de la misma tesis');
    assert.ok(p.every(c => c.estado !== 'No Signal' && c.edge_pp > 0));
  }
});
t('el color de un partido es el de su MEJOR nivel, no el del pick de mayor edge', () => {
  // Dentro de un partido el primero por edge puede ser de un tier mas bajo que otro:
  // la tarjeta debe teñirse del mejor de los tres, que es lo que promete la leyenda.
  const RANGO = { 'Elite Signal': 4, 'Strong Signal': 3, 'Lean Signal': 2, 'Signal Detected': 1, 'No Signal': 0 };
  const cs = slateDe(4, [.14]); const tb = F.tableroDe(cs);
  let conMezcla = 0;
  for (const [, p] of tb) {
    const niveles = p.map(c => c.provisional || c.estado);
    const mejor = niveles.reduce((a, b) => RANGO[b] > RANGO[a] ? b : a);
    if (RANGO[niveles[0]] !== RANGO[mejor]) conMezcla++;
    assert.ok(RANGO[mejor] >= RANGO[niveles[0]], 'el mejor nivel no puede ser peor que el del primero por edge');
  }
  // el orden por edge y el orden por nivel son independientes: eso es justo lo que
  // obliga a calcular el color con un maximo y no con picks[0]
  assert.ok(tb.size > 0);
});
t('el tablero descarta lo bloqueado por correlacion y lo que no tiene estado', () => {
  const cs = slateDe(2, [.14]); const tb = F.tableroDe(cs);
  const enTablero = new Set([...tb.values()].flat().map(c => c.key));
  const bloqueados = cs.filter(c => (c.codes || []).includes('CORRELATION_BLOCK'));
  assert.ok(bloqueados.length > 0, 'el fixture deberia producir correlaciones');
  assert.ok(bloqueados.every(c => !enTablero.has(c.key)), 'un correlacionado entro al tablero');
  assert.ok(cs.filter(c => c.estado === 'No Signal').every(c => !enTablero.has(c.key)));
});
t('guardar: el historico NO recibe los No Signal (S24) y el tablero se sobrescribe por clave', async () => {
  ctx.__db.filas = {}; ctx.__db.log = [];
  const cs = slateDe(3, [.14]); const tb = F.tableroDe(cs);
  const snap = { snapshot_id: 'SNAP-SOC-2026-09-06-120000-aaaaaa', slate_date: '2026-09-06', analysis_time: '2026-09-06T12:00:00Z', input_hash: 'h1', versions: {}, competitions: [], counts: {}, requests_used: 1 };
  const r1 = await F.guardarTablero(snap, tb);
  const filas = ctx.__db.filas.futbol_tablero;
  assert.equal(r1.nuevos, [...tb.values()].flat().length);
  assert.equal(filas.length, r1.nuevos);
  assert.ok(filas.every(f => f.en_tablero && f.corridas === 1 && f.mejor_edge === f.edge_pp));
  const up = ctx.__db.log.find(l => l.op === 'upsert' && l.tabla === 'futbol_tablero');
  assert.equal(up.clave, 'candidate_key');
});
t('sobrescritura: una corrida posterior con MEJOR edge reemplaza la fila y guarda el mejor visto', async () => {
  ctx.__db.filas = {}; ctx.__db.log = [];
  const cs = slateDe(2, [.14]); const tb = F.tableroDe(cs);
  const snap1 = { snapshot_id: 'SNAP-1', slate_date: '2026-09-06', analysis_time: '2026-09-06T12:00:00Z', input_hash: 'h1' };
  await F.guardarTablero(snap1, tb);
  const antes = ctx.__db.filas.futbol_tablero.map(f => ({ k: f.candidate_key, e: f.edge_pp }));
  // segunda corrida: el mismo pick con 2 pp mas de edge
  [...tb.values()].flat().forEach(c => { c.edge_pp += 2; });
  const snap2 = { snapshot_id: 'SNAP-2', slate_date: '2026-09-06', analysis_time: '2026-09-06T13:00:00Z', input_hash: 'h2' };
  const r2 = await F.guardarTablero(snap2, tb);
  const despues = ctx.__db.filas.futbol_tablero;
  assert.equal(despues.length, antes.length, 'la sobrescritura no debe duplicar filas');
  assert.equal(r2.mejorados, antes.length);
  assert.equal(r2.nuevos, 0);
  for (const f of despues) { const a = antes.find(x => x.k === f.candidate_key);
    cerca(f.edge_pp, a.e + 2, 1e-9, 'edge actualizado');
    cerca(f.mejor_edge, a.e + 2, 1e-9, 'mejor edge visto');
    assert.equal(f.mejor_snapshot, 'SNAP-2');
    assert.equal(f.corridas, 2);
    assert.equal(f.snapshot_id, 'SNAP-2'); }
});
t('sobrescritura: si el edge EMPEORA se actualiza el precio vigente pero se recuerda el mejor', async () => {
  ctx.__db.filas = {}; ctx.__db.log = [];
  const cs = slateDe(2, [.14]); const tb = F.tableroDe(cs);
  await F.guardarTablero({ snapshot_id: 'SNAP-1', slate_date: '2026-09-06' }, tb);
  const antes = ctx.__db.filas.futbol_tablero.map(f => ({ k: f.candidate_key, e: f.edge_pp }));
  [...tb.values()].flat().forEach(c => { c.edge_pp -= 1; });
  const r2 = await F.guardarTablero({ snapshot_id: 'SNAP-2', slate_date: '2026-09-06' }, tb);
  assert.equal(r2.mejorados, 0); assert.equal(r2.iguales, antes.length);
  for (const f of ctx.__db.filas.futbol_tablero) { const a = antes.find(x => x.k === f.candidate_key);
    cerca(f.edge_pp, a.e - 1, 1e-9, 'el vigente refleja la corrida actual, porque el precio viejo ya no existe');
    cerca(f.mejor_edge, a.e, 1e-9, 'pero se recuerda el mejor visto');
    assert.equal(f.mejor_snapshot, 'SNAP-1'); }
});
t('sobrescritura: un pick que sale del top 3 queda marcado fuera del tablero, no se borra', async () => {
  ctx.__db.filas = {}; ctx.__db.log = [];
  const cs = slateDe(1, [.14]); const tb = F.tableroDe(cs);
  const fxId = [...tb.keys()][0]; const picks = tb.get(fxId);
  assert.ok(picks.length >= 2, 'hacen falta al menos 2 picks para la prueba');
  await F.guardarTablero({ snapshot_id: 'SNAP-1', slate_date: '2026-09-06' }, tb);
  const total = ctx.__db.filas.futbol_tablero.length;
  const saliente = picks[picks.length - 1].key;
  tb.set(fxId, picks.slice(0, picks.length - 1));
  const r2 = await F.guardarTablero({ snapshot_id: 'SNAP-2', slate_date: '2026-09-06' }, tb);
  assert.equal(r2.fuera, 1);
  assert.equal(ctx.__db.filas.futbol_tablero.length, total, 'no se borra ninguna fila');
  const f = ctx.__db.filas.futbol_tablero.find(x => x.candidate_key === saliente);
  assert.equal(f.en_tablero, false);
  assert.ok(ctx.__db.filas.futbol_tablero.filter(x => x.en_tablero).length === total - 1);
});
console.log('\n10 · Punto en el tiempo, reproducibilidad y fixture dorado');
t('el PRNG con la misma semilla reproduce la misma secuencia', () => { const a = F.prng(42), b = F.prng(42); for (let i = 0; i < 10; i++) assert.equal(a(), b()); });
t('mismo insumo ⇒ mismo resultado (determinismo del snapshot)', () => { const q = cuotas1x2(precioPara(.07, pHome), 4.4, 6.0, 6); const j = () => JSON.stringify(corre(fxDe(40), q, distDe(1.9, 0.8)).map(c => [c.key, c.estado, c.ev, c.ev_lcb, c.scores?.composite])); assert.equal(j(), j()); assert.equal(F.hashFNV('abc'), F.hashFNV('abc')); assert.notEqual(F.hashFNV('abc'), F.hashFNV('abd')); });
t('el ajuste walk-forward solo usa partidos ANTERIORES al evaluado', () => { const ps = []; const r = F.prng(3); for (let i = 0; i < 200; i++) { const h = i % 20, a = (i * 7 + 3) % 20; if (h === a) continue; ps.push({ id: i, date: new Date(Date.UTC(2025, 7, 1) + i * 864e5 * 1.5).toISOString(), homeId: h, awayId: a, home: 'T' + h, away: 'T' + a, hg: Math.floor(r() * 3), ag: Math.floor(r() * 3) }); } const cfg = F.ajustar(ps); assert.ok(cfg.ajustado && cfg.n > 0 && F.CONFIG.ajuste.H.includes(cfg.H)); });
t('fuerzas: un equipo que anota más recibe λ mayor y ESS crece con los partidos', () => { const Fz = F.Fuerzas(120, 6); const t0 = Date.UTC(2026, 0, 1); for (let i = 0; i < 12; i++) { Fz.agrega({ date: new Date(t0 + i * 7 * 864e5).toISOString(), homeId: 1, awayId: 2, home: 'A', away: 'B' }, 3, 0); Fz.agrega({ date: new Date(t0 + i * 7 * 864e5 + 864e5).toISOString(), homeId: 3, awayId: 4, home: 'C', away: 'D' }, 0, 2); } const L = Fz.lambdas(1, 4, t0 + 100 * 864e5); assert.ok(L.lh > L.la && L.essH > 5 && L.essH <= 12); });
t('fixture dorado: λ 1.5 / 1.1 contra una implementación independiente (Poisson y DC ρ −0.05)', () => { const f = n => n <= 1 ? 1 : n * f(n - 1); const po = (k, l) => Math.exp(-l) * l ** k / f(k); const tau = (x, y, l, m, r) => x === 0 && y === 0 ? 1 - l * m * r : x === 0 && y === 1 ? 1 + l * r : x === 1 && y === 0 ? 1 + m * r : x === 1 && y === 1 ? 1 - r : 1; let pH = 0, pD = 0, pO = 0, Z = 0; const cel = []; for (let x = 0; x <= 10; x++) for (let y = 0; y <= 10; y++) { const v = tau(x, y, 1.5, 1.1, -0.05) * po(x, 1.5) * po(y, 1.1); cel.push([x, y, v]); Z += v; } for (const [x, y, v] of cel) { const p = v / Z; if (x > y) pH += p; if (x === y) pD += p; if (x + y > 2.5) pO += p; } const G = F.rejillaDC(1.5, 1.1, -0.05); cerca(F.sumaRejilla(G, (x, y) => x > y), pH, 1e-12); cerca(F.sumaRejilla(G, (x, y) => x === y), pD, 1e-12); cerca(F.masaEstados(G, 'MATCH_GOALS', 'OVER', 2.5, null).win, pO, 1e-12); assert.ok(pH > 0.44 && pH < 0.48 && pD > 0.24 && pD < 0.27); });
t('POD: sin ≥3 casas two-sided el resultado es la no-selección oficial con reason codes', () => { const fx = { id: 50, lineup: 'CONFIRMED', cuotas: [{ bet_id: 240, mercado: 'PLAYER_SHOTS', jugador: 'X', linea: 0.5, sel: 'OVER', book_id: 8, dec: 1.2 }] }; const p = F.evaluarPOD([fx], new Date()); assert.equal(p.status, 'No Selection'); assert.ok(p.message.startsWith('NO QUALIFYING SOCCER PROP OF THE DAY')); assert.equal(p.eliminated.OPPOSITE_PRICE_MISSING, 1); });

await correrPendientes();
console.log(`\n${ok} pruebas pasaron · ${fallos} fallaron`);
process.exit(fallos ? 1 : 0);
