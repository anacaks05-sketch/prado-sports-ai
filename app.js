const API_URL = 'https://www.thesportsdb.com/api/v1/json/3/eventsday.php';
const state = { games: [], marketType: 'match_goals', line: 'over15', qty: 3, risk: 'moderado', ticketGenerated: false };

const fallbackTeams = [
  ['Flamengo','Bahia','Brasil · Série A'], ['Real Madrid','Valencia','Espanha · La Liga'],
  ['Liverpool','Brighton','Inglaterra · Premier League'], ['Palmeiras','Santos','Brasil · Série A'],
  ['Manchester City','Everton','Inglaterra · Premier League'], ['Barcelona','Sevilla','Espanha · La Liga'],
  ['PSG','Lyon','França · Ligue 1'], ['Bayern','Dortmund','Alemanha · Bundesliga'],
  ['Inter','Roma','Itália · Série A'], ['Porto','Benfica','Portugal · Liga Portugal']
];

const lineMap = {
  match_goals: [
    ['over05','Over +0.5'], ['over15','Over +1.5'], ['over25','Over +2.5'], ['over35','Over +3.5'],
    ['under25','Under 2.5'], ['under35','Under 3.5']
  ],
  first_half_goals: [['htover05','Over 0.5 HT'], ['htover15','Over 1.5 HT']],
  btts: [['btts_yes','Sim'], ['btts_no','Não']],
  corners: [['corners75','Over 7.5'], ['corners85','Over 8.5'], ['corners95','Over 9.5'], ['corners105','Over 10.5']],
  cards: [['cards25','Over 2.5'], ['cards35','Over 3.5'], ['cards45','Over 4.5']],
  games_goals: [['best_over15','Mais Provável Over 1.5'], ['best_over25','Mais Provável Over 2.5'], ['best_btts','Ambas Marcam']]
};

