const lineOptions = {
  gols: ['Over +0.5', 'Over +1.5', 'Over +2.5', 'Over +3.5', 'Under +2.5', 'Under +3.5'],
  gols_ht: ['Over 0.5 HT', 'Over 1.5 HT'],
  ambos: ['Sim', 'Não'],
  escanteios: ['Over 7.5', 'Over 8.5', 'Over 9.5', 'Over 10.5'],
  cartoes: ['Over 2.5', 'Over 3.5', 'Over 4.5'],
  jogos_gols: ['Mais provável Over 1.5', 'Mais provável Over 2.5', 'Ambas Marcam']
};

let currentGames = [];
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

function scoreFor(game, index){
  return Math.max(7.8, Math.min(9.7, (game.prob / 10 + (game.odd - 1) * .35 - index * .12))).toFixed(1);
}

function tagFor(index){
  return index === 0 ? '🔥 Entrada do Dia' : index === 1 ? '☆ Alta Confiança' : '✓ Boa Oportunidade';
}

function qualityFor(index){
  return index === 0 ? 'Excelente' : index === 1 ? 'Muito Boa' : 'Boa';
}

function rankClass(index){
  return index === 0 ? '' : index === 1 ? ' silver' : ' bronze';
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    "'":'&#39;',
    '"':'&quot;'
  }[ch]));
}

function crestFallback(){
  return `<span class="club-crest-fallback" aria-hidden="true"><i></i></span>`;
}

function crestImg(url, name){
  const safeUrl = escapeHtml(url || '');
  const safeName = escapeHtml(name || 'Time');
  if(!safeUrl) return crestFallback(name);
  return `<img class="club-crest-img" src="${safeUrl}" alt="Escudo ${safeName}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(this.nextElementSibling)">${crestFallback(name)}`;
}

function normalizeApiGames(games){
  return (games || []).map(g => ({
    league: g.league || 'Liga',
    flag: g.flag || '⚽',
    time: g.time || '--:--',
    home: g.home || 'Mandante',
    away: g.away || 'Visitante',
    prob: Number(g.prob || 75),
    odd: Number(g.odd || 1.65),
    ev: g.ev || '+0.08',
    homeLogo: g.homeLogo || '',
    awayLogo: g.awayLogo || ''
  }));
}

async function fetchRealGames(date){
  const res = await fetch(`/api/games?date=${encodeURIComponent(date || todayISO())}`, { cache:'no-store' });
  if(!res.ok) throw new Error('Erro ao buscar jogos');
  const data = await res.json();
  return normalizeApiGames(data.games || []);
}

async function loadRealGames(){
  const selectedDate = dateInput.value || todayISO();

  gamesList.innerHTML = `<div class="loading-card"><h3>🟢 Prado IA buscando jogos reais</h3><p>Carregando jogos e escudos oficiais da API-Football...</p><div class="progress"><i></i></div></div>`;

  try{
    const games = await fetchRealGames(selectedDate);

    if(games.length){
      currentGames = games.sort((a,b)=>b.prob-a.prob);
    } else {
      currentGames = [];
    }
  } catch(err){
    console.warn(err);
    currentGames = [];
  }

  renderGames(currentGames);
}

