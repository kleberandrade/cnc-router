# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem as sprints em `docs/sprints/`.

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
