import type { ReliefShape, MachineSettings } from "../types";
import type { Point } from "./geometry";

/** Decode the base64 gray grid. */
export function reliefGrid(shape: ReliefShape): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(shape.data);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(shape.data, "base64"));
}
export function encodeGrid(bytes: Uint8Array): string {
  if (typeof btoa === "function") { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
  return Buffer.from(bytes).toString("base64");
}

/** Target depth (positive, mm) at a table point; 0 outside the relief. Bilinear sample. */
export function reliefDepthAt(shape: ReliefShape, grid: Uint8Array, x: number, y: number): number {
  const u = ((x - shape.x) / shape.width) * (shape.cols - 1);
  const v = ((shape.y + shape.height - y) / shape.height) * (shape.rows - 1); // row 0 = top
  if (u < 0 || v < 0 || u > shape.cols - 1 || v > shape.rows - 1) return 0;
  const c0 = Math.floor(u), r0 = Math.floor(v), c1 = Math.min(c0 + 1, shape.cols - 1), r1 = Math.min(r0 + 1, shape.rows - 1);
  const fu = u - c0, fv = v - r0;
  const g = (c: number, r: number) => grid[r * shape.cols + c];
  const gray = g(c0, r0) * (1 - fu) * (1 - fv) + g(c1, r0) * fu * (1 - fv) + g(c0, r1) * (1 - fu) * fv + g(c1, r1) * fu * fv;
  let t = 1 - gray / 255; // black = 1
  if (shape.invert) t = 1 - t;
  const gamma = shape.gamma && shape.gamma > 0 ? shape.gamma : 1;
  return Math.pow(Math.max(0, Math.min(1, t)), gamma) * shape.depthMax;
}

export interface ReliefLine { y: number; pts: Point[]; z: number[] }

/**
 * Raster lines over the relief with the tool profile compensated: the tool centre Z at (x, y) is the highest
 * point of (surface − tool shape) in the tool footprint, so a ball/flat tool never gouges below the target.
 * Returns lines with sampled tool-centre Z (negative), in table coordinates.
 */
export function reliefLines(shape: ReliefShape, settings: MachineSettings, tool: { type: "flat" | "ball" | "vbit"; radius: number; angle: number }, opts: { lineStep?: number; sample?: number } = {}): ReliefLine[] {
  const grid = reliefGrid(shape);
  const step = opts.lineStep ?? shape.lineStep ?? Math.max(settings.stepover, 0.2);
  const sample = opts.sample ?? Math.max(Math.min(step, shape.width / shape.cols), 0.2);
  const r = tool.radius;
  const along = shape.direction ?? "x";
  const lines: ReliefLine[] = [];
  // tool footprint offsets (grid of samples inside radius r)
  const foot: { dx: number; dy: number; drop: number }[] = [];
  const fs = Math.max(sample, r / 4);
  for (let dx = -r; dx <= r + 1e-9; dx += fs) for (let dy = -r; dy <= r + 1e-9; dy += fs) {
    const d = Math.hypot(dx, dy);
    if (d > r + 1e-9) continue;
    // how much lower the tool surface is at distance d from the centre, relative to the tip
    let drop = 0;
    if (tool.type === "ball") drop = r - Math.sqrt(Math.max(r * r - d * d, 0));
    else if (tool.type === "vbit") drop = d / Math.tan(((tool.angle / 2) * Math.PI) / 180);
    foot.push({ dx, dy, drop });
  }
  const centreZ = (x: number, y: number) => {
    // tool tip must stay above surface(x+dx,y+dy) + drop(d) for every footprint point (surface heights ≤ 0)
    let z = -Infinity;
    for (const f of foot) {
      const surf = -reliefDepthAt(shape, grid, x + f.dx, y + f.dy);
      const need = surf + f.drop; // tip height needed so the tool surface at (dx,dy) touches surf
      if (need > z) z = need;
    }
    return Math.min(0, z);
  };
  const n0 = along === "x" ? shape.height : shape.width;
  const nLines = Math.max(1, Math.round(n0 / step));
  for (let i = 0; i <= nLines; i++) {
    const t = Math.min(i * step, n0);
    const pts: Point[] = []; const zs: number[] = [];
    const len = along === "x" ? shape.width : shape.height;
    const ns = Math.max(1, Math.round(len / sample));
    for (let k = 0; k <= ns; k++) {
      const s = Math.min(k * sample, len);
      const x = along === "x" ? shape.x + s : shape.x + t;
      const y = along === "x" ? shape.y + t : shape.y + s;
      pts.push([x, y]); zs.push(centreZ(x, y));
    }
    lines.push({ y: t, pts, z: zs });
  }
  return lines;
}
