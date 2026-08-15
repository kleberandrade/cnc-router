# Oficina CNC

Editor web para CNC router: desenhe peças (formas prontas ou SVG importado) sobre a mesa e a chapa da sua máquina, configure a máquina e exporte G-code (dialeto GRBL), com simulação 3D do percurso da fresa antes de rodar na máquina.

Funcionalidades atuais: simulador 3D em tempo real com remoção de material, fresa realista e ViewCube, passo a passo (segmento/passe/forma), barra de tempo e estimativa de tempo total; presets de máquina (3018, 3040, 6040, 6090, 1010, 1325 ou personalizada), presets de material (MDF, compensado, pinus, alumínio) que preenchem avanço/mergulho/RPM/passe/stepover a partir do Ø da fresa (com override manual), chapa/base com espessura, posição e origem (canto ou centro), validação de limites (fora da mesa/chapa, profundidade × espessura × curso Z), editor em mm com grade e réguas, exportação GRBL multi-passe (contorno e pocket), persistência local do projeto.

100% client-side — não precisa de servidor/backend para funcionar. Instalável como **PWA** (funciona offline) e responsivo (desktop, tablet e celular com toque).

## Stack

- **Vite + React + TypeScript**
- **Konva / react-konva** — editor 2D de formas
- **Three.js** — simulador 3D do toolpath
- **Zustand** — estado do projeto (formas + configurações da máquina)
- **Vitest + Testing Library** — testes unitários e de componente
- **Playwright** — testes end-to-end e smoke test

## Rodando localmente

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção (dist/) — estático, hospedável em qualquer CDN
npm run preview    # serve o build de produção localmente
```

## Testes

```bash
npm run test              # testes unitários (vitest)
npm run test:watch        # modo watch
npm run test:coverage     # com relatório de cobertura (thresholds: 80% linhas/statements/funções, 75% branches)

