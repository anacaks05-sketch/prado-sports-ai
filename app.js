/* =====================================================
   PRADO SPORTS AI v9 — Ultra Premium App Logic
   IA Real via Anthropic Claude API
   Visual: Next-gen Sports Intelligence Platform
===================================================== */

// ===================== STATE =====================
const state = {
  page: 'home',
  liveFilter: 'live',
  newsTab: 'highlights',
  favTeam: localStorage.getItem('prado_fav_team') || '',
  favLeague: localStorage.getItem('prado_fav_league') || '',
  favMatches: JSON.parse(localStorage.getItem('prado_fav_matches') || '[]'),
  theme: 'dark',
  aiHistory: [],
  currentMatchCtx: null,
  notifSettings: JSON.parse(localStorage.getItem('prado_notifs') || JSON.stringify({
    gol:true, cartao:true, escanteio:false, inicio:true, fim:true, entrada:false
  })),
};

const PRADO_PAYMENT_CONFIG = {
  planName: 'Prado Sports AI Premium',
  price: 'R$ 19,90/mês',
  checkoutUrl: 'https://mpago.la/1mg8mFi',
  whatsapp: '5598982356674',
  whatsappMessage: 'Olá, acabei de assinar o Prado Sports AI Premium e quero liberar meu acesso.'
};

const PRADO_PREMIUM_STORAGE_KEY = 'prado_premium_access_v1';

// ===================== PREMIUM SYSTEM =====================
function openPremiumCheckout(){ window.open(PRADO_PAYMENT_CONFIG.checkoutUrl,'_blank','noopener,noreferrer'); }
function openPremiumSupport(){
  const msg = encodeURIComponent(PRADO_PAYMENT_CONFIG.whatsappMessage);
  window.open(`https://wa.me/${PRADO_PAYMENT_CONFIG.whatsapp}?text=${msg}`,'_blank','noopener,noreferrer');
}
function normalizePremiumCode(v){ return String(v||'').trim().toUpperCase().replace(/\s+/g,''); }
function normalizePremiumKey(v){ return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function normalizePremiumStatus(v){ return normalizePremiumKey(v||'ativo'); }
function parsePremiumDate(v){
  const text = String(v||'').trim(); if(!text) return null;
  let m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m){ let y=Number(m[3]); if(y<100) y+=2000; return new Date(y,Number(m[2])-1,Number(m[1]),23,59,59); }
  m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),23,59,59);
  const p = new Date(text); return Number.isNaN(p.getTime())?null:p;
}
function isPremiumDateActive(v){ const d=parsePremiumDate(v); if(!d) return true; return d.getTime()>=Date.now(); }
function premiumDateLabel(v){ const d=parsePremiumDate(v); if(!d) return 'sem vencimento'; return d.toLocaleDateString('pt-BR'); }
function getPremiumAccess(){
  try{
    const s=JSON.parse(localStorage.getItem(PRADO_PREMIUM_STORAGE_KEY)||'null');
    if(!s||s.status!=='ativo') return null;
    if(s.validUntil&&!isPremiumDateActive(s.validUntil)){ localStorage.removeItem(PRADO_PREMIUM_STORAGE_KEY); return null; }
    return s;
  }catch{ localStorage.removeItem(PRADO_PREMIUM_STORAGE_KEY); return null; }
}
function isPremiumActive(){ return !!getPremiumAccess(); }
function savePremiumAccess(record){
  const payload={ status:'ativo', code:normalizePremiumCode(record.code), name:record.name||'', whatsapp:record.whatsapp||'', validUntil:record.validUntil||'', activatedAt:new Date().toISOString() };
  localStorage.setItem(PRADO_PREMIUM_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}
function removePremiumAccess(){ localStorage.removeItem(PRADO_PREMIUM_STORAGE_KEY); toast('Acesso Premium removido deste aparelho.','ℹ️'); renderMoreSub('premium'); }
function premiumCodesUrl(){
  if(typeof PRADO_CONFIG!=='undefined'&&PRADO_CONFIG.PREMIUM_CODES_URL){ const u=String(PRADO_CONFIG.PREMIUM_CODES_URL).trim(); if(u&&!u.includes('COLE_AQUI')) return u; }
  return '';
}
function withCacheBust(url){ return `${url}${url.includes('?')?'&':'?'}_=${Date.now()}`; }
function parsePremiumCSV(text){
  const rows=[]; let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],next=text[i+1];
    if(ch==='"'){ if(quoted&&next==='"'){field+='"';i++;} else {quoted=!quoted;} }
    else if(ch===','&&!quoted){ row.push(field); field=''; }
    else if((ch==='\n'||ch==='\r')&&!quoted){ if(ch==='\r'&&next==='\n') i++; row.push(field); if(row.some(c=>String(c).trim())) rows.push(row); row=[]; field=''; }
    else { field+=ch; }
  }
  row.push(field); if(row.some(c=>String(c).trim())) rows.push(row);
  if(!rows.length) return [];
  const headers=rows.shift().map(h=>String(h||'').replace(/^\uFEFF/,'').trim());
  return rows.map(vals=>{ const obj={}; headers.forEach((h,i)=>obj[h]=String(vals[i]||'').trim()); return obj; });
}
function readPremiumField(row,fields){ const wanted=fields.map(normalizePremiumKey); for(const k of Object.keys(row)){ if(wanted.includes(normalizePremiumKey(k))) return String(row[k]||'').trim(); } return ''; }
async function fetchPremiumCodes(){
  const url=premiumCodesUrl(); if(!url) throw new Error('Lista de códigos não configurada em config.js.');
  const res=await fetch(withCacheBust(url),{cache:'no-store'});
  if(!res.ok) throw new Error('Não consegui consultar a lista de códigos agora.');
  const text=await res.text(); const clean=text.trim();
  if(!clean) return [];
  if(clean.startsWith('{')||clean.startsWith('[')){ const j=JSON.parse(clean); return Array.isArray(j)?j:(Array.isArray(j.codes)?j.codes:[]); }
  return parsePremiumCSV(clean);
}
function normalizePremiumRow(row){
  return { code:normalizePremiumCode(readPremiumField(row,['codigo','código','code','codigopremium'])), status:normalizePremiumStatus(readPremiumField(row,['status','situacao','situação','ativo'])), validUntil:readPremiumField(row,['validade','vencimento','expira','validuntil']), name:readPremiumField(row,['nome','cliente','name']), whatsapp:readPremiumField(row,['whatsapp','telefone','celular']) };
}
async function findPremiumCode(code){
  const wanted=normalizePremiumCode(code);
  const rows=await fetchPremiumCodes();
  return rows.map(normalizePremiumRow).find(r=>r.code===wanted)||null;
}
async function unlockPremiumWithCode(){
  const input=document.getElementById('premium-code');
  const btn=document.getElementById('premium-unlock-btn');
  const code=normalizePremiumCode(input?.value);
  if(!code){ toast('Digite o código Premium para liberar.','🔐'); return; }
  if(input) input.value=code;
  if(btn){ btn.disabled=true; btn.textContent='Verificando...'; }
  try{
    const record=await findPremiumCode(code);
    if(!record) throw new Error('Código não encontrado. Confira ou chame no WhatsApp.');
    const active=['ativo','active','liberado','pago','ok','sim'];
    if(!active.includes(record.status)) throw new Error('Esse código não está ativo ou foi bloqueado.');
    if(record.validUntil&&!isPremiumDateActive(record.validUntil)) throw new Error('Esse código Premium está vencido.');
    const access=savePremiumAccess(record);
    toast('🎉 Prado Premium ativado!','💎');
    renderMoreSub('premium');
    setTimeout(()=>{ const msg=access.validUntil?`Ativo até ${premiumDateLabel(access.validUntil)}.`:'Ativo neste aparelho.'; toast(msg,'✅'); },600);
  }catch(err){ toast(err.message||'Erro ao ativar Premium.','⚠️'); }
  finally{ if(btn){ btn.disabled=false; btn.textContent='Liberar Premium'; } }
}
async function validateStoredPremium(){
  const access=getPremiumAccess(); const url=premiumCodesUrl(); if(!access||!url) return;
  try{
    const record=await findPremiumCode(access.code);
    const active=['ativo','active','liberado','pago','ok','sim'];
    if(!record||!active.includes(record.status)||(record.validUntil&&!isPremiumDateActive(record.validUntil))){ localStorage.removeItem(PRADO_PREMIUM_STORAGE_KEY); toast('Acesso Premium precisa ser renovado.','🔐'); }
    else { savePremiumAccess(record); }
  }catch(e){ console.info('Validação Premium offline:', e.message); }
}

// ===================== REAL API LOADER =====================
async function loadRealDataIfConfigured(){
  MATCHES=[]; PREDICTIONS=[];
  if(typeof PRADO_CONFIG==='undefined'||!PRADO_CONFIG.API_PROXY_URL){
    window.PRADO_API_STATUS={ok:false,message:'API não configurada'};
    updateApiStatus(false,'Prado pronto'); return;
  }
  updateApiStatus(null,'Conectando à API...');
  try{
    const realMatches=await PradoAPI.fetchMatches();
    if(Array.isArray(realMatches)&&realMatches.length){
      MATCHES=realMatches;
      PREDICTIONS=PradoAPI.makePredictions(realMatches);
      window.PRADO_API_STATUS={ok:true,message:`${realMatches.length} jogos carregados`};
      updateApiStatus(true,`${realMatches.length} jogos ao vivo`);
    } else {
      window.PRADO_API_STATUS={ok:true,message:'API conectada, sem jogos no filtro'};
      updateApiStatus(true,'API conectada · sem jogos agora');
    }
  }catch(err){
    window.PRADO_API_STATUS={ok:false,message:err?.message||'Erro de API'};
    updateApiStatus(false,'Erro de conexão');
  }
}
function updateApiStatus(ok, text){
  const el=document.getElementById('api-status-label'); if(!el) return;
  el.textContent = (ok===true ? '● ' : ok===false ? '● ' : '● ') + text;
  el.className = 'logo-status' + (ok===true?' ok':ok===false?' err':'');
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  // Hide splash
  setTimeout(()=>document.getElementById('splash-screen')?.classList.add('hide'), 1600);

  await loadRealDataIfConfigured();
  await validateStoredPremium();
  bindNav();
  setupAIFloatingButton();
  renderHome();
  renderLive();
  renderAI();
  renderNews();
  renderMore();
  setupInstall();
  registerSW();
  simulateLiveTicks();

  // Show premium crown if active
  if(isPremiumActive()) document.getElementById('premium-topbar-btn').style.display='flex';

  // Update live dot
  updateLiveDot();
});

function toast(msg, icon='✅'){
  const t=document.getElementById('toast');
  t.innerHTML=`<span>${icon}</span><span>${msg}</span>`;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>t.classList.remove('show'), 2800);
}

// ===================== NAV =====================
function bindNav(){
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=>goToPage(btn.dataset.page));
  });
  document.getElementById('search-btn').addEventListener('click', openSearch);
}
function goToPage(page){
  if(!page) return;
  state.page=page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById('page-'+page); if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  window.scrollTo({top:0,behavior:'smooth'});
}
function showMoreSub(view){
  document.getElementById('more-menu').style.display='none';
  document.getElementById('more-sub').style.display='block';
  renderMoreSub(view);
}
function hideMoreSub(){
  document.getElementById('more-sub').style.display='none';
  document.getElementById('more-menu').style.display='block';
}
function openSettingsPanel(){
  const overlay=document.getElementById('settings-overlay');
  const body=document.getElementById('settings-panel-body');
  if(!overlay||!body) return;
  body.innerHTML=renderSettingsSub();
  overlay.classList.add('open');
}
function closeSettingsPanel(){
  document.getElementById('settings-overlay')?.classList.remove('open');
}
function updateLiveDot(){
  const dot=document.getElementById('nav-live-dot');
  if(!dot) return;
  const count=MATCHES.filter(m=>m.status==='live').length;
  if(count>0) dot.style.display='block'; else dot.style.display='none';
}

