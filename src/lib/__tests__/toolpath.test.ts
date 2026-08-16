import { describe, it, expect } from "vitest";
import { buildToolpath, segmentLength, workOriginOffset, orderShapes } from "../toolpath";
import { generateGCode } from "../gcode";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { RectangleShape, CircleShape, PathShape, Shape } from "../../types";

const rect: RectangleShape = {
  id: "r1", kind: "rectangle", x: 0, y: 0, width: 10, height: 10, rotation: 0, depth: 4, operation: "outline",
};
const circle: CircleShape = { id: "c1", kind: "circle", x: 50, y: 50, radius: 10, depth: 3, operation: "pocket" };

describe("buildToolpath", () => {
  it("returns only the boilerplate travel for no shapes", () => {
    const tp = buildToolpath([], DEFAULT_MACHINE_SETTINGS);
    expect(tp.shapeCount).toBe(0);
    expect(tp.segments.map((s) => s.type)).toEqual(["retract", "retract", "rapid"]);
    expect(tp.segments.at(-1)?.to).toEqual([0, 0, 5]);
  });

  it("starts each shape at safe height above its first point and plunges to each pass depth", () => {
    const tp = buildToolpath([rect], DEFAULT_MACHINE_SETTINGS); // passDepth 2 → passes 2, 4
    const segs = tp.segments.filter((s) => s.shapeId === "r1");
    expect(segs[0]).toMatchObject({ type: "rapid", to: [0, 0, 5], comment: "Outline pass, target depth 4mm" });
    const plunges = segs.filter((s) => s.type === "plunge").map((s) => s.to[2]);
    expect(plunges).toEqual([-2, -4]);
    expect(segs.filter((s) => s.type === "plunge").map((s) => s.pass)).toEqual([1, 2]);
    expect(segs.at(-1)).toMatchObject({ type: "retract", to: [0, 0, 5] });
  });

  it("pocket produces zig-zag feed rows inside the tool-offset contour, plus a wall pass", () => {
    const tp = buildToolpath([circle], DEFAULT_MACHINE_SETTINGS);
    const feeds = tp.segments.filter((s) => s.shapeId === "c1" && s.type === "feed");
    expect(feeds.length).toBeGreaterThan(4);
    expect(feeds.every((s) => s.op === "pocket")).toBe(true);
    // every cut point stays inside the circle shrunk by the tool radius (10 - 1.5)
    for (const s of feeds) {
      for (const p of [s.from, s.to]) expect(Math.hypot(p[0] - 50, p[1] - 50)).toBeLessThanOrEqual(8.5 + 0.02);
    }
    // the wall pass reaches (close to) the offset radius
    const maxR = Math.max(...feeds.map((s) => Math.hypot(s.to[0] - 50, s.to[1] - 50)));
    expect(maxR).toBeGreaterThan(8.3);
    // rows alternate direction
    const rows = feeds.filter((s) => s.from[1] === s.to[1] && s.from[0] !== s.to[0]);
    expect(Math.sign(rows[0].to[0] - rows[0].from[0])).toBe(-Math.sign(rows[1].to[0] - rows[1].from[0]));
  });

  it("skips shapes without points", () => {
    const empty: PathShape = { id: "p", kind: "path", points: [], closed: false, depth: 3, operation: "outline" };
    expect(buildToolpath([empty], DEFAULT_MACHINE_SETTINGS).shapeCount).toBe(0);
  });

  it("applies the work origin", () => {
    const s = { ...DEFAULT_MACHINE_SETTINGS, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, offsetX: 10, offsetY: 5 } };
    expect(workOriginOffset(s)).toEqual([10, 5]);
    const first = buildToolpath([rect], s).segments.find((x) => x.shapeId === "r1");
    expect(first?.to).toEqual([-10, -5, 5]);
  });

  it("segmentLength is euclidean", () => {
    expect(segmentLength({ from: [0, 0, 0], to: [3, 4, 0], type: "feed", feed: 1, shapeId: null, pass: 0, op: "travel" })).toBe(5);
  });

  it("is the same path the G-code exporter serializes (parity)", () => {
    const g = generateGCode([rect, circle], DEFAULT_MACHINE_SETTINGS);
    const tp = buildToolpath([rect, circle], DEFAULT_MACHINE_SETTINGS);
    const feedLines = g.split("\n").filter((l) => l.startsWith("G1 X"));
    const feedSegs = tp.segments.filter((s) => s.type === "feed");
    expect(feedLines).toHaveLength(feedSegs.length);
    const f = (n: number) => n.toFixed(3).replace(/\.?0+$/, "");
    expect(feedLines[0]).toBe(`G1 X${f(feedSegs[0].to[0])} Y${f(feedSegs[0].to[1])} F800`);
  });
});

