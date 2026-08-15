import type { Shape } from "../types";
import { boundingBox, shapeToPoints } from "./geometry";

export const RULER = 22; // px reserved for rulers (left/top)
export const PADDING = 12; // px around the table

/** Pick a "nice" grid step (mm) so there are not too many lines on screen. */
export function gridStepFor(scale: number): { minor: number; major: number } {
  // want minor lines >= 8px apart
  const candidates = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  const minor = candidates.find((c) => c * scale >= 8) ?? 500;
  return { minor, major: minor * 5 };
}

/** Compute the px/mm scale so the table fits the available viewport. */
export function fitScale(
  viewportW: number,
  viewportH: number,
  tableW: number,
  tableH: number
): number {
  const availW = Math.max(viewportW - RULER - PADDING * 2, 50);
  const availH = Math.max(viewportH - RULER - PADDING * 2, 50);
  return Math.max(Math.min(availW / tableW, availH / tableH), 0.05);
}

/** Clamp a shape's bounding box inside the table; returns the shape's new anchor (x,y) in mm. */
export function clampShapeToTable(
  shape: Shape,
  nextX: number,
  nextY: number,
  tableW: number,
  tableH: number
): [number, number] {
  const pts = shapeToPoints(shape);
  if (pts.length === 0) return [nextX, nextY];
  const b = boundingBox(pts);
  const anchorX = shape.kind === "path" ? b.minX : shape.x;
  const anchorY = shape.kind === "path" ? b.minY : shape.y;
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const dxMin = b.minX - anchorX; // offset from anchor to bbox min
  const dyMin = b.minY - anchorY;
  const clampedMinX = Math.min(Math.max(nextX + dxMin, 0), Math.max(tableW - w, 0));
  const clampedMinY = Math.min(Math.max(nextY + dyMin, 0), Math.max(tableH - h, 0));
  return [clampedMinX - dxMin, clampedMinY - dyMin];
}

