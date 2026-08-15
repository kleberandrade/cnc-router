import { describe, it, expect } from "vitest";
import { validateProject, hasErrors, shapeIssueLevel } from "../validate";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { RectangleShape, MachineSettings } from "../../types";

const settings: MachineSettings = {
  ...DEFAULT_MACHINE_SETTINGS,
  workArea: { width: 300, height: 180, zTravel: 45 },
  stock: { width: 200, height: 100, thickness: 10, offsetX: 20, offsetY: 20, origin: "front-left" },
};
const rect = (over: Partial<RectangleShape> = {}): RectangleShape => ({
  id: "r", kind: "rectangle", x: 30, y: 30, width: 40, height: 30, rotation: 0, depth: 5, operation: "outline", ...over,
});

describe("validateProject", () => {
  it("returns no issues for a shape inside the stock", () => {
    expect(validateProject([rect()], settings)).toEqual([]);
  });

  it("warns when a shape is inside the table but outside the stock", () => {
    const issues = validateProject([rect({ x: 250 })], settings);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "warning", code: "shape-outside-stock", shapeId: "r" });
    expect(hasErrors(issues)).toBe(false);
  });

  it("errors when a shape leaves the table", () => {
    const issues = validateProject([rect({ x: 280 })], settings);
    expect(issues[0]).toMatchObject({ level: "error", code: "shape-outside-table" });
    expect(hasErrors(issues)).toBe(true);
    expect(shapeIssueLevel(issues, "r")).toBe("error");
  });

  it("warns on through-cut deeper than the stock, errors when deeper than Z travel", () => {
    expect(validateProject([rect({ depth: 12 })], settings)[0].code).toBe("depth-exceeds-stock");
    expect(validateProject([rect({ depth: 50 })], settings)[0]).toMatchObject({ level: "error", code: "depth-exceeds-z" });
  });

  it("flags stock outside the table and safe height above Z", () => {
    const s2 = { ...settings, stock: { ...settings.stock, offsetX: 150 }, safeHeight: 60 };
    const codes = validateProject([], s2).map((i) => i.code);
    expect(codes).toContain("stock-outside-table");
    expect(codes).toContain("safe-height-exceeds-z");
  });

  it("shapeIssueLevel returns null for clean shapes", () => {
    expect(shapeIssueLevel([], "r")).toBeNull();
  });
});