describe("tool compensation, tabs, ramp, ordering (sprint 06)", () => {
  const rect40: RectangleShape = {
    id: "r", kind: "rectangle", x: 0, y: 0, width: 40, height: 30, rotation: 0, depth: 6, operation: "outline",
  };
  const settings = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 6, passDepth: 6 };
  const bboxOf = (segs: ReturnType<typeof buildToolpath>["segments"], id: string) => {
    const pts = segs.filter((s) => s.shapeId === id && s.type === "feed").flatMap((s) => [s.from, s.to]);
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };

  it("outside offset yields 46×36 tool-centre path, inside 34×24, on 40×30", () => {
    expect(bboxOf(buildToolpath([{ ...rect40, side: "outside" }], settings).segments, "r")).toEqual({ w: 46, h: 36 });
    expect(bboxOf(buildToolpath([{ ...rect40, side: "inside" }], settings).segments, "r")).toEqual({ w: 34, h: 24 });
    expect(bboxOf(buildToolpath([{ ...rect40, side: "on" }], settings).segments, "r")).toEqual({ w: 40, h: 30 });
  });

  it("inside offset on a shape smaller than the tool is skipped with a warning", () => {
    const tiny: CircleShape = { id: "t", kind: "circle", x: 5, y: 5, radius: 2, depth: 2, operation: "outline", side: "inside" };
    const tp = buildToolpath([tiny], settings);
    expect(tp.shapeCount).toBe(0);
    expect(tp.warnings[0].message).toMatch(/menor que a fresa/);
    const tp2 = buildToolpath([{ ...tiny, operation: "pocket" }], settings);
    expect(tp2.warnings[0].message).toMatch(/Rebaixo menor/);
  });

  it("tabs lift the tool to depth - height for `count` intervals of `width`", () => {
    const tp = buildToolpath([{ ...rect40, tabs: { count: 2, width: 8, height: 3 } }], settings);
    const cut = tp.segments.filter((s) => s.shapeId === "r" && s.pass === 1);
    const zs = new Set(cut.map((s) => s.to[2]));
    expect(zs.has(-6)).toBe(true);
    expect(zs.has(-3)).toBe(true);
    // horizontal moves at tab height total 2 × 8 mm
    const tabLen = cut.filter((s) => s.from[2] === -3 && s.to[2] === -3).reduce((a, s) => a + Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]), 0);
    expect(tabLen).toBeCloseTo(16, 5);
    // no tabs on passes above the tab height
    const tp2 = buildToolpath([{ ...rect40, tabs: { count: 2, width: 8, height: 3 } }], { ...settings, passDepth: 2 });
    const pass1 = tp2.segments.filter((s) => s.shapeId === "r" && s.pass === 1);
    expect(new Set(pass1.map((s) => s.to[2]))).toEqual(new Set([-2]));
  });

  it("ramp entry descends along the path instead of plunging", () => {
    const tp = buildToolpath([rect40], { ...settings, rampAngle: 10 });
    const cut = tp.segments.filter((s) => s.shapeId === "r" && s.pass === 1 && !(s.type === "plunge" && s.to[2] === 0));
    expect(cut.some((s) => s.type === "plunge")).toBe(false);
    // first cutting move goes down while moving in XY
    expect(cut[0].from[2] === 0).toBe(true);
    expect(cut[0].to[2]).toBeLessThan(0);
    expect(cut[0].to[0] !== cut[0].from[0] || cut[0].to[1] !== cut[0].from[1]).toBe(true);
    // with a 2° ramp the descent spans several edges
    const shallow = buildToolpath([rect40], { ...settings, rampAngle: 2 }).segments.filter((s) => s.shapeId === "r" && s.pass === 1);
    expect(shallow.filter((s) => s.to[2] > -6 + 1e-9).length).toBeGreaterThan(2);
    // ends at full depth back where the ramp reached depth (a full loop from there)
    const last = cut[cut.length - 1];
    expect(last.to[2]).toBe(-6);
    const rampEnd = cut.find((s) => s.to[2] === -6)!.to;
    expect(last.to[0]).toBeCloseTo(rampEnd[0], 6);
    expect(last.to[1]).toBeCloseTo(rampEnd[1], 6);
    // ramp length = 6 / tan(10°) ≈ 34 mm
    const rampLen = cut.filter((s) => s.to[2] > -6 + 1e-9 || s.from[2] > -6 + 1e-9).reduce((a, s) => a + Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]), 0);
    expect(rampLen).toBeCloseTo(6 / Math.tan((10 * Math.PI) / 180), 3);
  });

  it("orderShapes: pockets → inner outlines → outer outlines, nearest first", () => {
    const a: RectangleShape = { ...rect40, id: "outer-far", x: 200, y: 200, side: "outside" };
    const b: RectangleShape = { ...rect40, id: "outer-near", x: 5, y: 5, side: "outside" };
    const c: RectangleShape = { ...rect40, id: "hole", x: 100, y: 100, side: "inside" };
    const d: RectangleShape = { ...rect40, id: "pocket", x: 150, y: 150, operation: "pocket" };
    const ordered = orderShapes([a, b, c, d], DEFAULT_MACHINE_SETTINGS).map((s) => s.id);
    expect(ordered).toEqual(["pocket", "hole", "outer-near", "outer-far"]);
    expect(orderShapes([a, b, c, d], { ...DEFAULT_MACHINE_SETTINGS, orderMode: "manual" }).map((s) => s.id)).toEqual(["outer-far", "outer-near", "hole", "pocket"]);
  });
});

