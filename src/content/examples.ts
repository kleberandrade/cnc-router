import type { Shape, MachineSettings, PathShape, ReliefShape } from "../types";
import { DEFAULT_MACHINE_SETTINGS } from "../types";
import { parseSvg } from "../lib/svgImport";
import { booleanShapes } from "../lib/boolean";
import { parsePgm, traceImage, regionsToMm } from "../lib/imageTrace";
import { encodeGrid } from "../lib/relief";
import { nestShapes, applyPlacements } from "../lib/nesting";

export type ExampleCategory = "basico" | "cozinha" | "decoracao" | "casa" | "encaixe" | "importado";
export const CATEGORY_LABEL: Record<ExampleCategory, string> = { basico: "Básicos", cozinha: "Cozinha", decoracao: "Decoração", casa: "Casa e oficina", encaixe: "Encaixes", importado: "Importados (SVG e imagem)" };
/** What an example teaches — used by the gallery filter chips. */
export type ExampleTag = "recorte" | "rebaixo" | "furacao" | "texto" | "encaixe" | "booleanas" | "nesting" | "relevo" | "importacao";
export const TAG_LABEL: Record<ExampleTag, string> = { recorte: "Recorte", rebaixo: "Rebaixo", furacao: "Furação", texto: "Texto", encaixe: "Encaixe", booleanas: "Booleanas", nesting: "Nesting", relevo: "Relevo", importacao: "Importação" };

export interface Project { shapes: Shape[]; settings: MachineSettings }
export interface Example {
  id: string;
  title: string;
  description: string;
  /** What the person learns by opening it. */
  teaches: string;
  category: ExampleCategory;
  /** 1 = iniciante, 3 = avançado */
  difficulty: 1 | 2 | 3;
  /** Concepts covered (≥ 1); the gallery filters by these. */
  tags: ExampleTag[];
  build: () => Project | Promise<Project>;
}

const base = (over: Partial<MachineSettings> = {}): MachineSettings => ({
  ...DEFAULT_MACHINE_SETTINGS,
  material: "mdf",
  toolDiameter: 3,
  feedRate: 900, plungeRate: 300, spindleSpeed: 12000, passDepth: 3, stepover: 1.8,
  stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 300, height: 200, thickness: 12 },
  ...over,
});
/** Slot width that fits a sheet of `thickness` with a bit of play (mm). 0.2 mm is a snug fit in MDF/plywood. */
export const slotFor = (thickness: number, clearance = 0.2) => Math.round((thickness + clearance) * 100) / 100;
/**
 * Finger-joint edge profile along +X from (0,0) to (len,0): `count` fingers (odd = starts with a finger, even gaps between).
 * Fingers stick out `thickness` in −Y (they enter the mating board); `clearance` is removed from each finger side so the joint slides in.
 * `startWithFinger` = false gives the complementary edge (starts with a gap). Points are returned open (no closing edge).
 */
export function fingerJointEdge(len: number, thickness: number, count: number, clearance = 0.15, startWithFinger = true): [number, number][] {
  const w = len / count, pts: [number, number][] = [];
  const r = (v: number) => Math.round(v * 1000) / 1000;
  for (let i = 0; i < count; i++) {
    const finger = (i % 2 === 0) === startWithFinger;
    const x0 = i * w, x1 = (i + 1) * w;
    if (finger) pts.push([r(x0 + clearance), 0], [r(x0 + clearance), -thickness], [r(x1 - clearance), -thickness], [r(x1 - clearance), 0]);
    else pts.push([r(x0), 0], [r(x1), 0]);
  }
  return pts;
}
/** Nest shapes on the given sheet (used so multi-part examples open already arranged). */
function nested(shapes: Shape[], settings: MachineSettings, spacing = 6): Shape[] {
  const { stock } = settings;
  const res = nestShapes(shapes, { width: stock.width, height: stock.height, spacing, allowRotate: false });
  return applyPlacements(shapes, res.placed, [stock.offsetX, stock.offsetY]);
}
const thru = (t: number) => Math.round((t + 0.2) * 100) / 100;
const poly = (id: string, points: [number, number][], extra: Partial<PathShape> = {}): PathShape => ({ id, kind: "path", points, closed: true, depth: 3, operation: "pocket", ...extra });
async function fromSvg(url: string, settings: MachineSettings, decorate: (shapes: Shape[]) => Shape[]): Promise<Project> {
  const res = await fetch(url);
  const text = await res.text();
  const { shapes } = parseSvg(text, {});
  return { shapes: decorate(shapes), settings };
}

