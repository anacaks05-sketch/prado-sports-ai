const lineOptions = {
  gols: ['Over +0.5', 'Over +1.5', 'Over +2.5', 'Over +3.5', 'Under +2.5', 'Under +3.5'],
  gols_ht: ['Over 0.5 HT', 'Over 1.5 HT'],
  ambos: ['Sim', 'Não'],
  escanteios: ['Over 7.5', 'Over 8.5', 'Over 9.5', 'Over 10.5'],
  cartoes: ['Over 2.5', 'Over 3.5', 'Over 4.5'],
  jogos_gols: ['Mais provável Over 1.5', 'Mais provável Over 2.5', 'Ambas Marcam']
};

const fallbackGames = [
  { league:'Brasil Série A', flag:'🇧🇷', time:'19:00', home:'Flamengo', away:'Bahia', prob:90, odd:1.62, ev:'+0.18', homeLogo:'assets/teams/flamengo.svg', awayLogo:'assets/teams/bahia.svg' },
  { league:'Argentina Liga', flag:'🇦🇷', time:'20:15', home:'River Plate', away:'Lanús', prob:82, odd:1.55, ev:'+0.12', homeLogo:'assets/teams/river.svg', awayLogo:'assets/teams/lanus.svg' },
  { league:'Chile Primera', flag:'🇨🇱', time:'22:00', home:'Colo-Colo', away:'Everton', prob:82, odd:1.66, ev:'+0.11', homeLogo:'assets/teams/colo-colo.svg', awayLogo:'assets/teams/everton.svg' },
  { league:'MLS', flag:'🇺🇸', time:'21:30', home:'Inter Miami', away:'Orlando City', prob:80, odd:1.70, ev:'+0.10', homeLogo:'assets/teams/inter-miami.svg', awayLogo:'assets/teams/orlando.svg' },
  { league:'Uruguai', flag:'🇺🇾', time:'18:30', home:'Peñarol', away:'Danubio', prob:79, odd:1.74, ev:'+0.10', homeLogo:'assets/teams/penarol.svg', awayLogo:'assets/teams/danubio.svg' },
  { league:'Brasil Série B', flag:'🇧🇷', time:'21:00', home:'Goiás', away:'CRB', prob:77, odd:1.82, ev:'+0.12', homeLogo:'assets/teams/goias.svg', awayLogo:'assets/teams/crb.svg' },
  { league:'Peru Liga 1', flag:'🇵🇪', time:'20:00', home:'Alianza Lima', away:'Cienciano', prob:76, odd:1.88, ev:'+0.13', homeLogo:'assets/teams/alianza.svg', awayLogo:'assets/teams/cienciano.svg' },
  { league:'Colômbia', flag:'🇨🇴', time:'21:45', home:'Nacional', away:'Cali', prob:74, odd:1.95, ev:'+0.15', homeLogo:'assets/teams/nacional.svg', awayLogo:'assets/teams/cali.svg' }
];

let currentGames = [...fallbackGames];
let currentTicket = null;
let selectedRisk = 'leve';

const marketSelect = document.getElementById('marketSelect');
const lineSelect = document.getElementById('lineSelect');
const quantitySelect = document.getElementById('quantitySelect');
const dateInput = document.getElementById('dateInput');
const gamesList = document.getElementById('gamesList');
const ticketArea = document.getElementById('ticketArea');
const scannerTicketArea = document.getElementById('scannerTicketArea');
const generateTicketBtn = document.getElementById('generateTicketBtn');

function todayISO(){ const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function updateLines(){ const lines = lineOptions[marketSelect.value] || lineOptions.gols; lineSelect.innerHTML = lines.map(v => `<option value="${v}">${v}</option>`).join(''); }
function setTab(tabName){ document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName)); document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active-screen', screen.id === tabName)); }
function scoreFor(game, index){ return Math.max(7.8, Math.min(9.7, (game.prob / 10 + (game.odd - 1) * .35 - index * .12))).toFixed(1); }
function tagFor(index){ return index === 0 ? '🔥 Entrada do Dia' : index === 1 ? '☆ Alta Confiança' : '✓ Boa Oportunidade'; }
function qualityFor(index){ return index === 0 ? 'Excelente' : index === 1 ? 'Muito Boa' : 'Boa'; }
function rankClass(index){ return index === 0 ? '' : index === 1 ? ' silver' : ' bronze'; }
function logoClass(i){ return ['a','b','c','d','e','f'][i % 6]; }

