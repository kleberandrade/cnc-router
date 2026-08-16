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
  /** Simulator look: top face, freshly cut face, deep cut, side of the stock (hex), and metalness (0–1). */
  look?: MaterialLook;
}

export interface MaterialLook { top: number; cut: number; deep: number; side: number; metalness?: number; roughness?: number }

/** Default (custom material) look — warm wood-ish, as before. */
export const DEFAULT_LOOK: MaterialLook = { top: 0xd9b98a, cut: 0xf1dcb8, deep: 0xb98d5a, side: 0xc9a675 };

/**
 * Conservative starting points for a 2-flute straight/upcut end mill on a hobby/small-shop router.
 * Always a starting point — the user is expected to tune per machine.
 */
export const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: "mdf", label: "MDF", feedRate: 1500, plungeRate: 500, spindleSpeed: 18000, passDepthFactor: 0.5, stepoverFactor: 0.5,
    notes: "Poeira fina — use aspiração. Aceita passes mais fundos.", look: { top: 0xc9a97a, cut: 0xdcc39a, deep: 0xa88b62, side: 0xb8946a } },
  { id: "plywood", label: "Compensado", feedRate: 1200, plungeRate: 400, spindleSpeed: 18000, passDepthFactor: 0.4, stepoverFactor: 0.5,
    notes: "A cola desgasta a fresa mais rápido; passes um pouco menores.", look: { top: 0xdcc094, cut: 0xf0dcb4, deep: 0xb08a5a, side: 0xcaa878 } },
  { id: "pine", label: "Pinus / madeira macia", feedRate: 1800, plungeRate: 600, spindleSpeed: 16000, passDepthFactor: 0.5, stepoverFactor: 0.5,
    notes: "Fibra longa: fresa afiada evita lascas nas bordas.", look: { top: 0xe8cfa2, cut: 0xf6e4c0, deep: 0xc9a56e, side: 0xd7b985 } },
  { id: "aluminum", label: "Alumínio (6061/5052)", advanced: true, feedRate: 300, plungeRate: 100, spindleSpeed: 10000, passDepthFactor: 0.1, stepoverFactor: 0.3,
    notes: "Avançado: fresa de 1 corte para alumínio, lubrificação (álcool/WD-40), passes rasos, fixação firme. Evite mergulho vertical longo.", look: { top: 0xb8bec4, cut: 0xdfe3e6, deep: 0x8f979e, side: 0x9aa1a7, metalness: 0.6, roughness: 0.35 } },
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

/** Simulator look for a material id (custom → default). */
export function materialLook(id: MaterialId): MaterialLook {
  return findMaterial(id)?.look ?? DEFAULT_LOOK;
}
