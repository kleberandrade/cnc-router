import type { Shape, MachineSettings } from "../types";
import { shapeToPoints, boundingBox, scanlines, type Point } from "./geometry";
import { buildPassDepths } from "./passes";
import { offsetPolygon, scanlineSpans, perimeter, pointAlong, ccw, type Polygon } from "./offset";
import { toolsInUse, toolForShape, settingsForTool, type EffectiveTool } from "./tools";
import { expandShapes } from "./expand";
import { booleanRegions } from "./boolean";
import { offsetRegion } from "./offset";
import { reliefLines } from "./relief";

export type Vec3 = [number, number, number];
export type MoveType = "rapid" | "plunge" | "feed" | "retract" | "toolchange";
export type OperationKind = "outline" | "pocket" | "drill" | "relief" | "travel";

/** One straight tool move. Coordinates are in *work* space (mm, G54), Z negative = below surface. */
export interface Segment {
  from: Vec3;
  to: Vec3;
  type: MoveType;
  /** Programmed feed for G1 moves (mm/min). Ignored for rapids. */
  feed: number;
  shapeId: string | null;
  /** 1-based pass number within the shape (0 for travel moves). */
  pass: number;
  op: OperationKind;
  /** Optional comment emitted before this segment in G-code. */
  comment?: string;
  /** Tool used for this segment (undefined = project default tool). */
  toolId?: string;
  /** For toolchange segments: the tool to mount. */
  tool?: EffectiveTool;
}

export interface ToolpathWarning {
  shapeId: string;
  message: string;
}

export interface Toolpath {
  segments: Segment[];
  /** Number of shapes that produced segments. */
  shapeCount: number;
  /** Shapes skipped or degraded (e.g. pocket narrower than the tool). */
  warnings: ToolpathWarning[];
}

/** Translation from table coordinates to work coordinates (G54) according to stock + origin. */
export function workOriginOffset(settings: MachineSettings): Point {
  return originPoint(settings.stock);
}

/** Table-space point of the work origin for a stock. */
export function originPoint(stock: MachineSettings["stock"]): Point {
  switch (stock.origin) {
    case "center": return [stock.offsetX + stock.width / 2, stock.offsetY + stock.height / 2];
    case "front-right": return [stock.offsetX + stock.width, stock.offsetY];
    case "back-left": return [stock.offsetX, stock.offsetY + stock.height];
    case "back-right": return [stock.offsetX + stock.width, stock.offsetY + stock.height];
    default: return [stock.offsetX, stock.offsetY];
  }
}

type Meta = Pick<Segment, "shapeId" | "pass" | "op">;

class PathBuilder {
  readonly segments: Segment[] = [];
  private pos: Vec3;
  toolId: string | undefined = undefined;
  constructor(start: Vec3) {
    this.pos = start;
  }
  get position(): Vec3 {
    return this.pos;
  }
  move(to: Vec3, type: MoveType, feed: number, meta: Meta, comment?: string) {
    const seg: Segment = { from: this.pos, to, type, feed, ...meta };
    if (comment) seg.comment = comment;
    if (this.toolId !== undefined) seg.toolId = this.toolId;
    this.segments.push(seg);
    this.pos = to;
  }
}

/** Open polygon (first point not repeated) from a closed point list. */
function openLoop(points: Point[]): Polygon {
  const n = points.length;
  if (n > 1 && points[0][0] === points[n - 1][0] && points[0][1] === points[n - 1][1]) return points.slice(0, -1);
  return points;
}

