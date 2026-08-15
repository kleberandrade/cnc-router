import type { Segment, Vec3 } from "./toolpath";
import type { Timing } from "./timing";

export type StepMode = "segment" | "pass" | "shape";

/** Index of the segment active at time `t` (last segment whose start <= t). */
export function segmentIndexAt(timing: Timing, t: number): number {
  const { cumulative } = timing;
  if (cumulative.length === 0) return -1;
  if (t <= 0) return 0;
  if (t >= timing.total) return cumulative.length - 1;
  // binary search: first index with cumulative[i] > t
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] > t) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** Interpolated tool position at time `t` (seconds). */
export function positionAt(segments: Segment[], timing: Timing, t: number): Vec3 {
  if (segments.length === 0) return [0, 0, 0];
  const i = segmentIndexAt(timing, t);
  const seg = segments[i];
  const dur = timing.perSegment[i];
  const start = timing.cumulative[i] - dur;
  const f = dur > 0 ? Math.min(Math.max((t - start) / dur, 0), 1) : 1;
  return [
    seg.from[0] + (seg.to[0] - seg.from[0]) * f,
    seg.from[1] + (seg.to[1] - seg.from[1]) * f,
    seg.from[2] + (seg.to[2] - seg.from[2]) * f,
  ];
}

/**
 * Instants (seconds) where a "step" boundary ends, according to the mode:
 * - segment: end of every segment with non-zero duration
 * - pass:    end of every (shapeId, pass) run and of every travel run
 * - shape:   end of every shape run (travel between shapes is merged into the following shape)
 * Always ends with `timing.total`. Sorted, unique, > 0.
 */
export function boundariesFor(segments: Segment[], timing: Timing, mode: StepMode): number[] {
  const out: number[] = [];
  const push = (t: number) => {
    if (t <= 0) return;
    if (out.length === 0 || t - out[out.length - 1] > 1e-9) out.push(t);
  };
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const next = segments[i + 1];
    const end = timing.cumulative[i];
    if (mode === "segment") {
      if (timing.perSegment[i] > 0) push(end);
      continue;
    }
    if (!next) {
      push(end);
      continue;
    }
    if (mode === "pass") {
      if (s.shapeId !== next.shapeId || s.pass !== next.pass) push(end);
    } else {
      // shape: boundary when leaving a shape (going to travel or to another shape)
      if (s.shapeId !== null && s.shapeId !== next.shapeId) push(end);
    }
  }
  push(timing.total);
  return out;
}

export function nextBoundary(boundaries: number[], t: number): number {
  for (const b of boundaries) if (b > t + 1e-6) return b;
  return boundaries.length ? boundaries[boundaries.length - 1] : t;
}

export function prevBoundary(boundaries: number[], t: number): number {
  let prev = 0;
  for (const b of boundaries) {
    if (b < t - 1e-6) prev = b;
    else break;
  }
  return prev;
}

/** Progress info for readouts. */
export interface ProgressInfo {
  segmentIndex: number;
  shapeIndex: number; // 0-based among shapes with segments, -1 for travel
  shapeCount: number;
  pass: number;
  passCount: number; // passes of the current shape
  op: Segment["op"];
}

export function progressAt(segments: Segment[], timing: Timing, t: number): ProgressInfo {
  const i = segmentIndexAt(timing, t);
  const seg = segments[i];
  const shapeIds: string[] = [];
  const passesByShape = new Map<string, number>();
  for (const s of segments) {
    if (s.shapeId === null) continue;
    if (!shapeIds.includes(s.shapeId)) shapeIds.push(s.shapeId);
    passesByShape.set(s.shapeId, Math.max(passesByShape.get(s.shapeId) ?? 0, s.pass));
  }
  if (!seg) return { segmentIndex: -1, shapeIndex: -1, shapeCount: shapeIds.length, pass: 0, passCount: 0, op: "travel" };
  return {
    segmentIndex: i,
    shapeIndex: seg.shapeId ? shapeIds.indexOf(seg.shapeId) : -1,
    shapeCount: shapeIds.length,
    pass: seg.pass,
    passCount: seg.shapeId ? passesByShape.get(seg.shapeId) ?? 0 : 0,
    op: seg.op,
  };
}
