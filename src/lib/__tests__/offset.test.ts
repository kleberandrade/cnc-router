import { describe, it, expect } from "vitest";
import { offsetPolygon, scanlineSpans, perimeter, pointAlong, ccw } from "../offset";
import { boundingBox, circleToPoints } from "../geometry";

const square: [number, number][] = [[0, 0], [40, 0], [40, 40], [0, 40]];

describe("offsetPolygon", () => {
  it("outward offset of a 40 mm square by 3 mm gives a 46 mm bounding box", () => {
    const [out] = offsetPolygon(square, 3);
    const b = boundingBox(out);
    expect(b.maxX - b.minX).toBeCloseTo(46, 1);
    expect(b.maxY - b.minY).toBeCloseTo(46, 1);
  });
  it("inward offset gives 34 mm", () => {
    const [inn] = offsetPolygon(square, -3);
    const b = boundingBox(inn);
    expect(b.maxX - b.minX).toBeCloseTo(34, 1);
  });
  it("circle keeps radius ± delta", () => {
    const circle = circleToPoints({ id: "c", kind: "circle", x: 0, y: 0, radius: 10, depth: 1, operation: "outline" });
    const [out] = offsetPolygon(circle, 2);
    const b = boundingBox(out);
    expect((b.maxX - b.minX) / 2).toBeCloseTo(12, 1);
  });
  it("inward offset larger than the shape yields nothing", () => {
    expect(offsetPolygon(square, -25)).toEqual([]);
  });
  it("zero delta returns the polygon itself, ccw", () => {
    const [same] = offsetPolygon([...square].reverse(), 0);
    expect(same).toEqual(square);
    expect(ccw([...square].reverse())).toEqual(square);
  });
});

describe("scanlineSpans", () => {
  it("returns one span for a convex polygon and two for a U shape", () => {
    expect(scanlineSpans([square], 20)).toEqual([[0, 40]]);
    const u: [number, number][] = [[0, 0], [30, 0], [30, 30], [20, 30], [20, 10], [10, 10], [10, 30], [0, 30]];
    expect(scanlineSpans([u], 20)).toEqual([[0, 10], [20, 30]]);
    expect(scanlineSpans([u], 5)).toEqual([[0, 30]]);
  });
});

describe("perimeter / pointAlong", () => {
  it("walks along the loop and wraps", () => {
    expect(perimeter(square)).toBe(160);
    expect(pointAlong(square, 20)).toEqual([20, 0]);
    expect(pointAlong(square, 60)).toEqual([40, 20]);
    expect(pointAlong(square, 170)[0]).toBeCloseTo(10);
  });
});
