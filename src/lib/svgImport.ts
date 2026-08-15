import type { Shape } from "../types";
import { generateShapeId } from "./ids";


/**
 * Parse a (trusted, locally-loaded) SVG document string into app Shapes.
 * Supports <rect>, <circle>, and simple <path> data made of M/L/H/V/Z commands
 * (the common case for CAD-exported cut outlines). Curves are not supported
 * and are skipped with a console warning rather than silently corrupted.
 */
export function parseSvgToShapes(svgText: string): Shape[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Arquivo SVG inválido");
  }

  const shapes: Shape[] = [];

  doc.querySelectorAll("rect").forEach((el) => {
    const x = parseFloat(el.getAttribute("x") ?? "0");
    const y = parseFloat(el.getAttribute("y") ?? "0");
    const width = parseFloat(el.getAttribute("width") ?? "0");
    const height = parseFloat(el.getAttribute("height") ?? "0");
    if (width <= 0 || height <= 0) return;
    shapes.push({
      id: generateShapeId("rect"),
      kind: "rectangle",
      x,
      y,
      width,
      height,
      rotation: 0,
      depth: 5,
      operation: "outline",
    });
  });

  doc.querySelectorAll("circle").forEach((el) => {
    const cx = parseFloat(el.getAttribute("cx") ?? "0");
    const cy = parseFloat(el.getAttribute("cy") ?? "0");
    const r = parseFloat(el.getAttribute("r") ?? "0");
    if (r <= 0) return;
    shapes.push({
      id: generateShapeId("circle"),
      kind: "circle",
      x: cx,
      y: cy,
      radius: r,
      depth: 5,
      operation: "outline",
    });
  });

  doc.querySelectorAll("path").forEach((el) => {
    const d = el.getAttribute("d");
    if (!d) return;
    const points = parseSimplePathData(d);
    if (points.length < 2) return;
    const closed = /[Zz]\s*$/.test(d.trim());
    shapes.push({
      id: generateShapeId("path"),
      kind: "path",
      points,
      closed,
      depth: 5,
      operation: "outline",
    });
  });

  return shapes;
}

/**
 * Minimal path-data parser: handles absolute/relative M, L, H, V and Z.
 * Curve commands (C, S, Q, T, A) are ignored (their endpoint is skipped),
 * which is sufficient for the straight-line CAD outlines this app targets.
 */
export function parseSimplePathData(d: string): [number, number][] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const points: [number, number][] = [];
  let cur: [number, number] = [0, 0];
  let i = 0;
  let cmd = "";

  const readNum = (): number => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) {
      cmd = tokens[i++];
    }
    switch (cmd) {
      case "M":
      case "L": {
        const x = readNum();
        const y = readNum();
        cur = [x, y];
        points.push(cur);
        cmd = "L";
        break;
      }
      case "m":
      case "l": {
        const x = readNum();
        const y = readNum();
        cur = [cur[0] + x, cur[1] + y];
        points.push(cur);
        cmd = "l";
        break;
      }
      case "H": {
        const x = readNum();
        cur = [x, cur[1]];
        points.push(cur);
        break;
      }
      case "h": {
        const x = readNum();
        cur = [cur[0] + x, cur[1]];
        points.push(cur);
        break;
      }
      case "V": {
        const y = readNum();
        cur = [cur[0], y];
        points.push(cur);
        break;
      }
      case "v": {
        const y = readNum();
        cur = [cur[0], cur[1] + y];
        points.push(cur);
        break;
      }
      case "Z":
      case "z":
        break;
      default:
        // Unsupported command (curves etc.) — skip its numeric args conservatively.
        i++;
        break;
    }
  }

  return points;
}
