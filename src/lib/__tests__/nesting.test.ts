import { describe, it, expect } from "vitest";
import { nestShapes, applyPlacements, rotateShape90 } from "../nesting";
import { shapeToPoints, boundingBox } from "../geometry";
import type { Shape, RectangleShape } from "../../types";

const rect = (id: string, w: number, h: number, x = 500, y = 500): RectangleShape => ({ id, kind: "rectangle", x, y, width: w, height: h, rotation: 0, depth: 5, operation: "outline" });
const box = (s: Shape) => boundingBox(shapeToPoints(s));
const overlaps = (a: ReturnType<typeof box>, b: ReturnType<typeof box>, gap: number) =>
  a.minX < b.maxX + gap - 1e-6 && b.minX < a.maxX + gap - 1e-6 && a.minY < b.maxY + gap - 1e-6 && b.minY < a.maxY + gap - 1e-6;

describe("nesting", () => {
  it("coloca N retângulos dentro da chapa sem sobreposição e respeitando o espaçamento", () => {
    const shapes: Shape[] = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 20; i++) shapes.push(rect(`r${i}`, 20 + Math.round(rnd() * 60), 15 + Math.round(rnd() * 40)));
    const t0 = performance.now();
    const res = nestShapes(shapes, { width: 300, height: 200, spacing: 5, allowRotate: true });
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(res.placed.length + res.overflow.length).toBe(20);
    expect(res.placed.length).toBeGreaterThan(10);
    const placed = applyPlacements(shapes, res.placed, [0, 0]).filter((s) => res.placed.some((p) => p.id === s.id));
    const boxes = placed.map(box);
    for (const b of boxes) {
      expect(b.minX).toBeGreaterThanOrEqual(5 - 1e-6);
      expect(b.minY).toBeGreaterThanOrEqual(5 - 1e-6);
      expect(b.maxX).toBeLessThanOrEqual(300 - 5 + 1e-6);
      expect(b.maxY).toBeLessThanOrEqual(200 - 5 + 1e-6);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i], boxes[j], 5)).toBe(false);
  });
  it("peças que não cabem vão para overflow e não se movem", () => {
    const shapes = [rect("big", 400, 100, 10, 10), rect("ok", 50, 50)];
    const res = nestShapes(shapes, { width: 300, height: 200, spacing: 4, allowRotate: true });
    expect(res.overflow).toEqual(["big"]);
    const out = applyPlacements(shapes, res.placed, [0, 0]);
    expect(out[0]).toEqual(shapes[0]);
    expect(box(out[1]).minX).toBeCloseTo(4);
  });
  it("rotação de 90° é usada quando a peça só cabe deitada", () => {
    const res = nestShapes([rect("tall", 40, 250)], { width: 300, height: 100, spacing: 2, allowRotate: true });
    expect(res.placed[0]?.rotated).toBe(true);
    const noRot = nestShapes([rect("tall", 40, 250)], { width: 300, height: 100, spacing: 2, allowRotate: false });
    expect(noRot.overflow).toEqual(["tall"]);
  });
  it("origem da chapa é somada às posições", () => {
    const shapes = [rect("a", 20, 10)];
    const res = nestShapes(shapes, { width: 100, height: 100, spacing: 2, allowRotate: false });
    const out = applyPlacements(shapes, res.placed, [50, 30]);
    expect(box(out[0]).minX).toBeCloseTo(52);
    expect(box(out[0]).minY).toBeCloseTo(32);
  });
  it("rotateShape90 mantém o centro e troca largura/altura (retângulo, path com furo, texto)", () => {
    const r = rotateShape90(rect("a", 40, 10, 0, 0));
    const b = box(r);
    expect(b.maxX - b.minX).toBeCloseTo(10);
    expect(b.maxY - b.minY).toBeCloseTo(40);
    expect((b.minX + b.maxX) / 2).toBeCloseTo(20);
    expect((b.minY + b.maxY) / 2).toBeCloseTo(5);
    const path: Shape = { id: "p", kind: "path", closed: true, points: [[0, 0], [30, 0], [30, 10], [0, 10]], holes: [[[5, 2], [10, 2], [10, 8], [5, 8]]], depth: 2, operation: "pocket" };
    const rp = rotateShape90(path);
    expect(rp.kind === "path" && rp.holes?.[0].length).toBe(4);
    const hb = boundingBox((rp as typeof path).holes![0]);
    expect(hb.maxX - hb.minX).toBeCloseTo(6);
    expect(hb.maxY - hb.minY).toBeCloseTo(5);
    const circle: Shape = { id: "c", kind: "circle", x: 5, y: 5, radius: 3, depth: 1, operation: "outline" };
    expect(rotateShape90(circle)).toBe(circle);
  });
});
