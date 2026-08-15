import { describe, it, expect } from "vitest";
import {
  rectangleToPoints,
  circleToPoints,
  shapeToPoints,
  rotatePoint,
  boundingBox,
  scanlines,
  ngonToPoints,
  slotToPoints,
} from "../geometry";
import type { RectangleShape, CircleShape, PathShape } from "../../types";

describe("rotatePoint", () => {
  it("returns the same point when rotating 0 degrees", () => {
    expect(rotatePoint([5, 5], [0, 0], 0)).toEqual([5, 5]);
  });

  it("rotates 90 degrees around the origin", () => {
    const [x, y] = rotatePoint([1, 0], [0, 0], 90);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
  });
});

describe("rectangleToPoints", () => {
  const base: RectangleShape = {
    id: "r1",
    kind: "rectangle",
    x: 0,
    y: 0,
    width: 10,
    height: 5,
    rotation: 0,
    depth: 3,
    operation: "outline",
  };

  it("returns 5 points forming a closed loop", () => {
    const pts = rectangleToPoints(base);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual(pts[4]);
  });

  it("covers all four corners with no rotation", () => {
    const pts = rectangleToPoints(base);
    expect(pts).toEqual([
      [0, 0],
      [10, 0],
      [10, 5],
      [0, 5],
      [0, 0],
    ]);
  });

  it("rotates around its own center when rotation is set", () => {
    const rotated = rectangleToPoints({ ...base, rotation: 180 });
    // 180-degree rotation around center should map (0,0) -> (10,5)
    expect(rotated[0][0]).toBeCloseTo(10, 5);
    expect(rotated[0][1]).toBeCloseTo(5, 5);
  });
});

describe("circleToPoints", () => {
  const circle: CircleShape = {
    id: "c1",
    kind: "circle",
    x: 0,
    y: 0,
    radius: 10,
    depth: 3,
    operation: "outline",
  };

  it("generates segments+1 points", () => {
    const pts = circleToPoints(circle, 4);
    expect(pts).toHaveLength(5);
  });

  it("stays radius distance from the center", () => {
    const pts = circleToPoints(circle, 32);
    for (const [x, y] of pts) {
      const dist = Math.sqrt(x * x + y * y);
      expect(dist).toBeCloseTo(10, 5);
    }
  });
});

