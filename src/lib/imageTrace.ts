import type { Point } from "./geometry";
import { nestLoops } from "./text";

/** Grayscale bitmap (0 = black … 255 = white), row-major, `w`×`h`. */
export interface GrayImage { w: number; h: number; data: Uint8Array }

export interface TraceOptions {
  /** 0–255; pixels darker than this are "material" (unless invert). Default: Otsu. */
  threshold?: number;
  invert?: boolean;
  /** Box blur radius in px (0–3) before thresholding. */
  blur?: number;
  /** Douglas–Peucker tolerance in px. */
  tolerance?: number;
  /** Drop contours whose |area| (px²) is below this. */
  minArea?: number;
}

export interface TracedRegion { outer: Point[]; holes: Point[][] }

/** Otsu's threshold for a gray histogram. */
export function otsuThreshold(img: GrayImage): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < img.data.length; i++) hist[img.data[i]]++;
  const total = img.data.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  return Math.min(255, thr + 1); // pixels ≤ thr are "dark"; toMask uses `< threshold`
}

/** Box blur (radius r) on a gray image. */
export function boxBlur(img: GrayImage, r: number): GrayImage {
  if (r <= 0) return img;
  const { w, h } = img;
  const tmp = new Float32Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += img.data[y * w + xx]; n++; } }
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
    out[y * w + x] = Math.round(s / n);
  }
  return { w, h, data: out };
}

/** Threshold to a binary mask (1 = material). */
export function toMask(img: GrayImage, threshold: number, invert = false): Uint8Array {
  const m = new Uint8Array(img.w * img.h);
  for (let i = 0; i < m.length; i++) { const dark = img.data[i] < threshold; m[i] = (invert ? !dark : dark) ? 1 : 0; }
  return m;
}

/** Douglas–Peucker simplification of a closed loop. */
export function simplify(loop: Point[], tol: number): Point[] {
  if (loop.length <= 4 || tol <= 0) return loop;
  const pts = [...loop, loop[0]]; // closed: treat the wrap-around segment too
  const keep = new Uint8Array(pts.length);
  const dp = (i0: number, i1: number) => {
    const [x0, y0] = pts[i0], [x1, y1] = pts[i1];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1e-9;
    let best = -1, bestD = 0;
    for (let i = i0 + 1; i < i1; i++) {
      const [x, y] = pts[i];
      const d = Math.abs(dy * x - dx * y + x1 * y0 - y1 * x0) / len;
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best >= 0 && bestD > tol) { keep[best] = 1; dp(i0, best); dp(best, i1); }
  };
  let far = 0, farD = 0;
  for (let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > farD) { farD = d; far = i; } }
  keep[0] = 1; keep[far] = 1;
  dp(0, far); dp(far, pts.length - 1);
  return loop.filter((_, i) => keep[i]);
}

/**
 * Contours of a binary mask (pixel-boundary tracing on the grid: each mask cell is a unit square).
 * Returns closed loops in pixel coordinates (x right, y down), outer loops CCW/holes CW as found; nesting is done later.
 */
