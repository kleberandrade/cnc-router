# Sprint 09 — Formas: cantos, handles, medidas inline, snap

**Status:** planejada
**Esforço:** M/G (5–7 dias)
**Depende de:** 07

## Objetivo
Desenhar como no Fusion: retângulos com cantos (raio/chanfro), redimensionar/girar por handles no canvas, digitar medidas enquanto cria/edita, snap a grade e pontos notáveis, mais primitivas.

## Modelo
```ts
interface RectangleShape { …; corners?: { type: "fillet" | "chamfer"; size: number; which?: ("tl"|"tr"|"br"|"bl")[] } }
type Shape = Rectangle | Circle | Path | RegularPolygon | Slot;
interface RegularPolygonShape { kind: "ngon"; x; y; radius; sides; rotation }
interface SlotShape { kind: "slot"; x; y; length; width; rotation }
```
- `geometry.ts`: `rectangleToPoints` gera arcos (amostrados a 0,05 mm) ou chanfros; validação `size ≤ min(w,h)/2`. Compensação/pocket/offset já funcionam sobre o polígono resultante.

## Tarefas
- [ ] Cantos de retângulo: campos na seção Peça (tipo, tamanho, quais cantos) + testes de geometria (área/bbox, arco com raio certo).
- [ ] `Transformer` do Konva: handles de redimensionar (mantendo proporção com Shift), girar (snap 15° com Shift), para retângulo/círculo/ngon/slot; path: mover + girar + escalar por bbox.
- [ ] Medidas inline: ao criar (clique-arrastar cria retângulo/círculo com tamanho ao vivo) e ao selecionar, "cotas" editáveis flutuantes ao lado da forma (`InlineDimension.tsx`): Tab alterna L/A, Enter confirma, Esc cancela.
- [ ] Snap: grade (passo atual), centro da chapa, cantos/centros de outras formas, alinhamento (guias verticais/horizontais tracejadas); toggle na barra e tecla `S`.
- [ ] Novas primitivas: polígono regular (n lados), rasgo/slot (oblongo), com ações na barra e atalhos.
- [ ] Alinhar/distribuir seleção múltipla (Shift+clique, marquee): esquerda/centro/direita/topo/meio/base; agrupar movimento.
- [ ] Testes: geometria (fillet/chamfer/ngon/slot → pontos), store (multi-seleção), e2e (arrastar handle muda largura; digitar 40 Tab 30 Enter cria 40×30; snap gruda no centro da chapa).

## DoD específica
- Retângulo 40×30 com raio 5 gera G-code cujo bbox continua 40×30 e cantos são arcos (verificado nos pontos e visualmente na simulação).
- Handles de redimensionar/girar funcionam com mouse e toque; valores refletem no painel em tempo real.
- Digitação inline cria a forma na medida exata sem usar o painel.
- Multi-seleção com alinhamento e exclusão em lote; undo agrupa a operação.

## Fora de escopo
Booleanas (união/subtração de formas), texto → contorno (Sprint 12).
