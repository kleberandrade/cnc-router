import { describe, it, expect } from "vitest";
import sample from "./fixtures/sample.dxf?raw";
import { parseDxf, insunitsToMm, polylineWithBulges } from "../dxfImport";
import { boundingBox } from "../geometry";
import type { PathShape, CircleShape } from "../../types";

describe("dxfImport", () => {
  it("maps $INSUNITS to mm", () => {
    expect(insunitsToMm(4).scale).toBe(1);
    expect(insunitsToMm(1).scale).toBe(25.4);
    expect(insunitsToMm(undefined).note).toMatch(/assumindo/);
  });

  it("expands bulges into arcs", () => {
    const pts = polylineWithBulges([{ x: 0, y: 0, bulge: 1 }, { x: 10, y: 0 }], false, 0.05);
    expect(pts.length).toBeGreaterThan(5);
    // DXF: positive bulge = CCW from start to end → for (0,0)→(10,0) the arc bows to -y
    const bottom = pts.reduce((m, p) => (p[1] < m[1] ? p : m), pts[0]);
    expect(bottom[1]).toBeCloseTo(-5, 1);
    expect(bottom[0]).toBeCloseTo(5, 1);
  });

  it("imports polyline (with bulge), circle, line, block insert and skips text", () => {
    const { shapes, warnings } = parseDxf(sample);
    const kinds = shapes.map((s) => s.kind);
    expect(kinds.filter((k) => k === "circle")).toHaveLength(2);
    expect(kinds.filter((k) => k === "path")).toHaveLength(2);
    const poly = shapes.find((s) => s.kind === "path" && (s as PathShape).closed) as PathShape;
    const b = boundingBox(poly.points);
    expect(b.minX).toBe(0);
    expect(b.maxX).toBeCloseTo(55, 0);
    const inserted = shapes.filter((s) => s.kind === "circle").map((s) => s as CircleShape).find((c) => c.radius === 2.5);
    expect(inserted).toMatchObject({ x: 20, y: 15 });
    expect(warnings.join(" ")).toMatch(/não suportadas/);
  });

  it("scales inch drawings", () => {
    const inch = sample.replace("$INSUNITS\n70\n4", "$INSUNITS\n70\n1");
    const { shapes } = parseDxf(inch);
    const big = shapes.find((s) => s.kind === "circle" && (s as CircleShape).radius > 100) as CircleShape;
    expect(big.radius).toBeCloseTo(254, 3);
  });
});

describe("dxfImport extra entities", () => {
  it("handles ARC, ELLIPSE, SPLINE and skips unknown", () => {
    const dxf = ["0","SECTION","2","ENTITIES",
      "0","ARC","8","0","10","0","20","0","40","10","50","0","51","90",
      "0","ELLIPSE","8","0","10","0","20","0","11","20","21","0","40","0.5","41","0","42","6.283185",
      "0","SPLINE","8","0","70","8","71","3","72","8","73","4","40","0","40","0","40","0","40","0","40","1","40","1","40","1","40","1","10","0","20","0","10","10","20","10","10","20","20","-10","10","30","20","0",
      "0","HATCH","8","0",
      "0","ENDSEC","0","EOF",""].join("\n");
    const { shapes, warnings } = parseDxf(dxf);
    expect(shapes.length).toBeGreaterThanOrEqual(3);
    const arc = shapes[0] as PathShape;
    expect(arc.closed).toBe(false);
    expect(arc.points[0][0]).toBeCloseTo(10, 3); // starts at angle 0 → (10,0)
    expect(warnings.join(" ")).toMatch(/assumindo milímetros|não suportadas/);
  });
});
