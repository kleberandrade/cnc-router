import { describe, it, expect } from "vitest";
import inkscapeSvg from "./fixtures/inkscape-px.svg?raw";
import { parseSvg, parseSvgToShapes, parseSimplePathData, parseTransform, unitToMm, samplePathData } from "../svgImport";
import { boundingBox } from "../geometry";
import type { RectangleShape, CircleShape, PathShape } from "../../types";

describe("parseSimplePathData (legacy)", () => {
  it("parses absolute M/L commands", () => {
    expect(parseSimplePathData("M0,0 L10,0 L10,10")).toEqual([[0, 0], [10, 0], [10, 10]]);
  });
  it("parses relative and H/V", () => {
    expect(parseSimplePathData("M0,0 l10,0 l0,10")).toEqual([[0, 0], [10, 0], [10, 10]]);
    expect(parseSimplePathData("M0,0 H5 V5")).toEqual([[0, 0], [5, 0], [5, 5]]);
  });
});

describe("unitToMm / parseTransform", () => {
  it("converts units", () => {
    expect(unitToMm("100mm")).toBe(100);
    expect(unitToMm("1in")).toBe(25.4);
    expect(unitToMm("96px")).toBeCloseTo(25.4);
    expect(unitToMm("96")).toBeCloseTo(25.4);
    expect(unitToMm("50%")).toBeNull();
  });
  it("composes translate/scale/rotate", () => {
    const m = parseTransform("translate(10,20) scale(2)");
    expect(m).toEqual([2, 0, 0, 2, 10, 20]);
    const r = parseTransform("rotate(90)");
    expect(r[0]).toBeCloseTo(0);
    expect(r[1]).toBeCloseTo(1);
  });
});

describe("samplePathData", () => {
  it("keeps straight segments unsampled and samples curves within tolerance", () => {
    const line = samplePathData("M0,0 L10,0 L10,10 Z", 0.1);
    expect(line[0].points).toEqual([[0, 0], [10, 0], [10, 10]]);
    expect(line[0].closed).toBe(true);
    const arc = samplePathData("M0,0 A10,10 0 0 1 20,0", 0.1);
    expect(arc[0].points.length).toBeGreaterThan(5);
    // every sample lies on the circle centred (10,0) r=10
    for (const [x, y] of arc[0].points) expect(Math.hypot(x - 10, y)).toBeCloseTo(10, 1);
  });
  it("splits sub-paths", () => {
    const subs = samplePathData("M0,0 L5,0 M10,10 L15,10", 0.1);
    expect(subs).toHaveLength(2);
  });
});

describe("parseSvg", () => {
  it("parses a rect element (flipping Y so the drawing keeps its orientation)", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100mm" height="50mm"><rect x="10" y="5" width="30" height="20"/></svg>`;
    const { shapes, warnings } = parseSvg(svg);
    expect(shapes).toHaveLength(1);
    const r = shapes[0] as RectangleShape;
    expect(r.kind).toBe("rectangle");
    expect(r).toMatchObject({ x: 10, y: 25, width: 30, height: 20 }); // y = 50 - (5+20)
    expect(warnings).toEqual([]);
  });

  it("Inkscape px file with mm size imports at the right physical size", () => {
    const { shapes, warnings } = parseSvg(inkscapeSvg);
    const rect = shapes.find((s) => s.kind === "rectangle") as RectangleShape;
    expect(rect.width).toBeCloseTo(50, 1);
    expect(rect.height).toBeCloseTo(30, 1);
    expect(rect.x).toBeCloseTo(10, 1); // translate(37.79px) = 10 mm
    const circle = shapes.find((s) => s.kind === "circle") as CircleShape;
    expect(circle.radius).toBeCloseTo(10, 1);
    const path = shapes.find((s) => s.kind === "path") as PathShape;
    expect(path.closed).toBe(true);
    expect(path.points.length).toBeGreaterThan(4);
    expect(warnings.join(" ")).toMatch(/curvas/);
    expect(warnings.join(" ")).toMatch(/não suportados/);
  });

  it("applies rotate transforms to rectangles by converting them to paths", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(45 50 50)"><rect x="40" y="40" width="20" height="20"/></g></svg>`;
    const { shapes } = parseSvg(svg);
    expect(shapes[0].kind).toBe("path");
    const b = boundingBox((shapes[0] as PathShape).points);
    expect(b.maxX - b.minX).toBeCloseTo(20 * Math.SQRT2, 1);
  });

  it("supports polygon, polyline, line and ellipse", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100mm" height="100mm">
      <polygon points="0,0 10,0 5,10"/><polyline points="0,0 10,10"/><line x1="0" y1="0" x2="5" y2="5"/><ellipse cx="50" cy="50" rx="10" ry="5"/></svg>`;
    const { shapes } = parseSvg(svg);
    expect(shapes.map((s) => s.kind)).toEqual(["path", "path", "path", "path"]);
    expect((shapes[0] as PathShape).closed).toBe(true);
    expect((shapes[1] as PathShape).closed).toBe(false);
  });

  it("skips rects with zero size and warns when nothing is found", () => {
    const { shapes, warnings } = parseSvg(`<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2"/></svg>`);
    expect(shapes).toHaveLength(0);
    expect(warnings.join(" ")).toMatch(/Nenhuma forma/);
  });

  it("throws on invalid XML", () => {
    expect(() => parseSvg("<svg><rect></svg")).toThrow(/inválido/);
    expect(() => parseSvgToShapes("<svg><rect></svg")).toThrow();
  });

  it("parseSvgToShapes keeps returning shapes only", () => {
    expect(parseSvgToShapes(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2"/></svg>`)[0].kind).toBe("circle");
  });
});
