import type { Shape, MachineSettings } from "../types";
import { buildToolpath, workOriginOffset, type Segment } from "./toolpath";
import { estimateTime } from "./timing";
import { createHeightmap, carveUpTo, type Heightmap, type ToolProfile } from "./heightmap";
import type { Point } from "./geometry";
import { expandShapes, sourceId } from "./expand";
import { toolForShape } from "./tools";
import { shapeRegions } from "./boolean";

export interface VerifyShapeResult {
  shapeId: string;
  name: string;
  operation: Shape["operation"];
  /** Area (mm²) that should have been removed to the target depth but was not (inner corners, narrow spots). */
  leftoverArea: number;
  /** Fraction of the target area not reached (0–1). */
  leftoverRatio: number;
  /** Smallest inside radius the tool can produce (= tool radius) — explains corner leftover. */
  minRadius: number;
}

export interface VerifyReport {
  res: number;
  results: VerifyShapeResult[];
  /** Area (mm²) cut deeper than any target — outside every part region (gouge). */
  gougeArea: number;
  warnings: string[];
}

function insidePolys(polys: Point[][], px: number, py: number): boolean {
  let inside = false;
  for (const poly of polys) {
    const n = poly.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/**
 * Compare what the toolpath actually removes (final heightmap) with what each pocket/inside-outline
 * asks for (its region to its depth). Leftover = target cells still above the target depth.
 * Outlines "on/outside" are not judged (they only follow lines).
 */
export function verifyProject(shapes: Shape[], settings: MachineSettings, opts: { res?: number; maxCells?: number } = {}): VerifyReport {
  const visible = shapes.filter((s) => !s.hidden);
  const tp = buildToolpath(visible, settings);
  const timing = estimateTime(tp.segments, { rapidRate: settings.rapidRate, accel: 0 });
  const { stock } = settings;
  const [ox, oy] = workOriginOffset(settings);
  const hm: Heightmap = createHeightmap({ width: stock.width, height: stock.height, thickness: stock.thickness, originX: stock.offsetX - ox, originY: stock.offsetY - oy }, opts.res);
  const profiles = new Map<string | undefined, ToolProfile>();
  profiles.set(undefined, { type: settings.toolType, radius: settings.toolDiameter / 2, angle: settings.vbitAngle });
  for (const t of settings.tools) profiles.set(t.id, { type: t.type, radius: t.diameter / 2, angle: t.vbitAngle });
  const profileFor = (seg: Segment) => profiles.get(seg.toolId) ?? profiles.get(undefined)!;
  carveUpTo(hm, tp.segments, timing, timing.total + 1, profileFor);

  const cell = hm.res * hm.res;
  const results: VerifyShapeResult[] = [];
  const claimed = new Uint8Array(hm.rows * hm.cols); // cells inside any part region (any depth)
  const expanded = expandShapes(visible);
  for (const s of expanded) {
    const judged = s.operation === "pocket" || (s.operation === "outline" && s.side === "inside") || s.operation === "drill";
    const regions = shapeRegions(s).map((r) => ({ outer: r.outer.map(([x, y]) => [x - ox, y - oy] as Point), holes: r.holes.map((h) => h.map(([x, y]) => [x - ox, y - oy] as Point)) }));
    if (regions.length === 0) continue;
    // bbox in grid
    const pts = regions.flatMap((r) => r.outer);
    const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
    const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
    const c0 = Math.max(0, Math.floor((minX - hm.originX) / hm.res)), c1 = Math.min(hm.cols - 1, Math.ceil((maxX - hm.originX) / hm.res));
    const r0 = Math.max(0, Math.floor((minY - hm.originY) / hm.res)), r1 = Math.min(hm.rows - 1, Math.ceil((maxY - hm.originY) / hm.res));
    const target = -Math.min(s.depth, stock.thickness);
    let targetCells = 0, leftover = 0;
    for (let r = r0; r <= r1; r++) {
      const y = hm.originY + r * hm.res;
      for (let c = c0; c <= c1; c++) {
        const x = hm.originX + c * hm.res;
        const inRegion = (px: number, py: number) => regions.some((rg) => insidePolys([rg.outer], px, py) && !insidePolys(rg.holes, px, py));
        if (!inRegion(x, y)) continue;
        claimed[r * hm.cols + c] = 1;
        if (!judged) continue;
        // judge only cells wholly inside (half a cell away from the boundary in every direction)
        const h = hm.res / 2;
        if (!(inRegion(x - h, y) && inRegion(x + h, y) && inRegion(x, y - h) && inRegion(x, y + h))) continue;
        // drills only judge the tool footprint at the centre; the circle may be larger than the tool
        targetCells++;
        if (hm.heights[r * hm.cols + c] > target + 0.05) leftover++;
      }
    }
    if (!judged) continue;
    const tool = toolForShape(s, settings);
    results.push({
      shapeId: sourceId(s.id),
      name: s.name ?? sourceId(s.id),
      operation: s.operation,
      leftoverArea: Math.round(leftover * cell * 10) / 10,
      leftoverRatio: targetCells ? leftover / targetCells : 0,
      minRadius: tool.diameter / 2,
    });
  }
  // gouge: cut cells outside every claimed region — but outside-compensated outlines legitimately cut around parts,
  // so only count cells deeper than 0 that are farther than the largest tool radius from any claimed cell (cheap check: skip if any claimed neighbour within radius)
  const maxR = Math.max(settings.toolDiameter / 2, ...settings.tools.map((t) => t.diameter / 2));
  const reach = Math.ceil((2 * maxR) / hm.res) + 1; // outside outlines cut up to 2r beyond the part edge
  let gouge = 0;
  for (let r = 0; r < hm.rows; r++) {
    for (let c = 0; c < hm.cols; c++) {
      const i = r * hm.cols + c;
      if (hm.heights[i] >= -0.05 || claimed[i]) continue;
      let near = false;
      for (let dr = -reach; dr <= reach && !near; dr++) {
        const rr = r + dr; if (rr < 0 || rr >= hm.rows) continue;
        for (let dc = -reach; dc <= reach; dc++) {
          const cc = c + dc; if (cc < 0 || cc >= hm.cols) continue;
          if (claimed[rr * hm.cols + cc]) { near = true; break; }
        }
      }
      if (!near) gouge++;
    }
  }
  const warnings: string[] = [];
  for (const r of results) {
    if (r.leftoverRatio > 0.02) warnings.push(`${r.name}: ${r.leftoverArea} mm² não alcançados (${Math.round(r.leftoverRatio * 100)} %) — cantos internos com raio < ${r.minRadius} mm ou vão mais estreito que a fresa.`);
  }
  if (gouge * cell > 1) warnings.push(`Corte fora das peças: ${Math.round(gouge * cell)} mm² (movimentos abaixo da superfície longe de qualquer peça).`);
  return { res: hm.res, results, gougeArea: Math.round(gouge * cell), warnings };
}
