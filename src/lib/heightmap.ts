import type { Segment } from "./toolpath";
import type { Timing } from "./timing";
import type { ToolType } from "../types";

/**
 * Height-field model of the stock for material-removal simulation.
 * Grid over the stock's top face (work coordinates); `h[i]` = surface height (0 = untouched, negative = cut).
 */
export interface Heightmap {
  cols: number;
  rows: number;
  /** mm per cell */
  res: number;
  /** work-space X/Y of cell (0,0) centre */
  originX: number;
  originY: number;
  /** stock thickness (positive) — floor for the "cut through" colour */
  thickness: number;
  heights: Float32Array;
  /** playback cursor: index of the next segment to carve and how far into it (0..1) */
  cursor: { index: number; frac: number };
  /** dirty row range since last `clearDirty` (inclusive/exclusive), or null */
  dirty: { r0: number; r1: number } | null;
}

export interface ToolProfile {
  type: ToolType;
  radius: number;
  /** included angle in degrees for V-bits */
  angle: number;
}

/** Pick a cell size so the grid stays under `maxCells` (0.25–2 mm, in 0.05 steps). */
export function pickResolution(width: number, height: number, maxCells = 250_000): number {
  const ideal = Math.sqrt((width * height) / maxCells);
  const res = Math.max(0.25, Math.min(2, Math.ceil(ideal / 0.05) * 0.05));
  return Math.round(res * 100) / 100;
}

export function createHeightmap(stock: { width: number; height: number; thickness: number; originX: number; originY: number }, res?: number): Heightmap {
  const r = res ?? pickResolution(stock.width, stock.height);
  const cols = Math.max(2, Math.ceil(stock.width / r) + 1);
  const rows = Math.max(2, Math.ceil(stock.height / r) + 1);
  return {
    cols, rows, res: r,
    originX: stock.originX, originY: stock.originY,
    thickness: stock.thickness,
    heights: new Float32Array(cols * rows),
    cursor: { index: 0, frac: 0 },
    dirty: null,
  };
}

export function resetHeightmap(hm: Heightmap): void {
  hm.heights.fill(0);
  hm.cursor = { index: 0, frac: 0 };
  hm.dirty = { r0: 0, r1: hm.rows };
}

/** Depth offset of the tool tip profile at lateral distance `d` from the axis (0 at centre, grows outwards). */
function tipOffset(tool: ToolProfile, d: number): number {
  switch (tool.type) {
    case "ball": {
      const r = tool.radius;
      return d >= r ? r : r - Math.sqrt(r * r - d * d);
    }
    case "vbit": {
      const half = ((tool.angle / 2) * Math.PI) / 180;
      return d / Math.tan(half);
    }
    default:
      return 0;
  }
}

/** Stamp the tool at (x, y, z) into the height field. */
export function stamp(hm: Heightmap, x: number, y: number, z: number, tool: ToolProfile): void {
  if (z >= 0) return;
  const r = tool.radius;
  const c0 = Math.max(0, Math.floor((x - r - hm.originX) / hm.res));
  const c1 = Math.min(hm.cols - 1, Math.ceil((x + r - hm.originX) / hm.res));
  const r0 = Math.max(0, Math.floor((y - r - hm.originY) / hm.res));
  const r1 = Math.min(hm.rows - 1, Math.ceil((y + r - hm.originY) / hm.res));
  if (c1 < c0 || r1 < r0) return;
  const r2 = r * r;
  const h = hm.heights;
  for (let row = r0; row <= r1; row++) {
    const cy = hm.originY + row * hm.res;
    const dy = cy - y;
    const base = row * hm.cols;
    for (let col = c0; col <= c1; col++) {
      const cx = hm.originX + col * hm.res;
      const dx = cx - x;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const zz = z + (tool.type === "flat" ? 0 : tipOffset(tool, Math.sqrt(d2)));
      const i = base + col;
      if (zz < h[i]) h[i] = zz;
    }
  }
  if (!hm.dirty) hm.dirty = { r0, r1: r1 + 1 };
  else {
    if (r0 < hm.dirty.r0) hm.dirty.r0 = r0;
    if (r1 + 1 > hm.dirty.r1) hm.dirty.r1 = r1 + 1;
  }
}

