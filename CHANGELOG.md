# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem as sprints em `docs/sprints/`.

## [Não publicado]

### Corrigido
- Import da Function `/api/feedback` com extensão `.js` — o TypeScript da Vercel (`node16`/`nodenext`) recusava `./_lib/feedback-core`.
- `vercel.json`: removido `memory` (ignorado no Active CPU).

### Alterado
- **Tom da UI**: avisos, erros, Sobre, PWA e dicas passam a falar como oficina — curto e concreto, sem tom de manual.
- Regra de copy para agentes em `AGENTS.md`, `.cursor/rules/copy.mdc` e `ui.mdc` (Claude lê via `CLAUDE.md` → `AGENTS.md`).
- Testes: stub de `localStorage` no setup (Node 25 expõe um `localStorage` experimental sem `setItem`).

## [Planejado — Sprint 23]

- Acabamento de UX: diálogos próprios, origem visual, materiais no 3D, linha do tempo, textos, regras dos agentes, políticas — `docs/sprints/sprint-23-acabamento-ux.md`.

## [0.23.0 — Sprint 16 — Verificação, operações adicionais, link] — 2026-08-16

### Adicionado
- **Operações adicionais** por peça (Peça → Operações adicionais): a mesma geometria com rebaixo + recorte passante (ou outras combinações), com compensação, tabs, fresa e "cortar através" próprios.
- **Verificar** (simulador → Resultado): quanto de cada rebaixo/furo/furação não foi alcançado (cantos internos, vãos estreitos), raio mínimo da fresa e corte fora das peças.
- **Copiar link do projeto**: o projeto inteiro dentro da URL (`#p=…`); abrir o link carrega o projeto.

## [0.22.0 — Sprint 22 — Barra superior no estilo Fusion 360] — 2026-08-16

### Alterado
- **Barra superior em 3 linhas**: app bar (menu, **nome do projeto** editável, desfazer/refazer, Exportar), abas **Desenhar | Simular** + abas de contexto em caixa alta (FORMAS · USINAGEM · VISTA / REPRODUZIR), ribbon com **rótulo de grupo ▾** que abre o menu do grupo, item destacado, **Selecionar** fixo à direita, **tooltips ricos** (atalho + descrição) e ribbon **minimizável**.
- Aba **USINAGEM** espelha a peça selecionada (contorno/rebaixo/furação, por fora/por dentro/na linha, tabs) e atalhos de corte (hélice, ordem, abrir Corte/Exportar).
- Nome do projeto vai para o título da aba, o nome dos arquivos e o cabeçalho do G-code.
- Painel: abas com visual de abas, navegador mais compacto, menos padding.

## [0.21.0 — Sprint 21 — Primeiro uso, exemplos, acessibilidade, preferências] — 2026-08-16

### Adicionado
- **Comece por aqui**: card no editor vazio com 3 passos, atalhos (retângulo, importar, abrir, tour) e 3 **exemplos** prontos (placa com furos, porta-lápis com encaixes, letreiro gravado) — também no menu do projeto.
- **Tour rápido** (5 balões) na primeira visita em desktop; reabrível pelo menu.
- **Preferências**: densidade (compacta/confortável) e tamanho do texto (pequeno/normal/grande).
- Acessibilidade: axe sem violações sérias/críticas nas 3 vistas (contraste do texto secundário, navegador de peças sem controles aninhados).

### Planejado
- Sprint 22: barra superior no estilo Fusion 360 (`docs/sprints/sprint-22-ribbon-fusion.md`).

## [0.20.0 — Sprint 20 — Sugestões e problemas] — 2026-08-16

### Adicionado
- **Sugestões e problemas** (menu Oficina CNC e Sobre): formulário com tipo, título, mensagem, e-mail opcional, diagnóstico anônimo (versão, navegador, resumo do projeto, últimos erros) e projeto anexável (≤ 512 kB); referência curta ao enviar; fallback por e-mail quando o canal não está ativo ou falha; offline avisa.
- `api/feedback.ts` (Vercel Function) grava JSON privado no **Vercel Blob** (`feedback/AAAA-MM/…`), com validação, honeypot, rate limit 5/min por IP e CORS; `scripts/feedback-report.ts` lista os envios; `docs/feedback.md` (ativar, ler, LGPD).

## [0.19.0 — Sprint 19 — Versão, Sobre e Novidades] — 2026-08-16