/** Point-in-polygon (even-odd) over a set of loops. */
function insidePolys(polys: Polygon[], [px, py]: Point): boolean {
  let inside = false;
  for (const poly of polys) {
    const n = poly.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Inside test tolerant to points lying exactly on the boundary (e.g. row ends on the offset wall). */
function insideOrOn(polys: Polygon[], [px, py]: Point, eps = 1e-6): boolean {
  return (
    insidePolys(polys, [px, py]) ||
    insidePolys(polys, [px + eps, py]) || insidePolys(polys, [px - eps, py]) ||
    insidePolys(polys, [px, py + eps]) || insidePolys(polys, [px, py - eps]) ||
    insidePolys(polys, [px + eps, py + eps]) || insidePolys(polys, [px - eps, py - eps]) ||
    insidePolys(polys, [px + eps, py - eps]) || insidePolys(polys, [px - eps, py + eps])
  );
}

/** True when the straight move p→q stays inside the region (sampled every ≤ `step` mm, boundary-tolerant). */
function segmentInside(polys: Polygon[], p: Point, q: Point, step = 0.5): boolean {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const n = Math.max(2, Math.ceil(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (!insideOrOn(polys, [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], 0.06)) return false; // 0.06 ≈ arc chord tolerance
  }
  return true;
}

/**
 * Traverse a closed loop at cutting depth `z`, starting/ending at `startDist` along the perimeter,
 * honouring holding tabs (raised to `zTab`) and optional ramp entry from `zFrom`.
 */
function traverseLoop(
  b: PathBuilder,
  loop: Polygon,
  z: number,
  meta: Meta,
  settings: MachineSettings,
  opts: { tabs?: { count: number; width: number; zTab: number }; ramp?: { zFrom: number; angleDeg: number } }
) {
  const total = perimeter(loop);
  if (total === 0) return;

  // Distances of vertices along the loop
  const vertexDist: number[] = [0];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const c = loop[(i + 1) % loop.length];
    vertexDist.push(vertexDist[i] + Math.hypot(c[0] - a[0], c[1] - a[1]));
  }
  // Tab intervals [start, end] along the perimeter
  const tabs: [number, number][] = [];
  if (opts.tabs && opts.tabs.count > 0 && opts.tabs.width > 0 && opts.tabs.zTab > z) {
    const { count, width } = opts.tabs;
    for (let i = 0; i < count; i++) {
      const c = ((i + 0.5) * total) / count;
      tabs.push([Math.max(c - width / 2, 0), Math.min(c + width / 2, total)]);
    }
  }
  const zAt = (d: number): number => {
    for (const [s, e] of tabs) if (d > s + 1e-9 && d < e - 1e-9) return opts.tabs!.zTab;
    return z;
  };

  // Event distances: vertices + tab boundaries, sorted & unique
  const events = new Set<number>(vertexDist);
  for (const [s, e] of tabs) { events.add(s); events.add(e); }
  const dists = [...events].filter((d) => d > 0 && d <= total + 1e-9).sort((a, c) => a - c);

  // Ramp entry: descend along the loop from zFrom to z over rampLen, then finish the loop.
  const ramp = opts.ramp && opts.ramp.angleDeg > 0 && opts.ramp.zFrom > z ? opts.ramp : null;
  const rampLen = ramp ? (ramp.zFrom - z) / Math.tan((ramp.angleDeg * Math.PI) / 180) : 0;

  const emitTo = (d: number, zz: number, type: MoveType = "feed") => {
    const [x, y] = pointAlong(loop, d);
    b.move([x, y, zz], type, type === "plunge" ? settings.plungeRate : settings.feedRate, meta);
  };

  let prev = 0;
  /** Emit moves for every event in (a, c], handling tab lifts. */
  const walk = (a: number, c: number) => {
    prev = a;
    for (const e of dists) {
      if (e <= a + 1e-9 || e > c + 1e-9) continue;
      const zz = zAt((prev + e) / 2);
      const cur = b.position[2];
      if (Math.abs(cur - zz) > 1e-9) emitTo(prev, zz, zz > cur ? "feed" : "plunge");
      emitTo(e, zz);
      prev = e;
    }
    if (c - prev > 1e-9) {
      const zz = zAt((prev + c) / 2);
      const cur = b.position[2];
      if (Math.abs(cur - zz) > 1e-9) emitTo(prev, zz, zz > cur ? "feed" : "plunge");
      emitTo(c, zz);
      prev = c;
    }
  };

  if (ramp && rampLen > 0) {
    // Descend vertically (through air) to the ramp start level first, e.g. safe height → surface.
    if (b.position[2] > ramp.zFrom + 1e-9) {
      const [sx0, sy0] = loop[0];
      b.move([sx0, sy0, ramp.zFrom], "plunge", settings.plungeRate, meta);
    }
    let d = 0;
    let remaining = rampLen;
    let guard = 0;
    while (remaining > 1e-9 && guard++ < 10000) {
      const nextVertex = vertexDist.find((v) => v > d + 1e-9) ?? total;
      const step = Math.min(nextVertex - d, remaining);
      d += step;
      remaining -= step;
      emitTo(d, z + (remaining / rampLen) * (ramp.zFrom - z));
      if (d >= total - 1e-9) d = 0;
    }
    const start = d;
    walk(start, total);
    if (start > 1e-9) walk(0, start);
    return;
  }

  // Standard entry: plunge at the loop start
  const [sx, sy] = loop[0];
  b.move([sx, sy, zAt(1e-6)], "plunge", settings.plungeRate, meta);
  walk(0, total);
}

function outline(b: PathBuilder, shape: Shape, points: Point[], settings: MachineSettings, warnings: ToolpathWarning[]) {
  const passes = buildPassDepths(shape.depth, settings.passDepth);
  const safe = settings.safeHeight;
  const meta0: Meta = { shapeId: shape.id, pass: 0, op: "outline" };
  const side = shape.side ?? "on";
  const r = settings.toolDiameter / 2;

  let loops: Polygon[];
  const base = openLoop(points);
  const holes = shape.kind === "path" && shape.holes ? shape.holes.map(openLoop).filter((h) => h.length >= 3) : [];
  if (side === "on" || base.length < 3) {
    loops = [base, ...holes]; // open polylines (2 pts) are also traced "on"
  } else {
    loops = offsetPolygon(base, side === "outside" ? r : -r);
    if (loops.length === 0) {
      warnings.push({ shapeId: shape.id, message: `Contorno interno menor que a fresa (Ø${settings.toolDiameter} mm) — forma ignorada.` });
      return;
    }
    // holes: for a part cut "outside", the holes keep their size (tool inside the hole → -r);
    // for an opening cut "inside", the holes are islands of material (+r).
    for (const h of holes) {
      const off = offsetPolygon(h, side === "outside" ? -r : r);
      if (off.length === 0) warnings.push({ shapeId: shape.id, message: `Furo interno menor que a fresa (Ø${settings.toolDiameter} mm) — furo ignorado.` });
      loops.push(...off);
    }
  }

  const tabs = shape.tabs && shape.tabs.count > 0 && shape.tabs.height > 0
    ? { count: shape.tabs.count, width: shape.tabs.width, zTab: -(shape.depth - shape.tabs.height) }
    : undefined;

  loops.forEach((loop, li) => {
    if (loop.length < 2) return;
    const [sx, sy] = loop[0];
    b.move([sx, sy, safe], "rapid", 0, meta0,
      li === 0 ? `Outline pass, target depth ${shape.depth}mm${side !== "on" ? ` (${side}, tool Ø${settings.toolDiameter})` : ""}` : undefined);
    let zPrev = 0;
    passes.forEach((z, i) => {
      const meta: Meta = { shapeId: shape.id, pass: i + 1, op: "outline" };
      if (loop.length < 3) {
        // open polyline: plunge, trace, back
        b.move([sx, sy, -z], "plunge", settings.plungeRate, meta);
        for (const [x, y] of loop.slice(1)) b.move([x, y, -z], "feed", settings.feedRate, meta);
        b.move([sx, sy, -z], "feed", settings.feedRate, meta);
      } else {
        traverseLoop(b, loop, -z, meta, settings, {
          tabs,
          ramp: settings.rampAngle > 0 ? { zFrom: zPrev === 0 ? 0 : -zPrev, angleDeg: settings.rampAngle } : undefined,
        });
      }
      zPrev = z;
    });
    const cur = b.position;
    b.move([cur[0], cur[1], safe], "retract", 0, meta0);
  });
}

/** Diameter of the helical entry circle (centre path) for a tool of diameter `d`: hole = 1.6 × Ø. */
export function helixDiameter(toolDiameter: number): number {
  return toolDiameter * 0.6;
}

/**
 * Helical entry: descend from `zTop` to `z` circling around `center` with radius `radius` and
 * `pitch` mm per revolution (linearised G1 moves), then one full flat circle at `z` to clear the
 * bottom, ending at the point of the circle closest to `exitTo` (or the start angle).
 * Returns false when there is nothing to do.
 */
function helixDown(b: PathBuilder, center: Point, radius: number, zTop: number, z: number, pitch: number, settings: MachineSettings, meta: Meta): boolean {
  const drop = zTop - z;
  if (drop <= 1e-9 || radius <= 0) return false;
  const stepsPerRev = 24;
  const revs = Math.max(drop / Math.max(pitch, 0.05), 1e-6);
  const steps = Math.max(Math.ceil(revs * stepsPerRev), 1);
  const at = (k: number, zz: number): Vec3 => {
    const ang = (2 * Math.PI * k) / stepsPerRev;
    return [center[0] + radius * Math.cos(ang), center[1] + radius * Math.sin(ang), zz];
  };
  const start = at(0, zTop);
  const cur = b.position;
  if (Math.abs(cur[0] - start[0]) > 1e-9 || Math.abs(cur[1] - start[1]) > 1e-9) {
    b.move([start[0], start[1], settings.safeHeight], "rapid", 0, { ...meta, pass: 0 });
    b.move(start, "plunge", settings.plungeRate, meta);
  } else if (Math.abs(cur[2] - zTop) > 1e-9) {
    b.move(start, "plunge", settings.plungeRate, meta);
  }
  for (let k = 1; k <= steps; k++) {
    const zz = zTop - (drop * k) / steps;
    b.move(at(k, Math.max(zz, z)), "feed", settings.feedRate, meta);
  }
  // flat clearing circle at the bottom
  const k0 = steps;
  for (let k = 1; k <= stepsPerRev; k++) b.move(at(k0 + k, z), "feed", settings.feedRate, meta);
  return true;
}

function circleFits(center: Point, radius: number, region: Polygon[]): boolean {
  for (let k = 0; k < 16; k++) {
    const ang = (2 * Math.PI * k) / 16;
    if (!insidePolys(region, [center[0] + radius * Math.cos(ang), center[1] + radius * Math.sin(ang)])) return false;
  }
  return insidePolys(region, center);
}

/** Drilling: plunge at the circle centre (peck cycle when `peckDepth` > 0), for circles ≤ tool Ø or any circle when explicitly chosen. */
function drill(b: PathBuilder, shape: Shape, points: Point[], settings: MachineSettings, warnings: ToolpathWarning[]) {
  const safe = settings.safeHeight;
  const box = boundingBox(points);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const holeD = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  if (holeD > settings.toolDiameter + 1e-6) {
    warnings.push({ shapeId: shape.id, message: `Furação: furo Ø${Math.round(holeD * 100) / 100} mm maior que a fresa Ø${settings.toolDiameter} mm — será furado com o Ø da fresa (use contorno por dentro para o tamanho exato).` });
  }
  const meta0: Meta = { shapeId: shape.id, pass: 0, op: "drill" };
  const pecks = buildPassDepths(shape.depth, settings.peckDepth > 0 ? settings.peckDepth : shape.depth);
  b.move([cx, cy, safe], "rapid", 0, meta0, `Drill Ø${settings.toolDiameter} at (${Math.round(cx * 100) / 100}, ${Math.round(cy * 100) / 100}) depth ${shape.depth}mm${pecks.length > 1 ? `, peck ${settings.peckDepth}` : ""}`);
  pecks.forEach((z, i) => {
    const meta: Meta = { shapeId: shape.id, pass: i + 1, op: "drill" };
    if (i > 0) {
      // rapid back down to just above the previous bottom
      const zPrev = -pecks[i - 1];
      b.move([cx, cy, Math.min(zPrev + 0.5, safe)], "rapid", 0, meta0);
    }
    b.move([cx, cy, -z], "plunge", settings.plungeRate, meta);
    b.move([cx, cy, safe], "retract", 0, meta0);
  });
}

/**
 * Contour-parallel pocket: successive inward offsets of the region (outer − r − k·stepover, holes grown the same),
 * machined from the innermost ring outwards so consecutive rings connect with a short feed inside cut material.
 * Rings/frames get no per-line hops at all; the last ring is the wall pass.
 */
function pocketContour(b: PathBuilder, shape: Shape, base: Polygon, holes: Polygon[], r: number, stepover: number, settings: MachineSettings, warnings: ToolpathWarning[]) {
  const safe = settings.safeHeight;
  const rings: Polygon[][] = []; // rings[k] = all loops at offset r + k·stepover
  for (let k = 0; k < 10000; k++) {
    const regs = offsetRegion(base, holes, -(r + k * stepover));
    if (regs.length === 0) break;
    rings.push(regs.flatMap((rg) => [rg.outer, ...rg.holes]));
  }
  if (rings.length === 0) { warnings.push({ shapeId: shape.id, message: `Rebaixo menor que a fresa (Ø${settings.toolDiameter} mm) — forma ignorada.` }); return; }
  const wall = rings[0]; // region at exactly −r: cutting region for "inside" tests
  const passes = buildPassDepths(shape.depth, settings.passDepth);
  const meta0: Meta = { shapeId: shape.id, pass: 0, op: "pocket" };
  // entry: centroid-ish point of the innermost ring
  const innermost = rings[rings.length - 1][0];
  const cx = innermost.reduce((s, p) => s + p[0], 0) / innermost.length, cy = innermost.reduce((s, p) => s + p[1], 0) / innermost.length;
  const helixR = helixDiameter(settings.toolDiameter) / 2;
  const helixCenter: Point | null = settings.helixEntry && circleFits([cx, cy], helixR, wall) ? [cx, cy] : null;
  if (settings.helixEntry && !helixCenter) warnings.push({ shapeId: shape.id, message: "Rebaixo estreito demais para a hélice de entrada — usando mergulho vertical." });
  b.move([innermost[0][0], innermost[0][1], safe], "rapid", 0, meta0, `Pocket clear (contour), target depth ${shape.depth}mm (tool Ø${settings.toolDiameter}, stepover ${stepover})`);
  passes.forEach((z, i) => {
    const meta: Meta = { shapeId: shape.id, pass: i + 1, op: "pocket" };
    if (helixCenter) {
      helixDown(b, helixCenter, helixR, i === 0 ? 0 : -passes[i - 1], -z, settings.helixPitch, settings, meta);
    } else {
      const p = b.position;
      if (Math.abs(p[0] - innermost[0][0]) > 1e-9 || Math.abs(p[1] - innermost[0][1]) > 1e-9) {
        if (p[2] < safe) b.move([p[0], p[1], safe], "retract", 0, meta0);
        b.move([innermost[0][0], innermost[0][1], safe], "rapid", 0, meta0);
      }
      b.move([innermost[0][0], innermost[0][1], -z], "plunge", settings.plungeRate, meta);
    }
    // from innermost ring outwards
    for (let k = rings.length - 1; k >= 0; k--) {
      for (const loop of rings[k]) {
        const p = b.position;
        let best = 0, bestD = Infinity;
        loop.forEach(([x, y], j) => { const d = Math.hypot(x - p[0], y - p[1]); if (d < bestD) { bestD = d; best = j; } });
        const rotated = [...loop.slice(best), ...loop.slice(0, best)];
        if (bestD > 1e-9) {
          if (bestD <= stepover * 1.5 + 1e-6 || segmentInside(wall, [p[0], p[1]], rotated[0], Math.max(r / 2, 0.25))) {
            b.move([rotated[0][0], rotated[0][1], -z], "feed", settings.feedRate, meta);
          } else {
            b.move([p[0], p[1], safe], "retract", 0, meta0);
            b.move([rotated[0][0], rotated[0][1], safe], "rapid", 0, meta0);
            b.move([rotated[0][0], rotated[0][1], -z], "plunge", settings.plungeRate, meta);
          }
        }
        for (const [x, y] of rotated.slice(1)) b.move([x, y, -z], "feed", settings.feedRate, meta);
        b.move([rotated[0][0], rotated[0][1], -z], "feed", settings.feedRate, meta);
      }
    }
  });
  const cur = b.position;
  b.move([cur[0], cur[1], safe], "retract", 0, meta0);
}

/** Relief: raster lines with the tool profile compensated; roughing passes clamp Z to −k·passDepth. */
function relief(b: PathBuilder, shape: Extract<Shape, { kind: "relief" }>, settings: MachineSettings, tool: { type: "flat" | "ball" | "vbit"; radius: number; angle: number }, ox: number, oy: number) {
  const safe = settings.safeHeight;
  const lines = reliefLines(shape, settings, tool);
  const meta0: Meta = { shapeId: shape.id, pass: 0, op: "relief" };
  const passes = buildPassDepths(shape.depthMax, settings.passDepth);
  b.move([lines[0].pts[0][0] - ox, lines[0].pts[0][1] - oy, safe], "rapid", 0, meta0, `Relief ${shape.cols}×${shape.rows}px, depth ${shape.depthMax}mm, ${lines.length} lines (tool ${tool.type} Ø${tool.radius * 2})`);
  passes.forEach((zLimit, pi) => {
    const meta: Meta = { shapeId: shape.id, pass: pi + 1, op: "relief" };
    const last = pi === passes.length - 1;
    lines.forEach((ln, li) => {
      const fwd = li % 2 === 0;
      const idx = fwd ? ln.pts.map((_, i) => i) : ln.pts.map((_, i) => ln.pts.length - 1 - i);
      // clamp for roughing: never below −zLimit; skip lines that are entirely at the surface for this pass
      const zs = idx.map((i) => Math.max(ln.z[i], -zLimit));
      if (!last && zs.every((z) => z >= -1e-9)) return;
      const first = idx[0];
      const p = b.position;
      const sx = ln.pts[first][0] - ox, sy = ln.pts[first][1] - oy;
      if (li === 0 || Math.hypot(sx - p[0], sy - p[1]) > (shape.lineStep ?? settings.stepover) * 2 + 1e-6) {
        if (p[2] < safe && li > 0) b.move([p[0], p[1], safe], "retract", 0, meta0);
        b.move([sx, sy, safe], "rapid", 0, meta0);
        b.move([sx, sy, zs[0]], "plunge", settings.plungeRate, meta);
      } else {
        b.move([sx, sy, zs[0]], "feed", settings.feedRate, meta);
      }
      for (let k = 1; k < idx.length; k++) b.move([ln.pts[idx[k]][0] - ox, ln.pts[idx[k]][1] - oy, zs[k]], "feed", settings.feedRate, meta);
    });
  });
  const cur = b.position;
  b.move([cur[0], cur[1], safe], "retract", 0, meta0);
}

function pocket(b: PathBuilder, shape: Shape, points: Point[], settings: MachineSettings, warnings: ToolpathWarning[]) {
  const safe = settings.safeHeight;
  const r = settings.toolDiameter / 2;
  const base = openLoop(points);
  if (base.length < 3) return;
  const innerOnly = offsetPolygon(base, -r);
  if (innerOnly.length === 0) {
    warnings.push({ shapeId: shape.id, message: `Rebaixo menor que a fresa (Ø${settings.toolDiameter} mm) — forma ignorada.` });
    return;
  }
  // islands (holes) grow by r; the pocket region is inner − islands (even-odd over all loops)
  const holes = shape.kind === "path" && shape.holes ? shape.holes.map(openLoop).filter((h) => h.length >= 3) : [];
  const islandsRaw = holes.flatMap((h) => offsetPolygon(h, r));
  // Region to clear = (outer − r) minus (islands + r), as proper polygons-with-holes (Clipper). Even-odd over the
  // raw loops is wrong when a grown island pokes outside the shrunk outer (e.g. the counter of an "A").
  const inner: Polygon[] = islandsRaw.length
    ? booleanRegions("difference", innerOnly.map((o) => ({ outer: o, holes: [] })), islandsRaw.map((h) => ({ outer: h, holes: [] }))).flatMap((rg) => [rg.outer, ...rg.holes])
    : innerOnly;

  const stepover = Math.max(settings.stepover, 0.1);
  if ((settings.pocketStrategy ?? "zigzag") === "contour") { pocketContour(b, shape, base, holes, r, stepover, settings, warnings); return; }
  const box = boundingBox(innerOnly.flat());
  // Rows strictly inside the offset region: start half a stepover in so the wall pass cleans the rest.
  const rows = scanlines(box.minY + 1e-6, box.maxY - 1e-6, stepover);
  const passes = buildPassDepths(shape.depth, settings.passDepth);
  const meta0: Meta = { shapeId: shape.id, pass: 0, op: "pocket" };

  // Precompute row spans
  const rowSpans = rows.map((y) => ({ y, spans: scanlineSpans(inner, y) })).filter((r) => r.spans.length > 0);
  if (rowSpans.length === 0) {
    warnings.push({ shapeId: shape.id, message: "Rebaixo muito estreito para gerar linhas — só o contorno interno será cortado." });
  }

  const first = rowSpans[0]?.spans[0] ?? [inner[0][0][0], inner[0][0][0]];
  const firstY = rowSpans[0]?.y ?? inner[0][0][1];
  // Helical entry: circle of radius helixR around a centre inside the pocket (entry point or middle of the first row).
  const helixR = helixDiameter(settings.toolDiameter) / 2;
  let helixCenter: Point | null = null;
  if (settings.helixEntry) {
    const candidates: Point[] = [[first[0], firstY]];
    const span0 = rowSpans[0]?.spans[0];
    if (span0) candidates.push([(span0[0] + span0[1]) / 2, firstY]);
    const midRow = rowSpans[Math.floor(rowSpans.length / 2)];
    if (midRow) candidates.push([(midRow.spans[0][0] + midRow.spans[0][1]) / 2, midRow.y]);
    helixCenter = candidates.find((c) => circleFits(c, helixR, inner)) ?? null;
    if (!helixCenter) warnings.push({ shapeId: shape.id, message: "Rebaixo estreito demais para a hélice de entrada — usando mergulho vertical." });
  }
  b.move([first[0], firstY, safe], "rapid", 0, meta0, `Pocket clear, target depth ${shape.depth}mm (tool Ø${settings.toolDiameter}, stepover ${stepover})`);

  passes.forEach((z, i) => {
    const meta: Meta = { shapeId: shape.id, pass: i + 1, op: "pocket" };
    // move to first row start at safe height if we're not there
    const cur = b.position;
    if (cur[0] !== first[0] || cur[1] !== firstY) {
      if (cur[2] < safe) b.move([cur[0], cur[1], safe], "retract", 0, meta0);
      b.move([first[0], firstY, safe], "rapid", 0, meta0);
    }
    if (helixCenter) {
      const zTop = i === 0 ? 0 : -passes[i - 1];
      helixDown(b, helixCenter, helixR, zTop, -z, settings.helixPitch, settings, meta);
      const p = b.position;
      if (p[0] !== first[0] || p[1] !== firstY) b.move([first[0], firstY, -z], "feed", settings.feedRate, meta);
    } else {
      b.move([first[0], firstY, -z], "plunge", settings.plungeRate, meta);
    }

    // Zigzag by connected region: follow spans that overlap the previous row's span (one continuous ribbon),
    // then hop to the next unvisited span. Rings/U shapes get one hop instead of one per row.
    const visited = rowSpans.map((row) => row.spans.map(() => false));
    const overlap = (a: [number, number], c: [number, number]) => Math.min(a[1], c[1]) - Math.max(a[0], c[0]);
    let dir = 1; // +1 left→right
    const cutSpan = (ri: number, si: number) => {
      const row = rowSpans[ri];
      const span = row.spans[si];
      visited[ri][si] = true;
      const xStart = dir > 0 ? span[0] : span[1];
      const xEnd = dir > 0 ? span[1] : span[0];
      const p = b.position;
      if (Math.abs(p[0] - xStart) > 1e-9 || Math.abs(p[1] - row.y) > 1e-9) {
        const direct = segmentInside(inner, [p[0], p[1]], [xStart, row.y], Math.max(r / 2, 0.25));
        if (direct && p[2] === -z) {
          b.move([xStart, row.y, -z], "feed", settings.feedRate, meta);
        } else if (direct && p[2] !== -z) {
          b.move([xStart, row.y, -z], "feed", settings.feedRate, meta);
        } else {
          b.move([p[0], p[1], safe], "retract", 0, meta0);
          b.move([xStart, row.y, safe], "rapid", 0, meta0);
          b.move([xStart, row.y, -z], "plunge", settings.plungeRate, meta);
        }
      }
      b.move([xEnd, row.y, -z], "feed", settings.feedRate, meta);
      dir = -dir;
    };
    for (;;) {
      // next unvisited span: lowest row, then closest x to the current position
      let start: [number, number] | null = null;
      for (let ri = 0; ri < rowSpans.length && !start; ri++) {
        const cands = rowSpans[ri].spans.map((sp, si) => ({ si, sp })).filter(({ si }) => !visited[ri][si]);
        if (cands.length) {
          const px = b.position[0];
          cands.sort((a, c) => Math.abs((a.sp[0] + a.sp[1]) / 2 - px) - Math.abs((c.sp[0] + c.sp[1]) / 2 - px));
          start = [ri, cands[0].si];
        }
      }
      if (!start) break;
      let [ri, si] = start;
      // direction: start towards the far end so the first move is useful
      const sp0 = rowSpans[ri].spans[si];
      dir = Math.abs(b.position[0] - sp0[0]) <= Math.abs(b.position[0] - sp0[1]) ? 1 : -1;
      cutSpan(ri, si);
      // follow upwards through overlapping spans
      for (;;) {
        const nr = ri + 1;
        if (nr >= rowSpans.length) break;
        const cur = rowSpans[ri].spans[si];
        let bestSi = -1, bestOv = 0;
        rowSpans[nr].spans.forEach((sp, k) => { if (!visited[nr][k]) { const ov = overlap(cur, sp); if (ov > bestOv) { bestOv = ov; bestSi = k; } } });
        if (bestSi < 0) break;
        ri = nr; si = bestSi;
        cutSpan(ri, si);
      }
    }

    // Finishing pass along each inner contour
    inner.forEach((loop) => {
      const p = b.position;
      // enter the wall at the closest vertex
      let best = 0;
      let bestD = Infinity;
      loop.forEach(([x, y], k) => {
        const d = Math.hypot(x - p[0], y - p[1]);
        if (d < bestD) { bestD = d; best = k; }
      });
      const rotated = ccw([...loop.slice(best), ...loop.slice(0, best)]);
      if (bestD < 1e-9 || segmentInside(inner, [p[0], p[1]], rotated[0], Math.max(r / 2, 0.25))) {
        b.move([rotated[0][0], rotated[0][1], -z], "feed", settings.feedRate, meta);
      } else {
        b.move([p[0], p[1], safe], "retract", 0, meta0);
        b.move([rotated[0][0], rotated[0][1], safe], "rapid", 0, meta0);
        b.move([rotated[0][0], rotated[0][1], -z], "plunge", settings.plungeRate, meta);
      }
      for (const [x, y] of rotated.slice(1)) b.move([x, y, -z], "feed", settings.feedRate, meta);
      b.move([rotated[0][0], rotated[0][1], -z], "feed", settings.feedRate, meta);
    });
  });
  const cur = b.position;
  b.move([cur[0], cur[1], safe], "retract", 0, meta0);
}

/** Machining order: pockets → inner outlines → outer/on outlines; nearest-first inside each group. */
export function orderShapes(shapes: Shape[], settings: MachineSettings, from: Point = [0, 0]): Shape[] {
  if (settings.orderMode !== "auto") return shapes;
  const [ox, oy] = workOriginOffset(settings);
  const groupOf = (s: Shape) => (s.operation === "drill" ? 0 : s.operation === "pocket" ? 0 : (s.side ?? "on") === "inside" ? 1 : 2);
  const startOf = (s: Shape): Point => {
    const pts = shapeToPoints(s);
    return pts.length ? [pts[0][0] - ox, pts[0][1] - oy] : [0, 0];
  };
  const out: Shape[] = [];
  let cur = from;
  for (const g of [0, 1, 2]) {
    const pool = shapes.filter((s) => groupOf(s) === g);
    while (pool.length) {
      let bi = 0;
      let bd = Infinity;
      pool.forEach((s, i) => {
        const p = startOf(s);
        const d = Math.hypot(p[0] - cur[0], p[1] - cur[1]);
        if (d < bd) { bd = d; bi = i; }
      });
      const [next] = pool.splice(bi, 1);
      out.push(next);
      cur = startOf(next);
    }
  }
  return out;
}

/**
 * Build the complete toolpath (in work coordinates) for a project.
 * This is the single source of truth used by both the G-code exporter and the simulator.
 */
export function buildToolpath(shapes: Shape[], settings: MachineSettings): Toolpath {
  const [ox, oy] = workOriginOffset(settings);
  const safe = settings.safeHeight;
  const travel: Meta = { shapeId: null, pass: 0, op: "travel" };
  const b = new PathBuilder([0, 0, 0]);
  const warnings: ToolpathWarning[] = [];
  let shapeCount = 0;

  b.move([0, 0, safe], "retract", 0, travel);

  const visible = expandShapes(shapes.filter((s) => !s.hidden));
  const tools = toolsInUse(visible, settings);
  tools.forEach((tool, ti) => {
    const group = visible.filter((s) => toolForShape(s, settings).id === tool.id);
    if (group.length === 0) return;
    const toolSettings = settingsForTool(settings, tool);
    if (ti > 0) {
      // tool change: park at the work origin, pause
      const cur = b.position;
      b.move([cur[0], cur[1], safe], "retract", 0, travel);
      b.move([0, 0, safe], "rapid", 0, travel);
      b.toolId = tool.id;
      const seg: Segment = { from: b.position, to: b.position, type: "toolchange", feed: 0, ...travel, tool, comment: `TROCA DE FERRAMENTA: ${tool.name} (Ø${tool.diameter} mm)` };
      if (tool.id !== undefined) seg.toolId = tool.id;
      b.segments.push(seg);
    } else {
      b.toolId = tool.id;
    }
    for (const shape of orderShapes(group, toolSettings)) {
      const points = shapeToPoints(shape).map(([x, y]) => [x - ox, y - oy] as Point);
      if (points.length === 0) continue;
      const before = b.segments.length;
      const cur = b.position;
      b.move([cur[0], cur[1], safe], "retract", 0, travel);
      if (shape.kind === "relief") relief(b, shape, toolSettings, { type: tool.type, radius: tool.diameter / 2, angle: tool.vbitAngle }, ox, oy);
      else if (shape.operation === "pocket") pocket(b, shape, points, toolSettings, warnings);
      else if (shape.operation === "drill") drill(b, shape, points, toolSettings, warnings);
      else outline(b, shape, points, toolSettings, warnings);
      if (b.segments.length > before + 1) shapeCount += 1;
      else b.segments.pop();
    }
  });

  const end = b.position;
  b.move([end[0], end[1], safe], "retract", 0, travel);
  b.move([0, 0, safe], "rapid", 0, travel);

  return { segments: b.segments, shapeCount, warnings };
}

export function segmentLength(s: Segment): number {
  const dx = s.to[0] - s.from[0];
  const dy = s.to[1] - s.from[1];
  const dz = s.to[2] - s.from[2];
  return Math.hypot(dx, dy, dz);
}
