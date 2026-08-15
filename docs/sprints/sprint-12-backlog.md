# Sprint 12 — Backlog priorizado → Plano da Fase 3

**Status:** concluída — 2026-08-15
**Esforço:** P (1 dia)
**Depende de:** Fase 2 concluída (sprints 07–11)

## Objetivo
Fechar a Fase 2 avaliando tudo o que ficou de fora, priorizar por valor para o usuário da router hobby e converter o resultado num plano executável (Fase 3), com sprints, dependências e esforço — sem código de produto.

## Entradas
- Feedback das Fases 1 e 2 (mobile, PWA, ribbon, remoção de material, ViewCube, tema escuro, DXF).
- Limitações conhecidas registradas nas notas de fechamento das sprints 07–11.
- Auditoria inicial (`docs/auditoria.md`).

## Tarefas
- [x] Levantar itens candidatos e ordenar por valor × esforço (lista abaixo).
- [x] Agrupar em sprints coerentes, com dependências explícitas e esforço (P/M/G).
- [x] Escrever `fase-3.md` e os documentos das sprints 13–17 no padrão do `README.md` (objetivo, modelo, tarefas, DoD).
- [x] Atualizar `docs/sprints/README.md` (tabela da Fase 3) e `CHANGELOG.md`.

## Backlog priorizado (resultado)
| # | Item | Sprint |
|---|---|---|
| 1 | **Texto → contorno** com fontes embarcadas (OFL) e **pockets com ilhas** (polígono com furos) | [13](sprint-13-ilhas-e-texto.md) |
| 2 | **Nesting automático** na chapa (first-fit + rotação 0/90; depois NFP simples) | [15](sprint-15-nesting-e-booleanas.md) |
| 3 | **G20 (polegadas)** e **pós-processadores** por controlador (GRBL, Marlin, LinuxCNC/Mach3) | [14](sprint-14-entrada-furacao-tempo-pos.md) |
| 4 | **Estimativa de tempo com aceleração** (rampa trapezoidal, `$120/$121` do GRBL) | [14](sprint-14-entrada-furacao-tempo-pos.md) |
| 5 | **Hélice de entrada** e **furação** (ciclo pecking) para círculos ≤ Ø da fresa | [14](sprint-14-entrada-furacao-tempo-pos.md) |
| 6 | **Verificação de sobrecorte/cantos** não alcançados pela fresa (heightmap × modelo) | [16](sprint-16-verificacao-operacoes-compartilhar.md) |
| 7 | **Envio direto para a máquina** via Web Serial (GRBL: streaming, jog, zerar, DRO) | [17](sprint-17-web-serial-sender.md) |
| 8 | **Booleanas** entre formas (união/subtração/interseção) via Clipper | [15](sprint-15-nesting-e-booleanas.md) |
| 9 | **Múltiplas operações por forma** (rebaixo + contorno na mesma geometria) | [16](sprint-16-verificacao-operacoes-compartilhar.md) |
| 10 | **Compartilhar por link** (JSON comprimido na URL) e biblioteca de exemplos | [16](sprint-16-verificacao-operacoes-compartilhar.md) |

Plano consolidado: [`fase-3.md`](fase-3.md). Ordem recomendada: 13 → 14 → 15 → 16 → 17.

## DoD específica
- Cada item do backlog tem uma sprint dona, com dependência e esforço.
- Documentos das sprints 13–17 existem e seguem o mesmo padrão das anteriores.
- `README.md` das sprints e `CHANGELOG.md` refletem a Fase 3.

## Notas de fechamento
- Sprint sem entrega de código: o valor está no plano. A Sprint 13 (item 1) foi executada logo em seguida.
- Itens deixados fora da Fase 3 (avaliar depois): upload de fontes `.ttf` do usuário, "Explodir texto", furos inferidos no DXF, mais idiomas.
