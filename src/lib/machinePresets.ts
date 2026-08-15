import type { WorkArea } from "../types";

export interface MachinePreset {
  id: string;
  label: string;
  workArea: WorkArea;
}

/** Common hobby/small-shop router sizes (usable travel, mm). */
export const MACHINE_PRESETS: MachinePreset[] = [
  { id: "3018", label: "3018 (300 × 180 × 45)", workArea: { width: 300, height: 180, zTravel: 45 } },
  { id: "3040", label: "3040 (300 × 400 × 80)", workArea: { width: 300, height: 400, zTravel: 80 } },
  { id: "6040", label: "6040 (600 × 400 × 80)", workArea: { width: 600, height: 400, zTravel: 80 } },
  { id: "6090", label: "6090 (600 × 900 × 100)", workArea: { width: 600, height: 900, zTravel: 100 } },
  { id: "1010", label: "1010 (1000 × 1000 × 120)", workArea: { width: 1000, height: 1000, zTravel: 120 } },
  { id: "1325", label: "1325 (1300 × 2500 × 150)", workArea: { width: 1300, height: 2500, zTravel: 150 } },
];

export const CUSTOM_PRESET_ID = "custom";

export function findMachinePreset(id: string): MachinePreset | undefined {
  return MACHINE_PRESETS.find((p) => p.id === id);
}

/** Returns the preset id whose work area matches exactly, or "custom". */
export function presetIdForWorkArea(area: WorkArea): string {
  const match = MACHINE_PRESETS.find(
    (p) =>
      p.workArea.width === area.width &&
      p.workArea.height === area.height &&
      p.workArea.zTravel === area.zTravel
  );
  return match ? match.id : CUSTOM_PRESET_ID;
}
