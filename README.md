# Oficina CNC

Editor web para CNC router: desenhe peças (formas prontas ou SVG importado) sobre a mesa e a chapa da sua máquina, configure a máquina e exporte G-code (dialeto GRBL), com simulação 3D do percurso da fresa antes de rodar na máquina.

Funcionalidades atuais: presets de máquina (3018, 3040, 6040, 6090, 1010, 1325 ou personalizada), chapa/base com espessura, posição e origem (canto ou centro), validação de limites (fora da mesa/chapa, profundidade × espessura × curso Z), editor em mm com grade e réguas, exportação GRBL multi-passe (contorno e pocket), persistência local do projeto.

100% client-side — não precisa de servidor/backend para funcionar.

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
npm run test:e2e          # testes end-to-end + smoke (builda/serve e roda no Chromium)
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
├─ types.ts              # Shape (retângulo/círculo/path), MachineSettings (WorkArea, Stock)
├─ lib/
│  ├─ geometry.ts         # shape → pontos (mm), bounding box, scanlines para pocket
│  ├─ toolpath.ts          # formas → Segment[] (fonte única para G-code e simulador)
│  ├─ timing.ts            # estimativa de tempo por segmento/total
│  ├─ passes.ts            # profundidades por passe
│  ├─ gcode.ts             # Segment[] → G-code GRBL + validação/cabeçalho
│  ├─ svgImport.ts         # SVG (rect/circle/path M-L-H-V-Z) → Shape[]
│  ├─ validate.ts          # avisos/erros: limites da mesa, chapa, profundidade, Z
│  ├─ machinePresets.ts    # tamanhos comuns de router
│  ├─ editorMath.ts        # escala/grade/clamp do editor (puro, testável)
│  ├─ numberInput.ts       # parse defensivo de campos numéricos
│  └─ ids.ts               # ids únicos de formas
├─ state/store.ts          # Zustand (+persist em localStorage): formas + configurações da máquina
└─ components/
   ├─ Toolbar.tsx           # projeto, formas, propriedades, máquina, chapa, avisos, corte, export G-code
   ├─ Notice.tsx            # avisos inline (substitui alert)
   ├─ Editor.tsx             # canvas 2D (Konva) — mesa em mm, chapa, origem, arrastar/selecionar formas
   └─ Simulator.tsx           # visualização 3D (Three.js) do percurso da ferramenta
```

## Extensões futuras sugeridas

- Redimensionar formas por arraste (handles) no editor, além de mover
- Texto → contorno (para gravação de nomes/logos)
- Importar DXF além de SVG
- Salvar/carregar projetos em arquivo `.json` (localStorage já implementado)
- Nesting automático de peças na chapa

## Convenções de coordenadas

- Internamente tudo é em **mm**, no sistema da **mesa**: X para a direita, Y para o fundo da máquina, origem no canto frontal esquerdo da área útil.
- A **origem de trabalho** (G54, X0 Y0 do G-code) é definida pela chapa: canto frontal esquerdo ou centro. O G-code exportado já sai transformado.
- SVGs importados são lidos com Y "para baixo" (padrão SVG) e ainda não são espelhados — tratamento de unidades/eixos vem na Sprint 06.