function renderGames(games = currentGames){
  const line = lineSelect.value || 'Over +1.5';

  if(!games.length){
    gamesList.innerHTML = `<div class="loading-card"><h3>⚠️ Nenhum jogo encontrado</h3><p>A API-Football não retornou jogos para essa data. Escolha outra data.</p></div>`;
    return;
  }

  const topGames = [...games].sort((a,b)=> b.prob - a.prob).slice(0, Math.max(Number(quantitySelect.value || 4), 3));

  const liveSummary = `<div class="live-summary"><h3>🟡 PRADO IA AO VIVO</h3><p><span id="monitoredCount">${games.length}</span> Jogos Monitorados • <span id="oppCount">${topGames.length}</span> Oportunidades</p></div>`;

  gamesList.innerHTML = liveSummary + topGames.map((game, index) => {
    const score = scoreFor(game, index);
    return `
      <article class="opportunity-card compact-rank ${index === 0 ? 'best' : ''}">
        <div class="opp-topline">
          <div class="rank-wrap"><span class="rank-badge${rankClass(index)}">${index + 1}</span><span class="tag ${index === 2 ? 'green' : ''}">${tagFor(index)}</span></div>
          ${index === 0 ? '<div class="fav-star">★</div>' : '<div class="fav-star muted">☆</div>'}
        </div>

        <div class="match-row">
          <div class="teams-logos official-crests">
            ${crestImg(game.homeLogo, game.home)}
            <span class="versus">x</span>
            ${crestImg(game.awayLogo, game.away)}
          </div>
          <div class="match-copy">
            <div class="opp-match">${escapeHtml(game.home)} x ${escapeHtml(game.away)}</div>
            <div class="opp-meta"><span>${game.flag || '⚽'} ${escapeHtml(game.league)}</span><span>•</span><span>${escapeHtml(game.time)}</span></div>
          </div>
        </div>

        <div class="compact-metrics">
          <div class="metric-box confidence-box"><span>Confiança IA</span><strong>${game.prob}%</strong></div>
          <div class="metric-box"><span>Odd</span><strong>${game.odd.toFixed(2)}</strong></div>
          <div class="metric-box"><span>Score IA</span><strong>${score}</strong></div>
        </div>

        <div class="compact-market">
          <span>⚽ ${escapeHtml(line)}</span>
          <b>${qualityFor(index)}</b>
        </div>
      </article>`;
  }).join('');
}

function getRiskQty(){
  if(selectedRisk === 'leve') return 3;
  if(selectedRisk === 'moderado') return 5;
  return 8;
}

function getRiskLabel(){
  return selectedRisk === 'leve' ? 'Leve' : selectedRisk === 'moderado' ? 'Moderado' : 'Agressivo';
}

function buildTicket(qty){
  const line = lineSelect.value || 'Over +1.5';

  if(!currentGames.length){
    return {
      picks: [],
      oddTotal: 0,
      avgProb: 0,
      risk: getRiskLabel(),
      line
    };
  }

  let gamesBase = [...currentGames];

  if(selectedRisk === 'agressivo'){
    gamesBase = gamesBase.sort((a,b) => b.odd - a.odd);
  } else if(selectedRisk === 'moderado'){
    gamesBase = gamesBase.sort((a,b) => (b.prob + b.odd * 8) - (a.prob + a.odd * 8));
  } else {
    gamesBase = gamesBase.sort((a,b) => b.prob - a.prob);
  }

  const start = selectedRisk === 'leve' ? 0 : selectedRisk === 'moderado' ? 3 : 8;
  let picks = gamesBase.slice(start, start + qty);

  if(picks.length < qty){
    picks = gamesBase.slice(0, qty);
  }

  const oddTotal = picks.reduce((acc, game) => acc * game.odd, 1);
  const avgProb = picks.length ? Math.round(picks.reduce((acc, game) => acc + game.prob, 0) / picks.length) : 0;

  return { picks, oddTotal, avgProb, risk: getRiskLabel(), line };
}

function scanGames(event){
  event?.preventDefault();

  if(!currentGames.length){
    currentTicket = buildTicket(0);
    setTab('scanner');
    renderInlineTicket();
    return;
  }

  const qty = Number(quantitySelect.value || 4);
  currentTicket = buildTicket(qty);
  setTab('scanner');
  renderInlineTicket();
  scannerTicketArea?.scrollIntoView({ behavior:'smooth', block:'start' });
}

function generateTicketFromRisk(event){
  event?.preventDefault();

  const qty = getRiskQty();
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
  setTimeout(done, 1000);
}

