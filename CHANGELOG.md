## [0.35.3 — Maintenance — Render paused simulation on demand] — 2026-11-16

- Stop issuing GPU draw calls for an unchanged paused scene; invalidate on camera,
  project, projection, viewport or playback updates.
- Add a real-browser regression test for idle rendering and camera redraws.
- Run the latency budget with software WebGL consistently on local/CI hosts, with
  no workflow retries for that test and the original 200 ms/4× CPU budget.

## [0.35.2 — Maintenance — Feedback boundaries and supported toolchain] — 2026-11-15

- Bound feedback streams by bytes, validate optional fields, store recognized fields only,
  and keep storage provider details out of HTTP responses.
- Keep numeric editing drafts separate from external dimensions to prevent delayed
  synchronization from corrupting values or showing stale dimensions after resizing.
- Refresh dependencies, use Node 26 LTS in CI and document remaining build-tool advisories.
- Add an offline G-code example, English usage/contributor documentation, truthful badges,
  MIT for original work and the missing Inter OFL notice; preserve third-party rights.
- Record repository visibility review limitations; no physical machining was tested.

# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem as sprints em `docs/sprints/`.

## [0.35.1 — Ajuste — A análise roda sozinha] — 2026-08-22

### Corrigido
- Marcou apoio e carga, a análise dispara sozinha — sem precisar de Calcular (que segue lá para rodar de novo). Um guia de passos mostra o que falta ("1 de 2: apoiar", "2 de 2: carregar") e o "Calculando…" aparece enquanto a conta roda.
- A mensagem de erro antiga não fica mais na tela depois que você marca um lado ou mexe na carga.

## [0.35.0 — Sprint 34 — Conjunto de verdade] — 2026-08-22

### Corrigido
- **Cantos arredondados separam os lados**: a tábua de carnes (e qualquer peça de canto arredondado) deixava o contorno inteiro virar um lado só, impossível marcar apoio E carga. Agora a curva acumulada separa as arestas; borda de furo redondo continua um lado só, um clique.
- **O conjunto entende o corte**: contorno por fora é peça; furação e recorte por dentro que atravessam a chapa são descontados como furo (o rasgo da alça vira furo de verdade no cálculo e no 3D). Rebaixo parcial e gravação não mudam o contorno, e o aviso diz isso.

### Adicionado
- **Folha técnica do conjunto**: a página "Conjunto (peças coladas)" mostra o desenho cotado do conjunto montado, com os furos descontados — só aparece quando o conjunto difere das peças soltas.

## [0.34.0 — Sprint 33 — Resistência no conjunto] — 2026-08-22

### Adicionado
- **Análise no conjunto**: na estação Resistência, o alternador "Uma peça | Conjunto" faz as peças encostadas no desenho valerem como um corpo só (juntas coladas) — apoios e cargas vão nos lados do conjunto e o mapa de tensão mostra as linhas das peças por cima, para as juntas ficarem visíveis. Folga de até 0,5 mm (a folga típica de encaixe) ainda conta como encostado. Validado: duas chapas coladas se comportam como a peça única equivalente.
- Peças afastadas não rodam por engano: a estação mostra quantos grupos separados existem e explica como fechar.
- A vista "Peça em 3D" no conjunto extruda a região colada inteira.
- O aviso orientativo ganhou a frase da junta: no conjunto, a junta vale como cola ideal — parafuso ou encaixe com folga aguentam menos.

## [0.33.0 — Sprint 31 — Resistência] — 2026-08-22

### Adicionado
- **Estação Resistência** no seletor de estações: análise estrutural orientativa da peça. No modo **no plano da chapa**, clique nos lados para marcar apoios (azul) e carga (laranja), informe os kg e calcule — o mapa de tensão de von Mises aparece colorido sobre a peça, com deformada exagerada opcional, deslocamento máximo e o percentual da resistência típica do material. A conta (malha + elementos finitos) roda em um worker, validada contra casos com resposta conhecida: viga engastada (±5%), placa com furo (concentração ≈ 3×) e tração pura.
- Modo **prateleira**: o caso clássico da chapa num vão com peso em cima — flecha no meio, limite prático de vão/300 e o veredito direto ("vai vergar visível: encurte o vão ou engrosse a chapa").
- **Peça pronta em 3D**: a extrusão limpa do desenho (contorno, furos e espessura) para girar e conferir, com a cor do material.
- Materiais ganharam propriedades típicas (módulo E, Poisson, resistência, densidade) — com o aviso permanente: números orientativos, madeira varia de chapa para chapa; nada aqui substitui engenheiro.

