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
