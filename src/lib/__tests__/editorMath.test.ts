import { describe, it, expect } from "vitest";
import { gridStepFor, fitScale, clampShapeToTable } from "../editorMath";
import type { RectangleShape, CircleShape, PathShape } from "../../types";

describe("gridStepFor", () => {
  it("uses finer grid when zoomed in and coarser when zoomed out", () => {
    expect(gridStepFor(10)).toEqual({ minor: 1, major: 5 });
    expect(gridStepFor(1)).toEqual({ minor: 10, major: 50 });
    expect(gridStepFor(0.1)).toEqual({ minor: 100, major: 500 });
  });
});

describe("fitScale", () => {
  it("fits the table into the viewport (limited by the tighter axis)", () => {
    const s = fitScale(1000, 600, 600, 400);
    expect(s * 600).toBeLessThanOrEqual(1000);
    expect(s * 400).toBeLessThanOrEqual(600);
    // 1325 table in a small viewport still positive
    expect(fitScale(400, 300, 1300, 2500)).toBeGreaterThan(0);
  });
});

describe("clampShapeToTable", () => {
  const rect: RectangleShape = { id: "r", kind: "rectangle", x: 0, y: 0, width: 40, height: 30, rotation: 0, depth: 5, operation: "outline" };
  const circle: CircleShape = { id: "c", kind: "circle", x: 50, y: 50, radius: 15, depth: 5, operation: "outline" };
  const path: PathShape = { id: "p", kind: "path", points: [[10, 10], [30, 10], [20, 25]], closed: true, depth: 5, operation: "outline" };

  it("keeps a rectangle inside the table", () => {
    expect(clampShapeToTable(rect, -10, -10, 300, 180)).toEqual([0, 0]);
    expect(clampShapeToTable(rect, 290, 170, 300, 180)).toEqual([260, 150]);
    expect(clampShapeToTable(rect, 100, 100, 300, 180)).toEqual([100, 100]);
  });

  it("keeps a circle inside the table (accounting for radius)", () => {
    expect(clampShapeToTable(circle, 0, 0, 300, 180)).toEqual([15, 15]);
    expect(clampShapeToTable(circle, 300, 180, 300, 180)).toEqual([285, 165]);
  });

  it("clamps a path by its bounding box min corner", () => {
    // bbox 10..30 x 10..25 → size 20x15; anchor is bbox min
    expect(clampShapeToTable(path, -5, -5, 300, 180)).toEqual([0, 0]);
    expect(clampShapeToTable(path, 295, 175, 300, 180)).toEqual([280, 165]);
  });
});
