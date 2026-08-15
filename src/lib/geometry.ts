import type { Shape, RectangleShape, CircleShape, PathShape, RegularPolygonShape, SlotShape, CornerId } from "../types";
import { textToPolygons } from "./text";

export type Point = [number, number];

/**
 * Rotate a point around an origin by `angleDeg` degrees.
 */
export function rotatePoint(
  point: Point,
  origin: Point,
  angleDeg: number
): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  return [origin[0] + dx * cos - dy * sin, origin[1] + dx * sin + dy * cos];
}

/** Segments used to approximate a quarter arc of radius r (≈ 0.05 mm chord error, min 4). */
function arcSegments(r: number): number {
  return Math.max(4, Math.min(24, Math.ceil((Math.PI / 2) / Math.acos(1 - Math.min(0.05 / Math.max(r, 0.05), 0.5)))));
}

/**
 * Convert a rectangle shape into its outline (closed loop, first point repeated at the end).
 * Corners may be sharp, filleted (arc) or chamfered; `size` is clamped to half the shorter side.
 */
export function rectangleToPoints(shape: RectangleShape): Point[] {
  const { x, y, width, height, rotation } = shape;
  const c = shape.corners;
  const size = c && c.type !== "sharp" ? Math.min(Math.max(c.size, 0), Math.min(width, height) / 2) : 0;
  const which = new Set<CornerId>(c?.which && c.which.length ? c.which : ["bl", "br", "tr", "tl"]);
  // corner definitions in CCW order starting bottom-left: [corner point, dir along incoming edge, dir along outgoing edge]
  const defs: { id: CornerId; p: Point; inDir: Point; outDir: Point; a0: number }[] = [
    { id: "bl", p: [x, y], inDir: [0, 1], outDir: [1, 0], a0: Math.PI },
    { id: "br", p: [x + width, y], inDir: [-1, 0], outDir: [0, 1], a0: 1.5 * Math.PI },
    { id: "tr", p: [x + width, y + height], inDir: [0, -1], outDir: [-1, 0], a0: 0 },
    { id: "tl", p: [x, y + height], inDir: [1, 0], outDir: [0, -1], a0: 0.5 * Math.PI },
  ];
  const pts: Point[] = [];
  for (const d of defs) {
    if (size <= 0 || !which.has(d.id)) {
      pts.push(d.p);
      continue;
    }
    // point where the incoming edge ends and the outgoing edge starts, `size` away from the corner
    const start: Point = [d.p[0] + d.inDir[0] * size, d.p[1] + d.inDir[1] * size];
    const end: Point = [d.p[0] + d.outDir[0] * size, d.p[1] + d.outDir[1] * size];
    if (c!.type === "chamfer") {
      pts.push(start, end);
    } else {
      const centre: Point = [d.p[0] + (d.inDir[0] + d.outDir[0]) * size, d.p[1] + (d.inDir[1] + d.outDir[1]) * size];
      const n = arcSegments(size);
      for (let i = 0; i <= n; i++) {
        const a = d.a0 + (i / n) * (Math.PI / 2);
        pts.push([centre[0] + Math.cos(a) * size, centre[1] + Math.sin(a) * size]);
      }
    }
  }
  const center: Point = [x + width / 2, y + height / 2];
  const rotated = rotation && rotation !== 0 ? pts.map((p) => rotatePoint(p, center, rotation)) : pts;
  return [...rotated, rotated[0]];
}

/** Regular polygon: `sides` vertices on a circle of `radius`; first vertex at +X before rotation. */
export function ngonToPoints(shape: RegularPolygonShape): Point[] {
  const n = Math.max(3, Math.round(shape.sides));
  const pts: Point[] = [];
  const rot = ((shape.rotation || 0) * Math.PI) / 180;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    pts.push([shape.x + Math.cos(a) * shape.radius, shape.y + Math.sin(a) * shape.radius]);
  }
  return [...pts, pts[0]];
}

/** Slot/obround: two semicircles of diameter `width` joined by straight edges; `length` is end-to-end. */
export function slotToPoints(shape: SlotShape): Point[] {
  const r = shape.width / 2;
  const half = Math.max(shape.length / 2 - r, 0);
  const n = arcSegments(r) * 2;
  const pts: Point[] = [];
  // right semicircle (from -90° to +90°), then left semicircle (90° to 270°)
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    pts.push([half + Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * Math.PI;
    pts.push([-half + Math.cos(a) * r, Math.sin(a) * r]);
  }
  const rot = shape.rotation || 0;
  const placed = pts.map((p) => rotatePoint([p[0] + shape.x, p[1] + shape.y], [shape.x, shape.y], rot));
  return [...placed, placed[0]];
}

/** Convert a circle shape into a polygon approximation. */
export function circleToPoints(shape: CircleShape, segments = 64): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([
      shape.x + Math.cos(angle) * shape.radius,
      shape.y + Math.sin(angle) * shape.radius,
    ]);
  }
  return points;
}

/** Convert any supported shape to a flat, closed (when applicable) list of points in mm. */
export function shapeToPoints(shape: Shape): Point[] {
  switch (shape.kind) {
    case "rectangle":
      return rectangleToPoints(shape);
    case "circle":
      return circleToPoints(shape);
    case "ngon":
      return ngonToPoints(shape);
    case "slot":
      return slotToPoints(shape);
    case "text": {
      // All glyph outlines concatenated (for bounding boxes / hit areas); machining uses lib/expand.
      return textToPolygons(shape).flatMap((g) => [...g.outer, g.outer[0]]);
    }
    case "path": {
      const p = shape as PathShape;
      if (p.closed && p.points.length > 0) {
        return [...p.points, p.points[0]];
      }
      return [...p.points];
    }
    default:
      return [];
  }
}

/** Axis-aligned bounding box for a set of points. */
export function boundingBox(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Generate horizontal scanline offsets between minY and maxY, `stepover` mm apart,
 * used for simple pocket clearing.
 */
export function scanlines(
  minY: number,
  maxY: number,
  stepover: number
): number[] {
  if (stepover <= 0) throw new Error("stepover must be > 0");
  const lines: number[] = [];
  for (let y = minY; y <= maxY; y += stepover) {
    lines.push(y);
  }
  if (lines[lines.length - 1] !== maxY) lines.push(maxY);
  return lines;
}
