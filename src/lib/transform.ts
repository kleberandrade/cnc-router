import type { Shape } from "../types";

/** Move a shape by (dx, dy) mm — paths move every point (and hole). */
export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  if (shape.kind === "path") {
    const mv = (pts: [number, number][]) => pts.map(([x, y]) => [x + dx, y + dy] as [number, number]);
    return { ...shape, points: mv(shape.points), holes: shape.holes ? shape.holes.map(mv) : undefined };
  }
  return { ...shape, x: shape.x + dx, y: shape.y + dy };
}
