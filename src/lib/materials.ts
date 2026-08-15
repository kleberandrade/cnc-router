import type { CutParamKey, MachineSettings, MaterialId } from "../types";

export interface MaterialPreset {
  id: MaterialId;
  label: string;
  /** Show a caution badge in the UI (e.g. metals on hobby routers). */
  advanced?: boolean;
  feedRate: number;     // mm/min
  plungeRate: number;   // mm/min
  spindleSpeed: number; // rpm
  /** Suggested pass depth = factor × tool diameter. */
  passDepthFactor: number;
  /** Pocket stepover = factor × tool diameter. */
  stepoverFactor: number;
  notes?: string;
}

/**
 * Conservative starting points for a 2-flute straight/upcut end mill on a hobby/small-shop router.
 * Always a starting point — the user is expected to tune per machine.
 */
export const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: "mdf", label: "MDF", feedRate: 1500, plungeRate: 500, spindleSpeed: 18000, passDepthFactor: 0.5, stepoverFactor: 0.5,
    notes: "Poeira fina — use aspiração. Aceita passes mais fundos." },
  { id: "plywood", label: "Compensado", feedRate: 1200, plungeRate: 400, spindleSpeed: 18000, passDepthFactor: 0.4, stepoverFactor: 0.5,
    notes: "A cola desgasta a fresa mais rápido; passes um pouco menores." },
  { id: "pine", label: "Pinus / madeira macia", feedRate: 1800, plungeRate: 600, spindleSpeed: 16000, passDepthFactor: 0.5, stepoverFactor: 0.5,
    notes: "Fibra longa: fresa afiada evita lascas nas bordas." },
  { id: "aluminum", label: "Alumínio (6061/5052)", advanced: true, feedRate: 300, plungeRate: 100, spindleSpeed: 10000, passDepthFactor: 0.1, stepoverFactor: 0.3,
    notes: "Avançado: fresa de 1 corte para alumínio, lubrificação (álcool/WD-40), passes rasos, fixação firme. Evite mergulho vertical longo." },
];

export const CUSTOM_MATERIAL_ID: MaterialId = "custom";

export function findMaterial(id: MaterialId): MaterialPreset | undefined {
  return MATERIAL_PRESETS.find((m) => m.id === id);
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Cutting parameters suggested by a preset for a given tool diameter. */
export function suggestedParams(preset: MaterialPreset, toolDiameter: number): Record<CutParamKey, number> {
  return {
    feedRate: preset.feedRate,
    plungeRate: preset.plungeRate,
    spindleSpeed: preset.spindleSpeed,
    passDepth: round(Math.max(preset.passDepthFactor * toolDiameter, 0.1)),
    stepover: round(Math.max(preset.stepoverFactor * toolDiameter, 0.1)),
  };
}

/**
 * Apply a material preset to the settings, keeping any parameter the user has overridden
 * (unless `force` is set, which also clears the overrides). "custom" only changes the id.
 */
export function applyMaterial(settings: MachineSettings, id: MaterialId, force = false): MachineSettings {
  const preset = findMaterial(id);
  if (!preset) return { ...settings, material: CUSTOM_MATERIAL_ID };
  const overrides = force ? {} : settings.overrides;
  const suggested = suggestedParams(preset, settings.toolDiameter);
  const next: MachineSettings = { ...settings, material: id, overrides };
  (Object.keys(suggested) as CutParamKey[]).forEach((k) => {
    if (!overrides[k]) next[k] = suggested[k];
  });
  return next;
}

/** Re-derive diameter-dependent parameters (passDepth, stepover) after the tool diameter changed. */
export function applyToolDiameter(settings: MachineSettings, toolDiameter: number): MachineSettings {
  const next: MachineSettings = { ...settings, toolDiameter };
  const preset = findMaterial(settings.material);
  if (!preset) return next;
  const suggested = suggestedParams(preset, toolDiameter);
  if (!settings.overrides.passDepth) next.passDepth = suggested.passDepth;
  if (!settings.overrides.stepover) next.stepover = suggested.stepover;
  return next;
}
