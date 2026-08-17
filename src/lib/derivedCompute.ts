import type { Shape, MachineSettings } from "../types";
import { validateProject, type Issue } from "./validate";
import { buildToolpath, type Segment, type ToolpathWarning } from "./toolpath";
import { estimateTime } from "./timing";

/** Everything the UI derives from (shapes, settings): validation, toolpath and estimated time. Pure — runs on the main thread or in a worker. */
export interface Derived {
  issues: Issue[];
  segments: Segment[];
  warnings: ToolpathWarning[];
  shapeCount: number;
  /** Estimated total time, s. */
  time: number;
}

export function computeDerived(shapes: Shape[], settings: MachineSettings): Derived {
  const issues = validateProject(shapes, settings);
  if (shapes.length === 0) return { issues, segments: [], warnings: [], shapeCount: 0, time: 0 };
  try {
    const tp = buildToolpath(shapes, settings);
    const time = estimateTime(tp.segments, { rapidRate: settings.rapidRate, accel: settings.accel }).total;
    return { issues, segments: tp.segments, warnings: tp.warnings, shapeCount: tp.shapeCount, time };
  } catch {
    return { issues, segments: [], warnings: [], shapeCount: 0, time: 0 };
  }
}

/** Cheap, stable hash of the project (FNV-1a over the JSON). */
export function projectHash(shapes: Shape[], settings: MachineSettings, extra = ""): string {
  const str = JSON.stringify(shapes) + "|" + JSON.stringify(settings) + "|" + extra;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16) + ":" + str.length;
}