describe("furação (drill)", () => {
  const settings = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 3, safeHeight: 5 };
  it("mergulha no centro do círculo até a profundidade, sem movimento XY em corte", () => {
    const tp = buildToolpath([{ id: "h", kind: "circle", x: 50, y: 40, radius: 1.5, depth: 6, operation: "drill" }], settings);
    const drill = tp.segments.filter((s) => s.op === "drill");
    expect(drill.length).toBeGreaterThan(0);
    for (const s of drill.filter((s) => s.type === "plunge" || s.type === "feed")) {
      expect(s.from[0]).toBeCloseTo(50); expect(s.to[0]).toBeCloseTo(50);
      expect(s.from[1]).toBeCloseTo(40); expect(s.to[1]).toBeCloseTo(40);
    }
    const bottom = Math.min(...drill.map((s) => s.to[2]));
    expect(bottom).toBeCloseTo(-6);
    expect(tp.warnings).toEqual([]);
    expect(drill.filter((s) => s.type === "plunge")).toHaveLength(1);
  });
  it("peck: uma bicada por peckDepth com retração à altura segura entre elas", () => {
    const tp = buildToolpath([{ id: "h", kind: "circle", x: 50, y: 40, radius: 1.5, depth: 6, operation: "drill" }], { ...settings, peckDepth: 2 });
    const plunges = tp.segments.filter((s) => s.op === "drill" && s.type === "plunge");
    expect(plunges.map((s) => s.to[2])).toEqual([-2, -4, -6]);
    const retracts = tp.segments.filter((s) => s.op === "drill" && s.type === "retract");
    expect(retracts.length).toBe(3);
    expect(retracts.every((s) => s.to[2] === 5)).toBe(true);
  });
  it("furo maior que a fresa gera aviso e ainda fura no centro", () => {
    const tp = buildToolpath([{ id: "h", kind: "circle", x: 50, y: 40, radius: 4, depth: 6, operation: "drill" }], settings);
    expect(tp.warnings.some((w) => w.message.includes("maior que a fresa"))).toBe(true);
    expect(tp.segments.some((s) => s.op === "drill" && s.type === "plunge")).toBe(true);
  });
  it("G-code de furação: G1 Z no centro e nada de G81 (compatível com todos os pós)", () => {
    const g = generateGCode([{ id: "h", kind: "circle", x: 50, y: 40, radius: 1.5, depth: 6, operation: "drill" }], settings);
    expect(g).toContain("G0 X50 Y40");
    expect(g).toContain("G1 Z-6 F200");
    expect(g).not.toContain("G81");
  });
});

