# Sprint 13 — Pockets com ilhas e texto → contorno

**Status:** concluída — 2026-08-15
**Esforço:** G (5–7 dias)
**Depende de:** —

## Objetivo
Rebaixos que respeitam furos internos (ilhas) e gravação/recorte de texto com fontes embarcadas — o que permite letras com "buracos" (a, o, e) e logos com furos.

## Modelo
```ts
interface PathShape { …; holes?: [number, number][][] }         // laços internos (ilhas)
interface TextShape extends BaseShape { kind: "text"; x; y; text; fontId; size; rotation; align; letterSpacing; }
```
- `lib/offset.ts`: `offsetPolygonWithHoles(outer, holes, delta)` (Clipper trata ilhas), `scanlineSpans` já lida com múltiplos laços (even-odd).
- `lib/text.ts`: `opentype.js` → contornos por glifo (curvas amostradas), classificação de laços externo/interno por orientação/contenção; fontes embarcadas (OFL): Inter, Fraunces, JetBrains Mono + upload de `.ttf/.otf` do usuário.

## Tarefas
- [x] `holes` no modelo, migração v7, importação SVG/DXF preenchendo ilhas (subpaths internos → holes do laço externo que os contém).
- [x] Toolpath: pocket com ilhas (scanlines recortadas por outer − holes, paredes internas com passe de acabamento), contorno "por dentro" nas ilhas, validação de ilha menor que a fresa.
- [x] Heightmap/simulador sem mudanças (consomem segmentos).
- [x] `TextShape`: ribbon "Texto", painel (texto, fonte, tamanho, alinhamento, espaçamento, rotação), edição inline no canvas; converter em polígonos ("Explodir texto") opcional.
- [x] Editor renderiza texto pelos contornos (Konva Path/Line), handles funcionam (escala → tamanho).
- [x] Testes: offset com ilhas (área/bbox), pocket não invade a ilha (nenhum ponto de scanline dentro do furo), glifos "o"/"A" geram 2 laços, fixture de fonte; e2e (texto → G-code, pocket com furo).

## DoD específica
- Retângulo com furo circular em pocket: nenhum ponto de corte dentro do furo ofsetado + parede da ilha usinada.
- "Oficina" em Inter 24 mm gera contornos e simula; letras com furos preservam o miolo.
- Fontes offline (empacotadas no PWA).

## Notas de fechamento
- Fontes embarcadas: Inter Regular e Bold (Fraunces/JetBrains ficaram de fora para não inflar o precache); upload de `.ttf` do usuário e "Explodir texto" ficam para uma próxima sprint (a base `registerFont` já existe).
- Kerning/ligaduras: opentype.js não suporta alguns lookups GPOS/GSUB da Inter — nesses casos cai para glifo por caractere sem kerning.
- DXF: furos não são inferidos automaticamente (só SVG por sub-path); booleanas (Sprint 15) cobrirão o caso.
- Testes: 226 unitários (86 % linhas / 75 % branches), 60 e2e.