### Adicionado
- **Versão visível**: menu do projeto, rodapé do editor, Sobre (com sha e data do build), cabeçalho do G-code e aviso de atualização do PWA. `package.json` passa a ser versionado por sprint (0.19.0).
- **Sobre** reescrito: propósito, público, autor **Kleber Andrade** (contato por e-mail), site, licença e lista de bibliotecas/fontes de terceiros.
- **Novidades**: diálogo com as últimas sprints do CHANGELOG; marcador "novo" no menu e ponto na marca quando a versão mudou desde a última visita.
- Esc fecha os diálogos do menu.

## [Sprint 18 — Painel em abas, ribbon adaptável, tipografia compacta] — 2026-08-16

### Alterado
- **Painel lateral**: 8 seções em acordeão → 4 abas (Peça com navegador, Máquina, Corte, Exportar), subgrupos com título, dicas curtas sob os campos; fontes menores (rótulos 12 px, campos 13 px).
- **Ribbon**: nunca rola nem corta — mostra rótulos quando cabe, passa a só ícones quando aperta e move os grupos menos usados para o menu **Mais ▾**; Alinhar/Distribuir virou um dropdown em Arranjar.
- Textos longos encurtados (compensação, unidades, rampa, furação, cortar através) com dica ao lado; rótulos com reticências mostram o texto completo no tooltip.
- Tokens de tipografia (`--fs-*`) e alturas de controle (30 px) em `index.css`.

### Testes
- `Ribbon.test.tsx`, e2e `layout.spec.ts` (4 larguras) e helpers `ribbonClick`/`alignClick`. Total: 266 unitários, 69 e2e.

## [Planejamento — Fase 4 e Fase 5] — 2026-08-16

- Auditoria de UI (painel com 8 seções, ribbon cortando em 1600 px, tipografia grande, textos cortados) → [`docs/sprints/fase-4.md`](docs/sprints/fase-4.md): Sprints 18 (painel/ribbon/tipografia), 19 (versão/Sobre/Novidades), 20 (sugestões e problemas via Vercel Function + Blob), 21 (primeiro uso, mensagens, acessibilidade, mobile); Sprint 16 movida para o fim da Fase 4; Sprint 17 (Web Serial) para o backlog da [Fase 5](docs/sprints/fase-5.md).

## [Sprint 15 — Nesting e booleanas] — 2026-08-16

### Adicionado
- **Booleanas** (grupo Arranjar: Unir / Subtrair / Intersec.): união, subtração (as outras da primeira selecionada) e interseção via Clipper → polígono com furos, herdando os parâmetros de corte da base; texto entra como polígonos; Ctrl+Z desfaz.
- **Organizar na chapa** (nesting): MaxRects por caixa envolvente, maiores primeiro, rotação 0/90 opcional, espaçamento = Ø fresa + folga; peças que não cabem ficam onde estão e são listadas; escopo = seleção (≥ 2) ou todas as visíveis/destravadas.
- Atalho **Ctrl+A** (selecionar tudo). `lib/boolean.ts`, `lib/nesting.ts`, `lib/transform.ts`.

### Corrigido
- Mover/alinhar/distribuir um polígono com furos não movia os furos.

### Testes
- `boolean.test.ts`, `nesting.test.ts`, store (`booleanSelected`/`nestOnStock`); e2e `nesting-boolean.spec.ts`. Total: 263 unitários, 64 e2e.

## [Sprint 14 — Hélice, furação, tempo com aceleração, pós-processadores] — 2026-08-15

### Adicionado
- **Hélice de entrada** nos rebaixos (Corte → "Hélice de entrada", passo por volta): descida em hélice linearizada (G1) + volta plana no fundo, por passe; cai para mergulho vertical com aviso se o rebaixo for estreito.
- **Furação** (Peça → Operação, só círculos): mergulho no centro com **bicadas** (`peckDepth`) e retração à altura segura; aviso quando o furo é maior que a fresa.
- **Tempo com aceleração** (Corte → "Aceleração dos eixos", mm/s², padrão 200; 0 = modelo antigo): planner trapezoidal com velocidade de junção estilo GRBL — rodapé, simulador e cabeçalho do G-code.
- **Pós-processadores** (nova seção **Exportação**): GRBL, Marlin (modo CNC) e LinuxCNC/Mach3 (`.ngc`, comentários entre parênteses, `G64`, `(MSG,…)`, `M30`); **G20 (polegadas)** convertendo coordenadas e avanços.
- Persistência v7; amostras `docs/samples/sprint14-*`.

