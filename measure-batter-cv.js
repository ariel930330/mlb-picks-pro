// ============================================================================
//  Medición empírica del CV de proyección de BATEADOR (Node, sin dependencias)
// ----------------------------------------------------------------------------
//  Mismo método que el abridor: separa la varianza del resultado real en el azar
//  del juego (varianza de la distribución) y el error de la proyección.
//
//      Var(real) = Var(azar | proyección) + Var(error de proyección)
//      CV = sqrt(Var(error de proyección)) / media(proyección)
//
//  La proyección base es la tasa de TEMPORADA × las PA del juego. El residual
//  (real − proyección) se compara contra el ruido de la distribución:
//    • Hit  → binomial:  azar = PA · p · (1−p),  p = hits/PA
//    • HR   → binomial:  azar = PA · pHR · (1−pHR)
//    • TB   → compuesto: azar = PA · Var(bases por PA), de 1B/2B/3B/HR
//
//  Correr:  node measure-batter-cv.js
//  Los CV que imprime alimentan BAT_CV en index.html (Confianza Proj. de bateador).
//  Es un TECHO del error real: la proyección ajustada del app (matchup/park/xStats)
//  yerra ≤ esto, porque aquí la tasa de temporada ignora el matchup del día.
// ============================================================================
const API = 'https://statsapi.mlb.com/api/v1';
const SEASON = 2026;
const MIN_PA = 200;   // bateadores con al menos esta PA de temporada

async function j(u){ const r = await fetch(u); if(!r.ok) throw new Error(r.status); return r.json(); }
async function mapLimit(arr, n, fn){
  const out = []; let i = 0;
  const w = Array.from({length:n}, async () => { while(i < arr.length){ const k = i++; try{ out[k] = await fn(arr[k]); }catch{ out[k] = null; } } });
  await Promise.all(w); return out;
}

(async () => {
  // 1) Bateadores calificados por PA
  const lead = await j(`${API}/stats?stats=season&group=hitting&season=${SEASON}&sportId=1&gameType=R&playerPool=qualified&limit=200`);
  const batters = (lead.stats?.[0]?.splits || []).map(s => ({
    id: s.player?.id, name: s.player?.fullName,
    pa: +s.stat.plateAppearances, h: +s.stat.hits, d: +s.stat.doubles, t: +s.stat.triples, hr: +s.stat.homeRuns, bb: +s.stat.baseOnBalls,
  })).filter(b => b.id && b.pa >= MIN_PA);
  console.log('bateadores calificados:', batters.length);

  // hit/tb/hr/bb: azar paramétrico conocido -> descomposición limpia.
  // hrr: suma correlacionada (H+R+RBI), sin familia simple -> se reporta con Poisson como
  // referencia, pero en el app va con binomial negativo (Var/mu medida) y CV estimado.
  const acc = { hit:{sr2:0,sn:0,smu:0,n:0}, tb:{sr2:0,sn:0,smu:0,n:0}, hr:{sr2:0,sn:0,smu:0,n:0},
                bb:{sr2:0,sn:0,smu:0,n:0}, hrr:{sr2:0,smu:0,n:0} };
  let games = 0;

  // 2) Game logs y descomposición de varianza
  await mapLimit(batters, 12, async (b) => {
    const gl = await j(`${API}/people/${b.id}/stats?stats=gameLog&group=hitting&season=${SEASON}&sportId=1&gameType=R`);
    const gs = gl.stats?.[0]?.splits || [];
    const pH = b.h / b.pa;                                                 // prob. de hit por PA
    const p1 = (b.h - b.d - b.t - b.hr) / b.pa, p2 = b.d / b.pa, p3 = b.t / b.pa, p4 = b.hr / b.pa;
    const meanTB  = p1 + 2*p2 + 3*p3 + 4*p4;                               // bases esperadas por PA
    const varTBpa = (p1 + 4*p2 + 9*p3 + 16*p4) - meanTB*meanTB;            // varianza de bases por PA
    const pHR = b.hr / b.pa, pBB = b.bb / b.pa;
    // tasa de H+R+RBI por PA del bateador (para su proyección por juego)
    let sHRR = 0, sPA = 0;
    for(const s of gs){ const pa=+s.stat.plateAppearances||0; if(pa<1) continue; sHRR += (+s.stat.hits||0)+(+s.stat.runs||0)+(+s.stat.rbi||0); sPA += pa; }
    const rHRR = sPA>0 ? sHRR/sPA : 0;
    for(const s of gs){
      const pa = +s.stat.plateAppearances || 0; if(pa < 1) continue;
      const H  = +s.stat.hits || 0, HR = +s.stat.homeRuns || 0, BB = +s.stat.baseOnBalls || 0;
      const TB  = +s.stat.totalBases || (H + (+s.stat.doubles||0) + 2*(+s.stat.triples||0) + 3*HR);
      const HRR = H + (+s.stat.runs||0) + (+s.stat.rbi||0);
      games++;
      { const mu = pH*pa,     nz = pa*pH*(1-pH),     r = H  - mu; acc.hit.sr2 += r*r; acc.hit.sn += nz; acc.hit.smu += mu; acc.hit.n++; }
      { const mu = meanTB*pa, nz = pa*varTBpa,       r = TB - mu; acc.tb.sr2  += r*r; acc.tb.sn  += nz; acc.tb.smu  += mu; acc.tb.n++;  }
      { const mu = pHR*pa,    nz = pa*pHR*(1-pHR),   r = HR - mu; acc.hr.sr2  += r*r; acc.hr.sn  += nz; acc.hr.smu  += mu; acc.hr.n++;  }
      { const mu = pBB*pa,    nz = pa*pBB*(1-pBB),   r = BB - mu; acc.bb.sr2  += r*r; acc.bb.sn  += nz; acc.bb.smu  += mu; acc.bb.n++;  }
      { const mu = rHRR*pa,   r = HRR - mu;          acc.hrr.sr2 += r*r; acc.hrr.smu += HRR; acc.hrr.n++; }   // azar = Poisson (mu), abajo
    }
  });

  console.log('batter-games:', games, '\n');
  console.log('mercado   mu_medio  Var(real)  Var(azar)  Var(proy)   CV      dist');
  const dist = { hit:'binomial', tb:'Poisson (bases)', hr:'binomial', bb:'binomial', hrr:'NB (sobredisp.)' };
  for(const [k, a] of Object.entries(acc)){
    const mu = a.smu/a.n, vr = a.sr2/a.n;
    const vn = k==='hrr' ? mu /* Poisson de referencia */ : a.sn/a.n;
    const vp = Math.max(0, vr - vn), cv = Math.sqrt(vp)/mu;
    const nota = k==='hrr' ? '  (Poisson infla el CV: sobredispersa Var/mu='+(vr/mu).toFixed(2)+' -> app usa NB, CV estimado ~20%)' : '';
    console.log(`${k.padEnd(9)} ${mu.toFixed(3).padStart(7)}  ${vr.toFixed(3).padStart(8)}  ${vn.toFixed(3).padStart(8)}  ${vp.toFixed(3).padStart(8)}  ${(cv*100).toFixed(1).padStart(5)}%  ${dist[k]}${nota}`);
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
