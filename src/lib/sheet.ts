import type { MachineSettings, PathShape, Shape } from "../types";
import { boundingBox, shapeToPoints, type Point } from "./geometry";
import { assembleShapes, partitionShapes } from "./fem/assembly";
import { originPoint } from "./toolpath";
import { findMaterial } from "./materials";
import { formatDuration } from "./timing";
import type { Issue } from "./validate";
import { APP_VERSION } from "./version";

/**
 * Printable sheets (Sprint 29): the setup sheet that goes next to the machine and the dimensioned
 * 2D drawing of each part. Pure string generators — testable in Node, printed via an iframe with
 * their own CSS (no app theme, black on white).
 *
 * All page geometry is in **mm** (SVG viewBox units = mm), which is what makes 1:1 printing work:
 * the browser maps `width="210mm"` to real millimetres as long as the person prints at 100%.
 */

export interface SheetPage {
  title: string;
  /** Self-contained HTML for one A4 page (inline SVG where there is a drawing). */
  html: string;
  /** Bare SVG markup (drawing pages only) — the source `standaloneSvg` turns into a downloadable file. */
  svg?: string;
}

export interface DrawingOptions {
  /** "auto" picks the largest standard scale that fits (preferring 1:1); "1:1" forces real size (parts that fit only). */
  scale?: "auto" | "1:1";
  /** Stamp date (defaults to nothing — the caller passes it so this module stays deterministic). */
  date?: string;
}

/** What the derived pipeline hands over (subset of `Derived`). */
export interface SheetDerived {
  time: number;
  timePerShape: Record<string, number>;
  issues: Issue[];
  warnings: { message: string }[];
}

/** A4 portrait, mm. */
const PAGE = { w: 210, h: 297, margin: 12 };
/** Standard reduction scales tried by `fitScale` (1:1 first). */
const SCALES = [1, 1 / 2, 1 / 5, 1 / 10, 1 / 20];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mm = (v: number) => (Math.round(v * 100) / 100).toString().replace(".", ",");

/** Largest standard scale that fits `bbox` into `availW × availH` (mm). */
export function fitScale(bboxW: number, bboxH: number, availW: number, availH: number): { scale: number; label: string } {
  for (const s of SCALES) {
    if (bboxW * s <= availW && bboxH * s <= availH) {
      return { scale: s, label: s === 1 ? "1:1" : `1:${Math.round(1 / s)}` };
    }
  }
  const s = Math.min(availW / Math.max(bboxW, 1e-6), availH / Math.max(bboxH, 1e-6));
  return { scale: s, label: `1:${Math.ceil(1 / s)}` };
}

/** One dimension/callout the drawing shows. Exported for tests: the labels are the contract. */
export interface Dimension {
  kind: "width" | "height" | "hole" | "slot" | "corner" | "position";
  label: string;
}

const isCircleLoop = (pts: Point[]): { cx: number; cy: number; r: number } | null => {
  if (pts.length < 8) return null;
  const b = boundingBox(pts);
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  // um furo redondo tem caixa quadrada — sem isso, retângulo arredondado grande passa por "Ø"
  if (Math.abs(w - h) > 0.02 * Math.max(w, h) + 0.05) return null;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const rs = pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy));
  const r = rs.reduce((a, b) => a + b, 0) / rs.length;
  return rs.every((x) => Math.abs(x - r) < Math.max(0.02 * r, 0.05)) ? { cx, cy, r } : null;
};