/** Carve the part of `seg` between fractions `f0` and `f1` (0..1). */
export function carveSegment(hm: Heightmap, seg: Segment, tool: ToolProfile, f0 = 0, f1 = 1): void {
  if (seg.type === "rapid" || seg.type === "retract" || seg.type === "toolchange") return;
  const [x0, y0, z0] = seg.from;
  const [x1, y1, z1] = seg.to;
  if (z0 >= 0 && z1 >= 0) return;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const step = Math.max(hm.res * 0.5, tool.radius * 0.35, 0.05);
  const n = Math.max(1, Math.ceil((len * (f1 - f0)) / step));
  for (let i = 0; i <= n; i++) {
    const f = f0 + ((f1 - f0) * i) / n;
    stamp(hm, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, z0 + (z1 - z0) * f, tool);
  }
}

/**
 * Advance the carve state to time `t`. Forward moves are incremental; moving backwards resets and recomputes.
 * Returns true when anything changed.
 */
export function carveUpTo(hm: Heightmap, segments: Segment[], timing: Timing, t: number, toolOrResolver: ToolProfile | ((seg: Segment) => ToolProfile)): boolean {
  const tool = (seg: Segment) => (typeof toolOrResolver === "function" ? toolOrResolver(seg) : toolOrResolver);
  if (segments.length === 0) return false;
  const target = locate(timing, t);
  const cur = hm.cursor;
  const isBackward = target.index < cur.index || (target.index === cur.index && target.frac < cur.frac - 1e-9);
  if (isBackward) {
    resetHeightmap(hm);
  }
  const start = hm.cursor;
  if (target.index === start.index && Math.abs(target.frac - start.frac) < 1e-12) return isBackward;
  // partial remainder of the current segment
  if (start.index < segments.length) {
    const endFrac = target.index > start.index ? 1 : target.frac;
    if (endFrac > start.frac) carveSegment(hm, segments[start.index], tool(segments[start.index]), start.frac, endFrac);
  }
  for (let i = start.index + 1; i < target.index && i < segments.length; i++) {
    carveSegment(hm, segments[i], tool(segments[i]), 0, 1);
  }
  if (target.index > start.index && target.index < segments.length && target.frac > 0) {
    carveSegment(hm, segments[target.index], tool(segments[target.index]), 0, target.frac);
  }
  hm.cursor = { index: Math.min(target.index, segments.length), frac: target.index >= segments.length ? 0 : target.frac };
  return true;
}

/** (segment index, fraction) at time t. */
export function locate(timing: Timing, t: number): { index: number; frac: number } {
  const n = timing.cumulative.length;
  if (n === 0) return { index: 0, frac: 0 };
  if (t <= 0) return { index: 0, frac: 0 };
  if (t >= timing.total) return { index: n, frac: 0 };
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timing.cumulative[mid] > t) hi = mid;
    else lo = mid + 1;
  }
  const dur = timing.perSegment[lo];
  const start = timing.cumulative[lo] - dur;
  const frac = dur > 0 ? Math.min(Math.max((t - start) / dur, 0), 1) : 1;
  return { index: lo, frac };
}

/** Height at work coordinates (nearest cell), for tests. */
export function heightAt(hm: Heightmap, x: number, y: number): number {
  const col = Math.round((x - hm.originX) / hm.res);
  const row = Math.round((y - hm.originY) / hm.res);
  if (col < 0 || row < 0 || col >= hm.cols || row >= hm.rows) return NaN;
  return hm.heights[row * hm.cols + col];
}

/** Volume removed (mm³), for tests/readouts. */
export function removedVolume(hm: Heightmap): number {
  let sum = 0;
  for (let i = 0; i < hm.heights.length; i++) sum -= hm.heights[i];
  return sum * hm.res * hm.res;
}