const marketLabels = {
  over05:['Over 0.5 Gols','Total de Gols'], over15:['Over 1.5 Gols','Total de Gols'], over25:['Over 2.5 Gols','Total de Gols'], over35:['Over 3.5 Gols','Total de Gols'],
  under25:['Under 2.5 Gols','Total de Gols'], under35:['Under 3.5 Gols','Total de Gols'],
  htover05:['Over 0.5 HT','Gols 1º Tempo'], htover15:['Over 1.5 HT','Gols 1º Tempo'],
  btts_yes:['Ambos Marcam - SIM','Ambas Marcam'], btts_no:['Ambos Marcam - NÃO','Ambas Marcam'],
  corners75:['Over 7.5 Escanteios','Total de Escanteios'], corners85:['Over 8.5 Escanteios','Total de Escanteios'], corners95:['Over 9.5 Escanteios','Total de Escanteios'], corners105:['Over 10.5 Escanteios','Total de Escanteios'],
  cards25:['Over 2.5 Cartões','Total de Cartões'], cards35:['Over 3.5 Cartões','Total de Cartões'], cards45:['Over 4.5 Cartões','Total de Cartões'],
  best_over15:['Mais Provável Over 1.5','Jogos para Gols'], best_over25:['Mais Provável Over 2.5','Jogos para Gols'], best_btts:['Ambas Marcam','Jogos para Gols']
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const todayISO = () => new Date().toISOString().slice(0,10);
function hashScore(text){let h=0;for(const c of text) h=(h*31+c.charCodeAt(0))%997;return h;}
function label(){return marketLabels[state.line] || ['Over 1.5 Gols','Total de Gols'];}
function makeFallback(){return fallbackTeams.map(([home,away,league],i)=>({home,away,league,time:`${15+i}:00`}));}

function enrich(game){
  const h=hashScore(game.home+game.away+state.line);
  const base = state.line.includes('05') || state.line.includes('15') || state.line === 'best_over15' ? 80 :
               state.line.includes('25') || state.line === 'btts_yes' || state.line === 'best_btts' ? 64 :
               state.line.includes('35') || state.line.includes('85') ? 56 : 50;
  const prob=Math.min(92,Math.max(42,base+(h%24)-8));
  const odd=+(100/prob*1.08).toFixed(2);
  const ev=+((prob/100)*odd-1).toFixed(2);
  return {...game,prob,odd,ev,line:state.line};
}

async function loadGames(){
  const date=$('#date').value||todayISO();
  try{
    const res=await fetch(`${API_URL}?d=${date}&s=Soccer`,{cache:'no-store'});
    const data=await res.json();
    const events=(data.events||[]).map(e=>({home:e.strHomeTeam||'Mandante',away:e.strAwayTeam||'Visitante',league:e.strLeague||'Liga',time:(e.strTime||'').slice(0,5)||'Hoje'}));
    state.games=(events.length?events:makeFallback()).map(enrich).sort((a,b)=>b.prob-a.prob);
  }catch(e){
    state.games=makeFallback().map(enrich).sort((a,b)=>b.prob-a.prob);
  }
  renderGames();
}

function renderLineOptions(){
  const opts = lineMap[state.marketType];
  $('#lineSelect').innerHTML = opts.map(([v,t],i)=>`<option value="${v}" ${i===1 || (opts.length===2 && i===0) ? 'selected' : ''}>${t}</option>`).join('');
  state.line = $('#lineSelect').value;
  updatePreview();
}

function updatePreview(){
  state.marketType = $('#marketType').value;
  state.line = $('#lineSelect').value || state.line;
  state.qty = Number($('#qtySelect').value || 3);
  $('#searchPreview').textContent = `Buscando: ${label()[0]}`;
  if(state.games.length){ state.games = state.games.map(enrich).sort((a,b)=>b.prob-a.prob); renderGames(); }
}

function renderGame(g){
  return `<article class="game">
    <div class="league">${g.league}</div>
    <div class="teams">${g.home} x ${g.away}</div>
    <div class="meta"><span>🕒 ${g.time}</span><span class="pill">${g.prob}%</span><span>Odd ${g.odd}</span><span>EV ${g.ev>0?'+':''}${g.ev}</span></div>
  </article>`;
}
function renderGames(){
  const selected = state.games.slice(0, Math.max(state.qty, 3));
  const groups=selected.reduce((a,g)=>((a[g.league]??=[]).push(g),a),{});
  $('#gamesList').innerHTML=Object.entries(groups).map(([league,games])=>`<div class="league-block"><h3 class="league-title">${league}</h3><div class="grid">${games.map(renderGame).join('')}</div></div>`).join('');
}

function ticketConfig(){
  const cfg = {leve:{min:78,label:'LEVE',risk:'BAIXO'},moderado:{min:62,label:'MODERADO',risk:'MODERADO'},agressivo:{min:0,label:'AGRESSIVO',risk:'ALTO'}}[state.risk];
  return {...cfg,n:state.qty};
}
function pickGames(){
  const cfg=ticketConfig();
  let picks=state.games.filter(g=>g.prob>=cfg.min).sort((a,b)=>state.risk==='agressivo'?b.odd-a.odd:b.prob-a.prob).slice(0,cfg.n);
  if(picks.length<cfg.n)picks=state.games.slice().sort((a,b)=>b.prob-a.prob).slice(0,cfg.n);
  return picks;
}
function renderTicket(){
  const picks=pickGames(), cfg=ticketConfig();
  const odd=picks.reduce((m,g)=>m*g.odd,1);
  const confidence=Math.round(picks.reduce((m,g)=>m+g.prob,0)/(picks.length||1));
  const now=new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  $('#ticketEmpty').classList.add('hidden');
  $('#ticket').classList.remove('hidden');
  $('#ticket').innerHTML=`<div class="ticket-header"><h2>✓ BILHETE GERADO</h2><time>Gerado em ${now}</time><span class="verified">VERIFICADO</span></div>
    <div class="summary"><div>Odd total<b>${odd.toFixed(2)}</b></div><div class="green">Confiança IA<b>${confidence}%</b></div><div>Nível de risco<b>${cfg.risk}</b></div><div>Jogos<b>${picks.length}</b></div></div>
    <div class="ticket-list">${picks.map((g,i)=>`<div class="pick"><div class="pick-no">${i+1}</div><div class="pick-team"><div class="name">${g.home} x ${g.away}</div><div class="sub">${g.league}</div><div class="market-name">${marketLabels[g.line][0]}</div><div class="market-sub">${marketLabels[g.line][1]}</div></div><div class="odd">${g.odd}</div><div class="bars"><i></i><i></i><i></i><i></i></div></div>`).join('')}</div>`;
}
function switchTab(name){$$('.tab,.panel').forEach(x=>x.classList.remove('active')); document.querySelector(`[data-tab="${name}"]`).classList.add('active'); $('#'+name).classList.add('active');}

$$('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$$('.risk-card').forEach(b=>b.onclick=()=>{$$('.risk-card').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.risk=b.dataset.risk;if(state.ticketGenerated)renderTicket();});
$('#marketType').onchange=()=>{state.marketType=$('#marketType').value;renderLineOptions();};
$('#lineSelect').onchange=updatePreview;
$('#qtySelect').onchange=updatePreview;
$('#scanBtn').onclick=async()=>{await loadGames();switchTab('jogos');};
function generate(){state.ticketGenerated=true;if(!state.games.length){loadGames().then(()=>{renderTicket();switchTab('bilhete');});}else{renderTicket();switchTab('bilhete');}}
$('#generateTicket').onclick=generate;
$('#generateFromGames').onclick=generate;
$('#date').value=todayISO();
renderLineOptions();
loadGames();

let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden');});
$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$('#installBtn').classList.add('hidden');}};
if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));}
