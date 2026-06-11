import { useEffect, useMemo, useRef, useState } from 'react';

const LINE_OPTIONS = {
  gols: ['Over +0.5','Over +1.5','Over +2.5','Over +3.5','Under +2.5','Under +3.5'],
  gols_ht: ['Over 0.5 HT','Over 1.5 HT'],
  ambos: ['Sim','Não'],
  escanteios: ['Over 7.5','Over 8.5','Over 9.5','Over 10.5'],
  cartoes: ['Over 2.5','Over 3.5','Over 4.5'],
  jogos_gols: ['Mais provável Over 1.5','Mais provável Over 2.5','Ambas Marcam']
};

const CREST_MAP = [
  {k:['flamengo'], c1:'#e51b36', c2:'#111', ac:'#fff'},
  {k:['bahia'], c1:'#1372b9', c2:'#fff', ac:'#e5252a'},
  {k:['river'], c1:'#fff', c2:'#d71920', ac:'#111'},
  {k:['lanus','lanús'], c1:'#77112a', c2:'#a9143e', ac:'#fff'},
  {k:['colo'], c1:'#fff', c2:'#111', ac:'#d9d9d9'},
  {k:['everton'], c1:'#164f9f', c2:'#ffd850', ac:'#fff'},
  {k:['miami'], c1:'#ff9ec6', c2:'#111', ac:'#fff'},
  {k:['orlando'], c1:'#5b2d90', c2:'#f3d34a', ac:'#fff'},
  {k:['palmeiras'], c1:'#006437', c2:'#fff', ac:'#fff'},
  {k:['santos'], c1:'#fff', c2:'#000', ac:'#000'},
  {k:['real madrid','real'], c1:'#fff', c2:'#febe10', ac:'#fff'},
  {k:['valencia'], c1:'#ff8200', c2:'#111', ac:'#fff'}
];

function crestColors(name){
  const n = (name || '').toLowerCase();
  return CREST_MAP.find(e => e.k.some(k => n.includes(k))) || {c1:'#222', c2:'#555', ac:'#fff'};
}

