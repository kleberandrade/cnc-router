import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "../store";
import { boundingBox, shapeToPoints } from "../../lib/geometry";
import type { RectangleShape } from "../../types";

const rect = (id: string, x: number, y: number, w = 10, h = 10): RectangleShape => ({
  id, kind: "rectangle", x, y, width: w, height: h, rotation: 0, depth: 1, operation: "outline",
});
const S = useProjectStore.getState;
const box = (id: string) => boundingBox(shapeToPoints(S().shapes.find((s) => s.id === id)!));

describe("multi-selection", () => {
  beforeEach(() => {
    S().newProject();
    S().addShapes([rect("a", 0, 0), rect("b", 50, 20, 20, 10), rect("c", 100, 5)]);
  });

  it("select/toggleSelect/selectMany keep selectedId and selectedIds in sync", () => {
    S().select("a");
    expect(S().selectedIds).toEqual(["a"]);
    S().toggleSelect("b");
    expect(S().selectedIds).toEqual(["a", "b"]);
    expect(S().selectedId).toBe("b");
    S().toggleSelect("b");
    expect(S().selectedIds).toEqual(["a"]);
    expect(S().selectedId).toBe("a");
    S().selectMany(["b", "c"]);
    expect(S().selectedId).toBe("c");
    S().select(null);
    expect(S().selectedIds).toEqual([]);
  });

  it("removeSelected removes all selected", () => {
    S().selectMany(["a", "c"]);
    S().removeSelected();
    expect(S().shapes.map((s) => s.id)).toEqual(["b"]);
  });

  it("alignSelected aligns left/right/centre and top/bottom", () => {
    S().selectMany(["a", "b", "c"]);
    S().alignSelected("left");
    expect([box("a").minX, box("b").minX, box("c").minX]).toEqual([0, 0, 0]);
    S().alignSelected("right");
    expect(box("b").maxX).toBe(box("a").maxX);
    S().alignSelected("top");
    expect(box("a").maxY).toBe(box("b").maxY);
    S().alignSelected("centerX");
    const cx = (box("a").minX + box("a").maxX) / 2;
    expect((box("b").minX + box("b").maxX) / 2).toBeCloseTo(cx);
  });

  it("distributeSelected spaces centres evenly (needs 3+)", () => {
    S().selectMany(["a", "b", "c"]);
    S().distributeSelected("horizontal");
    const cs = ["a", "b", "c"].map((id) => (box(id).minX + box(id).maxX) / 2).sort((x, y) => x - y);
    expect(cs[1] - cs[0]).toBeCloseTo(cs[2] - cs[1]);
    S().selectMany(["a", "b"]);
    const before = box("a").minX;
    S().distributeSelected("horizontal");
    expect(box("a").minX).toBe(before);
  });
});

describe("booleanSelected / nestOnStock", () => {
  beforeEach(() => {
    S().newProject();
    S().addShapes([rect("a", 0, 0, 40, 30), rect("b", 20, 10, 40, 30), rect("c", 100, 5)]);
  });
  it("união substitui as selecionadas por 1 path na posição da primeira e a seleciona", () => {
    S().selectMany(["a", "b"]);
    const ids = S().booleanSelected("union");
    expect(ids).toHaveLength(1);
    expect(S().shapes.map((s) => s.id)).toEqual([ids[0], "c"]);
    expect(S().selectedIds).toEqual(ids);
    expect(S().shapes[0].kind).toBe("path");
  });
  it("com menos de 2 selecionadas não faz nada; formas travadas são ignoradas", () => {
    S().select("a");
    expect(S().booleanSelected("union")).toEqual([]);
    S().updateShape("b", { locked: true });
    S().selectMany(["a", "b"]);
    expect(S().booleanSelected("difference")).toEqual([]);
    expect(S().shapes).toHaveLength(3);
  });
  it("nestOnStock organiza todas as visíveis/destravadas dentro da chapa e devolve o resultado", () => {
    S().updateStock({ width: 200, height: 100, offsetX: 10, offsetY: 20 });
    S().updateShape("c", { hidden: true });
    const res = S().nestOnStock({ spacing: 4, allowRotate: true });
    expect(res.placed.map((p) => p.id).sort()).toEqual(["a", "b"]);
    expect(res.overflow).toEqual([]);
    for (const id of ["a", "b"]) {
      const b = box(id);
      expect(b.minX).toBeGreaterThanOrEqual(14 - 1e-6);
      expect(b.minY).toBeGreaterThanOrEqual(24 - 1e-6);
      expect(b.maxX).toBeLessThanOrEqual(210 - 4 + 1e-6);
      expect(b.maxY).toBeLessThanOrEqual(120 - 4 + 1e-6);
    }
    expect(box("c").minX).toBe(100); // hidden shape untouched
  });
  it("nestOnStock com ids organiza só a seleção", () => {
    const before = box("c");
    S().nestOnStock({ spacing: 2, allowRotate: false }, ["a", "b"]);
    expect(box("c")).toEqual(before);
  });
});
