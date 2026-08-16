import type { Shape, MachineSettings, PathShape } from "../types";
import { DEFAULT_MACHINE_SETTINGS } from "../types";
import { parseSvg } from "../lib/svgImport";
import { booleanShapes } from "../lib/boolean";

export type ExampleCategory = "basico" | "cozinha" | "decoracao" | "esportes" | "importado";
export const CATEGORY_LABEL: Record<ExampleCategory, string> = { basico: "Básicos", cozinha: "Cozinha", decoracao: "Decoração", esportes: "Esportes", importado: "Importados (SVG)" };

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
const thru = (t: number) => Math.round((t + 0.2) * 100) / 100;
const poly = (id: string, points: [number, number][], extra: Partial<PathShape> = {}): PathShape => ({ id, kind: "path", points, closed: true, depth: 3, operation: "pocket", ...extra });
/** Points of an ellipse-ish arc polygon (n segments). */
const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as [number, number]; });

/** Classic pointed shield outline (bottom point at y = 0, top at y = h, width w) — own drawing, not any official crest. */
function shieldPoints(cx: number, y0: number, w: number, h: number): [number, number][] {
  const hw = w / 2;
  const q = (p0: [number, number], c: [number, number], p1: [number, number], n = 14): [number, number][] =>
    Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]] as [number, number]; });
  const tip: [number, number] = [cx, y0];
  const left = q(tip, [cx - hw * 0.9, y0 + h * 0.08], [cx - hw, y0 + h * 0.5]);
  const right = q([cx + hw, y0 + h * 0.5], [cx + hw * 0.9, y0 + h * 0.08], tip);
  return [...left, [cx - hw, y0 + h], [cx + hw, y0 + h], ...right.slice(0, -1)];
}

async function fromSvg(url: string, settings: MachineSettings, decorate: (shapes: Shape[]) => Shape[]): Promise<Project> {
  const res = await fetch(url);
  const text = await res.text();
  const { shapes } = parseSvg(text, {});
  return { shapes: decorate(shapes), settings };
}

