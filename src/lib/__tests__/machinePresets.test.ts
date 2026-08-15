import { describe, it, expect } from "vitest";
import { MACHINE_PRESETS, findMachinePreset, presetIdForWorkArea, CUSTOM_PRESET_ID } from "../machinePresets";

describe("machinePresets", () => {
  it("has the common router sizes", () => {
    expect(MACHINE_PRESETS.map((p) => p.id)).toEqual(["3018", "3040", "6040", "6090", "1010", "1325"]);
    expect(findMachinePreset("3018")?.workArea).toEqual({ width: 300, height: 180, zTravel: 45 });
  });
  it("maps a work area back to its preset, or custom", () => {
    expect(presetIdForWorkArea({ width: 600, height: 400, zTravel: 80 })).toBe("6040");
    expect(presetIdForWorkArea({ width: 601, height: 400, zTravel: 80 })).toBe(CUSTOM_PRESET_ID);
  });
});