describe("shapeToPoints", () => {
  it("dispatches rectangles correctly", () => {
    const rect: RectangleShape = {
      id: "r",
      kind: "rectangle",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      rotation: 0,
      depth: 1,
      operation: "outline",
    };
    expect(shapeToPoints(rect)).toHaveLength(5);
  });

  it("dispatches circles correctly", () => {
    const circle: CircleShape = {
      id: "c",
      kind: "circle",
      x: 0,
      y: 0,
      radius: 1,
      depth: 1,
      operation: "outline",
    };
    expect(shapeToPoints(circle).length).toBeGreaterThan(2);
  });

  it("closes path shapes when closed=true", () => {
    const path: PathShape = {
      id: "p",
      kind: "path",
      points: [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      closed: true,
      depth: 1,
      operation: "outline",
    };
    const pts = shapeToPoints(path);
    expect(pts[pts.length - 1]).toEqual([0, 0]);
  });

  it("leaves open path shapes as-is", () => {
    const path: PathShape = {
      id: "p2",
      kind: "path",
      points: [
        [0, 0],
        [1, 0],
      ],
      closed: false,
      depth: 1,
      operation: "outline",
    };
    expect(shapeToPoints(path)).toEqual([
      [0, 0],
      [1, 0],
    ]);
  });
});

describe("boundingBox", () => {
  it("returns zeros for an empty list", () => {
    expect(boundingBox([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });

  it("computes min/max across points", () => {
    const box = boundingBox([
      [1, 5],
      [-2, 3],
      [7, -1],
    ]);
    expect(box).toEqual({ minX: -2, minY: -1, maxX: 7, maxY: 5 });
  });
});

describe("scanlines", () => {
  it("throws for a non-positive stepover", () => {
    expect(() => scanlines(0, 10, 0)).toThrow();
  });

  it("generates evenly spaced rows including the final edge", () => {
    const rows = scanlines(0, 10, 3);
    expect(rows[0]).toBe(0);
    expect(rows[rows.length - 1]).toBe(10);
  });

  it("handles a range smaller than the stepover", () => {
    const rows = scanlines(0, 1, 5);
    expect(rows).toEqual([0, 1]);
  });
});

describe("rectangle corners, ngon and slot (sprint 09)", () => {
  const base = { id: "r", kind: "rectangle" as const, x: 0, y: 0, width: 40, height: 30, rotation: 0, depth: 5, operation: "outline" as const };

  it("fillet keeps the bounding box and replaces corners by arcs", () => {
    const pts = rectangleToPoints({ ...base, corners: { type: "fillet", size: 5 } });
    const b = boundingBox(pts);
    expect(b).toEqual({ minX: 0, minY: 0, maxX: 40, maxY: 30 });
    // no point exactly at the sharp corner (0,0); the arc centre is (5,5) with radius 5
    expect(pts.some(([x, y]) => x === 0 && y === 0)).toBe(false);
    const nearCorner = pts.filter(([x, y]) => x < 5 && y < 5);
    for (const [x, y] of nearCorner) expect(Math.hypot(x - 5, y - 5)).toBeCloseTo(5, 6);
    expect(pts.length).toBeGreaterThan(20);
  });

  it("chamfer cuts each corner with one straight segment", () => {
    const pts = rectangleToPoints({ ...base, corners: { type: "chamfer", size: 4 } });
    expect(pts.length).toBe(9); // 8 points + closing
    expect(pts[0]).toEqual([0, 4]);
    expect(pts[1]).toEqual([4, 0]);
  });

  it("corner size is clamped to half the shorter side and can target specific corners", () => {
    const pts = rectangleToPoints({ ...base, corners: { type: "chamfer", size: 100, which: ["tr"] } });
    expect(pts[0]).toEqual([0, 0]);
    expect(pts.some(([x, y]) => x === 40 && y === 30)).toBe(false);
    expect(pts.some(([x, y]) => x === 40 && y === 15)).toBe(true); // clamped to 15
  });

  it("sharp corners are unchanged", () => {
    expect(rectangleToPoints({ ...base, corners: { type: "sharp", size: 5 } })).toEqual(rectangleToPoints(base));
  });

  it("ngon has n vertices on the radius", () => {
    const pts = ngonToPoints({ id: "n", kind: "ngon", x: 10, y: 10, radius: 5, sides: 6, rotation: 0, depth: 1, operation: "outline" });
    expect(pts).toHaveLength(7);
    for (const [x, y] of pts) expect(Math.hypot(x - 10, y - 10)).toBeCloseTo(5, 6);
    expect(pts[0]).toEqual([15, 10]);
  });

  it("slot bbox is length × width and its ends are semicircles", () => {
    const pts = slotToPoints({ id: "s", kind: "slot", x: 0, y: 0, length: 30, width: 10, rotation: 0, depth: 1, operation: "outline" });
    const b = boundingBox(pts);
    expect(b.maxX - b.minX).toBeCloseTo(30, 6);
    expect(b.maxY - b.minY).toBeCloseTo(10, 6);
    const rightEnd = pts.filter(([x]) => x > 10);
    for (const [x, y] of rightEnd) expect(Math.hypot(x - 10, y)).toBeCloseTo(5, 6);
    const rot = slotToPoints({ id: "s", kind: "slot", x: 0, y: 0, length: 30, width: 10, rotation: 90, depth: 1, operation: "outline" });
    const rb = boundingBox(rot);
    expect(rb.maxY - rb.minY).toBeCloseTo(30, 6);
  });
});
