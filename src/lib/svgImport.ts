import { svgPathProperties } from "svg-path-properties";
import type { Shape } from "../types";
import { generateShapeId } from "./ids";
import { nestLoops } from "./text";

export interface SvgImportResult {
  shapes: Shape[];
  /** Human-readable (pt-BR) notes about what was converted, approximated or skipped. */
  warnings: string[];
}

export interface SvgImportOptions {
  /** Default cut depth for imported shapes (mm). */
  depth?: number;
  /** Max deviation when sampling curves (mm). */
  tolerance?: number;
  /**
   * Flip Y so the drawing looks the same as in the SVG (SVG Y grows downwards, the table Y grows away
   * from the operator). Uses the viewBox/height as the flip axis. Default true.
   */
  flipY?: boolean;
}

type Matrix = [number, number, number, number, number, number]; // a b c d e f
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Parse an SVG `transform` attribute into a matrix. */
export function parseTransform(value: string | null): Matrix {
  if (!value) return IDENTITY;
  let m = IDENTITY;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    const [, fn, argStr] = match;
    const a = argStr.split(/[\s,]+/).filter(Boolean).map(Number);
    let t: Matrix = IDENTITY;
    switch (fn) {
      case "matrix": if (a.length === 6) t = [a[0], a[1], a[2], a[3], a[4], a[5]]; break;
      case "translate": t = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0]; break;
      case "scale": t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]; break;
      case "rotate": {
        const r = ((a[0] ?? 0) * Math.PI) / 180;
        const cos = Math.cos(r), sin = Math.sin(r);
        t = [cos, sin, -sin, cos, 0, 0];
        if (a.length >= 3) t = mul(mul([1, 0, 0, 1, a[1], a[2]], t), [1, 0, 0, 1, -a[1], -a[2]]);
        break;
      }
      case "skewX": t = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0]; break;
      case "skewY": t = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0]; break;
    }
    m = mul(m, t);
  }
  return m;
}

/** mm per user unit for a CSS length ("100mm", "3in", "96px", "12"). */
export function unitToMm(length: string | null): number | null {
  if (!length) return null;
  const m = /^\s*([\d.eE+-]+)\s*([a-z%]*)\s*$/i.exec(length);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!Number.isFinite(v)) return null;
  switch (m[2].toLowerCase()) {
    case "mm": return v;
    case "cm": return v * 10;
    case "in": return v * 25.4;
    case "pt": return (v * 25.4) / 72;
    case "pc": return (v * 25.4) / 6;
    case "": case "px": return (v * 25.4) / 96;
    default: return null; // %, em… unsupported
  }
}

/**
 * Root scale (mm per user unit) and drawing height (user units) from <svg width/height/viewBox>.
 * Falls back to 1 user unit = 1 mm when nothing is declared.
 */
export function rootScale(svg: Element): { scale: number; heightUU: number; note?: string } {
  const vb = svg.getAttribute("viewBox")?.split(/[\s,]+/).filter(Boolean).map(Number);
  const hasVb = !!vb && vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
  const wMm = unitToMm(svg.getAttribute("width"));
  const hMm = unitToMm(svg.getAttribute("height"));
  if (hasVb && (wMm || hMm)) {
    const scale = wMm ? wMm / vb![2] : hMm! / vb![3];
    return { scale, heightUU: vb![3] };
  }
  if (hasVb) {
    return { scale: 1, heightUU: vb![3], note: "SVG sem largura/altura com unidade — assumindo 1 unidade = 1 mm." };
  }
  if (wMm && svg.getAttribute("width")?.match(/[a-z]/i)) {
    // width in physical units, no viewBox: user units are px
    return { scale: 25.4 / 96, heightUU: (hMm ?? 0) / (25.4 / 96), note: "SVG sem viewBox — unidades tratadas como px (96 dpi)." };
  }
  return { scale: 1, heightUU: hMm ?? 0, note: "SVG sem viewBox/unidades — assumindo 1 unidade = 1 mm." };
}

/**
 * Sample any SVG path data (including curves and arcs) into a polyline with the given tolerance (user units).
 * Sub-paths (extra M) are returned separately.
 */