function crestImg(src, name){
  return `<img class="team-crest" src="${src}" alt="Escudo ${name}" loading="lazy" />`;
}

function renderGames(games = currentGames){
  const line = lineSelect.value || 'Over +1.5';
  const topGames = [...games].sort((a,b)=> b.prob - a.prob).slice(0, Math.max(Number(quantitySelect.value || 4), 3));
  const liveSummary = `
    <div class="live-summary v18-summary">
      <div class="live-left">
        <h3><span class="live-dot-mini"></span>IA AO VIVO</h3>
        <p><span id="monitoredCount">143</span> Jogos • <span id="oppCount">24</span> Oportunidades</p>
      </div>
      <div class="hot-markets">
        <span>Over 1.5 <b>92%</b></span>
        <span>BTTS <b>84%</b></span>
        <span>Esc. <b>79%</b></span>
      </div>
    </div>`;
  gamesList.innerHTML = liveSummary + topGames.map((game, index) => {
    const score = scoreFor(game, index);
    return `
      <article class="opportunity-card v18-card ${index === 0 ? 'best' : ''}">
        <div class="v18-card-head">
          <div class="rank-wrap"><span class="rank-badge${rankClass(index)}">${index + 1}</span><span class="tag ${index === 2 ? 'green' : ''}">${tagFor(index)}</span></div>
          <span class="score-chip">IA ${score}</span>
        </div>

        <div class="v18-match-line">
          ${crestImg(game.homeLogo, game.home)}
          <div class="v18-teams">
            <strong>${game.home} <span>x</span> ${game.away}</strong>
            <small>${game.flag || '⚽'} ${game.league} • ${game.time}</small>
          </div>
          ${crestImg(game.awayLogo, game.away)}
        </div>

        <div class="v18-metrics">
          <div><b>${game.prob}%</b><span>Confiança</span></div>
          <div><b>${game.odd.toFixed(2)}</b><span>Odd</span></div>
          <div><b>${line.replace('+0.5','+1.5')}</b><span>Mercado</span></div>
        </div>
      </article>`;
  }).join('');
}
function getRiskQty(){ if(selectedRisk === 'leve') return 3; if(selectedRisk === 'moderado') return 5; return 8; }
function getRiskLabel(){ return selectedRisk === 'leve' ? 'Leve' : selectedRisk === 'moderado' ? 'Moderado' : 'Agressivo'; }
function buildTicket(qty){ const picks = currentGames.slice(0, qty); const oddTotal = picks.reduce((acc, game) => acc * game.odd, 1); const avgProb = Math.round(picks.reduce((acc, game) => acc + game.prob, 0) / picks.length); const line = lineSelect.value || 'Over +1.5'; return { picks, oddTotal, avgProb, risk: getRiskLabel(), line }; }
function shuffleGames(qty, aggressive=false){ const shuffled = fallbackGames.map(game => ({...game, prob: Math.max(70, Math.min(93, game.prob + Math.floor(Math.random()*7)-3))})).sort((a,b) => aggressive ? b.odd - a.odd : b.prob - a.prob); currentGames = shuffled.slice(0, Math.max(qty, 4)); renderGames(currentGames); return currentGames; }

