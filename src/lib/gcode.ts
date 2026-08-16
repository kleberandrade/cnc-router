import type { Shape, MachineSettings } from "../types";
import { validateProject, hasErrors } from "./validate";
import { buildToolpath, workOriginOffset, type Segment } from "./toolpath";
import { buildPassDepths } from "./passes";
import { estimateTime, formatDuration } from "./timing";
import { findMaterial } from "./materials";
import { toolsInUse } from "./tools";
import { findPost, fmtNum, unitScale, unitWord, type PostProcessor } from "./post";
import { PRODUCT, AUTHOR } from "../content/about";
import { versionLabel, GIT_SHA } from "./version";

const materialLabel = (id: MachineSettings["material"]) => findMaterial(id)?.label ?? "personalizado";

export { buildPassDepths, workOriginOffset };

/** Thrown by `generateGCode` when settings would produce an invalid program. */
export class GCodeError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(problems.join("; "));
    this.name = "GCodeError";
    this.problems = problems;
  }
}

/** Human-readable (pt-BR) list of reasons why G-code cannot be generated; empty when OK. */
export function validateSettings(settings: MachineSettings): string[] {
  const problems: string[] = [];
  type NumericKey = "feedRate" | "plungeRate" | "spindleSpeed" | "passDepth" | "toolDiameter" | "stepover";
  const positive: [NumericKey, string][] = [
    ["feedRate", "Avanço de corte"],
    ["plungeRate", "Avanço de mergulho"],
    ["spindleSpeed", "Rotação do spindle"],
    ["passDepth", "Profundidade por passe"],
    ["toolDiameter", "Diâmetro da fresa"],
    ["stepover", "Passo lateral (stepover)"],
  ];
  for (const [key, label] of positive) {
    const v = settings[key];
    if (!Number.isFinite(v) || v <= 0) problems.push(`${label} precisa ser maior que zero.`);
  }
  if (!Number.isFinite(settings.safeHeight) || settings.safeHeight < 0) {
    problems.push("Altura segura não pode ficar negativa.");
  }
  return problems;
}

/** Same as `validateSettings`, for the shapes list. */
export function validateShapes(shapes: Shape[]): string[] {
  const problems: string[] = [];
  shapes.forEach((s, i) => {
    if (!Number.isFinite(s.depth) || s.depth <= 0) {
      problems.push(`Forma ${i + 1}: a profundidade precisa ser maior que zero.`);
    }
  });
  return problems;
}

export type GCodeResult =
  | { ok: true; gcode: string }
  | { ok: false; problems: string[] };

/** Non-throwing wrapper around `generateGCode`, for UI use. */
export function tryGenerateGCode(
  shapes: Shape[],
  settings: MachineSettings
): GCodeResult {
  const problems = [...validateSettings(settings), ...validateShapes(shapes)];
  const issues = validateProject(shapes, settings);
  if (hasErrors(issues)) {
    problems.push(...issues.filter((i) => i.level === "error").map((i) => i.message));
  }
  if (problems.length > 0) return { ok: false, problems };
  try {
    return { ok: true, gcode: generateGCode(shapes, settings) };
  } catch (err) {
    if (err instanceof GCodeError) return { ok: false, problems: err.problems };
    return { ok: false, problems: [(err as Error).message] };
  }
}

const fmt = (n: number): string => fmtNum(n, 3);

export interface EmitOptions {
  post?: PostProcessor;
  /** Multiply every coordinate and feed by this (1 = mm, 1/25.4 = inches). */
  scale?: number;
}

