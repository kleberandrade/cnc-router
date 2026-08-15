# Sprint 15 — Nesting automático e booleanas

**Status:** planejada
**Esforço:** G (5–7 dias)
**Depende de:** 13

## Tarefas
- [ ] Booleanas (Clipper): união / subtração / interseção entre 2+ formas selecionadas → `PathShape` com `holes`; botões em Modificar; undo.
- [ ] Nesting: `lib/nesting.ts` — bounding-box first-fit decreasing com rotação 0/90 e espaçamento = Ø fresa + folga; opção NFP simplificado (poligonal) para peças convexas; multi-chapa (peças que não cabem ficam listadas).
- [ ] UI: botão "Organizar na chapa" (com espaçamento e rotação permitida), pré-visualização, aplicar/desfazer.
- [ ] Testes: uniões/subtrações com áreas esperadas; nesting coloca N retângulos sem sobreposição e dentro da chapa; e2e.

## DoD específica
- União de dois retângulos sobrepostos vira 1 forma sem laços duplicados; subtração cria furo (ilha).
- 20 peças aleatórias arranjadas sem sobreposição em < 1 s, todas dentro da chapa ou listadas como excedentes.