### Corrigido
- Rebaixos: linhas que terminavam exatamente na parede provocavam retração + G0 + mergulho a cada duas linhas; agora avançam direto pela parede (menos tempo, sem marcas de mergulho).

### Testes
- `timing` v2 (valores conferidos à mão), `post.test.ts` (3 pós + G20), furação e hélice em `toolpath.test.ts`; e2e `post-and-drill.spec.ts`. Total: 246 unitários, 63 e2e.

## [Sprint 13 — Pockets com ilhas e texto → contorno] — 2026-08-15

### Adicionado
- **Ilhas em polígonos** (`PathShape.holes`): rebaixos deixam o miolo intacto (linhas recortadas por outer − ilhas ofsetadas +r, com passe de parede nas ilhas); contornos "por fora" cortam os furos no tamanho (−r) e "por dentro" tratam-nos como material (+r); "na linha" traça tudo. Importação SVG: sub-paths fechados internos de um mesmo `<path>` viram furos do laço que os contém.
- **Texto** (`TextShape`, botão Texto / tecla T): fontes embarcadas Inter Regular/Bold (OFL, `public/fonts`, offline via PWA) com `opentype.js`; texto, fonte, tamanho (em mm), alinhamento, espaçamento, rotação; contornos amostrados a 0,1 mm, laços agrupados em outer + furos por glifo (letras com miolo preservado); expandido em um polígono por glifo para usinagem (`lib/expand.ts`), com handles, cotas inline (Tam), navegador e validação.
- `lib/text.ts` (registro/carga de fontes, `textToPolygons`, `nestLoops`), `lib/expand.ts`; `fontsVersion` no `uiStore` re-renderiza quando as fontes chegam.

### Testes
- `text.test.ts` (fonte carregada, "O" com 1 furo, "Oi" → 3 laços, alinhamento/rotação/espaçamento, `nestLoops`, expansão + G-code, pocket não invade a ilha e usina a parede); e2e `text.spec.ts` (texto → G-code com laço interno, cota inline/fonte/alinhamento, SVG com furo → pocket contorna a ilha). Total: 226 unitários, 60 e2e.

## [Identidade e SEO] — 2026-08-15

### Adicionado
- **Marca Oficina CNC**: SVG inline na TopBar e no Sobre (`BrandMark`); favicon e ícones PWA (192/512/maskable/180) na paleta blueprint, no lugar do raio roxo do Vite.
- **SEO**: Open Graph, Twitter Card, canonical, JSON-LD (`WebApplication`), `robots.txt` e `sitemap.xml` apontando para `https://oficina-cnc.vercel.app/`; imagem social `og-image.png`.
- Título da aba acompanha a vista (`Desenhar` / `Simular — Oficina CNC`).
- **Speed Insights** (`@vercel/speed-insights`) e **Web Analytics** (`@vercel/analytics`): Web Vitals e visitas no dashboard da Vercel.
- Build: simulador (Three.js) em chunk sob demanda; Konva/Clipper/React separados — some o aviso de chunk > 500 kB no deploy.
- Wordmark **Oficina CNC** em Bricolage Grotesque (auto-hospedada), no lugar da Fraunces.

## [Sprint 11 — Navegador, fresas por peça, tema escuro, DXF] — 2026-08-15

### Adicionado
- **Navegador** (seção do painel): lista de peças = ordem manual de usinagem, com ícone do tipo, nome (renomear por duplo clique / campo Nome), **olho** (peça oculta não é usinada, simulada nem exportada — fica tracejada no canvas), **cadeado** (não move nem redimensiona), subir/descer e arrastar para reordenar, busca; clique seleciona, Shift+clique acumula.
- **Biblioteca de fresas** (seção Fresas): fresas extras com Ø, tipo (reta/esférica/V), avanço/mergulho/RPM opcionais; cada peça escolhe a fresa (Peça → Fresa). O percurso agrupa por fresa (padrão primeiro), o G-code emite `M5 / M0 ; TROCA DE FERRAMENTA … / M3` e lista as fresas no cabeçalho; o simulador troca o modelo 3D e o perfil de remoção de material na hora certa; compensação/pocket/stepover usam o Ø da fresa da peça.
- **Tema escuro** (Preferências → Tema: sistema/claro/escuro): tokens semânticos, canvas do editor com paleta própria, `data-theme` no `<html>`, `theme-color` do PWA, persistido.
- **Preferências** no menu do projeto (tema, preset de mouse do 3D — também no rodapé do simulador).
- **Importar DXF** (`lib/dxfImport.ts` com `dxf-parser`): LINE, LWPOLYLINE/POLYLINE com bulges (arcos), CIRCLE, ARC, ELLIPSE, SPLINE (De Boor), INSERT de blocos com escala/rotação, `$INSUNITS` (mm/in/cm/m), avisos do que foi ignorado (texto, cotas, hachuras). Botão "Importar" aceita SVG e DXF.
- Store: `moveShape`, `addTool/updateTool/removeTool`; `Shape.name/hidden/locked/toolId`; `MachineSettings.tools`; persistência v6.

