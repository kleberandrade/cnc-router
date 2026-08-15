import DxfParser from "dxf-parser";
import type { Shape } from "../types";
import { generateShapeId } from "./ids";
import type { Point } from "./geometry";

export interface DxfImportResult {
  shapes: Shape[];
  warnings: string[];
}

export interface DxfImportOptions {
  depth?: number;
  /** chord tolerance for arcs/splines, mm */
  tolerance?: number;
}

/** mm per drawing unit from $INSUNITS (0 = unitless → assume mm). */
export function insunitsToMm(code: number | undefined): { scale: number; note?: string } {
  switch (code) {
    case 1: return { scale: 25.4 }; // inches
    case 2: return { scale: 304.8 }; // feet
    case 4: return { scale: 1 }; // mm
    case 5: return { scale: 10 }; // cm
    case 6: return { scale: 1000 }; // m
    case undefined: case 0: return { scale: 1, note: "DXF sem unidade ($INSUNITS) — assumindo milímetros." };
    default: return { scale: 1, note: `DXF com unidade não suportada ($INSUNITS=${code}) — assumindo milímetros.` };
  }
}

type Vec = { x: number; y: number; z?: number; bulge?: number };
type Matrix = [number, number, number, number, number, number];
const IDENT: Matrix = [1, 0, 0, 1, 0, 0];
const mul = (m: Matrix, n: Matrix): Matrix => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m: Matrix, x: number, y: number): Point => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, tol: number, ccw = true): Point[] {
  let sweep = ccw ? a1 - a0 : a0 - a1;
  while (sweep <= 0) sweep += Math.PI * 2;
  while (sweep > Math.PI * 2 + 1e-9) sweep -= Math.PI * 2;
  const step = 2 * Math.acos(Math.max(1 - Math.min(tol / Math.max(r, 1e-6), 1), -1));
  const n = Math.max(2, Math.ceil(sweep / Math.max(step, 0.02)));
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ccw ? a0 + (sweep * i) / n : a0 - (sweep * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Expand a polyline with bulges (arc segments) into points. */
export function polylineWithBulges(verts: Vec[], closed: boolean, tol: number): Point[] {
  const out: Point[] = [];
  const n = verts.length;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const a = verts[i], b = verts[(i + 1) % n];
    out.push([a.x, a.y]);
    const bulge = a.bulge ?? 0;
    if (Math.abs(bulge) > 1e-9) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const chord = Math.hypot(dx, dy);
      if (chord < 1e-9) continue;
      const theta = 4 * Math.atan(bulge); // included angle
      const r = chord / (2 * Math.sin(Math.abs(theta) / 2));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const h = Math.sqrt(Math.max(r * r - (chord / 2) ** 2, 0));
      const nx = -dy / chord, ny = dx / chord;
      const sign = bulge > 0 ? 1 : -1;
      const cx = mx + nx * h * sign, cy = my + ny * h * sign;
      const a0 = Math.atan2(a.y - cy, a.x - cx), a1 = Math.atan2(b.y - cy, b.x - cx);
      const pts = arcPoints(cx, cy, r, a0, a1, tol, bulge > 0);
      out.push(...pts.slice(1, -1));
    }
  }
  if (!closed) out.push([verts[n - 1].x, verts[n - 1].y]);
  return out;
}

/** Sample a spline via its control points/fit points (uniform B-spline approximation of degree 3, or polyline of fit points). */
function splinePoints(e: { controlPoints?: Vec[]; fitPoints?: Vec[]; degree?: number; closed?: boolean }, tol: number): Point[] {
  if (e.fitPoints && e.fitPoints.length >= 2) return e.fitPoints.map((p) => [p.x, p.y] as Point);
  const cp = e.controlPoints ?? [];
  if (cp.length < 2) return [];
  const deg = Math.min(e.degree ?? 3, cp.length - 1);
  // de Boor with uniform clamped knots
  const n = cp.length;
  const knots: number[] = [];
  for (let i = 0; i < n + deg + 1; i++) knots.push(i < deg + 1 ? 0 : i > n - 1 ? n - deg : i - deg);
  const kmax = knots[knots.length - 1];
  const samples = Math.max(8, Math.min(400, Math.ceil(n * 8 / Math.max(tol, 0.05))));
  const out: Point[] = [];
  const evalAt = (t: number): Point => {
    let k = deg;
    while (k < n - 1 && t >= knots[k + 1]) k++;
    const d: Point[] = [];
    for (let j = 0; j <= deg; j++) d.push([cp[j + k - deg].x, cp[j + k - deg].y]);
    for (let r = 1; r <= deg; r++) {
      for (let j = deg; j >= r; j--) {
        const i = j + k - deg;
        const den = knots[i + deg - r + 1] - knots[i];
        const alpha = den === 0 ? 0 : (t - knots[i]) / den;
        d[j] = [(1 - alpha) * d[j - 1][0] + alpha * d[j][0], (1 - alpha) * d[j - 1][1] + alpha * d[j][1]];
      }
    }
    return d[deg];
  };
  for (let i = 0; i <= samples; i++) out.push(evalAt(Math.min((kmax * i) / samples, kmax - 1e-9)));
  return out;
}

