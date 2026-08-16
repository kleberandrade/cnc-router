import type { Shape } from "../types";
import { shapeToPoints, boundingBox } from "./geometry";
import { expandShapes } from "./expand";

/** Tiny SVG (path data) preview of a project's shapes, fitted to w×h. Outlines: stroke; pockets: filled. */
export function projectThumbnail(shapes: Shape[], w = 96, h = 64, pad = 4): { paths: { d: string; fill: boolean }[]; viewBox: string } {
  const parts = expandShapes(shapes.filter((s) => !s.hidden));
  const all = parts.flatMap((s) => shapeToPoints(s));
  if (all.length === 0) return { paths: [], viewBox: `0 0 ${w} ${h}` };
  const b = boundingBox(all);
  const sx = (w - 2 * pad) / Math.max(b.maxX - b.minX, 1e-6), sy = (h - 2 * pad) / Math.max(b.maxY - b.minY, 1e-6);
  const k = Math.min(sx, sy);
  const ox = pad + ((w - 2 * pad) - (b.maxX - b.minX) * k) / 2, oy = pad + ((h - 2 * pad) - (b.maxY - b.minY) * k) / 2;
  const tx = (x: number) => (ox + (x - b.minX) * k).toFixed(1);
  const ty = (y: number) => (h - (oy + (y - b.minY) * k)).toFixed(1); // y up → svg y down
  const loop = (pts: [number, number][]) => pts.map((p, i) => `${i ? "L" : "M"}${tx(p[0])} ${ty(p[1])}`).join(" ") + " Z";
  const paths = parts.map((s) => {
    const pts = shapeToPoints(s);
    let d = loop(pts as [number, number][]);
    if (s.kind === "path" && s.holes) for (const hole of s.holes) d += " " + loop(hole);
    return { d, fill: s.operation === "pocket" };
  });
  return { paths, viewBox: `0 0 ${w} ${h}` };
}
