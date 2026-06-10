# Prado IA V20 React Premium

## Rodar local
```bash
npm install
npm run dev
```

## Deploy na Vercel
1. Suba esta pasta para GitHub ou importe direto na Vercel.
2. Framework: Vite.
3. Build command: `npm run build`.
4. Output: `dist`.

## APIs
- `/api/games`: fallback de jogos. Depois podemos ligar API-Football aqui.
- `/api/ticket`: gera bilhete sem expor chave no front-end.

## Observação
Os escudos desta versão são placeholders 3D por SVG. Escudos oficiais reais entram quando ligarmos uma API que retorne `team.logo`.
