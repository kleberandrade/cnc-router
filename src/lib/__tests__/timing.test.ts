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

describe("estimateTime v2 (aceleração)", () => {
  it("single 100 mm segment at 600 mm/min (10 mm/s), a = 100 mm/s²: 10 s + 0.1 s de rampas", () => {
    // accelerate 0→10 in 0.1 s over 0.5 mm, same to stop: cruise 99 mm / 10 = 9.9 s → total 10.1 s
    const t = estimateTime([seg({ to: [100, 0, 0] })], { rapidRate: 3000, accel: 100 });
    expect(t.total).toBeCloseTo(10.1, 3);
  });
  it("segment too short to reach feed: triangular profile", () => {
    // 1 mm at 10 mm/s with a = 10: vpeak = sqrt(2·10·1/2) = sqrt(10) ≈ 3.16 → t = 2·3.16/10 = 0.632 s
    const t = estimateTime([seg({ to: [1, 0, 0] })], { rapidRate: 3000, accel: 10 });
    expect(t.total).toBeCloseTo(0.632, 2);
  });
  it("collinear segments do not slow down at the junction", () => {
    const one = estimateTime([seg({ to: [100, 0, 0] })], { rapidRate: 3000, accel: 100 }).total;
    const two = estimateTime([seg({ to: [50, 0, 0] }), seg({ from: [50, 0, 0], to: [100, 0, 0] })], { rapidRate: 3000, accel: 100 }).total;
    expect(two).toBeCloseTo(one, 6);
  });
  it("a sharp corner costs a full stop; polygonised circle takes longer than v1 but not absurdly", () => {
    const straight = estimateTime([seg({ to: [50, 0, 0] }), seg({ from: [50, 0, 0], to: [100, 0, 0] })], { rapidRate: 3000, accel: 100 }).total;
    const corner = estimateTime([seg({ to: [50, 0, 0] }), seg({ from: [50, 0, 0], to: [50, 50, 0] })], { rapidRate: 3000, accel: 100 }).total;
    expect(corner).toBeGreaterThan(straight + 0.05);
    const circle: Segment[] = [];
    const n = 120;
    for (let i = 0; i < n; i++) {
      const a0 = (2 * Math.PI * i) / n, a1 = (2 * Math.PI * (i + 1)) / n;
      circle.push(seg({ from: [20 * Math.cos(a0), 20 * Math.sin(a0), 0], to: [20 * Math.cos(a1), 20 * Math.sin(a1), 0] }));
    }
    const v1 = estimateTime(circle, { rapidRate: 3000 }).total;
    const v2 = estimateTime(circle, { rapidRate: 3000, accel: 200 }).total;
    expect(v2).toBeGreaterThan(v1);
    expect(v2).toBeLessThan(v1 * 1.5);
  });
  it("accel 0 falls back to v1", () => {
    const a = estimateTime([seg({ to: [100, 0, 0] })], { rapidRate: 3000, accel: 0 }).total;
    expect(a).toBe(10);
  });
});
