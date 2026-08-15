# Oficina CNC

Editor web para CNC router: desenhe peças (formas prontas ou SVG importado), configure a máquina e exporte G-code (dialeto GRBL), com simulação 3D do percurso da fresa antes de rodar na máquina.

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

> **Nota sobre o ambiente onde este projeto foi gerado:** os testes unitários (`npm run test:coverage`) foram
> executados e passaram (64 testes, cobertura acima do threshold). Os testes Playwright (`test:e2e`) **não**
> puderam ser executados aqui porque o download do binário do Chromium (`cdn.playwright.dev`) está fora da
> allowlist de rede do sandbox — mas os specs em `e2e/` são válidos e devem rodar normalmente no seu ambiente
> após `npx playwright install`.

### Estratégia de cobertura

A lógica de negócio pura (`src/lib/*` — geração de G-code, geometria, importação de SVG — e `src/state/store.ts`)
tem cobertura de testes unitários. `Toolbar.tsx` também é coberto via testes de componente (Testing Library).

`Editor.tsx` (canvas Konva) e `Simulator.tsx` (WebGL/Three.js) são **excluídos da cobertura unitária** de propósito:
jsdom não renderiza canvas/WebGL de verdade, então testar essas peças com mocks pesados dá falsa confiança.
Em vez disso, eles são cobertos pelos testes Playwright (`e2e/smoke.spec.ts`, `e2e/gcode-export.spec.ts`), que
rodam num navegador real e verificam o fluxo completo: adicionar forma → exportar G-code → simular percurso.

## Arquitetura

```
src/
├─ types.ts              # Shape (retângulo/círculo/path), MachineSettings
├─ lib/
│  ├─ geometry.ts         # shape → pontos (mm), bounding box, scanlines para pocket
│  ├─ gcode.ts             # pontos → G-code GRBL (multi-passe por profundidade, contorno e pocket)
│  └─ svgImport.ts         # SVG (rect/circle/path M-L-H-V-Z) → Shape[]
├─ state/store.ts          # Zustand: formas do projeto + configurações da máquina
└─ components/
   ├─ Toolbar.tsx           # adicionar forma, importar SVG, propriedades, export G-code
   ├─ Editor.tsx             # canvas 2D (Konva) — arrastar/selecionar formas
   └─ Simulator.tsx           # visualização 3D (Three.js) do percurso da ferramenta
```

## Extensões futuras sugeridas

- Redimensionar formas por arraste (handles) no editor, além de mover
- Texto → contorno (para gravação de nomes/logos)
- Importar DXF além de SVG
- Salvar/carregar projetos (localStorage ou backend leve, ex. Supabase)
- Nesting automático de peças na chapa
