function stableNumber(text, min, max) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

function leaguePriority(name = "", country = "") {
  const n = `${name} ${country}`.toLowerCase();

  if (n.includes("world cup") || n.includes("copa do mundo")) return 100;
  if (n.includes("champions")) return 95;
  if (n.includes("libertadores")) return 94;
  if (n.includes("sudamericana")) return 92;
  if (n.includes("brasileiro") || n.includes("serie a")) return 90;
  if (n.includes("premier league")) return 89;
  if (n.includes("la liga")) return 88;
  if (n.includes("serie a") && n.includes("italy")) return 87;
  if (n.includes("bundesliga")) return 86;
  if (n.includes("ligue 1")) return 85;
  if (n.includes("mls")) return 80;
  if (n.includes("cup") || n.includes("copa")) return 75;

  return 50;
}

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

    const games = (data.response || [])
      .map((item) => {
        const home = item.teams.home;
        const away = item.teams.away;
        const key = `${item.fixture.id}-${home.name}-${away.name}`;

        const priority = leaguePriority(item.league.name, item.league.country);
        const prob = Math.min(93, stableNumber(key, 70, 88) + Math.floor(priority / 20));
        const odd = Number((1.30 + (100 - prob) / 35 + stableNumber(key, 0, 25) / 100).toFixed(2));

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
          priority,
          prob,
          odd
        };
      })
      .filter((g) => !["FT", "AET", "PEN", "CANC", "PST"].includes(g.status))
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.prob - a.prob;
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
