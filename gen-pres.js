const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync('index.html','utf8');
const style=h.match(/<style>[\s\S]*?<\/style>/)[0];
const main=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).pop();

// DOM stub que captura innerHTML por id
const els={};
const E=id=>els[id]||(els[id]={ _h:'', set innerHTML(v){this._h=v;}, get innerHTML(){return this._h;}, style:{}, insertAdjacentHTML(){}, classList:{add(){},remove(){},toggle(){}}, querySelector:()=>({className:'',style:{}}), value:'' , textContent:'', checked:false});
const rows=[];
for(let i=0;i<42;i++) rows.push({top_pick_prob:.56,result:i<24?'win':'loss'});
for(let i=0;i<33;i++) rows.push({top_pick_prob:.62,result:i<21?'win':'loss'});
for(let i=0;i<28;i++) rows.push({top_pick_prob:.68,result:i<17?'win':'loss',clv:.014});
for(let i=0;i<22;i++) rows.push({top_pick_prob:.75,result:i<13?'win':'loss',clv:.008});
for(let i=0;i<18;i++) rows.push({clv:-.004});
const fakeSel={select:()=>({limit:async()=>({data:rows,error:null}),order:()=>({limit:async()=>({data:[],error:null})}),eq:()=>({order:async()=>({data:[]})})})};
const ctx={document:{getElementById:E,addEventListener:()=>{},querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},fetch:async()=>({ok:true,json:async()=>({})}),supabase:{createClient:()=>({from:()=>fakeSel,auth:{getSession:async()=>({}),onAuthStateChange:()=>{}}})},console,Math,JSON,parseFloat,parseInt,isNaN,String,Number,Array,Object,Date,setTimeout};
vm.createContext(ctx); new vm.Script(main).runInContext(ctx);

// ── Datos de ejemplo ──
const g=(aw,hm,ai,hi,awp,hwp)=>({away:aw,home:hm,awayId:ai,homeId:hi,venue:'Citizens Bank Park',awayWP:awp,homeWP:hwp,awayML:'+130',homeML:'-150',total:8.1,totalLine:8.5,pf:1.04,wx:{temp:78,wind:9},
  pitchers:{away:{name:'C. Sánchez'},home:{name:'Z. Wheeler'}},
  picks:[
   {cat:'Money Line',main:hm+' ML -150',sub:'Modelo 64% → 61% vs Mercado 58%',prob:.61,edge:.03,conf:'High',stake:3.2},
   {cat:'Total del partido',main:'UNDER 8.5 -110',sub:'Proy 8.1 · Modelo 54% → 52%',prob:.52,edge:.018,conf:'Medium',stake:0},
   {cat:'Run Line',main:hm+' -1.5 +120',sub:'Modelo 45% → 43% vs Mercado 41%',prob:.43,edge:.02,conf:'Low',stake:1.4}]});
ctx.renderPicks([g('NYM','PHI',121,143,.39,.61),g('LAD','SD',119,135,.45,.55)]);
const picksHTML=E('picks-area').innerHTML;

const b=(id,n,ba,slg,hr)=>({id,name:n,pos:'OF',ba,obp:.39,slg,ops:.95,hr,hrRate:hr/480,rbi:60,runs:75,bb:55,pa:560,ab:480,kpct:22,woba:.36});
ctx.renderBatters([
 {away:'NYY',home:'BOS',awayBatters:[b(592450,'Aaron Judge',.31,.70,42),b(665742,'Juan Soto',.29,.56,33)],homeBatters:[b(646240,'Rafael Devers',.28,.55,26)],awayPitcher:'Crochet',homePitcher:'Cole',awayOppScore:.45,homeOppScore:.6,awayPlatoon:1.06,homePlatoon:.95,awayOppHand:'L',homeOppHand:'R',awayLineup:[592450,665742],homeLineup:[646240],pf:1.06,wx:{temp:80}},
 {away:'LAD',home:'COL',awayBatters:[b(605141,'Mookie Betts',.30,.55,22)],homeBatters:[b(694671,'Ezequiel Tovar',.27,.49,18)],awayPitcher:'Freeland',homePitcher:'Yamamoto',awayOppScore:.32,homeOppScore:.5,awayPlatoon:1.04,homePlatoon:.97,awayOppHand:'L',homeOppHand:'R',awayLineup:null,homeLineup:null,pf:1.24,wx:{temp:86}}
]);
const battersHTML=E('batters-area').innerHTML;

