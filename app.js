const API_URL = 'https://www.thesportsdb.com/api/v1/json/3/eventsday.php';
const state = { games: [], market: 'over15', risk: 'leve' };
const fallbackTeams = [
  ['Palmeiras','Santos','Brasil Série A'],['Flamengo','Grêmio','Brasil Série A'],['Corinthians','Bahia','Brasil Série A'],['Real Madrid','Valencia','La Liga'],['Barcelona','Sevilla','La Liga'],['Manchester City','Everton','Premier League'],['Liverpool','Tottenham','Premier League'],['PSG','Lyon','Ligue 1'],['Bayern','Dortmund','Bundesliga'],['Inter','Roma','Serie A']
];
const $ = s => document.querySelector(s);
const todayISO = () => new Date().toISOString().slice(0,10);
function hashScore(text){let h=0;for(let c of text)h=(h*31+c.charCodeAt(0))%997;return h;}
function enrich(game, market){
  const h = hashScore(game.home+game.away+market);
  const base = market==='over15'?78:market==='over25'?62:market==='home'?55:58;
  const prob = Math.min(91, Math.max(42, base + (h%25)-8));
  const odd = +(100/prob*1.08).toFixed(2);
  const ev = +((prob/100)*odd-1).toFixed(2);
  return {...game, prob, odd, ev, market};
}
async function loadGames(){
  const date = $('#date').value || todayISO();
  $('#status').textContent = 'Buscando jogos reais...';
  try{
    const res = await fetch(`${API_URL}?d=${date}&s=Soccer`, {cache:'no-store'});
    const data = await res.json();
    const events = (data.events || []).map(e => ({
      home:e.strHomeTeam || 'Mandante', away:e.strAwayTeam || 'Visitante',
      league:e.strLeague || 'Liga', time:(e.strTime || '').slice(0,5) || 'Hoje'
    }));
    state.games = (events.length ? events : makeFallback()).map(g=>enrich(g,state.market));
    $('#status').textContent = events.length ? `${events.length} jogos encontrados via API pública.` : 'API sem jogos para a data; usando fallback demonstrativo.';
  }catch(err){
    state.games = makeFallback().map(g=>enrich(g,state.market));
    $('#status').textContent = 'API indisponível; usando fallback demonstrativo offline.';
  }
  renderAll();
}
function makeFallback(){return fallbackTeams.map(([home,away,league],i)=>({home,away,league,time:`${12+i}:00`}));}
function renderGame(g){const evClass=g.ev>=0?'evpos':'evneg';return `<article class="game"><div class="league">${g.league}</div><div class="teams">${g.home} x ${g.away}</div><div class="meta"><span>🕒 ${g.time}</span><span class="pill">${g.prob}%</span><span>Odd ${g.odd}</span><span class="${evClass}">EV ${g.ev>0?'+':''}${g.ev}</span></div></article>`}
function renderScanner(){const limit=+$('#limit').value||8;$('#scanResults').innerHTML=state.games.slice().sort((a,b)=>b.prob-a.prob).slice(0,limit).map(renderGame).join('');}
function renderTicket(){
  const cfg={leve:{n:2,min:78,title:'Bilhete Leve',desc:'Odds baixas, foco em alta probabilidade.'},moderado:{n:4,min:62,title:'Bilhete Moderado',desc:'Equilíbrio entre segurança e retorno.'},agressivo:{n:6,min:0,title:'Bilhete Agressivo',desc:'Múltiplo maior, odds altas e retorno agressivo.'}}[state.risk];
  let picks=state.games.filter(g=>g.prob>=cfg.min).sort((a,b)=> state.risk==='agressivo'?b.odd-a.odd:b.prob-a.prob).slice(0,cfg.n);
  if(picks.length<cfg.n) picks=state.games.slice().sort((a,b)=>b.prob-a.prob).slice(0,cfg.n);
  const odd=picks.reduce((m,g)=>m*g.odd,1); const prob=picks.reduce((m,g)=>m*(g.prob/100),1)*100; const stake=10;
  $('#ticket').innerHTML=`<h2>${cfg.title}</h2><p>${cfg.desc}</p>${picks.map(renderGame).join('')}<div class="ticket-total"><div class="stat">Odd total<b>${odd.toFixed(2)}</b></div><div class="stat">Prob. combinada<b>${prob.toFixed(1)}%</b></div><div class="stat">Retorno R$10<b>R$ ${(odd*stake).toFixed(2)}</b></div></div>`;
}
function renderGames(){
  const groups = state.games.reduce((a,g)=>((a[g.league]??=[]).push(g),a),{});
  $('#gamesList').innerHTML = Object.entries(groups).map(([league,games])=>`<div class="league-block"><h3 class="league-title">${league}</h3><div class="grid">${games.map(renderGame).join('')}</div></div>`).join('');
}
function renderAll(){renderScanner();renderTicket();renderGames();}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active');});
document.querySelectorAll('.risk').forEach(b=>b.onclick=()=>{document.querySelectorAll('.risk').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.risk=b.dataset.risk;renderTicket();});
function marketLabel(){const v=$('#line')?.value || $('#market').value; return v==='over15'?'+1.5 Gols FT':v==='over25'?'+2.5 Gols FT':v==='home'?'Vitória Mandante':'Ambas Marcam';}
function updatePreview(){ const v=$('#line')?.value || $('#market').value; $('#market').value=v; state.market=v; $('#searchPreview').textContent='⌕ Buscando: '+marketLabel(); if(state.games.length){state.games=state.games.map(g=>enrich(g,v));renderAll();}}
$('#market').onchange=e=>{ if($('#line')) $('#line').value=e.target.value; updatePreview();};
if($('#line')) $('#line').onchange=e=>{ $('#market').value=e.target.value; updatePreview();};
$('#scanBtn').onclick=loadGames; $('#quickTicket').onclick=()=>{document.querySelector('[data-tab=\"bilhete\"]').click();renderTicket();}; $('#date').value=todayISO(); updatePreview();
let deferredPrompt; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden');});
$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$('#installBtn').classList.add('hidden');}};
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));}
loadGames();