export const EXAMPLES: Example[] = [
  {
    id: "placa-furos", category: "basico", difficulty: 1,
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
    id: "porta-lapis", category: "basico", difficulty: 2,
    title: "Porta-lápis (encaixe)",
    description: "Base com rasgos para encaixar 4 paredes de 12 mm — todas as peças na mesma chapa.",
    teaches: "Contorno por dentro (rasgo no tamanho exato), múltiplas peças, tabs, nesting (Arranjar → Organizar).",
    build: () => {
      const wall = (id: string, x: number, y: number, name: string): Shape => ({ id, kind: "rectangle", x, y, width: 80, height: 60, rotation: 0, depth: 12.2, operation: "outline", side: "outside", cutThrough: true, name, tabs: { count: 2, width: 6, height: 2 } });
      const slot = (id: string, x: number, y: number, w: number, h: number): Shape => ({ id, kind: "rectangle", x, y, width: w, height: h, rotation: 0, depth: 12.2, operation: "outline", side: "inside", cutThrough: true, name: "Rasgo" });
      return {
        settings: base(),
        shapes: [
          slot("ex-s1", 30, 30, 60, 12), slot("ex-s2", 30, 78, 60, 12), slot("ex-s3", 22, 46, 12, 28), slot("ex-s4", 86, 46, 12, 28),
          { id: "ex-base", kind: "rectangle", x: 10, y: 10, width: 100, height: 100, rotation: 0, depth: 12.2, operation: "outline", side: "outside", cutThrough: true, name: "Base", corners: { type: "chamfer", size: 5 }, tabs: { count: 4, width: 8, height: 3 } },
          wall("ex-w1", 125, 10, "Parede 1"), wall("ex-w2", 125, 80, "Parede 2"), wall("ex-w3", 215, 10, "Parede 3"), wall("ex-w4", 215, 80, "Parede 4"),
        ],
      };
    },
  },
  {
    id: "letreiro", category: "decoracao", difficulty: 2,
    title: "Letreiro gravado",
    description: "Placa 200 × 70 com o texto “OFICINA” gravado a 2 mm e recorte final com cantos arredondados.",
    teaches: "Texto com fonte embarcada (letras com miolo), gravação por rebaixo, recorte por fora com tabs, simulação com remoção de material.",
    build: () => ({
      settings: base({ helixEntry: true }),
      shapes: [
        { id: "ex-text", kind: "text", x: 100, y: 45, text: "OFICINA", fontId: "inter-bold", size: 28, rotation: 0, align: "center", letterSpacing: 2, depth: 2, operation: "pocket", name: "Texto gravado" },
        { id: "ex-sign", kind: "rectangle", x: 20, y: 20, width: 160, height: 60, rotation: 0, depth: 12.2, operation: "outline", side: "outside", cutThrough: true, name: "Placa", corners: { type: "fillet", size: 8 }, tabs: { count: 4, width: 8, height: 3 } },
      ],
    }),
  },
  {
    id: "tabua-carnes", category: "cozinha", difficulty: 2,
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
    id: "escudo-spfc", category: "esportes", difficulty: 2,
    title: "Escudo do São Paulo (tricolor)",
    description: "Escudo 140 × 160 recortado, com as três faixas em níveis de rebaixo e as letras SPFC gravadas — desenho geométrico próprio, não a arte oficial.",
    teaches: "Níveis (rebaixos de 1,5 e 3 mm fazem o relevo, já que G-code não tem cor), texto gravado, recorte por fora com tabs.",
    build: () => {
      const cx = 150, y0 = 20, w = 140, h = 160;
      const outline = shieldPoints(cx, y0, w, h);
      // três faixas horizontais dentro do escudo (rebaixos), obtidas por interseção do escudo com retângulos
      const shield: PathShape = poly("ex-sp-outline", outline, { depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Escudo", tabs: { count: 5, width: 8, height: 3 } });
      const bandRect = (id: string, y: number, hh: number): Shape => ({ id, kind: "rectangle", x: cx - w, y, width: w * 2, height: hh, rotation: 0, depth: 3, operation: "pocket" });
      const inner: PathShape = poly("ex-sp-inner", outline, { depth: 3 });
      const bandTop = booleanShapes("intersection", [inner, bandRect("bt", y0 + h * 0.62, h * 0.10)], () => "ex-sp-faixa1")[0];
      const bandBottom = booleanShapes("intersection", [inner, bandRect("bb", y0 + h * 0.20, h * 0.16)], () => "ex-sp-faixa2")[0];
      bandTop.name = "Faixa superior (3 mm)"; bandBottom.name = "Faixa inferior (3 mm)"; bandBottom.depth = 3;
      const bandMid = booleanShapes("intersection", [inner, bandRect("bm", y0 + h * 0.40, h * 0.18)], () => "ex-sp-faixa3")[0];
      bandMid.name = "Faixa do meio (1,5 mm)"; bandMid.depth = 1.5;
      return {
        settings: base(),
        shapes: [
          bandTop, bandMid, bandBottom,
          { id: "ex-sp-txt", kind: "text", x: cx, y: y0 + h * 0.80, text: "SPFC", fontId: "inter-bold", size: 24, rotation: 0, align: "center", letterSpacing: 2, depth: 1.5, operation: "pocket", name: "SPFC" },
          shield,
        ],
      };
    },
  },
  {
    id: "escudo-palmeiras", category: "esportes", difficulty: 3,
    title: "Escudo do Palmeiras (verde)",
    description: "Círculo com coroa de 8 pontas e a estrela ao centro — união e subtração de formas; desenho próprio.",
    teaches: "Booleanas (união de círculo + pontas, subtração da estrela), círculo por fora, gravação em níveis, hélice de entrada.",
    build: () => {
      const cx = 150, cy = 105, R = 62;
      const disc: Shape = { id: "ex-pa-disc", kind: "circle", x: cx, y: cy, radius: R, depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Escudo" };
      // 8 pontas (losangos) em volta → união com o disco
      const spikes: Shape[] = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const p = (r: number, da: number): [number, number] => [cx + r * Math.cos(a + da), cy + r * Math.sin(a + da)];
        return poly(`ex-pa-sp${i}`, [p(R - 4, -0.18), p(R + 14, 0), p(R - 4, 0.18), p(R - 20, 0)], { depth: thru(12), operation: "outline", side: "outside", cutThrough: true });
      });
      const body = booleanShapes("union", [disc, ...spikes], () => "ex-pa-body")[0];
      body.name = "Escudo (união)"; body.tabs = { count: 6, width: 8, height: 3 };
      const ring: Shape = { id: "ex-pa-ring", kind: "circle", x: cx, y: cy, radius: R - 6, depth: 1.5, operation: "pocket", name: "Anel (1,5 mm)" };
      const ringInner: Shape = { id: "ex-pa-ring-in", kind: "circle", x: cx, y: cy, radius: R - 14, depth: 1.5, operation: "pocket" };
      const ringShape = booleanShapes("difference", [ring, ringInner], () => "ex-pa-anel")[0]; ringShape.name = "Anel (1,5 mm)";
      const star: [number, number][] = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 9 : 22; const a = -Math.PI / 2 + (i * Math.PI) / 5; return [cx + r * Math.cos(a), cy + 4 + r * Math.sin(a)]; });
      return {
        settings: base({ helixEntry: true, toolDiameter: 2, stepover: 1.2, passDepth: 2 }),
        shapes: [
          ringShape,
          poly("ex-pa-star", star, { depth: 3, name: "Estrela (3 mm)" }),
          { id: "ex-pa-txt", kind: "text", x: cx, y: cy - 36, text: "1914", fontId: "inter-bold", size: 18, rotation: 0, align: "center", letterSpacing: 1, depth: 1.5, operation: "pocket", name: "1914" },
          body,
        ],
      };
    },
  },
  {
    id: "escudo-corinthians", category: "esportes", difficulty: 3,
    title: "Escudo do Corinthians (timão)",
    description: "Escudo arredondado com âncora e dois remos cruzados em relevo — desenho geométrico próprio.",
    teaches: "Polígonos desenhados, união de rasgos (remos), operações adicionais (rebaixo + recorte na mesma peça), tabs.",
    build: () => {
      const cx = 150, y0 = 25, w = 130, h = 150;
      const outline = shieldPoints(cx, y0, w, h);
      const shield = poly("ex-co-shield", outline, {
        depth: thru(12), operation: "outline", side: "outside", cutThrough: true, name: "Escudo (rebaixo + recorte)", tabs: { count: 5, width: 8, height: 3 },
        extraOps: [{ id: "ex-co-op", operation: "pocket", depth: 1.5 }],
      });
      const cy = y0 + h * 0.5;
      const oar = (id: string, ang: number): Shape => ({ id, kind: "slot", x: cx, y: cy, length: 96, width: 9, rotation: ang, depth: 3, operation: "pocket" });
      const oars = booleanShapes("union", [oar("o1", 35), oar("o2", -35)], () => "ex-co-remos")[0]; oars.name = "Remos cruzados (3 mm)";
      const anchorRing: Shape = { id: "ex-co-a1", kind: "circle", x: cx, y: cy + 46, radius: 6, depth: 3, operation: "pocket" };
      const anchorHole: Shape = { id: "ex-co-a2", kind: "circle", x: cx, y: cy + 46, radius: 3, depth: 3, operation: "pocket" };
      const anchorTop = booleanShapes("difference", [anchorRing, anchorHole], () => "ex-co-ancora-anel")[0]; anchorTop.name = "Âncora — anel";
      const anchorShaft: Shape = { id: "ex-co-a3", kind: "rectangle", x: cx - 3, y: cy - 30, width: 6, height: 72, rotation: 0, depth: 3, operation: "pocket", name: "Âncora — haste" };
      const anchorArm = poly("ex-co-a4", arcPts(cx, cy - 12, 26, 18, Math.PI + 0.35, 2 * Math.PI - 0.35, 20).concat(arcPts(cx, cy - 12, 20, 12, 2 * Math.PI - 0.35, Math.PI + 0.35, 20)), { depth: 3, name: "Âncora — braços" });
      return {
        settings: base(),
        shapes: [oars, anchorTop, anchorShaft, anchorArm, shield],
      };
    },
  },
  {
    id: "placa-gato", category: "importado", difficulty: 2,
    title: "Placa de gato (SVG)",
    description: "Cabeça de gato importada de um SVG com olhos e nariz como furos, mais o furo para pendurar.",
    teaches: "Importar SVG com furos (sub-caminhos internos), escolher recorte por fora + furos por dentro, ordem automática.",
    build: () => fromSvg("/examples/gato.svg", base({ material: "plywood" }), (shapes) => shapes.map((s, i) => s.kind === "circle" ? { ...s, id: `ex-cat-h${i}`, operation: "outline", side: "inside", depth: thru(12), cutThrough: true, name: "Furo para pendurar" } : { ...s, id: `ex-cat-${i}`, operation: "outline", side: "outside", depth: thru(12), cutThrough: true, name: "Gato", tabs: { count: 5, width: 8, height: 3 } })),
  },
  {
    id: "placa-raposa", category: "importado", difficulty: 2,
    title: "Placa de raposa (SVG)",
    description: "Raposa com orelhas grandes, olhos, focinho e bochechas vazadas — recorte por fora.",
    teaches: "SVG com vários furos internos; conferir na Verificação que os furos pequenos cabem na fresa.",
    build: () => fromSvg("/examples/raposa.svg", base({ material: "plywood", toolDiameter: 2, stepover: 1.2, passDepth: 2 }), (shapes) => shapes.map((s, i) => s.kind === "circle" ? { ...s, id: `ex-fox-h${i}`, operation: "outline", side: "inside", depth: thru(12), cutThrough: true, name: "Furo para pendurar" } : { ...s, id: `ex-fox-${i}`, operation: "outline", side: "outside", depth: thru(12), cutThrough: true, name: "Raposa", tabs: { count: 5, width: 8, height: 3 } })),
  },
  {
    id: "placa-pata", category: "importado", difficulty: 1,
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
