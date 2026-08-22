import { describe, it, expect } from "vitest";
import { glueParts, partitionShapes, assembleShapes } from "../assembly";
import { partSides } from "../mesh";
import { runFemJob } from "../job";
import { regionArea, type Region } from "../../boolean";
import type { Point } from "../../geometry";
import type { RectangleShape } from "../../../types";

const rect = (x: number, y: number, w: number, h: number): Region => ({
  outer: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
  holes: [],
});

/** Id do lado cuja aresta tem o ponto médio mais perto de `p` (mesma lógica de escolha da UI). */
function sideNear(outer: Point[], holes: Point[][], p: Point): number {
  const sides = partSides(outer, holes);
  const loops = [{ loop: outer, ids: sides.outer }, ...holes.map((h, i) => ({ loop: h, ids: sides.holes[i] }))];
  let best = 0, bestD = Infinity;
  for (const { loop, ids } of loops) {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      const mx = (a[0] + b[0]) / 2 - p[0], my = (a[1] + b[1]) / 2 - p[1];
      const d = mx * mx + my * my;
      if (d < bestD) { bestD = d; best = ids[i]; }
    }
  }
  return best;
}

describe("fem/assembly: colar peças", () => {
  it("duas peças encostadas viram um corpo só com a área somada", () => {
    const glued = glueParts([rect(0, 0, 50, 50), rect(50, 0, 50, 50)]);
    expect(glued).toHaveLength(1);
    expect(regionArea(glued[0])).toBeCloseTo(5000, -1); // ±5 mm²
  });

  it("folga de encaixe (0,3 mm) ainda cola; 5 mm de vão não", () => {
    const comFolga = glueParts([rect(0, 0, 50, 50), rect(50.3, 0, 50, 50)]);
    expect(comFolga).toHaveLength(1);
    expect(regionArea(comFolga[0])).toBeGreaterThan(4990);

    const separadas = glueParts([rect(0, 0, 50, 50), rect(55, 0, 50, 50)]);
    expect(separadas).toHaveLength(2);
    for (const r of separadas) expect(regionArea(r)).toBeCloseTo(2500, 0);
  });

  it("furo dentro de uma das peças sobrevive à colagem", () => {
    const withHole: Region = {
      outer: [[0, 0], [50, 0], [50, 50], [0, 50]],
      holes: [[[20, 20], [20, 30], [30, 30], [30, 20]]], // CW (furo)
    };
    const glued = glueParts([withHole, rect(50, 0, 50, 50)]);
    expect(glued).toHaveLength(1);
    expect(glued[0].holes).toHaveLength(1);
    expect(regionArea(glued[0])).toBeCloseTo(5000 - 100, -1);
  });

  it("uma peça só passa direto; lista vazia devolve vazio", () => {
    const one = glueParts([rect(0, 0, 40, 30)]);
    expect(one).toHaveLength(1);
    expect(regionArea(one[0])).toBeCloseTo(1200, 5);
    expect(glueParts([])).toHaveLength(0);
  });

  it("semântica de corte (tábua de carnes): rasgo passante vira furo, rebaixo parcial não entra", () => {
    const shape = (p: Partial<RectangleShape>): RectangleShape => ({
      id: "s", kind: "rectangle", x: 0, y: 0, width: 100, height: 60, rotation: 0,
      depth: 30, operation: "outline", ...p,
    });
    const board = shape({ id: "board", width: 380, height: 210, side: "outside" });
    const slot = shape({ id: "slot", x: 300, y: 90, width: 60, height: 22, side: "inside", cutThrough: true });
    const groove = shape({ id: "groove", x: 30, y: 30, width: 320, height: 150, operation: "pocket", depth: 4 });

    const parts = partitionShapes([board, slot, groove], 30);
    expect(parts.solids).toHaveLength(1);
    expect(parts.cutouts).toHaveLength(1); // só o rasgo; a canaleta rasa fica de fora

    const regions = assembleShapes([board, slot, groove], 30);
    expect(regions).toHaveLength(1);
    expect(regions[0].holes).toHaveLength(1);
    expect(regionArea(regions[0])).toBeCloseTo(380 * 210 - 60 * 22, -1);
  });

  it("furação parcial (cega) não desconta; passante desconta", () => {
    const shape = (p: Partial<RectangleShape>): RectangleShape => ({
      id: "s", kind: "rectangle", x: 0, y: 0, width: 100, height: 60, rotation: 0,
      depth: 18, operation: "outline", side: "outside", ...p,
    });
    const board = shape({ id: "b" });
    const blind = shape({ id: "blind", x: 20, y: 20, width: 10, height: 10, operation: "drill", depth: 8, side: undefined });
    const throughHole = shape({ id: "th", x: 60, y: 20, width: 10, height: 10, operation: "drill", depth: 18, side: undefined });
    const regions = assembleShapes([board, blind, throughHole], 18);
    expect(regions).toHaveLength(1);
    expect(regions[0].holes).toHaveLength(1);
  });

  it("validação física: duas chapas coladas se comportam como a peça única equivalente (±5%)", () => {
    // duas 100×25 coladas pelo lado comprido ≡ uma 100×50, engastada à esquerda, carga na direita
    const glued = glueParts([rect(0, 0, 100, 25), rect(0, 25, 100, 25)])[0];
    const single = rect(0, 0, 100, 50);
    const base = { h: 2.5, E: 3000, nu: 0.25, strength: 18, thickness: 15, force: { fx: 0, fy: -200 } };

    const jobOf = (r: Region) => ({
      ...base, outer: r.outer, holes: r.holes,
      supports: [sideNear(r.outer, r.holes, [0, 25])],
      loads: [sideNear(r.outer, r.holes, [100, 25])],
    });
    const a = runFemJob(jobOf(glued));
    const b = runFemJob(jobOf(single));
    expect(a.maxDisp).toBeGreaterThan(0);
    expect(Math.abs(a.maxDisp - b.maxDisp) / b.maxDisp).toBeLessThan(0.05);
    // o pico de tensão mora no canto engastado (singularidade): sensível à malha → ±10%
    expect(Math.abs(a.maxVonMises - b.maxVonMises) / b.maxVonMises).toBeLessThan(0.1);
  });
});
