# Fase 3 — Plano (derivado do backlog da Sprint 12)

**Data:** 2026-08-15 · **Base:** Fases 1 e 2 concluídas (sprints 00–11; 220 testes unitários, 57 e2e).

| Sprint | Tema | Depende de | Esforço | Itens do backlog |
|---|---|---|---|---|
| [13](sprint-13-ilhas-e-texto.md) | Pockets com ilhas (furos internos) e **texto → contorno** | — | G | 1 |
| [14](sprint-14-entrada-furacao-tempo-pos.md) | Hélice de entrada, furação (ciclo pecking), tempo com aceleração, G20 + pós-processadores (GRBL/Marlin/LinuxCNC) | — | M | 3, 4, 5 |
| [15](sprint-15-nesting-e-booleanas.md) | Nesting automático na chapa e booleanas (união/subtração/interseção) | 13 | G | 2, 8 |
| [16](sprint-16-verificacao-operacoes-compartilhar.md) | Verificação de sobrecorte/cantos, múltiplas operações por forma, compartilhar por link + exemplos | 13, 14 | M | 6, 9, 10 |
| [17](sprint-17-web-serial-sender.md) | Enviar direto para a máquina (Web Serial/GRBL): conexão, jog, zerar, DRO, streaming com buffer, pausa/retomar | 14 | G | 7 |

Ordem recomendada: 13 → 14 → 15 → 16 → 17. **Atualização 2026-08-16:** 13–15 concluídas; a 16 foi movida para o fim da [Fase 4](fase-4.md) (UI/UX) e a 17 para a [Fase 5](fase-5.md) (backlog). Cada sprint segue a DoD global do `README.md`.
