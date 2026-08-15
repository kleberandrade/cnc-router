import type { Shape, PathShape, TextShape } from "../types";
import { textToPolygons } from "./text";

/**
 * Expand compound shapes (text) into machinable path shapes (one per glyph, with holes).
 * Regular shapes are returned as-is. Ids of expanded parts are `${id}#${index}`; `sourceId` maps back.
 */
export function expandShape(shape: Shape): Shape[] {
  if (shape.kind !== "text") return [shape];
  return textToPolygons(shape).map((g, i) => ({
    id: `${shape.id}#${i}`,
    kind: "path",
    points: g.outer,
    holes: g.holes.length ? g.holes : undefined,
    closed: true,
    depth: shape.depth,
    operation: shape.operation,
    side: shape.side ?? "outside",
    tabs: shape.tabs,
    cutThrough: shape.cutThrough,
    name: shape.name,
    hidden: shape.hidden,
    locked: shape.locked,
    toolId: shape.toolId,
  } satisfies PathShape));
}

export function expandShapes(shapes: Shape[]): Shape[] {
  return shapes.flatMap(expandShape);
}

/** Id of the user-facing shape a (possibly expanded) id belongs to. */
export function sourceId(id: string): string {
  const i = id.indexOf("#");
  return i >= 0 ? id.slice(0, i) : id;
}

export const isText = (s: Shape): s is TextShape => s.kind === "text";
