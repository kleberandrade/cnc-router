import { describe, it, expect } from "vitest";
import { booleanShapes, shapeRegions, regionArea, loopArea } from "../boolean";
import { buildToolpath } from "../toolpath";
import { DEFAULT_MACHINE_SETTINGS, type Shape, type RectangleShape, type CircleShape } from "../../types";

const rect = (id: string, x: number, y: number, w: number, h: number): RectangleShape => ({ id, kind: "rectangle", x, y, width: w, height: h, rotation: 0, depth: 5, operation: "outline", side: "outside" });
const circle = (id: string, x: number, y: number, r: number): CircleShape => ({ id, kind: "circle", x, y, radius: r, depth: 3, operation: "pocket" });
const ids = (i: number) => `b${i}`;
const area = (s: Shape) => shapeRegions(s).reduce((a, r) => a + regionArea(r), 0);

describe("booleanas", () => {
  it("união de dois retângulos sobrepostos → 1 forma, área = soma − interseção, sem laços duplicados", () => {
    const out = booleanShapes("union", [rect("a", 0, 0, 40, 30), rect("b", 20, 10, 40, 30)], ids);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("path");
    expect(out[0].holes).toBeUndefined();
    expect(area(out[0])).toBeCloseTo(40 * 30 * 2 - 20 * 20, 1);
    // union of an L shape: 8 vertices
    expect(out[0].points.length).toBe(8);
    expect(loopArea(out[0].points)).toBeGreaterThan(0); // CCW
    // inherits from the base
    expect(out[0].depth).toBe(5);
    expect(out[0].side).toBe("outside");
    expect(out[0].id).toBe("b0");
  });
  it("união de formas separadas mantém 2 formas", () => {
    const out = booleanShapes("union", [rect("a", 0, 0, 10, 10), rect("b", 50, 50, 10, 10)], ids);
    expect(out).toHaveLength(2);
  });
  it("subtração de um círculo no meio cria um furo (ilha)", () => {
    const out = booleanShapes("difference", [rect("a", 0, 0, 60, 40), circle("c", 30, 20, 8)], ids);
    expect(out).toHaveLength(1);
    expect(out[0].holes).toHaveLength(1);
    expect(area(out[0])).toBeCloseTo(60 * 40 - Math.PI * 64, 0);
    // hole is inside the outer
    const h = out[0].holes![0];
    expect(Math.min(...h.map((p) => p[0]))).toBeGreaterThan(20);
    expect(Math.max(...h.map((p) => p[0]))).toBeLessThan(40);
  });
  it("subtração que atravessa divide em duas formas", () => {
    const out = booleanShapes("difference", [rect("a", 0, 0, 60, 40), rect("b", 25, -5, 10, 50)], ids);
    expect(out).toHaveLength(2);
    expect(out.reduce((s, o) => s + area(o), 0)).toBeCloseTo(60 * 40 - 10 * 40, 1);
    expect(out.map((o) => o.name)).toEqual(["Subtração 1", "Subtração 2"]);
  });
  it("interseção de dois retângulos = retângulo comum; sem sobreposição = vazio", () => {
    const out = booleanShapes("intersection", [rect("a", 0, 0, 40, 30), rect("b", 20, 10, 40, 30)], ids);
    expect(out).toHaveLength(1);
    expect(area(out[0])).toBeCloseTo(20 * 20, 1);
    expect(booleanShapes("intersection", [rect("a", 0, 0, 10, 10), rect("b", 50, 50, 10, 10)], ids)).toHaveLength(0);
  });
  it("furo de uma forma com ilha é respeitado na união (a ilha some se a outra forma a cobre)", () => {
    const withHole = booleanShapes("difference", [rect("a", 0, 0, 60, 40), circle("c", 30, 20, 8)], ids)[0];
    const filled = booleanShapes("union", [withHole, rect("b", 20, 10, 20, 20)], ids);
    expect(filled).toHaveLength(1);
    expect(filled[0].holes).toBeUndefined();
    expect(area(filled[0])).toBeCloseTo(60 * 40, 1);
  });
  it("texto entra na booleana como polígonos (união com um retângulo vira 1 forma)", () => {
    const text: Shape = { id: "t", kind: "text", x: 10, y: 10, text: "I", fontId: "inter", size: 20, rotation: 0, align: "left", letterSpacing: 0, depth: 3, operation: "outline" };
    const out = booleanShapes("union", [rect("a", 0, 0, 100, 60), text], ids);
    expect(out).toHaveLength(1);
    expect(area(out[0])).toBeCloseTo(6000, 0);
  });
  it("resultado da subtração usina como pocket com ilha (nenhuma linha dentro do furo)", () => {
    const base = { ...rect("a", 0, 0, 60, 40), operation: "pocket" as const, depth: 3 };
    const out = booleanShapes("difference", [base, circle("c", 30, 20, 8)], ids);
    const tp = buildToolpath(out, { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 4, stepover: 2 });
    const cuts = tp.segments.filter((s) => s.op === "pocket" && s.type === "feed");
    for (const s of cuts) {
      const mid = [(s.from[0] + s.to[0]) / 2, (s.from[1] + s.to[1]) / 2];
      expect(Math.hypot(mid[0] - 30, mid[1] - 20)).toBeGreaterThan(8 + 2 - 0.1);
    }
  });
});
