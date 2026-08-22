import { describe, it, expect } from "vitest";
import sample from "./fixtures/sample.dxf?raw";
import { parseDxf, insunitsToMm, polylineWithBulges, isFrameLoop } from "../dxfImport";
import { boundingBox } from "../geometry";
import type { PathShape, CircleShape } from "../../types";

describe("dxfImport", () => {
  it("maps $INSUNITS to mm", () => {
    expect(insunitsToMm(4).scale).toBe(1);
    expect(insunitsToMm(1).scale).toBe(25.4);
    expect(insunitsToMm(undefined).note).toMatch(/assumindo/);
  });

  it("expands bulges into arcs", () => {
    const pts = polylineWithBulges([{ x: 0, y: 0, bulge: 1 }, { x: 10, y: 0 }], false, 0.05);
    expect(pts.length).toBeGreaterThan(5);
    // DXF: positive bulge = CCW from start to end → for (0,0)→(10,0) the arc bows to -y
    const bottom = pts.reduce((m, p) => (p[1] < m[1] ? p : m), pts[0]);
    expect(bottom[1]).toBeCloseTo(-5, 1);
    expect(bottom[0]).toBeCloseTo(5, 1);
  });

  it("imports polyline (with bulge), circle, line, block insert and skips text", () => {
    const { shapes, warnings } = parseDxf(sample, { inferHoles: false });
    const kinds = shapes.map((s) => s.kind);
    expect(kinds.filter((k) => k === "circle")).toHaveLength(2);
    expect(kinds.filter((k) => k === "path")).toHaveLength(2);
    const poly = shapes.find((s) => s.kind === "path" && (s as PathShape).closed) as PathShape;
    const b = boundingBox(poly.points);
    expect(b.minX).toBe(0);
    expect(b.maxX).toBeCloseTo(55, 0);
    const inserted = shapes.filter((s) => s.kind === "circle").map((s) => s as CircleShape).find((c) => c.radius === 2.5);
    expect(inserted).toMatchObject({ x: 20, y: 15 });
    expect(warnings.join(" ")).toMatch(/não suportadas/);
  });

  it("scales inch drawings", () => {
    const inch = sample.replace("$INSUNITS\n70\n4", "$INSUNITS\n70\n1");
    const { shapes } = parseDxf(inch);
    const big = shapes.find((s) => s.kind === "circle" && (s as CircleShape).radius > 100) as CircleShape;
    expect(big.radius).toBeCloseTo(254, 3);
  });
});

describe("dxfImport extra entities", () => {
  it("handles ARC, ELLIPSE, SPLINE and skips unknown", () => {
    const dxf = ["0","SECTION","2","ENTITIES",
      "0","ARC","8","0","10","0","20","0","40","10","50","0","51","90",
      "0","ELLIPSE","8","0","10","0","20","0","11","20","21","0","40","0.5","41","0","42","6.283185",
      "0","SPLINE","8","0","70","8","71","3","72","8","73","4","40","0","40","0","40","0","40","0","40","1","40","1","40","1","40","1","10","0","20","0","10","10","20","10","10","20","20","-10","10","30","20","0",
      "0","HATCH","8","0",
      "0","ENDSEC","0","EOF",""].join("\n");
    const { shapes, warnings } = parseDxf(dxf);
    expect(shapes.length).toBeGreaterThanOrEqual(3);
    const arc = shapes[0] as PathShape;
    expect(arc.closed).toBe(false);
    expect(arc.points[0][0]).toBeCloseTo(10, 3); // starts at angle 0 → (10,0)
    expect(warnings.join(" ")).toMatch(/assumindo milímetros|não suportadas/);
  });
});

/** Build a minimal ENTITIES-only DXF. */
const dxfDoc = (...entities: string[][]) =>
  ["0", "SECTION", "2", "ENTITIES", ...entities.flat(), "0", "ENDSEC", "0", "EOF", ""].join("\n");

/** Closed LWPOLYLINE rectangle on `layer`. */
const rect = (x: number, y: number, w: number, h: number, layer = "0") => [
  "0", "LWPOLYLINE", "8", layer, "90", "4", "70", "1",
  "10", `${x}`, "20", `${y}`,
  "10", `${x + w}`, "20", `${y}`,
  "10", `${x + w}`, "20", `${y + h}`,
  "10", `${x}`, "20", `${y + h}`,
];

const circle = (x: number, y: number, r: number, layer = "0") => [
  "0", "CIRCLE", "8", layer, "10", `${x}`, "20", `${y}`, "40", `${r}`,
];