### Testes
- `tools.test.ts` (resolução, agrupamento, M0, ocultas), `dxfImport.test.ts` (fixture com bulge/bloco/inch, ARC/ELLIPSE/SPLINE), Navigator/ToolLibrary, useTheme/useMediaQuery, uiStore; e2e `navigator.spec.ts` (ocultar some do G-code, reordenar, renomear, troca de fresa gera M0, tema escuro persiste, DXF importa). Total: 220 unitários, 57 e2e.

## [Sprint 09 — Formas: cantos, handles, medidas inline, snap] — 2026-08-15

### Adicionado
- **Cantos de retângulo**: vivos, arredondados (raio, arco amostrado a 0,05 mm) ou chanfrados, por canto (seletor visual dos 4 cantos), com o tamanho limitado a metade do lado menor — a geometria alimenta contorno, pocket, compensação e simulação.
- **Novas primitivas**: polígono regular (raio, nº de lados, rotação — N) e rasgo/oblongo (comprimento, largura, rotação — O; nasce como furo "por dentro").
- **Handles no canvas** (Konva Transformer): redimensionar e girar retângulos, círculos, polígonos regulares, rasgos e polígonos livres (escala/rotação aplicadas nos pontos); Shift mantém proporção e trava a rotação em 15°; valores refletem no painel.
- **Cotas inline** ao lado da forma selecionada (L/A, R, R/N, L/A): Tab alterna, Enter confirma, Esc cancela.
- **Snap** (S / botão Snap): bordas e centros da chapa e das outras formas, com guias magenta; Shift durante o arraste desliga; clamp à mesa mantido.
- **Seleção múltipla**: Shift+clique e marquee no fundo; **Alinhar** (esq./centro/dir./topo/meio/base) e **Distribuir** (H/V) na ribbon (grupo contextual) e no painel; setas movem e Del apaga toda a seleção; `selectedIds` no store (undo continua por operação).
- Store: `toggleSelect`, `selectMany`, `removeSelected`, `alignSelected`, `distributeSelected`; `editorMath.snapBox/buildSnapTargets/snapToGrid`.

### Testes
- Geometria (fillet/chamfer/which/clamp, ngon, slot), snap, seleção/alinhar/distribuir, InlineDimensions, ViewCube, BottomBar/Sheet, uiStore, pwa; e2e `shapes.spec.ts` (fillet no G-code, ngon/slot, cotas inline, handle de redimensionar, snap ao centro da chapa, marquee + alinhar + Delete). Total: 204 unitários, 52 e2e.

## [Sprint 10 — Simulador realista] — 2026-08-15

### Adicionado
- **Remoção de material** (`lib/heightmap.ts`): a chapa vira um campo de alturas (resolução adaptativa 0,25–2 mm, ≤ 250 k células) esculpido pela fresa ao longo do tempo — perfis reto, esférico e V; avanço incremental durante a reprodução e recomputação ao voltar na linha do tempo (pocket 200×150 mm, Ø3, res 0,5 mm: ~50 ms). Superfície colorida por profundidade (bege → escuro; marrom onde atravessa), laterais da chapa sólidas, sombras.
- **Fresa 3D realista** (`lib/toolModel.ts`): ponta reta / esférica / V com ângulo, flautas com sulcos helicoidais, haste, porca ER11, nariz e corpo do spindle, materiais metálicos; `settings.toolType` e `vbitAngle` (seção Material & ferramenta; persistência v5).
- **ViewCube** estilo Fusion (CSS 3D sincronizado com a câmera): faces TOPO/BASE/FRENTE/TRÁS/ESQ/DIR clicáveis, botões Home, Isométrica e Ortográfica/Perspectiva; câmera anima entre vistas (260 ms); zoom no cursor; preset de mouse "Padrão" ou "Fusion" (meio = mover) salvo localmente; iluminação de 3 pontos + hemisférica, grade da mesa, névoa.
- Ribbon (aba Simular): Ajustar / Vista superior / Isométrica ligados à nova câmera; overlay com tempo total e custo da malha.