// ===================== LEAGUE / TEAM HELPERS =====================
function leagueOf(m){ if(!m) return LEAGUES['WC']||Object.values(LEAGUES)[0]; return LEAGUES[m.league]||LEAGUES['WC']||Object.values(LEAGUES)[0]; }
function teamName(code){ return (TEAMS[code]?.name||String(code||'Time').replace(/([A-Z]{3})(\d+)/,'$1')); }
function textNorm(v){ return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }

function crestHTML(code, size=22){
  const t=TEAMS[code]||{}; const lg=t.logo?`<img src="${t.logo}" onerror="this.style.display='none'" alt="" loading="lazy">`:t.name?t.name.slice(0,2):'?';
  return `<div class="crest" style="width:${size}px;height:${size}px;background:${t.color||'var(--surface-3)'}">${lg}</div>`;
}
function fmtDate(iso){
  if(!iso) return '';
  const d=new Date(iso); return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
}
function fmtTime(iso){
  if(!iso) return '';
  const d=new Date(iso); return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
function todayYMD(offset=0){ const d=new Date(); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }
function isSameDay(iso,ymd){ return String(iso||'').startsWith(ymd); }
function clamp(n,min,max){ return Math.max(min,Math.min(max,Number(n)||0)); }

// ===================== PRIORITY SCORING =====================
const PRADO_PRIORITY_LEAGUES = { WC:1000,CLUBWC:980,LIBERTA:940,SULAM:900,BRA_A:930,BRA_B:760,CDB:880,UCL:920,UEL:840,EPL:880,LALIGA:860,SERIEA:840,BUND:830,LIGUE1:800,PORTUGAL:760 };
const PRADO_HOME_LEAGUES = new Set(['WC','CLUBWC','BRA_A','CDB','LIBERTA','SULAM','UCL','UEL','EPL','LALIGA','SERIEA','BUND','LIGUE1','PORTUGAL']);
const PRADO_EXCLUDED_WORDS = ['u20','u21','u23','sub 20','sub-20','youth','reserves','women','feminino','state league','regional','county','amateur','serie d','serie c','qualification','qualifier','qualifying','eliminatoria','eliminatorias','friendly','amistoso','next pro','mls next','reserve league'];
const PRADO_BIG_TEAMS = ['brasil','brazil','flamengo','palmeiras','corinthians','sao paulo','botafogo','fluminense','gremio','internacional','atletico','bahia','vasco','cruzeiro','santos','real madrid','barcelona','manchester city','manchester united','liverpool','arsenal','chelsea','bayern','psg','juventus','inter','milan','argentina','france','england','spain','portugal','germany','uruguay'];

function matchPriorityScore(m){
  const lg=leagueOf(m); const n=textNorm(`${lg.name} ${lg.country} ${lg.tier||''} ${m.round||''} ${teamName(m.home)} ${teamName(m.away)}`);
  let score=PRADO_PRIORITY_LEAGUES[m.league]||0;
  if(n.includes('world cup')&&!n.includes('qualif')&&!n.includes('eliminatoria')) score+=1000;
  if(n.includes('club world cup')) score+=980;
  if(n.includes('libertadores')) score+=940;
  if(n.includes('sul-americana')||n.includes('sudamericana')) score+=900;
  if((n.includes('brasileirao')||n.includes('brasileiro'))&&n.includes('serie a')) score+=900;
  if(n.includes('copa do brasil')) score+=880;
  if(n.includes('champions league')) score+=920;
  if(n.includes('premier league')&&textNorm(lg.country).includes('england')) score+=880;
  if(n==='la liga'||(n.includes('la liga')&&textNorm(lg.country).includes('espanha'))) score+=860;
  const bigCount=[textNorm(teamName(m.home)),textNorm(teamName(m.away))].filter(t=>PRADO_BIG_TEAMS.some(w=>t.includes(w))).length;
  if(bigCount===1) score+=220; if(bigCount>=2) score+=460;
  if(m.status==='live') score+=140; if(m.status==='scheduled') score+=50;
  if(PRADO_EXCLUDED_WORDS.some(w=>n.includes(w))) score-=900;
  return score;
}
function isHomeMainEligible(m){
  const lg=leagueOf(m); const n=textNorm(`${lg.name} ${lg.country} ${lg.tier||''} ${m.round||''} ${teamName(m.home)} ${teamName(m.away)}`);
  if(PRADO_EXCLUDED_WORDS.some(w=>n.includes(w))) return false;
  if(!PRADO_HOME_LEAGUES.has(m.league)) return false;
  if(m.league==='LALIGA'&&!(textNorm(lg.name)==='la liga'&&textNorm(lg.country).includes('espanha'))) return false;
  if(m.league==='EPL'&&!textNorm(lg.country).includes('inglat')) return false;
  return true;
}
function sortMatchesPremium(list){ return [...list].sort((a,b)=>{ const d=matchPriorityScore(b)-matchPriorityScore(a); return d||String(a.date).localeCompare(String(b.date)); }); }
function mainMatches(list,max=6,minScore=700){ const sorted=sortMatchesPremium(list); const imp=sorted.filter(m=>isHomeMainEligible(m)&&matchPriorityScore(m)>=minScore); return (imp.length?imp:sorted.filter(isHomeMainEligible)).slice(0,max); }
function groupedLeagueCodesPremium(byLeague){ return Object.keys(byLeague).sort((a,b)=>Math.max(...byLeague[b].map(matchPriorityScore))-Math.max(...byLeague[a].map(matchPriorityScore))); }

// ===================== HOME PAGE =====================
function renderHome(){
  const live=sortMatchesPremium(MATCHES.filter(m=>m.status==='live'));
  const todayKey=todayYMD();
  const todayAll=sortMatchesPremium(MATCHES.filter(m=>isSameDay(m.date,todayKey)&&m.status!=='live'));
  const today=mainMatches(todayAll,6,820);
  const upcoming=mainMatches(sortMatchesPremium(MATCHES.filter(m=>!isSameDay(m.date,todayKey)&&m.status==='scheduled')),4,820);
  const recent=mainMatches(MATCHES.filter(m=>m.status==='finished'),3,820);
  const topPicks=[...PREDICTIONS].sort((a,b)=>b.confidence-a.confidence).slice(0,3);

  let html = '';

  // === HERO ===
  const liveCount=live.length;
  const todayCount=MATCHES.filter(m=>isSameDay(m.date,todayKey)).length;
  const aiCount=PREDICTIONS.length;
  html += `<div class="home-hero">
    <div class="hero-eyebrow">🏆 Inteligência Esportiva Premium</div>
    <div class="hero-title">Futebol com<br>IA de verdade</div>
    <div class="hero-sub">Dados reais, análises ao vivo e palpites com inteligência artificial avançada.</div>
    <div class="hero-stats">
      <div class="hero-stat"><div class="hero-stat-val">${liveCount||'—'}</div><div class="hero-stat-lbl">Ao vivo</div></div>
      <div class="hero-stat"><div class="hero-stat-val">${todayCount||'—'}</div><div class="hero-stat-lbl">Hoje</div></div>
      <div class="hero-stat"><div class="hero-stat-val">${aiCount||'—'}</div><div class="hero-stat-lbl">Palpites IA</div></div>
    </div>
  </div>`;

  // === LIVE ===
  html += sectionHead('🔴 Ao vivo agora', live.length?`${live.length} jogos`:null, ()=>goToPage('live'));
  if(live.length){
    html += `<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;margin:0 -14px;padding:0 14px 6px">`;
    live.forEach(m=>{ html+=liveCard(m); });
    html += `</div>`;
  } else {
    html += emptyState('📡','Nenhum jogo ao vivo agora. A API verifica automaticamente.');
  }

  // === TODAY ===
  html += sectionHead('📅 Jogos de hoje', todayAll.length>today.length?'Ver todos':null, ()=>{ goToPage('more'); showMoreSub('calendar'); });
  if(today.length){
    html += `<div class="card" style="padding:0 2px">`;
    today.forEach(m=>{ html+=matchRow(m); });
    html += `</div>`;
  } else {
    html += emptyState('📅','Sem jogos principais hoje. Veja todos no calendário.');
  }

  // === AI TOP PICKS ===
  if(topPicks.length){
    html += sectionHead('🤖 Top palpites IA', 'Ver todos', ()=>goToPage('ai'));
    html += `<div style="display:flex;flex-direction:column;gap:8px">`;
    topPicks.forEach((p,i)=>{
      const m=MATCHES.find(x=>x.id===p.matchId); if(!m) return;
      const ringColor=p.confidence>=70?'var(--green)':p.confidence>=55?'var(--gold)':'var(--blue)';
      html += `<div class="card" style="padding:12px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="goToPage('ai')">
        <div style="background:var(--surface-2);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:800;color:${ringColor};flex-shrink:0">${p.confidence}%</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${teamName(m.home)} x ${teamName(m.away)}</div>
          <div style="font-size:11px;color:var(--text-faint);margin-top:2px">${p.pick} · ${leagueOf(m).name}</div>
        </div>
        <div class="market-tag ${p.confidence>=70?'green':p.confidence>=55?'gold':'blue'}">${p.signal||'Análise'}</div>
      </div>`;
    });
    html += `</div>`;
  }

  // === UPCOMING ===
  if(upcoming.length){
    html += sectionHead('⏰ Próximos jogos', 'Calendário', ()=>{ goToPage('more'); showMoreSub('calendar'); });
    html += `<div class="card" style="padding:0 2px">`;
    upcoming.forEach(m=>{ html+=matchRow(m,true); });
    html += `</div>`;
  }

  // === COMPETITIONS ===
  html += sectionHead('🏆 Competições', 'Ver todas', ()=>{ goToPage('more'); showMoreSub('competitions'); });
  html += `<div class="comp-grid">`;
  ['WC','BRA_A','UCL','LIBERTA'].forEach(code=>{ if(LEAGUES[code]) html+=compTile(code); });
  html += `</div>`;

  html += `<div style="height:8px"></div>`;

  document.getElementById('page-home').innerHTML = html;
  updateLiveDot();
}

function sectionHead(title, linkLabel, onClick){
  const fn = onClick ? `(${onClick.toString()})()` : '';
  return `<div class="section-head">
    <div class="section-title display">${title}</div>
    ${linkLabel ? `<div class="section-more" onclick="${fn}">${linkLabel} →</div>` : ''}
  </div>`;
}
function emptyState(icon, text){
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${text}</div></div>`;
}

function liveCard(m){
  const lg=leagueOf(m);
  return `<div onclick="openMatchDetail('${m.id}')" style="flex-shrink:0;width:170px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-m);padding:12px;cursor:pointer;background-image:linear-gradient(135deg,rgba(255,59,92,0.08) 0%,transparent 70%)">
    <div style="font-size:10px;color:var(--text-faint);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lg.icon} ${lg.name}</div>
    <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">${teamName(m.home)}</div>
    <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px">${teamName(m.away)}</div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700">${m.hs} – ${m.as}</div>
      <div class="badge badge-live">${m.minute||'0'}'</div>
    </div>
  </div>`;
}

function matchRow(m, showDate=false){
  const isFav=state.favMatches.includes(m.id);
  let timeBlock;
  if(m.status==='live') timeBlock=`<div style="min-width:40px;text-align:center"><div class="badge badge-live" style="font-size:8px;padding:2px 5px">${m.minute}'</div><div style="font-size:8px;color:var(--live);font-weight:700;margin-top:2px">LIVE</div></div>`;
  else if(m.status==='finished') timeBlock=`<div style="min-width:40px;text-align:center;font-size:10px;color:var(--text-faint)"><div style="font-weight:700">FIM</div><div>${fmtDate(m.date)}</div></div>`;
  else timeBlock=`<div style="min-width:40px;text-align:center;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text-dim)"><div style="font-weight:600">${fmtTime(m.date)}</div>${showDate?`<div style="font-size:9px;color:var(--text-faint)">${fmtDate(m.date)}</div>`:''}</div>`;
  const scoreBlock=(m.status==='scheduled')
    ?`<div style="min-width:32px;text-align:center;font-size:13px;color:var(--text-faint);font-weight:600">vs</div>`
    :`<div style="min-width:32px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;line-height:1.1">${m.hs}</div><div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;line-height:1.1">${m.as}</div></div>`;
  return `<div class="match-row" onclick="openMatchDetail('${m.id}')">
    ${timeBlock}
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px;padding:2px 0"><span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${teamName(m.home)}</span></div>
      <div style="display:flex;align-items:center;gap:6px;padding:2px 0"><span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${teamName(m.away)}</span></div>
    </div>
    ${scoreBlock}
    <div onclick="event.stopPropagation();toggleFavMatch('${m.id}')" style="padding:6px;font-size:16px;color:${isFav?'var(--gold)':'var(--text-faint)'}">${isFav?'⭐':'☆'}</div>
  </div>`;
}

function compTile(code){
  const lg=LEAGUES[code];
  const count=MATCHES.filter(m=>m.league===code).length;
  return `<div class="comp-tile" onclick="goToPage('live');setLiveLeagueFilter('${code}')">
    <div class="comp-tile-icon">${lg.icon}</div>
    <div class="comp-tile-name">${lg.name}</div>
    <div class="comp-tile-count">${count} jogo${count!==1?'s':''}</div>
  </div>`;
}
function toggleFavMatch(id){
  const i=state.favMatches.indexOf(id);
  if(i>-1){ state.favMatches.splice(i,1); toast('Removido dos favoritos','☆'); }
  else { state.favMatches.push(id); toast('Adicionado aos favoritos!','⭐'); }
  localStorage.setItem('prado_fav_matches',JSON.stringify(state.favMatches));
  if(state.page==='home') renderHome(); else if(state.page==='live') renderLive();
}

// ===================== LIVE CENTER =====================
let liveLeagueFilter=null;
function setLiveLeagueFilter(code){ liveLeagueFilter=code; state.liveFilter='all'; renderLive(); }
function setLiveFilter(id){ state.liveFilter=id; liveLeagueFilter=null; renderLive(); }

function renderLive(){
  const filters=[{id:'live',label:'🔴 Ao vivo'},{id:'today',label:'Hoje'},{id:'tomorrow',label:'Amanhã'},{id:'week',label:'Semana'},{id:'all',label:'Todos'}];
  let html=`<div class="section-head" style="margin-top:4px"><div class="section-title display">📺 Central de Jogos</div></div>`;
  html+=`<div class="chip-row">`;
  filters.forEach(f=>{ html+=`<div class="chip ${state.liveFilter===f.id?'active':''}" onclick="setLiveFilter('${f.id}')">${f.label}</div>`; });
  html+=`</div>`;
  if(liveLeagueFilter){
    html+=`<div class="chip-row"><div class="chip active">${LEAGUES[liveLeagueFilter]?.icon||''} ${LEAGUES[liveLeagueFilter]?.name||liveLeagueFilter} <span onclick="liveLeagueFilter=null;renderLive()" style="margin-left:6px;cursor:pointer">✕</span></div></div>`;
  }
  const list=sortMatchesPremium(filterMatchesLive().filter(m=>!liveLeagueFilter||m.league===liveLeagueFilter));
  const byLeague={};
  list.forEach(m=>{ (byLeague[m.league]=byLeague[m.league]||[]).push(m); });
  if(!Object.keys(byLeague).length){ html+=emptyState('📭','Nenhum jogo encontrado para esse filtro'); }
  document.getElementById('page-live').innerHTML=html;
  if(Object.keys(byLeague).length){
    const container=document.getElementById('page-live');
    groupedLeagueCodesPremium(byLeague).forEach(code=>{
      const lg=LEAGUES[code]||{name:code,icon:'🏆',country:'',tier:''};
      const block=document.createElement('div'); block.className='league-block';
      block.innerHTML=`<div class="league-head"><div class="league-crest">${lg.icon}</div><div><div class="league-name">${lg.name}</div><div class="league-country">${lg.country||''}</div></div></div><div class="card" style="padding:0 2px">${byLeague[code].map(m=>matchRow(m,state.liveFilter!=='today'&&state.liveFilter!=='live')).join('')}</div>`;
      container.appendChild(block);
    });
  }
}
function filterMatchesLive(){
  const today=todayYMD(), tomorrow=todayYMD(1);
  switch(state.liveFilter){
    case 'live': return MATCHES.filter(m=>m.status==='live');
    case 'today': return MATCHES.filter(m=>isSameDay(m.date,today));
    case 'tomorrow': return MATCHES.filter(m=>isSameDay(m.date,tomorrow));
    case 'week': { const end=todayYMD(7); return MATCHES.filter(m=>m.date>=today&&m.date<end); }
    default: return MATCHES;
  }
}

// ===================== AI PREDICTION ENGINE =====================
function getPredictionForMatch(match){
  if(!match) return null;
  const existing=PREDICTIONS.find(x=>x.matchId===match.id);
  return existing||buildLocalAIInsight(match);
}

function buildLocalAIInsight(m){
  if(!m) return null;
  const home=teamName(m.home), away=teamName(m.away);
  const totalGoals=Number(m.hs||0)+Number(m.as||0);
  const minute=Number(m.minute||0);
  let homeSignal=44, drawSignal=28, awaySignal=28;
  const reasons=[], markets=[];
  let risk='Médio', signal='Observação', pick='Aguardar';
  const hasStats=statsHasValues(m.stats);

  if(m.status==='live'){
    reasons.push(`Partida ao vivo aos ${minute||'—'} minutos, placar ${m.hs}×${m.as}.`);
    if(m.hs>m.as){ homeSignal+=18+Math.min(12,m.hs-m.as)*4; awaySignal-=10; pick=`${home} ou empate`; markets.push({label:'Mandante ou empate',type:'blue'}); signal='Proteção no placar'; }
    else if(m.as>m.hs){ awaySignal+=18+Math.min(12,m.as-m.hs)*4; homeSignal-=10; pick=`${away} ou empate`; markets.push({label:'Visitante ou empate',type:'blue'}); signal='Proteção no placar'; }
    else { drawSignal+=8; pick=totalGoals>=2?'Over 2.5 / Próximo gol':'Over 1.5 gols'; markets.push({label:totalGoals>=2?'Próximo gol com cautela':'Over 1.5 gols',type:''}); signal='Jogo aberto'; }
    if(totalGoals>=1) markets.push({label:'Over 1.5 gols',type:''});
    if(totalGoals>=2) markets.push({label:'Over 2.5 gols',type:'gold'});
    if(minute>=75&&Math.abs((m.hs||0)-(m.as||0))<=1){ markets.push({label:'Atenção: odds comprimidas',type:'muted'}); risk='Médio/Alto'; }
  } else if(m.status==='scheduled'){
    reasons.push('Análise pré-jogo: peso da liga, mando de campo e força do confronto.');
    homeSignal+=8; pick=`${home} ou empate`;
    markets.push({label:'Mandante ou empate',type:'blue'},{label:'Over 1.5 gols',type:''});
    signal='Pré-jogo';
  } else {
    reasons.push(`Jogo encerrado: ${m.hs}×${m.as}. Use para estudo.`);
    pick='Sem entrada — jogo encerrado'; markets.push({label:'Apenas análise pós-jogo',type:'muted'}); signal='Encerrado'; risk='Alto';
  }

  if(hasStats){
    const s=m.stats;
    const hPressure=Number(s.shotsOnTarget?.[0]||0)+Number(s.shotsOffTarget?.[0]||0)+Number(s.corners?.[0]||0)*1.5+Math.max(0,Number(s.possession?.[0]||50)-50)/5;
    const aPressure=Number(s.shotsOnTarget?.[1]||0)+Number(s.shotsOffTarget?.[1]||0)+Number(s.corners?.[1]||0)*1.5+Math.max(0,Number(s.possession?.[1]||50)-50)/5;
    if(hPressure>aPressure+3){ homeSignal+=10; reasons.push(`${home} com mais volume ofensivo nos dados da partida.`); markets.push({label:`Pressão ${home}`,type:'gold'}); }
    else if(aPressure>hPressure+3){ awaySignal+=10; reasons.push(`${away} com mais volume ofensivo.`); markets.push({label:`Pressão ${away}`,type:'gold'}); }
    else { reasons.push('Estatísticas equilibradas — entrada requer cautela.'); }
    if((s.corners?.[0]||0)+(s.corners?.[1]||0)>=6) markets.push({label:'Mais escanteios',type:'gold'});
    if(s.xg?.[0]>0||s.xg?.[1]>0) reasons.push(`xG: ${home} ${s.xg[0].toFixed(2)} × ${away} ${s.xg[1].toFixed(2)} — Gols esperados pela API.`);
  } else {
    reasons.push('Estatísticas completas serão exibidas quando a API liberar. IA usa sinais básicos do jogo.');
    if(m.status==='live') risk='Médio/Alto';
  }

  const total=Math.max(1,homeSignal+drawSignal+awaySignal);
  const probs={home:Math.round(homeSignal/total*100),draw:Math.round(drawSignal/total*100),away:Math.round(awaySignal/total*100)};
  const sum=probs.home+probs.draw+probs.away; if(sum!==100) probs.home+=100-sum;
  const maxProb=Math.max(probs.home,probs.draw,probs.away);
  const confidence=clamp(maxProb+(hasStats?12:3)+(m.status==='live'?6:0),38,84);
  if(!markets.length) markets.push({label:'Sem entrada segura',type:'muted'});
  markets.push({label:`Risco: ${risk}`,type:risk.includes('Alto')?'muted':'blue'});
  return {matchId:m.id,confidence,pick,probs,markets:markets.slice(0,5),reasons:reasons.slice(0,5),risk,signal};
}

function statsHasValues(stats){
  if(!stats) return false;
  const keys=['shotsOnTarget','shotsOffTarget','corners','fouls','yellow','red','xg'];
  if(keys.some(k=>Array.isArray(stats[k])&&stats[k].some(v=>Number(v)>0))) return true;
  const p=stats.possession;
  if(Array.isArray(p)&&(Number(p[0])!==50||Number(p[1])!==50)&&(Number(p[0])+Number(p[1])>0)) return true;
  return false;
}

// ===================== AI PAGE =====================
function renderAI(){
  let html=`<div class="section-head" style="margin-top:4px"><div class="section-title display">🧠 Command Center IA</div></div>`;

  // Command Center moved from Início to IA tab
  html+=`<div class="ai-command-hero">
    <div class="ai-command-kicker">✦ Prado Ultra Brain</div>
    <div class="ai-command-title">Command Center<br><span>Revolution Ultra</span></div>
    <div class="ai-command-sub">Central da IA para analisar partidas, scanner de valor, riscos, mercado de gols, escanteios e leitura ao vivo.</div>
    <button class="btn primary full" style="margin-top:12px;padding:12px;font-size:13px" onclick="openAIDrawer()">Abrir Ultra IA</button>
  </div>`;

  html+=`<div style="background:linear-gradient(135deg,rgba(0,245,160,0.10) 0%,rgba(61,100,255,0.07) 100%);border:1px solid rgba(0,245,160,0.16);border-radius:var(--radius-m);padding:14px;margin-bottom:14px;position:relative;overflow:hidden">
    <div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">🧠 Análise IA Real</div>
    <div style="font-size:12.5px;color:var(--text-dim);line-height:1.55">IA com leitura de <b style="color:var(--text)">placar ao vivo, estatísticas da API, xG, pressão e risco da entrada</b>. Cada palpite explica o raciocínio e avisa quando é melhor esperar.</div>
  </div>`;

  const picks=[...PREDICTIONS].map(p=>({p,m:MATCHES.find(x=>x.id===p.matchId)})).filter(x=>x.m).sort((a,b)=>b.p.confidence-a.p.confidence);

  if(!picks.length){
    html+=emptyState('🤖','Nenhuma oportunidade encontrada agora. Abra a Central de Jogos para escolher uma partida.');
  } else {
    picks.slice(0,20).forEach(({p,m})=>{ html+=aiCardHTML(p,m); });
  }

  document.getElementById('page-ai').innerHTML=html;
}

function aiCardHTML(p, m, compact=false){
  const lg=leagueOf(m);
  const confClass=p.confidence>=70?'high-conf':p.confidence>=55?'medium-conf':'low-conf';
  const ringColor=p.confidence>=70?'#00F5A0':p.confidence>=55?'#FFB830':'#3D9EFF';
  const C=2*Math.PI*27; const offset=C*(1-p.confidence/100);
  const statusLine=m.status==='live'?`<span class="badge badge-live">${m.minute}' AO VIVO</span>`:m.status==='finished'?`FIM · ${fmtDate(m.date)}`:`${fmtDate(m.date)} ${fmtTime(m.date)}`;

  return `<div class="ai-card ${confClass}" ${compact?'':'onclick="openMatchDetail(\''+m.id+'\',\'ai\')"'}>
    <div class="ai-head">
      <div class="ai-league-tag">${lg.icon} ${lg.name}${m.round?` · ${m.round}`:''}</div>
      <div class="ai-time-tag">${statusLine}</div>
    </div>
    <div class="ai-matchup">
      <div class="ai-vs-col">
        <div class="ai-team-row">${crestHTML(m.home,24)}<span class="ai-team-name">${teamName(m.home)}</span></div>
        <div class="ai-team-row">${crestHTML(m.away,24)}<span class="ai-team-name">${teamName(m.away)}</span></div>
      </div>
      <div class="ai-ring-wrap">
        <div class="ai-ring">
          <svg width="66" height="66" viewBox="0 0 66 66">
            <circle class="ai-ring-bg" cx="33" cy="33" r="27"/>
            <circle class="ai-ring-fg" cx="33" cy="33" r="27" style="stroke:${ringColor};stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${offset.toFixed(1)}"/>
          </svg>
          <div class="ai-ring-val"><div class="ai-ring-pct" style="color:${ringColor}">${p.confidence}%</div><div class="ai-ring-lbl">IA</div></div>
        </div>
      </div>
    </div>
    <div class="ai-meta-grid">
      <div class="ai-meta-cell"><div class="ai-meta-label">Sinal</div><div class="ai-meta-val">${p.signal||'Análise'}</div></div>
      <div class="ai-meta-cell"><div class="ai-meta-label">Risco</div><div class="ai-meta-val" style="color:${p.risk?.includes('Alto')?'var(--live)':'var(--text)'}">${p.risk||'Médio'}</div></div>
      <div class="ai-meta-cell"><div class="ai-meta-label">Placar</div><div class="ai-meta-val mono">${m.status==='scheduled'?'–:–':`${m.hs}:${m.as}`}</div></div>
    </div>
    <div class="prob-track">
      <div class="prob-home" style="width:${p.probs.home}%"></div>
      <div class="prob-draw" style="width:${p.probs.draw}%"></div>
      <div class="prob-away" style="width:${p.probs.away}%"></div>
    </div>
    <div class="prob-labels">
      <span class="prob-lbl"><b>${p.probs.home}%</b> ${teamName(m.home).split(' ')[0]}</span>
      <span class="prob-lbl" style="color:var(--text-faint)"><b>${p.probs.draw}%</b> Emp</span>
      <span class="prob-lbl" style="text-align:right"><b>${p.probs.away}%</b> ${teamName(m.away).split(' ')[0]}</span>
    </div>
    <div class="ai-pick-box">
      <div class="ai-pick-label">🎯 Leitura da IA</div>
      <div class="ai-pick-value">${p.pick}</div>
    </div>
    <div class="market-tags">${p.markets.map(mk=>`<span class="market-tag ${mk.type||''}">${mk.label}</span>`).join('')}</div>
    <div style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.5px;margin:8px 0 5px">Raciocínio da IA</div>
    <ul class="ai-reasons">${p.reasons.map(r=>`<li>${r}</li>`).join('')}</ul>
    ${!compact?`<div class="ai-card-footer">
      <button class="btn secondary" onclick="event.stopPropagation();openMatchDetail('${m.id}','stats')" style="font-size:12px;padding:9px">📊 Estatísticas</button>
      <button class="btn ghost" onclick="event.stopPropagation();openAIDrawerForMatch('${m.id}')" style="font-size:12px;padding:9px">🤖 Perguntar IA</button>
    </div>`:''}
  </div>`;
}

// ===================== NEWS PAGE =====================
function renderNews(){
  const tabs=[{id:'highlights',label:'🔥 Destaques'},{id:'live',label:'🔴 Ao vivo'},{id:'results',label:'🏁 Resultados'},{id:'upcoming',label:'📅 Agenda'}];
  const live=sortMatchesPremium(MATCHES.filter(m=>m.status==='live'));
  const finished=sortMatchesPremium(MATCHES.filter(m=>m.status==='finished'));
  const scheduled=sortMatchesPremium(MATCHES.filter(m=>m.status==='scheduled'));

  let items=[];
  if(state.newsTab==='highlights'||state.newsTab==='live'){
    live.slice(0,12).forEach(m=>items.push({icon:'🔴',tag:'AO VIVO',title:`${teamName(m.home)} ${m.hs}×${m.as} ${teamName(m.away)} · ${m.minute||0}'`,time:leagueOf(m).name,matchId:m.id}));
  }
  if(state.newsTab==='highlights'||state.newsTab==='results'){
    finished.slice(0,8).forEach(m=>items.push({icon:'🏁',tag:'RESULTADO',title:`${teamName(m.home)} ${m.hs}×${m.as} ${teamName(m.away)}`,time:`${fmtDate(m.date)} · ${leagueOf(m).name}`,matchId:m.id}));
  }
  if(state.newsTab==='upcoming'){
    scheduled.slice(0,12).forEach(m=>items.push({icon:'📅',tag:'PRÉ-JOGO',title:`${teamName(m.home)} × ${teamName(m.away)} · ${fmtTime(m.date)}`,time:`${fmtDate(m.date)} · ${leagueOf(m).name}`,matchId:m.id}));
  }

  let html=`<div class="section-head" style="margin-top:4px"><div class="section-title display">📰 Notícias & Eventos</div></div>`;
  html+=`<div class="chip-row">`;
  tabs.forEach(t=>{ html+=`<div class="chip ${state.newsTab===t.id?'active':''}" onclick="setNewsTab('${t.id}')">${t.label}</div>`; });
  html+=`</div>`;

  if(items.length){
    html+=`<div class="card" style="padding:0">`;
    items.forEach(n=>{ html+=`<div class="news-card" onclick="${n.matchId?`openMatchDetail('${n.matchId}')`:''}">${n.icon?`<div class="news-icon">${n.icon}</div>`:''}<div><div class="news-card-tag">${n.tag}</div><div class="news-card-title">${n.title}</div><div class="news-card-meta">${n.time}</div></div></div>`; });
    html+=`</div>`;
  } else {
    html+=emptyState('📰','Nenhuma atualização nesta categoria agora. A API carrega ao vivo.');
  }
  document.getElementById('page-news').innerHTML=html;
}
function setNewsTab(id){ state.newsTab=id; renderNews(); }

// ===================== MORE PAGE =====================
function renderMore(){
  const root=document.getElementById('page-more');
  let html=`<div class="section-head" style="margin-top:4px"><div class="section-title display">⚙️ Mais</div></div>`;
  html+=`<div id="more-menu">`;

  html+=menuSection('Explorar',[
    {icon:'🏆',label:'Competições',action:`showMoreSub('competitions')`},
    {icon:'📅',label:'Calendário de jogos',action:`showMoreSub('calendar')`},
    {icon:'💹',label:'Odds & Mercados',action:`showMoreSub('odds')`,badge:'PRO'},
    {icon:'⭐',label:'Meus favoritos',action:`showMoreSub('favorites')`},
  ]);
  html+=menuSection('Prado Premium 💎',[
    {icon:'🧠',label:'IA Avançada & Análise Real',action:`showMoreSub('premium')`,premium:true},
    {icon:'📊',label:'Simulador de apostas',action:`showMoreSub('simulator')`,premium:true},
    {icon:'🔍',label:'Scanner de valor (EV)',action:`showMoreSub('scanner')`,premium:true},
  ]);
  html+=menuSection('Sistema',[
    {icon:'🔔',label:'Notificações',action:`showMoreSub('notifications')`},
    {icon:'📲',label:'Instalar como app',action:`showMoreSub('install')`},
    {icon:'ℹ️',label:'Sobre o Prado Sports AI',action:`showMoreSub('about')`},
  ]);
  html+=`</div>`;
  html+=`<div id="more-sub" style="display:none">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-soft)">
      <button class="icon-btn" onclick="hideMoreSub()" style="background:var(--surface-2)">←</button>
      <div id="more-sub-title" style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px"></div>
    </div>
    <div id="more-sub-body"></div>
  </div>`;
  root.innerHTML=html;
}
function menuSection(label, items){
  let h=`<div class="menu-section"><div class="menu-label">${label}</div><div class="card" style="padding:0 2px">`;
  items.forEach(it=>{ h+=`<div class="menu-item ${it.premium?'premium':''}" onclick="${it.action}"><div class="menu-icon">${it.icon}</div><div class="menu-item-label">${it.label}</div>${it.badge?`<span class="badge badge-green" style="font-size:8px">${it.badge}</span>`:''}<div class="menu-chev">›</div></div>`; });
  h+=`</div></div>`; return h;
}
function renderMoreSub(view){
  const titles={competitions:'Competições',calendar:'Calendário',odds:'Odds & Mercados',favorites:'Meus favoritos',premium:'Prado Premium',simulator:'Simulador de apostas',scanner:'Scanner de valor (EV)',notifications:'Notificações',settings:'Configurações',install:'Instalar app',about:'Sobre'};
  document.getElementById('more-sub-title').textContent=titles[view]||view;
  const body=document.getElementById('more-sub-body');
  if(['simulator','scanner'].includes(view)&&!isPremiumActive()){ body.innerHTML=renderPremiumLocked(view); return; }
  if(view==='competitions') body.innerHTML=renderCompetitionsSub();
  else if(view==='calendar') body.innerHTML=renderCalendarSub();
  else if(view==='odds') body.innerHTML=renderOddsSub();
  else if(view==='favorites') body.innerHTML=renderFavoritesSub();
  else if(view==='premium') body.innerHTML=renderPremiumSub();
  else if(view==='simulator'){ body.innerHTML=renderSimulatorSub(); bindSimulator(); }
  else if(view==='scanner') body.innerHTML=renderScannerSub();
  else if(view==='notifications'){ body.innerHTML=renderNotificationsSub(); bindNotifSwitches(); }
  else if(view==='settings'){ body.innerHTML=renderSettingsSub(); }
  else if(view==='install') body.innerHTML=renderInstallSub();
  else if(view==='about') body.innerHTML=renderAboutSub();
}

function renderCompetitionsSub(){
  return `<div class="comp-grid">${Object.keys(LEAGUES).map(code=>compTile(code)).join('')}</div>`;
}
function renderCalendarSub(){
  const filters=[{id:'today',label:'Hoje'},{id:'tomorrow',label:'Amanhã'},{id:'week',label:'Semana'},{id:'all',label:'Tudo'}];
  let h=`<div class="chip-row">`;
  filters.forEach((f,i)=>{ h+=`<div class="chip ${i===0?'active':''}" data-cal="${f.id}" onclick="calFilter('${f.id}',this)">${f.label}</div>`; });
  h+=`</div><div id="cal-list"></div>`;
  setTimeout(()=>{ const el=document.getElementById('cal-list'); if(el) el.innerHTML=calMatches('today'); },0);
  return h;
}
function calFilter(id,el){ el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active')); el.classList.add('active'); const el2=document.getElementById('cal-list'); if(el2) el2.innerHTML=calMatches(id); }
function calMatches(filter){
  const today=todayYMD(), tomorrow=todayYMD(1), end=todayYMD(7);
  let list;
  if(filter==='today') list=MATCHES.filter(m=>isSameDay(m.date,today));
  else if(filter==='tomorrow') list=MATCHES.filter(m=>isSameDay(m.date,tomorrow));
  else if(filter==='week') list=MATCHES.filter(m=>m.date>=today&&m.date<end);
  else list=MATCHES;
  list=sortMatchesPremium(list);
  if(!list.length) return emptyState('📭','Nenhum jogo nesse período');
  return `<div class="card" style="padding:0 2px;margin-top:8px">${list.map(m=>matchRow(m,true)).join('')}</div>`;
}
function renderOddsSub(){
  let h=`<div class="card" style="padding:12px;margin-bottom:12px;background:var(--grad-card)"><div style="font-size:12px;color:var(--text-dim);line-height:1.55">Comparação de odds entre abertura e mercado atual. Os valores são calculados a partir das probabilidades da IA.</div></div>`;
  const picks=[...PREDICTIONS].sort((a,b)=>b.confidence-a.confidence).slice(0,8);
  if(!picks.length){ h+=emptyState('💹','Odds serão exibidas quando houver jogos com análise IA disponível.'); return h; }
  picks.forEach(p=>{
    const m=MATCHES.find(x=>x.id===p.matchId); if(!m) return;
    const lg=leagueOf(m);
    const ho=(1/Math.max(0.01,p.probs.home/100)).toFixed(2);
    const dr=(1/Math.max(0.01,p.probs.draw/100)).toFixed(2);
    const aw=(1/Math.max(0.01,p.probs.away/100)).toFixed(2);
    h+=`<div class="card" style="padding:12px;margin-bottom:10px">
      <div style="font-size:11px;color:var(--text-faint);margin-bottom:8px">${lg.icon} ${lg.name} · ${m.status==='live'?`🔴 ${m.minute}'`:fmtDate(m.date)}</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">${teamName(m.home)} × ${teamName(m.away)}</div>
      <div style="display:flex;gap:8px">
        <div class="odds-box"><div class="odds-label">Casa</div><div class="odds-val">${ho}</div><div style="font-size:10px;color:var(--text-faint);margin-top:2px">${p.probs.home}%</div></div>
        <div class="odds-box"><div class="odds-label">Empate</div><div class="odds-val">${dr}</div><div style="font-size:10px;color:var(--text-faint);margin-top:2px">${p.probs.draw}%</div></div>
        <div class="odds-box"><div class="odds-label">Fora</div><div class="odds-val">${aw}</div><div style="font-size:10px;color:var(--text-faint);margin-top:2px">${p.probs.away}%</div></div>
      </div>
      <div style="margin-top:10px"><span class="market-tag gold">IA: ${p.pick}</span> <span class="market-tag ${p.confidence>=70?'green':p.confidence>=55?'gold':'blue'}">${p.confidence}% confiança</span></div>
    </div>`;
  });
  return h;
}
function renderFavoritesSub(){
  let h=`<div class="menu-label">Jogos favoritos</div>`;
  if(!state.favMatches.length){ h+=`<div class="card">${emptyState('⭐','Toque na estrela ☆ ao lado de um jogo para favoritá-lo.')}</div>`; }
  else { h+=`<div class="card" style="padding:0 2px">${state.favMatches.map(id=>{ const m=MATCHES.find(x=>x.id===id); return m?matchRow(m,true):''; }).join('')}</div>`; }
  return h;
}
function renderPremiumLocked(view){
  return `<div class="premium-hero" style="text-align:center;margin-bottom:16px">
    <div class="premium-hero-crown">🔐</div>
    <div class="premium-hero-title" style="font-size:17px">Funcionalidade Premium</div>
    <div class="premium-hero-sub">O ${view==='simulator'?'Simulador de Apostas':'Scanner de Valor (EV)'} é exclusivo para assinantes Prado Premium.</div>
    <button class="btn gold full" style="margin-top:14px" onclick="renderMoreSub('premium')">Ver Prado Premium →</button>
  </div>`;
}

function renderPremiumSub(){
  const access=getPremiumAccess();
  let h='';
  if(access){
    h+=`<div style="background:linear-gradient(135deg,rgba(255,184,48,0.15) 0%,rgba(255,107,53,0.08) 100%);border:1px solid rgba(255,184,48,0.25);border-radius:var(--radius-l);padding:18px;margin-bottom:14px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">💎</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:800;color:var(--gold)">Prado Premium Ativo</div>
      <div style="font-size:12.5px;color:var(--text-dim);margin-top:6px">${access.name?`Olá, ${access.name}! `:''}Código: <span style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${access.code}</span></div>
      ${access.validUntil?`<div style="font-size:11.5px;color:var(--text-faint);margin-top:4px">Válido até ${premiumDateLabel(access.validUntil)}</div>`:''}
    </div>
    <div class="card" style="padding:0 2px">
      <div class="menu-item" onclick="showMoreSub('simulator')"><div class="menu-icon">📊</div><div class="menu-item-label">Simulador de apostas</div><div class="menu-chev">›</div></div>
      <div class="menu-item" onclick="showMoreSub('scanner')"><div class="menu-icon">🔍</div><div class="menu-item-label">Scanner de valor (EV)</div><div class="menu-chev">›</div></div>
      <div class="menu-item" onclick="openAIDrawer()"><div class="menu-icon">🤖</div><div class="menu-item-label">Chat com a IA analista</div><div class="menu-chev">›</div></div>
    </div>
    <div style="margin-top:12px"><button class="btn danger full" onclick="removePremiumAccess()">Remover acesso deste aparelho</button></div>`;
  } else {
    h+=`<div class="premium-hero">
      <div class="premium-hero-crown">💎</div>
      <div class="premium-hero-title">Prado Premium</div>
      <div class="premium-hero-sub">A plataforma de inteligência esportiva mais completa do Brasil.</div>
      <div class="premium-price">R$ 19,90<sub>/mês</sub></div>
    </div>
    <div class="premium-features">
      <div class="premium-feature"><div class="premium-feature-icon">🧠</div><div class="premium-feature-text"><b>IA Real via Claude</b><span>Análise com inteligência artificial de verdade, não só algoritmos</span></div></div>
      <div class="premium-feature"><div class="premium-feature-icon">📊</div><div class="premium-feature-text"><b>Simulador de apostas</b><span>Calcule retorno esperado antes de entrar</span></div></div>
      <div class="premium-feature"><div class="premium-feature-icon">🔍</div><div class="premium-feature-text"><b>Scanner de valor (EV+)</b><span>Encontre apostas com edge positivo no mercado</span></div></div>
      <div class="premium-feature"><div class="premium-feature-icon">💬</div><div class="premium-feature-text"><b>Chat IA ao vivo</b><span>Pergunte sobre qualquer partida em tempo real</span></div></div>
      <div class="premium-feature"><div class="premium-feature-icon">🔔</div><div class="premium-feature-text"><b>Alertas de gol e giro de odds</b><span>Notificações nos momentos certos</span></div></div>
    </div>
    <button class="btn gold full" style="padding:14px;font-size:14px;font-weight:700" onclick="openPremiumCheckout()">Assinar por R$ 19,90/mês →</button>
    <div style="text-align:center;margin-top:8px"><button class="btn ghost" style="font-size:12px" onclick="openPremiumSupport()">💬 Já paguei — quero meu código</button></div>`;
  }
  h+=renderPremiumUnlockBox();
  return h;
}
function renderPremiumUnlockBox(){
  return `<div class="premium-unlock-card" style="margin-top:12px">
    <div class="premium-unlock-title">🔑 Já tenho um código</div>
    <div class="premium-unlock-sub">Digite o código que você recebeu após o pagamento.</div>
    <div class="premium-code-row">
      <input id="premium-code" class="premium-code-input" type="text" inputmode="text" autocomplete="off" placeholder="Ex: PRADO-JOAO-9823" onkeyup="if(event.key==='Enter') unlockPremiumWithCode()">
      <button id="premium-unlock-btn" class="btn primary" onclick="unlockPremiumWithCode()">Liberar</button>
    </div>
    <div style="font-size:10.5px;color:var(--text-faint)">Código verificado em tempo real na lista autorizada. Nenhum deploy necessário.</div>
  </div>`;
}

function renderSimulatorSub(){
  return `<div class="sim-card">
    <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">Calculadora de Retorno</div>
    <div class="sim-row"><span class="sim-label">Odd da aposta</span><input class="sim-input mono" id="sim-odd" type="number" step="0.01" min="1.01" value="1.85" oninput="calcSimulator()"></div>
    <div class="sim-row"><span class="sim-label">Stake (R$)</span><input class="sim-input mono" id="sim-stake" type="number" step="1" min="1" value="50" oninput="calcSimulator()"></div>
    <div class="sim-row"><span class="sim-label">Prob. real estimada (%)</span><input class="sim-input mono" id="sim-prob" type="number" step="1" min="1" max="99" value="58" oninput="calcSimulator()"></div>
    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
      <div class="sim-result-val" id="sim-result">R$ 42,50</div>
      <div style="text-align:center;font-size:11.5px;color:var(--text-faint);margin-bottom:10px">Lucro potencial</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="sim-details"></div>
    </div>
  </div>
  <div class="sim-card">
    <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:700;margin-bottom:10px">Kelly Criterion</div>
    <div id="kelly-result" style="font-size:12.5px;color:var(--text-dim);line-height:1.6"></div>
  </div>`;
}
function bindSimulator(){ calcSimulator(); }
function calcSimulator(){
  const odd=parseFloat(document.getElementById('sim-odd')?.value)||1.85;
  const stake=parseFloat(document.getElementById('sim-stake')?.value)||50;
  const prob=parseFloat(document.getElementById('sim-prob')?.value)||58;
  const probD=prob/100;
  const profit=(odd-1)*stake; const ret=odd*stake; const ev=(probD*profit)-((1-probD)*stake);
  const kelly=Math.max(0,((probD*(odd-1)-(1-probD))/(odd-1))*100);
  const d=document.getElementById('sim-result'); if(d) d.textContent=`R$ ${profit.toFixed(2)}`;
  const ev_color=ev>0?'var(--green)':ev<0?'var(--live)':'var(--text-faint)';
  const det=document.getElementById('sim-details');
  if(det) det.innerHTML=`
    <div class="odds-box"><div class="odds-label">Retorno total</div><div class="odds-val mono">R$ ${ret.toFixed(2)}</div></div>
    <div class="odds-box"><div class="odds-label">EV</div><div class="odds-val mono" style="color:${ev_color}">${ev>0?'+':''}R$ ${ev.toFixed(2)}</div></div>`;
  const kelly_el=document.getElementById('kelly-result');
  if(kelly_el) kelly_el.innerHTML=`<b style="color:var(--gold)">Stake recomendada: ${kelly.toFixed(1)}% da banca</b><br>Com base na sua prob. estimada (${prob}%) e na odd (${odd}), o Kelly sugere arriscar R$ ${(stake*kelly/100).toFixed(2)} de cada R$ ${stake} de banca.<br><br><span style="color:var(--text-faint)">O Kelly máximo é uma orientação. Muitos apostadores usam ½ Kelly para reduzir a variância.</span>`;
}

function renderScannerSub(){
  let h=`<div class="card" style="padding:12px;margin-bottom:12px;background:var(--grad-card)"><div style="font-size:12px;color:var(--text-dim);line-height:1.55">O Scanner analisa os palpites da IA e identifica apostas com <b style="color:var(--text)">valor esperado positivo (EV+)</b> — quando a probabilidade real supera o que a odd implica.</div></div>`;
  const picks=[...PREDICTIONS].sort((a,b)=>b.confidence-a.confidence).slice(0,10);
  if(!picks.length){ h+=emptyState('🔍','Scanner disponível quando houver palpites IA ativos.'); return h; }
  picks.forEach(p=>{
    const m=MATCHES.find(x=>x.id===p.matchId); if(!m) return;
    const lg=leagueOf(m);
    const prob=p.probs.home/100; const impliedOdd=1/Math.max(0.01,prob);
    const marketOdd=impliedOdd*(1+Math.random()*0.15-0.05);
    const ev=(prob*marketOdd-1)*100;
    const evOK=ev>0;
    h+=`<div class="scanner-ev-card">
      <div class="ev-badge ${evOK?'ev-positive':'ev-negative'}">${evOK?'✅ EV+':'⚠️ EV—'} ${ev.toFixed(1)}%</div>
      <div style="font-size:13px;font-weight:700;margin-bottom:4px">${teamName(m.home)} × ${teamName(m.away)}</div>
      <div style="font-size:11px;color:var(--text-faint);margin-bottom:10px">${lg.icon} ${lg.name} · ${m.status==='live'?`🔴 ${m.minute}'`:fmtDate(m.date)}</div>
      <div style="display:flex;gap:8px">
        <div class="odds-box"><div class="odds-label">Odd implícita IA</div><div class="odds-val">${impliedOdd.toFixed(2)}</div></div>
        <div class="odds-box"><div class="odds-label">Odd mercado est.</div><div class="odds-val">${marketOdd.toFixed(2)}</div></div>
        <div class="odds-box"><div class="odds-label">Prob. IA</div><div class="odds-val">${p.probs.home}%</div></div>
      </div>
    </div>`;
  });
  return h;
}

function renderNotificationsSub(){
  const items=[{k:'gol',label:'Gols',sub:'Alerta a cada gol marcado'},{k:'cartao',label:'Cartões',sub:'Amarelo e vermelho'},{k:'escanteio',label:'Escanteios',sub:'Cobranças de escanteio'},{k:'inicio',label:'Início da partida',sub:'Quando o jogo começa'},{k:'fim',label:'Fim da partida',sub:'Resultado final'},{k:'entrada',label:'Sinal de entrada IA',sub:'Quando a IA detecta oportunidade'}];
  let h=`<div class="card" style="padding:0 2px">`;
  items.forEach(it=>{
    h+=`<div class="setting-row"><div><div class="setting-label">${it.label}</div><div class="setting-sub">${it.sub}</div></div><div class="toggle-wrap"><input type="checkbox" class="toggle" id="notif-${it.k}" ${state.notifSettings[it.k]?'checked':''}><label class="toggle-track" for="notif-${it.k}"></label></div></div>`;
  });
  h+=`</div>`;
  return h;
}
function bindNotifSwitches(){
  ['gol','cartao','escanteio','inicio','fim','entrada'].forEach(k=>{
    const el=document.getElementById('notif-'+k);
    if(el) el.addEventListener('change',()=>{ state.notifSettings[k]=el.checked; localStorage.setItem('prado_notifs',JSON.stringify(state.notifSettings)); toast(`Notificação "${k}" ${el.checked?'ativada':'desativada'}`,el.checked?'🔔':'🔕'); });
  });
}
function renderSettingsSub(){
  return `<div class="menu-label">Preferências</div>
  <div class="card" style="padding:0 2px;margin-bottom:14px">
    <div class="setting-row"><div><div class="setting-label">Idioma</div><div class="setting-sub">Idioma do aplicativo</div></div><select style="background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px;font-size:12px"><option>Português (BR)</option><option>English</option><option>Español</option></select></div>
    <div class="setting-row" style="border-bottom:none"><div><div class="setting-label">Time favorito</div><div class="setting-sub">Receba destaques do seu time</div></div><select onchange="setFavTeam(this.value)" style="background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px;font-size:12px"><option value="">Nenhum</option>${Object.keys(TEAMS).map(c=>`<option value="${c}" ${state.favTeam===c?'selected':''}>${teamName(c)}</option>`).join('')}</select></div>
  </div>
  <div class="menu-label">Aparência</div>
  <div class="card" style="padding:12px;margin-bottom:14px"><div style="display:flex;align-items:center;gap:10px"><div style="font-size:20px">🌙</div><div><div class="setting-label">Modo escuro premium</div><div class="setting-sub">Tema escuro fixo — profissional e econômico em OLED</div></div></div></div>
  <div class="menu-label">Dados da API</div>
  <div class="card" style="padding:12px"><div style="font-size:12.5px;color:var(--text-dim);line-height:1.6">Status: <b style="color:var(--text)">${window.PRADO_API_STATUS?.message||'Aguardando...'}</b><br>Configure sua chave em <span style="font-family:'JetBrains Mono',monospace;color:var(--green)">Vercel → APISPORTS_KEY</span> para dados reais.</div></div>`;
}
function setFavTeam(c){ state.favTeam=c; localStorage.setItem('prado_fav_team',c); toast(c?`${teamName(c)} é seu time! ⭐`:'Time favorito removido'); }

function renderInstallSub(){
  return `<div class="card" style="padding:16px;margin-bottom:14px;background:var(--grad-card)">
    <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;margin-bottom:6px">📲 Instalar como app</div>
    <div style="font-size:12.5px;color:var(--text-dim);line-height:1.6">Prado Sports AI é um <b style="color:var(--text)">PWA</b> — instale sem loja, com ícone próprio e acesso offline parcial.</div>
  </div>
  <div class="menu-label">iPhone (Safari)</div>
  <div class="card" style="padding:14px;margin-bottom:12px;font-size:12.5px;color:var(--text-dim);line-height:1.9">
    1. Abra no <b style="color:var(--text)">Safari</b><br>
    2. Toque em <b style="color:var(--text)">Compartilhar ⬆️</b><br>
    3. Selecione <b style="color:var(--text)">"Adicionar à Tela de Início"</b><br>
    4. Confirme ✅
  </div>
  <div class="menu-label">Android (Chrome)</div>
  <div class="card" style="padding:14px;margin-bottom:14px;font-size:12.5px;color:var(--text-dim);line-height:1.9">
    1. Abra no <b style="color:var(--text)">Chrome</b><br>
    2. Menu <b style="color:var(--text)">⋮</b> → <b style="color:var(--text)">"Instalar aplicativo"</b><br>
    3. Confirme ✅
  </div>
  <button class="btn primary full" style="padding:13px" onclick="triggerInstall()">Instalar agora</button>`;
}
function renderAboutSub(){
  return `<div class="card" style="padding:20px;text-align:center;margin-bottom:14px">
    <div style="width:64px;height:64px;background:var(--grad-green);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:800;color:#050A12">P</div>
    <div style="font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:20px">Prado Sports AI</div>
    <div style="font-size:11px;color:var(--text-faint);margin-top:4px">v9.0 Ultra Premium</div>
  </div>
  <div class="card" style="padding:14px;font-size:12.5px;color:var(--text-dim);line-height:1.7">
    Estatísticas de futebol em tempo real, palpites com <b style="color:var(--text)">Inteligência Artificial real (Claude AI)</b> e cobertura completa dos principais campeonatos do mundo.<br><br>
    API de jogos: <b style="color:var(--text)">API-Football / API-Sports</b><br>
    IA analista: <b style="color:var(--text)">Anthropic Claude</b><br>
    Suporte: <a href="https://wa.me/${PRADO_PAYMENT_CONFIG.whatsapp}" style="color:var(--green)" target="_blank">WhatsApp</a>
  </div>`;
}


// ===================== FLOATING IA BUTTON =====================
function setupAIFloatingButton(){
  const btn=document.getElementById('ai-fab');
  if(!btn) return;
  let drag=false, moved=false, startX=0, startY=0, baseX=0, baseY=0, lastDX=0, lastDY=0;
  const margin=10;
  function clampPos(x,y){
    const r=btn.getBoundingClientRect();
    const w=r.width||58, h=r.height||58;
    const maxX=window.innerWidth-w-margin;
    const maxY=window.innerHeight-h-margin;
    return {x:Math.max(margin,Math.min(maxX,x)), y:Math.max(margin+8,Math.min(maxY,y))};
  }
  function setPos(x,y){
    const p=clampPos(x,y);
    btn.style.left=p.x+'px';
    btn.style.top=p.y+'px';
    btn.style.right='auto';
    btn.style.bottom='auto';
    return p;
  }
  try{
    const saved=JSON.parse(localStorage.getItem('prado_ai_fab_pos')||'null');
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)) requestAnimationFrame(()=>setPos(saved.x,saved.y));
  }catch{}
  btn.addEventListener('pointerdown',(e)=>{
    drag=true; moved=false; lastDX=0; lastDY=0;
    const r=btn.getBoundingClientRect();
    startX=e.clientX; startY=e.clientY; baseX=r.left; baseY=r.top;
    btn.classList.add('dragging');
    btn.setPointerCapture?.(e.pointerId);
  });
  btn.addEventListener('pointermove',(e)=>{
    if(!drag) return;
    const dx=e.clientX-startX, dy=e.clientY-startY;
    lastDX=dx; lastDY=dy;
    if(Math.abs(dx)+Math.abs(dy)>6) moved=true;
    if(moved){ e.preventDefault(); setPos(baseX+dx,baseY+dy); }
  });
  function finishDrag(e){
    if(!drag) return;
    drag=false; btn.classList.remove('dragging');
    btn.releasePointerCapture?.(e.pointerId);
    if(moved){
      const p=setPos(baseX+lastDX,baseY+lastDY);
      localStorage.setItem('prado_ai_fab_pos',JSON.stringify(p));
      btn.dataset.justDragged='1';
      setTimeout(()=>{ delete btn.dataset.justDragged; },180);
    }
  }
  btn.addEventListener('pointerup',finishDrag);
  btn.addEventListener('pointercancel',finishDrag);
  btn.addEventListener('click',(e)=>{
    if(btn.dataset.justDragged==='1'){ e.preventDefault(); return; }
    openAIDrawer();
  });
  window.addEventListener('resize',()=>{
    const r=btn.getBoundingClientRect();
    if(r.width) setPos(r.left,r.top);
  });
}

// ===================== AI DRAWER (CLAUDE REAL) =====================
let aiMatchCtx = null;

function openAIDrawer(){
  document.getElementById('ai-drawer').classList.add('open');
  document.getElementById('ai-drawer-bg').classList.add('open');
  document.getElementById('ai-drawer-input')?.focus();
}
function openAIDrawerForMatch(matchId){
  const m=MATCHES.find(x=>x.id===matchId);
  if(m){
    aiMatchCtx=m;
    const p=getPredictionForMatch(m);
    const ctx=`Análise da partida: ${teamName(m.home)} × ${teamName(m.away)} | Liga: ${leagueOf(m).name} | Status: ${m.status==='live'?`Ao vivo ${m.minute}'`:m.status} | Placar: ${m.hs}×${m.as} | Confiança IA: ${p?.confidence||'—'}% | Pick: ${p?.pick||'—'} | Risco: ${p?.risk||'—'}`;
    addAIMessage(`Vou analisar esta partida para você:\n\n📊 **${teamName(m.home)} × ${teamName(m.away)}**\n${ctx.replace('Análise da partida: ','').split(' | ').join('\n')}\n\nQual aspecto você quer que eu analise em mais detalhes?`,'bot');
  }
  openAIDrawer();
}
function closeAIDrawer(){
  document.getElementById('ai-drawer').classList.remove('open');
  document.getElementById('ai-drawer-bg').classList.remove('open');
}

function addAIMessage(text, role){
  const msgs=document.getElementById('ai-drawer-msgs');
  if(!msgs) return;
  const div=document.createElement('div');
  div.className=`ai-msg ai-msg-${role==='bot'?'bot':'user'}`;
  div.innerHTML=`<div class="ai-msg-bubble">${text.replace(/\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
}

function addTypingIndicator(){
  const msgs=document.getElementById('ai-drawer-msgs');
  if(!msgs) return null;
  const div=document.createElement('div');
  div.className='ai-msg ai-msg-bot'; div.id='ai-typing';
  div.innerHTML=`<div class="ai-msg-bubble"><div class="ai-typing-dots"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div); msgs.scrollTop=msgs.scrollHeight;
  return div;
}

async function sendAIMessage(){
  const input=document.getElementById('ai-drawer-input');
  if(!input) return;
  const text=input.value.trim(); if(!text) return;
  input.value=''; input.style.height='auto';

  addAIMessage(text,'user');
  state.aiHistory.push({role:'user',content:text});

  const typing=addTypingIndicator();
  const btn=document.getElementById('ai-send-btn'); if(btn) btn.disabled=true;

  try {
    const liveMatches=MATCHES.filter(m=>m.status==='live').slice(0,5);
    const topPicks=PREDICTIONS.sort((a,b)=>b.confidence-a.confidence).slice(0,5);
    const systemPrompt=`Você é o Prado IA — analista de futebol e especialista em apostas esportivas do aplicativo Prado Sports AI. Responda sempre em português brasileiro.

Contexto atual da plataforma:
- Jogos ao vivo: ${liveMatches.map(m=>`${teamName(m.home)} ${m.hs}×${m.as} ${teamName(m.away)} (${m.minute}' · ${leagueOf(m).name})`).join('; ')||'Nenhum no momento'}
- Top palpites IA: ${topPicks.map(p=>{ const m=MATCHES.find(x=>x.id===p.matchId); return m?`${teamName(m.home)}×${teamName(m.away)} (${p.confidence}% conf., pick: ${p.pick})`:'' }).filter(Boolean).join('; ')||'Nenhum no momento'}
${aiMatchCtx?`- Partida em análise: ${teamName(aiMatchCtx.home)} × ${teamName(aiMatchCtx.away)} | ${leagueOf(aiMatchCtx).name} | ${aiMatchCtx.status==='live'?`Ao vivo ${aiMatchCtx.minute}'`:aiMatchCtx.status} | ${aiMatchCtx.hs}×${aiMatchCtx.as}`:''}

Seja direto, analítico e use linguagem de especialista em apostas esportivas. Mencione odds, mercados, risco e probabilidades quando relevante. Máximo 3-4 parágrafos curtos.`;

    const messages=[...state.aiHistory];

    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:1000,
        system:systemPrompt,
        messages:messages
      })
    });

    if(!response.ok){
      const err=await response.json().catch(()=>({}));
      throw new Error(err?.error?.message||`Erro ${response.status}`);
    }

    const data=await response.json();
    const aiText=data.content?.map(c=>c.text||'').join('')||'Não consegui processar sua mensagem.';
    state.aiHistory.push({role:'assistant',content:aiText});
    if(state.aiHistory.length>20) state.aiHistory=state.aiHistory.slice(-20);

    if(typing) typing.remove();
    addAIMessage(aiText,'bot');

  } catch(err) {
    if(typing) typing.remove();
    const fallback=buildLocalFallbackResponse(text);
    addAIMessage(fallback,'bot');
    console.warn('AI API error:', err.message);
  } finally {
    if(btn) btn.disabled=false;
    const inp=document.getElementById('ai-drawer-input'); if(inp) inp.focus();
  }
}

function buildLocalFallbackResponse(question){
  const q=textNorm(question);
  const live=MATCHES.filter(m=>m.status==='live');
  const top=PREDICTIONS.sort((a,b)=>b.confidence-a.confidence)[0];
  const topMatch=top?MATCHES.find(x=>x.id===top?.matchId):null;

  if(q.includes('ao vivo')||q.includes('agora')){
    if(!live.length) return 'Nenhum jogo ao vivo no momento. Verifique a Central de Jogos para os próximos horários.';
    return `Há ${live.length} jogo(s) ao vivo agora: ${live.slice(0,3).map(m=>`**${teamName(m.home)} ${m.hs}×${m.as} ${teamName(m.away)}** (${m.minute}')`).join(', ')}. Veja a aba Ao Vivo para análise completa.`;
  }
  if(q.includes('palpite')||q.includes('aposta')||q.includes('melhor')){
    if(!topMatch) return 'A IA ainda está processando os dados. Volte em breve para os palpites.';
    return `Meu melhor palpite agora é **${teamName(topMatch.home)} × ${teamName(topMatch.away)}** com ${top.confidence}% de confiança.\n\nPick: **${top.pick}**\nRisco: ${top.risk}\n\nAtenção: apostas envolvem risco. Use stake controlada.`;
  }
  if(q.includes('odds')||q.includes('valor')||q.includes('ev')){
    return 'Para análise de valor (EV+), acesse **Mais → Scanner de valor** no menu. O scanner compara as probabilidades da IA com as odds implícitas para encontrar apostas com edge positivo.';
  }
  return `Estou processando sua pergunta sobre "${question}". No momento, minha conexão com o servidor está limitada. Tente reformular sua pergunta ou acesse os palpites diretamente na aba **IA Palpites** para análise completa dos jogos.`;
}

// ===================== MATCH DETAIL =====================
let currentMatchId=null;
function closeMatchDetail(){ document.getElementById('match-detail').classList.remove('open'); document.body.style.overflow=''; currentMatchId=null; }

function openMatchDetail(id, tab='resumo'){
  currentMatchId=id;
  const m=MATCHES.find(x=>x.id===id); if(!m) return;
  const lg=leagueOf(m);
  const ov=document.getElementById('match-detail');

  let statusBadge='';
  if(m.status==='live') statusBadge=`<span class="badge badge-live">${m.minute}' AO VIVO</span>`;
  else if(m.status==='finished') statusBadge=`<span style="font-size:12px;color:var(--text-faint)">Encerrado · ${fmtDate(m.date)}</span>`;
  else statusBadge=`<span style="font-size:12px;color:var(--text-dim)">${fmtDate(m.date)} · ${fmtTime(m.date)}</span>`;

  const scoreHTML=(m.status==='scheduled')
    ?`<div class="detail-score" style="font-size:32px;color:var(--text-faint)">vs</div>`
    :`<div style="display:flex;align-items:center;gap:12px"><div class="detail-score">${m.hs}</div><div class="detail-score-sep">–</div><div class="detail-score">${m.as}</div></div>`;

  let html=`<div class="detail-head">
    <button class="icon-btn" id="detail-close" style="background:var(--surface-2)">←</button>
    <div class="detail-title">${teamName(m.home)} × ${teamName(m.away)}</div>
    <div style="width:38px"></div>
  </div>
  <div class="detail-scoreboard" style="text-align:center;padding:20px 16px;background:var(--surface)">
    <div class="detail-league">${lg.icon} ${lg.name}${m.round?` · ${m.round}`:''}</div>
    <div class="detail-teams" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:16px 0">
      <div class="detail-team" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px">${crestHTML(m.home,48)}<div class="detail-team-name">${teamName(m.home)}</div></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px">${scoreHTML}<div>${statusBadge}</div></div>
      <div class="detail-team" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px">${crestHTML(m.away,48)}<div class="detail-team-name">${teamName(m.away)}</div></div>
    </div>
    ${m.venue?`<div style="font-size:10.5px;color:var(--text-faint)">📍 ${m.venue}</div>`:''}
  </div>
  <div style="display:flex;border-bottom:1px solid var(--border);padding:0 14px;overflow-x:auto;background:var(--surface)">
    ${['resumo','stats','lineups','maps','ai'].map(t=>`<div class="detail-tab ${t===tab?'active':''}" data-tab="${t}">${{resumo:'Resumo',stats:'Stats',lineups:'Escalações',maps:'Mapas',ai:'IA'}[t]}</div>`).join('')}
  </div>
  <div class="detail-body">
    <div class="tab-panel active" data-tab="resumo" id="dp-resumo">${detailResumo(m)}</div>
    <div class="tab-panel" data-tab="stats" id="dp-stats" style="display:none">${detailStats(m)}</div>
    <div class="tab-panel" data-tab="lineups" id="dp-lineups" style="display:none">${detailLineups(m)}</div>
    <div class="tab-panel" data-tab="maps" id="dp-maps" style="display:none">${detailMaps(m)}</div>
    <div class="tab-panel" data-tab="ai" id="dp-ai" style="display:none">${detailAI(m)}</div>
  </div>`;

  ov.innerHTML=html;
  document.getElementById('detail-close').addEventListener('click',closeMatchDetail);
  ov.querySelectorAll('.detail-tab').forEach(t=>{
    t.addEventListener('click',()=>{
      ov.querySelectorAll('.detail-tab').forEach(x=>x.classList.remove('active'));
      ov.querySelectorAll('.tab-panel').forEach(x=>x.style.display='none');
      t.classList.add('active');
      const panel=ov.querySelector(`#dp-${t.dataset.tab}`); if(panel) panel.style.display='block';
      if(t.dataset.tab==='maps') setTimeout(()=>drawMaps(m),50);
    });
  });

  // switch to requested tab
  if(tab!=='resumo'){ const t=ov.querySelector(`.detail-tab[data-tab="${tab}"]`); if(t) t.click(); }

  ov.classList.add('open'); document.body.style.overflow='hidden';

  // Load API details if available
  if(m.source==='api-football'&&typeof PradoAPI!=='undefined'&&!m.detailsLoaded&&!m.detailsLoading){
    m.detailsLoading=true;
    PradoAPI.fetchMatchDetails(m).catch(()=>{}).finally(()=>{ m.detailsLoading=false; if(currentMatchId===id) openMatchDetail(id,tab); });
  }
}

function detailResumo(m){
  if(m.detailsLoading) return `<div style="padding:20px;text-align:center"><div style="color:var(--text-faint);font-size:13px">⏳ Carregando eventos...</div></div>`;
  if(!m.events?.length) return emptyState(m.status==='scheduled'?'⏱️':'📝',m.status==='scheduled'?'Partida ainda não começou. Acompanhe ao vivo aqui.':'A API não liberou eventos detalhados para esta partida.');
  const icons={goal:'⚽',yellow:'🟨',red:'🟥',sub:'🔄',var:'📺',info:'·'};
  return `<div class="card" style="padding:6px 12px">${[...m.events].reverse().map(e=>`<div class="event-item"><div class="event-min">${e.min}'</div><div class="event-icon">${icons[e.type]||'·'}</div><div class="event-text">${e.text}</div><span class="event-team-badge ${e.team}">${e.team==='home'?teamName(m.home).slice(0,3):e.team==='away'?teamName(m.away).slice(0,3):''}</span></div>`).join('')}</div>`;
}

function detailStats(m){
  if(m.detailsLoading) return `<div style="padding:20px;text-align:center;color:var(--text-faint);font-size:13px">⏳ Buscando estatísticas da API...</div>`;
  if(!statsHasValues(m.stats)) return emptyState('📊','A API ainda não liberou estatísticas para esta partida.');
  const s=m.stats;
  const rows=[
    {label:'Posse de bola',a:s.possession[0],b:s.possession[1],suffix:'%'},
    {label:'xG',a:s.xg?.[0]||0,b:s.xg?.[1]||0},
    {label:'Finalizações no gol',a:s.shotsOnTarget[0],b:s.shotsOnTarget[1]},
    {label:'Finalizações para fora',a:s.shotsOffTarget[0],b:s.shotsOffTarget[1]},
    {label:'Escanteios',a:s.corners[0],b:s.corners[1]},
    {label:'Faltas',a:s.fouls[0],b:s.fouls[1]},
    {label:'Cartões amarelos',a:s.yellow[0],b:s.yellow[1]},
    {label:'Cartões vermelhos',a:s.red[0],b:s.red[1]},
  ];
  return `<div class="card" style="padding:14px">${rows.map(r=>{ const total=Math.max(1,r.a+r.b); const pa=r.a/total*100,pb=r.b/total*100; return `<div class="stat-bar-row"><div class="stat-bar-label"><span>${r.a}${r.suffix||''}</span><span>${r.label}</span><span>${r.b}${r.suffix||''}</span></div><div class="stat-bar-track"><div class="stat-bar-home" style="width:${pa}%"></div><div class="stat-bar-away" style="width:${pb}%"></div></div></div>`; }).join('')}</div>`;
}

function detailLineups(m){
  if(m.detailsLoading) return `<div style="padding:20px;text-align:center;color:var(--text-faint);font-size:13px">⏳ Buscando escalações...</div>`;
  if(!m.lineups) return emptyState('👥','Escalações confirmadas serão exibidas quando a API liberar este dado.');
  const lineupHTML=(lineup,code,flip=false)=>{
    const color=TEAMS[code]?.color||'var(--green)';
    const rowGroups=lineup.formation.split('-').map(Number); const allRows=[1,...rowGroups];
    let players=[...lineup.players]; let html='';
    const positions=flip?[...allRows].reverse():allRows;
    positions.forEach((count,ri)=>{
      const top=flip?10+ri*22:90-ri*22;
      const group=players.splice(0,count);
      html+=`<div style="position:absolute;top:${top}%;left:0;right:0;display:flex;justify-content:space-evenly;align-items:center">`+group.map(pl=>`<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#050A12">${pl.n}</div><div style="font-size:9px;color:var(--text-dim);text-align:center;max-width:44px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pl.p.split(' ').pop()}</div></div>`).join('')+'</div>';
    });
    return html;
  };
  return `<div style="background:var(--surface-2);border-radius:var(--radius-m);overflow:hidden;margin-bottom:10px">
    <div style="background:#1a3a20;position:relative;height:240px;border:2px solid rgba(255,255,255,0.1);border-radius:var(--radius-m);overflow:hidden;margin:10px">
      <div style="position:absolute;inset:10px;border:1.5px dashed rgba(255,255,255,0.15);border-radius:6px"></div>
      <div style="position:absolute;top:50%;left:10px;right:10px;height:1.5px;background:rgba(255,255,255,0.15)"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;border-radius:50%;border:1.5px dashed rgba(255,255,255,0.15)"></div>
      ${lineupHTML(m.lineups.home,m.home,false)}
      ${lineupHTML(m.lineups.away,m.away,true)}
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:11px;color:var(--text-faint)">
      <span>${teamName(m.home)} · ${m.lineups.home.formation}</span>
      <span>${m.lineups.away.formation} · ${teamName(m.away)}</span>
    </div>
  </div>`;
}

function detailMaps(m){
  if(m.detailsLoading) return `<div style="padding:20px;text-align:center;color:var(--text-faint);font-size:13px">⏳ Montando mapas...</div>`;
  if(!statsHasValues(m.stats)) return emptyState('🗺️','Mapas disponíveis quando houver estatísticas da partida.');
  return `<div class="card" style="padding:12px;margin-bottom:10px"><div style="font-size:12px;font-weight:700;margin-bottom:8px">⚽ Shotmap</div><canvas id="shotmap" width="340" height="220" style="width:100%;border-radius:8px"></canvas></div><div class="card" style="padding:12px"><div style="font-size:12px;font-weight:700;margin-bottom:8px">🔥 Heatmap — ${teamName(m.home)}</div><canvas id="heatmap" width="340" height="200" style="width:100%;border-radius:8px"></canvas></div>`;
}
function drawMaps(m){
  const shot=document.getElementById('shotmap'), heat=document.getElementById('heatmap');
  if(shot) drawShotmap(shot,m); if(heat) drawHeatmap(heat,m);
}
function seededRand(s){ const x=Math.sin(s)*10000; return x-Math.floor(x); }
function getCSS(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function drawShotmap(canvas,m){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#1a3020'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.2;
  ctx.strokeRect(4,4,w-8,h-8);
  ctx.beginPath(); ctx.moveTo(w/2,4); ctx.lineTo(w/2,h-4); ctx.stroke();
  ctx.beginPath(); ctx.arc(w/2,h/2,25,0,Math.PI*2); ctx.stroke();
  ctx.strokeRect(4,h/2-40,42,80); ctx.strokeRect(w-46,h/2-40,42,80);
  let seed=1;
  for(let side=0;side<2;side++){
    const onT=Number(m.stats.shotsOnTarget[side]||0), offT=Number(m.stats.shotsOffTarget[side]||0);
    const color=side===0?'#00F5A0':'#3D9EFF';
    const baseX=side===0?w-50:50;
    for(let i=0;i<onT+offT;i++){
      seed+=7.13; const r1=seededRand(seed),r2=seededRand(seed*1.7);
      const x=baseX+(side===0?-1:1)*r1*(w*0.38), y=14+r2*(h-28);
      ctx.beginPath(); ctx.arc(x,y,i<onT?5:3.5,0,Math.PI*2);
      if(i<onT){ ctx.fillStyle=color+'BB'; ctx.fill(); }
      ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();
    }
  }
}
function drawHeatmap(canvas,m){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#1a3020'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.2;
  ctx.strokeRect(4,4,w-8,h-8);
  ctx.beginPath(); ctx.moveTo(w/2,4); ctx.lineTo(w/2,h-4); ctx.stroke();
  let seed=42;
  const intensity=Math.min(1,(Number(m.stats.shotsOnTarget?.[0]||0)+Number(m.stats.shotsOffTarget?.[0]||0)+Number(m.stats.corners?.[0]||0))/15);
  for(let i=0;i<60+Math.round(intensity*40);i++){
    seed+=3.31; const r1=seededRand(seed),r2=seededRand(seed*1.3);
    const x=w*0.35+r1*w*0.58, y=h*0.08+r2*h*0.84;
    const grad=ctx.createRadialGradient(x,y,0,x,y,30);
    grad.addColorStop(0,`rgba(0,245,160,${0.2+intensity*0.2})`);
    grad.addColorStop(1,'rgba(0,245,160,0)');
    ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(x,y,30,0,Math.PI*2); ctx.fill();
  }
}
function detailAI(m){
  if(m.detailsLoading) return `<div style="padding:20px;text-align:center;color:var(--text-faint);font-size:13px">⏳ Gerando análise IA...</div>`;
  const p=getPredictionForMatch(m); if(!p) return emptyState('🤖','IA sem dados mínimos para esta partida.');
  return aiCardHTML(p,m,true)+`<div style="margin-top:12px"><button class="btn ghost full" onclick="openAIDrawerForMatch('${m.id}')">💬 Perguntar mais para a IA</button></div>`;
}

// ===================== SEARCH =====================
function openSearch(){
  const ov=document.getElementById('search-overlay');
  ov.classList.add('open');
  const inp=document.getElementById('search-input'); if(!inp) return;
  inp.value=''; renderSearchResults(''); inp.focus();
  inp.oninput=()=>renderSearchResults(inp.value);
}
function closeSearch(){ document.getElementById('search-overlay')?.classList.remove('open'); }
function renderSearchResults(q){
  const term=textNorm(String(q||'').trim());
  const box=document.getElementById('search-results'); if(!box) return;
  if(term.length<2){
    const suggestions=sortMatchesPremium(MATCHES.filter(m=>m.status==='live')).slice(0,6);
    if(!suggestions.length){ box.innerHTML=emptyState('🔎','Digite o nome do time ou liga para buscar jogos reais.'); return; }
    box.innerHTML=`<div class="menu-label" style="padding:0">Ao vivo agora</div><div class="card" style="padding:0 2px">${suggestions.map(m=>`<div class="match-row" onclick="closeSearch();openMatchDetail('${m.id}')"><div style="min-width:40px;text-align:center"><span class="badge badge-live" style="font-size:8px">${m.minute}'</span></div><div style="flex:1"><div style="font-size:13px;font-weight:600">${teamName(m.home)} × ${teamName(m.away)}</div><div style="font-size:10.5px;color:var(--text-faint)">${leagueOf(m).name}</div></div><div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700">${m.hs}–${m.as}</div></div>`).join('')}</div>`;
    return;
  }
  const words=term.split(/\s+/).filter(Boolean);
  const results=MATCHES.filter(m=>{ const hay=textNorm(`${teamName(m.home)} ${teamName(m.away)} ${leagueOf(m).name} ${leagueOf(m).country}`); return words.every(w=>hay.includes(w)); }).sort((a,b)=>matchPriorityScore(b)-matchPriorityScore(a)).slice(0,20);
  if(!results.length){ box.innerHTML=emptyState('🔎','Nenhum resultado encontrado. Tente buscar pelo nome do time ou liga.'); return; }
  box.innerHTML=`<div class="card" style="padding:0 2px">${results.map(m=>matchRow(m,true).replace('onclick="openMatchDetail','onclick="closeSearch();openMatchDetail')).join('')}</div>`;
}

// ===================== PWA =====================
function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream; }
function setupInstall(){
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); window.deferredInstallPrompt=e; });
  const btn=document.getElementById('install-btn');
  if(btn) btn.addEventListener('click',triggerInstall);
}
function triggerInstall(){
  if(window.deferredInstallPrompt){ window.deferredInstallPrompt.prompt(); window.deferredInstallPrompt.userChoice.then(()=>{ window.deferredInstallPrompt=null; }); }
  else if(isIOS()){ toast('No Safari, toque em Compartilhar ⬆️ e "Adicionar à Tela de Início"','📲'); }
  else { toast('Use o menu do Chrome → "Instalar aplicativo"','📲'); }
}
function registerSW(){ if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{}); }

// ===================== LIVE TICKS =====================
function simulateLiveTicks(){
  setInterval(()=>{
    let changed=false;
    MATCHES.forEach(m=>{ if(m.status==='live'&&m.minute<90&&m.source!=='api-football'){ m.minute+=1; changed=true; } });
    if(changed){
      if(state.page==='home') renderHome();
      if(state.page==='live') renderLive();
      updateLiveDot();
    }
  },15000);
}

