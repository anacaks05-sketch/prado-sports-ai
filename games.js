const fallbackGames = [
  { home:'Flamengo', away:'Bahia', league:'Brasil Série A', flag:'🇧🇷', time:'19:00', prob:90, odd:1.62 },
  { home:'River Plate', away:'Lanús', league:'Argentina Liga', flag:'🇦🇷', time:'20:15', prob:82, odd:1.55 },
  { home:'Colo-Colo', away:'Everton', league:'Chile Primera', flag:'🇨🇱', time:'22:00', prob:82, odd:1.66 },
  { home:'Inter Miami', away:'Orlando City', league:'MLS', flag:'🇺🇸', time:'21:30', prob:80, odd:1.70 },
  { home:'Palmeiras', away:'Santos', league:'Brasil Série A', flag:'🇧🇷', time:'20:00', prob:79, odd:1.58 },
  { home:'Real Madrid', away:'Valencia', league:'La Liga', flag:'🇪🇸', time:'16:00', prob:86, odd:1.48 }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const date = req.query?.date || new Date().toISOString().slice(0,10);
  // Futuro: aqui entra API-Football com process.env.API_FOOTBALL_KEY e logos oficiais.
  // Por enquanto retorna fallback estável para o app nunca quebrar.
  res.status(200).json({ date, source: 'fallback', games: fallbackGames });
}