### Testes
- `heightmap.test.ts` (perfis, recorte passante, fundo plano do pocket, incremental/scrub, desempenho), `toolModel.test.ts`; e2e `simulator3d.spec.ts` (volume removido cresce e volta ao scrub, ViewCube/vistas movem a câmera, ortográfica, tipo de fresa). Total: 182 unitários, 46 e2e.

## [Sprint 08 — Responsivo e PWA] — 2026-08-15

### Adicionado
- **Layouts por breakpoint** (`useLayout`): desktop ≥ 1200 px (painel fixo), tablet 768–1199 px (painel vira gaveta sobreposta, fechada por padrão), celular < 768 px (barra superior compacta, **barra inferior de ações** com formas/undo/redo/excluir ou transporte da simulação, **folha inferior** arrastável/expansível com todas as seções de ajustes, rodapé compacto).
- **Toque**: pinça = zoom e dois dedos = mover no editor; toque adiciona vértices do polígono com botão "Fechar polígono"; alvos ≥ 44 px em ponteiros grosseiros; inputs com teclado numérico e 16 px (sem zoom do iOS); `touch-action: none` nos canvas; `safe-area-inset`.
- **PWA**: `vite-plugin-pwa` (manifest pt-BR, ícones 192/512 + maskable + Apple touch, `display: standalone`, service worker com precache de build e fontes, `autoUpdate` com aviso "Nova versão disponível → Atualizar"), fontes **auto-hospedadas** via `@fontsource` (Inter, JetBrains Mono, Fraunces) — nada mais vem do Google Fonts; funciona offline após a primeira visita; entrada "Instalar aplicativo" no menu do projeto (Chrome/Edge/Android) e dica para iOS.
- `BottomBar`, `BottomSheet`, `PwaBanner`, `lib/pwa.ts` (store: `needRefresh`, `canInstall`, `update`, `install`).

### Testes
- Playwright com projetos `chromium` (desktop), `mobile-chrome` (Pixel 7) e `tablet-chrome` (iPad, Chromium): fluxo completo por toque, sem scroll horizontal, alvos ≥ 40 px, pinça muda o zoom; `pwa.spec.ts`: manifest válido, SW ativo, sem Google Fonts, **abre e funciona offline**. Total: 173 unitários, 43 e2e (+1 skip condicional).

## [Sprint 07 — Interface unificada (ribbon), espaçamento, ícones] — 2026-08-15

### Adicionado
- **TopBar** única (64 px) estilo Fusion: menu do projeto no logo (Novo, Abrir, Salvar, Importar SVG, Exportar, Atalhos, Sobre), abas Desenhar/Simular que trocam os grupos da ribbon (Projeto · Criar · Modificar · Vista / Reproduzir · Ajustes · Vista), Exportar G-code à direita, botão do painel lateral. Diálogo de atalhos e "Sobre".
- Controles de transporte da simulação (início/anterior/play/próximo/fim, velocidade, passo, Ajustar/Vista superior/Isométrica) movidos para a ribbon; abaixo do 3D ficam a linha do tempo e o status.
- Ícones `lucide-react` em toda a UI (ribbon, menu, acordeão, avisos, status, legenda) — nenhum emoji/glifo unicode decorativo.
- Tokens de design (`--s1..--s6`, alturas de controle, semânticos prontos para tema escuro) e `docs/design-tokens.md`.
- `useProjectActions` (hook com as ações e atalhos globais; substitui `ActionBar`); `uiStore.view` e `uiStore.simCamera`.

### Corrigido
- Campos numéricos cortando o valor (X/Y/Z da máquina): mínimo 72 px de texto, sufixo com reticências, linhas de campos em grid `auto-fit` (3 → 2 + 1).
- Padding interno dos containers ≥ 12 px, gap consistente entre campos, checkbox com margem, seções do acordeão não são mais cortadas (`flex: none`).

### Testes
- `TopBar.test.tsx`; e2e: barra ≤ 64 px e troca de contexto, menu/diálogo, campos sem corte em 1280/1024/800 px, padding ≥ 12 px. Total: 173 unitários, 36 e2e.

