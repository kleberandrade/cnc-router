import type { Shape, MachineSettings } from "../types";
import { shapeToPoints, boundingBox, scanlines, type Point } from "./geometry";
import { buildPassDepths } from "./passes";
import { offsetPolygon, scanlineSpans, perimeter, pointAlong, ccw, type Polygon } from "./offset";
import { toolsInUse, toolForShape, settingsForTool, type EffectiveTool } from "./tools";
import { expandShapes } from "./expand";

export type Vec3 = [number, number, number];
export type MoveType = "rapid" | "plunge" | "feed" | "retract" | "toolchange";
export type OperationKind = "outline" | "pocket" | "travel";

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
  const { stock } = settings;
  if (stock.origin === "center") {
    return [stock.offsetX + stock.width / 2, stock.offsetY + stock.height / 2];
  }
  return [stock.offsetX, stock.offsetY];
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
  const islands = holes.flatMap((h) => offsetPolygon(h, r));
  const inner = [...innerOnly, ...islands];
  const stepover = Math.max(settings.stepover, 0.1);
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
  b.move([first[0], firstY, safe], "rapid", 0, meta0, `Pocket clear, target depth ${shape.depth}mm (tool Ø${settings.toolDiameter}, stepover ${stepover})`);

  passes.forEach((z, i) => {
    const meta: Meta = { shapeId: shape.id, pass: i + 1, op: "pocket" };
    // move to first row start at safe height if we're not there
    const cur = b.position;
    if (cur[0] !== first[0] || cur[1] !== firstY) {
      if (cur[2] < safe) b.move([cur[0], cur[1], safe], "retract", 0, meta0);
      b.move([first[0], firstY, safe], "rapid", 0, meta0);
    }
    b.move([first[0], firstY, -z], "plunge", settings.plungeRate, meta);

    rowSpans.forEach((row, ri) => {
      const ltr = ri % 2 === 0;
      const spans = ltr ? row.spans : [...row.spans].reverse();
      spans.forEach((span) => {
        const xStart = ltr ? span[0] : span[1];
        const xEnd = ltr ? span[1] : span[0];
        const p = b.position;
        // connect: feed if the straight move stays inside, else hop at safe height
        const mid: Point = [(p[0] + xStart) / 2, (p[1] + row.y) / 2];
        const direct = insidePolys(inner, mid) && insidePolys(inner, [xStart, row.y]);
        if (p[0] !== xStart || p[1] !== row.y) {
          if (direct || p[2] === -z && Math.hypot(xStart - p[0], row.y - p[1]) < 1e-9) {
            b.move([xStart, row.y, -z], "feed", settings.feedRate, meta);
          } else {
            b.move([p[0], p[1], safe], "retract", 0, meta0);
            b.move([xStart, row.y, safe], "rapid", 0, meta0);
            b.move([xStart, row.y, -z], "plunge", settings.plungeRate, meta);
          }
        }
        b.move([xEnd, row.y, -z], "feed", settings.feedRate, meta);
      });
    });

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
      const mid: Point = [(p[0] + rotated[0][0]) / 2, (p[1] + rotated[0][1]) / 2];
      if (insidePolys(inner, mid) || bestD < 1e-9) {
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
  const groupOf = (s: Shape) => (s.operation === "pocket" ? 0 : (s.side ?? "on") === "inside" ? 1 : 2);
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
      if (shape.operation === "pocket") pocket(b, shape, points, toolSettings, warnings);
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