export function samplePathData(d: string, tolerance: number): { points: [number, number][]; closed: boolean }[] {
  const subs = d.trim().split(/(?=[Mm])/).filter((s) => s.trim().length > 0);
  const out: { points: [number, number][]; closed: boolean }[] = [];
  let cursor: [number, number] = [0, 0];
  for (const raw of subs) {
    let sub = raw.trim();
    // relative 'm' after the first subpath is relative to the previous cursor: make it absolute
    if (sub[0] === "m" && out.length > 0) {
      const m = /^m\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)/.exec(sub);
      if (m) sub = `M${cursor[0] + parseFloat(m[1])},${cursor[1] + parseFloat(m[2])}` + sub.slice(m[0].length);
    }
    const closed = /[Zz]\s*$/.test(sub);
    let props: InstanceType<typeof svgPathProperties>;
    try {
      props = new svgPathProperties(sub);
    } catch {
      continue;
    }
    const total = props.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) continue;
    const parts = props.getParts();
    const points: [number, number][] = [];
    const push = (p: { x: number; y: number }) => {
      const last = points[points.length - 1];
      if (!last || Math.hypot(last[0] - p.x, last[1] - p.y) > 1e-9) points.push([p.x, p.y]);
    };
    for (const part of parts) {
      push(part.start);
      // straight segments (midpoint on the chord): no sampling; curves: sample so chord error ≤ tolerance
      const mid = part.getPointAtLength(part.length / 2);
      const chordMid = { x: (part.start.x + part.end.x) / 2, y: (part.start.y + part.end.y) / 2 };
      const isLine = part.length < 1e-9 || Math.hypot(mid.x - chordMid.x, mid.y - chordMid.y) < 1e-6;
      if (!isLine) {
        const n = Math.max(2, Math.ceil(part.length / Math.max(Math.sqrt(8 * tolerance * Math.max(part.length, 1)), tolerance * 4)));
        for (let i = 1; i < n; i++) push(part.getPointAtLength((part.length * i) / n));
      }
      push(part.end);
    }
    if (closed && points.length > 1) {
      const a = points[0], b = points[points.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) points.pop();
    }
    if (points.length >= 2) out.push({ points, closed });
    cursor = points[points.length - 1] ?? cursor;
  }
  return out;
}

/**
 * Parse a (trusted, locally-loaded) SVG document string into app Shapes.
 * Supports <rect>, <circle>, <ellipse>, <polygon>, <polyline>, <line> and <path> (all commands, curves sampled),
 * honours viewBox/width/height units and nested transforms, and reports what was skipped.
 */