## [Sprint 06 — Qualidade de usinagem] — 2026-08-15

### Adicionado
- `lib/offset.ts` (Clipper): offset de polígonos com junções redondas, `scanlineSpans`, `perimeter`, `pointAlong`.
- **Compensação da fresa** por contorno (`shape.side`): por fora (recorte fica no tamanho), por dentro (furo fica no tamanho) ou na linha. Novas formas nascem "por fora"; formas antigas continuam "na linha" (G-code inalterado). Furo/rebaixo menor que a fresa vira erro de validação e bloqueia a exportação.
- **Pocket real**: scanlines recortadas pelo polígono ofsetado para dentro (múltiplos vãos por linha, salto com retração quando a ligação sairia da forma) + passe de acabamento na parede, por passe de profundidade.
- **Ordem de usinagem** (`settings.orderMode`): automática (rebaixos → furos → recortes, mais próximo primeiro) ou manual.
- **Tabs (pontes)** por contorno (`shape.tabs`: quantidade, largura, altura) — só nos passes abaixo do topo da ponte.
- **Rampa de entrada** (`settings.rampAngle`, 0 = mergulho vertical): descida ao longo do próprio contorno; volta completa a partir do ponto em que atinge a profundidade.
- G-code: `G1 X Y Z F` para movimentos 3D (rampa), avisos do gerador de percurso como comentários.
- **SVG** reescrito (`parseSvg`): `viewBox` + `width/height` com unidades (mm, cm, in, px, pt), `transform` aninhados (translate/scale/rotate/skew/matrix), `rect` com cantos arredondados, `circle`/`ellipse`/`polygon`/`polyline`/`line`, `path` com **curvas e arcos amostrados** (`svg-path-properties`, tolerância 0,1 mm), eixo Y espelhado para o desenho manter a orientação, avisos do que foi aproximado/ignorado (texto/imagem/use) exibidos no aviso de importação. `parseSvgToShapes` mantido.
- Painel: Compensação da fresa e Pontes na seção Peça; Rampa e Ordem de usinagem na seção Corte.
- Amostras: `baseline-v1.gcode`, `sprint06-compensacao-tabs-rampa.gcode`, `generate-samples.ts`.

### Alterado
- Persistência v4 (`rampAngle`, `orderMode`).
- Baseline de regressão passa a ser `baseline-v1.gcode` (o motor mudou de propósito: pocket dentro da forma e ordem automática).

### Testes
- `offset.test.ts`, toolpath (46×36 / 34×24 / 40×30, tabs, rampa, ordenação, pocket dentro do círculo ofsetado, formas menores que a fresa), `svgImport.test.ts` com fixture Inkscape (px + mm); e2e `machining.spec.ts`. Total: 169 unitários, 32 e2e.

## [Sprint 05 — Toolbar reorganizada] — 2026-08-15

### Adicionado
- **ActionBar** (topo, ícones próprios em `public/icons.svg`): Novo · Abrir/Salvar projeto `.json` · Importar SVG · Desfazer/Refazer · Retângulo · Círculo · **Polígono** (cliques no canvas, Enter/duplo clique fecha) · Duplicar · Excluir · Zoom −/%/+ · Exportar G-code. Rótulos escondidos abaixo de 1400 px (tooltips permanecem).
- **SidePanel** em acordeão (uma seção aberta por vez, resumo na seção fechada): Peça selecionada (X, Y, largura/altura ou raio, **rotação**, profundidade, cortar através, operação), Máquina, Chapa/base, Material & ferramenta, Corte (GRBL). Colapsável pelo botão ☰ do cabeçalho.
- **StatusBar** (rodapé): mesa/chapa, nº de formas, tempo estimado, avisos/erros clicáveis (selecionam a forma e abrem a seção Peça).
- `NumberField`: unidade sufixada, min/max/step, setas ± (Shift ×10), Enter confirma, nunca envia valor inválido ao store.
- **Undo/redo** (`zundo`, 100 estados, só formas+configurações) — botões e Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z.
- **Salvar/abrir projeto** `.json` versionado (`lib/projectFile.ts`, mesmo `migrateProject` da persistência) — Ctrl+S salva.
- Editor: **zoom** (roda, +/−/0, botões) e **pan** (espaço + arrastar ou botão do meio); polígono com pré-visualização; retângulos rotacionam em torno do centro (coerente com o G-code).
- Atalhos: R/C/P (formas/polígono), Del, Ctrl+D, setas movem 1 mm (Shift = 10 mm), Esc desseleciona/cancela, +/−/0 zoom.
- `state/uiStore.ts` (aviso, seção aberta, zoom/pan, ferramenta ativa, painel), ações `duplicateShape`, `nudgeShape`, `loadProject`, `translateShape` no store.

