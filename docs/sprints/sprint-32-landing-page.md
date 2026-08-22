# Sprint 32 — Landing page

**Status:** concluída — 2026-08-22 · **Versão:** 0.32.0 (executada antes da Sprint 31, a pedido do autor — a landing prepara o próximo post)
**Esforço:** M (4–6 dias)
**Depende de:** 30

## Origem

Pedido do autor (2026-08-22): uma landing page do projeto com botão **Iniciar** para entrar na plataforma — cover caprichada, seções com as informações essenciais e um footer adequado. Hoje quem chega em `oficina-cnc.vercel.app` cai direto no editor: funciona para quem já conhece, mas não conta a história para quem chegou pelo LinkedIn, por busca ou por indicação — e é nessa primeira dobra que a pessoa decide se fica.

## Decisão de arquitetura (a parte que importa acertar)

A landing é **estática e separada do app** — não um componente React dentro do bundle:

- **Vite multi-page**: `index.html` vira a landing (HTML+CSS puro, zero JS de app, carrega instantâneo e indexa perfeito); o app passa a viver em **`/app/`** (`app.html` como entrada do bundle atual).
- **Links antigos não podem quebrar**: o app é PWA instalado e tem links de compartilhamento `/#p=…` circulando. A landing detecta `#p=`, `#privacidade`, `#cookies`, `#termos`, `#sobre` no load e **redireciona para `/app/` preservando o hash**. `buildShareUrl` passa a gerar `/app/#p=…`.
- **PWA**: `start_url` e `scope` mudam para `/app/`; quem instalou antes continua abrindo o editor direto (o manifesto é servido pelo app). A landing tem o próprio `<head>` de SEO (title/description/OG) e o sitemap ganha as duas URLs; o canonical do app aponta para `/app/`.
- Analytics/Speed Insights: a landing ganha rota `/` própria — dá para ver quantos visitantes clicam **Iniciar**.

## Proposta

### A. Cover (primeira dobra)

- Wordmark + frase de uma linha no tom da oficina: "Desenhe a peça, gere o G-code e veja o corte antes de ligar a máquina. De graça, no navegador."
- Botão primário **Iniciar** (→ `/app/`) e secundário "Ver exemplos" (→ `/app/` com a galeria aberta via `?galeria=1`).
- Imagem de capa: captura real do editor com a tábua de carnes + simulador (as capturas de sprint já são boas; gerar uma limpa em resolução alta, claro e escuro conforme `prefers-color-scheme`).
- Sem vídeo nesta versão (peso); um GIF curto do fluxo pode entrar depois.

### B. Seções essenciais (nesta ordem)

1. **O fluxo em três passos** — Desenhar → Simular → Cortar, com uma captura por passo.
2. **Traga seu desenho** — DXF/SVG com furos, imagem vetorizada, fontes próprias (as telas da Sprint 28/29 contam isso sozinhas).
3. **Folha técnica** — a folha de oficina e o desenho cotado 1:1 impresso (diferencial que nenhuma ferramenta gratuita tem; mostrar a folha impressa).
4. **Exemplos prontos** — grade com 6 miniaturas da galeria (as `thumbs.json` já existem) linkando para o app com o exemplo aberto (`?exemplo=id`).
5. **Para quem é / o que não é** — honestidade: router de bancada, MDF/compensado/pinus; não substitui CAM industrial. Tom da oficina, sem promessa inflada.
6. **Perguntas rápidas** — 4–5 (funciona offline? PWA sim; meus arquivos saem do navegador? não, tudo local; quanto custa? nada; que máquinas? GRBL/Marlin/LinuxCNC).

### C. Footer adequado

- Colunas: produto (Iniciar, Exemplos, Novidades/CHANGELOG), projeto (Sobre, GitHub se/quando público, Sugestões e problemas), legal (Privacidade, Cookies, Termos — âncoras que abrem no app), contato (e-mail do autor).
- Linha final: versão atual (via `define` no build da landing também), "feito no navegador, por quem usa router de bancada".

### D. Ganchos no app

- `?galeria=1` abre a galeria ao entrar; `?exemplo=<id>` abre o exemplo direto (com o mesmo `confirmDialog` se houver projeto em curso).
- Link "voltar ao site" discreto no menu do projeto (não roubar espaço da barra).

### E. Testes

- [x] e2e da landing (`landing.spec.ts`): sem bundle do app na raiz, Iniciar navega, redirect de `/#p=…` abre o projeto, âncora legal chega ao diálogo, a11y (axe) limpa.
- [x] e2e dos ganchos `?galeria=1` / `?exemplo=` (com e sem confirmação).
- [x] 31 specs migradas para `/app/`; smoke, SEO (canonical da landing e do app, sitemap duplo) e INP atualizados.

## DoD específica

- Link de compartilhamento antigo (`/#p=…`) abre o projeto no app sem intervenção.
- PWA instalada continua abrindo direto no editor; instalação nova funciona a partir de `/app/`.
- Landing < 100 KB transferidos (sem fontes bloqueantes; imagens lazy abaixo da dobra).
- SEO: title/description/OG próprios da landing; sitemap com `/` e `/app/`; sem regressão no `seo.spec.ts`.
- DoD global.

## Como ficou

- Vite multi-page via `rolldownOptions.input` (landing `index.html` + `app/index.html`); a landing sai sem nenhum `script type="module"` — só os dois scripts da Vercel (analytics/speed insights com rota `/`).
- Redirect de links antigos é a **primeira coisa** no `<head>` da landing (antes de qualquer pintura): `#p=`, `#privacidade`, `#cookies`, `#termos`, `#sobre` → `/app/` + hash.
- Miniaturas dos exemplos geradas no build (`gen:landing-thumbs` no `prebuild`, SVGs em `public/landing/`); heroes são capturas reais do app em WebP (~55 KB cada).
- Versão no footer via `%VITE_APP_VERSION%` (injetada no HTML pelo build).
- PWA: `start_url`/`scope` `/app/`, `navigateFallback` no HTML do app com denylist para a raiz.

## Fora do escopo

- Blog/documentação (o README cobre por ora).
- Domínio próprio (fica a critério do autor; a página não depende disso).
- i18n da landing (nasce pt-BR, como o app).

## Depois da sprint (nota)

Post de lançamento no LinkedIn com os updates das Sprints 28–32 — texto + imagem preparados à parte (o link vai no primeiro comentário, não no corpo do post).