/** Parse a DXF (ASCII) document into shapes: LINE, LWPOLYLINE/POLYLINE (bulges), CIRCLE, ARC, ELLIPSE, SPLINE, INSERT (blocks). */
export function parseDxf(text: string, options: DxfImportOptions = {}): DxfImportResult {
  const depth = options.depth ?? 5;
  const tol = options.tolerance ?? 0.1;
  const parser = new DxfParser();
  const dxf = parser.parseSync(text);
  if (!dxf) throw new Error("Arquivo DXF inválido");
  const { scale, note } = insunitsToMm(dxf.header?.$INSUNITS as number | undefined);
  const warnings: string[] = [];
  if (note) warnings.push(note);
  const shapes: Shape[] = [];
  let skipped = 0;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const toMm = (m: Matrix, x: number, y: number): Point => { const [px, py] = apply(m, x, y); return [round(px * scale), round(py * scale)]; };
  const pushPath = (pts: Point[], closed: boolean) => {
    if (pts.length < 2) return;
    // drop consecutive duplicates
    const clean = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6);
    if (closed && clean.length > 2 && Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) < 1e-6) clean.pop();
    if (clean.length < 2) return;
    shapes.push({ id: generateShapeId("dxf"), kind: "path", points: clean, closed, depth, operation: "outline" });
  };
  const blocks = (dxf.blocks ?? {}) as Record<string, { entities?: unknown[] }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (entities: any[], m: Matrix, depthGuard = 0) => {
    for (const e of entities) {
      switch (e.type) {
        case "LINE": {
          pushPath([toMm(m, e.vertices[0].x, e.vertices[0].y), toMm(m, e.vertices[1].x, e.vertices[1].y)], false);
          break;
        }
        case "LWPOLYLINE": case "POLYLINE": {
          const verts: Vec[] = e.vertices ?? [];
          if (verts.length < 2) break;
          const closed = !!e.shape || !!e.closed;
          const pts = polylineWithBulges(verts, closed, tol / scale).map(([x, y]) => toMm(m, x, y));
          pushPath(pts, closed);
          break;
        }
        case "CIRCLE": {
          const isUniform = Math.abs(Math.abs(m[0]) - Math.abs(m[3])) < 1e-9 && Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9;
          if (isUniform) {
            const [x, y] = toMm(m, e.center.x, e.center.y);
            shapes.push({ id: generateShapeId("dxf"), kind: "circle", x, y, radius: round(e.radius * Math.abs(m[0]) * scale), depth, operation: "outline" });
          } else {
            const pts = arcPoints(e.center.x, e.center.y, e.radius, 0, Math.PI * 2, tol / scale).slice(0, -1).map(([x, y]) => toMm(m, x, y));
            pushPath(pts, true);
          }
          break;
        }
        case "ARC": {
          const a0 = (e.startAngle ?? 0), a1 = (e.endAngle ?? 0);
          const pts = arcPoints(e.center.x, e.center.y, e.radius, a0, a1, tol / scale, true).map(([x, y]) => toMm(m, x, y));
          pushPath(pts, false);
          break;
        }
        case "ELLIPSE": {
          const mx = e.majorAxisEndPoint.x, my = e.majorAxisEndPoint.y;
          const a = Math.hypot(mx, my), b = a * (e.axisRatio ?? 1);
          const rot = Math.atan2(my, mx);
          const t0 = e.startAngle ?? 0, t1 = e.endAngle ?? Math.PI * 2;
          const full = Math.abs(t1 - t0 - Math.PI * 2) < 1e-6 || (t0 === 0 && t1 === 0);
          const n = Math.max(24, Math.ceil((2 * Math.PI * Math.max(a, b)) / Math.max(tol * 8, 0.05)));
          const pts: Point[] = [];
          for (let i = 0; i <= n; i++) {
            const t = full ? (i / n) * Math.PI * 2 : t0 + ((t1 - t0) * i) / n;
            const x = a * Math.cos(t), y = b * Math.sin(t);
            pts.push(toMm(m, e.center.x + x * Math.cos(rot) - y * Math.sin(rot), e.center.y + x * Math.sin(rot) + y * Math.cos(rot)));
          }
          if (full) pts.pop();
          pushPath(pts, full);
          break;
        }
        case "SPLINE": {
          const pts = splinePoints(e, tol / scale).map(([x, y]) => toMm(m, x, y));
          pushPath(pts, !!e.closed);
          break;
        }
        case "INSERT": {
          const block = blocks[e.name];
          if (!block?.entities || depthGuard > 8) { skipped++; break; }
          const sx = e.xScale ?? 1, sy = e.yScale ?? 1, rot = ((e.rotation ?? 0) * Math.PI) / 180;
          const cos = Math.cos(rot), sin = Math.sin(rot);
          const local: Matrix = [cos * sx, sin * sx, -sin * sy, cos * sy, e.position?.x ?? 0, e.position?.y ?? 0];
          walk(block.entities, mul(m, local), depthGuard + 1);
          break;
        }
        case "TEXT": case "MTEXT": case "DIMENSION": case "HATCH": case "POINT": case "ATTDEF": case "ATTRIB":
          skipped++;
          break;
        default:
          skipped++;
      }
    }
  };
  walk(dxf.entities ?? [], IDENT);
  if (skipped > 0) warnings.push(`${skipped} entidade(s) não suportadas (texto, cotas, hachuras…) foram ignoradas.`);
  if (shapes.length === 0) warnings.push("Nenhuma forma reconhecida no DXF.");
  return { shapes, warnings };
}
