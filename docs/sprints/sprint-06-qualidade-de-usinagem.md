# Sprint 06 — Qualidade de usinagem

**Status:** concluída — 2026-08-15
**Esforço:** G (5–8 dias)
**Depende de:** 03

## Objetivo
Peças saem na dimensão desenhada: compensação de fresa no contorno, pocket limitado pela forma real com acabamento, ordem de operações segura, importação SVG confiável.

## Tarefas
- [x] `lib/offset.ts`: offset de polígono (usar `clipper-lib`/`js-angusj-clipper` ou `polygon-offset`; avaliar tamanho do bundle) com testes (quadrado 40 mm, fresa 6 → 46/34; círculo mantém raio ± r).
- [x] `Shape.side: "on" | "outside" | "inside"` (padrão: contorno "outside" para recorte, "inside" para furo); UI na seção Peça.
- [x] Pocket: scanlines recortadas pelo polígono ofsetado para dentro (interseção linha × polígono), stepover do material, passe final de contorno interno; alternativa: espiral concêntrica por offsets sucessivos (preferível para acabamento — decidir por teste de tempo).
- [x] Ordenação: pockets/gravações → contornos internos → contornos externos; dentro de cada grupo, vizinho mais próximo para reduzir rapids. Opção "manter ordem manual".
- [x] Tabs (pontes) opcionais em recortes passantes: n tabs × largura × altura.
- [x] Rampa/hélice de entrada opcional (evita mergulho vertical em alumínio).
- [x] SVG: `viewBox`/`width` com unidades (px, mm, in) → mm; `transform` translate/scale/rotate/matrix; curvas C/S/Q/T/A amostradas (`getPointAtLength` via `<svg>` off-screen ou `svg-path-properties`), tolerância 0,1 mm; aviso na UI do que foi descartado.
- [x] Atualizar `docs/samples/` com exemplos por operação e conferir em visualizador externo.
- [x] Testes: offset, pocket dentro da forma (nenhum ponto fora do polígono ofsetado), ordenação, tabs, SVG unidades/transform/curvas.

## DoD específica
- Retângulo 40×30 contorno "outside" com fresa 6 mm gera caminho 46×36 (teste) e a simulação mostra a fresa fora da linha.
- Círculo em pocket não tem nenhum ponto de scanline fora do círculo ofsetado (teste).
- Contorno externo é sempre o último trecho de uma peça no G-code (teste).
- SVG do Inkscape (px, viewBox) importa em mm no tamanho certo (fixture em `src/lib/__tests__/fixtures/`).
- Simulação e tempo estimado (03/04) continuam coerentes com o novo percurso.

## Fora de escopo
Nesting automático, DXF, texto → contorno (candidatos a sprint 07).

## Notas de fechamento
- Offset via `clipper-lib` (puro JS, ~+45 kB gzip); junções redondas (canto externo vira arco de raio = r da fresa, como a fresa faz de verdade).
- Pocket em zig-zag + passe de parede (não espiral); ligação entre linhas só quando o segmento fica dentro da forma, senão retrai.
- Rampa não considera tabs durante a descida (as pontes valem para o restante da volta); hélice de entrada não implementada.
- Formas antigas ficam "na linha" — quem já usava o app não vê mudança de dimensão a menos que troque a compensação.
- Testes: 169 unitários (90 % linhas / 80 % branches), 32 e2e.
