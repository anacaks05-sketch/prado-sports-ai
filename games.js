export default async function handler(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  if (!process.env.API_FOOTBALL_KEY) {
    return res.status(500).json({
      error: "API_FOOTBALL_KEY não configurada na Vercel",
      games: []
    });
  }

  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${date}&timezone=America/Sao_Paulo`,
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok || data.errors?.length) {
      return res.status(500).json({
        error: "Erro na API-Football",
        details: data.errors,
        games: []
      });
    }

    const games = (data.response || []).map((item) => {
      const home = item.teams.home;
      const away = item.teams.away;

      return {
        fixtureId: item.fixture.id,
        home: home.name,
        away: away.name,
        homeLogo: home.logo,
        awayLogo: away.logo,
        league: item.league.name,
        leagueLogo: item.league.logo,
        flag: item.league.flag,
        country: item.league.country,
        time: new Date(item.fixture.date).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo"
        }),
        status: item.fixture.status.short,
        prob: Math.floor(Math.random() * 20) + 70,
        odd: Number((Math.random() * 1.2 + 1.35).toFixed(2))
      };
    });

    res.status(200).json({ games });
  } catch (error) {
    res.status(500).json({
      error: "Falha ao buscar jogos",
      details: error.message,
      games: []
    });
  }
}
