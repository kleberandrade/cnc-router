import { describe, it, expect } from "vitest";
import { setupSheet, technicalDrawing, assemblyDrawingShapes, dimensionsFor, fitScale, type SheetDerived } from "../sheet";
import { computeDerived } from "../derivedCompute";
import { DEFAULT_MACHINE_SETTINGS, type MachineSettings, type PathShape, type RectangleShape, type Shape } from "../../types";

const rectPts = (x: number, y: number, w: number, h: number): [number, number][] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const circlePts = (cx: number, cy: number, r: number, n = 24): [number, number][] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

const flange = (): PathShape => ({
  id: "flange", kind: "path", closed: true, depth: 18, cutThrough: true, operation: "outline", side: "outside",
  name: "Flange", points: rectPts(10, 10, 100, 60),
  holes: [circlePts(30, 40, 5), circlePts(60, 40, 5), circlePts(90, 40, 5), rectPts(45, 20, 30, 8)],
});

const settings = (): MachineSettings => ({ ...DEFAULT_MACHINE_SETTINGS, projectName: "Suporte da furadeira" });

const derivedOf = (shapes: Shape[], s = settings()): SheetDerived => computeDerived(shapes, s);

describe("dimensionsFor", () => {
  it("flange: medidas gerais, furos agrupados com posição, rasgo", () => {
    const labels = dimensionsFor(flange()).map((d) => `${d.kind}:${d.label}`);
    expect(labels).toContain("width:100");
    expect(labels).toContain("height:60");
    expect(labels).toContain("hole:3× Ø10");
    expect(labels).toContain("position:X 20 · Y 30");
    expect(labels).toContain("slot:30 × 8");
  });

  it("retângulo com fillet ganha R; círculo ganha Ø; rasgo ganha comprimento × largura", () => {
    const r: RectangleShape = { id: "r", kind: "rectangle", x: 0, y: 0, width: 80, height: 40, rotation: 0, depth: 5, operation: "outline", corners: { type: "fillet", size: 6 } };
    expect(dimensionsFor(r).map((d) => d.label)).toContain("R6");
    expect(dimensionsFor({ id: "c", kind: "circle", x: 0, y: 0, radius: 25, depth: 5, operation: "outline" }).map((d) => d.label)).toContain("Ø50");
    expect(dimensionsFor({ id: "s", kind: "slot", x: 0, y: 0, length: 50, width: 12, rotation: 0, depth: 5, operation: "outline" }).map((d) => d.label)).toContain("50 × 12");
  });
});

describe("fitScale", () => {
  it("prefere 1:1 e desce em escalas padrão", () => {
    expect(fitScale(100, 60, 170, 220)).toEqual({ scale: 1, label: "1:1" });
    expect(fitScale(300, 200, 170, 220)).toEqual({ scale: 1 / 2, label: "1:2" });
    expect(fitScale(1300, 200, 170, 220)).toEqual({ scale: 1 / 10, label: "1:10" });
  });
});

describe("setupSheet", () => {
  it("traz origem, chapa, fresas extras com as peças, tempo por peça e avisos", () => {
    const s: MachineSettings = {
      ...settings(),
      tools: [{ id: "t1", name: "Fresa fina", type: "flat", diameter: 2, vbitAngle: 60 }],
    };
    const shapes: Shape[] = [{ ...flange(), toolId: "t1" }];
    const { html, title } = setupSheet(shapes, s, derivedOf(shapes, s), { date: "2026-08-22" });
    expect(title).toBe("Folha de oficina");
    expect(html).toContain("Suporte da furadeira");
    expect(html).toContain("frente esquerda");            // origem padrão
    expect(html).toContain("300 × 200 × 18 mm");           // chapa padrão
    expect(html).toContain("Fresa fina (troca M0)");
    expect(html).toContain("Flange");                      // peça listada e associada à fresa
    expect(html).toMatch(/Tempo total<\/td><td><strong>[^<]+/);
    expect(html).not.toContain("undefined");
  });

  it("projeto com problema mostra a seção de conferência", () => {
    const bad: Shape[] = [{ ...flange(), depth: 99, cutThrough: false }];
    const { html } = setupSheet(bad, settings(), derivedOf(bad));
    expect(html).toContain("Confira antes de rodar");
  });

  it("peça escondida fica fora da folha", () => {
    const shapes: Shape[] = [flange(), { ...flange(), id: "x", name: "Escondida", hidden: true }];
    const { html } = setupSheet(shapes, settings(), derivedOf(shapes));
    expect(html).not.toContain("Escondida");
  });
});

