import { describe, it, expect } from "vitest";
import { buildToolpath, type Segment } from "../toolpath";
import { estimateTime } from "../timing";
import { segmentIndexAt, positionAt, boundariesFor, nextBoundary, prevBoundary, progressAt } from "../playback";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { RectangleShape } from "../../types";

const seg = (from: [number, number, number], to: [number, number, number], over: Partial<Segment> = {}): Segment => ({
  from, to, type: "feed", feed: 600, shapeId: "a", pass: 1, op: "outline", ...over,
});
// three 10 mm feed segments at 600 mm/min = 1 s each
const segs = [seg([0, 0, 0], [10, 0, 0]), seg([10, 0, 0], [10, 10, 0]), seg([10, 10, 0], [0, 10, 0], { pass: 2 })];
const timing = estimateTime(segs, { rapidRate: 3000 });

describe("segmentIndexAt / positionAt", () => {
  it("finds the active segment and interpolates", () => {
    expect(segmentIndexAt(timing, 0)).toBe(0);
    expect(segmentIndexAt(timing, 0.5)).toBe(0);
    expect(segmentIndexAt(timing, 1)).toBe(1); // boundary belongs to the next segment
    expect(segmentIndexAt(timing, 2.5)).toBe(2);
    expect(segmentIndexAt(timing, 99)).toBe(2);
    expect(positionAt(segs, timing, 0.5)).toEqual([5, 0, 0]);
    expect(positionAt(segs, timing, 1.5)).toEqual([10, 5, 0]);
    expect(positionAt(segs, timing, 3)).toEqual([0, 10, 0]);
    expect(positionAt(segs, timing, -1)).toEqual([0, 0, 0]);
  });
  it("handles empty paths", () => {
    expect(positionAt([], estimateTime([], { rapidRate: 1 }), 1)).toEqual([0, 0, 0]);
    expect(segmentIndexAt(estimateTime([], { rapidRate: 1 }), 1)).toBe(-1);
  });
});

describe("boundariesFor", () => {
  it("segment mode: end of every timed segment", () => {
    expect(boundariesFor(segs, timing, "segment")).toEqual([1, 2, 3]);
  });
  it("pass mode: end of each pass run", () => {
    expect(boundariesFor(segs, timing, "pass")).toEqual([2, 3]);
  });
  it("shape mode: end of each shape run", () => {
    const two = [...segs, seg([0, 10, 0], [0, 20, 0], { shapeId: "b" })];
    const tm = estimateTime(two, { rapidRate: 3000 });
    expect(boundariesFor(two, tm, "shape")).toEqual([3, 4]);
    expect(boundariesFor(segs, timing, "shape")).toEqual([3]);
  });
  it("works on a real toolpath (rect, 2 passes)", () => {
    const rect: RectangleShape = { id: "r", kind: "rectangle", x: 0, y: 0, width: 10, height: 10, rotation: 0, depth: 4, operation: "outline" };
    const tp = buildToolpath([rect], DEFAULT_MACHINE_SETTINGS);
    const tm = estimateTime(tp.segments, { rapidRate: 3000 });
    const passes = boundariesFor(tp.segments, tm, "pass");
    // travel-in, pass1, pass2, travel-out(retract), final travel → at least 3 boundaries, last = total
    expect(passes.length).toBeGreaterThanOrEqual(3);
    expect(passes.at(-1)).toBeCloseTo(tm.total);
    expect(boundariesFor(tp.segments, tm, "shape").at(-1)).toBeCloseTo(tm.total);
  });
});

describe("next/prevBoundary", () => {
  const b = [1, 2, 3];
  it("moves to the next/previous boundary and clamps", () => {
    expect(nextBoundary(b, 0)).toBe(1);
    expect(nextBoundary(b, 1)).toBe(2);
    expect(nextBoundary(b, 2.5)).toBe(3);
    expect(nextBoundary(b, 3)).toBe(3);
    expect(prevBoundary(b, 3)).toBe(2);
    expect(prevBoundary(b, 2.5)).toBe(2);
    expect(prevBoundary(b, 1)).toBe(0);
    expect(prevBoundary(b, 0)).toBe(0);
  });
});

describe("progressAt", () => {
  it("reports shape/pass counters", () => {
    const p = progressAt(segs, timing, 2.5);
    expect(p).toMatchObject({ segmentIndex: 2, shapeIndex: 0, shapeCount: 1, pass: 2, passCount: 2, op: "outline" });
    expect(progressAt([], estimateTime([], { rapidRate: 1 }), 0).segmentIndex).toBe(-1);
  });
});