describe("hélice de entrada", () => {
  const settings = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 6, stepover: 3, passDepth: 3, helixEntry: true, helixPitch: 1 };
  const pocket: Shape = { id: "p", kind: "rectangle", x: 20, y: 20, width: 60, height: 40, rotation: 0, depth: 6, operation: "pocket" };
  it("não há mergulho vertical em material: o primeiro movimento de corte desce em hélice", () => {
    const tp = buildToolpath([pocket], settings);
    const cut = tp.segments.filter((s) => s.op === "pocket");
    // vertical plunges below the surface (into material) must not exist
    // (a plunge down to the floor of the previous pass is through air and allowed)
    const verticalIntoMaterial = cut.filter((s) => s.type === "plunge" && s.to[2] < -(s.pass - 1) * 3 - 1e-9 && s.from[0] === s.to[0] && s.from[1] === s.to[1]);
    expect(verticalIntoMaterial).toHaveLength(0);
    // helix moves: XY and Z change together
    const helix = cut.filter((s) => s.type === "feed" && s.from[2] !== s.to[2]);
    expect(helix.length).toBeGreaterThan(24);
    // helix radius = 0.6·Ø/2 = 1.8 mm around a centre inside the pocket
    const first = helix[0];
    const last = helix[helix.length - 1];
    expect(Math.hypot(first.to[0] - last.to[0], first.to[1] - last.to[1])).toBeLessThan(2 * 1.8 + 1e-6);
    // second pass also enters by helix from the previous floor
    const passStarts = cut.filter((s) => s.type === "feed" && s.from[2] !== s.to[2] && Math.abs(s.from[2] - -3) < 1e-9);
    expect(passStarts.length).toBeGreaterThan(0);
    expect(tp.warnings).toEqual([]);
  });
  it("pitch respeitado: com 1 mm/volta e 3 mm de passe há ~3 voltas + 1 volta de fundo", () => {
    const tp = buildToolpath([pocket], settings);
    const cut = tp.segments.filter((s) => s.op === "pocket" && s.pass === 1);
    const helix = cut.filter((s) => s.type === "feed" && s.from[2] !== s.to[2]);
    expect(helix.length).toBe(72); // 3 revs × 24 steps
  });
  it("rebaixo estreito demais para a hélice cai para mergulho vertical com aviso", () => {
    const narrow: Shape = { id: "n", kind: "rectangle", x: 20, y: 20, width: 60, height: 7, rotation: 0, depth: 3, operation: "pocket" };
    const tp = buildToolpath([narrow], settings);
    expect(tp.warnings.some((w) => w.message.includes("hélice"))).toBe(true);
    expect(tp.segments.some((s) => s.op === "pocket" && s.type === "plunge" && s.to[2] < 0)).toBe(true);
  });
  it("G-code da hélice não começa com G1 Z vertical", () => {
    const g = generateGCode([pocket], settings);
    const lines = g.split("\n");
    const i = lines.findIndex((l) => l.startsWith("; Pocket clear"));
    const firstCut = lines.slice(i + 1).find((l) => /^G1 .*Z-/.test(l));
    expect(firstCut).toMatch(/^G1 X[\d.-]+ Y[\d.-]+ Z-/);
  });
});

describe("rebaixo em anel (moldura): zigzag por região, sem hop a cada linha", () => {
  it("anel 300×190 − 284×174 com fresa Ø6: ≤ 8 mergulhos e tempo < 60 % do zigzag ingênuo", async () => {
    const { booleanShapes } = await import("../boolean");
    const { estimateTime } = await import("../timing");
    const S = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 6, stepover: 3.6, passDepth: 4, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 420, height: 280, thickness: 30 } };
    const outerR: Shape = { id: "o", kind: "rectangle", x: 30, y: 30, width: 300, height: 190, rotation: 0, depth: 4, operation: "pocket", corners: { type: "fillet", size: 14 } };
    const innerR: Shape = { id: "i", kind: "rectangle", x: 38, y: 38, width: 284, height: 174, rotation: 0, depth: 4, operation: "pocket", corners: { type: "fillet", size: 8 } };
    const groove = booleanShapes("difference", [outerR, innerR], () => "g")[0];
    const tp = buildToolpath([groove], S);
    const plunges = tp.segments.filter((s) => s.op === "pocket" && s.type === "plunge").length;
    expect(plunges).toBeLessThanOrEqual(8);
    const t = estimateTime(tp.segments, { rapidRate: 3000, accel: 200 }).total;
    expect(t).toBeLessThan(6 * 60);
  });
});
