# Prado Sports AI v9 — Ultra Premium 🚀⚽🤖

A plataforma de inteligência esportiva mais avançada do Brasil.

## 🆕 O que mudou na v9

### Visual Ultra Premium
- Splash screen animado com hexágono e anéis pulsantes
- Design system completo: Space Grotesk + Inter + JetBrains Mono
- Gradientes e brilhos neon (green #00F5A0 + gold #FFB830)
- Botão central IA com orb brilhante na nav
- Cards com barra superior colorida por nível de confiança
- Animações: fadeInUp, shimmer skeleton, ring expand

### IA Real — Powered by Claude (Anthropic)
- Chat ao vivo com Claude AI: analisa partidas, mercados e odds
- Botão "🤖 Perguntar IA" em cada card de palpite
- Drawer deslizante com histórico de conversa
- Contexto automático: injeta jogos ao vivo e top palpites
- Fallback local inteligente se a API estiver offline

### Melhorias Técnicas
- Status da API no topbar em tempo real
- Live badge animado na navegação
- Scanner EV+ com cálculo Kelly Criterion
- Simulador com EV e Kelly automáticos
- Mapas (shotmap + heatmap) com canvas redesenhado
- Odds calculadas a partir das probabilidades da IA

## 📁 Estrutura

```
prado-v9/
├── index.html          → shell do app (PWA)
├── style.css           → design system ultra premium
├── app.js              → lógica + IA real Claude
├── data.js             → dados estáticos (times, ligas)
├── config.js           → configuração segura
├── api.js              → integração API-Football
├── manifest.json       → PWA manifest
├── sw.js               → service worker (offline + push)
├── api/
│   └── football.js     → proxy Vercel (chave segura)
└── icons/              → ícones PWA
```

## 🔧 Configuração

### 1. API de futebol (API-Sports)
Na Vercel, em **Settings → Environment Variables**, adicione:
```
APISPORTS_KEY = sua_chave_aqui
```

### 2. IA Claude (Anthropic)
O app chama a API da Anthropic diretamente no frontend usando `claude-sonnet-4-6`.

**Para produção**, crie um proxy seguro na Vercel para esconder a chave Anthropic:
```
ANTHROPIC_API_KEY = sua_chave_anthropic
```

E ajuste em `app.js` a URL de `https://api.anthropic.com/v1/messages` para `/api/claude`.

### 3. Códigos Premium
No `config.js`, coloque o link da planilha Google Sheets com os códigos:
```js
PREMIUM_CODES_URL: 'https://docs.google.com/spreadsheets/...'
```

## 💎 Funcionalidades Premium

| Recurso | Free | Premium |
|---|---|---|
| Jogos ao vivo | ✅ | ✅ |
| Palpites IA básicos | ✅ | ✅ |
| Chat IA (Claude) | ✅ | ✅ |
| Simulador de apostas | ❌ | ✅ |
| Scanner EV+ | ❌ | ✅ |
| Odds comparativas | ❌ | ✅ |

## 🚀 Deploy na Vercel

1. Faça upload da pasta `prado-v9/` no GitHub
2. Conecte ao Vercel
3. Configure as variáveis de ambiente
4. Deploy automático ✅

---
Prado Sports AI v9 — Feito com ⚽ + 🤖 + 💎
