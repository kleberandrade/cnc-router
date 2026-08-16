import type { Shape, PathShape, TextShape, ExtraOperation } from "../types";
import { textToPolygons } from "./text";

/**
 * Expand compound shapes (text) into machinable path shapes (one per glyph, with holes).
 * Regular shapes are returned as-is. Ids of expanded parts are `${id}#${index}`; `sourceId` maps back.
 */
export function expandShape(shape: Shape): Shape[] {
  const base = shape.kind !== "text" ? [shape] : textShapes(shape);
  const extras = shape.extraOps ?? [];
  if (extras.length === 0) return base;
  // Each extra operation becomes a virtual copy of the geometry (ids `${id}~${k}` for shapes, `${id}#${i}~${k}` for glyphs).
  const out: Shape[] = [...base];
  extras.forEach((op, k) => {
    for (const b of base) {
      out.push({
        ...b,
        id: `${b.id}~${k}`,
        operation: op.operation,
        depth: op.depth,
        side: op.side ?? b.side,
        tabs: op.tabs,
        toolId: op.toolId ?? b.toolId,
        cutThrough: op.cutThrough,
        extraOps: undefined,
        name: b.name ? `${b.name} (${OP_LABEL[op.operation]})` : undefined,
      } as Shape);
    }
  });
  return out;
}

const OP_LABEL: Record<ExtraOperation["operation"], string> = { outline: "contorno", pocket: "rebaixo", drill: "furação" };

function textShapes(shape: TextShape): Shape[] {
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
  const cut = (s: string, ch: string) => { const i = s.indexOf(ch); return i >= 0 ? s.slice(0, i) : s; };
  return cut(cut(id, "~"), "#");
}

export const isText = (s: Shape): s is TextShape => s.kind === "text";