/** Dimensions worth showing for a shape: overall sizes, grouped holes, slots, corner radius/chamfer. */
export function dimensionsFor(shape: Shape): Dimension[] {
  const out: Dimension[] = [];
  const pts = shapeToPoints(shape);
  const b = boundingBox(pts);
  if (shape.kind === "circle") {
    out.push({ kind: "width", label: `Ø${mm(shape.radius * 2)}` });
  } else if (shape.kind === "slot") {
    out.push({ kind: "slot", label: `${mm(shape.length)} × ${mm(shape.width)}` });
  } else {
    out.push({ kind: "width", label: mm(b.maxX - b.minX) });
    out.push({ kind: "height", label: mm(b.maxY - b.minY) });
  }
  if (shape.kind === "rectangle" && shape.corners && shape.corners.size > 0 && shape.corners.type !== "sharp") {
    out.push({ kind: "corner", label: `${shape.corners.type === "fillet" ? "R" : "C"}${mm(shape.corners.size)}` });
  }
  const holes = shape.kind === "path" ? (shape as PathShape).holes ?? [] : [];
  const round = new Map<string, { count: number; first: { cx: number; cy: number } }>();
  for (const h of holes) {
    const c = isCircleLoop(h);
    if (c) {
      const key = mm(c.r * 2);
      const g = round.get(key);
      if (g) g.count++;
      else round.set(key, { count: 1, first: { cx: c.cx, cy: c.cy } });
    } else {
      const hb = boundingBox(h);
      out.push({ kind: "slot", label: `${mm(hb.maxX - hb.minX)} × ${mm(hb.maxY - hb.minY)}` });
    }
  }
  for (const [dia, g] of round) {
    out.push({ kind: "hole", label: `${g.count}× Ø${dia}` });
    out.push({ kind: "position", label: `X ${mm(g.first.cx - b.minX)} · Y ${mm(g.first.cy - b.minY)}` });
  }
  return out;
}

/* ---------- shared SVG bits ---------- */

const loopD = (pts: Point[], tx: (x: number) => number, ty: (y: number) => number) =>
  pts.map((p, i) => `${i ? "L" : "M"}${tx(p[0]).toFixed(2)} ${ty(p[1]).toFixed(2)}`).join(" ") + " Z";

function shapeD(shape: Shape, tx: (x: number) => number, ty: (y: number) => number): string {
  let d = loopD(shapeToPoints(shape), tx, ty);
  if (shape.kind === "path" && shape.holes) for (const h of shape.holes) d += " " + loopD(h, tx, ty);
  return d;
}

/** Horizontal dimension line (measures along X) drawn at page position `y`. */
function dimH(x1: number, x2: number, y: number, label: string): string {
  const a = 1.6; // arrow length, mm
  return `<g class="dim">` +
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>` +
    `<path d="M${x1} ${y} l${a} ${-a / 2.5} v${a / 1.25} Z"/><path d="M${x2} ${y} l${-a} ${-a / 2.5} v${a / 1.25} Z"/>` +
    `<text x="${(x1 + x2) / 2}" y="${y - 1.2}" text-anchor="middle">${esc(label)}</text></g>`;
}

/** Vertical dimension line (measures along Y) drawn at page position `x`. */
function dimV(y1: number, y2: number, x: number, label: string): string {
  const a = 1.6;
  return `<g class="dim">` +
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>` +
    `<path d="M${x} ${y1} l${-a / 2.5} ${a} h${a / 1.25} Z"/><path d="M${x} ${y2} l${-a / 2.5} ${-a} h${a / 1.25} Z"/>` +
    `<text x="${x + 1.2}" y="${(y1 + y2) / 2}" text-anchor="start" dominant-baseline="middle">${esc(label)}</text></g>`;
}

const OP_LABEL: Record<string, string> = { outline: "contorno", pocket: "rebaixo", drill: "furação" };
const SIDE_LABEL: Record<string, string> = { outside: "por fora", inside: "por dentro", on: "na linha" };
const ORIGIN_LABEL: Record<string, string> = {
  "front-left": "frente esquerda", "front-right": "frente direita", "back-left": "fundo esquerdo",
  "back-right": "fundo direito", center: "centro",
};

const shapeName = (s: Shape, i: number) => s.name ?? `${s.kind} ${i + 1}`;
const depthLabel = (s: { depth: number; cutThrough?: boolean }) => (s.cutThrough ? `passante` : `${mm(s.depth)} mm`);

/* ---------- setup sheet ---------- */