export function maskContours(mask: Uint8Array, w: number, h: number): Point[][] {
  // boundary edges between material and non-material cells, as directed segments (material on the left)
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  const key = (x: number, y: number) => y * (w + 1) + x;
  const next = new Map<number, number[]>(); // from vertex → list of to vertices
  const push = (a: number, b: number) => { const l = next.get(a); if (l) l.push(b); else next.set(a, [b]); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue;
    // material cell (x,y): edges with material on the left when walking CCW in y-down coords → use consistent orientation
    if (!at(x, y - 1)) push(key(x, y), key(x + 1, y));       // top edge, left→right
    if (!at(x + 1, y)) push(key(x + 1, y), key(x + 1, y + 1)); // right edge, top→bottom
    if (!at(x, y + 1)) push(key(x + 1, y + 1), key(x, y + 1)); // bottom edge, right→left
    if (!at(x - 1, y)) push(key(x, y + 1), key(x, y));       // left edge, bottom→top
  }
  const loops: Point[][] = [];
  const toXY = (k: number): Point => [k % (w + 1), Math.floor(k / (w + 1))];
  for (const [start, list] of next) {
    while (list.length) {
      const loop: Point[] = [toXY(start)];
      let cur = start;
      let to = list.pop()!;
      let guard = 0;
      while (to !== start && guard++ < w * h * 4) {
        loop.push(toXY(to));
        const l = next.get(to);
        if (!l || l.length === 0) break;
        // prefer turning consistently (keeps loops from merging at pinch points): pick the candidate that turns left first
        let pick = 0;
        if (l.length > 1) {
          const [cx, cy] = toXY(cur), [tx, ty] = toXY(to);
          const dx = tx - cx, dy = ty - cy;
          let bestScore = -Infinity;
          l.forEach((cand, i) => { const [nx, ny] = toXY(cand); const ex = nx - tx, ey = ny - ty; const cross = dx * ey - dy * ex; const dot = dx * ex + dy * ey; const score = cross * 2 + dot; if (score > bestScore) { bestScore = score; pick = i; } });
        }
        cur = to;
        to = l.splice(pick, 1)[0];
      }
      loops.push(loop);
    }
  }
  return loops;
}

/** Full pipeline: gray → (blur) → threshold → contours → simplify → nested regions (outer + holes), in pixels. */
export function traceImage(img: GrayImage, opts: TraceOptions = {}): { regions: TracedRegion[]; threshold: number } {
  const blurred = boxBlur(img, opts.blur ?? 0);
  const threshold = opts.threshold ?? otsuThreshold(blurred);
  const mask = toMask(blurred, threshold, opts.invert);
  const raw = maskContours(mask, img.w, img.h);
  const tol = opts.tolerance ?? 0.8;
  const minArea = opts.minArea ?? 4;
  const loops = raw.map((l) => simplify(l, tol)).filter((l) => l.length >= 3 && Math.abs(area(l)) >= minArea);
  const regions = nestLoops(loops).map((g) => ({ outer: g.outer, holes: g.holes }));
  return { regions, threshold };
}

export function area(l: Point[]): number {
  let a = 0;
  for (let i = 0; i < l.length; i++) { const [x1, y1] = l[i], [x2, y2] = l[(i + 1) % l.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}

/** Scale pixel regions to mm (width in mm, y flipped so y goes up), placed at (x0, y0). */
export function regionsToMm(regions: TracedRegion[], img: { w: number; h: number }, widthMm: number, x0 = 0, y0 = 0): TracedRegion[] {
  const k = widthMm / img.w;
  const tf = (p: Point): Point => [x0 + p[0] * k, y0 + (img.h - p[1]) * k];
  return regions.map((r) => ({ outer: r.outer.map(tf), holes: r.holes.map((h) => h.map(tf)) }));
}

/** Read an image element/canvas into a GrayImage (browser). */
export function imageToGray(source: CanvasImageSource, w: number, h: number): GrayImage {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3] / 255;
    const g = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) * a + 255 * (1 - a);
    data[i] = Math.round(g);
  }
  return { w, h, data };
}

/** Parse a binary PGM (P5, 8-bit) buffer into a GrayImage — the format the bundled image examples use (no decoder needed). */
export function parsePgm(buf: ArrayBuffer): GrayImage {
  const bytes = new Uint8Array(buf);
  const tokens: string[] = [];
  let i = 0;
  const ws = (b: number) => b === 32 || b === 10 || b === 13 || b === 9;
  while (tokens.length < 4 && i < bytes.length) {
    while (i < bytes.length && ws(bytes[i])) i++;
    if (bytes[i] === 35) { while (i < bytes.length && bytes[i] !== 10) i++; continue; } // # comment
    let t = "";
    while (i < bytes.length && !ws(bytes[i])) t += String.fromCharCode(bytes[i++]);
    tokens.push(t);
  }
  i++; // single whitespace after maxval
  if (tokens[0] !== "P5") throw new Error("PGM inválido");
  const w = Number(tokens[1]), h = Number(tokens[2]);
  return { w, h, data: bytes.slice(i, i + w * h) };
}
