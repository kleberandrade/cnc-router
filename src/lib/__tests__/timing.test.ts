import { describe, it, expect } from "vitest";
import { estimateTime, formatDuration, formatClock } from "../timing";
import type { Segment } from "../toolpath";

const seg = (over: Partial<Segment>): Segment => ({
  from: [0, 0, 0], to: [0, 0, 0], type: "feed", feed: 600, shapeId: null, pass: 0, op: "travel", ...over,
});

describe("estimateTime", () => {
  it("100 mm at 600 mm/min takes 10 s", () => {
    const t = estimateTime([seg({ to: [100, 0, 0] })], { rapidRate: 3000 });
    expect(t.perSegment).toEqual([10]);
    expect(t.total).toBe(10);
  });
  it("rapids and retracts use rapidRate", () => {
    const t = estimateTime([seg({ to: [50, 0, 0], type: "rapid" }), seg({ to: [0, 0, 5], type: "retract" })], { rapidRate: 3000 });
    expect(t.perSegment[0]).toBeCloseTo(1);
    expect(t.perSegment[1]).toBeCloseTo(0.1);
  });
  it("cumulative is monotonic and ends at total", () => {
    const t = estimateTime([seg({ to: [10, 0, 0] }), seg({ from: [10, 0, 0], to: [10, 10, 0] }), seg({ from: [10, 10, 0], to: [10, 10, 0] })], { rapidRate: 3000 });
    expect(t.cumulative).toEqual([1, 2, 2]);
    expect(t.total).toBe(2);
  });
  it("zero-length or zero-feed segments take no time", () => {
    expect(estimateTime([seg({ to: [10, 0, 0], feed: 0 })], { rapidRate: 3000 }).total).toBe(0);
  });
});

describe("format", () => {
  it("formatDuration", () => {
    expect(formatDuration(12)).toBe("12s");
    expect(formatDuration(472)).toBe("7m52s");
    expect(formatDuration(3723)).toBe("1h02m03s");
  });
  it("formatClock", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3661)).toBe("1:01:01");
  });
});