/** The A4 page that gets pinned next to the machine: stock + origin, cutting data, parts, warnings. */
export function setupSheet(shapes: Shape[], settings: MachineSettings, derived: SheetDerived, opts: DrawingOptions = {}): SheetPage {
  const visible = shapes.filter((s) => !s.hidden);
  const { stock, workArea } = settings;
  const material = findMaterial(settings.material);

  // stock thumbnail: viewBox in table mm around the stock, drawn into a 90 × 60 mm box
  const pad = Math.max(stock.width, stock.height) * 0.06;
  const vb = { x: stock.offsetX - pad, y: stock.offsetY - pad, w: stock.width + 2 * pad, h: stock.height + 2 * pad };
  const ty = (y: number) => vb.y + vb.h - (y - vb.y); // y-up (table) → y-down (svg)
  const [ox, oy] = originPoint(stock);
  const thumb =
    `<svg class="sheet-stock" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid meet">` +
    `<rect class="stock" x="${stock.offsetX}" y="${stock.offsetY}" width="${stock.width}" height="${stock.height}"/>` +
    visible.map((s) => `<path class="part" d="${shapeD(s, (x) => x, ty)}" fill-rule="evenodd"/>`).join("") +
    `<g class="origin"><circle cx="${ox}" cy="${ty(oy)}" r="${pad * 0.45}"/>` +
    `<line x1="${ox - pad * 0.8}" y1="${ty(oy)}" x2="${ox + pad * 0.8}" y2="${ty(oy)}"/>` +
    `<line x1="${ox}" y1="${ty(oy) - pad * 0.8}" x2="${ox}" y2="${ty(oy) + pad * 0.8}"/></g>` +
    `</svg>`;

  const toolRows = [
    `<tr><td>Fresa padrão</td><td>Ø${mm(settings.toolDiameter)} mm · ${esc(settings.toolType)}${settings.toolType === "vbit" ? ` ${settings.vbitAngle}°` : ""}</td></tr>`,
    ...settings.tools.map((t) => {
      const users = visible.filter((s) => s.toolId === t.id || s.extraOps?.some((op) => op.toolId === t.id)).map((s) => shapeName(s, visible.indexOf(s)));
      return `<tr><td>${esc(t.name)} (troca M0)</td><td>Ø${mm(t.diameter)} mm · ${esc(t.type)}${users.length ? ` — ${esc(users.join(", "))}` : ""}</td></tr>`;
    }),
  ].join("");

  const partRows = visible.map((s, i) => {
    const ops = [
      `${OP_LABEL[s.operation]}${s.operation === "outline" ? ` ${SIDE_LABEL[s.side ?? "on"]}` : ""} ${depthLabel(s)}${s.tabs?.count ? ` · ${s.tabs.count} tabs` : ""}`,
      ...(s.extraOps ?? []).map((op) => `${OP_LABEL[op.operation]} ${depthLabel(op)}`),
    ].join(" + ");
    const t = derived.timePerShape[s.id];
    return `<tr><td>${esc(shapeName(s, i))}</td><td>${esc(ops)}</td><td class="num">${t ? formatDuration(t) : "—"}</td></tr>`;
  }).join("");

  const problems = [
    ...derived.issues.map((i) => i.message),
    ...derived.warnings.map((w) => w.message),
  ];

  const html =
    `<section class="sheet-page" data-sheet="setup">` +
    `<header><h1>${esc(settings.projectName || "Projeto sem nome")}</h1>` +
    `<p class="meta">Oficina CNC v${APP_VERSION}${opts.date ? ` · ${esc(opts.date)}` : ""} · ${esc(settings.post)} · mesa ${mm(workArea.width)} × ${mm(workArea.height)} mm</p></header>` +
    `<div class="sheet-cols"><div>${thumb}` +
    `<p class="origin-note">Origem (X0 Y0): <strong>${esc(ORIGIN_LABEL[stock.origin] ?? stock.origin)}</strong> da chapa</p></div>` +
    `<table class="kv"><tbody>` +
    `<tr><td>Chapa</td><td>${mm(stock.width)} × ${mm(stock.height)} × ${mm(stock.thickness)} mm — ${esc(material?.label ?? settings.material)}</td></tr>` +
    toolRows +
    `<tr><td>Avanço / mergulho</td><td>${mm(settings.feedRate)} / ${mm(settings.plungeRate)} mm/min</td></tr>` +
    `<tr><td>RPM</td><td>${mm(settings.spindleSpeed)}</td></tr>` +
    `<tr><td>Passe / stepover</td><td>${mm(settings.passDepth)} mm / ${mm(settings.stepover)} mm</td></tr>` +
    `<tr><td>Altura segura</td><td>${mm(settings.safeHeight)} mm</td></tr>` +
    `<tr><td>Tempo total</td><td><strong>${formatDuration(derived.time)}</strong></td></tr>` +
    `</tbody></table></div>` +
    `<table class="parts"><thead><tr><th>Peça</th><th>Operações</th><th>Tempo</th></tr></thead><tbody>${partRows}</tbody></table>` +
    (problems.length
      ? `<div class="sheet-warn"><h2>Confira antes de rodar</h2><ul>${problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`
      : `<p class="sheet-ok">Sem avisos de validação.</p>`) +
    `<footer>Arquivo: ${esc(settings.projectName ? settings.projectName : "projeto")}.gcode · gerado no navegador em cnc-router-ten.vercel.app</footer>` +
    `</section>`;

  return { title: "Folha de oficina", html };
}

