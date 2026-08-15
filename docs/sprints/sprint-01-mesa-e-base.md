# Sprint 01 — Mesa, base (chapa) e origem

**Status:** planejada
**Esforço:** M (3–5 dias)
**Depende de:** 00

## Objetivo
O usuário escolhe a máquina (área útil X/Y/Z) e a chapa/base fixada na mesa (dimensões, espessura, posição, origem). Editor, validação e G-code passam a respeitar esses limites.

## Modelo (`src/types.ts`)
```ts
export interface WorkArea { width: number; height: number; zTravel: number } // mm
export type StockOrigin = "front-left" | "center";
export interface Stock {
  width: number; height: number; thickness: number;   // mm
  offsetX: number; offsetY: number;                   // posição da chapa na mesa
  origin: StockOrigin;                                 // onde fica X0 Y0 (G54)
}
export interface MachineSettings { /* existentes */ workArea: WorkArea; stock: Stock; }
```
Presets em `src/lib/machinePresets.ts`: 3018 (300×180×45), 3040 (300×400×80), 6040 (600×400×80), 6090 (600×900×100), 1010 (1000×1000×120), 1325 (1300×2500×150), Personalizada.

## Tarefas
- [ ] Tipos + defaults + `migrate` da persistência (v1 → v2).
- [ ] `lib/machinePresets.ts` com testes.
- [ ] `lib/validate.ts`: `validateProject(shapes, settings): Issue[]` — `Issue { level:"error"|"warning", code, message, shapeId? }`. Regras: forma fora da mesa (erro), forma fora da chapa (aviso), `depth > stock.thickness` (aviso "corte passante"/erro se > zTravel), `passDepth<=0`, `safeHeight > zTravel`.
- [ ] Editor: canvas = mesa; escala `fit` ao viewport (com `ResizeObserver`), grade 10 mm com linhas fortes a cada 50/100 mm, réguas em mm, chapa desenhada (retângulo bege) sobre a mesa, origem marcada (cruz + "0,0").
- [ ] Editor: `dragBoundFunc` limitando ao `workArea`; formas com issue ganham stroke âmbar (aviso) / vermelho (erro).
- [ ] Editor: `Line` de path com `draggable` + `onDragEnd` aplicando delta aos pontos.
- [ ] Toolbar (mínimo, sem redesenhar): seção "Máquina" com preset + largura/altura/Z; seção "Chapa/base" com largura/altura/espessura/offset/origem. (Layout final é sprint 05.)
- [ ] `generateGCode`: cabeçalho com `; machine 600x400x80 | stock 300x200x18 @ (10,10) origin front-left`; recusa exportar com issues `error` (retorna `{ok:false}` e UI mostra lista); coordenadas transformadas pela origem escolhida.
- [ ] Novas formas nascem dentro da chapa (canto + 10 mm), com `depth` padrão = espessura da chapa (recorte passante).
- [ ] Testes: `validate.test.ts`, `machinePresets.test.ts`, gcode header/origem, store migrate.
- [ ] E2E: trocar preset muda o tamanho do canvas; arrastar forma para fora fica bloqueado; exportar com forma fora da mesa mostra erro.

## DoD específica
- Trocar de 3018 para 1325 redimensiona a mesa no editor sem perder as formas.
- Não é possível arrastar uma forma para fora da mesa; forma parcialmente fora da chapa fica âmbar.
- Exportação bloqueada com mensagem quando há erro de validação; permitida com aviso quando só há warnings.
- G-code com origem "center" tem coordenadas negativas corretas (teste).
- Persistência migra projeto salvo na v1 sem crash.

## Fora de escopo
Materiais (02), redesign da toolbar (05), simulador 3D da mesa (04).
