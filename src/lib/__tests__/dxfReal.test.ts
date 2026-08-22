import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDxf } from "../dxfImport";
import { boundingBox, shapeToPoints } from "../geometry";
import type { CircleShape, PathShape } from "../../types";

/**
 * Corpus de DXF "do mundo real": arquivos com a estrutura que os CAD de verdade exportam
 * (HEADER completo, TABLES, BLOCKS, POLYLINE antiga com VERTEX/SEQEND, blocos com INSERT).
 * É onde os bugs de parser moram — os demais testes usam DXF mínimos, sintéticos.
 *
 * Para engordar o corpus: exporte do seu CAD e solte o arquivo em `fixtures/real/` — o teste de
 * fumaça pega todo `.dxf` da pasta automaticamente (abre sem exceção e produz ≥ 1 peça).
 */
const DIR = join(__dirname, "fixtures", "real");

describe("DXF de CAD reais — fumaça", () => {
  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".dxf"))) {
    it(`${file} abre sem exceção e produz peças`, () => {
      const { shapes, layers } = parseDxf(readFileSync(join(DIR, file), "utf8"));
      expect(shapes.length).toBeGreaterThanOrEqual(1);
      expect(layers.length).toBeGreaterThanOrEqual(1);
      for (const s of shapes) {
        const b = boundingBox(shapeToPoints(s));
        expect(Number.isFinite(b.minX)).toBe(true);
        expect(Number.isFinite(b.maxY)).toBe(true);
      }
    });
  }
});

describe("DXF de CAD reais — comportamento", () => {
  it("LibreCAD: POLYLINE antiga fecha, furos agrupam na camada PECAS, cotas ficam de fora", () => {
    const { shapes, holes, layers } = parseDxf(readFileSync(join(DIR, "librecad-placa.dxf"), "utf8"));
    expect(layers.map((l) => l.name).sort()).toEqual(["COTAS", "PECAS"]);
    expect(holes).toBe(2);
    const part = shapes.find((s): s is PathShape => s.kind === "path" && !!s.holes?.length);
    expect(part?.holes).toHaveLength(2);
    // a linha de cota continua no projeto, mas como traço aberto — nunca como furo da peça
    expect(shapes.some((s) => s.kind === "path" && !(s as PathShape).closed)).toBe(true);
  });

  it("Fusion: polegadas convertem, bulge vira arco, INSERT traz os furos do bloco", () => {
    const { shapes } = parseDxf(readFileSync(join(DIR, "fusion-inch.dxf"), "utf8"), { inferHoles: false });
    const outline = shapes.find((s): s is PathShape => s.kind === "path" && s.closed);
    expect(outline).toBeTruthy();
    const b = boundingBox(outline!.points);
    expect(b.maxX - b.minX).toBeCloseTo(4 * 25.4, 0); // 4 pol = 101,6 mm
    expect(outline!.points.length).toBeGreaterThan(6); // o bulge virou pontos de arco
    const furos = shapes.filter((s): s is CircleShape => s.kind === "circle");
    expect(furos).toHaveLength(2);
    expect(furos[0].radius).toBeCloseTo(0.125 * 25.4, 2);
  });

  it("QCAD: spline e elipse amostram; polilinha aberta continua aberta; sem unidade assume mm", () => {
    const { shapes, warnings } = parseDxf(readFileSync(join(DIR, "qcad-curvas.dxf"), "utf8"));
    expect(warnings.join(" ")).toContain("assumindo milímetros");
    expect(shapes.filter((s) => s.kind === "path" && !(s as PathShape).closed).length).toBeGreaterThanOrEqual(2);
    const closed = shapes.filter((s) => s.kind === "path" && (s as PathShape).closed);
    expect(closed.length).toBeGreaterThanOrEqual(1); // a elipse fecha
  });
});