/* ---------- technical drawing ---------- */

/** One dimensioned A4 page per visible closed shape. Open paths and reliefs get outline-only pages. */
export function technicalDrawing(shapes: Shape[], settings: MachineSettings, opts: DrawingOptions = {}): SheetPage[] {
  const visible = shapes.filter((s) => !s.hidden);
  return visible.map((shape, i) => drawingPage(shape, i, visible.length, settings, opts));
}

/**
 * Peças sintéticas do conjunto montado (Sprint 34): contornos por fora colados, recortes passantes
 * descontados — a mesma conta da estação Resistência. Vazio quando o conjunto não difere das peças
 * soltas (nada colou e nada foi descontado), para a folha não duplicar página.
 */
export function assemblyDrawingShapes(shapes: Shape[], settings: MachineSettings): PathShape[] {
  const visible = shapes.filter((s) => !s.hidden);
  const thickness = settings.stock.thickness;
  const { solids, cutouts } = partitionShapes(visible, thickness);
  if (solids.length === 0) return [];
  const groups = assembleShapes(visible, thickness);
  if (cutouts.length === 0 && groups.length === solids.length) return [];
  return groups.map((g, i) => ({
    id: `__assembly-${i}`,
    kind: "path",
    points: g.outer,
    holes: g.holes.length ? g.holes : undefined,
    closed: true,
    depth: thickness,
    operation: "outline",
    side: "outside",
    name: groups.length > 1 ? `Conjunto ${i + 1} (peças coladas)` : "Conjunto (peças coladas)",
  }));
}

