import type { MachineSettings, Shape, Tool, ToolType } from "../types";

export interface EffectiveTool {
  /** undefined = project default tool */
  id: string | undefined;
  name: string;
  type: ToolType;
  diameter: number;
  vbitAngle: number;
  feedRate: number;
  plungeRate: number;
  spindleSpeed: number;
  stepover: number;
}

/** The project's default tool as an EffectiveTool. */
export function defaultTool(settings: MachineSettings): EffectiveTool {
  return {
    id: undefined,
    name: `Padrão Ø${settings.toolDiameter}`,
    type: settings.toolType,
    diameter: settings.toolDiameter,
    vbitAngle: settings.vbitAngle,
    feedRate: settings.feedRate,
    plungeRate: settings.plungeRate,
    spindleSpeed: settings.spindleSpeed,
    stepover: settings.stepover,
  };
}

/** Resolve the tool a shape is machined with (falls back to the default tool when the id is unknown). */
export function toolForShape(shape: Shape, settings: MachineSettings): EffectiveTool {
  const t = shape.toolId ? settings.tools.find((x) => x.id === shape.toolId) : undefined;
  if (!t) return defaultTool(settings);
  return fromLibraryTool(t, settings);
}

export function fromLibraryTool(t: Tool, settings: MachineSettings): EffectiveTool {
  // stepover keeps the project's ratio (stepover / diameter)
  const ratio = settings.toolDiameter > 0 ? settings.stepover / settings.toolDiameter : 0.5;
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    diameter: t.diameter,
    vbitAngle: t.vbitAngle,
    feedRate: t.feedRate ?? settings.feedRate,
    plungeRate: t.plungeRate ?? settings.plungeRate,
    spindleSpeed: t.spindleSpeed ?? settings.spindleSpeed,
    stepover: Math.max(Math.round(t.diameter * ratio * 100) / 100, 0.1),
  };
}

/** Settings as seen by the toolpath generator for a given tool. */
export function settingsForTool(settings: MachineSettings, tool: EffectiveTool): MachineSettings {
  return {
    ...settings,
    toolDiameter: tool.diameter,
    toolType: tool.type,
    vbitAngle: tool.vbitAngle,
    feedRate: tool.feedRate,
    plungeRate: tool.plungeRate,
    spindleSpeed: tool.spindleSpeed,
    stepover: tool.stepover,
  };
}

/** Distinct tools used by the (visible) shapes, default tool first, then library order. */
export function toolsInUse(shapes: Shape[], settings: MachineSettings): EffectiveTool[] {
  const visible = shapes.filter((s) => !s.hidden);
  const usesDefault = visible.some((s) => !s.toolId || !settings.tools.find((t) => t.id === s.toolId));
  const out: EffectiveTool[] = usesDefault ? [defaultTool(settings)] : [];
  for (const t of settings.tools) {
    if (visible.some((s) => s.toolId === t.id)) out.push(fromLibraryTool(t, settings));
  }
  return out;
}
