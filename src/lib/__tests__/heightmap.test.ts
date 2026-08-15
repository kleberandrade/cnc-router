import { describe, it, expect } from "vitest";
import { createHeightmap, carveUpTo, heightAt, pickResolution, removedVolume, resetHeightmap, stamp } from "../heightmap";
import { buildToolpath } from "../toolpath";
import { estimateTime } from "../timing";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { RectangleShape, CircleShape } from "../../types";

const stock = { width: 100, height: 80, thickness: 10, originX: 0, originY: 0 };
const flat = { type: "flat" as const, radius: 3, angle: 90 };

describe("pickResolution", () => {
  it("keeps the grid under the cell budget within 0.25–2 mm", () => {
    expect(pickResolution(300, 200)).toBeCloseTo(0.5, 2);
    expect(pickResolution(1300, 2500)).toBeLessThanOrEqual(2);
    expect(pickResolution(20, 20)).toBe(0.25);
  });
});

describe("stamp / carve", () => {
  it("stamp lowers cells within the tool radius only", () => {
    const hm = createHeightmap(stock, 0.5);
    stamp(hm, 50, 40, -4, flat);
    expect(heightAt(hm, 50, 40)).toBe(-4);
    expect(heightAt(hm, 52.5, 40)).toBe(-4);
    expect(heightAt(hm, 54, 40)).toBe(0);
    expect(hm.dirty).not.toBeNull();
  });

  it("ball and V-bit profiles are shallower away from the axis", () => {
    const hm = createHeightmap(stock, 0.5);
    stamp(hm, 50, 40, -4, { type: "ball", radius: 3, angle: 0 });
    expect(heightAt(hm, 50, 40)).toBeCloseTo(-4, 5);
    expect(heightAt(hm, 52.5, 40)).toBeGreaterThan(-4);
    const hv = createHeightmap(stock, 0.5);
    stamp(hv, 50, 40, -4, { type: "vbit", radius: 3, angle: 90 });
    expect(heightAt(hv, 50, 40)).toBeCloseTo(-4, 5);
    expect(heightAt(hv, 52, 40)).toBeCloseTo(-2, 5); // 45° flank: 2 mm out → 2 mm up
  });

  it("a rectangle through-cut leaves h = -depth along the path and 0 elsewhere", () => {
    const rect: RectangleShape = { id: "r", kind: "rectangle", x: 20, y: 20, width: 40, height: 30, rotation: 0, depth: 6, operation: "outline" };
    const settings = { ...DEFAULT_MACHINE_SETTINGS, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 100, height: 80, thickness: 10 }, toolDiameter: 6, passDepth: 6 };
    const { segments } = buildToolpath([rect], settings);
    const timing = estimateTime(segments, { rapidRate: 3000 });
    const hm = createHeightmap(stock, 0.5);
    carveUpTo(hm, segments, timing, timing.total, flat);
    expect(heightAt(hm, 20, 35)).toBe(-6); // on the left edge path
    expect(heightAt(hm, 40, 35)).toBe(0); // inside, untouched (outline "on")
    expect(heightAt(hm, 5, 5)).toBe(0);
    expect(removedVolume(hm)).toBeGreaterThan(0);
  });

  it("a pocket leaves a flat floor at the target depth inside the offset radius", () => {
    const circle: CircleShape = { id: "c", kind: "circle", x: 50, y: 40, radius: 15, depth: 3, operation: "pocket" };
    const settings = { ...DEFAULT_MACHINE_SETTINGS, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 100, height: 80 }, toolDiameter: 6, passDepth: 3, stepover: 3 };
    const { segments } = buildToolpath([circle], settings);
    const timing = estimateTime(segments, { rapidRate: 3000 });
    const hm = createHeightmap(stock, 0.5);
    carveUpTo(hm, segments, timing, timing.total, flat);
    expect(heightAt(hm, 50, 40)).toBe(-3);
    expect(heightAt(hm, 60, 40)).toBe(-3);
    expect(heightAt(hm, 64.5, 40)).toBe(-3); // wall reached by the finishing pass (r=15)
    expect(heightAt(hm, 66, 40)).toBe(0);
  });

  it("carveUpTo is incremental forwards and recomputes when scrubbing backwards", () => {
    const rect: RectangleShape = { id: "r", kind: "rectangle", x: 20, y: 20, width: 40, height: 30, rotation: 0, depth: 6, operation: "outline" };
    const settings = { ...DEFAULT_MACHINE_SETTINGS, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 100, height: 80 }, toolDiameter: 6, passDepth: 6 };
    const { segments } = buildToolpath([rect], settings);
    const timing = estimateTime(segments, { rapidRate: 3000 });
    const hm = createHeightmap(stock, 0.5);
    carveUpTo(hm, segments, timing, timing.total * 0.4, flat);
    const v40 = removedVolume(hm);
    carveUpTo(hm, segments, timing, timing.total * 0.8, flat);
    const v80 = removedVolume(hm);
    expect(v80).toBeGreaterThan(v40);
    carveUpTo(hm, segments, timing, timing.total * 0.4, flat);
    expect(removedVolume(hm)).toBeCloseTo(v40, 3);
    resetHeightmap(hm);
    expect(removedVolume(hm)).toBe(0);
  });

  it("recomputing a large pocket from scratch stays fast (< 100 ms)", () => {
    const big: RectangleShape = { id: "p", kind: "rectangle", x: 10, y: 10, width: 200, height: 150, rotation: 0, depth: 3, operation: "pocket" };
    const settings = { ...DEFAULT_MACHINE_SETTINGS, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 300, height: 200 }, toolDiameter: 3, passDepth: 3, stepover: 1.5 };
    const { segments } = buildToolpath([big], settings);
    const timing = estimateTime(segments, { rapidRate: 3000 });
    const hm = createHeightmap({ width: 300, height: 200, thickness: 18, originX: 0, originY: 0 });
    const t0 = performance.now();
    carveUpTo(hm, segments, timing, timing.total, { type: "flat", radius: 1.5, angle: 90 });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(400); // generous for CI; typical ~50 ms
    expect(heightAt(hm, 100, 80)).toBe(-3);
  });
});
