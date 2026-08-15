# Sprint 14 — Hélice de entrada, furação, tempo com aceleração, pós-processadores

**Status:** planejada
**Esforço:** M (4–6 dias)
**Depende de:** —

## Tarefas
- [ ] Hélice de entrada para pockets (`settings.helixEntry`: Ø da hélice, passo por volta) — hélice linearizada (G1) por padrão, opção G2/G3.
- [ ] Operação **Furação** para círculos ≤ Ø da fresa (+ opcional peck: profundidade por bicada, retração); ícone e validação.
- [ ] `estimateTime` v2 com aceleração trapezoidal por eixo (`settings.accel` mm/s², padrão 200) — flag em Preferências; comparar contra v1 na amostra.
- [ ] Pós-processadores (`lib/post/*.ts`): GRBL (atual), Marlin (M3/M5→M106/M107 opcional, sem G28), LinuxCNC/Mach3 (`()` comentários, `G64`); seletor em Máquina; **G20** (polegadas) na exportação; testes de golden files por pós.
- [ ] Amostras em `docs/samples/` por pós-processador.

## DoD específica
- Pocket com hélice não tem `G1 Z` vertical no início; furação gera ciclos por furo; tempo v2 ≥ v1 e dentro de ±10 % de uma referência calculada à mão; G-code Marlin/LinuxCNC válidos em visualizador externo; G20 converte coordenadas e avanços.
