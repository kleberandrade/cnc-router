# Sprint 14 — Hélice de entrada, furação, tempo com aceleração, pós-processadores

**Status:** concluída — 2026-08-15
**Esforço:** M (4–6 dias)
**Depende de:** —

## Objetivo
Deixar o G-code mais "de máquina real": entrar no rebaixo em hélice (sem mergulho vertical), furar com ciclo de bicadas, estimar tempo considerando aceleração e exportar para os controladores mais comuns (GRBL, Marlin, LinuxCNC/Mach3), em mm ou polegadas.

## Modelo
```ts
type PostId = "grbl" | "marlin" | "linuxcnc";  type ExportUnits = "mm" | "inch";
interface MachineSettings { …; post; exportUnits; accel; helixEntry; helixPitch; peckDepth }
BaseShape.operation: "outline" | "pocket" | "drill"      // drill só para círculos
```
- `lib/post/index.ts`: `PostProcessor { comment, preamble, spindleOn, spindleOff, toolChange, programEnd, extension }`; `POSTS`, `findPost`, `unitScale`, `unitWord`.
- `lib/timing.ts`: `estimateTime(segments, { rapidRate, accel })` — `accel > 0` liga o planner trapezoidal (velocidade de junção pelo modelo *junction deviation* do GRBL, δ = 0,01 mm; passes para frente/para trás; segmentos colineares não param, cantos param).
- `lib/toolpath.ts`: `helixDown` (hélice linearizada em G1, 24 passos/volta, + 1 volta plana no fundo; Ø da hélice = 0,6 × Ø da fresa → furo de 1,6 Ø), `drill` (mergulho no centro, bicadas de `peckDepth` com retração à altura segura), `OperationKind` ganha `drill`.
- Persistência v7 (`migrateProject`): projetos antigos ganham `post: grbl`, `exportUnits: mm`, `accel: 200`, `helixEntry: false`, `helixPitch: 1`, `peckDepth: 0` — G-code idêntico ao anterior; só a estimativa de tempo muda (com aceleração).

## Tarefas
- [x] Hélice de entrada para pockets (`helixEntry`, `helixPitch`) — hélice linearizada por passe (o passe seguinte começa a hélice no piso do anterior); cai para mergulho vertical com aviso quando o rebaixo é estreito demais para o círculo da hélice.
- [x] Operação **Furação** para círculos (Peça → Operação, só aparece em círculos): mergulho no centro, `peckDepth` (Corte → "Furação: profundidade por bicada"), avisos quando o furo é maior que a fresa; erro se aplicada a não-círculo.
- [x] `estimateTime` v2 com aceleração (`accel` em Corte, mm/s², 0 = ignorar); usado no rodapé, no simulador e no cabeçalho do G-code (`accel …` no comentário de tempo).
- [x] Pós-processadores GRBL / Marlin / LinuxCNC-Mach3 (nova seção **Exportação** do painel): comentários `;` vs `( )`, preâmbulo (`M117` / `G17 G40 G49 G64 P0.01`), `M3`+`G4`, troca de fresa (`M0` / `M0 msg` / `(MSG,…)`+`M0`), fim (`M2` / `M400 M84` / `M30`); extensão `.gcode`/`.ngc` no download.
- [x] **G20**: coordenadas, alturas e avanços ÷ 25,4 com 4 casas; mesmo número de linhas de movimento.
- [x] Amostras `docs/samples/sprint14-*.{gcode,ngc}` (mesma peça nos três pós + polegadas).
- [x] Bônus: rebaixos não fazem mais retração + G0 + mergulho a cada duas linhas quando a linha termina exatamente na parede (teste de "dentro" tolerante à borda) — `baseline-v1` regenerado com 40 linhas a menos.

## DoD específica
- ✅ Pocket com hélice não tem `G1 Z` vertical no início (teste unitário + e2e: primeiro `G1 …Z-` tem X/Y).
- ✅ Furação gera ciclos por furo (`-2, -4, -6` com bicada de 2 mm), só G0/G1 (sem `G81`, compatível com os três pós).
- ✅ Tempo v2 ≥ v1 e conferido à mão: 100 mm a 600 mm/min com 100 mm/s² = 10,1 s; 1 mm com a = 10 → 0,632 s; círculo poligonizado fica entre 1× e 1,5× o v1.
- ✅ G-code Marlin/LinuxCNC válidos (só G0/G1/G4/G17/G20/G21/G40/G49/G64/G90 + M-codes + comentários; conferidos no ncviewer); G20 converte coordenadas e avanços.
- ✅ Testes: 246 unitários (86,8 % linhas / 75,4 % branches), 63 e2e (+1 pulado).

## Notas de fechamento
- G2/G3 (arcos reais) ficaram de fora: a hélice linearizada funciona em qualquer controlador e mantém o simulador/heightmap com um único tipo de segmento.
- Marlin: presume `SPINDLE_LASER_ENABLE` (M3/M5); a variante M106/M107 (ventoinha como relé) não foi incluída — trivial de adicionar como outro pós.
- A aceleração é única para todos os eixos (GRBL costuma ter Z bem mais lento — subestimativa pequena em mergulhos).
- Furação usa sempre a fresa da peça (Ø da fresa); furos maiores devem usar contorno "por dentro".
