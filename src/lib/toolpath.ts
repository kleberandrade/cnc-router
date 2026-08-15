import type { Shape, MachineSettings } from "../types";
import { shapeToPoints, boundingBox, scanlines, type Point } from "./geometry";
import { buildPassDepths } from "./passes";

export type Vec3 = [number, number, number];
export type MoveType = "rapid" | "plunge" | "feed" | "retract";
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
}

export interface Toolpath {
  segments: Segment[];
  /** Number of shapes that produced segments. */
  shapeCount: number;
}

/** Translation from table coordinates to work coordinates (G54) according to stock + origin. */
export function workOriginOffset(settings: MachineSettings): Point {
  const { stock } = settings;
  if (stock.origin === "center") {
    return [stock.offsetX + stock.width / 2, stock.offsetY + stock.height / 2];
  }
  return [stock.offsetX, stock.offsetY];
}

class PathBuilder {
  readonly segments: Segment[] = [];
  private pos: Vec3;
  constructor(start: Vec3) {
    this.pos = start;
  }
  get position(): Vec3 {
    return this.pos;
  }
  move(to: Vec3, type: MoveType, feed: number, meta: Pick<Segment, "shapeId" | "pass" | "op">, comment?: string) {
    const seg: Segment = { from: this.pos, to, type, feed, ...meta };
    if (comment) seg.comment = comment;
    this.segments.push(seg);
    this.pos = to;
  }
}

function outline(b: PathBuilder, shape: Shape, points: Point[], settings: MachineSettings) {
  const passes = buildPassDepths(shape.depth, settings.passDepth);
  const [sx, sy] = points[0];
  const safe = settings.safeHeight;
  const meta0 = { shapeId: shape.id, pass: 0, op: "outline" as const };

  b.move([sx, sy, safe], "rapid", 0, meta0, `Outline pass, target depth ${shape.depth}mm`);
  passes.forEach((z, i) => {
    const meta = { shapeId: shape.id, pass: i + 1, op: "outline" as const };
    b.move([sx, sy, -z], "plunge", settings.plungeRate, meta);
    for (const [x, y] of points.slice(1)) b.move([x, y, -z], "feed", settings.feedRate, meta);
    b.move([sx, sy, -z], "feed", settings.feedRate, meta);
  });
  b.move([sx, sy, safe], "retract", 0, meta0);
}

function pocket(b: PathBuilder, shape: Shape, points: Point[], settings: MachineSettings) {
  const box = boundingBox(points);
  const stepover = Math.max(settings.stepover, 0.1);
  const rows = scanlines(box.minY, box.maxY, stepover);
  const passes = buildPassDepths(shape.depth, settings.passDepth);
  const safe = settings.safeHeight;
  const meta0 = { shapeId: shape.id, pass: 0, op: "pocket" as const };

  b.move([box.minX, rows[0], safe], "rapid", 0, meta0, `Pocket clear, target depth ${shape.depth}mm`);
  passes.forEach((z, i) => {
    const meta = { shapeId: shape.id, pass: i + 1, op: "pocket" as const };
    const cur = b.position;
    b.move([cur[0], cur[1], -z], "plunge", settings.plungeRate, meta);
    rows.forEach((y, r) => {
      const ltr = r % 2 === 0;
      const xStart = ltr ? box.minX : box.maxX;
      const xEnd = ltr ? box.maxX : box.minX;
      b.move([xStart, y, -z], "feed", settings.feedRate, meta);
      b.move([xEnd, y, -z], "feed", settings.feedRate, meta);
    });
  });
  const cur = b.position;
  b.move([cur[0], cur[1], safe], "retract", 0, meta0);
}

/**
 * Build the complete toolpath (in work coordinates) for a project.
 * This is the single source of truth used by both the G-code exporter and the simulator.
 */
export function buildToolpath(shapes: Shape[], settings: MachineSettings): Toolpath {
  const [ox, oy] = workOriginOffset(settings);
  const safe = settings.safeHeight;
  const travel = { shapeId: null, pass: 0, op: "travel" as const };
  const b = new PathBuilder([0, 0, 0]);
  let shapeCount = 0;

  b.move([0, 0, safe], "retract", 0, travel);

  for (const shape of shapes) {
    const points = shapeToPoints(shape).map(([x, y]) => [x - ox, y - oy] as Point);
    if (points.length === 0) continue;
    shapeCount += 1;
    const cur = b.position;
    b.move([cur[0], cur[1], safe], "retract", 0, travel);
    if (shape.operation === "pocket") pocket(b, shape, points, settings);
    else outline(b, shape, points, settings);
  }

  const end = b.position;
  b.move([end[0], end[1], safe], "retract", 0, travel);
  b.move([0, 0, safe], "rapid", 0, travel);

  return { segments: b.segments, shapeCount };
}

export function segmentLength(s: Segment): number {
  const dx = s.to[0] - s.from[0];
  const dy = s.to[1] - s.from[1];
  const dz = s.to[2] - s.from[2];
  return Math.hypot(dx, dy, dz);
}
