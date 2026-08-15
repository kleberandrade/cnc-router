import opentype from "opentype.js";
import type { TextShape } from "../types";
import type { Point } from "./geometry";
import { rotatePoint } from "./geometry";

export interface FontDef { id: string; label: string; url: string }

/** Embedded fonts (OFL). Loaded lazily; user fonts can be registered at runtime. */
export const FONTS: FontDef[] = [
  { id: "inter", label: "Inter", url: "/fonts/Inter-Regular.ttf" },
  { id: "inter-bold", label: "Inter Bold", url: "/fonts/Inter-Bold.ttf" },
];

const cache = new Map<string, opentype.Font>();
const listeners = new Set<() => void>();
let loadingStarted = false;

export function registerFont(id: string, data: ArrayBuffer, label?: string): opentype.Font {
  const font = opentype.parse(data);
  cache.set(id, font);
  if (label && !FONTS.some((f) => f.id === id)) FONTS.push({ id, label, url: "" });
  listeners.forEach((fn) => fn());
  return font;
}

export function getFont(id: string): opentype.Font | undefined {
  return cache.get(id) ?? (id !== "inter" ? cache.get("inter") : undefined);
}

export function isFontLoaded(id: string): boolean {
  return cache.has(id);
}

/** Subscribe to font-loaded events (for React re-render). */
export function onFontsChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Fetch and register the embedded fonts once (browser). */
export async function loadEmbeddedFonts(fetchFn: typeof fetch = fetch): Promise<void> {
  if (loadingStarted) return;
  loadingStarted = true;
  await Promise.all(
    FONTS.filter((f) => f.url && !cache.has(f.id)).map(async (f) => {
      try {
        const res = await fetchFn(f.url);
        if (!res.ok) return;
        registerFont(f.id, await res.arrayBuffer());
      } catch {
        /* offline / missing font: text shapes stay empty until fonts load */
      }
    })
  );
}

/** Reset (tests). */
export function _resetFonts() {
  cache.clear();
  loadingStarted = false;
}

export interface GlyphPolys {
  outer: Point[];
  holes: Point[][];
}

function signedArea(poly: Point[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function pointInPoly(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Sample an opentype path (font units) into closed loops (mm), flattening curves to `tol` mm. */
export function pathToLoops(path: opentype.Path, scale: number, tol: number): Point[][] {
  const loops: Point[][] = [];
  let cur: Point[] = [];
  let last: Point = [0, 0];
  const push = (p: Point) => { if (!cur.length || Math.hypot(p[0] - cur[cur.length - 1][0], p[1] - cur[cur.length - 1][1]) > 1e-6) cur.push(p); };
  const flush = () => { if (cur.length >= 3) loops.push(cur); cur = []; };
  for (const c of path.commands) {
    switch (c.type) {
      case "M": flush(); last = [c.x * scale, c.y * scale]; push(last); break;
      case "L": last = [c.x * scale, c.y * scale]; push(last); break;
      case "Q": {
        const p0 = last, p1: Point = [c.x1 * scale, c.y1 * scale], p2: Point = [c.x * scale, c.y * scale];
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const n = Math.max(2, Math.ceil(Math.sqrt(len / Math.max(tol, 0.01)) * 1.5));
        for (let i = 1; i <= n; i++) {
          const t = i / n, mt = 1 - t;
          push([mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0], mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]]);
        }
        last = p2;
        break;
      }
      case "C": {
        const p0 = last, p1: Point = [c.x1 * scale, c.y1 * scale], p2: Point = [c.x2 * scale, c.y2 * scale], p3: Point = [c.x * scale, c.y * scale];
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
        const n = Math.max(2, Math.ceil(Math.sqrt(len / Math.max(tol, 0.01)) * 1.5));
        for (let i = 1; i <= n; i++) {
          const t = i / n, mt = 1 - t;
          push([
            mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0],
            mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1],
          ]);
        }
        last = p3;
        break;
      }
      case "Z": flush(); break;
    }
  }
  flush();
  return loops;
}

/** Group loops into outer + holes by containment (even-odd nesting). */
export function nestLoops(loops: Point[][]): GlyphPolys[] {
  const items = loops.map((l) => ({ l, area: Math.abs(signedArea(l)) })).sort((a, b) => b.area - a.area);
  const depthOf = (l: Point[]) => items.filter((o) => o.l !== l && o.area > 0 && pointInPoly(l[0], o.l)).length;
  const outers: GlyphPolys[] = [];
  const holes: Point[][] = [];
  for (const it of items) {
    if (depthOf(it.l) % 2 === 0) outers.push({ outer: it.l, holes: [] });
    else holes.push(it.l);
  }
  for (const h of holes) {
    // attach to the smallest outer containing it
    const owner = outers.filter((o) => pointInPoly(h[0], o.outer)).sort((a, b) => Math.abs(signedArea(a.outer)) - Math.abs(signedArea(b.outer)))[0];
    if (owner) owner.holes.push(h);
  }
  return outers;
}

/**
 * Glyph polygons (mm, table coordinates) for a text shape. Empty when the font is not loaded yet.
 * `size` is the em size in mm.
 */
export function textToPolygons(shape: TextShape, tol = 0.1): GlyphPolys[] {
  const font = getFont(shape.fontId);
  if (!font || !shape.text) return [];
  const scale = shape.size / font.unitsPerEm;
  let glyphs: opentype.Glyph[];
  try {
    glyphs = font.stringToGlyphs(shape.text);
  } catch {
    // some GSUB lookups are unsupported by opentype.js: fall back to per-character glyphs (no ligatures)
    glyphs = Array.from(shape.text).map((ch) => font.charToGlyph(ch));
  }
  // advance with kerning + tracking
  let x = 0;
  const placed: { glyph: opentype.Glyph; x: number }[] = [];
  for (let i = 0; i < glyphs.length; i++) {
    placed.push({ glyph: glyphs[i], x });
    x += (glyphs[i].advanceWidth ?? 0) * scale + shape.letterSpacing;
    if (i + 1 < glyphs.length) {
      try { x += font.getKerningValue(glyphs[i], glyphs[i + 1]) * scale; } catch { /* unsupported GPOS lookup: skip kerning */ }
    }
  }
  const totalW = x - shape.letterSpacing;
  const offset = shape.align === "center" ? -totalW / 2 : shape.align === "right" ? -totalW : 0;
  const out: GlyphPolys[] = [];
  for (const { glyph, x: gx } of placed) {
    const p = glyph.getPath(0, 0, font.unitsPerEm); // font units, y-up (opentype path is y-down when using fontSize; with fontSize=unitsPerEm and y=0 the path is in font units, y down)
    // opentype's getPath returns y-down coordinates; flip Y back to y-up
    const loops = pathToLoops(p, scale, tol).map((l) => l.map(([px, py]) => [px + gx + offset, -py] as Point));
    for (const poly of nestLoops(loops)) {
      const place = (l: Point[]) => l.map((pt) => rotatePoint([pt[0] + shape.x, pt[1] + shape.y], [shape.x, shape.y], shape.rotation || 0));
      out.push({ outer: place(poly.outer), holes: poly.holes.map(place) });
    }
  }
  return out;
}
