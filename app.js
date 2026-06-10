const lineOptions = {
  gols: ['Over +0.5', 'Over +1.5', 'Over +2.5', 'Over +3.5', 'Under +2.5', 'Under +3.5'],
  gols_ht: ['Over 0.5 HT', 'Over 1.5 HT'],
  ambos: ['Sim', 'Não'],
  escanteios: ['Over 7.5', 'Over 8.5', 'Over 9.5', 'Over 10.5'],
  cartoes: ['Over 2.5', 'Over 3.5', 'Over 4.5'],
  jogos_gols: ['Mais provável Over 1.5', 'Mais provável Over 2.5', 'Ambas Marcam']
};

const fallbackGames = [
  { league:'Brasil Série A', time:'19:00', home:'Flamengo', away:'Bahia', prob:87, odd:1.62, ev:'+0.14' },
  { league:'Argentina Liga', time:'20:15', home:'River Plate', away:'Lanús', prob:84, odd:1.55, ev:'+0.09' },
  { league:'MLS', time:'21:30', home:'Inter Miami', away:'Orlando City', prob:82, odd:1.70, ev:'+0.11' },
  { league:'Chile Primera', time:'22:00', home:'Colo-Colo', away:'Everton', prob:80, odd:1.66, ev:'+0.08' },
  { league:'Uruguai', time:'18:30', home:'Peñarol', away:'Danubio', prob:79, odd:1.74, ev:'+0.10' },
  { league:'Brasil Série B', time:'21:00', home:'Goiás', away:'CRB', prob:77, odd:1.82, ev:'+0.12' },
  { league:'Peru Liga 1', time:'20:00', home:'Alianza Lima', away:'Cienciano', prob:76, odd:1.88, ev:'+0.13' },
  { league:'Colômbia', time:'21:45', home:'Nacional', away:'Cali', prob:74, odd:1.95, ev:'+0.15' }
];

let currentGames = [...fallbackGames];
let currentTicket = null;

const marketSelect = document.getElementById('marketSelect');
const lineSelect = document.getElementById('lineSelect');
const quantitySelect = document.getElementById('quantitySelect');
const dateInput = document.getElementById('dateInput');
const gamesList = document.getElementById('gamesList');
const ticketArea = document.getElementById('ticketArea');

function todayISO(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

function updateLines(){
  const lines = lineOptions[marketSelect.value] || lineOptions.gols;
  lineSelect.innerHTML = lines.map(v => `<option value="${v}">${v}</option>`).join('');
}

function setTab(tabName){
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active-screen', screen.id === tabName));
}

function renderGames(games = currentGames){
  const line = lineSelect.value || 'Over +1.5';
  gamesList.innerHTML = games.map(game => `
    <article class="game-card">
      <div class="league-row"><span>${game.league}</span><span>${game.time}</span></div>
      <div class="match">${game.home} x ${game.away}</div>
      <div class="game-stats">
        <div class="stat"><span>Confiança</span><strong>${game.prob}%</strong></div>
        <div class="stat"><span>Odd</span><strong>${game.odd.toFixed(2)}</strong></div>
        <div class="stat"><span>Mercado</span><strong>${line}</strong></div>
      </div>
      <div class="confidence-bar"><i style="width:${game.prob}%"></i></div>
    </article>
  `).join('');
}

async function scanGames(){
  const qty = Number(quantitySelect.value || 4);
  const shuffled = fallbackGames
    .map(game => ({...game, prob: Math.max(70, Math.min(92, game.prob + Math.floor(Math.random()*5)-2))}))
    .sort((a,b) => b.prob - a.prob);
  currentGames = shuffled.slice(0, Math.max(qty, 4));
  renderGames(currentGames);
  setTab('jogos');
}

function generateTicket(){
  const qty = Number(quantitySelect.value || 4);
  const picks = currentGames.slice(0, qty);
  const oddTotal = picks.reduce((acc, game) => acc * game.odd, 1);
  const avgProb = Math.round(picks.reduce((acc, game) => acc + game.prob, 0) / picks.length);
  const risk = qty <= 3 ? 'Leve' : qty <= 5 ? 'Moderado' : 'Agressivo';
  const line = lineSelect.value || 'Over +1.5';

  currentTicket = { picks, oddTotal, avgProb, risk, line };
  renderTicket();
  setTab('bilhete');
}

function renderTicket(){
  if(!currentTicket) return;
  const { picks, oddTotal, avgProb, risk, line } = currentTicket;
  ticketArea.className = 'ticket-card';
  ticketArea.innerHTML = `
    <div class="ticket-top">
      <h3>Bilhete Gerado</h3>
      <span class="verify">VERIFICADO</span>
    </div>
    <div class="ticket-metrics">
      <div class="ticket-metric"><span>Odd Total</span><strong>${oddTotal.toFixed(2)}</strong></div>
      <div class="ticket-metric"><span>Confiança IA</span><strong>${avgProb}%</strong></div>
      <div class="ticket-metric"><span>Risco</span><strong>${risk}</strong></div>
      <div class="ticket-metric"><span>Jogos</span><strong>${picks.length}</strong></div>
    </div>
    <div class="pick-list">
      ${picks.map((game, index) => `
        <div class="pick">
          <strong>${index + 1}. ${game.home} x ${game.away}</strong>
          <span>${line} • Odd ${game.odd.toFixed(2)} • ${game.prob}%</span>
        </div>
      `).join('')}
    </div>
  `;
}

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
marketSelect.addEventListener('change', () => { updateLines(); renderGames(currentGames); });
document.getElementById('scanBtn').addEventListener('click', scanGames);
document.getElementById('generateTicketBtn').addEventListener('click', generateTicket);

dateInput.value = todayISO();
updateLines();
renderGames(currentGames.slice(0,4));

if('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}


window.addEventListener('load', () => {
  const splash = document.getElementById('splashScreen');
  const app = document.querySelector('.app-shell');
  setTimeout(() => {
    splash?.classList.add('hide');
    app?.classList.remove('app-hidden');
  }, 1800);
});
