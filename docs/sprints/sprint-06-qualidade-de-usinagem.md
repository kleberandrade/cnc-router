# Sprint 06 — Qualidade de usinagem

**Status:** planejada
**Esforço:** G (5–8 dias)
**Depende de:** 03

## Objetivo
Peças saem na dimensão desenhada: compensação de fresa no contorno, pocket limitado pela forma real com acabamento, ordem de operações segura, importação SVG confiável.

## Tarefas
- [ ] `lib/offset.ts`: offset de polígono (usar `clipper-lib`/`js-angusj-clipper` ou `polygon-offset`; avaliar tamanho do bundle) com testes (quadrado 40 mm, fresa 6 → 46/34; círculo mantém raio ± r).
- [ ] `Shape.side: "on" | "outside" | "inside"` (padrão: contorno "outside" para recorte, "inside" para furo); UI na seção Peça.
- [ ] Pocket: scanlines recortadas pelo polígono ofsetado para dentro (interseção linha × polígono), stepover do material, passe final de contorno interno; alternativa: espiral concêntrica por offsets sucessivos (preferível para acabamento — decidir por teste de tempo).
- [ ] Ordenação: pockets/gravações → contornos internos → contornos externos; dentro de cada grupo, vizinho mais próximo para reduzir rapids. Opção "manter ordem manual".
- [ ] Tabs (pontes) opcionais em recortes passantes: n tabs × largura × altura.
- [ ] Rampa/hélice de entrada opcional (evita mergulho vertical em alumínio).
- [ ] SVG: `viewBox`/`width` com unidades (px, mm, in) → mm; `transform` translate/scale/rotate/matrix; curvas C/S/Q/T/A amostradas (`getPointAtLength` via `<svg>` off-screen ou `svg-path-properties`), tolerância 0,1 mm; aviso na UI do que foi descartado.
- [ ] Atualizar `docs/samples/` com exemplos por operação e conferir em visualizador externo.
- [ ] Testes: offset, pocket dentro da forma (nenhum ponto fora do polígono ofsetado), ordenação, tabs, SVG unidades/transform/curvas.

## DoD específica
- Retângulo 40×30 contorno "outside" com fresa 6 mm gera caminho 46×36 (teste) e a simulação mostra a fresa fora da linha.
- Círculo em pocket não tem nenhum ponto de scanline fora do círculo ofsetado (teste).
- Contorno externo é sempre o último trecho de uma peça no G-code (teste).
- SVG do Inkscape (px, viewBox) importa em mm no tamanho certo (fixture em `src/lib/__tests__/fixtures/`).
- Simulação e tempo estimado (03/04) continuam coerentes com o novo percurso.

## Fora de escopo
Nesting automático, DXF, texto → contorno (candidatos a sprint 07).
