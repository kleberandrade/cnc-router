import { describe, it, expect } from "vitest";
import { MATERIAL_PRESETS, findMaterial, suggestedParams, applyMaterial, applyToolDiameter } from "../materials";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";

describe("material presets", () => {
  it("has MDF, plywood, pine and aluminium with the documented values", () => {
    expect(MATERIAL_PRESETS.map((m) => m.id)).toEqual(["mdf", "plywood", "pine", "aluminum"]);
    expect(findMaterial("mdf")).toMatchObject({ feedRate: 1500, plungeRate: 500, spindleSpeed: 18000, passDepthFactor: 0.5, stepoverFactor: 0.5 });
    expect(findMaterial("plywood")).toMatchObject({ feedRate: 1200, plungeRate: 400, spindleSpeed: 18000, passDepthFactor: 0.4 });
    expect(findMaterial("pine")).toMatchObject({ feedRate: 1800, plungeRate: 600, spindleSpeed: 16000 });
    expect(findMaterial("aluminum")).toMatchObject({ feedRate: 300, plungeRate: 100, spindleSpeed: 10000, passDepthFactor: 0.1, stepoverFactor: 0.3, advanced: true });
    expect(findMaterial("custom")).toBeUndefined();
  });

  it("scales pass depth and stepover by tool diameter", () => {
    const mdf = findMaterial("mdf")!;
    expect(suggestedParams(mdf, 6)).toMatchObject({ passDepth: 3, stepover: 3 });
    expect(suggestedParams(mdf, 3)).toMatchObject({ passDepth: 1.5, stepover: 1.5 });
    const alu = findMaterial("aluminum")!;
    expect(suggestedParams(alu, 3)).toMatchObject({ passDepth: 0.3, stepover: 0.9 });
  });
});

describe("applyMaterial", () => {
  it("fills all cutting parameters for a preset", () => {
    const s = applyMaterial({ ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 6 }, "mdf");
    expect(s).toMatchObject({ material: "mdf", feedRate: 1500, plungeRate: 500, spindleSpeed: 18000, passDepth: 3, stepover: 3 });
  });

  it("keeps manually overridden fields", () => {
    const base = { ...DEFAULT_MACHINE_SETTINGS, feedRate: 999, overrides: { feedRate: true } };
    const s = applyMaterial(base, "aluminum");
    expect(s.feedRate).toBe(999);
    expect(s.plungeRate).toBe(100);
    expect(s.overrides).toEqual({ feedRate: true });
  });

  it("force re-applies and clears overrides", () => {
    const base = { ...DEFAULT_MACHINE_SETTINGS, feedRate: 999, overrides: { feedRate: true } };
    const s = applyMaterial(base, "aluminum", true);
    expect(s.feedRate).toBe(300);
    expect(s.overrides).toEqual({});
  });

  it("custom only changes the id", () => {
    const s = applyMaterial({ ...DEFAULT_MACHINE_SETTINGS, feedRate: 123 }, "custom");
    expect(s.material).toBe("custom");
    expect(s.feedRate).toBe(123);
  });
});

describe("applyToolDiameter", () => {
  it("re-derives passDepth/stepover for a preset unless overridden", () => {
    const s0 = applyMaterial({ ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 6 }, "mdf");
    const s1 = applyToolDiameter(s0, 3);
    expect(s1.toolDiameter).toBe(3);
    expect(s1.passDepth).toBe(1.5);
    expect(s1.stepover).toBe(1.5);
    const s2 = applyToolDiameter({ ...s0, overrides: { passDepth: true } }, 3);
    expect(s2.passDepth).toBe(3);
    expect(s2.stepover).toBe(1.5);
  });
  it("leaves parameters alone for custom material", () => {
    const s = applyToolDiameter({ ...DEFAULT_MACHINE_SETTINGS, passDepth: 2 }, 10);
    expect(s.passDepth).toBe(2);
    expect(s.toolDiameter).toBe(10);
  });
});

describe("aparência por material (simulador)", () => {
  it("cada preset tem cores válidas; personalizado usa a padrão; alumínio é metálico", async () => {
    const { MATERIAL_PRESETS, materialLook, DEFAULT_LOOK } = await import("../materials");
    for (const m of MATERIAL_PRESETS) {
      const l = materialLook(m.id);
      for (const c of [l.top, l.cut, l.deep, l.side]) expect(c).toBeGreaterThanOrEqual(0), expect(c).toBeLessThanOrEqual(0xffffff);
      expect(l).not.toEqual(DEFAULT_LOOK);
    }
    expect(materialLook("custom")).toEqual(DEFAULT_LOOK);
    expect(materialLook("aluminum").metalness).toBeGreaterThan(0.3);
  });
});
