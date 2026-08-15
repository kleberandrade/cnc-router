import { describe, it, expect } from "vitest";
import { buildPassDepths, generateGCode } from "../gcode";
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
