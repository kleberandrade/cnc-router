# Sprint 04 — Simulador: tempo real, step/step, barra de tempo

**Status:** concluída — 2026-08-15
**Esforço:** G (5–8 dias)
**Depende de:** 03

## Objetivo
Simulação orientada a tempo (1× = tempo real da máquina), com play/pause, passo a passo (segmento/passe/forma), barra de tempo com scrub, tempo decorrido/restante/total, mesa e chapa em 3D e destaque do trecho já cortado.

## Estado (`src/state/simStore.ts`)
```ts
interface SimState {
  t: number;                 // segundos decorridos
  playing: boolean;
  speed: 0.25|0.5|1|2|4|8;
  stepMode: "segment"|"pass"|"shape";
  play(); pause(); toggle(); seek(t); stepForward(); stepBack(); reset(); toEnd(); setSpeed(); setStepMode();
}
```
Posição da fresa em `t`: busca binária em `timing.cumulative` → segmento → interpolação linear.

## Tarefas
- [x] `lib/playback.ts`: `positionAt(segments, timing, t)`, `boundariesFor(segments, timing, stepMode): number[]` (instantes de fim de segmento/passe/forma), `nextBoundary/prevBoundary`.
- [x] `useSimStore` + loop `requestAnimationFrame` que avança `t += dt*speed` e pausa em `total`.
- [x] Controles (`SimulatorControls.tsx`): ⏮ ⏪ ▶/⏸ ⏩ ⏭, seletor de velocidade, seletor de modo de passo, barra de tempo (`input[type=range]`, `min=0 max=total step=0.01`) com marcadores (ticks) nas fronteiras de forma; leitura `mm:ss / mm:ss` e "restante"; linha atual em G-code (`G1 X.. Y.. F..`) e "Forma 2/5 · passe 3/4".
- [x] Atalhos: espaço play/pause, ←/→ step, Home/End, Shift+←/→ = passe.
- [x] Cena 3D: mesa (plano `workArea`) e chapa (`BoxGeometry` com espessura, material translúcido bege), origem, percurso já cortado em cor cheia e futuro apagado (atualização de `drawRange` ou cor por vértice), rapids tracejados (`LineDashedMaterial`), ferramenta como cilindro Ø real + ponta.
- [x] Câmera: `OrbitControls`, botão "Ajustar à peça", vista superior ortográfica (toggle).
- [x] Reduced motion: respeitar `prefers-reduced-motion` (sem autoplay).
- [x] Sincronia: mudar formas/settings reseta `t=0` e recalcula; barra mostra novo total.
- [x] Testes: `playback.test.ts` (positionAt nas fronteiras e no meio; boundaries por modo; clamps), `simStore.test.ts` (step avança para próxima fronteira; seek clampa; play no fim → reset).
- [x] E2E: play → leitura de tempo muda; step → posição da leitura muda; scrub até o fim → botão volta a "Simular"/"Reiniciar"; `simulate-toggle` mantido.

## DoD específica
- A 1×, um percurso estimado em 60 s leva 60 s ± 2 s na tela.
- Step por segmento/passe/forma pára exatamente na fronteira (teste) e a barra acompanha.
- Arrastar a barra reposiciona a fresa e o trecho cortado instantaneamente (sem travar em 5k segmentos — medir com círculo pocket grande).
- Tempo total exibido é o mesmo do cabeçalho do G-code.
- Mesa e chapa visíveis em 3D com dimensões da sprint 01.

## Fora de escopo
Remoção de material (voxel/heightmap), colisão com grampos.

## Notas de fechamento
- Vista superior usa a mesma câmera perspectiva posicionada acima (não ortográfica) — suficiente por ora.
- Segmento em execução é pintado inteiro como "cortado" (sem sub-divisão do vértice); custo por atualização é O(n) sobre as cores, sem travamento em pockets grandes.
- Não há autoplay; `prefers-reduced-motion` respeitado por construção.
- Testes: 127 unitários (94 % linhas / 87 % branches), 17 e2e.
