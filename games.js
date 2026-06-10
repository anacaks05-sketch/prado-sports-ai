const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', Brasil: '🇧🇷', Argentina: '🇦🇷', Chile: '🇨🇱', Uruguay: '🇺🇾', Peru: '🇵🇪', Colombia: '🇨🇴',
  USA: '🇺🇸', 'United States': '🇺🇸', England: '🏴', Spain: '🇪🇸', Germany: '🇩🇪', Italy: '🇮🇹', France: '🇫🇷', Portugal: '🇵🇹',
  Netherlands: '🇳🇱', Mexico: '🇲🇽', Ecuador: '🇪🇨', Bolivia: '🇧🇴', Paraguay: '🇵🇾', Venezuela: '🇻🇪'
};

function probabilityFromFixture(item, index) {
  const homeRank = item.teams?.home?.winner === true ? 4 : 0;
  const awayRank = item.teams?.away?.winner === true ? -2 : 0;
  const base = 88 - (index % 16) - Math.floor(index / 8);
  return Math.max(70, Math.min(92, base + homeRank + awayRank));
}

function oddFromProb(prob, index) {
  const implied = 100 / Math.max(prob, 50);
  const adjusted = implied + 0.18 + ((index % 5) * 0.04);
  return Number(Math.max(1.25, Math.min(2.6, adjusted)).toFixed(2));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return res.status(500).json({ error: 'API_FOOTBALL_KEY não configurada na Vercel', games: [] });
  }

  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const timezone = req.query.timezone || 'America/Sao_Paulo';

  try {
    const url = new URL('https://v3.football.api-sports.io/fixtures');
    url.searchParams.set('date', date);
    url.searchParams.set('timezone', timezone);

    const response = await fetch(url.toString(), {
      headers: { 'x-apisports-key': key }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || 'Erro API-Football', games: [] });
    }

    const games = (data.response || [])
      .map((item, index) => {
        const prob = probabilityFromFixture(item, index);
        return {
          id: item.fixture?.id,
          home: item.teams?.home?.name || 'Mandante',
          away: item.teams?.away?.name || 'Visitante',
          homeLogo: item.teams?.home?.logo || '',
          awayLogo: item.teams?.away?.logo || '',
          league: item.league?.name || 'Liga',
          country: item.league?.country || '',
          flag: COUNTRY_FLAGS[item.league?.country] || '🌍',
          leagueLogo: item.league?.logo || '',
          time: new Date(item.fixture?.date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone
          }),
          status: item.fixture?.status?.short || 'NS',
          prob,
          odd: oddFromProb(prob, index),
          ev: '+0.08'
        };
      })
      .sort((a, b) => b.prob - a.prob);

    return res.status(200).json({ date, count: games.length, games });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar jogos na API-Football', details: error.message, games: [] });
  }
}
