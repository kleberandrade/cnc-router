# Fase 4 — Usabilidade, UI/UX e produto

**Data:** 2026-08-16 · **Base:** Fases 1–3 concluídas até a Sprint 15 (263 testes unitários, 64 e2e). Deploy: Vercel (`oficina-cnc.vercel.app`).

## Motivação (auditoria de UI feita em 2026-08-16)
- **Painel lateral** com 8 seções em acordeão (Navegador, Peça, Máquina, Chapa, Material & Ferramenta, Fresas, Corte, Exportação): conceitos repetidos (Ø da fresa em "Material & Ferramenta" e "Fresas"; parâmetros de corte espalhados), muita rolagem, resumos monoespaçados que estouram (`GRBL (1.1 / grblHAL) …`).
- **Ribbon**: em 1600 px já corta o grupo *Arranjar* (rótulo "ARR.", Subtrair/Intersec. fora da tela) e esconde *Vista*; em 1280 os rótulos somem inteiros e o grupo *Projeto* some (fica só no menu). Falta um overflow explícito ("Mais…") e priorização por uso.
- **Tipografia**: campos 14 px, rótulos 13 px, rótulos da ribbon 11 px, cabeçalhos de seção 11 px em caixa alta — desproporcional para uma ferramenta densa; textos longos em `<select>` são cortados ("Por fora (recorte — peça fica no t…"), rótulos de checkbox quebram em 2 linhas ("Cortar através (espessura + 0,2 mm)").
- **Produto**: não há versão visível, o "Sobre" não diz quem faz nem como contribuir, não existe canal de sugestões/problemas.

## Sprints
| Sprint | Tema | Depende de | Esforço |
|---|---|---|---|
| [18](sprint-18-painel-e-ribbon.md) | Reorganização do painel lateral e da ribbon; escala tipográfica compacta; fim de textos cortados | — | M |
| [19](sprint-19-produto-versao-sobre.md) | Identidade do produto: versão visível (app, G-code, PWA "nova versão"), Sobre com autor/licença/novidades, changelog no app | — | P |
| [20](sprint-20-feedback-vercel.md) | Sugestões e problemas: formulário no app → Vercel Function → Vercel Blob; diagnóstico anexado; leitura pelo autor | 19 | M |
| [21](sprint-21-usabilidade-onboarding-a11y.md) | Usabilidade: primeiro uso/estado vazio, exemplos, tooltips e mensagens, acessibilidade (foco, contraste, teclado), refinamentos mobile | 18 | M |
| [22](sprint-22-ribbon-fusion.md) | Barra superior no estilo Fusion 360: app bar com nome do projeto, workspace + abas em caixa alta, ribbon com menus de grupo ▾, Selecionar à direita, tooltips ricos, ribbon minimizável | 18 | M |
| [23](sprint-23-acabamento-ux.md) | Acabamento: diálogos próprios (sem `confirm`), espaçamentos/abas do painel, seletor visual de origem, cores por material no 3D, linha do tempo do projeto, copy humanizado, regras dos agentes, políticas (cookies/privacidade/termos) | 22 | G |
| [24](sprint-24-exemplos.md) | Exemplos úteis + biblioteca com categorias + ilustrações nas opções + notice compacto | 21, 23 | M |
| [23](sprint-23-acabamento-ux.md) | Acabamento: diálogos próprios (sem `confirm`), espaçamentos/abas do painel, seletor visual de origem, cores por material no 3D, linha do tempo do projeto, copy humanizado, regras dos agentes, políticas (cookies/privacidade/termos) | 22 | G |
| [24](sprint-24-exemplos.md) | Exemplos úteis + biblioteca com categorias + ilustrações nas opções + notice compacto | 21, 23 | M |
| [16](sprint-16-verificacao-operacoes-compartilhar.md) | (da Fase 3) Verificação de sobrecorte, múltiplas operações por forma, compartilhar por link | 13, 14 | M |

Ordem recomendada: 18 → 19 → 20 → 21 → 22 → 16. A Sprint 17 (Web Serial) e o restante do backlog técnico foram para a [Fase 5](fase-5.md).

## Decisões
- Autor: **Kleber Andrade** (`pdjkleber@gmail.com`) — aparece no Sobre, README e no cabeçalho do G-code (`; Oficina CNC vX.Y.Z — Kleber Andrade`).
- Feedback: **Vercel Function + Vercel Blob** (sem banco). Cada envio vira um JSON `feedback/AAAA-MM/<timestamp>-<id>.json` no Blob; o autor lê pelo dashboard da Vercel ou `vercel blob ls`. Rate limit simples por IP (KV não; usa cabeçalho + janela em memória da função + honeypot). Sem dados pessoais obrigatórios (e-mail opcional).
- Versão: `package.json` passa a ser versionado semanticamente (`0.15.0` = fecha a Sprint 15; a cada sprint sobe o minor); `vite define` injeta `__APP_VERSION__`, `__BUILD_DATE__` e `__GIT_SHA__` (`VERCEL_GIT_COMMIT_SHA` no deploy).
- Escala tipográfica alvo (desktop): base 13 px; campos e selects 13 px; rótulos 12 px; cabeçalhos de seção 12 px sem caixa alta forçada; ribbon 10,5–11 px; status/rodapé 11 px monoespaçado. Mobile mantém 16 px nos inputs (evita zoom do iOS).
- Layout do painel: 4 seções fixas em vez de 8 — **Peça** (com Navegador embutido no topo), **Máquina & chapa**, **Fresas & corte** (material, Ø, biblioteca de fresas, parâmetros, entrada/hélice/furação, ordem), **Exportação** (pós, unidades, aceleração, G-code) — mais busca rápida de campo (`/`).
