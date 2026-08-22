import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { registerFont, textToPolygons, nestLoops, isFontLoaded, explodeText, _resetFonts } from "../text";
import { expandShape } from "../expand";
import { buildToolpath } from "../toolpath";
import { generateGCode } from "../gcode";
import { boundingBox } from "../geometry";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { TextShape, PathShape } from "../../types";

const text = (over: Partial<TextShape> = {}): TextShape => ({
  id: "t", kind: "text", x: 20, y: 20, text: "Oi", fontId: "inter", size: 20, rotation: 0, align: "left", letterSpacing: 0,
  depth: 2, operation: "outline", side: "on", ...over,
});

beforeAll(() => {
  _resetFonts();
  const buf = readFileSync("public/fonts/Inter-Regular.ttf");
  registerFont("inter", buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
});

describe("text → polygons", () => {
  it("font registers and 'O' yields an outer loop with one hole", () => {
    expect(isFontLoaded("inter")).toBe(true);
    const polys = textToPolygons(text({ text: "O" }));
    expect(polys).toHaveLength(1);
    expect(polys[0].holes).toHaveLength(1);
    const b = boundingBox(polys[0].outer);
    expect(b.maxY - b.minY).toBeCloseTo(20 * 0.73, 0); // cap height ≈ 0.73 em
    expect(b.minY).toBeGreaterThanOrEqual(19.5); // baseline at y=20 (y up)
  });

  it("'Oi' yields glyphs advancing along +X; 'i' has two loops (stem + dot) → 2 outers", () => {
    const polys = textToPolygons(text({ text: "Oi" }));
    expect(polys.length).toBe(3);
    const xs = polys.map((p) => boundingBox(p.outer).minX);
    expect(Math.max(...xs)).toBeGreaterThan(Math.min(...xs) + 10);
  });

  it("align/rotation/letterSpacing move the glyphs", () => {
    const l = textToPolygons(text({ text: "AB", align: "left" }));
    const c = textToPolygons(text({ text: "AB", align: "center" }));
    expect(boundingBox(c.flatMap((p) => p.outer)).minX).toBeLessThan(boundingBox(l.flatMap((p) => p.outer)).minX);
    const spaced = textToPolygons(text({ text: "AB", letterSpacing: 5 }));
    expect(boundingBox(spaced.flatMap((p) => p.outer)).maxX).toBeCloseTo(boundingBox(l.flatMap((p) => p.outer)).maxX + 5, 3);
    const rot = textToPolygons(text({ text: "AB", rotation: 90 }));
    const rb = boundingBox(rot.flatMap((p) => p.outer));
    expect(rb.maxY - rb.minY).toBeGreaterThan(rb.maxX - rb.minX);
  });

  it("nestLoops assigns inner loops as holes", () => {
    const outer: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const hole: [number, number][] = [[3, 3], [7, 3], [7, 7], [3, 7]];
    const res = nestLoops([hole, outer]);
    expect(res).toHaveLength(1);
    expect(res[0].holes).toHaveLength(1);
  });

  it("expandShape turns text into path shapes with holes; toolpath and G-code work", () => {
    const parts = expandShape(text({ text: "O", side: "outside" }));
    expect(parts).toHaveLength(1);
    expect((parts[0] as PathShape).holes).toHaveLength(1);
    const tp = buildToolpath([text({ text: "O", side: "outside" })], { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 1 });
    expect(tp.shapeCount).toBe(1);
    // both the outer offset (+r) and the hole (−r) are traced → two rapids to loop starts
    const rapids = tp.segments.filter((s) => s.shapeId === "t#0" && s.type === "rapid");
    expect(rapids.length).toBeGreaterThanOrEqual(2);
    const g = generateGCode([text({ text: "O" })], { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 1 });
    expect(g).toContain("Outline pass");
  });
});

describe("pocket with islands", () => {
  it("scanlines never enter the island and the island wall is finished", () => {
    const shape: PathShape = {
      id: "p", kind: "path", closed: true, depth: 3, operation: "pocket",
      points: [[0, 0], [60, 0], [60, 40], [0, 40]],
      holes: [[[25, 15], [35, 15], [35, 25], [25, 25]]],
    };
    const settings = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 4, stepover: 2, passDepth: 3 };
    const tp = buildToolpath([shape], settings);
    const feeds = tp.segments.filter((s) => s.shapeId === "p" && s.type === "feed");
    // no cut point closer than r=2 to the hole rectangle (round corners allowed)
    const distToHole = (p: [number, number, number]) => {
      const dx = Math.max(25 - p[0], 0, p[0] - 35), dy = Math.max(15 - p[1], 0, p[1] - 25);
      return Math.hypot(dx, dy);
    };
    for (const s of feeds) for (const p of [s.from, s.to]) expect(distToHole(p)).toBeGreaterThanOrEqual(2 - 0.06);
    // island wall pass touches x = 23 or 37
    expect(feeds.some((s) => Math.abs(s.to[0] - 23) < 1e-6 || Math.abs(s.to[0] - 37) < 1e-6)).toBe(true);
  });
});

describe("explodeText", () => {
  it("vira contornos fechados, com os vazios do glifo como holes", () => {
    const parts = explodeText(text({ text: "O" }));
    expect(parts).toHaveLength(1);
    expect(parts[0].kind).toBe("path");
    expect(parts[0].closed).toBe(true);
    expect(parts[0].holes).toHaveLength(1);
    // mesma geometria que o expand usa para usinar
    expect(parts[0].points).toEqual(textToPolygons(text({ text: "O" }))[0].outer);
  });

  it("preserva profundidade, operação, lado, tabs e extraOps", () => {
    const src = text({
      text: "AB", depth: 7, operation: "pocket", side: "inside",
      tabs: { count: 3, width: 6, height: 2 },
      extraOps: [{ id: "op-1", operation: "outline", depth: 12, side: "outside" }],
    });
    const parts = explodeText(src);
    expect(parts.length).toBeGreaterThanOrEqual(2);
    for (const p of parts) {
      expect(p.depth).toBe(7);
      expect(p.operation).toBe("pocket");
      expect(p.side).toBe("inside");
      expect(p.tabs).toEqual({ count: 3, width: 6, height: 2 });
      expect(p.extraOps?.[0]).toMatchObject({ operation: "outline", depth: 12, side: "outside" });
    }
    // ids proprios: nem as peças nem as operações extras podem repetir id
    const ids = parts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const opIds = parts.flatMap((p) => p.extraOps?.map((o) => o.id) ?? []);
    expect(new Set(opIds).size).toBe(opIds.length);
  });

  it("sem fonte carregada não devolve nada", () => {
    expect(explodeText(text({ fontId: "nao-existe", text: "" }))).toEqual([]);
  });

  it("o contorno explodido usina igual ao texto original", () => {
    const src = text({ text: "O", side: "outside" });
    const before = buildToolpath([src], { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 1 });
    const after = buildToolpath(explodeText(src), { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 1 });
    expect(after.shapeCount).toBe(before.shapeCount);
    expect(after.segments.length).toBe(before.segments.length);
  });
});