function renderInlineTicket(){
  if(!currentTicket || !scannerTicketArea) return;

  const { picks, oddTotal, avgProb, risk, line } = currentTicket;

  if(!picks.length){
    scannerTicketArea.className = 'inline-ticket-card';
    scannerTicketArea.innerHTML = `<div class="inline-ticket-head"><div><span class="eyebrow">Bilhete do Scan</span><h3>Nenhum jogo</h3></div><strong>0.00</strong></div><div class="inline-ticket-meta"><span>0% confiança</span><span>0 jogos</span><span>${escapeHtml(line)}</span></div>`;
    return;
  }

  scannerTicketArea.className = 'inline-ticket-card';
  scannerTicketArea.innerHTML = `<div class="inline-ticket-head"><div><span class="eyebrow">Bilhete do Scan</span><h3>${escapeHtml(risk)}</h3></div><strong>${oddTotal.toFixed(2)}</strong></div><div class="inline-ticket-meta"><span>${avgProb}% confiança</span><span>${picks.length} jogos</span><span>${escapeHtml(line)}</span></div><div class="inline-picks">${picks.map((game,index)=>`<div><b>${index+1}</b><span>${escapeHtml(game.home)} x ${escapeHtml(game.away)}</span><em>${game.odd.toFixed(2)}</em></div>`).join('')}</div>`;
}

function renderTicket(target = ticketArea){
  if(!currentTicket || !target) return;

  const { picks, oddTotal, avgProb, risk, line } = currentTicket;

  if(!picks.length){
    target.className = 'ticket-card';
    target.innerHTML = `<div class="ticket-top"><h3>✅ Bilhete Gerado</h3><span class="verify">IA VERIFICADO</span></div><div class="ticket-metrics"><div class="ticket-metric"><span>Odd Total</span><strong>0.00</strong></div><div class="ticket-metric"><span>Confiança</span><strong>0%</strong></div><div class="ticket-metric"><span>Risco</span><strong>${escapeHtml(risk)}</strong></div><div class="ticket-metric"><span>Jogos</span><strong>0</strong></div></div><div class="loading-card"><h3>⚠️ Nenhum jogo encontrado</h3><p>A API-Football não retornou jogos para essa data.</p></div>`;
    return;
  }

  target.className = 'ticket-card';
  target.innerHTML = `<div class="ticket-top"><h3>✅ Bilhete Gerado</h3><span class="verify">IA VERIFICADO</span></div><div class="ticket-metrics"><div class="ticket-metric"><span>Odd Total</span><strong>${oddTotal.toFixed(2)}</strong></div><div class="ticket-metric"><span>Confiança</span><strong>${avgProb}%</strong></div><div class="ticket-metric"><span>Risco</span><strong>${escapeHtml(risk)}</strong></div><div class="ticket-metric"><span>Jogos</span><strong>${picks.length}</strong></div></div><div class="pick-list">${picks.map((game,index)=>`<div class="pick premium-pick"><b>${index+1}</b><div><strong>${escapeHtml(game.home)} x ${escapeHtml(game.away)}</strong><span>${escapeHtml(line)} • Odd ${game.odd.toFixed(2)} • Score IA ${scoreFor(game,index)}</span></div></div>`).join('')}</div>`;
}

function updateLiveNumbers(){
  const mon = document.getElementById('monitoredCount');
  const opp = document.getElementById('oppCount');
  if(mon) mon.textContent = currentGames.length || 0;
  if(opp) opp.textContent = currentGames.length ? Math.min(currentGames.length, Number(quantitySelect.value || 4)) : 0;
}

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

document.querySelectorAll('.risk-card').forEach(btn => btn.addEventListener('click', () => {
  selectedRisk = btn.dataset.risk;
  document.querySelectorAll('.risk-card').forEach(card => card.classList.toggle('active', card === btn));
}));

marketSelect.addEventListener('change', () => {
  updateLines();
  renderGames(currentGames);
});

lineSelect.addEventListener('change', () => renderGames(currentGames));
quantitySelect.addEventListener('change', () => renderGames(currentGames));

document.getElementById('scanBtn').addEventListener('click', scanGames);
generateTicketBtn.addEventListener('click', generateTicketFromGames);
document.getElementById('ticketScanBtn').addEventListener('click', generateTicketFromRisk);

dateInput.value = todayISO();
dateInput.addEventListener('change', loadRealGames);

updateLines();
renderGames([]);
loadRealGames();

setInterval(updateLiveNumbers, 4500);

window.addEventListener('load', () => {
  const splash = document.getElementById('splashScreen');
  const app = document.querySelector('.app-shell');

  setTimeout(() => {
    splash?.classList.add('hide');
    app?.classList.remove('app-hidden');
  }, 1400);
});
