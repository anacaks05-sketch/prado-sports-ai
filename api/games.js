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
  if (n.includes("brasil") || n.includes("serie a")) return 90;
  if (n.includes("premier league")) return 89;
  if (n.includes("la liga")) return 88;
  if (n.includes("bundesliga")) return 86;
  if (n.includes("mls")) return 80;

  return 50;
}

async function apiFetch(url) {
  const response = await fetch(url, {
    headers: {
      "x-apisports-key": process.env.API_FOOTBALL_KEY
    }
  });

  const data = await response.json();

  if (!response.ok || data.errors?.length) {
    throw new Error(JSON.stringify(data.errors || data));
  }

  return data;
}

function pickBestOdd(bookmakers = []) {
  const preferredMarkets = [
    "Goals Over/Under",
    "Goals Over/Under First Half",
    "Both Teams Score",
    "Match Winner"
  ];

  for (const marketName of preferredMarkets) {
    for (const bookmaker of bookmakers) {
      const bet = bookmaker.bets?.find(
        (b) => String(b.name || "").toLowerCase() === marketName.toLowerCase()
      );

      if (!bet?.values?.length) continue;

      const preferredValues = [
        "Over 1.5",
        "Over 2.5",
        "Yes",
        "Home",
        "Away"
      ];

      for (const valueName of preferredValues) {
        const found = bet.values.find(
          (v) => String(v.value || "").toLowerCase() === valueName.toLowerCase()
        );

        if (found?.odd) {
          return {
            odd: Number(found.odd),
            market: bet.name,
            pick: found.value,
            bookmaker: bookmaker.name
          };
        }
      }

      const first = bet.values[0];
      if (first?.odd) {
        return {
          odd: Number(first.odd),
          market: bet.name,
          pick: first.value,
          bookmaker: bookmaker.name
        };
      }
    }
  }

  return null;
}

async function getOddsMap(date) {
  const oddsMap = {};
  let page = 1;
  let totalPages = 1;

  do {
    const data = await apiFetch(
      `https://v3.football.api-sports.io/odds?date=${date}&timezone=America/Sao_Paulo&page=${page}`
    );

    totalPages = data.paging?.total || 1;

    for (const item of data.response || []) {
      const fixtureId = item.fixture?.id;
      const picked = pickBestOdd(item.bookmakers || []);

      if (fixtureId && picked) {
        oddsMap[fixtureId] = picked;
      }
    }

    page++;
  } while (page <= totalPages && page <= 5);

  return oddsMap;
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
    const [fixturesData, oddsMap] = await Promise.all([
      apiFetch(`https://v3.football.api-sports.io/fixtures?date=${date}&timezone=America/Sao_Paulo`),
      getOddsMap(date).catch(() => ({}))
    ]);

    const games = (fixturesData.response || [])
      .map((item) => {
        const home = item.teams.home;
        const away = item.teams.away;
        const fixtureId = item.fixture.id;
        const key = `${fixtureId}-${home.name}-${away.name}`;

        const priority = leaguePriority(item.league.name, item.league.country);
        const prob = Math.min(93, stableNumber(key, 70, 88) + Math.floor(priority / 20));

        const realOdd = oddsMap[fixtureId];

        return {
          fixtureId,
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

          odd: realOdd ? realOdd.odd : null,
          oddReal: !!realOdd,
          oddMarket: realOdd?.market || null,
          oddPick: realOdd?.pick || null,
          bookmaker: realOdd?.bookmaker || null
        };
      })
      .filter((g) => !["FT", "AET", "PEN", "CANC", "PST"].includes(g.status))
      .filter((g) => g.oddReal)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.prob - a.prob;
      });

    res.status(200).json({ games });
  } catch (error) {
    res.status(500).json({
      error: "Falha ao buscar jogos/odds reais",
      details: error.message,
      games: []
    });
  }
}