function initials(name){
  return (name || '?')
    .split(/\s|-/)
    .filter(Boolean)
    .slice(0,2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function ShieldCrest({ name, logo, size = 32 }){
  if (logo) {
    return (
      <img
        className="crest"
        src={logo}
        alt={name}
        width={size}
        height={size}
        style={{ objectFit:'contain' }}
      />
    );
  }

  const d = crestColors(name);
  const uid = 'g' + Math.abs((name || 'x').split('').reduce((a,c) => a + c.charCodeAt(0), 0));

  return (
    <svg className="crest" width={size} height={Math.round(size * 1.18)} viewBox="0 0 64 76" aria-label={name}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={d.c1}/>
          <stop offset=".55" stopColor={d.c2}/>
          <stop offset="1" stopColor="#050505"/>
        </linearGradient>
        <linearGradient id={uid + 's'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".45"/>
          <stop offset=".62" stopColor="#fff" stopOpacity=".03"/>
          <stop offset="1" stopColor="#000" stopOpacity=".12"/>
        </linearGradient>
      </defs>
      <path d="M32 2 L59 11 L54 50 Q47 64 32 74 Q17 64 10 50 L5 11 Z" fill={`url(#${uid})`}/>
      <path d="M12 15 C22 22 43 18 52 15 L48 47 Q42 58 32 65 Q22 58 16 47 Z" fill={`url(#${uid}s)`}/>
      <text x="32" y="42" textAnchor="middle" fill={d.ac} fontSize="15" fontWeight="900" fontFamily="Arial">
        {initials(name)}
      </text>
    </svg>
  );
}

function Flag({ flag, country }){
  if (!flag) return <>{country || ''}</>;
  if (String(flag).startsWith('http')) {
    return (
      <img
        src={flag}
        alt={country || 'flag'}
        style={{width:16,height:11,objectFit:'cover',borderRadius:2,verticalAlign:'-1px',marginRight:5}}
      />
    );
  }
  return <>{flag} </>;
}

function todayStr(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

function fmtDate(iso){
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function scoreFor(g,i){
  return Math.max(7.5, Math.min(9.8, (Number(g.prob || 0) / 10 + (Number(g.odd || 1) - 1) * .35 - i * .1))).toFixed(1);
}

function autoMarket(game, index){
  const markets = [
    'Over +0.5',
    'Over +1.5',
    'Over +2.5',
    'Ambas Marcam',
    'Escanteios +7.5',
    'Escanteios +8.5',
    'Cartões +3.5',
    'Under +3.5'
  ];

  if (index % 7 === 0) return 'Ambas Marcam';
  if (index % 6 === 0) return 'Escanteios +8.5';
  if (index % 5 === 0) return 'Over +2.5';
  if (game.prob >= 89) return 'Over +0.5';
  if (game.prob >= 84) return 'Over +1.5';
  if (Number(game.odd) >= 2.05) return 'Over +2.5';

  return markets[index % markets.length];
}

function riskConfig(risk){
  if (risk === 'leve') {
    return {
      label: 'Leve',
      qty: 3,
      markets: ['Over +0.5', 'Over +1.5', 'Under +3.5'],
      sort: 'prob'
    };
  }

  if (risk === 'moderado') {
    return {
      label: 'Moderado',
      qty: 5,
      markets: ['Over +1.5', 'Ambas Marcam', 'Escanteios +7.5', 'Over +2.5', 'Under +3.5'],
      sort: 'balanced'
    };
  }

  return {
    label: 'Agressivo',
    qty: 8,
    markets: ['Over +2.5', 'Ambas Marcam', 'Escanteios +8.5', 'Escanteios +9.5', 'Cartões +3.5', 'Resultado + Gols'],
    sort: 'odd'
  };
}

function marketForPick(risk, index){
  const cfg = riskConfig(risk);
  return cfg.markets[index % cfg.markets.length];
}

async function getGames(date){
  try {
    const r = await fetch(`/api/games?date=${date}`, { cache:'no-store' });
    const j = await r.json();
    return j.games || [];
  } catch {
    return [];
  }
}

function LoadingBar({label}){
  return (
    <div className="loading">
      <strong>🤖 {label}</strong>
      <span>Consultando dados e calculando oportunidades...</span>
      <div><i /></div>
    </div>
  );
}

function LivePanel({monitored, opps}){
  return (
    <section className="ai-green">
      <div className="ai-line">
        <div className="pulse"/>
        <b>PRADO IA</b>
        <span>analisando oportunidades</span>
        <em>Ao vivo</em>
      </div>

      <div className="ai-body">
        <div className="heat">
          <i/><i/><i/><i/>
          <small>Mapa de Pressão IA</small>
        </div>

        <div className="scanner-list">
          <b>Scanner</b>
          {[
            ['Over +1.5','92%'],
            ['BTTS','84%'],
            ['Esc.','79%']
          ].map((x,i) => (
            <p key={x[0]} className={i === 0 ? 'hot' : ''}>
              <span>{x[0]}</span>
              <strong>{x[1]}</strong>
            </p>
          ))}
        </div>
      </div>

      <div className="ai-foot">
        <span>Motor IA v4.0</span>
        <span>{monitored || 138} jogos • {opps || 19} oportunidades</span>
      </div>
    </section>
  );
}

function GameCard({game, index, line}){
  const tag = index === 0 ? '🔥 Entrada do Dia' : index === 1 ? '☆ Alta Confiança' : '✓ Boa Oportunidade';

  return (
    <article className={`game ${index === 0 ? 'best' : ''}`}>
      <div className="game-head">
        <span className={`rank r${index + 1}`}>{index + 1}</span>
        <b>{tag}</b>
        <em>IA {scoreFor(game,index)}</em>
      </div>

      <div className="teams">
        <ShieldCrest name={game.home} logo={game.homeLogo}/>
        <div>
          <h3>{game.home} <span>x</span> {game.away}</h3>
          <p><Flag flag={game.flag} country={game.country}/>{game.league} • {game.time}</p>
        </div>
        <ShieldCrest name={game.away} logo={game.awayLogo}/>
      </div>

      <div className="metrics">
        <div>
          <strong>{game.prob}%</strong>
          <span>Confiança</span>
        </div>
        <div>
          <strong>{Number(game.odd).toFixed(2)}</strong>
          <span>Odd</span>
        </div>
        <div className="market">
          <strong>{line}</strong>
          <span>Mercado</span>
        </div>
      </div>
    </article>
  );
}

function TicketView({ticket, defaultLine}){
  if(!ticket) {
    return (
      <div className="empty">
        <b>Nenhum bilhete gerado</b>
        <span>Escolha um perfil e toque em Iniciar Scan.</span>
      </div>
    );
  }

  return (
    <section className="ticket">
      <div className="ticket-title">
        <b>✅ Bilhete Gerado</b>
        <em>IA VERIFICADO</em>
      </div>

      <div className="ticket-stats">
        <p><span>Odd</span><b>{ticket.oddTotal.toFixed(2)}</b></p>
        <p><span>Confiança</span><b>{ticket.avgProb}%</b></p>
        <p><span>Risco</span><b>{ticket.riskLabel || 'Scanner'}</b></p>
        <p><span>Jogos</span><b>{ticket.picks.length}</b></p>
      </div>

      {ticket.picks.map((g,i) => (
        <div className="pick" key={`${g.fixtureId || g.home}-${i}`}>
          <span>{i + 1}</span>
          <div>
            <b>{g.home} x {g.away}</b>
            <small>{g.pickLine || defaultLine} • Odd {Number(g.odd).toFixed(2)} • Score {scoreFor(g,i)}</small>
          </div>
          <em>{Number(g.odd).toFixed(2)}</em>
        </div>
      ))}
    </section>
  );
}

export default function PradoIA(){
  const [tab,setTab] = useState('scanner');
  const [market,setMarket] = useState('gols');
  const [line,setLine] = useState('Over +1.5');
  const [qty,setQty] = useState(4);
  const [date,setDate] = useState(todayStr());
  const [games,setGames] = useState([]);
  const [loading,setLoading] = useState(false);
  const [risk,setRisk] = useState('leve');
  const [ticket,setTicket] = useState(null);
  const [scanTicket,setScanTicket] = useState(null);
  const [generating,setGenerating] = useState(false);
  const [monitored,setMonitored] = useState(138);
  const [opps,setOpps] = useState(19);
  const scanRef = useRef(null);

  const curLine = useMemo(
    () => LINE_OPTIONS[market]?.includes(line) ? line : LINE_OPTIONS[market][0],
    [market,line]
  );

  useEffect(() => {
    let ok = true;
    setLoading(true);

    getGames(date).then(g => {
      if(ok){
        const sorted = g.sort((a,b) => b.prob - a.prob);
        setGames(sorted);
        setMonitored(Math.max(120, sorted.length * 12));
        setOpps(Math.max(12, Math.floor(sorted.length * 3.5)));
        setLoading(false);
      }
    });

    return () => { ok = false; };
  }, [date]);

  useEffect(() => {
    const id = setInterval(() => {
      setMonitored(m => m + (Math.random() > .5 ? 1 : -1));
      setOpps(o => Math.max(8, o + (Math.random() > .65 ? 1 : 0)));
    }, 4500);

    return () => clearInterval(id);
  }, []);

  const jogosOpportunities = useMemo(() => {
    return games
      .map((g,i) => ({...g, pickLine:autoMarket(g,i), autoIndex:i}))
      .sort((a,b) => (Number(b.prob) + Number(b.odd) * 8) - (Number(a.prob) + Number(a.odd) * 8))
      .slice(0, Math.max(6, qty));
  }, [games, qty]);

  function sortGamesForRisk(list, riskName){
    if (riskName === 'agressivo') {
      return [...list].sort((a,b) => Number(b.odd) - Number(a.odd));
    }

    if (riskName === 'moderado') {
      return [...list].sort((a,b) => ((b.prob * 0.65) + (b.odd * 15)) - ((a.prob * 0.65) + (a.odd * 15)));
    }

    return [...list].sort((a,b) => Number(b.prob) - Number(a.prob));
  }

  function uniqueByFixture(list){
    const seen = new Set();
    return list.filter(g => {
      const key = g.fixtureId || `${g.home}-${g.away}-${g.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getRiskPool(riskName){
    const safe = uniqueByFixture(sortGamesForRisk(games, 'leve'));
    const balanced = uniqueByFixture(sortGamesForRisk(games, 'moderado'));
    const odds = uniqueByFixture(sortGamesForRisk(games, 'agressivo'));

    if (riskName === 'leve') {
      return safe.slice(0, 3);
    }

    if (riskName === 'moderado') {
      const pool = [
        ...balanced.slice(5, 10),
        ...safe.slice(8, 12),
        ...odds.slice(8, 12)
      ];
      return uniqueByFixture(pool).slice(0, 5);
    }

    const pool = [
      ...odds.slice(0, 4),
      ...odds.slice(10, 16),
      ...balanced.slice(12, 18)
    ];
    return uniqueByFixture(pool).slice(0, 8);
  }

  function buildTicketFromPicks(picks, riskLabel, defaultLine){
    const oddTotal = picks.reduce((a,g) => a * Number(g.odd || 1), 1);
    const avgProb = picks.length
      ? Math.round(picks.reduce((a,g) => a + Number(g.prob || 0), 0) / picks.length)
      : 0;

    return {
      picks,
      oddTotal,
      avgProb,
      line: defaultLine,
      riskLabel
    };
  }

  async function makeScannerTicket(){
    setGenerating(true);

    const picks = [...games]
      .sort((a,b) => Number(b.prob) - Number(a.prob))
      .slice(0, qty)
      .map(g => ({ ...g, pickLine: curLine }));

    const t = buildTicketFromPicks(picks, 'Scanner', curLine);

    setScanTicket(t);
    setTimeout(() => scanRef.current?.scrollIntoView({behavior:'smooth'}), 80);
    setGenerating(false);
  }

  async function makeRiskTicket(openTab = true){
    setGenerating(true);

    const cfg = riskConfig(risk);

    let picks = getRiskPool(risk).map((g,i) => ({
      ...g,
      pickLine: marketForPick(risk, i)
    }));

    if (picks.length < cfg.qty) {
      const fallback = uniqueByFixture(sortGamesForRisk(games, risk))
        .filter(g => !picks.some(p => (p.fixtureId || p.home) === (g.fixtureId || g.home)))
        .slice(0, cfg.qty - picks.length)
        .map((g,i) => ({...g, pickLine: marketForPick(risk, picks.length + i)}));
      picks = [...picks, ...fallback];
    }

    picks = picks.slice(0, cfg.qty);

    const t = buildTicketFromPicks(picks, cfg.label, 'Mercados variados');

    setTicket(t);
    if(openTab) setTab('bilhete');
    setGenerating(false);
  }

  return (
    <main className="app">
      <header className="top">
        <div className="logo">P</div>
        <div>
          <h1>PRADO IA</h1>
          <p>Sports Intelligence</p>
        </div>
        <mark>PRO</mark>
      </header>

      <nav>
        {['scanner','jogos','bilhete'].map(t => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {tab === 'scanner' && (
        <>
          <section className="scan">
            <div className="scan-head">
              <div>
                <span>Scanner IA</span>
                <h2>Buscar oportunidades</h2>
              </div>
              <em>{fmtDate(date)}</em>
            </div>

            <div className="form">
              <label>
                Mercado
                <select
                  value={market}
                  onChange={e => {
                    setMarket(e.target.value);
                    setLine(LINE_OPTIONS[e.target.value][0]);
                  }}
                >
                  <option value="gols">Gols na Partida</option>
                  <option value="gols_ht">Gols 1º Tempo</option>
                  <option value="ambos">Ambos Marcam</option>
                  <option value="escanteios">Escanteios</option>
                  <option value="cartoes">Cartões</option>
                  <option value="jogos_gols">Jogos para Gols</option>
                </select>
              </label>

              <label>
                Linha
                <select value={curLine} onChange={e => setLine(e.target.value)}>
                  {LINE_OPTIONS[market].map(o => <option key={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Quantidade
                <select value={qty} onChange={e => setQty(Number(e.target.value))}>
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Jogos</option>)}
                </select>
              </label>

              <label>
                Data
                <input type="date" value={date} onChange={e => setDate(e.target.value)}/>
              </label>
            </div>

            <button
              className="goldbtn"
              onClick={makeScannerTicket}
              disabled={loading || generating}
            >
              {loading ? 'Carregando...' : generating ? 'Analisando...' : 'Iniciar Scan'}
            </button>
          </section>

          <div ref={scanRef}>
            {generating
              ? <LoadingBar label="Gerando bilhete IA"/>
              : <TicketView ticket={scanTicket} defaultLine={curLine}/>
            }
          </div>
        </>
      )}

      {tab === 'jogos' && (
        <>
          <LivePanel monitored={monitored} opps={opps}/>

          <div className="title-row">
            <div>
              <span>Ranking gerado pela IA</span>
              <h2>Melhores oportunidades</h2>
            </div>
            <button onClick={() => makeRiskTicket(true)}>
              Gerar Bilhete IA
            </button>
          </div>

          <div className="live-mini">
            <b>🟢 IA AO VIVO</b>
            <span>{monitored} Jogos • {opps} Oportunidades</span>
            <p>
              <i>Over 1.5&nbsp; 92%</i>
              <i>BTTS&nbsp; 84%</i>
              <i>Esc.&nbsp; 79%</i>
            </p>
          </div>

          {loading
            ? <LoadingBar label="Buscando jogos"/>
            : jogosOpportunities.map((g,i) => (
              <GameCard
                key={`${g.fixtureId || g.home}-${i}`}
                game={g}
                index={i}
                line={g.pickLine}
              />
            ))
          }
        </>
      )}

      {tab === 'bilhete' && (
        <>
          <span className="eyebrow">Perfis de risco</span>
          <h2 className="page-title">Gerar bilhete</h2>

          <div className="risks">
            {[
              ['leve','Leve','Odd menor'],
              ['moderado','Moderado','Equilíbrio'],
              ['agressivo','Agressivo','Retorno alto']
            ].map(r => (
              <button
                key={r[0]}
                onClick={() => setRisk(r[0])}
                className={risk === r[0] ? 'on' : ''}
              >
                <b>{r[1]}</b>
                <span>{r[2]}</span>
              </button>
            ))}
          </div>

          <button
            className="goldbtn"
            onClick={() => makeRiskTicket(false)}
            disabled={loading || generating}
          >
            {generating ? '🤖 Gerando...' : 'Iniciar Scan'}
          </button>

          {generating
            ? <LoadingBar label="Montando bilhete"/>
            : <TicketView ticket={ticket} defaultLine="Mercados variados"/>
          }
        </>
      )}
    </main>
  );
}
