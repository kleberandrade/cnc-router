import { describe, it, expect } from "vitest";
import { buildPassDepths, generateGCode, tryGenerateGCode, validateSettings, GCodeError, workOriginOffset } from "../gcode";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { RectangleShape, CircleShape, PathShape } from "../../types";

describe("buildPassDepths", () => {
  it("throws for non-positive totalDepth", () => {
    expect(() => buildPassDepths(0, 2)).toThrow();
  });

  it("throws for non-positive passDepth", () => {
    expect(() => buildPassDepths(5, 0)).toThrow();
  });

  it("steps evenly when depth divides passDepth exactly", () => {
    expect(buildPassDepths(6, 2)).toEqual([2, 4, 6]);
  });

  it("adds a final shorter pass when it doesn't divide evenly", () => {
    expect(buildPassDepths(5, 2)).toEqual([2, 4, 5]);
  });

  it("returns a single pass when passDepth >= totalDepth", () => {
    expect(buildPassDepths(2, 5)).toEqual([2]);
  });
});

describe("generateGCode", () => {
  const rect: RectangleShape = {
    id: "r1",
    kind: "rectangle",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    depth: 4,
    operation: "outline",
  };

  const circle: CircleShape = {
    id: "c1",
    kind: "circle",
    x: 20,
    y: 20,
    radius: 5,
    depth: 3,
    operation: "pocket",
  };

  it("starts with units and positioning mode setup", () => {
    const gcode = generateGCode([rect], DEFAULT_MACHINE_SETTINGS);
    const lines = gcode.split("\n");
    expect(lines).toContain("G21 ; millimeters");
    expect(lines).toContain("G90 ; absolute positioning");
  });

  it("turns the spindle on before cutting and off at the end", () => {
    const gcode = generateGCode([rect], DEFAULT_MACHINE_SETTINGS);
    expect(gcode).toContain("M3 S12000");
    expect(gcode.indexOf("M3")).toBeLessThan(gcode.indexOf("M5"));
  });

  it("ends the program with M2", () => {
    const gcode = generateGCode([rect], DEFAULT_MACHINE_SETTINGS);
    expect(gcode.trim().endsWith("M2 ; program end")).toBe(true);
  });

  it("produces a multi-pass outline for depth greater than passDepth", () => {
    const gcode = generateGCode([rect], DEFAULT_MACHINE_SETTINGS);
    // passDepth=2, depth=4 => 2 plunge passes
    const plungeCount = gcode
      .split("\n")
      .filter((l) => l.startsWith("G1 Z-")).length;
    expect(plungeCount).toBe(2);
  });

  it("produces scanline moves for pocket operations", () => {
    const gcode = generateGCode([circle], DEFAULT_MACHINE_SETTINGS);
    expect(gcode).toContain("; Pocket clear");
  });

  it("skips shapes that resolve to zero points", () => {
    const emptyPath: PathShape = {
      id: "p-empty",
      kind: "path",
      points: [],
      closed: false,
      depth: 3,
      operation: "outline",
    };
    const gcode = generateGCode([emptyPath], DEFAULT_MACHINE_SETTINGS);
    // Only the boilerplate header/footer lines should be present.
    expect(gcode).not.toContain("Outline pass");
  });

  it("handles an empty shape list", () => {
    const gcode = generateGCode([], DEFAULT_MACHINE_SETTINGS);
    expect(gcode).toContain("M2 ; program end");
  });

  it("combines multiple shapes into one program", () => {
    const gcode = generateGCode([rect, circle], DEFAULT_MACHINE_SETTINGS);
    expect(gcode).toContain("Outline pass");
    expect(gcode).toContain("Pocket clear");
  });

  it("returns to X0 Y0 at the end for the next job", () => {
    const gcode = generateGCode([rect], DEFAULT_MACHINE_SETTINGS);
    expect(gcode.trim().split("\n").slice(-2)[0]).toBe("G0 X0 Y0");
  });
});

