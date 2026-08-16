import type { Shape } from "../types";
import { shapeToPoints, boundingBox, rotatePoint, type Point } from "./geometry";
import { translateShape } from "./transform";

export interface NestOptions {
  /** Usable sheet size, mm. */
  width: number;
  height: number;
  /** Gap between parts (and to the sheet border), mm — normally tool Ø + clearance. */
  spacing: number;
  /** Allow 90° rotation of parts. */
  allowRotate: boolean;
}

export interface Placement {
  id: string;
  /** Rotated by 90° before translating. */
  rotated: boolean;
  /** Translation applied after rotation. */
  dx: number;
  dy: number;
}

export interface NestResult {
  placed: Placement[];
  /** Ids that did not fit in the sheet (left untouched). */
  overflow: string[];
  /** Used bounding area fraction (0–1). */
  fill: number;
}

interface Rect { x: number; y: number; w: number; h: number }

/** Rotate a shape by 90° CCW around its bounding-box centre. */
export function rotateShape90(shape: Shape): Shape {
  const b = boundingBox(shapeToPoints(shape));
  const c: Point = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  let out: Shape;
  if (shape.kind === "path") {
    const rot = (pts: [number, number][]) => pts.map((p) => rotatePoint(p, c, 90) as [number, number]);
    out = { ...shape, points: rot(shape.points), holes: shape.holes ? shape.holes.map(rot) : undefined };
  } else if (shape.kind === "circle" || shape.kind === "relief") {
    return shape; // reliefs are not rotated (raster grid)
  } else {
    out = { ...shape, rotation: ((shape.rotation || 0) + 90) % 360 };
  }
  // keep the bbox centre in place
  const nb = boundingBox(shapeToPoints(out));
  return translateShape(out, c[0] - (nb.minX + nb.maxX) / 2, c[1] - (nb.minY + nb.maxY) / 2);
}

/**
 * MaxRects (best short side fit) bin packing of the shapes' bounding boxes, sorted by area (decreasing).
 * Runs in O(n²) — instant for hundreds of parts.
 */
export function nestShapes(shapes: Shape[], opts: NestOptions): NestResult {
  const gap = Math.max(opts.spacing, 0);
  const W = opts.width - gap;
  const H = opts.height - gap;
  const items = shapes.map((s) => {
    const b = boundingBox(shapeToPoints(s));
    return { s, w: b.maxX - b.minX + gap, h: b.maxY - b.minY + gap, b };
  });
  items.sort((a, b) => b.w * b.h - a.w * a.h || Math.max(b.w, b.h) - Math.max(a.w, a.h));
  let free: Rect[] = [{ x: gap, y: gap, w: W, h: H }];
  const placed: Placement[] = [];
  const overflow: string[] = [];
  let usedArea = 0;

  for (const it of items) {
    let best: { r: Rect; rotated: boolean; score: number; x: number; y: number } | null = null;
    const tryFit = (w: number, h: number, rotated: boolean) => {
      for (const r of free) {
        if (w <= r.w + 1e-9 && h <= r.h + 1e-9) {
          const score = Math.min(r.w - w, r.h - h) * 1e6 + r.y * 1e3 + r.x; // BSSF, then bottom-left
          if (!best || score < best.score) best = { r, rotated, score, x: r.x, y: r.y };
        }
      }
    };
    tryFit(it.w, it.h, false);
    if (opts.allowRotate && Math.abs(it.w - it.h) > 1e-9) tryFit(it.h, it.w, true);
    if (!best) { overflow.push(it.s.id); continue; }
    const b = best as { r: Rect; rotated: boolean; score: number; x: number; y: number };
    const pw = b.rotated ? it.h : it.w;
    const ph = b.rotated ? it.w : it.h;
    const used: Rect = { x: b.x, y: b.y, w: pw, h: ph };
    usedArea += (pw - gap) * (ph - gap);
    // translation: bbox min corner (after rotation, the bbox is centred at the same point) → (x, y)
    let minX = it.b.minX, minY = it.b.minY;
    if (b.rotated) {
      const cx = (it.b.minX + it.b.maxX) / 2, cy = (it.b.minY + it.b.maxY) / 2;
      minX = cx - (pw - gap) / 2; // rotated width = original height
      minY = cy - (ph - gap) / 2;
    }
    placed.push({ id: it.s.id, rotated: b.rotated, dx: b.x - minX, dy: b.y - minY });
    // split free rects
    const next: Rect[] = [];
    for (const r of free) {
      if (used.x >= r.x + r.w || used.x + used.w <= r.x || used.y >= r.y + r.h || used.y + used.h <= r.y) { next.push(r); continue; }
      if (used.x > r.x) next.push({ x: r.x, y: r.y, w: used.x - r.x, h: r.h });
      if (used.x + used.w < r.x + r.w) next.push({ x: used.x + used.w, y: r.y, w: r.x + r.w - used.x - used.w, h: r.h });
      if (used.y > r.y) next.push({ x: r.x, y: r.y, w: r.w, h: used.y - r.y });
      if (used.y + used.h < r.y + r.h) next.push({ x: r.x, y: used.y + used.h, w: r.w, h: r.y + r.h - used.y - used.h });
    }
    // prune contained rects
    free = next.filter((a, i) => !next.some((o, j) => j !== i && a.x >= o.x - 1e-9 && a.y >= o.y - 1e-9 && a.x + a.w <= o.x + o.w + 1e-9 && a.y + a.h <= o.y + o.h + 1e-9 && (a.w < o.w || a.h < o.h || j < i)));
  }
  return { placed, overflow, fill: W * H > 0 ? usedArea / (W * H) : 0 };
}

/** Apply placements: rotate (if needed) then translate; the sheet origin (offsetX/offsetY) is added. */
export function applyPlacements(shapes: Shape[], placements: Placement[], origin: Point): Shape[] {
  const byId = new Map(placements.map((p) => [p.id, p]));
  return shapes.map((s) => {
    const p = byId.get(s.id);
    if (!p) return s;
    const r = p.rotated ? rotateShape90(s) : s;
    return translateShape(r, p.dx + origin[0], p.dy + origin[1]);
  });
}
