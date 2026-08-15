import type { Shape, RectangleShape, CircleShape, PathShape } from "../types";

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

/** Convert a rectangle shape into its 4 corner points (closed loop, first point repeated at the end). */
export function rectangleToPoints(shape: RectangleShape): Point[] {
  const { x, y, width, height, rotation } = shape;
  const corners: Point[] = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  const center: Point = [x + width / 2, y + height / 2];
  const rotated =
    rotation && rotation !== 0
      ? corners.map((p) => rotatePoint(p, center, rotation))
      : corners;
  return [...rotated, rotated[0]];
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
