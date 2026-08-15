import ClipperLib from "clipper-lib";
import type { Point } from "./geometry";

const SCALE = 1000; // 0.001 mm resolution

export type Polygon = Point[];

function toClipper(poly: Polygon): ClipperLib.Path {
  const pts = poly.length > 1 && poly[0][0] === poly[poly.length - 1][0] && poly[0][1] === poly[poly.length - 1][1]
    ? poly.slice(0, -1)
    : poly;
  return pts.map(([x, y]) => new ClipperLib.IntPoint(Math.round(x * SCALE), Math.round(y * SCALE)));
}

function fromClipper(path: ClipperLib.Path): Polygon {
  return path.map((p) => [p.X / SCALE, p.Y / SCALE] as Point);
}

/** Ensure counter-clockwise orientation (positive area). */
export function ccw(poly: Polygon): Polygon {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    area += x1 * y2 - x2 * y1;
  }
  return area < 0 ? [...poly].reverse() : poly;
}

/**
 * Offset a closed polygon by `delta` mm (positive = outward, negative = inward), round joins.
 * Returns zero or more closed polygons (open loops, first point NOT repeated).
 * An inward offset larger than the shape yields [].
 */
export function offsetPolygon(poly: Polygon, delta: number, arcTolerance = 0.05): Polygon[] {
  if (poly.length < 3) return [];
  if (Math.abs(delta) < 1e-9) return [ccw(dedupeClosing(poly))];
  const co = new ClipperLib.ClipperOffset(2, arcTolerance * SCALE);
  co.AddPath(toClipper(ccw(poly)), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const solution: ClipperLib.Paths = [];
  co.Execute(solution, delta * SCALE);
  return solution
    .filter((p) => Math.abs(ClipperLib.Clipper.Area(p)) > 0)
    .map((p) => ccw(fromClipper(ClipperLib.Clipper.CleanPolygon(p, 0.5))))
    .filter((p) => p.length >= 3);
}

function dedupeClosing(poly: Polygon): Polygon {
  const n = poly.length;
  if (n > 1 && poly[0][0] === poly[n - 1][0] && poly[0][1] === poly[n - 1][1]) return poly.slice(0, -1);
  return poly;
}

/** Close a loop by repeating the first point at the end (toolpath convention). */
export function closeLoop(poly: Polygon): Point[] {
  return poly.length ? [...poly, poly[0]] : [];
}

/**
 * Intersections of the horizontal line y = `y` with a set of polygons, as sorted [xStart, xEnd] spans
 * (even-odd rule). Polygons are open loops (first point not repeated).
 */
export function scanlineSpans(polys: Polygon[], y: number): [number, number][] {
  const xs: number[] = [];
  for (const poly of polys) {
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % n];
      if (y1 === y2) continue;
      // half-open rule to avoid double counting vertices
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
  }
  xs.sort((a, b) => a - b);
  const spans: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (xs[i + 1] - xs[i] > 1e-6) spans.push([xs[i], xs[i + 1]]);
  }
  return spans;
}

/** Perimeter of a closed polygon (open loop input). */
export function perimeter(poly: Polygon): number {
  let len = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    len += Math.hypot(x2 - x1, y2 - y1);
  }
  return len;
}

/** Point at distance `d` along a closed loop (open loop input), wrapping around. */
export function pointAlong(poly: Polygon, d: number): Point {
  const total = perimeter(poly);
  if (total === 0) return poly[0];
  let s = ((d % total) + total) % total;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= len) {
      const f = len === 0 ? 0 : s / len;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    s -= len;
  }
  return poly[0];
}
