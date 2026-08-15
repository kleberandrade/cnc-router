import { describe, it, expect } from "vitest";
import { parseSvgToShapes, parseSimplePathData } from "../svgImport";

describe("parseSimplePathData", () => {
  it("parses absolute M/L commands", () => {
    const pts = parseSimplePathData("M0,0 L10,0 L10,10");
    expect(pts).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
  });

  it("parses relative l commands", () => {
    const pts = parseSimplePathData("M0,0 l10,0 l0,10");
    expect(pts).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
  });

  it("parses H and V shorthand commands", () => {
    const pts = parseSimplePathData("M0,0 H5 V5");
    expect(pts).toEqual([
      [0, 0],
      [5, 0],
      [5, 5],
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseSimplePathData("")).toEqual([]);
  });
});

describe("parseSvgToShapes", () => {
  it("parses a rect element", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="10" height="5"/></svg>`;
    const shapes = parseSvgToShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].kind).toBe("rectangle");
  });

  it("skips rects with zero or missing size", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2"/></svg>`;
    expect(parseSvgToShapes(svg)).toHaveLength(0);
  });

  it("parses a circle element", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="3"/></svg>`;
    const shapes = parseSvgToShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].kind).toBe("circle");
  });

  it("parses a straight-line path element and marks it closed", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0,0 L10,0 L10,10 Z"/></svg>`;
    const shapes = parseSvgToShapes(svg);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].kind).toBe("path");
    if (shapes[0].kind === "path") {
      expect(shapes[0].closed).toBe(true);
    }
  });

  it("parses multiple shapes from one document", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="5" height="5"/>
      <circle cx="1" cy="1" r="2"/>
    </svg>`;
    expect(parseSvgToShapes(svg)).toHaveLength(2);
  });

  it("throws on malformed XML", () => {
    expect(() => parseSvgToShapes("<svg><rect></svg")).toThrow();
  });
});