npx playwright install    # baixa os navegadores do Playwright (uma vez só)
npm run test:e2e          # end-to-end: desktop (chromium), celular (Pixel 7) e tablet (iPad) — todos em Chromium
npm run test:e2e:ui       # mesma coisa, com UI interativa do Playwright
```

Os dois conjuntos rodam no CI (GitHub Actions, `.github/workflows/ci.yml`) a cada push/PR. Para usar um Chromium
já instalado em vez de baixar, exporte `PW_CHROMIUM_PATH=/caminho/para/chrome` antes de `npm run test:e2e`.

### Estratégia de cobertura

A lógica de negócio pura (`src/lib/*` — geração de G-code, geometria, importação de SVG — e `src/state/store.ts`)
tem cobertura de testes unitários. `Toolbar.tsx` também é coberto via testes de componente (Testing Library).

`Editor.tsx` (canvas Konva) e `Simulator.tsx` (WebGL/Three.js) são **excluídos da cobertura unitária** de propósito:
jsdom não renderiza canvas/WebGL de verdade, então testar essas peças com mocks pesados dá falsa confiança.
Em vez disso, eles são cobertos pelos testes Playwright (`e2e/smoke.spec.ts`, `e2e/gcode-export.spec.ts`), que
rodam num navegador real e verificam o fluxo completo: adicionar forma → exportar G-code → simular percurso.

## Planejamento (sprints)

O roadmap está em [`docs/sprints/`](docs/sprints/README.md) — cada sprint tem escopo, checklist e Definition of Done.
A auditoria que originou o plano está em [`docs/auditoria.md`](docs/auditoria.md); o histórico de mudanças em [`CHANGELOG.md`](CHANGELOG.md).

## Arquitetura

```
src/
├─ types.ts              # Shape (retângulo c/ cantos, círculo, path, polígono regular, rasgo), MachineSettings
├─ lib/
│  ├─ geometry.ts         # shape → pontos (mm), bounding box, scanlines para pocket
│  ├─ toolpath.ts          # formas → Segment[] (compensação, pocket real, tabs, rampa, ordem) — fonte única
│  ├─ offset.ts            # offset de polígonos (Clipper), scanlines recortadas, perímetro
│  ├─ timing.ts            # estimativa de tempo por segmento/total
│  ├─ passes.ts            # profundidades por passe
│  ├─ playback.ts          # posição no tempo, fronteiras de passo (segmento/passe/forma)
│  ├─ heightmap.ts         # remoção de material (campo de alturas) para o simulador
│  ├─ toolModel.ts         # fresa 3D (spindle, pinça, haste, ponta reta/esférica/V)
│  ├─ gcode.ts             # Segment[] → G-code GRBL + validação/cabeçalho
│  ├─ svgImport.ts         # SVG (unidades, viewBox, transform, curvas amostradas) → Shape[] + avisos
│  ├─ validate.ts          # avisos/erros: limites da mesa, chapa, profundidade, Z
│  ├─ machinePresets.ts    # tamanhos comuns de router
│  ├─ materials.ts         # presets de material (MDF, compensado, pinus, alumínio) e escala por Ø
│  ├─ editorMath.ts        # escala/grade/clamp do editor (puro, testável)
│  ├─ projectFile.ts       # salvar/abrir projeto .json versionado
│  ├─ pwa.ts               # registro do service worker, atualização e instalação
│  ├─ numberInput.ts       # parse defensivo de campos numéricos
│  └─ ids.ts               # ids únicos de formas
├─ state/store.ts          # Zustand (+persist em localStorage): formas + configurações da máquina
├─ state/simStore.ts       # estado do player da simulação (tempo, velocidade, modo de passo)
├─ state/uiStore.ts        # estado de UI (aviso, seção aberta, zoom/pan, ferramenta ativa)
└─ components/
   ├─ TopBar.tsx            # barra única: menu do projeto, abas, ribbon por contexto, exportar
   ├─ useProjectActions.tsx # ações do projeto (formas, importar/abrir/salvar/exportar) + atalhos globais
   ├─ SidePanel.tsx         # painel em acordeão: peça, máquina, chapa, material, corte
   ├─ StatusBar.tsx         # rodapé: mesa/chapa, nº formas, tempo estimado, avisos clicáveis
   ├─ NumberField.tsx       # campo numérico com unidade/step/validação
   ├─ BottomBar.tsx         # barra de ações do celular
   ├─ BottomSheet.tsx       # folha inferior (ajustes) do celular
   ├─ PwaBanner.tsx         # aviso de atualização / instalar app
   ├─ Toolbar.tsx           # wrapper TopBar+SidePanel+StatusBar (usado nos testes)
   ├─ Notice.tsx            # avisos inline (substitui alert)
   ├─ Editor.tsx             # canvas 2D (Konva) — mesa em mm, chapa, handles, snap, marquee, polígono
   ├─ InlineDimensions.tsx   # cotas editáveis ao lado da forma selecionada
   └─ Simulator.tsx           # visualização 3D (Three.js) do percurso da ferramenta
```

## Extensões futuras sugeridas

- Texto → contorno (para gravação de nomes/logos) — hoje: converta texto em curvas no Inkscape antes de exportar o SVG
- Importar DXF além de SVG
- Nesting automático de peças na chapa

## Design

Tokens, regras de layout e ícones: [`docs/design-tokens.md`](docs/design-tokens.md).

## Convenções de coordenadas

- Internamente tudo é em **mm**, no sistema da **mesa**: X para a direita, Y para o fundo da máquina, origem no canto frontal esquerdo da área útil.
- A **origem de trabalho** (G54, X0 Y0 do G-code) é definida pela chapa: canto frontal esquerdo ou centro. O G-code exportado já sai transformado.
- SVGs importados são convertidos para mm (viewBox/width/height) e espelhados em Y, para que o desenho fique com a mesma orientação do arquivo.
- **Compensação da fresa**: contornos "por fora" mantêm o tamanho da peça, "por dentro" o do furo, "na linha" seguem o traçado com o centro da fresa. Rebaixos ficam sempre dentro da forma.

## Atalhos de teclado

R retângulo · C círculo · P polígono (Enter/duplo clique fecha, Esc cancela) · N polígono regular · O rasgo · S snap · Shift+clique / arrastar no fundo = seleção múltipla · Del excluir · Ctrl+D duplicar · Ctrl+Z / Ctrl+Y desfazer/refazer · Ctrl+S salvar projeto · setas movem 1 mm (Shift = 10 mm) · Esc desseleciona · roda do mouse zoom · +/−/0 zoom/ajustar · espaço + arrastar move a vista · no simulador: espaço play/pause, ←/→ passo, Home/End.
