import ClipperLib from "clipper-lib";
import type { Shape, PathShape } from "../types";
import { shapeToPoints, type Point } from "./geometry";
import { ccw, type Polygon } from "./offset";
import { expandShapes } from "./expand";

export type BooleanOp = "union" | "difference" | "intersection";

const SCALE = 1000;

/** A region = one outer loop plus zero or more holes (all open loops, first point not repeated). */
export interface Region {
  outer: Polygon;
  holes: Polygon[];
}

function open(points: Point[]): Polygon {
  const n = points.length;
  return n > 1 && points[0][0] === points[n - 1][0] && points[0][1] === points[n - 1][1] ? points.slice(0, -1) : points;
}

function toClipper(poly: Polygon): ClipperLib.Path {
  return poly.map(([x, y]) => new ClipperLib.IntPoint(Math.round(x * SCALE), Math.round(y * SCALE)));
}
function fromClipper(path: ClipperLib.Path): Polygon {
  return path.map((p) => [p.X / SCALE, p.Y / SCALE] as Point);
}

/** Regions (outer + holes) of a shape's machinable geometry (text is expanded into glyphs). */
export function shapeRegions(shape: Shape): Region[] {
  return expandShapes([shape]).flatMap((s) => {
    const outer = open(shapeToPoints(s));
    if (outer.length < 3) return [];
    const holes = s.kind === "path" && s.holes ? s.holes.map(open).filter((h) => h.length >= 3) : [];
    return [{ outer: ccw(outer), holes: holes.map((h) => [...ccw(h)].reverse()) }];
  });
}

/** Clipper paths for a set of regions: outers CCW (positive), holes CW (negative) → non-zero fill. */
function regionPaths(regions: Region[]): ClipperLib.Paths {
  return regions.flatMap((r) => [toClipper(r.outer), ...r.holes.map(toClipper)]);
}

/** Convert a Clipper PolyTree into regions (nested outers inside holes become their own regions). */
function treeToRegions(tree: ClipperLib.PolyTree): Region[] {
  const out: Region[] = [];
  const visit = (node: ClipperLib.PolyNode) => {
    for (const child of node.Childs()) {
      if (!child.IsHole()) {
        const outer = ccw(fromClipper(ClipperLib.Clipper.CleanPolygon(child.Contour(), 0.5)));
        const holes: Polygon[] = [];
        for (const h of child.Childs()) {
          const hp = fromClipper(ClipperLib.Clipper.CleanPolygon(h.Contour(), 0.5));
          if (hp.length >= 3) holes.push(ccw(hp));
          visit(h); // outers nested inside the hole
        }
        if (outer.length >= 3) out.push({ outer, holes });
      } else {
        visit(child);
      }
    }
  };
  visit(tree);
  return out;
}

const CLIP_TYPE: Record<BooleanOp, ClipperLib.ClipType> = {
  union: ClipperLib.ClipType.ctUnion,
  difference: ClipperLib.ClipType.ctDifference,
  intersection: ClipperLib.ClipType.ctIntersection,
};

/**
 * Boolean operation between regions. `subject` is the base; for `difference` the clips are subtracted
 * from it; for `union`/`intersection` all regions take part symmetrically.
 */
export function booleanRegions(op: BooleanOp, subject: Region[], clips: Region[]): Region[] {
  const c = new ClipperLib.Clipper();
  c.AddPaths(regionPaths(subject), ClipperLib.PolyType.ptSubject, true);
  if (clips.length) c.AddPaths(regionPaths(clips), ClipperLib.PolyType.ptClip, true);
  const tree = new ClipperLib.PolyTree();
  c.Execute(CLIP_TYPE[op], tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return treeToRegions(tree);
}

/**
 * Apply a boolean operation to shapes (in selection order: the first is the base) and return the
 * resulting path shapes. Cutting parameters (depth, operation, side, tabs, tool…) come from the base.
 * Union with a single shape just returns it as regions (useful to convert to a path).
 */
export function booleanShapes(op: BooleanOp, shapes: Shape[], newId: (i: number) => string): PathShape[] {
  if (shapes.length === 0) return [];
  const [base, ...rest] = shapes;
  const subject = shapeRegions(base);
  const clips = rest.flatMap(shapeRegions);
  const regions =
    op === "difference"
      ? booleanRegions("difference", subject, clips)
      : op === "union"
        ? booleanRegions("union", [...subject, ...clips], [])
        : rest.reduce((acc, s) => booleanRegions("intersection", acc, shapeRegions(s)), subject);
  const label = { union: "União", difference: "Subtração", intersection: "Interseção" }[op];
  return regions.map((r, i) => ({
    id: newId(i),
    kind: "path",
    points: r.outer,
    holes: r.holes.length ? r.holes : undefined,
    closed: true,
    depth: base.depth,
    operation: base.operation === "drill" ? "outline" : base.operation,
    side: base.side ?? "outside",
    tabs: base.tabs,
    cutThrough: base.cutThrough,
    name: base.name ? `${base.name} (${label.toLowerCase()})` : regions.length > 1 ? `${label} ${i + 1}` : label,
    toolId: base.toolId,
  }));
}

/** Signed area of a loop (positive = CCW). */
export function loopArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Area of a region (outer − holes). */
export function regionArea(r: Region): number {
  return Math.abs(loopArea(r.outer)) - r.holes.reduce((s, h) => s + Math.abs(loopArea(h)), 0);
}
