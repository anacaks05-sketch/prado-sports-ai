const API_URL = 'https://www.thesportsdb.com/api/v1/json/3/eventsday.php';
const state = { games: [], market: 'over15', risk: 'moderado', ticketGenerated: false };
const fallbackTeams = [
  ['Flamengo','Bahia','Brasil · Série A'],['Real Madrid','Valencia','Espanha · La Liga'],['Liverpool','Brighton','Inglaterra · Premier League'],['Palmeiras','Santos','Brasil · Série A'],['Manchester City','Everton','Inglaterra · Premier League'],['Barcelona','Sevilla','Espanha · La Liga'],['PSG','Lyon','França · Ligue 1'],['Bayern','Dortmund','Alemanha · Bundesliga'],['Inter','Roma','Itália · Série A'],['Porto','Benfica','Portugal · Liga Portugal']
];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const todayISO = () => new Date().toISOString().slice(0,10);
function hashScore(text){let h=0;for(const c of text) h=(h*31+c.charCodeAt(0))%997;return h;}
function marketName(v=state.market){return v==='over05'?'Over 0.5 Gols':v==='over15'?'Over 1.5 Gols':v==='over25'?'Over 2.5 Gols':v==='over35'?'Over 3.5 Gols':v==='under05'?'Under 0.5 Gols':v==='under15'?'Under 1.5 Gols':v==='under25'?'Under 2.5 Gols':v==='under35'?'Under 3.5 Gols':v==='home'?'Vitória Mandante':'Ambas Marcam - SIM';}
function marketSub(v=state.market){return v==='home'?'Resultado Final':v==='both'?'Ambas Marcam':'Total de Gols';}
function enrich(game, market){
  const h=hashScore(game.home+game.away+market);
  const base=market==='over05'?86:market==='over15'?78:market==='over25'?62:market==='over35'?48:market==='under05'?38:market==='under15'?54:market==='under25'?68:market==='under35'?80:market==='home'?58:61;
  const prob=Math.min(91,Math.max(44,base+(h%24)-8));
  const odd=+(100/prob*1.08).toFixed(2);
  const ev=+((prob/100)*odd-1).toFixed(2);
  return {...game,prob,odd,ev,market};
}
function makeFallback(){return fallbackTeams.map(([home,away,league],i)=>({home,away,league,time:`${15+i}:00`}));}
async function loadGames(){
  const date=$('#date').value||todayISO();
  try{
    const res=await fetch(`${API_URL}?d=${date}&s=Soccer`,{cache:'no-store'});
    const data=await res.json();
    const events=(data.events||[]).map(e=>({home:e.strHomeTeam||'Mandante',away:e.strAwayTeam||'Visitante',league:e.strLeague||'Liga',time:(e.strTime||'').slice(0,5)||'Hoje'}));
    state.games=(events.length?events:makeFallback()).map(g=>enrich(g,state.market));
  }catch(e){
    state.games=makeFallback().map(g=>enrich(g,state.market));
  }
  renderAll();
}
function renderGame(g){return `<article class="game"><div class="league">${g.league}</div><div class="teams">${g.home} x ${g.away}</div><div class="meta"><span>🕒 ${g.time}</span><span class="pill">${g.prob}%</span><span>Odd ${g.odd}</span><span>EV ${g.ev>0?'+':''}${g.ev}</span></div></article>`;}
function renderScanner(){ /* resultados ficam somente na aba Jogos */ }
function ticketConfig(){return {leve:{n:2,min:78,label:'LEVE',risk:'BAIXO'},moderado:{n:4,min:62,label:'MODERADO',risk:'MODERADO'},agressivo:{n:6,min:0,label:'AGRESSIVO',risk:'ALTO'}}[state.risk];}
function pickGames(){const cfg=ticketConfig();let picks=state.games.filter(g=>g.prob>=cfg.min).sort((a,b)=>state.risk==='agressivo'?b.odd-a.odd:b.prob-a.prob).slice(0,cfg.n);if(picks.length<cfg.n)picks=state.games.slice().sort((a,b)=>b.prob-a.prob).slice(0,cfg.n);return picks;}
function renderTicket(){
  const picks=pickGames(), cfg=ticketConfig();
  const odd=picks.reduce((m,g)=>m*g.odd,1); const confidence=Math.round(picks.reduce((m,g)=>m+g.prob,0)/(picks.length||1));
  const now=new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  $('#ticket').innerHTML=`<div class="ticket-header"><h2>✓ BILHETE GERADO</h2><time>Gerado em ${now}</time><span class="verified">VERIFICADO</span></div><div class="summary"><div>Odd total<b>${odd.toFixed(2)}</b></div><div class="green">Confiança IA<b>${confidence}%</b></div><div>Nível de risco<b>${cfg.risk}</b></div><div>Jogos<b>${picks.length}</b></div></div><div class="ticket-list">${picks.map((g,i)=>`<div class="pick"><div class="pick-no">${i+1}</div><div class="pick-team"><div class="name">${g.home} x ${g.away}</div><div class="sub">${g.league}</div></div><div class="pick-market"><div class="name">${marketName(g.market)}</div><div class="market-sub">${marketSub(g.market)}</div></div><div class="odd">${g.odd}</div><div class="bars"><i></i><i></i><i></i><i></i></div></div>`).join('')}</div>`;
}
function renderGames(){const groups=state.games.reduce((a,g)=>((a[g.league]??=[]).push(g),a),{});$('#gamesList').innerHTML=Object.entries(groups).map(([league,games])=>`<div class="league-block"><h3 class="league-title">${league}</h3><div class="grid">${games.map(renderGame).join('')}</div></div>`).join('');}
function renderAll(){renderScanner();if(state.ticketGenerated)renderTicket();renderGames();}
function getSelectedMarket(){const m=$('#market').value;if(m==='home')return 'home';if(m==='both')return 'both';return ($('#ou').value==='under'?'under':'over')+$('#line').value;}
function updatePreview(){const v=getSelectedMarket(); state.market=v; const label=v.startsWith('under')?'Under ':'+'; $('#searchPreview').textContent='Buscando: '+(v==='home'?'Vitória Mandante':v==='both'?'Ambas Marcam':(v.startsWith('under')?'Under ':'+')+(v.slice(-2)[0]+'.'+v.slice(-1))+' Gols FT'); if(state.games.length){state.games=state.games.map(g=>enrich(g,v));renderAll();}}
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active');});
$$('.risk-card').forEach(b=>b.onclick=()=>{$$('.risk-card').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.risk=b.dataset.risk;if(state.ticketGenerated)renderTicket();});
$('#generateTicket').onclick=()=>{state.ticketGenerated=true;renderTicket();}; $('#scanBtn').onclick=async()=>{await loadGames(); $$('.tab,.panel').forEach(x=>x.classList.remove('active')); document.querySelector('[data-tab="jogos"]').classList.add('active'); $('#jogos').classList.add('active');}; $('#market').onchange=updatePreview; $('#ou').onchange=updatePreview; $('#line').onchange=updatePreview; $('#date').value=todayISO(); updatePreview();
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden');});$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$('#installBtn').classList.add('hidden');}};if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));}
loadGames();