### Alterado
- `Toolbar.tsx` virou apenas um wrapper de `ActionBar + SidePanel + StatusBar` (o App posiciona cada parte); todos os `data-testid` anteriores foram mantidos.

### Testes
- Toolbar reescrito para a nova UI (undo/redo, atalhos, duplicar, salvar/abrir, polígono, status bar), `NumberField.test.tsx`, `projectFile.test.ts`; e2e `toolbar.spec.ts` (undo/redo, salvar→abrir, edição numérica ↔ canvas, polígono, zoom, atalhos, painel). Total: 154 unitários, 27 e2e.

## [Sprint 02 — Materiais e ferramenta] — 2026-08-15

### Adicionado
- `lib/materials.ts` — presets MDF, Compensado, Pinus e Alumínio (avançado) com avanço, mergulho, RPM, fator de passe e de stepover por Ø da fresa; `applyMaterial` (respeita campos manuais; `force` restaura), `applyToolDiameter`, `suggestedParams`.
- `MachineSettings.material`, `stepover` (mm, substitui o `0.6 × Ø` fixo do pocket) e `overrides` (campos editados à mão); persistência v3 com migração (`stepover` derivado do Ø).
- Toolbar: seção **Material & ferramenta** (material com notas/aviso "avançado", Ø da fresa) e seção **Corte (GRBL)** com badge "manual" por campo, "restaurar preset", mergulho, stepover e altura segura expostos.
- Propriedades da peça: **Cortar através (espessura + 0,2 mm)** — `shape.cutThrough`, profundidade acompanha a espessura da chapa.
- G-code: cabeçalho `; material MDF | tool Ø6mm | stepover 3mm | pass 3mm`; `stepover` validado.

### Testes
- `materials.test.ts`, store (migração v3, ações de material/ferramenta/cortar através), Toolbar, G-code; e2e `materials.spec.ts`. Total: 143 unitários, 20 e2e.

## [Sprint 04 — Simulador: tempo real, step/step, barra de tempo] — 2026-08-15

### Adicionado
- `lib/playback.ts` — `segmentIndexAt` (busca binária), `positionAt` (interpolação linear no tempo), `boundariesFor` (fronteiras por segmento/passe/forma), `nextBoundary`/`prevBoundary`, `progressAt`.
- `state/simStore.ts` — player orientado a tempo: `t`, `playing`, `speed` (0,25×–8×), `stepMode`, `tick(dt)`, `seek`, `stepForward/Back`, `reset`, `toEnd`; pausa automática no fim; play no fim reinicia.
- `SimulatorControls.tsx` — ⏮ ⏪ ▶/⏸ ⏩ ⏭, velocidade, modo de passo, **barra de tempo** com scrub e marcadores de fim de forma, decorrido/total/restante, forma/passe/operação atual, linha G-code atual, atalhos (espaço, ←/→, Home/End), botões Ajustar e Vista superior.
- Cena 3D: mesa e chapa (caixa translúcida com espessura real), eixos, percurso já cortado em âmbar e futuro em azul, rapids tracejados, ferramenta como cilindro com Ø real, `OrbitControls`.
- Simulação em tempo real: a 1×, o tempo simulado acompanha o relógio (verificado 5,37 s simulados em 5,36 s de parede).

### Alterado
- `Simulator.tsx` reescrito sobre `buildToolpath` + `estimateTime` (não há mais player por índice).

### Testes
- `playback.test.ts`, `simStore.test.ts`; e2e `simulator.spec.ts` (play, step, scrub, modo forma, teclado). Total: 127 unitários, 17 e2e.

## [Sprint 03 — Motor único de percurso e estimativa de tempo] — 2026-08-15