## [0.32.0 — Sprint 32 — Landing page] — 2026-08-22

### Adicionado
- **Página inicial do projeto** em oficina-cnc.vercel.app: cover com o fluxo em três passos, as seções de importação e folha técnica, exemplos clicáveis (abrem direto no editor), perguntas rápidas e footer com privacidade e contato. O app agora vive em **/app/** — o botão Iniciar leva pra lá.
- Ganchos de entrada: `/app/?galeria=1` abre a galeria e `/app/?exemplo=<id>` abre um exemplo (pedindo confirmação se houver peças na mesa).

### Alterado
- Links antigos continuam valendo: compartilhamento `/#p=…` e âncoras (`#privacidade`, `#sobre`…) redirecionam para o app preservando o conteúdo; a PWA instalada segue abrindo direto no editor (`start_url` `/app/`).

## [0.31.0 — Sprint 30 — Estações de trabalho e folha técnica na tela] — 2026-08-22

### Adicionado
- **Estações de trabalho**: o switch Desenhar | Simular virou um dropdown (estilo Fusion) com três estações — **Desenhar**, **Simular** e a nova **Folha técnica**, pronta para receber as próximas (Resistência está no plano).
- **Estação Folha técnica**: as folhas em tela cheia antes de exportar — miniaturas das páginas, zoom ajustar/100%, e na ribbon: incluir a folha de setup, todas as peças ou só a selecionada, escala auto/1:1, **Imprimir** e **Baixar SVG** da página atual (vetor que abre no Inkscape, plotter ou laser). Ctrl+P e o menu Imprimir… levam direto pra cá; o diálogo de impressão da 0.30 saiu.

### Alterado
- Cobertura de testes virou piso: thresholds subiram para 82 % linhas / 77 % branches, com testes novos do diálogo de imagem (estava sem nenhum), da estação e um smoke com o caminho feliz completo (exemplo → editar → simular → folha → G-code).

## [0.30.0 — Sprint 29 — Imprimir e entrada rápida] — 2026-08-22

### Adicionado
- **Imprimir…** (menu do projeto ou Ctrl+P): **folha de oficina** em A4 para colar do lado da máquina — chapa com origem marcada, fresas (inclusive as extras, com as peças de cada uma), parâmetros de corte, tempo por peça e os avisos de validação; e **desenho técnico** de cada peça com cotas em mm — medidas gerais, furos agrupados ("3× Ø10") com posição, raio de canto — carimbo com escala e, quando a peça cabe na folha, **escala 1:1**: imprima em 100%, recorte e use como gabarito na madeira.
- **Arraste o arquivo pra tela**: DXF/SVG cai no diálogo de importação, imagem no de vetorização, projeto `.json` abre (pedindo confirmação se houver peças na mesa). Colar também funciona: imagem do clipboard ou SVG copiado como texto.
- **Tempo por peça** no navegador de peças — dá para ver num relance qual peça está custando o tempo do projeto.

### Corrigido
- Medições do Speed Insights sem rota ("Unknown"): a rota agora é definida na injeção do script, antes do React montar.

## [0.29.0 — Sprint 28 — Traga seu desenho] — 2026-08-22

### Adicionado
- **Furos no DXF**: laços fechados dentro de outro viram furo da peça em vez de contorno solto — o flange com 6 furos entra como uma peça, com a fresa compensando para dentro nos furos e para fora no contorno. O agrupamento acontece dentro de cada camada, e uma borda desenhada em volta de uma chapa de peças é reconhecida como moldura, não como peça.
- **Diálogo de importação** para DXF e SVG: prévia do desenho (com o furo aparecendo como vazio), quais camadas entram, unidade do arquivo com opção de sobrescrever, chave para desligar a inferência de furos e os avisos do arquivo — tudo antes das peças caírem na chapa.
- **Fontes suas**: carregue um `.ttf`/`.otf` pelo seletor de fonte do painel. Fica salva no navegador e volta na próxima visita; abrir um projeto cuja fonte não está aqui agora avisa em vez de trocar o texto em silêncio.
- **Explodir em contornos**: transforma um texto em contornos editáveis (os vazios das letras viram furos), preservando profundidade, operação, tabs e operações adicionais. Solta a peça da fonte — dá para editar ponto a ponto, usar nas booleanas e levar o texto junto no arquivo e no link.

### Corrigido
- `tsx` como `devDependency` — o `prebuild` (`gen:thumbs`) quebrava na Vercel com `tsx: command not found`.
- Import da Function `/api/feedback` com extensão `.js` — o TypeScript da Vercel (`node16`/`nodenext`) recusava `./_lib/feedback-core`.
- `vercel.json`: removido `memory` (ignorado no Active CPU).

### Alterado
- Sobre: link do autor para [kleberandrade.dev](https://kleberandrade.dev).
- **Tom da UI**: avisos, erros, Sobre, PWA e dicas passam a falar como oficina — curto e concreto, sem tom de manual.
- Regra de copy para agentes em `AGENTS.md`, `.cursor/rules/copy.mdc` e `ui.mdc` (Claude lê via `CLAUDE.md` → `AGENTS.md`).
- Testes: stub de `localStorage` no setup (Node 25 expõe um `localStorage` experimental sem `setItem`).

## [0.28.0 — Sprint 27 — INP e responsividade no celular] — 2026-08-16

### Alterado
- **Toques mais rápidos**: validação, percurso e tempo estimado agora são calculados num Web Worker, fora do clique (com cache por projeto); a galeria usa miniaturas pré-geradas (`thumbs.json`) em vez de construir os 14 exemplos ao abrir; a barra superior não re-renderiza a cada peça; a grade/mesa do editor fica numa camada estática; o simulador vira um chunk próprio pré-carregado quando o navegador está ocioso. Com CPU 4× mais lenta, os toques principais caíram de até 670 ms para menos de 200 ms.
- Diagnóstico: `?vitals=1` na URL mostra INP/LCP/CLS com atribuição no console.

## [0.27.1] — 2026-08-16

### Planejado
- Sprint 27: INP e responsividade no celular (Speed Insights: INP 816 ms no mobile) — `docs/sprints/sprint-27-inp-mobile.md`.

### Corrigido
- **Suporte de celular**: refeito no modelo clássico de 2 peças (encosto com rasgo lateral + prateleira com rasgo do outro lado e passagem do cabo, MDF 6 mm) — antes os rasgos eram fechados e as peças não montavam.
- **Tábua de carnes**: alça afastada da canaleta do suco.

### Alterado
- Exemplo "Relevo em 2,5D (imagem)" deu lugar ao **Pratinho côncavo (relevo 2,5D)** — mesmo recurso, peça útil (prato Ø150 com concavidade de 8 mm gerada por fórmula).

## [0.27.0 — Sprint 26 — Exemplos de encaixe e uso diário] — 2026-08-16

### Adicionado
- Seis exemplos novos: **Suporte de celular** (encaixe em cruz com folga), **Caixa com encaixe de dedo** (5 peças, dentes por fórmula), **Dobradiça viva** (kerf bending), **Bandeja com divisórias** (rebaixo profundo, paredes finas), **Descanso de panela** (2 peças organizadas) e **Gabarito de furação sistema 32**. Nova categoria **Encaixes**.
- Galeria: **filtro por assunto** (recorte, rebaixo, furação, texto, encaixe, booleanas, nesting, relevo, importação) com contagem, mais busca por texto.
- Aviso de **folga de encaixe**: rasgo com a largura exata da chapa ganha um aviso sugerindo 0,1–0,3 mm de folga.
- Exemplos com várias peças já abrem organizados na chapa.

### Removido
- Exemplos Porta-lápis, Letreiro e Placa de gato (cobertos por Bandeja, Número da casa e Pata/Raposa). Galeria fica com 14 exemplos em 6 categorias.

## [0.26.1] — 2026-08-16

### Planejado
- Sprint 26: exemplos de encaixe e uso diário + filtro por "o que ensina" na galeria — `docs/sprints/sprint-26-exemplos-encaixe.md`.

### Alterado
- Exemplos: os três escudos de times saíram (a arte oficial é marca registrada e não vamos distribuí-la). No lugar entra a categoria **Casa e oficina**: **Placa de número da casa** (moldura por diferença, número com fresa V, furos, cantos arredondados), **Relógio de parede** (rebaixo + recorte na mesma peça, anel, 12 marcadores por ângulo, números, furo do mecanismo) e **Par de engrenagens** (dentes por fórmula, furos de alívio por booleana, eixos por dentro).

## [0.26.0 — Sprint 25 — Importar imagem e relevo] — 2026-08-16

### Adicionado
- **Importar imagem (PNG/JPG/WebP/BMP)** em Arquivo → Importar: modo **Silhueta** vetoriza o preto em peças (com furos) — limiar automático, suavização, inverter, largura em mm, operação; modo **Relevo** transforma tons de cinza em relevo 2,5D (profundidade máxima, gama).
- **Peça Relevo**: usinagem em raster com compensação do perfil da fresa (reta, esférica, V), desbaste em passes + acabamento; miniatura em cinza no editor, campos próprios no painel, simula e exporta como as demais.
- **Rebaixo por contorno paralelo** (padrão para projetos novos): anéis de dentro para fora, um mergulho por passe; opção Corte → "Rebaixos: estratégia" (contorno / zigue-zague). Projetos antigos continuam em zigue-zague.
- Exemplos **Placa de raposa (imagem)** e **Relevo em 2,5D (imagem)**; cards dos escudos explicam que a arte oficial é marca registrada e apontam para Importar.
- Menu **Exemplos…** abre a galeria direto (o submenu por categoria saiu).

### Corrigido
- Peça importada de imagem já sai selecionada.

## [0.25.1] — 2026-08-16

### Corrigido
- **Rebaixo em anel/U subia e descia a fresa a cada linha** (tábua de carnes: 51 mergulhos): o zigzag agora segue a mesma faixa contínua e só pula quando a região acaba (6 mergulhos, tempo de 11,8 → 4,8 min).
- Diálogo: o foco não fica mais "pingando" entre o diálogo e o botão de origem (travava a página em máquinas lentas).
- Aviso compacto: só avisos informativos escondem os detalhes; alertas e erros mostram tudo.

## [0.25.0 — Sprint 24 — Exemplos e ilustrações] — 2026-08-16

### Adicionado
- **10 exemplos** em 5 categorias: tábua de carnes, escudos do São Paulo, Palmeiras e Corinthians (desenhos geométricos próprios), placas de gato, raposa e pata de cachorro importadas de SVG, além dos 3 anteriores. Menu **Exemplos ▸** por categoria e **galeria** com miniaturas e "o que ensina".
- **Ilustrações** ao lado das opções com variação visual: tipo de fresa, operação, compensação, cantos, entrada (mergulho/hélice), ordem, tabs.
- Aviso compacto no painel (1 linha, detalhes sob demanda) e aviso "percurso recalculado" ao trocar o Ø da fresa.

### Corrigido
- Validação "rebaixo menor que a fresa" considera a fresa escolhida para a peça.

## [0.24.0 — Sprint 23 — Acabamento de UX] — 2026-08-16

### Adicionado
- **Diálogos próprios** em todo o app (confirmar/perguntar sem janelas do navegador).
- **Origem da chapa visual**: clique no canto (ou centro) da miniatura da chapa; agora com os 4 cantos.
- **Cor da peça por material** no simulador (MDF, compensado, pinus, alumínio metálico).
- **Linha do tempo** do projeto no rodapé do editor: um marcador por mudança, clique volta/avança, ▶ reproduz a construção.
- **Privacidade, cookies e termos** (Sobre e `#privacidade`/`#cookies`/`#termos`) + aviso de armazenamento local na primeira visita.
- Regras dos agentes (`AGENTS.md`, rules, skill) atualizadas com a arquitetura atual.

### Corrigido
- **Rebaixo com furo (ex.: letra "A") cortava fora da peça** com fresas finas: a região a limpar agora é calculada como polígono-com-furos (Clipper) e cada ligação entre linhas é conferida ao longo do trajeto — nada de atravessar o miolo ou o vão entre as pernas.
- Conteúdo do painel aparecendo na faixa acima das abas ao rolar; largura do painel; padding e espaçamentos.

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
