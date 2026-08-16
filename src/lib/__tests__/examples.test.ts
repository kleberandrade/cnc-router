import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { EXAMPLES, findExample, examplesByCategory } from "../../content/examples";
import { validateProject, hasErrors } from "../validate";
import { tryGenerateGCode } from "../gcode";
import { registerFont } from "../text";
import { estimateTime } from "../timing";
import { buildToolpath } from "../toolpath";

beforeAll(() => {
  for (const f of ["Regular", "Bold"]) {
    const buf = readFileSync(`public/fonts/Inter-${f}.ttf`);
    registerFont(f === "Bold" ? "inter-bold" : "inter", buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  // examples that import SVG fetch from /examples/*.svg → serve from public/
  vi.stubGlobal("fetch", async (url: string) => new Response(readFileSync(`public${url}`, "utf8")));
});

describe("exemplos", () => {
  it("há ≥ 9 exemplos em ≥ 4 categorias; todos validam sem erro, geram G-code e cabem na chapa", async () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(9);
    expect(examplesByCategory().length).toBeGreaterThanOrEqual(4);
    for (const ex of EXAMPLES) {
      const { shapes, settings } = await ex.build();
      expect(shapes.length, ex.id).toBeGreaterThan(0);
      const issues = validateProject(shapes, settings);
      expect(hasErrors(issues), `${ex.id}: ${issues.map((i) => i.message).join("; ")}`).toBe(false);
      const g = tryGenerateGCode(shapes, settings);
      expect(g.ok, ex.id).toBe(true);
      // every shape lies inside the stock (validateProject already errors when outside the table; here: inside the sheet)
      expect(issues.filter((i) => i.code === "shape-outside-stock"), ex.id).toEqual([]);
      const t = estimateTime(buildToolpath(shapes, settings).segments, { rapidRate: settings.rapidRate, accel: settings.accel }).total;
      expect(t, `${ex.id} tempo`).toBeGreaterThan(10);
      expect(t, `${ex.id} tempo`).toBeLessThan(4 * 3600);
    }
    expect(findExample("nope")).toBeUndefined();
  });
  it("placa: 4 furações + rebaixo + recorte; letreiro tem texto; escudos usam booleanas/níveis; SVGs têm furos", async () => {
    const placa = await findExample("placa-furos")!.build();
    expect(placa.shapes.filter((s) => s.operation === "drill")).toHaveLength(4);
    const let_ = await findExample("letreiro")!.build();
    expect(let_.shapes.some((s) => s.kind === "text")).toBe(true);
    const sp = await findExample("escudo-spfc")!.build();
    expect(new Set(sp.shapes.map((s) => s.depth)).size).toBeGreaterThanOrEqual(3);
    const co = await findExample("escudo-corinthians")!.build();
    expect(co.shapes.some((s) => s.extraOps?.length)).toBe(true);
    const gato = await findExample("placa-gato")!.build();
    expect(gato.shapes.some((s) => s.kind === "path" && (s.holes?.length ?? 0) >= 3)).toBe(true);
    const pata = await findExample("placa-pata")!.build();
    expect(pata.shapes.filter((s) => s.operation === "pocket").length).toBeGreaterThanOrEqual(5);
  });
});