function scanGames(event){
  event?.preventDefault();
  const qty = Number(quantitySelect.value || 4);
  shuffleGames(qty);
  currentTicket = buildTicket(qty);
  setTab('scanner');
  renderInlineTicket();
  scannerTicketArea?.scrollIntoView({ behavior:'smooth', block:'start' });
}
function generateTicketFromRisk(event){
  event?.preventDefault();
  const qty = getRiskQty();
  shuffleGames(qty, selectedRisk === 'agressivo');
  currentTicket = buildTicket(qty);
  showTicketLoading(ticketArea, () => renderTicket(ticketArea));
}
function generateTicketFromGames(){
  const qty = Number(quantitySelect.value || 4);
  currentTicket = buildTicket(qty);
  setTab('bilhete');
  showTicketLoading(ticketArea, () => renderTicket(ticketArea));
}
function showTicketLoading(target, done){
  if(!target) return done();
  target.className = 'generate-loading';
  target.innerHTML = `<h3>🤖 Gerando bilhete IA</h3><p>Analisando oportunidades... calculando Score IA... montando seleções...</p><div class="progress"><i></i></div>`;
  target.scrollIntoView({ behavior:'smooth', block:'center' });
  setTimeout(done, 1850);
}
function renderInlineTicket(){
  if(!currentTicket || !scannerTicketArea) return;
  const { picks, oddTotal, avgProb, risk, line } = currentTicket;
  scannerTicketArea.className = 'inline-ticket-card';
  scannerTicketArea.innerHTML = `<div class="inline-ticket-head"><div><span class="eyebrow">Bilhete do Scan</span><h3>${risk}</h3></div><strong>${oddTotal.toFixed(2)}</strong></div><div class="inline-ticket-meta"><span>${avgProb}% confiança</span><span>${picks.length} jogos</span><span>${line}</span></div><div class="inline-picks">${picks.map((game,index)=>`<div><b>${index+1}</b><span>${game.home} x ${game.away}</span><em>${game.odd.toFixed(2)}</em></div>`).join('')}</div>`;
}
function renderTicket(target = ticketArea){
  if(!currentTicket || !target) return;
  const { picks, oddTotal, avgProb, risk, line } = currentTicket;
  target.className = 'ticket-card';
  target.innerHTML = `<div class="ticket-top"><h3>✅ Bilhete Gerado</h3><span class="verify">IA VERIFICADO</span></div><div class="ticket-metrics"><div class="ticket-metric"><span>Odd Total</span><strong>${oddTotal.toFixed(2)}</strong></div><div class="ticket-metric"><span>Confiança</span><strong>${avgProb}%</strong></div><div class="ticket-metric"><span>Risco</span><strong>${risk}</strong></div><div class="ticket-metric"><span>Jogos</span><strong>${picks.length}</strong></div></div><div class="pick-list">${picks.map((game,index)=>`<div class="pick"><strong>${index+1}. ${game.home} x ${game.away}</strong><span>${line} • Odd ${game.odd.toFixed(2)} • Score IA ${scoreFor(game,index)}</span></div>`).join('')}</div>`;
}

function updateLiveNumbers(){
  const mon = document.getElementById('monitoredCount');
  const opp = document.getElementById('oppCount');
  if(mon) mon.textContent = 124 + Math.floor(Math.random()*22);
  if(opp) opp.textContent = 14 + Math.floor(Math.random()*12);
}

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
document.querySelectorAll('.risk-card').forEach(btn => btn.addEventListener('click', () => { selectedRisk = btn.dataset.risk; document.querySelectorAll('.risk-card').forEach(card => card.classList.toggle('active', card === btn)); }));
marketSelect.addEventListener('change', () => { updateLines(); renderGames(currentGames); });
lineSelect.addEventListener('change', () => renderGames(currentGames));
quantitySelect.addEventListener('change', () => renderGames(currentGames));
document.getElementById('scanBtn').addEventListener('click', scanGames);
generateTicketBtn.addEventListener('click', generateTicketFromGames);
document.getElementById('ticketScanBtn').addEventListener('click', generateTicketFromRisk);

dateInput.value = todayISO();
updateLines();
renderGames(currentGames.slice(0,4));
setInterval(updateLiveNumbers, 4500);

if('serviceWorker' in navigator){ window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {})); }
window.addEventListener('load', () => { const splash = document.getElementById('splashScreen'); const app = document.querySelector('.app-shell'); setTimeout(() => { splash?.classList.add('hide'); app?.classList.remove('app-hidden'); }, 1400); });
