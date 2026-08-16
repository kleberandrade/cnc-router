# Sprint 15 — Nesting automático e booleanas

**Status:** concluída — 2026-08-16
**Esforço:** G (5–7 dias)
**Depende de:** 13

## Objetivo
Compor formas (união, subtração, interseção) e arrumar automaticamente as peças na chapa para aproveitar material — dois recursos que a Sprint 13 (polígonos com furos) tornou possíveis.

## Modelo
- `lib/boolean.ts`: `Region { outer, holes }`, `shapeRegions(shape)` (texto expandido em glifos), `booleanRegions(op, subject, clips)` via Clipper com `PolyTree` (furos aninhados viram novas regiões), `booleanShapes(op, shapes, newId)` → `PathShape[]` herdando profundidade/operação/lado/tabs/fresa da **primeira** forma selecionada (base). `loopArea`, `regionArea`.
- `lib/nesting.ts`: `nestShapes(shapes, { width, height, spacing, allowRotate })` — **MaxRects** (best-short-side-fit, empate por baixo-esquerda) sobre caixas envolventes ordenadas por área decrescente, rotação 0/90; devolve `placed` (id, rotated, dx, dy), `overflow` e `fill`. `rotateShape90` (retângulo/ngon/rasgo/texto giram por `rotation`; path gira pontos e furos; círculo não muda) mantém o centro da caixa. `applyPlacements` soma a origem da chapa.
- `lib/transform.ts`: `translateShape` (movido do store; agora move também os **furos** de paths — corrigido).
- Store: `booleanSelected(op)` (substitui as selecionadas pelo resultado no lugar da primeira; ignora travadas; undo via zundo), `nestOnStock({ spacing, allowRotate }, ids?)` (seleção ≥ 2 ou todas as visíveis/destravadas).
- `types/clipper-lib.d.ts`: `PolyNode`/`PolyTree`.

## Tarefas
- [x] Booleanas (Clipper): união / subtração / interseção entre 2+ formas selecionadas → `PathShape` com `holes`; botões **Unir / Subtrair / Intersec.** no grupo **Arranjar** da ribbon; undo.
- [x] Nesting: `lib/nesting.ts` — first-fit decrescente por caixa envolvente (MaxRects) com rotação 0/90 e espaçamento = Ø fresa + folga; peças que não cabem ficam listadas no aviso e não se movem.
- [x] UI: botão **Organizar** → diálogo (folga além do Ø da fresa, permitir girar, escopo automático seleção/todas), aplicar; desfazer com Ctrl+Z. Atalho **Ctrl+A** (selecionar tudo).
- [x] Testes: `boolean.test.ts` (áreas de união/subtração/interseção, L de 8 vértices, furo criado por subtração, furo preenchido por união, subtração que divide em 2, texto, pocket respeita a ilha), `nesting.test.ts` (20 peças aleatórias sem sobreposição e dentro da chapa em < 1 s, overflow, rotação forçada, origem da chapa, `rotateShape90`), store (`booleanSelected`/`nestOnStock`); e2e `nesting-boolean.spec.ts`.
- [ ] NFP poligonal para peças convexas — **adiado** (ver notas).

## DoD específica
- ✅ União de dois retângulos sobrepostos vira 1 forma sem laços duplicados (8 vértices, área = 2·A − interseção); subtração cria furo (ilha) que o pocket respeita.
- ✅ 20 peças aleatórias arranjadas sem sobreposição em < 1 s (≈ 2 ms), todas dentro da chapa ou listadas como excedentes.
- ✅ Testes: 263 unitários (86 % linhas / 75,6 % branches), 64 e2e (+1 pulado).

## Notas de fechamento
- O nesting é por **caixa envolvente** (MaxRects). Para peças muito irregulares (letras, círculos grandes) sobra espaço; o NFP (no-fit polygon) ficou fora por custo/benefício — o backlog registra como melhoria.
- Ribbon: o grupo **Arranjar** aparece sempre (Organizar precisa só de peças; booleanas exigem 2+ selecionadas). Em larguras compactas os rótulos somem (comportamento já existente).
- Booleanas com texto convertem o texto em polígonos (perde-se a edição do texto) — o aviso está no tooltip; Ctrl+Z desfaz.
- `translateShape` não movia furos de paths ao alinhar/distribuir/arrastar — corrigido nesta sprint.