function drawingPage(shape: Shape, index: number, total: number, settings: MachineSettings, opts: DrawingOptions): SheetPage {
  const pts = shapeToPoints(shape);
  const b = boundingBox(pts);
  const w = b.maxX - b.minX, h = b.maxY - b.minY;

  // drawing area: page minus margins, header strip (12 mm) and title block (24 mm) — dims need ~14 mm around
  const dimGutter = 14;
  const availW = PAGE.w - 2 * PAGE.margin - 2 * dimGutter;
  const availH = PAGE.h - 2 * PAGE.margin - 12 - 24 - 2 * dimGutter;
  const fitted = fitScale(w, h, availW, availH);
  const wanted = opts.scale === "1:1" ? { scale: 1, label: "1:1" } : fitted;
  // forcing 1:1 on a part that does not fit would clip: fall back to the fitted scale
  const { scale, label } = wanted.scale === 1 && (w > availW || h > availH) ? fitted : wanted;

  const drawW = w * scale, drawH = h * scale;
  const x0 = PAGE.margin + dimGutter + (availW - drawW) / 2;
  const y0 = PAGE.margin + 12 + dimGutter + (availH - drawH) / 2;
  const tx = (x: number) => x0 + (x - b.minX) * scale;
  const ty = (y: number) => y0 + drawH - (y - b.minY) * scale; // y-up → y-down

  const dims = dimensionsFor(shape);
  const name = shapeName(shape, index);
  const parts: string[] = [`<path class="part" d="${shapeD(shape, tx, ty)}" fill-rule="evenodd"/>`];

  // overall dimensions: width below, height on the right
  const dimList = dims.filter((d) => d.kind !== "width" && d.kind !== "height" && d.kind !== "position");
  if (shape.kind === "circle") {
    parts.push(dimH(tx(b.minX), tx(b.maxX), ty(b.minY) + 8, dims[0].label));
  } else {
    const wd = dims.find((d) => d.kind === "width"), hd = dims.find((d) => d.kind === "height");
    if (wd) parts.push(dimH(tx(b.minX), tx(b.maxX), ty(b.minY) + 8, wd.label));
    if (hd) parts.push(dimV(ty(b.maxY), ty(b.minY), tx(b.maxX) + 8, hd.label));
  }

  // hole callouts with a leader to the first hole of each group
  const holes = shape.kind === "path" ? (shape as PathShape).holes ?? [] : [];
  let calloutY = y0 + (availH - drawH) / 2 - 5; // logo acima da peça
  for (const d of dims.filter((x) => x.kind === "hole")) {
    const first = holes.map(isCircleLoop).find((c) => c && d.label.endsWith(`Ø${mm(c.r * 2)}`));
    if (first) {
      const pos = dims.find((x, j) => x.kind === "position" && dims[j - 1] === d);
      parts.push(
        `<g class="dim"><line x1="${tx(first.cx)}" y1="${ty(first.cy)}" x2="${tx(b.minX) - 4}" y2="${calloutY}"/>` +
        `<text x="${tx(b.minX) - 4}" y="${calloutY - 1}" text-anchor="start">${esc(d.label)}${pos ? ` · ${esc(pos.label)}` : ""}</text></g>`
      );
      calloutY -= 6;
    }
  }
  for (const d of dimList.filter((x) => x.kind === "corner" || x.kind === "slot")) {
    parts.push(`<text class="dim-note" x="${tx(b.minX)}" y="${calloutY}">${esc(d.label)}</text>`);
    calloutY -= 6;
  }

  const legend = `${OP_LABEL[shape.operation]}${shape.operation === "outline" ? ` ${SIDE_LABEL[shape.side ?? "on"]}` : ""} · prof. ${depthLabel(shape)}${shape.tabs?.count ? ` · ${shape.tabs.count} tabs` : ""}`;
  const svg =
    `<svg class="sheet-drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}mm" height="${PAGE.h}mm" style="width:${PAGE.w}mm;height:${PAGE.h}mm">` +
    `<text class="dwg-header" x="${PAGE.margin}" y="${PAGE.margin + 6}">${esc(name)} — ${esc(legend)}</text>` +
    parts.join("") +
    // title block
    `<g class="titleblock" transform="translate(${PAGE.w - PAGE.margin - 92}, ${PAGE.h - PAGE.margin - 22})">` +
    `<rect x="0" y="0" width="92" height="22"/>` +
    `<line x1="0" y1="11" x2="92" y2="11"/><line x1="50" y1="11" x2="50" y2="22"/>` +
    `<text x="3" y="7">${esc(settings.projectName || "Projeto sem nome")}${opts.date ? ` · ${esc(opts.date)}` : ""}</text>` +
    `<text x="3" y="18">${esc(name)} (${index + 1}/${total})</text>` +
    `<text x="53" y="18">esc. ${label} · mm</text>` +
    `</g>` +
    (label === "1:1"
      ? `<text class="dwg-note" x="${PAGE.margin}" y="${PAGE.h - PAGE.margin - 26}">Escala 1:1 — imprima em 100%, sem "ajustar à página"; dá para recortar e usar como gabarito.</text>`
      : `<text class="dwg-note" x="${PAGE.margin}" y="${PAGE.h - PAGE.margin - 26}">Cotas em mm. Path livre sai com medidas gerais e furos; confira o resto no paquímetro.</text>`) +
    `</svg>`;

  return { title: `Desenho — ${name}`, html: `<section class="sheet-page" data-sheet="drawing">${svg}</section>`, svg };
}