/** Load a bundled grayscale image (binary PGM) — works in the browser and in Node tests. */
async function loadPgm(url: string) {
  const res = await fetch(url);
  return parsePgm(await res.arrayBuffer());
}
/** Silhouette traced from a bundled image (same pipeline as “Importar imagem”). */
async function fromImage(url: string, widthMm: number, settings: MachineSettings, decorate: (shapes: PathShape[]) => Shape[]): Promise<Project> {
  const gray = await loadPgm(url);
  const { regions } = traceImage(gray, { blur: 1, tolerance: 0.6, minArea: 6 });
  const mm = regionsToMm(regions, gray, widthMm, 20, 20);
  const shapes = mm.map((r, i): PathShape => ({ id: `ex-img-${i}`, kind: "path", points: r.outer, holes: r.holes.length ? r.holes : undefined, closed: true, depth: 3, operation: "pocket" }));
  return { shapes: decorate(shapes), settings };
}
/** 2.5D relief from a bundled grayscale image. */
async function fromRelief(url: string, id: string, widthMm: number, depthMax: number, settings: MachineSettings, extra: Partial<ReliefShape> = {}): Promise<Project> {
  const gray = await loadPgm(url);
  const shape: ReliefShape = { id, kind: "relief", x: 20, y: 20, width: widthMm, height: Math.round((widthMm * gray.h) / gray.w * 100) / 100, cols: gray.w, rows: gray.h, data: encodeGrid(gray.data), depthMax, depth: depthMax, operation: "pocket", name: "Relevo", ...extra };
  return { shapes: [shape], settings };
}