describe("dxfImport — furos inferidos", () => {
  it("flange: os furos viram holes de uma peça só", () => {
    const doc = dxfDoc(rect(0, 0, 100, 60), circle(20, 30, 5), circle(50, 30, 5), circle(80, 30, 5));
    const { shapes, holes } = parseDxf(doc);
    expect(shapes).toHaveLength(1);
    expect(holes).toBe(3);
    const part = shapes[0] as PathShape;
    expect(part.kind).toBe("path");
    expect(part.holes).toHaveLength(3);
  });

  it("inferHoles: false mantém cada laço como uma forma", () => {
    const doc = dxfDoc(rect(0, 0, 100, 60), circle(50, 30, 5));
    const { shapes, holes } = parseDxf(doc, { inferHoles: false });
    expect(shapes).toHaveLength(2);
    expect(holes).toBe(0);
    expect(shapes.some((s) => s.kind === "circle")).toBe(true);
  });

  it("duas peças lado a lado não viram uma peça com furo", () => {
    const doc = dxfDoc(rect(0, 0, 40, 40), circle(20, 20, 5), rect(60, 0, 40, 40), circle(80, 20, 5));
    const { shapes, holes } = parseDxf(doc);
    expect(shapes).toHaveLength(2);
    expect(holes).toBe(2);
    for (const s of shapes) expect((s as PathShape).holes).toHaveLength(1);
  });

  it("moldura em volta de uma chapa de peças não engole as peças", () => {
    const doc = dxfDoc(
      rect(-10, -10, 240, 100),
      rect(0, 0, 100, 60), circle(50, 30, 5),
      rect(120, 0, 100, 60), circle(170, 30, 5),
    );
    const { shapes, holes, warnings } = parseDxf(doc);
    expect(holes).toBe(2);
    expect(warnings.join(" ")).toMatch(/borda em volta/);
    // a moldura entra como contorno solto e cada peça mantém o furo
    expect(shapes).toHaveLength(3);
    const parts = shapes.filter((s) => (s as PathShape).holes?.length);
    expect(parts).toHaveLength(2);
  });

  it("chapa retangular com furos não é confundida com moldura", () => {
    // mesma forma de uma moldura (retângulo que contém tudo), mas o que tem dentro são só furos
    const doc = dxfDoc(rect(0, 0, 200, 120), circle(40, 60, 5), circle(100, 60, 5), circle(160, 60, 5));
    const { shapes, holes, warnings } = parseDxf(doc);
    expect(shapes).toHaveLength(1);
    expect(holes).toBe(3);
    expect(warnings.join(" ")).not.toMatch(/borda em volta/);
  });

  it("não agrupa através de camadas: cotas ficam fora da peça", () => {
    const doc = dxfDoc(rect(0, 0, 100, 60), circle(50, 30, 5), rect(10, 10, 20, 20, "COTAS"));
    const { shapes, holes, layers } = parseDxf(doc);
    expect(holes).toBe(1);
    expect(layers.map((l) => l.name).sort()).toEqual(["0", "COTAS"]);
    expect(shapes).toHaveLength(2);
    // o retângulo de COTAS entra inteiro, não como furo da peça
    expect(shapes.some((s) => s.kind === "path" && !(s as PathShape).holes)).toBe(true);
  });

  it("options.layers descarta as camadas não escolhidas", () => {
    const doc = dxfDoc(rect(0, 0, 100, 60), circle(50, 30, 5), rect(10, 10, 20, 20, "COTAS"));
    const { shapes, layers } = parseDxf(doc, { layers: ["0"] });
    expect(shapes).toHaveLength(1);
    // a lista de camadas continua completa, para o diálogo poder oferecer as outras
    expect(layers).toHaveLength(2);
  });

  it("ilha dentro do furo volta a ser peça", () => {
    const doc = dxfDoc(rect(0, 0, 100, 60), circle(50, 30, 20), circle(50, 30, 5));
    const { shapes, holes } = parseDxf(doc);
    expect(holes).toBe(1);
    expect(shapes).toHaveLength(2);
    const ilha = shapes.find((s) => s.kind === "circle") as CircleShape;
    expect(ilha.radius).toBe(5);
  });

  it("isFrameLoop exige retângulo em volta de peças acabadas", () => {
    const frame: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]];
    const box = (x: number, y: number, s: number): [number, number][] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
    // duas peças, uma delas com furo → é moldura
    const parts = [box(10, 10, 30), box(20, 20, 10), box(60, 10, 30)];
    expect(isFrameLoop(frame, parts)).toBe(true);
    // só furos dentro → é uma chapa, não moldura
    expect(isFrameLoop(frame, [box(10, 10, 10), box(40, 10, 10)])).toBe(false);
    // uma peça só → ambíguo demais, não chuta
    expect(isFrameLoop(frame, [box(10, 10, 30), box(20, 20, 10)])).toBe(false);
    // contém tudo, mas é um losango: metade da área da caixa → não é moldura
    const diamond: [number, number][] = [[50, 0], [100, 50], [50, 100], [0, 50]];
    expect(isFrameLoop(diamond, parts)).toBe(false);
    expect(isFrameLoop(frame, [])).toBe(false);
  });
});