describe("assemblyDrawingShapes", () => {
  const rect = (p: Partial<RectangleShape>): RectangleShape => ({
    id: "r", kind: "rectangle", x: 0, y: 0, width: 100, height: 60, rotation: 0,
    depth: 18, operation: "outline", side: "outside", ...p,
  });

  it("tábua-like: chapa + rasgo passante vira uma página de conjunto com o furo descontado", () => {
    const board = rect({ id: "b", width: 380, height: 210 });
    const slot = rect({ id: "s", x: 300, y: 90, width: 60, height: 22, side: "inside", cutThrough: true });
    const asm = assemblyDrawingShapes([board, slot], settings());
    expect(asm).toHaveLength(1);
    expect(asm[0].name).toBe("Conjunto (peças coladas)");
    expect(asm[0].holes).toHaveLength(1);
    const [page] = technicalDrawing(asm, settings());
    expect(page.title).toContain("Conjunto");
  });

  it("duas peças encostadas colam numa página; peça sozinha não duplica", () => {
    const a = rect({ id: "a" });
    const b = rect({ id: "b", x: 100 });
    expect(assemblyDrawingShapes([a, b], settings())).toHaveLength(1);
    expect(assemblyDrawingShapes([a], settings())).toHaveLength(0);
    // duas peças longe, sem recorte: nada colou, nada a mostrar
    expect(assemblyDrawingShapes([a, rect({ id: "c", x: 200 })], settings())).toHaveLength(0);
  });
});

describe("technicalDrawing", () => {
  it("uma página por peça, com cotas, chamada de furos e carimbo", () => {
    const pages = technicalDrawing([flange()], settings(), { date: "2026-08-22" });
    expect(pages).toHaveLength(1);
    const svg = pages[0].html;
    expect(pages[0].title).toBe("Desenho — Flange");
    expect(svg).toContain("3× Ø10");
    expect(svg).toContain("X 20 · Y 30");
    expect(svg).toContain("esc. 1:1");
    expect(svg).toContain("imprima em 100%");
    expect(svg).toContain("Suporte da furadeira");
    expect(svg).toContain("(1/1)");
  });

  it("peça maior que a folha desce para a escala que cabe — mesmo pedindo 1:1", () => {
    const big: PathShape = { ...flange(), points: rectPts(0, 0, 500, 400), holes: [] };
    const [auto] = technicalDrawing([big], settings());
    expect(auto.html).toContain("esc. 1:5");
    const [forced] = technicalDrawing([big], settings(), { scale: "1:1" });
    expect(forced.html).toContain("esc. 1:5");
  });

  it("o SVG declara o tamanho físico da página em mm (base do 1:1)", () => {
    const [page] = technicalDrawing([flange()], settings());
    expect(page.html).toContain('style="width:210mm;height:297mm"');
    expect(page.html).toContain('viewBox="0 0 210 297"');
  });
});

describe("derivedCompute — timePerShape", () => {
  it("soma por peça bate com o total e dobra o id expandido de volta", () => {
    const shapes: Shape[] = [
      { id: "a", kind: "rectangle", x: 10, y: 10, width: 60, height: 40, rotation: 0, depth: 4, operation: "outline", side: "outside" },
      { id: "b", kind: "text", x: 90, y: 40, text: "Oi", fontId: "inter", size: 20, rotation: 0, align: "left", letterSpacing: 0, depth: 1, operation: "outline", side: "on",
        extraOps: [{ id: "op1", operation: "pocket", depth: 2 }] },
    ];
    const d = computeDerived(shapes, DEFAULT_MACHINE_SETTINGS);
    const sum = Object.values(d.timePerShape).reduce((x, y) => x + y, 0);
    expect(sum).toBeGreaterThan(0);
    expect(sum).toBeLessThanOrEqual(d.time + 1e-6);
    // texto expandido (b#0~0 etc.) volta para "b"
    expect(Object.keys(d.timePerShape).sort()).toEqual(["a", "b"].filter((id) => d.timePerShape[id] !== undefined).sort());
  });
});