/** Serialize toolpath segments as G-code lines (no header/footer). Dialect-neutral motion (G0/G1) + post-specific tool change. */
export function segmentsToGCode(segments: Segment[], opts: EmitOptions = {}): string[] {
  const post = opts.post ?? findPost("grbl");
  const k = opts.scale ?? 1;
  const dec = k === 1 ? 3 : 4;
  const c = (n: number) => fmtNum(n * k, dec);
  const f = (n: number) => fmtNum(n * k, dec);
  const lines: string[] = [];
  for (const seg of segments) {
    if (seg.comment) lines.push(post.comment(seg.comment));
    const [tx, ty, tz] = seg.to;
    switch (seg.type) {
      case "rapid":
        // Rapids are planar moves at safe height (emitted even when zero-length, e.g. return to origin).
        lines.push(`G0 X${c(tx)} Y${c(ty)}`);
        break;
      case "retract":
        lines.push(`G0 Z${c(tz)}`);
        break;
      case "toolchange":
        lines.push(...post.toolChange(seg.tool?.name ?? "", fmt(seg.tool?.diameter ?? 0), seg.tool?.spindleSpeed ?? 0));
        break;
      case "plunge":
        lines.push(`G1 Z${c(tz)} F${f(seg.feed)}`);
        break;
      case "feed": {
        const zChanged = seg.from[2] !== tz;
        const xyChanged = seg.from[0] !== tx || seg.from[1] !== ty;
        if (zChanged && !xyChanged) lines.push(`G1 Z${c(tz)} F${f(seg.feed)}`);
        else if (zChanged) lines.push(`G1 X${c(tx)} Y${c(ty)} Z${c(tz)} F${f(seg.feed)}`);
        else lines.push(`G1 X${c(tx)} Y${c(ty)} F${f(seg.feed)}`);
        break;
      }
    }
  }
  return lines;
}

/**
 * Generate a full G-code program for a list of shapes in the dialect of `settings.post`.
 * Coordinates are mm (G21) or converted to inches (G20) per `settings.exportUnits`. Work origin (G54) is set by the stock origin.
 */
export function generateGCode(
  shapes: Shape[],
  settings: MachineSettings
): string {
  const problems = validateSettings(settings);
  if (problems.length > 0) throw new GCodeError(problems);
  const { workArea, stock } = settings;
  const issues = validateProject(shapes, settings);
  const toolpath = buildToolpath(shapes, settings);
  const timing = estimateTime(toolpath.segments, { rapidRate: settings.rapidRate, accel: settings.accel });

  const post = findPost(settings.post);
  const scale = unitScale(settings.exportUnits ?? "mm");
  const cm = post.comment;
  const lines: string[] = [];
  lines.push(cm(`Generated by ${PRODUCT.name} ${versionLabel()} (${GIT_SHA}) — ${AUTHOR.name} — ${PRODUCT.url}`));
  if (settings.projectName?.trim()) lines.push(cm(`projeto: ${settings.projectName.trim()}`));
  lines.push(cm(`post ${post.label} | units ${settings.exportUnits === "inch" ? "inch (G20)" : "mm (G21)"}`));
  lines.push(
    cm(`machine ${fmt(workArea.width)}x${fmt(workArea.height)}x${fmt(workArea.zTravel)}mm | stock ${fmt(stock.width)}x${fmt(stock.height)}x${fmt(stock.thickness)}mm @ (${fmt(stock.offsetX)},${fmt(stock.offsetY)}) origin ${stock.origin}`)
  );
  lines.push(
    cm(`material ${materialLabel(settings.material)} | tool Ø${fmt(settings.toolDiameter)}mm | stepover ${fmt(settings.stepover)}mm | pass ${fmt(settings.passDepth)}mm`)
  );
  const usedTools = toolsInUse(shapes, settings);
  if (usedTools.length > 1) {
    lines.push(cm(`ferramentas: ${usedTools.map((t) => `${t.name} Ø${fmt(t.diameter)}`).join(" | ")} — trocas com pausa`));
  }
  lines.push(cm(`tempo estimado: ${formatDuration(timing.total)} (rapid ${fmt(settings.rapidRate)} mm/min${settings.accel > 0 ? `, accel ${fmt(settings.accel)} mm/s²` : ""})`));
  for (const w of issues.filter((i) => i.level === "warning")) {
    lines.push(cm(`WARNING: ${w.message}`));
  }
  for (const w of toolpath.warnings) {
    lines.push(cm(`WARNING: ${w.message}`));
  }
  lines.push(unitWord(settings.exportUnits ?? "mm", post));
  lines.push(`G90 ${cm("absolute positioning")}`);
  lines.push(...post.preamble());

  // First segment is the initial retract to safe height; spindle on comes right after it.
  const body = segmentsToGCode(toolpath.segments, { post, scale });
  lines.push(body[0]);
  lines.push(...post.spindleOn(usedTools[0]?.spindleSpeed ?? settings.spindleSpeed));
  // Last two segments are the final retract + return to origin; spindle off goes before them.
  const middle = body.slice(1, body.length - 2);
  lines.push(...middle);
  lines.push(...post.spindleOff());
  lines.push(...body.slice(body.length - 2));
  lines.push(...post.programEnd());

  return lines.join("\n") + "\n";
}