/** CSS shared by every sheet — inline in the print iframe, independent of the app theme. */
export const SHEET_CSS = `
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font: 10pt/1.45 system-ui, sans-serif; color: #000; background: #fff; }
.sheet-page { width: 210mm; min-height: 297mm; padding: 12mm; page-break-after: always; }
.sheet-page:last-child { page-break-after: auto; }
section[data-sheet="drawing"] { padding: 0; }
h1 { font-size: 16pt; margin-bottom: 1mm; }
h2 { font-size: 11pt; margin-bottom: 1mm; }
.meta { color: #333; margin-bottom: 5mm; }
.sheet-cols { display: flex; gap: 8mm; margin-bottom: 5mm; align-items: flex-start; }
.sheet-stock { width: 90mm; height: 60mm; border: 0.3mm solid #000; }
.sheet-stock .stock { fill: none; stroke: #000; stroke-width: 1; vector-effect: non-scaling-stroke; }
.sheet-stock .part { fill: #eee; stroke: #000; stroke-width: 1; vector-effect: non-scaling-stroke; }
.sheet-stock .origin circle { fill: none; stroke: #000; stroke-width: 1.4; vector-effect: non-scaling-stroke; }
.sheet-stock .origin line { stroke: #000; stroke-width: 1.4; vector-effect: non-scaling-stroke; }
.origin-note { margin-top: 2mm; }
table { border-collapse: collapse; width: 100%; }
.kv { flex: 1; }
.kv td, .parts td, .parts th { border: 0.2mm solid #000; padding: 1.2mm 2mm; text-align: left; vertical-align: top; }
.kv td:first-child { width: 34mm; color: #333; }
.parts { margin-bottom: 5mm; }
.parts .num { text-align: right; white-space: nowrap; }
.sheet-warn { border: 0.5mm solid #000; padding: 3mm; margin-bottom: 5mm; }
.sheet-warn ul { margin-left: 5mm; }
.sheet-ok { color: #333; margin-bottom: 5mm; }
footer { color: #333; font-size: 8pt; position: relative; }
.sheet-drawing { display: block; }
.sheet-drawing .part { fill: none; stroke: #000; stroke-width: 0.35; }
.sheet-drawing .dim line { stroke: #000; stroke-width: 0.18; }
.sheet-drawing .dim path { fill: #000; }
.sheet-drawing .dim text, .sheet-drawing .dim-note { font: 3.2px system-ui, sans-serif; fill: #000; }
.sheet-drawing .dwg-header { font: 4px system-ui, sans-serif; font-weight: 600; fill: #000; }
.sheet-drawing .dwg-note { font: 2.8px system-ui, sans-serif; fill: #333; }
.sheet-drawing .titleblock rect { fill: none; stroke: #000; stroke-width: 0.3; }
.sheet-drawing .titleblock line { stroke: #000; stroke-width: 0.18; }
.sheet-drawing .titleblock text { font: 3px system-ui, sans-serif; fill: #000; }
`;

/**
 * Standalone `.svg` file content for a drawing page (opens in Inkscape/illustrator/laser software).
 * Returns null for pages without a drawing (the setup sheet is HTML, not a single SVG).
 */
export function standaloneSvg(page: SheetPage): string | null {
  if (!page.svg) return null;
  const style = `<style>${SHEET_CSS.split("\n").filter((l) => l.startsWith(".sheet-drawing")).join("\n").replaceAll(".sheet-drawing", "svg")}</style>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` + page.svg.replace(">", `>${style}`);
}
