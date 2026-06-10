export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const games = Array.isArray(body.games) ? body.games : [];
  const qty = Number(body.qty || 3);
  const risk = body.risk || 'moderado';
  const line = body.line || 'Over +1.5';
  const aggressive = risk === 'agressivo';
  const picks = [...games].sort((a,b)=> aggressive ? b.odd-a.odd : b.prob-a.prob).slice(0, qty);
  const oddTotal = picks.reduce((acc,g)=>acc*Number(g.odd || 1),1);
  const avgProb = picks.length ? Math.round(picks.reduce((acc,g)=>acc+Number(g.prob||0),0)/picks.length) : 0;
  res.status(200).json({
    picks,
    oddTotal,
    avgProb,
    line,
    analysis: 'Bilhete montado com base em confiança, odd e perfil de risco.',
    recommendation: 'Use gestão de banca e confirme escalações antes de apostar.'
  });
}