describe("validation", () => {
  const rect: RectangleShape = {
    id: "r", kind: "rectangle", x: 0, y: 0, width: 10, height: 10, rotation: 0, depth: 4, operation: "outline",
  };

  it("validateSettings lists every non-positive cutting parameter", () => {
    const problems = validateSettings({ ...DEFAULT_MACHINE_SETTINGS, passDepth: 0, feedRate: NaN });
    expect(problems).toHaveLength(2);
    expect(problems.join()).toMatch(/passe/);
    expect(problems.join()).toMatch(/Avanço/);
  });

  it("generateGCode throws GCodeError for invalid settings", () => {
    expect(() => generateGCode([rect], { ...DEFAULT_MACHINE_SETTINGS, passDepth: 0 })).toThrow(GCodeError);
  });

  it("tryGenerateGCode returns problems instead of throwing", () => {
    const res = tryGenerateGCode([{ ...rect, depth: 0 }], DEFAULT_MACHINE_SETTINGS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.problems[0]).toMatch(/Forma 1/);
  });

  it("tryGenerateGCode returns gcode when valid", () => {
    const res = tryGenerateGCode([rect], DEFAULT_MACHINE_SETTINGS);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.gcode).toContain("M2");
  });
});

describe("work origin & header", () => {
  const rect: RectangleShape = {
    id: "r", kind: "rectangle", x: 20, y: 20, width: 10, height: 10, rotation: 0, depth: 4, operation: "outline",
  };
  const base = {
    ...DEFAULT_MACHINE_SETTINGS,
    stock: { width: 100, height: 60, thickness: 10, offsetX: 20, offsetY: 20, origin: "front-left" as const },
  };

  it("front-left origin subtracts the stock offset", () => {
    expect(workOriginOffset(base)).toEqual([20, 20]);
    const g = generateGCode([rect], base);
    expect(g).toContain("G0 X0 Y0\n; Outline".replace("\n; Outline", "")); // starts at work origin
    expect(g).toContain("G1 X10 Y0 F800");
  });

  it("center origin yields negative coordinates for the front-left quadrant", () => {
    const s = { ...base, stock: { ...base.stock, origin: "center" as const } };
    expect(workOriginOffset(s)).toEqual([70, 50]);
    const g = generateGCode([rect], s);
    expect(g).toContain("G0 X-50 Y-30");
  });

  it("writes machine/stock header and warnings as comments", () => {
    const g = generateGCode([{ ...rect, depth: 12 }], base);
    expect(g).toContain("; machine 600x400x80mm | stock 100x60x10mm @ (20,20) origin front-left");
    expect(g).toContain("; WARNING: Forma 1: profundidade (12 mm) maior que a espessura da chapa");
  });

  it("tryGenerateGCode refuses shapes outside the table", () => {
    const res = tryGenerateGCode([{ ...rect, x: 595 }], base);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.problems.join()).toMatch(/fora da área útil/);
  });
});

describe("material in G-code", () => {
  const rect: RectangleShape = { id: "r", kind: "rectangle", x: 20, y: 20, width: 30, height: 30, rotation: 0, depth: 4, operation: "pocket" };
  it("writes material/tool/stepover in the header", () => {
    const g = generateGCode([rect], { ...DEFAULT_MACHINE_SETTINGS, material: "mdf", toolDiameter: 6, stepover: 3 });
    expect(g).toContain("; material MDF | tool Ø6mm | stepover 3mm | pass 2mm");
  });
  it("pocket rows follow the stepover (aluminium denser than MDF)", () => {
    const rows = (stepover: number) =>
      generateGCode([rect], { ...DEFAULT_MACHINE_SETTINGS, stepover }).split("\n").filter((l) => l.startsWith("G1 X")).length;
    expect(rows(0.9)).toBeGreaterThan(rows(3));
  });
});
