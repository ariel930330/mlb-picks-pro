// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  NÚCLEO COMPARTIDO                                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Aquí SOLO va lo que sirve para cualquier deporte: sesión, keys, matemática de
// cuotas, distribuciones y utilidades. Nada con un número medido para un deporte
// concreto — eso vive en su propio archivo, en deportes/.
//
// Regla para no volver al lío de antes: si al leer una línea puedes decir de qué
// deporte es, esa línea NO va aquí.
// ── Supabase ──────────────────────────────────────────────────────────────────
// NOTA: la "anon/publishable key" es pública por diseño. La seguridad la dan las
// políticas RLS (ver supabase-setup.sql): lectura pública, escritura solo autenticado.
const SB_URL  = 'https://xirpwbmekufozsddnaok.supabase.co';
const SB_KEY  = 'sb_publishable_G3k6Se24l9d0kGfbuRZATQ_qYoV7RFK';
const sb      = supabase.createClient(SB_URL, SB_KEY);
// ── Auth (dueño) ────────────────────────────────────────────────────────────
let session = null;
const isOwner = () => !!session;
// Bloquea acciones de escritura para visitantes anónimos.
function requireAuth(){
  if(isOwner()) return true;
  $('login-modal').style.display='flex';
  setTimeout(()=>$('login-email')?.focus(),50);
  return false;
}
function updateAuthUI(){
  const lbl=$('auth-label'), btn=$('auth-btn');
  if(!lbl||!btn) return;
  if(isOwner()){ lbl.textContent='Salir'; btn.title=session.user?.email||''; btn.querySelector('i').className='ti ti-logout'; }
  else{ lbl.textContent='Entrar'; btn.title='Acceso del dueño'; btn.querySelector('i').className='ti ti-lock'; }
  document.querySelectorAll('.owner-only').forEach(el=>el.style.display=isOwner()?'':'none');
}
function toggleAuth(){ isOwner()?doLogout():(($('login-modal').style.display='flex'),setTimeout(()=>$('login-email')?.focus(),50)); }
async function doLogin(){
  const email=$('login-email').value.trim(), password=$('login-pass').value;
  $('login-err').textContent='';
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){ $('login-err').textContent=error.message; return; }
  session=data.session; $('login-modal').style.display='none'; $('login-pass').value='';
  updateAuthUI();
}
async function doLogout(){ await sb.auth.signOut(); session=null; updateAuthUI(); }
// ── Helpers ───────────────────────────────────────────────────────────────────
const sf = (v, d=4.5) => { const n=parseFloat(v); return isNaN(n)?d:n; };
const cl = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
// Regresión a la media: mezcla la tasa observada (n muestras) con la liga (peso=prior).
// Muestras chicas se acercan a la liga (un .400 en 30 turnos NO es .400 real).
const regress = (rate,n,lg,prior) => (rate*n + lg*prior)/(n+prior);
const sig = x => 1/(1+Math.exp(-Math.max(-20,Math.min(20,x))));
const pct  = p => Math.round(p*100)+'%';
// Φ(x) = ½·(1+erf(x/√2)); erf por aproximación A&S 7.1.26 (error < 1.5e-7)
const erf = z => { const s=z<0?-1:1; z=Math.abs(z); const t=1/(1+.3275911*z); const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z); return s*y; };
const normCDF = x => .5*(1+erf(x/Math.SQRT2));
// Inversa de la normal estándar (probit) — algoritmo de Acklam
const probit = p => {
  p=cl(p,1e-9,1-1e-9);
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.3577518672690,-30.66479806614716,2.506628277459239];
  const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
  const c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
  const lo=0.02425, hi=1-lo; let q,r;
  if(p<lo){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if(p<=hi){ q=p-0.5; r=q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
  q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
};
const $  = id => document.getElementById(id);
const txt = (id,v) => { const el=$(id); if(el) el.textContent=v; };
// ── Probabilidad sobre una línea ────────────────────────────────────────────
// P(X > line) con X ~ Poisson(lambda); line es semientero (ej. 6.5)
const poissonOver = (lambda,line) => {
  const k=Math.ceil(line); let cdf=0,term=Math.exp(-lambda);
  for(let i=0;i<k;i++){ cdf+=term; term*=lambda/(i+1); }   // suma P(X<=k-1)
  return cl(1-cdf,.02,.98);
};
const nbOver = (mu,k,line) => {
  mu=Math.max(mu,.01);
  const top=Math.ceil(line), q=mu/(k+mu);
  let p=Math.pow(k/(k+mu),k), cdf=p;                       // P(X=0)
  for(let x=1;x<top;x++){ p*=((k+x-1)/x)*q; cdf+=p; }      // recursión: no hace falta gamma
  return cl(1-cdf,.02,.98);
};
// P(X > line) con X ~ Binomial(n bateadores enfrentados, p). Para ponches, hits y BB
// la Poisson NO sirve, aunque la varianza cruda casi coincida: cada bateador enfrentado
// se poncha o no, conecta o no, así que la cola real es MÁS CORTA que la de Poisson
// (var = n·p·(1−p), siempre menor que n·p).
// Medido sobre 2,133 aperturas de 2026, predicho vs lo que de verdad pasó:
//   Over 7.5 K   real 17.4%   Poisson 19.8%   Binomial 18.4%
//   Over 8.5 K   real 11.3%   Poisson 12.6%   Binomial 10.9%
//   Over 7.5 H   real 12.8%   Poisson 16.5%   Binomial 14.7%
//   Over 8.5 H   real  6.0%   Poisson  9.7%   Binomial  7.8%
//   error medio  Ks  Poisson 0.0187 -> Binomial 0.0058   (3 veces mejor)
//                HA  Poisson 0.0303 -> Binomial 0.0148
//                BB  Poisson 0.0263 -> Binomial 0.0211
// El sesgo iba SIEMPRE hacia el over: la Poisson regalaba edges falsos en líneas altas.
// Los bateadores enfrentados salen de la propia proyección: outs + hits + BB.
const binomOver = (n,p,line) => {
  n = Math.round(n); if(n<1) n=1;
  if(p<=0) return .02; if(p>=1) return .98;
  const top=Math.ceil(line);
  let t=Math.pow(1-p,n), cdf=t;                             // P(X=0)
  for(let x=1;x<top&&x<=n;x++){ t*=((n-x+1)/x)*(p/(1-p)); cdf+=t; }
  return cl(1-cdf,.02,.98);
};
// Envoltorio: recibe la media ya ajustada por rival/parque y los turnos esperados.
// n se redondea, y p se recalcula CON ESE n para que la media salga EXACTA. Antes se
// pasaba p=mu/bf con n=round(bf), y el redondeo se comía parte de la proyección: con
// los 4.2 turnos de un bateador, n=4 y p=mu/4.2 daban media 4·mu/4.2 = 0.95·mu, un 5%
// menos de lo proyectado en TODOS los props de bateo.
const binomOverMu = (mu,bf,line) => {
  const n = Math.max(1, Math.round(bf));
  return (mu < n) ? binomOver(n, mu/n, line) : poissonOver(mu,line);
};
// P(X > line) con X ~ Normal(mean,sd)
const normOver = (mean,sd,line) => cl(1-normCDF((line-mean)/sd),.02,.98);
// ── Cuotas americanas / mercado ─────────────────────────────────────────────
const amProb   = a => a<0 ? (-a)/(-a+100) : 100/(a+100);   // prob implícita (con vig)
const amPayout = a => a>0 ? a/100 : 100/(-a);              // ganancia por unidad apostada
const amFmt    = a => (a>0?'+':'')+a;
// Hora de inicio en HORA DEL ESTE, que es la referencia con la que se publican los
// horarios de MLB y las líneas. Se fija la zona a America/New_York a propósito: si se
// dejara la del navegador, el mismo partido saldría a una hora distinta según dónde
// estés, y no cuadraría con lo que anuncia la casa. El cambio de horario de verano lo
// resuelve solo la zona IANA.
const horaET = iso => {
  if(!iso) return '';
  try{
    const t = new Date(iso);
    if(isNaN(t)) return '';
    return t.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})
            .replace(/\s/g,'').toLowerCase() + ' ET';
  }catch{ return ''; }
};
const bestAm   = arr => arr.reduce((b,x)=> amPayout(x)>amPayout(b)?x:b);  // mejor línea (line shopping)
const avg      = arr => arr.reduce((s,x)=>s+x,0)/arr.length;
const median   = arr => { const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };
// Consolida las cuotas de varias casas SOBRE LA MISMA LÍNEA.
// Las casas no siempre cuelgan el mismo número (una pone Over 4.5 K y otra 5.5).
// Antes se tomaba la línea MEDIANA y por separado el MEJOR precio de cualquier casa,
// así que salían picks fantasma: "Over 4.5 a +125" donde ese +125 era, en realidad,
// el precio del Over 5.5. Ninguna casa ofrecía esa combinación.
// Ahora se elige la línea que MÁS casas cotizan (empate → la más cercana a la mediana)
// y tanto el fair como el mejor precio salen SOLO de esas casas.
const consensus = (arr, pt, a, b) => {
  if(!arr || !arr.length) return null;
  const groups = new Map();
  arr.forEach(v => { const k = pt(v); if(k==null) return;
    if(!groups.has(k)) groups.set(k, []); groups.get(k).push(v); });
  if(!groups.size) return null;
  const pts = [...groups.keys()].sort((x,y)=>x-y);
  const med = pts[Math.floor(pts.length/2)];
  let best = null;
  groups.forEach((g,k) => { if(!best || g.length>best.g.length ||
    (g.length===best.g.length && Math.abs(k-med)<Math.abs(best.k-med))) best={k,g}; });
  const g = best.g;
  const fa = avg(g.map(v => { const ia=amProb(a(v)), ib=amProb(b(v)); return ia/(ia+ib); }));
  // Mediana del precio de cada lado (§5 HAXIOM): el consenso real, para poder
  // detectar si el MEJOR precio es un outlier que fabricaría edge de una sola casa.
  return { point:best.k, fairA:fa, fairB:1-fa, priceA:bestAm(g.map(a)), priceB:bestAm(g.map(b)),
           medA:median(g.map(a)), medB:median(g.map(b)),
           books:g.length, total:arr.length, rows:g };
};
// Normaliza acentos a ASCII y deja solo letras: "Cristopher Sánchez"→"cristophersanchez"
const normName = s => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const amDec    = a => a>0 ? 1+a/100 : 1+100/(-a);                          // americana → decimal
// Fracción de Kelly: f* = (b·p − (1−p))/b, con b = cuota decimal − 1. Devuelve 0 si no hay valor.
const kelly    = (p,american) => { const b=amDec(american)-1; return b<=0?0:Math.max(0,(b*p-(1-p))/b); };
const KELLY_FRAC = 0.5;  // medio-Kelly (más conservador, menos varianza)
const STAKE_CAP  = 5;    // tope de % del bankroll (el modelo no es una casa sharp: no sobre-apostar)
const stakePct = (prob,price) => +Math.min(STAKE_CAP, KELLY_FRAC*kelly(prob,price)*100).toFixed(1);
const logitP = p => { p=cl(p,.001,.999); return Math.log(p/(1-p)); };
function parseCSVLine(line){ const out=[]; let cur='',q=false; for(const c of line){ if(c==='"')q=!q; else if(c===','&&!q){out.push(cur);cur='';} else cur+=c; } out.push(cur); return out.map(x=>x.trim()); }
// Corre fn sobre cada elemento con un tope de N a la vez. Las peticiones por partido
// (F5, props de Ks, props de bateadores) se hacían con for...await, o sea una por una:
// con 9 partidos eran 27 viajes en fila (~8 s). Con tope 5 bajan a ~1.5 s.
// El tope existe para no disparar 30 peticiones de golpe y toparse con límite de tasa.
async function mapLimit(items, limit, fn){
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => { while(i < items.length){ const k = i++; out[k] = await fn(items[k], k); } };
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
  return out;
}
// ── The Odds API (cuotas reales) ────────────────────────────────────────────
const ODDS_BASE = 'https://api.the-odds-api.com/v4';
// La key NO va escrita en el código: este repo es público y GitHub Pages sirve el
// archivo tal cual, así que cualquiera podría leerla y gastar los créditos de la
// suscripción. Se guarda en Supabase (tabla app_config, RLS por auth.uid) y se jala
// al iniciar sesión, de modo que queda fija en todos los dispositivos del dueño sin
// aparecer nunca en el código. localStorage sigue funcionando como caché local.
let remoteOddsKey = null;   // key traída de Supabase (solo con sesión iniciada)
const getOddsKey = () => remoteOddsKey || localStorage.getItem('odds_api_key') || '';
const saveOddsKey = v => { v=v.trim(); v?localStorage.setItem('odds_api_key',v):localStorage.removeItem('odds_api_key');
  remoteOddsKey = null;   // solo se marca "en tu cuenta" si Supabase confirma la escritura
  syncOddsKeyToCloud(v).then(ok=>{ if(ok&&v) remoteOddsKey=v; updateKeyState(); }); };