### Adicionado
- `lib/toolpath.ts` — `buildToolpath(shapes, settings)` gera `Segment[]` (from/to/tipo/feed/shapeId/passe/operação) em coordenadas de trabalho; é a única fonte de percurso para o G-code **e** o simulador (corrige o achado A2 da auditoria).
- `lib/timing.ts` — `estimateTime` (v1: comprimento/avanço por segmento; rapids a `rapidRate`), `formatDuration`, `formatClock`.
- `MachineSettings.rapidRate` (padrão 3000 mm/min) com campo na toolbar; migração preenche projetos antigos.
- Tempo estimado exibido na toolbar, no simulador e no cabeçalho do G-code (`; tempo estimado: 2m21s`).
- `lib/passes.ts` (`buildPassDepths` movido; re-exportado por `gcode.ts`).

### Alterado
- `generateGCode` passou a serializar segmentos (`segmentsToGCode`); paridade com `docs/samples/baseline-v0.gcode` verificada (diff vazio fora do cabeçalho).
- `Simulator` consome `buildToolpath` (multi-passe, pocket e alturas seguras agora aparecem na simulação). `buildSimulationPath` removido.

### Testes
- `toolpath.test.ts`, `timing.test.ts`; e2e do tempo estimado. Total: 111 unitários, 12 e2e.

## [Sprint 01 — Mesa, base e origem] — 2026-08-15

### Adicionado
- `WorkArea` (área útil X/Y/Z), `Stock` (chapa: dimensões, espessura, posição, origem) e `machinePreset` em `MachineSettings`; presets 3018/3040/6040/6090/1010/1325 + Personalizada (`lib/machinePresets.ts`).
- `lib/validate.ts` — `validateProject` gera avisos/erros: forma fora da mesa (erro), fora da chapa (aviso), profundidade > espessura (aviso "corte passante"), > curso Z (erro), chapa fora da mesa, altura segura > Z.
- Editor: canvas passa a ser a mesa em mm, com escala ajustada ao viewport (`fitScale`), grade adaptativa (`gridStepFor`) com réguas, chapa desenhada, marcador da origem (0,0), arrasto limitado à mesa (`clampShapeToTable`), formas com aviso/erro coloridas em âmbar/vermelho; paths SVG agora são arrastáveis. Eixo Y aponta para o fundo da máquina (convenção CAM).
- Toolbar: seções **Máquina** (preset + X/Y/Z) e **Chapa / base** (largura, altura, espessura, posição, origem) e lista de **Avisos**.
- G-code: cabeçalho `; machine … | stock … origin …`, avisos como comentários, coordenadas transformadas pela origem escolhida (`workOriginOffset`), exportação bloqueada por erros de validação.
- Novas formas nascem dentro da chapa com profundidade = espessura da chapa.
- Persistência v2 (`migrateProject` preenche `workArea`/`stock`/`machinePreset` em projetos antigos).
- Testes: `validate`, `machinePresets`, `editorMath`, origem/cabeçalho do G-code, migração v1→v2, store; e2e `machine-and-stock.spec.ts` (preset, erro bloqueando export, aviso permitindo export, arrasto limitado). Total: 103 unitários, 11 e2e.

## [Sprint 00 — Fundação] — 2026-08-15

### Adicionado
- CI (GitHub Actions): lint + testes unitários com cobertura, e job E2E com Playwright (`.github/workflows/ci.yml`).
- Persistência do projeto (formas + configurações) em `localStorage` via `zustand/persist`, com `version`/`migrate` (`migrateProject`).
- Botão **Novo projeto** na toolbar (limpa formas e restaura configurações padrão).
- Componente `Notice` (aviso inline, `role="alert"`) substituindo `window.alert`.
- `parseNumberInput` — campos numéricos mantêm o último valor válido quando ficam vazios/inválidos.
- `validateSettings`/`validateShapes`/`tryGenerateGCode`/`GCodeError` em `lib/gcode.ts` — a exportação mostra os problemas em vez de lançar exceção.
- `lib/ids.ts` — ids únicos com `crypto.randomUUID()` (fallback com contador), compartilhados por store e importador SVG.
- `docs/auditoria.md`, `docs/sprints/` (planejamento com DoD), `docs/samples/baseline-v0.gcode` (baseline de regressão do G-code).
- `playwright.config.ts` aceita `PW_CHROMIUM_PATH` para usar um Chromium pré-instalado.

### Alterado
- `@types/three` movido para `devDependencies`.
- `Simulator`: `totalSteps` memoizado; `rebuiltCount` declarado antes do closure.
- README: seção de sprints, CI e nota de e2e atualizada.

### Testes
- 80 testes unitários (antes 64); 7 e2e (antes 5) — todos passando.
