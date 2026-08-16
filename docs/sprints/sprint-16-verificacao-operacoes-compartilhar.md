# Sprint 16 — Verificação, múltiplas operações por forma, compartilhar

**Status:** planejada — reprogramada para o fim da Fase 4 (após a Sprint 21)
**Esforço:** M (4–6 dias)
**Depende de:** 13, 14

## Tarefas
- [ ] Verificação pós-simulação: comparar heightmap final × modelo desejado (profundidade por forma) → mapa de "material restante" (cantos internos que a fresa não alcança, ilhas), lista de avisos com "raio mínimo alcançável".
- [ ] Operações múltiplas por forma (`shape.operations: Operation[]`, ex.: rebaixo 6 mm + contorno passante), com ordem e fresa por operação; migração v8; painel com lista de operações.
- [ ] Compartilhar por link: projeto comprimido (lz-string) na URL `#p=…`, botão Copiar link, abrir de link; biblioteca de exemplos (3–4 projetos) no menu.
- [ ] Testes: verificação detecta canto interno não usinado; operações múltiplas geram os dois percursos na ordem; link round-trip.

## DoD específica
- Rebaixo retangular com fresa Ø6 mostra cantos com raio 3 como "restante" e o aviso correspondente.
- Uma forma com rebaixo + contorno exporta as duas operações; link compartilhado abre o projeto igual.
