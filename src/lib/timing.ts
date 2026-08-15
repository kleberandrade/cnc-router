import { segmentLength, type Segment } from "./toolpath";

export interface Timing {
  /** Duration of each segment, seconds. */
  perSegment: number[];
  /** Cumulative end time of each segment, seconds (monotonic). */
  cumulative: number[];
  /** Total program time, seconds. */
  total: number;
}

export interface TimingOptions {
  /** Speed used for G0 moves, mm/min. */
  rapidRate: number;
  /** Axis acceleration, mm/s². 0/undefined = constant-velocity model (v1). */
  accel?: number;
  /** Junction deviation, mm (GRBL $11). Default 0.01. */
  junctionDeviation?: number;
}

/** Programmed speed of a segment in mm/s. */
function segmentSpeed(s: Segment, rapidRate: number): number {
  const rate = s.type === "rapid" || s.type === "retract" ? rapidRate : s.feed;
  return rate > 0 ? rate / 60 : 0;
}

/**
 * Estimate machining time.
 * - v1 (`accel` = 0): constant velocity per segment (`length / feed`), rapids at `rapidRate`.
 * - v2 (`accel` > 0): trapezoidal profile with a GRBL-like planner — junction speed from the
 *   junction-deviation model, forward/backward passes so short polygonised segments never
 *   exceed what the machine can accelerate to, and a stop at every plunge/rapid boundary
 *   where the direction changes sharply.
 */
export function estimateTime(segments: Segment[], opts: TimingOptions): Timing {
  const a = opts.accel ?? 0;
  if (!(a > 0)) return estimateConstant(segments, opts.rapidRate);
  return estimateTrapezoidal(segments, opts.rapidRate, a, opts.junctionDeviation ?? 0.01);
}

function estimateConstant(segments: Segment[], rapidRate: number): Timing {
  const perSegment: number[] = [];
  const cumulative: number[] = [];
  let total = 0;
  for (const s of segments) {
    const len = segmentLength(s);
    const v = segmentSpeed(s, rapidRate);
    const secs = len > 0 && v > 0 ? len / v : 0;
    perSegment.push(secs);
    total += secs;
    cumulative.push(total);
  }
  return { perSegment, cumulative, total };
}

function unit(s: Segment, len: number): [number, number, number] {
  return [(s.to[0] - s.from[0]) / len, (s.to[1] - s.from[1]) / len, (s.to[2] - s.from[2]) / len];
}

/** GRBL junction speed (mm/s) between two unit direction vectors. */
export function junctionSpeed(u1: [number, number, number], u2: [number, number, number], accel: number, delta: number): number {
  const cosTheta = -(u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]);
  if (cosTheta < -0.9999) return Infinity; // straight line: no slowdown
  if (cosTheta > 0.9999) return 0; // full reversal
  const sinHalf = Math.sqrt(0.5 * (1 - cosTheta));
  return Math.sqrt((accel * delta * sinHalf) / (1 - sinHalf));
}

/** Time to travel `len` from `ve` to `vx` with cruise cap `vmax` and acceleration `a` (all mm, mm/s, mm/s²). */
export function trapezoidTime(len: number, ve: number, vx: number, vmax: number, a: number): number {
  if (len <= 0) return 0;
  if (!(vmax > 0)) return 0;
  const vpeak = Math.sqrt((2 * a * len + ve * ve + vx * vx) / 2);
  if (vpeak <= vmax) {
    return (vpeak - ve) / a + (vpeak - vx) / a;
  }
  const dAcc = (vmax * vmax - ve * ve) / (2 * a);
  const dDec = (vmax * vmax - vx * vx) / (2 * a);
  return (vmax - ve) / a + (vmax - vx) / a + (len - dAcc - dDec) / vmax;
}

function estimateTrapezoidal(segments: Segment[], rapidRate: number, a: number, delta: number): Timing {
  const n = segments.length;
  const len = segments.map(segmentLength);
  const vmax = segments.map((s) => segmentSpeed(s, rapidRate));
  // Entry velocity of each segment; exit of i = entry of i+1 (0 at the very end).
  const ve = new Array<number>(n + 1).fill(0);
  // Junction limits between i-1 and i.
  for (let i = 1; i < n; i++) {
    if (len[i - 1] <= 0 || len[i] <= 0 || vmax[i - 1] <= 0 || vmax[i] <= 0) { ve[i] = 0; continue; }
    const vj = junctionSpeed(unit(segments[i - 1], len[i - 1]), unit(segments[i], len[i]), a, delta);
    ve[i] = Math.min(vj, vmax[i - 1], vmax[i]);
  }
  // Forward pass: can we reach ve[i+1] from ve[i] within len[i]?
  for (let i = 0; i < n; i++) {
    const reach = Math.sqrt(ve[i] * ve[i] + 2 * a * len[i]);
    if (ve[i + 1] > reach) ve[i + 1] = reach;
  }
  // Backward pass: can we decelerate from ve[i] to ve[i+1] within len[i]?
  for (let i = n - 1; i >= 0; i--) {
    const reach = Math.sqrt(ve[i + 1] * ve[i + 1] + 2 * a * len[i]);
    if (ve[i] > reach) ve[i] = reach;
  }
  const perSegment: number[] = [];
  const cumulative: number[] = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const secs = len[i] > 0 && vmax[i] > 0 ? trapezoidTime(len[i], Math.min(ve[i], vmax[i]), Math.min(ve[i + 1], vmax[i]), vmax[i], a) : 0;
    perSegment.push(secs);
    total += secs;
    cumulative.push(total);
  }
  return { perSegment, cumulative, total };
}

/** Format seconds as "1h02m03s" / "7m52s" / "12s". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m${String(sec).padStart(2, "0")}s`;
  if (m > 0) return `${m}m${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

/** Format seconds as mm:ss (or h:mm:ss) for player readouts. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
