# Sprint 12 — Backlog priorizado → Fase 3

**Status:** concluída — 2026-08-15 (backlog convertido nas sprints 13–17; ver [`fase-3.md`](fase-3.md))

Itens avaliados e ainda não planejados em sprint, em ordem sugerida de valor:

1. **Texto → contorno**: fonte (`opentype.js`) → path → contorno/pocket (gravação de nomes/logos). Precisa de fontes embarcadas (licença OFL) e do polígono com furos (letras "o", "a") — depende de suporte a **furos em pocket** (offset com ilhas), que também melhora peças com furos internos.
2. **Nesting automático** de peças na chapa (bounding-box first-fit + rotação 0/90; depois NFP simples).
3. **G20 (polegadas) na exportação** e pós-processadores por controlador (GRBL, Marlin, LinuxCNC/Mach3): cabeçalho, `M3` com espera, `G28`, comentários `;` vs `()`.
4. **Estimativa de tempo com aceleração** (rampa trapezoidal por eixo, `$120/$121` do GRBL) — hoje subestima em percursos com muitos segmentos curtos.
5. **Hélice de entrada** para pockets e furação (`G2/G3` ou hélice linearizada) e **furação** como operação (ciclo pecking) para círculos ≤ Ø da fresa.
6. **Verificação de sobrecorte/colisão**: comparar heightmap final com o modelo desejado; avisar cantos internos não alcançados pela fresa.
7. **Envio direto para a máquina** via Web Serial (GRBL: streaming com buffer, jog, zeramento, DRO) — transforma o app num sender; escopo grande, alto valor.
8. **Booleanas** entre formas (união/subtração) via Clipper.
9. **Camadas/operações múltiplas por forma** (ex.: rebaixo + contorno na mesma geometria).
10. **Compartilhar projeto por link** (compressão do JSON na URL) e biblioteca de exemplos.