ctx.renderPitchers([{away:'PIT',home:'ATL',awayId:134,homeId:144,
  pitchers:{
    home:{id:668678,name:'Spencer Strider',era:2.85,fip:2.69,k9:12.1,kExp:7.4,kLine:6.5,kMkt:{line:6.5,fairOver:.58,fairUnder:.42,priceOver:-120,priceUnder:100}},
    away:{id:694973,name:'Paul Skenes',era:2.40,fip:2.55,k9:11.4,kExp:7.0,kLine:6.5,kMkt:{line:6.5,fairOver:.55,fairUnder:.45,priceOver:-110,priceUnder:-110}}
  }}]);
const pitchersHTML=E('pitchers-area').innerHTML;

(async()=>{
  await ctx.loadValidation();
  const validHTML=E('valid-area').innerHTML;

  const cover=`
  <section class="cover">
    <div class="cv-logo"><i class="ti ti-trophy"></i></div>
    <h1>MLB Picks Pro</h1>
    <p class="cv-sub">Sistema de análisis y proyección de apuestas de MLB</p>
    <p class="cv-tag">Modelo estadístico · Cuotas reales · Validación del modelo</p>
    <div class="cv-foot">Informe ejecutivo y guía de uso · ariel930330/mlb-picks-pro</div>
  </section>`;

  const sec=(num,title,sub,body)=>`<section class="slide"><div class="s-head"><span class="s-num">${num}</span><div><h2>${title}</h2><p class="s-sub">${sub}</p></div></div>${body}</section>`;

  const sections=[
  sec('1','¿Qué es?','Resumen ejecutivo',`
    <div class="pt">
    <p><b>MLB Picks Pro</b> toma cada día los partidos de MLB, proyecta todos los mercados de apuestas y los <b>compara contra las cuotas reales de las casas</b> para mostrar dónde hay valor, cuánto apostar y —sobre todo— <b>si el modelo de verdad acierta.</b></p>
    <div class="kbox"><b>Filosofía:</b> el mercado de apuestas es más "sharp" que cualquier modelo casero. Por eso el sistema <b>no confía 100% en el modelo</b>: mezcla su proyección con el mercado (70/30) y se mide a sí mismo en vez de prometer ganancias.</div>
    <p><b>Estado:</b> funcional y desplegado (GitHub Pages). El código está completo; lo que falta es <b>acumular datos reales</b> para que la validación tenga sentido estadístico.</p>
    <div style="margin-top:8px">
      <span class="pill">Ganador (ML)</span><span class="pill">Total O/U</span><span class="pill">Run Line</span><span class="pill">Primeras 5</span><span class="pill">Ponches</span><span class="pill">Props de bateadores</span><span class="pill">Parlays</span>
    </div></div>`),

  sec('2','Arquitectura técnica','Cómo está construido',`
    <table class="ftable"><tr><th>Componente</th><th>Rol</th></tr>
    <tr><td><b>index.html</b></td><td>Toda la app (HTML + CSS + JS vanilla, sin backend propio)</td></tr>
    <tr><td><b>MLB Stats API</b></td><td>Calendario, pitchers, stats, splits, alineaciones, bullpen, marcadores</td></tr>
    <tr><td><b>The Odds API</b></td><td>Cuotas reales de casas (ML, total, run line, props de Ks y bateadores)</td></tr>
    <tr><td><b>Open-Meteo</b></td><td>Clima (temperatura/viento) — gratis, sin key</td></tr>
    <tr><td><b>Supabase</b></td><td>Historial, pesos del modelo, cache del análisis. Seguridad por RLS</td></tr>
    <tr><td><b>GitHub Pages</b></td><td>Hosting del sitio</td></tr></table>
    <div class="kbox"><b>Caché:</b> las stats se cachean en sesión (el calendario nunca). El análisis completo se guarda en localStorage (este equipo) y en Supabase (cualquier equipo) → al refrescar no se re-analiza.</div>`),

  sec('3','Picks del Día','Pantalla principal · ordenado por valor (edge)',`
    <div class="shot">${picksHTML}<div class="shot-cap">Tarjeta por partido: probabilidad de cada equipo, mejores apuestas ordenadas por edge, con stake sugerido.</div></div>`),

  sec('4','El modelo','Cómo proyecta cada partido',`
    <div class="grid2">
      <div class="pt"><b>Probabilidad de victoria</b><br>Regresión logística entrenada con ~13,070 partidos (2019-2024, 58.4% accuracy). Combina pitcher, ofensiva, bullpen, racha y ventaja de local.
      <br><br><b>Carreras esperadas</b><br>Ofensiva vs pitcheo rival, mezclando abridor (~60% del juego) + bullpen, ajustado por estadio y clima. Evita sub-proyectar totales en duelos de ases.</div>
      <table class="ftable"><tr><th>Mercado</th><th>Modelo</th></tr>
      <tr><td>Money Line</td><td>Regresión logística</td></tr>
      <tr><td>Total (O/U)</td><td>Normal sobre las carreras</td></tr>
      <tr><td>Run Line -1.5</td><td>Probit, consistente con el ganador</td></tr>
      <tr><td>Primeras 5 (F5)</td><td>Logit de abridores</td></tr>
      <tr><td>Ponches (Ks)</td><td>Poisson</td></tr>
      <tr><td>Props bateadores</td><td>Poisson (hits/bases/HR)</td></tr></table>
    </div>`),

  sec('5','Inputs afinados','Basura entra → basura sale',`
    <div class="pt"><ul>
      <li><b>Regresión a la media:</b> un .400 en 30 turnos cuenta como ~.260, no como real (bateadores prior 250 PA; pitchers por innings).</li>
      <li><b>Splits zurdo/derecho:</b> usa el OPS del equipo vs la <b>mano del abridor rival</b>; los bateadores se ajustan por su matchup de mano.</li>
      <li><b>Forma reciente:</b> OPS de los últimos 30 días vs el de temporada (±8%).</li>
      <li><b>Alineación confirmada:</b> filtra a los titulares reales (✓) cuando se publica (~1-3 h antes) y penaliza si faltan estrellas.</li>
      <li><b>Bullpen real:</b> ERA de los relevistas, no la del equipo completa.</li>
      <li><b>Clima + viento direccional:</b> temperatura y el componente del viento hacia el jardín (sale = más carreras), con la orientación de cada estadio. Park factor incluido.</li>
      <li><b>BvP (bateador vs pitcher):</b> historial de carrera vs el abridor rival, regresado fuerte (opcional).</li>
      <li><b>Recalibración aprendida:</b> el botón 🧠 Recalibrar ajusta las probabilidades con tu historial (Platt scaling).</li>
    </ul></div>
    <div class="kbox">El modelo dejó de usar "stats crudas de temporada": ahora considera <b>muestra, mano, forma, alineación, bullpen, BvP y viento</b>, y se recalibra con tus resultados.</div>`),

  sec('6','Valor real','Integración con el mercado',`
    <div class="pt"><ul>
      <li><b>De-vig:</b> quita la comisión de la casa → probabilidad justa del mercado.</li>
      <li><b>Blend 70/30:</b> probabilidad final = 70% mercado + 30% modelo (desinfla edges falsos).</li>
      <li><b>Edge</b> = prob. final − prob. justa del mercado. El indicador de valor.</li>
      <li><b>Kelly:</b> stake sugerido (medio-Kelly), capado al 5% del bankroll.</li>
      <li><b>Line shopping + consenso</b> entre varias casas.</li>
    </ul></div>
    <div class="kbox" style="border-left-color:#15966c"><b>Edge</b> positivo y sostenido = valor real. Sin cuotas, el edge es solo orientativo (vs breakeven -110).</div>`),

  sec('7','Bateadores','Top 2 más probables por categoría',`
    <div class="shot">${battersHTML}<div class="shot-cap">Proyecciones ajustadas por pitcher rival, mano, estadio y clima. ✓ = titular confirmado.</div></div>`),

  sec('8','Pitchers (Ks)','Línea real de la casa + proyección',`
    <div class="shot">${pitchersHTML}<div class="shot-cap">Línea real de ponches, prob. de mercado, proyección del modelo y edge. Openers detectados.</div></div>`),

  sec('9','Validación','¿El modelo de verdad sirve?',`
    <div class="shot">${validHTML}<div class="shot-cap">Calibración (predicho vs real), Brier score y CLV.</div></div>
    <div class="pt" style="margin-top:10px"><ul>
      <li><b>Calibración:</b> si dices 60% y ganas 52%, estás sobreconfiado (sale en rojo). Brier score más bajo = mejor.</li>
      <li><b>CLV (Closing Line Value):</b> ¿apostaste a mejor número que el de cierre? Es el mejor termómetro de un modelo; CLV positivo sostenido = aporta valor real.</li>
    </ul></div>`),

  sec('10','Otras pestañas','Parlays · Historial · Modelo IA',`
    <table class="ftable"><tr><th>Pestaña</th><th>Qué hace</th></tr>
    <tr><td><b>Parlays</b></td><td>Combinadas de 3 y 4 patas, 1 pata por partido (sin correlación), cuota real, ordenadas por valor</td></tr>
    <tr><td><b>Historial</b></td><td>Todas las predicciones con resultado. Auto-calificación desde el marcador final de MLB</td></tr>
    <tr><td><b>Modelo IA</b></td><td>Pesos del modelo (ajustables)</td></tr></table>`),

  sec('11','Seguridad y persistencia','Quién puede escribir',`
    <div class="pt"><ul>
      <li><b>Supabase RLS:</b> lectura pública, escritura solo el <b>dueño autenticado</b> (login email+password). Nadie puede borrar/alterar tu historial.</li>
      <li><b>Cache del análisis:</b> local (este equipo) + nube (cualquier equipo).</li>
      <li>La "anon key" es pública por diseño; la seguridad la dan las políticas RLS (ver <i>supabase-setup.sql</i>).</li>
    </ul></div>`),

  sec('12','Limitaciones honestas','Qué NO es',`
    <div class="kbox" style="border-left-color:#d23b2a"><b>Importante:</b> es una herramienta de <b>valor esperado</b>, no una garantía de ganar. A corto plazo, ganar/perder es azar.</div>
    <div class="pt"><ul>
      <li><b>El modelo aún no está probado:</b> la validación se llena con el uso; hasta tener ~100+ picks calificados no sabes si está bien calibrado.</li>
      <li><b>Edge sin cuotas = orientativo:</b> solo aplica cuando no hay cuotas; con cuotas el edge es real.</li>
      <li><b>Props limitados por el feed:</b> las casas postean Ks/props por tandas; algunos no aparecen al analizar temprano (limitación de la fuente).</li>
      <li><b>Aproximaciones menores:</b> la orientación de estadios (viento) es aproximada; los techos retráctiles se tratan como domo.</li>
      <li><b>Recalibra, no reentrena:</b> ajusta la confianza del modelo con tu historial, pero los pesos base de la regresión siguen fijos.</li>
    </ul></div>`),

  sec('13','Cómo usarlo','Guía paso a paso',`
    <div class="grid2">
      <div class="pt"><b>Preparación (una vez)</b><ul>
        <li>Corre el SQL en Supabase (tablas + seguridad).</li>
        <li>Crea tu usuario (Authentication → Add user).</li>
        <li>(Opcional) pega tu key de The Odds API.</li>
      </ul>
      <b>Día a día</b><ul>
        <li>Inicia sesión y presiona <b>Analizar</b> (cerca del horario de los juegos).</li>
        <li>Revisa Picks (filtra +EV). Apuesta el stake sugerido (cap 5%).</li>
        <li>(Opcional) marca Props Ks/bateadores para líneas reales.</li>
      </ul></div>
      <div class="pt"><b>Después de los juegos</b><ul>
        <li>Historial → ⚡ Auto-calificar.</li>
        <li>Validación → 📸 Capturar cierre (para el CLV).</li>
      </ul>
      <b>Cada cierto tiempo</b><ul>
        <li>Revisa Validación: si <b>Predicho ≈ Real</b> y el <b>CLV es positivo</b>, vas bien.</li>
        <li>Si la calibración sale roja, no le creas a los edges.</li>
      </ul></div>
    </div>`),

  sec('14','Glosario','Términos clave',`
    <table class="ftable"><tr><th>Término</th><th>Significado</th></tr>
    <tr><td><b>Edge</b></td><td>Ventaja: prob. del modelo − prob. justa del mercado. &gt;0 = valor</td></tr>
    <tr><td><b>Stake</b></td><td>Cuánto apostar (% del bankroll, medio-Kelly, cap 5%)</td></tr>
    <tr><td><b>De-vig</b></td><td>Quitar la comisión de la casa para sacar la probabilidad real</td></tr>
    <tr><td><b>Blend</b></td><td>Mezcla 70% mercado + 30% modelo</td></tr>
    <tr><td><b>ML / RL / F5</b></td><td>Money Line / Run Line -1.5 / Primeras 5 innings</td></tr>
    <tr><td><b>CLV</b></td><td>Closing Line Value: ¿le ganaste al número de cierre?</td></tr>
    <tr><td><b>Brier</b></td><td>Qué tan buenas son tus probabilidades (más bajo = mejor)</td></tr>
    <tr><td><b>Platoon</b></td><td>Ventaja/desventaja del bateador según la mano del pitcher</td></tr>
    <tr><td><b>PF</b></td><td>Park Factor: cuánto el estadio favorece anotar</td></tr>
    <tr><td><b>wOBA</b></td><td>Ofensiva ponderada por valor real de carreras</td></tr></table>`),
  ].join('\n');

  const pres=`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.6.0/dist/tabler-icons.min.css">
  ${style}
  <style>
    @page{size:A4;margin:0}
    body{background:#fff;font-size:13px}
    .deck{width:210mm;margin:0 auto}
    section{box-sizing:border-box;padding:16mm 16mm;min-height:297mm;page-break-after:always;position:relative}
    .cover{background:linear-gradient(135deg,#101418,#1b2733);color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
    .cv-logo{width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#f5a623,#e08008);display:flex;align-items:center;justify-content:center;font-size:42px;color:#fff;box-shadow:0 10px 40px rgba(224,128,8,.5);margin-bottom:24px}
    .cover h1{font-size:46px;letter-spacing:-1px;margin:0;background:linear-gradient(90deg,#f5a623,#ffce80);-webkit-background-clip:text;background-clip:text;color:transparent}
    .cv-sub{font-size:18px;color:#cfd8e3;margin:14px 0 6px}
    .cv-tag{font-size:13px;color:#8a97a6}
    .cv-foot{position:absolute;bottom:18mm;font-size:11px;color:#67727f}
    .slide h2{font-size:23px;margin:0;color:#1b2128}
    .s-head{display:flex;align-items:center;gap:14px;margin-bottom:16px;border-bottom:2px solid #eceff3;padding-bottom:12px}
    .s-num{min-width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#e08008,#c26a06);color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800}
    .s-sub{margin:2px 0 0;color:#5b6573;font-size:12px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .pt{font-size:12.5px;line-height:1.55;color:#39424d}
    .pt b{color:#1b2128}
    .pt li{margin-bottom:6px}
    .kbox{background:#f4f7fa;border:1px solid #e1e7ee;border-left:4px solid #e08008;border-radius:10px;padding:11px 15px;margin:10px 0;font-size:12px;color:#39424d}
    .ftable{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
    .ftable th{background:#1b2733;color:#fff;text-align:left;padding:7px 10px;font-size:11px}
    .ftable td{padding:7px 10px;border-bottom:1px solid #eceff3;vertical-align:top}
    .ftable tr:nth-child(even) td{background:#f7f9fb}
    .shot{border:1px solid #e1e7ee;border-radius:12px;padding:10px;background:#fff;box-shadow:0 6px 20px rgba(20,30,50,.08)}
    .shot-cap{font-size:10px;color:#8a97a6;text-align:center;margin-top:6px}
    #app{display:block!important}
    .pill{display:inline-block;background:#e3f5ec;color:#0c7a55;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;margin:2px}
  </style></head><body><div class="deck">
  ${cover}
  ${sections}
  </div></body></html>`;
  fs.writeFileSync('presentacion.html',pres);
  console.log('presentacion.html escrita ('+pres.length+' bytes) · 14 secciones');
})();
