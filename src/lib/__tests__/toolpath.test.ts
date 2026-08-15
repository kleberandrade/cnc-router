import { describe, it, expect } from "vitest";
import { buildToolpath, segmentLength, workOriginOffset } from "../toolpath";
import { generateGCode } from "../gcode";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { RectangleShape, CircleShape, PathShape } from "../../types";

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

  it("pocket produces zig-zag feed rows", () => {
    const tp = buildToolpath([circle], DEFAULT_MACHINE_SETTINGS);
    const feeds = tp.segments.filter((s) => s.shapeId === "c1" && s.type === "feed");
    expect(feeds.length).toBeGreaterThan(4);
    expect(feeds.every((s) => s.op === "pocket")).toBe(true);
    // consecutive rows alternate direction
    expect(Math.sign(feeds[1].to[0] - feeds[1].from[0])).toBe(-Math.sign(feeds[3].to[0] - feeds[3].from[0]));
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
    expect(feedLines[0]).toBe(`G1 X${feedSegs[0].to[0]} Y${feedSegs[0].to[1]} F800`);
  });
});