// Sube la key a Supabase si hay sesión. Devuelve true solo si de verdad se guardó;
// sin sesión (o si falla) la key se queda únicamente en este navegador.
async function syncOddsKeyToCloud(v){
  if(!isOwner()) return false;
  try{
    const uid = session.user.id;
    const {error} = v
      ? await sb.from('app_config').upsert({user_id:uid, odds_api_key:v}, {onConflict:'user_id'})
      : await sb.from('app_config').delete().eq('user_id', uid);
    if(error){ console.warn('sync key:', error.message); return false; }
    return true;
  }catch(e){ console.warn('sync key:', e.message); return false; }
}
// Trae la key guardada al iniciar sesión y la deja lista para el resto de la app.
async function loadOddsKeyFromCloud(){
  if(!isOwner()){ remoteOddsKey=null; return; }
  try{
    const {data,error} = await sb.from('app_config').select('odds_api_key').eq('user_id', session.user.id).maybeSingle();
    if(error) return;
    if(data?.odds_api_key){
      remoteOddsKey = data.odds_api_key;
      localStorage.setItem('odds_api_key', remoteOddsKey);   // caché para no depender de la red
      const el=document.getElementById('odds-key'); if(el) el.value=remoteOddsKey;
    } else if(localStorage.getItem('odds_api_key')){
      await syncOddsKeyToCloud(localStorage.getItem('odds_api_key'));   // primera vez: sube la local
    }
  }catch(e){ console.warn('load key:', e.message); }
}
// Etiqueta junto al campo: de dónde salió la key que se está usando.
function updateKeyState(){
  const el=document.getElementById('odds-key-state'); if(!el) return;
  const k=getOddsKey();
  if(!k){ el.textContent='sin key'; el.style.color='var(--rtx)'; return; }
  if(remoteOddsKey){ el.textContent='✓ guardada en tu cuenta'; el.style.color='var(--gtx)'; }
  else if(isOwner()){ el.textContent='solo en este navegador'; el.style.color='var(--text3)'; }
  else { el.textContent='solo local · entra para fijarla'; el.style.color='var(--text3)'; }
}
let oddsRemaining = null;  // peticiones restantes del plan (header x-requests-remaining)
// ── API-Football: solo la key ────────────────────────────────────────────────
// El motor de fútbol se borró entero para rehacerlo desde cero contra la spec
// HAXIOM EDGE. Esto es LO ÚNICO que se conservó a propósito: la key y su
// sincronización, para no perderla ni tener que volver a pedirla.
//
// Vive en Supabase (app_config.af_key, RLS por auth.uid) y queda fija en todos
// los dispositivos; localStorage es solo el caché local. No hay campo en
// pantalla ahora mismo — se vuelve a poner cuando se reconstruya el fútbol.
// Mientras tanto, para cambiarla desde la consola: saveAfKey('...')
const AF_BASE = 'https://v3.football.api-sports.io';
let remoteAfKey = null;
const getAfKey  = () => remoteAfKey || localStorage.getItem('af_key') || '';
const saveAfKey = v => { v=(v||'').trim(); v?localStorage.setItem('af_key',v):localStorage.removeItem('af_key');
  remoteAfKey=null; syncAfKeyToCloud(v).then(ok=>{ if(ok&&v) remoteAfKey=v; }); };
