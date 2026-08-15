# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem as sprints em `docs/sprints/`.

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
