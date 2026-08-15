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
}

/**
 * Estimate machining time. v1: constant velocity per segment (`length / feed`),
 * rapids at `rapidRate`. Acceleration is ignored, so short-segment paths
 * (polygonised circles) run slightly faster here than on the real machine.
 */
export function estimateTime(segments: Segment[], opts: TimingOptions): Timing {
  const perSegment: number[] = [];
  const cumulative: number[] = [];
  let total = 0;
  for (const s of segments) {
    const len = segmentLength(s);
    const rate = s.type === "rapid" || s.type === "retract" ? opts.rapidRate : s.feed;
    const secs = len > 0 && rate > 0 ? (len / rate) * 60 : 0;
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