async function syncAfKeyToCloud(v){
  if(!isOwner()) return false;
  try{ const uid=session.user.id;
    const {error} = v ? await sb.from('app_config').upsert({user_id:uid, af_key:v},{onConflict:'user_id'})
                      : await sb.from('app_config').update({af_key:null}).eq('user_id',uid);
    if(error){ console.warn('sync af key:', error.message); return false; }
    return true;
  }catch(e){ console.warn('sync af key:', e.message); return false; }
}
async function loadAfKeyFromCloud(){
  if(!isOwner()){ remoteAfKey=null; return; }
  try{
    const {data,error} = await sb.from('app_config').select('af_key').eq('user_id', session.user.id).maybeSingle();
    if(error) return;   // columna ausente u otro error → se queda con la local
    if(data?.af_key){
      remoteAfKey = data.af_key; localStorage.setItem('af_key', remoteAfKey);
    } else if(localStorage.getItem('af_key')){
      await syncAfKeyToCloud(localStorage.getItem('af_key'));   // primera vez: sube la local
    }
  }catch(e){ console.warn('load af key:', e.message); }
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  REGISTRO DE DEPORTES                                                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Cada deporte es un archivo suelto en deportes/ que se registra aquí. No se
// conocen entre ellos y no pueden pisarse: el registro lo impide y avisa a
// gritos si alguien lo intenta.
//
// Añadir un deporte:   crear deportes/<id>.js  +  una línea <script> en index.html
// Quitar un deporte:   borrar el archivo       +  borrar esa línea
//
// Lo que un deporte debe entregar:
//   id            'mlb', 'futbol', 'nba'…  identificador corto y único
//   nombre        lo que se lee en el botón
//   icono         emoji del botón
//   titulo/sub    cabecera de la página cuando está activo
//   css           ruta de su hoja de estilos propia (opcional)
//   html          su interfaz completa; se mete en su propio contenedor
//   manejadores   { nombre: función } — lo ÚNICO suyo que se hace global
//   iniciar()     se llama una vez, cuando ya está su HTML en la página
//   activar()     al entrar a su pestaña
//   desactivar()  al salir (opcional)
const Deportes = (() => {
  const mods = new Map();
  const duenoManejador = new Map();   // nombre global -> id del deporte
  const duenoId        = new Map();   // id del DOM     -> id del deporte
  let activo = null;

  const pon = (sel, txt) => { const e = document.querySelector(sel); if (e) e.textContent = txt; };

  function registrar(m) {
    if (!m || !m.id)     throw new Error('Un deporte necesita id.');
    if (mods.has(m.id))  throw new Error('Deporte duplicado: ' + m.id);

    // 1 · Contenedor propio. TODO su HTML vive aquí dentro y en ningún otro sitio.
    const cont = document.createElement('div');
    cont.id = 'dep-' + m.id;
    cont.className = 'dep';
    cont.style.display = 'none';
    cont.innerHTML = m.html || '';
    document.getElementById('deportes').appendChild(cont);

    // 2 · Ids del DOM: dos deportes no pueden usar el mismo. Si pasa, se ve al
    //     instante en vez de manifestarse como un bug raro tres semanas después.
    for (const el of cont.querySelectorAll('[id]')) {
      const dueno = duenoId.get(el.id);
      if (dueno) throw new Error(`El id "${el.id}" ya es de ${dueno}; ${m.id} no puede reutilizarlo.`);
      duenoId.set(el.id, m.id);
    }

    // 3 · Manejadores: lo único que sale al espacio global, con dueño anotado.
    //     El resto de sus funciones y variables quedan encerradas en su archivo.
    for (const [k, f] of Object.entries(m.manejadores || {})) {
      const dueno = duenoManejador.get(k);
      if (dueno) throw new Error(`El manejador "${k}()" ya es de ${dueno}; ${m.id} no puede reutilizarlo.`);
      duenoManejador.set(k, m.id);
      window[k] = f;
    }

    // 4 · Hoja de estilos propia.
    if (m.css) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = m.css; document.head.appendChild(l);
    }

    mods.set(m.id, m);
    try { m.iniciar && m.iniciar(); }
    catch (e) { console.error('[' + m.id + '] falló al iniciar:', e); }
    pintarBotones();
    if (!activo) activar(m.id);
    return m;
  }

  function pintarBotones() {
    const sw = document.getElementById('sport-switch');
    if (!sw) return;
    // Con un solo deporte el selector sobra y no se enseña.
    sw.style.display = mods.size > 1 ? '' : 'none';
    sw.innerHTML = [...mods.values()].map(m =>
      `<button class="sport-btn${m.id === activo ? ' active' : ''}" data-dep="${m.id}">${m.icono || ''} ${m.nombre}</button>`).join('');
    sw.querySelectorAll('[data-dep]').forEach(b =>
      b.onclick = () => activar(b.dataset.dep));
  }

  function activar(id) {
    const m = mods.get(id); if (!m) return;
    if (activo && activo !== id) {
      const ant = mods.get(activo);
      try { ant && ant.desactivar && ant.desactivar(); } catch (e) { console.error(e); }
    }
    activo = id;
    mods.forEach((_, k) => {
      const c = document.getElementById('dep-' + k);
      if (c) c.style.display = k === id ? '' : 'none';
    });
    pon('.hdr-title', m.titulo || m.nombre);
    pon('.hdr-sub',   m.sub   || '');
    document.title = (m.titulo || m.nombre);
    pintarBotones();
    try { m.activar && m.activar(); } catch (e) { console.error('[' + id + '] falló al activar:', e); }
  }

  // Diagnóstico: en la consola, Deportes.diagnostico()
  function diagnostico() {
    console.log('Deportes registrados: ' + [...mods.keys()].join(', ') + '   activo: ' + activo);
    const porDep = {};
    duenoManejador.forEach((d, k) => (porDep[d] = porDep[d] || []).push(k));
    for (const d in porDep) console.log('  ' + d + ' publica ' + porDep[d].length + ' manejador(es): ' + porDep[d].join(' '));
    console.log('  ids del DOM repartidos: ' + duenoId.size);
    return { deportes: [...mods.keys()], activo, manejadores: porDep };
  }

  return { registrar, activar, diagnostico,
           get activo() { return activo; },
           get lista()  { return [...mods.keys()]; } };
})();

// El armazón es del núcleo, no de ningún deporte: mostrar la app y poner la fecha
// pasaban antes dentro del arranque de MLB, así que al borrar el béisbol la página
// se habría quedado invisible y sin fecha.
document.addEventListener('DOMContentLoaded', () => {
  const a = $('app');      if (a) a.style.display = 'flex';
  const d = $('hdr-date'); if (d) d.textContent =
    new Date().toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' });
});