export const EXAMPLES: Example[] = [
  {
    id: "placa-furos", category: "basico", difficulty: 1, tags: ["recorte", "furacao", "rebaixo"],
    title: "Placa com 4 furos",
    description: "Placa 120 × 80 recortada por fora, furos Ø3 nos cantos por furação e um rebaixo central.",
    teaches: "Recorte por fora, furação com bicadas, rebaixo e ordem automática (rebaixo → furos → recorte).",
    build: () => ({
      settings: base({ peckDepth: 4 }),
      shapes: [
        { id: "ex-pocket", kind: "rectangle", x: 50, y: 40, width: 60, height: 30, rotation: 0, depth: 4, operation: "pocket", name: "Rebaixo central", corners: { type: "fillet", size: 4 } },
        ...([[28, 28], [132, 28], [28, 92], [132, 92]] as [number, number][]).map(([x, y], i) => ({ id: `ex-hole-${i}`, kind: "circle" as const, x, y, radius: 1.5, depth: 12.2, operation: "drill" as const, cutThrough: true, name: `Furo ${i + 1}` })),
        { id: "ex-part", kind: "rectangle", x: 20, y: 20, width: 120, height: 80, rotation: 0, depth: 12.2, operation: "outline", side: "outside", cutThrough: true, name: "Placa", corners: { type: "fillet", size: 6 }, tabs: { count: 4, width: 8, height: 3 } },
      ],
    }),
  },
  {
    id: "tabua-carnes", category: "cozinha", difficulty: 2, tags: ["recorte", "rebaixo", "texto"],
    title: "Tábua de carnes",
    description: "Tábua 380 × 240 × 30 em pinus: cantos arredondados, alça com rasgo, canaleta para o suco e nome gravado.",
    teaches: "Chapa grossa (30 mm), rasgo por dentro para a alça, rebaixo em moldura (retângulo com furo por subtração), texto gravado com uma segunda fresa (troca de ferramenta), tabs.",
    build: () => {
      const outerR: Shape = { id: "ex-c-out", kind: "rectangle", x: 30, y: 30, width: 300, height: 190, rotation: 0, depth: 4, operation: "pocket", corners: { type: "fillet", size: 14 } };
      const innerR: Shape = { id: "ex-c-in", kind: "rectangle", x: 38, y: 38, width: 284, height: 174, rotation: 0, depth: 4, operation: "pocket", corners: { type: "fillet", size: 8 } };
      const groove = booleanShapes("difference", [outerR, innerR], () => "ex-canaleta")[0];
      groove.name = "Canaleta do suco";
      return {
        settings: base({ material: "pine", toolDiameter: 6, stepover: 3.6, passDepth: 4, feedRate: 1800, plungeRate: 600, spindleSpeed: 16000, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 420, height: 280, thickness: 30 }, workArea: { width: 600, height: 400, zTravel: 80 }, tools: [{ id: "ex-v", name: "V 60° gravação", type: "vbit", diameter: 3, vbitAngle: 60 }] }),
        shapes: [
          groove,
          { id: "ex-c-nome", kind: "text", x: 180, y: 118, text: "CHURRASCO", fontId: "inter-bold", size: 22, rotation: 0, align: "center", letterSpacing: 3, depth: 2, operation: "pocket", name: "Nome gravado", toolId: "ex-v" },
          { id: "ex-c-alca", kind: "slot", x: 342, y: 125, length: 60, width: 22, rotation: 90, depth: thru(30), operation: "outline", side: "inside", cutThrough: true, name: "Alça (rasgo)" },
          { id: "ex-c-tabua", kind: "rectangle", x: 20, y: 20, width: 380, height: 210, rotation: 0, depth: thru(30), operation: "outline", side: "outside", cutThrough: true, name: "Tábua", corners: { type: "fillet", size: 20 }, tabs: { count: 6, width: 10, height: 4 } },
        ],
      };
    },
  },
  {
    id: "numero-casa", category: "casa", difficulty: 2, tags: ["texto", "rebaixo", "furacao", "recorte", "booleanas"],
    title: "Placa de número da casa",
    description: "Placa 200 × 120 com cantos arredondados, moldura rebaixada, número grande gravado com fresa V, nome da rua em texto menor e dois furos para parafuso.",
    teaches: "Níveis (moldura 1,5 mm, número 3 mm com fresa V), texto com fresa dedicada, cantos arredondados, furação e recorte com tabs.",
    build: () => {
      const x0 = 50, y0 = 40, w = 200, h = 120, cx = x0 + w / 2;
      const outerRect: Shape = { id: "ex-nc-o", kind: "rectangle", x: x0 + 6, y: y0 + 6, width: w - 12, height: h - 12, rotation: 0, corners: { type: "fillet", size: 8 }, depth: 1.5, operation: "pocket" };
      const innerRect: Shape = { id: "ex-nc-i", kind: "rectangle", x: x0 + 12, y: y0 + 12, width: w - 24, height: h - 24, rotation: 0, corners: { type: "fillet", size: 5 }, depth: 1.5, operation: "pocket" };
      const frame = booleanShapes("difference", [outerRect, innerRect], () => "ex-nc-moldura")[0]; frame.name = "Moldura (1,5 mm)";
      return {
        settings: base({ material: "plywood", tools: [{ id: "ex-v", name: "V 60° gravação", type: "vbit", diameter: 1.5, vbitAngle: 60 }] }),
        shapes: [
          frame,
          { id: "ex-nc-num", kind: "text", x: cx, y: y0 + 52, text: "128", fontId: "inter-bold", size: 56, rotation: 0, align: "center", letterSpacing: 4, depth: 3, operation: "pocket", name: "Número (fresa V)", toolId: "ex-v" },
          { id: "ex-nc-rua", kind: "text", x: cx, y: y0 + 22, text: "RUA DAS OFICINAS", fontId: "inter-bold", size: 13, rotation: 0, align: "center", letterSpacing: 2, depth: 1.5, operation: "pocket", name: "Rua (fresa V)", toolId: "ex-v" },
          { id: "ex-nc-h1", kind: "circle", x: x0 + 14, y: y0 + h - 14, radius: 1.5, depth: thru(12), operation: "drill", cutThrough: true, name: "Furo de parafuso" },
          { id: "ex-nc-h2", kind: "circle", x: x0 + w - 14, y: y0 + h - 14, radius: 1.5, depth: thru(12), operation: "drill", cutThrough: true, name: "Furo de parafuso" },
          { id: "ex-nc-placa", kind: "rectangle", x: x0, y: y0, width: w, height: h, rotation: 0, corners: { type: "fillet", size: 12 }, depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Placa", tabs: { count: 4, width: 8, height: 3 } },
        ],
      };
    },
  },
  {
    id: "relogio-parede", category: "casa", difficulty: 3, tags: ["rebaixo", "recorte", "texto", "booleanas"],
    title: "Relógio de parede",
    description: "Mostrador Ø180 com o fundo rebaixado 1,5 mm e recortado na mesma peça, marcadores das horas (rasgos e quadrados), números 12/3/6/9 e furo central para o mecanismo.",
    teaches: "Operações adicionais (rebaixo + recorte na mesma peça), anel por diferença, marcadores repetidos por ângulo, texto e furo por dentro.",
    build: () => {
      const cx = 150, cy = 100, R = 90;
      const dial = { id: "ex-rl-dial", kind: "circle", x: cx, y: cy, radius: R, depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Mostrador (rebaixo + recorte)", tabs: { count: 6, width: 8, height: 3 }, extraOps: [{ id: "ex-rl-op", operation: "pocket", depth: 1.5 }] } as Shape;
      const ringOut: Shape = { id: "ex-rl-r1", kind: "circle", x: cx, y: cy, radius: R - 6, depth: 3, operation: "pocket" };
      const ringIn: Shape = { id: "ex-rl-r2", kind: "circle", x: cx, y: cy, radius: R - 10, depth: 3, operation: "pocket" };
      const ring = booleanShapes("difference", [ringOut, ringIn], () => "ex-rl-anel")[0]; ring.name = "Anel (3 mm)";
      const marks: Shape[] = Array.from({ length: 12 }, (_, i) => {
        const a = (Math.PI / 2) - (i * Math.PI) / 6, r = R - 22, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), deg = (-i * 30) % 360;
        return i % 3 === 0
          ? { id: `ex-rl-m${i}`, kind: "rectangle", x: x - 5, y: y - 5, width: 10, height: 10, rotation: deg, depth: 3, operation: "pocket", name: `Marca ${i === 0 ? 12 : i}h` }
          : { id: `ex-rl-m${i}`, kind: "slot", x, y, length: 12, width: 4, rotation: 90 - i * 30, depth: 3, operation: "pocket", name: `Marca ${i}h` };
      });
      const num = (id: string, t: string, x: number, y: number): Shape => ({ id, kind: "text", x, y, text: t, fontId: "inter-bold", size: 18, rotation: 0, align: "center", letterSpacing: 1, depth: 2, operation: "pocket", name: `Número ${t}`, toolId: "ex-v" });
      return {
        settings: base({ toolDiameter: 3, stepover: 1.8, passDepth: 3, tools: [{ id: "ex-v", name: "V 60° gravação", type: "vbit", diameter: 1.5, vbitAngle: 60 }] }),
        shapes: [
          ring, ...marks,
          num("ex-rl-n12", "12", cx, cy + R - 44), num("ex-rl-n3", "3", cx + R - 40, cy - 6), num("ex-rl-n6", "6", cx, cy - R + 32), num("ex-rl-n9", "9", cx - R + 40, cy - 6),
          { id: "ex-rl-eixo", kind: "circle", x: cx, y: cy, radius: 4, depth: thru(12), operation: "outline", side: "inside", cutThrough: true, name: "Furo do mecanismo Ø8" },
          dial,
        ],
      };
    },
  },
  {
    id: "engrenagens", category: "casa", difficulty: 3, tags: ["recorte", "booleanas"],
    title: "Par de engrenagens",
    description: "Engrenagem de 20 dentes com 4 furos de alívio e pinhão de 12 dentes que engrenam, ambos com furo de eixo — recorte passante com tabs.",
    teaches: "Polígonos gerados por fórmula (dentes por ângulo), subtração de furos por booleana, furos por dentro, verificação de que a fresa entra entre os dentes.",
    build: () => {
      const gearPts = (cx: number, cy: number, teeth: number, m: number): [number, number][] => {
        const rp = (m * teeth) / 2, ra = rp + m, rr = rp - 1.25 * m, pts: [number, number][] = [];
        for (let i = 0; i < teeth; i++) {
          const a0 = (i * 2 * Math.PI) / teeth, step = (2 * Math.PI) / teeth;
          const at = (a: number, r: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
          pts.push(at(a0, rr), at(a0 + step * 0.12, rr), at(a0 + step * 0.22, ra), at(a0 + step * 0.40, ra), at(a0 + step * 0.50, rr), at(a0 + step * 0.62, rr));
        }
        return pts;
      };
      const m = 4, big = { x: 100, y: 100, teeth: 20 }, small = { x: 100 + (m * (20 + 12)) / 2 + 0.5, y: 100, teeth: 12 };
      const gearBig = poly("ex-g-big", gearPts(big.x, big.y, big.teeth, m), { depth: thru(12), operation: "outline", side: "outside", cutThrough: true, tabs: { count: 5, width: 8, height: 3 } });
      const holes: Shape[] = Array.from({ length: 4 }, (_, i) => ({ id: `ex-g-l${i}`, kind: "circle", x: big.x + 22 * Math.cos((i * Math.PI) / 2 + Math.PI / 4), y: big.y + 22 * Math.sin((i * Math.PI) / 2 + Math.PI / 4), radius: 7, depth: thru(12), operation: "outline" }));
      const bigWithHoles = booleanShapes("difference", [gearBig, ...holes], () => "ex-g-grande")[0];
      bigWithHoles.name = "Engrenagem 20 dentes"; bigWithHoles.tabs = { count: 5, width: 8, height: 3 };
      return {
        settings: base({ toolDiameter: 2, stepover: 1.2, passDepth: 2, feedRate: 700 }),
        shapes: [
          { id: "ex-g-e1", kind: "circle", x: big.x, y: big.y, radius: 4, depth: thru(12), operation: "outline", side: "inside", cutThrough: true, name: "Eixo Ø8" },
          { id: "ex-g-e2", kind: "circle", x: small.x, y: small.y, radius: 3, depth: thru(12), operation: "outline", side: "inside", cutThrough: true, name: "Eixo Ø6" },
          bigWithHoles,
          poly("ex-g-pinhao", gearPts(small.x, small.y, small.teeth, m), { depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Pinhão 12 dentes", tabs: { count: 3, width: 6, height: 3 } }),
        ],
      };
    },
  },
  {
    id: "descanso-panela", category: "cozinha", difficulty: 1, tags: ["recorte", "nesting"],
    title: "Descanso de panela (2 peças)",
    description: "Disco Ø160 com 12 rasgos radiais e um hexágono Ø110 com furo central — as duas peças já organizadas na chapa.",
    teaches: "Rasgos repetidos por ângulo, polígono regular, várias peças na mesma chapa (Organizar) e furos por dentro.",
    build: () => {
      const settings = base({ material: "pine", toolDiameter: 4, stepover: 2.4, passDepth: 4 });
      const R = 80, cx = 0, cy = 0;
      const slots: Shape[] = Array.from({ length: 12 }, (_, i) => ({ id: `ex-dp-s${i}`, kind: "slot", x: cx + 45 * Math.cos((i * Math.PI) / 6), y: cy + 45 * Math.sin((i * Math.PI) / 6), length: 40, width: 6, rotation: i * 30, depth: thru(12), operation: "outline", side: "inside", cutThrough: true, name: `Rasgo ${i + 1}` }));
      const disc: Shape = { id: "ex-dp-disc", kind: "circle", x: cx, y: cy, radius: R, depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Disco", tabs: { count: 6, width: 8, height: 3 } };
      const hex: Shape = { id: "ex-dp-hex", kind: "ngon", x: 400, y: 0, radius: 55, sides: 6, rotation: 0, depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Hexágono", tabs: { count: 6, width: 8, height: 3 } };
      const hexHole: Shape = { id: "ex-dp-hexhole", kind: "circle", x: 400, y: 0, radius: 15, depth: thru(12), operation: "outline", side: "inside", cutThrough: true, name: "Furo central" };
      // group each part with its holes so nesting keeps them together: nest the outlines, then move the children by the same offset
      const parts = nested([disc, hex], settings, 8);
      const move = (id: string, children: Shape[]): Shape[] => {
        const before = id === "ex-dp-disc" ? disc : hex, after = parts.find((p) => p.id === id)!;
        const dx = (after as typeof disc).x - (before as typeof disc).x, dy = (after as typeof disc).y - (before as typeof disc).y;
        return children.map((c) => ({ ...c, x: (c as typeof hexHole).x + dx, y: (c as typeof hexHole).y + dy }) as Shape);
      };
      return { settings, shapes: [...move("ex-dp-disc", slots), ...move("ex-dp-hex", [hexHole]), ...parts] };
    },
  },
  {
    id: "suporte-celular", category: "encaixe", difficulty: 2, tags: ["encaixe", "recorte", "nesting"],
    title: "Suporte de celular (encaixe em cruz)",
    description: "Base com rasgo e apoio inclinado com rasgo — as duas peças se cruzam e travam. Rasgo = espessura da chapa + 0,2 mm de folga.",
    teaches: "Folga de encaixe (rasgo do tamanho da chapa não entra), duas peças que se cruzam, recorte para o cabo, peças já organizadas.",
    build: () => {
      const settings = base({ material: "mdf", toolDiameter: 3, stepover: 1.8, passDepth: 3 });
      const t = slotFor(settings.stock.thickness); // 12.2
      const baseW = 90, baseH = 70, standW = 80, standH = 110;
      const basePart: Shape = { id: "ex-sc-base", kind: "rectangle", x: 0, y: 0, width: baseW, height: baseH, rotation: 0, corners: { type: "fillet", size: 6 }, depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Base", tabs: { count: 4, width: 8, height: 3 } };
      const baseSlot: Shape = { id: "ex-sc-base-slot", kind: "rectangle", x: baseW / 2 - t / 2, y: 20, width: t, height: baseH / 2, rotation: 0, depth: thru(12), operation: "outline", side: "inside", cutThrough: true, name: `Rasgo da base (${t} mm)` };
      const stand: PathShape = poly("ex-sc-stand", [[0, 0], [standW, 0], [standW, standH - 30], [standW - 12, standH], [12, standH], [0, standH - 30]], { depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Apoio", tabs: { count: 4, width: 8, height: 3 } });
      const standSlot: Shape = { id: "ex-sc-stand-slot", kind: "rectangle", x: standW / 2 - t / 2, y: 0, width: t, height: baseH / 2, rotation: 0, depth: thru(12), operation: "outline", side: "inside", cutThrough: true, name: `Rasgo do apoio (${t} mm)` };
      const cable: Shape = { id: "ex-sc-cable", kind: "slot", x: standW / 2, y: standH - 32, length: 24, width: 12, rotation: 0, depth: thru(12), operation: "outline", side: "inside", cutThrough: true, name: "Passagem do cabo" };
      const parts = nested([basePart, stand], settings, 8);
      const off = (id: string, ref: { x: number; y: number }, kids: Shape[]) => { const a = parts.find((p) => p.id === id) as { x: number; y: number }; return kids.map((k) => ({ ...k, x: (k as { x: number }).x + a.x - ref.x, y: (k as { y: number }).y + a.y - ref.y }) as Shape); };
      const standAfter = parts.find((p) => p.id === "ex-sc-stand") as PathShape;
      const [sx, sy] = standAfter.points[0];
      return { settings, shapes: [...off("ex-sc-base", basePart as { x: number; y: number }, [baseSlot]), ...[standSlot, cable].map((k) => ({ ...k, x: (k as { x: number }).x + sx, y: (k as { y: number }).y + sy }) as Shape), ...parts] };
    },
  },
  {
    id: "caixa-dedos", category: "encaixe", difficulty: 3, tags: ["encaixe", "recorte", "nesting"],
    title: "Caixa com encaixe de dedo",
    description: "Caixa 120 × 80 × 60 em 5 peças: fundo e 4 laterais com dentes gerados a partir da espessura da chapa (folga 0,15 mm), já organizadas na chapa.",
    teaches: "Dentes por fórmula (finger joint) com folga, faces complementares, tabs em peças pequenas, nesting das 5 peças.",
    build: () => {
      const settings = base({ material: "plywood", toolDiameter: 3, stepover: 1.8, passDepth: 3, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 400, height: 300, thickness: 6 } });
      const t = settings.stock.thickness, L = 120, W = 80, H = 60, c = 0.15;
      // side panel: bottom edge = fingers into the floor; left/right edges = fingers into the neighbours
      const panel = (id: string, len: number, h: number, startFinger: boolean, name: string): PathShape => {
        const bottom = fingerJointEdge(len, t, 5, c, true).map(([x, y]) => [x, y] as [number, number]);           // y=0 edge, fingers at −t
        const right = fingerJointEdge(h, t, 5, c, startFinger).map(([x, y]) => [len - y, x] as [number, number]);   // x=len edge, fingers at +t
        const top: [number, number][] = [[len, h], [0, h]];
        const left = fingerJointEdge(h, t, 5, c, startFinger).map(([x, y]) => [y, h - x] as [number, number]);       // x=0 edge, fingers at −t
        return poly(id, [...bottom, ...right, ...top, ...left], { depth: thru(t), operation: "outline", side: "outside", cutThrough: true, name, tabs: { count: 3, width: 6, height: 2 } });
      };
      const floorPts = (): [number, number][] => {
        const b = fingerJointEdge(L, t, 5, c, false);                                                       // gaps where side fingers enter
        const r = fingerJointEdge(W, t, 5, c, false).map(([x, y]) => [L - y, x] as [number, number]);
        const tp = fingerJointEdge(L, t, 5, c, false).map(([x, y]) => [L - x, W - y] as [number, number]);
        const l = fingerJointEdge(W, t, 5, c, false).map(([x, y]) => [y, W - x] as [number, number]);
        return [...b, ...r, ...tp, ...l];
      };
      const parts: Shape[] = [
        poly("ex-cx-fundo", floorPts(), { depth: thru(t), operation: "outline", side: "outside", cutThrough: true, name: "Fundo", tabs: { count: 4, width: 6, height: 2 } }),
        panel("ex-cx-frente", L, H, true, "Frente"), panel("ex-cx-tras", L, H, true, "Trás"),
        panel("ex-cx-esq", W, H, false, "Lateral esquerda"), panel("ex-cx-dir", W, H, false, "Lateral direita"),
      ];
      return { settings, shapes: nested(parts, settings, 8) };
    },
  },
  {
    id: "dobradica-viva", category: "decoracao", difficulty: 2, tags: ["recorte"],
    title: "Dobradiça viva (kerf bending)",
    description: "Retângulo 240 × 100 com faixa central de rasgos passantes alternados — depois de cortado, o MDF dobra nessa faixa.",
    teaches: "Rasgos repetidos por fórmula, chapa fina (6 mm), como o tempo cresce com muitos rasgos e o que ajuda (fresa maior, passe maior).",
    build: () => {
      const settings = base({ material: "mdf", toolDiameter: 3, stepover: 1.8, passDepth: 3, feedRate: 1200, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, thickness: 6 } });
      const x0 = 30, y0 = 50, w = 240, h = 100, t = 6;
      const cols = 14, pitch = 8, segLen = 34, gap = 6; // 3 segmentos por coluna, alternando o deslocamento
      const slots: Shape[] = [];
      for (let i = 0; i < cols; i++) {
        const x = x0 + w / 2 - ((cols - 1) * pitch) / 2 + i * pitch;
        const shift = i % 2 ? (segLen + gap) / 2 : 0;
        for (let k = -1; k <= 1; k++) {
          const cy = y0 + h / 2 + k * (segLen + gap) + shift;
          const top = Math.min(cy + segLen / 2, y0 + h - 4), bot = Math.max(cy - segLen / 2, y0 + 4);
          if (top - bot < 8) continue;
          slots.push({ id: `ex-dv-${i}-${k + 1}`, kind: "slot", x, y: (top + bot) / 2, length: top - bot, width: 1.5, rotation: 90, depth: thru(t), operation: "outline", side: "on", cutThrough: true, name: `Rasgo ${slots.length + 1}` });
        }
      }
      return { settings, shapes: [...slots, { id: "ex-dv-placa", kind: "rectangle", x: x0, y: y0, width: w, height: h, rotation: 0, corners: { type: "fillet", size: 6 }, depth: thru(t), operation: "outline", side: "outside", cutThrough: true, name: "Placa", tabs: { count: 6, width: 8, height: 2 } }] };
    },
  },
  {
    id: "bandeja-divisorias", category: "casa", difficulty: 2, tags: ["rebaixo", "recorte"],
    title: "Bandeja com divisórias",
    description: "Placa 220 × 150 em MDF de 15 mm com 6 bolsões de tamanhos diferentes rebaixados a 10 mm e paredes de 6 mm entre eles.",
    teaches: "Rebaixo profundo em vários passes, paredes finas (Verificação avisa se a fresa não entra), contorno paralelo × zigue-zague no tempo.",
    build: () => {
      const settings = base({ material: "mdf", toolDiameter: 6, stepover: 3.6, passDepth: 3, feedRate: 1000, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 300, height: 200, thickness: 15 } });
      const x0 = 40, y0 = 25, w = 220, h = 150, wall = 6, edge = 8, d = 10;
      const pocket = (id: string, x: number, y: number, pw: number, ph: number, name: string): Shape => ({ id, kind: "rectangle", x, y, width: pw, height: ph, rotation: 0, corners: { type: "fillet", size: 4 }, depth: d, operation: "pocket", name });
      const innerW = w - 2 * edge, innerH = h - 2 * edge, colW = (innerW - wall) / 2, rowH = (innerH - 2 * wall) / 3;
      const bx = x0 + edge, by = y0 + edge;
      return {
        settings,
        shapes: [
          pocket("ex-bd-1", bx, by, colW, rowH * 2 + wall, "Bolsão grande"),
          pocket("ex-bd-2", bx, by + rowH * 2 + 2 * wall, colW, rowH, "Bolsão baixo"),
          pocket("ex-bd-3", bx + colW + wall, by, (colW - wall) / 2, rowH, "Bolsão pequeno 1"),
          pocket("ex-bd-4", bx + colW + wall + (colW - wall) / 2 + wall, by, (colW - wall) / 2, rowH, "Bolsão pequeno 2"),
          pocket("ex-bd-5", bx + colW + wall, by + rowH + wall, colW, rowH, "Bolsão médio"),
          pocket("ex-bd-6", bx + colW + wall, by + rowH * 2 + 2 * wall, colW, rowH, "Bolsão médio 2"),
          { id: "ex-bd-placa", kind: "rectangle", x: x0, y: y0, width: w, height: h, rotation: 0, corners: { type: "fillet", size: 10 }, depth: thru(15), operation: "outline", side: "outside", cutThrough: true, name: "Bandeja", tabs: { count: 6, width: 10, height: 4 } },
        ],
      };
    },
  },
  {
    id: "gabarito-32", category: "casa", difficulty: 2, tags: ["furacao", "texto"],
    title: "Gabarito de furação (sistema 32)",
    description: "Régua 400 × 40 com furos Ø5 a cada 32 mm, traços gravados com fresa V e a cota de cada furo — para furar laterais de armário e prateleiras.",
    teaches: "Furação em série por fórmula, gravação fina com fresa V, texto pequeno, peça longa (chapa de 420 mm) e ordem automática furos → recorte.",
    build: () => {
      const settings = base({ material: "mdf", toolDiameter: 5, stepover: 3, passDepth: 3, peckDepth: 4, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 420, height: 60, thickness: 12 }, tools: [{ id: "ex-v", name: "V 30° gravação fina", type: "vbit", diameter: 0.8, vbitAngle: 30 }] });
      const x0 = 10, y0 = 10, w = 400, h = 40, n = 12;
      const holes: Shape[] = Array.from({ length: n }, (_, i) => ({ id: `ex-gb-h${i}`, kind: "circle", x: x0 + 24 + i * 32, y: y0 + h / 2, radius: 2.5, depth: thru(12), operation: "drill", cutThrough: true, name: `Furo ${i + 1} (${24 + i * 32} mm)` }));
      const ticks: Shape[] = Array.from({ length: n }, (_, i) => ({ id: `ex-gb-t${i}`, kind: "path", points: [[x0 + 24 + i * 32, y0 + 2], [x0 + 24 + i * 32, y0 + 8]], closed: false, depth: 0.8, operation: "outline", side: "on", name: `Traço ${i + 1}`, toolId: "ex-v" }));
      const labels: Shape[] = Array.from({ length: n }, (_, i) => ({ id: `ex-gb-l${i}`, kind: "text", x: x0 + 24 + i * 32, y: y0 + h - 9, text: String(24 + i * 32), fontId: "inter-bold", size: 8, rotation: 0, align: "center", letterSpacing: 0, depth: 0.6, operation: "pocket", name: `Cota ${24 + i * 32}`, toolId: "ex-v" }));
      return { settings, shapes: [...ticks, ...labels, ...holes, { id: "ex-gb-regua", kind: "rectangle", x: x0, y: y0, width: w, height: h, rotation: 0, corners: { type: "fillet", size: 4 }, depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Régua", tabs: { count: 6, width: 8, height: 3 } }] };
    },
  },
  {
    id: "placa-raposa", category: "importado", difficulty: 2, tags: ["importacao", "rebaixo", "recorte"],
    title: "Placa de raposa (imagem)",
    description: "Raposa vetorizada de uma imagem PNG em preto e branco: o preto vira rebaixo de 2 mm numa placa 170 × 170 recortada, com furos para parafuso.",
    teaches: "Importar imagem → silhueta: limiar, suavizar e simplificar; o escuro vira rebaixo (com ilhas: olhos e nariz), o claro fica na superfície.",
    build: () => fromImage("/examples/raposa.pgm", 150, base({ material: "plywood", toolDiameter: 3, stepover: 1.8, passDepth: 2 }), (shapes) => [
      ...shapes.map((s, i) => ({ ...s, id: `ex-fox-${i}`, operation: "pocket", depth: 2, name: i === 0 ? "Raposa" : `Detalhe ${i}` }) as Shape),
      { id: "ex-fox-h1", kind: "circle", x: 22, y: 168, radius: 1.5, depth: thru(12), operation: "drill", cutThrough: true, name: "Furo de parafuso" },
      { id: "ex-fox-h2", kind: "circle", x: 168, y: 168, radius: 1.5, depth: thru(12), operation: "drill", cutThrough: true, name: "Furo de parafuso" },
      { id: "ex-fox-plate", kind: "rectangle", x: 10, y: 10, width: 170, height: 170, rotation: 0, corners: { type: "fillet", size: 10 }, depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Placa", tabs: { count: 4, width: 8, height: 3 } },
    ]),
  },
  {
    id: "relevo-oficina", category: "decoracao", difficulty: 3, tags: ["relevo", "importacao"],
    title: "Relevo em 2,5D (imagem)",
    description: "Cúpula com ondas usinada em raster a partir de uma imagem em tons de cinza: branco fica na superfície, preto desce 4 mm.",
    teaches: "Relevo por heightmap: fresa esférica, passo fino entre linhas, desbaste em passes e acabamento — leva mais tempo que um rebaixo comum.",
    build: () => fromRelief("/examples/relevo-oficina.pgm", "ex-relief", 150, 4, base({ material: "mdf", toolDiameter: 3, toolType: "ball", stepover: 1, passDepth: 2, feedRate: 1200 }), { name: "Relevo da oficina", lineStep: 1 }),
  },
  {
    id: "placa-pata", category: "importado", difficulty: 1, tags: ["importacao", "rebaixo", "furacao", "recorte"],
    title: "Placa com pata de cachorro (SVG)",
    description: "Placa quadrada com a pata (almofada + 4 dedos) rebaixada a 3 mm e dois furos para parafuso.",
    teaches: "SVG com várias formas: a moldura vira recorte, os desenhos viram rebaixos, os círculos viram furos.",
    build: () => fromSvg("/examples/pata.svg", base({ material: "mdf" }), (shapes) => shapes.map((s, i) => {
      if (s.kind === "circle") return { ...s, id: `ex-paw-h${i}`, operation: "drill", depth: thru(12), cutThrough: true, name: "Furo de parafuso" } as Shape;
      const isFrame = s.kind === "path" && s.points.length <= 40 && i === 0;
      return isFrame
        ? { ...s, id: `ex-paw-frame`, operation: "outline", side: "outside", depth: thru(12), cutThrough: true, name: "Placa", tabs: { count: 4, width: 8, height: 3 } } as Shape
        : { ...s, id: `ex-paw-${i}`, operation: "pocket", depth: 3, name: i === 1 ? "Almofada" : `Dedo ${i - 1}` } as Shape;
    })),
  },
];

export const findExample = (id: string): Example | undefined => EXAMPLES.find((e) => e.id === id);
export const examplesByCategory = (): { category: ExampleCategory; label: string; items: Example[] }[] =>
  (Object.keys(CATEGORY_LABEL) as ExampleCategory[]).map((c) => ({ category: c, label: CATEGORY_LABEL[c], items: EXAMPLES.filter((e) => e.category === c) })).filter((g) => g.items.length);
