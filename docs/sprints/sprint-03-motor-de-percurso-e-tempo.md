# Sprint 03 — Motor único de percurso e estimativa de tempo

**Status:** planejada
**Esforço:** M (3–4 dias)
**Depende de:** 01

## Objetivo
Um único gerador de percurso alimenta G-code **e** simulador; a partir dele, estimar o tempo total e por trecho. Corrige o achado A2 da auditoria (simulador ≠ G-code).

## Modelo (`src/lib/toolpath.ts`)
```ts
export type MoveType = "rapid" | "plunge" | "feed" | "retract";
export interface Segment {
  from: Vec3; to: Vec3; type: MoveType; feed: number;   // mm/min
  shapeId: string | null; pass: number; op: "outline" | "pocket" | "travel";
}
export function buildToolpath(shapes, settings): Segment[]
export function segmentsToGCode(segments, settings): string   // usado por generateGCode
```
`src/lib/timing.ts`:
```ts
export interface Timing { perSegment: number[]; cumulative: number[]; total: number } // segundos
export function estimateTime(segments, opts: { rapidRate: number; accel?: number }): Timing
```
`MachineSettings.rapidRate` novo (padrão 3000 mm/min).

## Tarefas
- [ ] `buildToolpath` reproduz exatamente a lógica atual de outline/pocket/multi-passe (safe height, plunge, retorno ao início por passe, retract).
- [ ] `generateGCode` reescrito como `segmentsToGCode(buildToolpath(...))`; testes atuais de `gcode.test.ts` continuam passando **sem alteração** (paridade) e `docs/samples/baseline-v0.gcode` idêntico (diff vazio, salvo cabeçalho).
- [ ] `estimateTime` v1: `len/feed` por segmento (rapids com `rapidRate`); v2 opcional: rampa trapezoidal com `accel` (mm/s²) — flag.
- [ ] G-code: comentário `; tempo estimado: 7m52s` no cabeçalho.
- [ ] `Simulator.tsx` passa a consumir `buildToolpath` (remove `buildSimulationPath`; testes migram para `toolpath.test.ts`). Player ainda por índice — o player real é sprint 04.
- [ ] Toolbar/rodapé: exibir tempo estimado (texto simples; layout final na 05).
- [ ] Testes: `toolpath.test.ts` (nº de passes, tipos de segmento, pocket zig-zag), `timing.test.ts` (100 mm @ 600 mm/min = 10 s; rapid usa rapidRate; cumulative monotônico; total = soma).

## DoD específica
- `git diff` entre `baseline-v0.gcode` e o gerado pelo novo motor é vazio fora do cabeçalho.
- Simulação percorre multi-passe e pocket exatamente como o G-code (verificado visualmente e por teste de igualdade de pontos).
- Tempo estimado aparece na UI e no G-code; erro < 5 % vs. contagem manual num exemplo simples de retângulo.

## Fora de escopo
UI de player (04), compensação de ferramenta (06).