export function parseSvg(svgText: string, options: SvgImportOptions = {}): SvgImportResult {
  const depth = options.depth ?? 5;
  const flipY = options.flipY ?? true;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("Esse SVG não parece válido");
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") throw new Error("Esse SVG não parece válido");

  const warnings: string[] = [];
  const { scale, heightUU, note } = rootScale(root);
  if (note) warnings.push(note);
  const tolUU = (options.tolerance ?? 0.1) / scale;
  const shapes: Shape[] = [];
  let skipped = 0;
  let curves = 0;

  const toMm = (m: Matrix, x: number, y: number): [number, number] => {
    const [ux, uy] = apply(m, x, y);
    const yy = flipY ? heightUU - uy : uy;
    return [round(ux * scale), round(yy * scale)];
  };
  const isAxisAligned = (m: Matrix) => Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 && m[0] > 0 && m[3] > 0;
  const isUniform = (m: Matrix) => Math.abs(Math.abs(m[0]) - Math.abs(m[3])) < 1e-9 && Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9;
  const num = (el: Element, name: string, def = 0) => {
    const v = parseFloat(el.getAttribute(name) ?? "");
    return Number.isFinite(v) ? v : def;
  };
  const pushPath = (pts: [number, number][], closed: boolean) => {
    if (pts.length < 2) return;
    shapes.push({ id: generateShapeId("path"), kind: "path", points: pts, closed, depth, operation: "outline" });
  };

  const walk = (el: Element, parent: Matrix) => {
    const tag = el.tagName.toLowerCase();
    if (["defs", "clippath", "mask", "marker", "pattern", "symbol", "metadata", "style", "title", "desc"].includes(tag)) return;
    if (el.getAttribute("display") === "none") return;
    const m = mul(parent, parseTransform(el.getAttribute("transform")));

    switch (tag) {
      case "svg": case "g": case "a": case "switch":
        for (const child of Array.from(el.children)) walk(child, m);
        return;
      case "rect": {
        const x = num(el, "x"), y = num(el, "y"), w = num(el, "width"), h = num(el, "height");
        if (w <= 0 || h <= 0) return;
        const rx = num(el, "rx"), ry = num(el, "ry", rx);
        if (isAxisAligned(m) && rx <= 0 && ry <= 0 && flipY) {
          const [x0, y0] = toMm(m, x, y + h); // bottom-left after flip
          const [x1, y1] = toMm(m, x + w, y);
          shapes.push({ id: generateShapeId("rect"), kind: "rectangle", x: x0, y: y0, width: round(x1 - x0), height: round(y1 - y0), rotation: 0, depth, operation: "outline" });
        } else if (rx > 0 || ry > 0) {
          const d = `M${x + rx},${y} H${x + w - rx} A${rx},${ry} 0 0 1 ${x + w},${y + ry} V${y + h - ry} A${rx},${ry} 0 0 1 ${x + w - rx},${y + h} H${x + rx} A${rx},${ry} 0 0 1 ${x},${y + h - ry} V${y + ry} A${rx},${ry} 0 0 1 ${x + rx},${y} Z`;
          curves++;
          for (const sp of samplePathData(d, tolUU)) pushPath(sp.points.map(([px, py]) => toMm(m, px, py)), sp.closed);
        } else {
          const corners: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
          pushPath(corners.map(([px, py]) => toMm(m, px, py)), true);
        }
        return;
      }
      case "circle": case "ellipse": {
        const cx = num(el, "cx"), cy = num(el, "cy");
        const rx = tag === "circle" ? num(el, "r") : num(el, "rx");
        const ry = tag === "circle" ? rx : num(el, "ry");
        if (rx <= 0 || ry <= 0) return;
        if (tag === "circle" && isUniform(m)) {
          const [x, y] = toMm(m, cx, cy);
          shapes.push({ id: generateShapeId("circle"), kind: "circle", x, y, radius: round(rx * Math.abs(m[0]) * scale), depth, operation: "outline" });
        } else {
          const n = Math.max(24, Math.ceil((2 * Math.PI * Math.max(rx, ry)) / Math.max(tolUU * 8, 0.01)));
          const pts: [number, number][] = [];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            pts.push(toMm(m, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
          }
          curves++;
          pushPath(pts, true);
        }
        return;
      }
      case "line": {
        pushPath([toMm(m, num(el, "x1"), num(el, "y1")), toMm(m, num(el, "x2"), num(el, "y2"))], false);
        return;
      }
      case "polyline": case "polygon": {
        const nums = (el.getAttribute("points") ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
        const pts: [number, number][] = [];
        for (let i = 0; i + 1 < nums.length; i += 2) pts.push(toMm(m, nums[i], nums[i + 1]));
        pushPath(pts, tag === "polygon");
        return;
      }
      case "path": {
        const d = el.getAttribute("d");
        if (!d) return;
        if (/[CcSsQqTtAa]/.test(d)) curves++;
        const subs = samplePathData(d, tolUU).map((sp) => ({ pts: sp.points.map(([px, py]) => toMm(m, px, py)), closed: sp.closed }));
        const closedSubs = subs.filter((sp) => sp.closed && sp.pts.length >= 3);
        if (closedSubs.length > 1) {
          // several closed sub-paths in one element: inner ones become holes (islands) of the outer that contains them
          for (const poly of nestLoops(closedSubs.map((sp) => sp.pts))) {
            shapes.push({ id: generateShapeId("path"), kind: "path", points: poly.outer, holes: poly.holes.length ? poly.holes : undefined, closed: true, depth, operation: "outline" });
          }
          for (const sp of subs.filter((x) => !x.closed)) pushPath(sp.pts, false);
        } else {
          for (const sp of subs) pushPath(sp.pts, sp.closed);
        }
        return;
      }
      case "text": case "image": case "use":
        skipped++;
        return;
      default:
        for (const child of Array.from(el.children)) walk(child, m);
    }
  };

  walk(root, IDENTITY);

  if (curves > 0) warnings.push(`${curves} elemento(s) com curvas foram aproximados por segmentos (tolerância ${options.tolerance ?? 0.1} mm).`);
  if (skipped > 0) warnings.push(`${skipped} elemento(s) não suportados (texto, imagem, use) foram ignorados — converta texto em curvas antes de exportar.`);
  if (shapes.length === 0) warnings.push("Não achei peças nesse SVG.");
  return { shapes, warnings };
}

/** Backwards-compatible helper: shapes only. */
export function parseSvgToShapes(svgText: string): Shape[] {
  return parseSvg(svgText).shapes;
}

/**
 * Minimal path-data parser kept for compatibility: handles absolute/relative M, L, H, V and Z (no curves).
 * Prefer `samplePathData`.
 */
export function parseSimplePathData(d: string): [number, number][] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const points: [number, number][] = [];
  let cur: [number, number] = [0, 0];
  let i = 0;
  let cmd = "";
  const readNum = (): number => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case "M": case "L": { const x = readNum(); const y = readNum(); cur = [x, y]; points.push(cur); cmd = "L"; break; }
      case "m": case "l": { const x = readNum(); const y = readNum(); cur = [cur[0] + x, cur[1] + y]; points.push(cur); cmd = "l"; break; }
      case "H": { const x = readNum(); cur = [x, cur[1]]; points.push(cur); break; }
      case "h": { const x = readNum(); cur = [cur[0] + x, cur[1]]; points.push(cur); break; }
      case "V": { const y = readNum(); cur = [cur[0], y]; points.push(cur); break; }
      case "v": { const y = readNum(); cur = [cur[0], cur[1] + y]; points.push(cur); break; }
      case "Z": case "z": break;
      default: i++; break;
    }
  }
  return points;
}

const round = (n: number) => Math.round(n * 1000) / 1000;
