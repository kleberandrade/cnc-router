import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { EXAMPLES, findExample, examplesByCategory, slotFor, fingerJointEdge, TAG_LABEL, type ExampleTag } from "../../content/examples";
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
  vi.stubGlobal("fetch", async (url: string) => new Response(readFileSync(`public${url}`)));
});

describe("exemplos", () => {
  it("há ≥ 14 exemplos em ≥ 5 categorias; todos validam sem erro, geram G-code e cabem na chapa", async () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(14);
    expect(examplesByCategory().length).toBeGreaterThanOrEqual(5);
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
  }, 30_000);
  it("placa: 4 furações + rebaixo + recorte; letreiro tem texto; placa/relógio/engrenagens usam níveis, extraOps e booleanas; SVGs têm furos", async () => {
    const placa = await findExample("placa-furos")!.build();
    expect(placa.shapes.filter((s) => s.operation === "drill")).toHaveLength(4);
    const nc = await findExample("numero-casa")!.build();
    expect(new Set(nc.shapes.map((s) => s.depth)).size).toBeGreaterThanOrEqual(3);
    const rl = await findExample("relogio-parede")!.build();
    expect(rl.shapes.some((s) => s.extraOps?.length)).toBe(true);
    expect(rl.shapes.filter((s) => s.name?.startsWith("Marca")).length).toBe(12);
    const gears = await findExample("engrenagens")!.build();
    expect(gears.shapes.some((s) => s.kind === "path" && (s.holes?.length ?? 0) === 4)).toBe(true);
    const fox = await findExample("placa-raposa")!.build();
    expect(fox.shapes.some((s) => s.kind === "path" && (s.holes?.length ?? 0) >= 3)).toBe(true);
    expect(fox.shapes.filter((s) => s.operation === "pocket").length).toBeGreaterThanOrEqual(2);
    const relief = await findExample("relevo-oficina")!.build();
    expect(relief.shapes[0].kind).toBe("relief");
    const pata = await findExample("placa-pata")!.build();
    expect(pata.shapes.filter((s) => s.operation === "pocket").length).toBeGreaterThanOrEqual(5);
  });
});

describe("sprint 26: encaixes, tags, nesting", () => {
  it("slotFor dá folga; fingerJointEdge gera dentes complementares com folga", () => {
    expect(slotFor(12)).toBe(12.2);
    expect(slotFor(6, 0.1)).toBe(6.1);
    const a = fingerJointEdge(100, 6, 5, 0.15, true), b = fingerJointEdge(100, 6, 5, 0.15, false);
    expect(a.filter((p) => p[1] === -6).length).toBe(6); // 3 dentes × 2 pontos
    expect(b.filter((p) => p[1] === -6).length).toBe(4); // 2 dentes
    expect(a[0][0]).toBe(0.15); // folga no dente
  });
  it("todo exemplo tem ≥ 1 tag e toda tag aparece em ≥ 1 exemplo", () => {
    for (const ex of EXAMPLES) expect(ex.tags.length, ex.id).toBeGreaterThan(0);
    for (const t of Object.keys(TAG_LABEL) as ExampleTag[]) expect(EXAMPLES.some((e) => e.tags.includes(t)), t).toBe(true);
  });
  it("suporte: rasgos = espessura + 0,2; caixa: 5 peças dentro da chapa sem sobreposição; dobradiça ≥ 50 rasgos; gabarito 12 furos", async () => {
    const sc = await findExample("suporte-celular")!.build();
    const slots = sc.shapes.filter((s) => s.name?.startsWith("Rasgo"));
    expect(slots).toHaveLength(2);
    expect(slots.every((s) => s.kind === "rectangle" && s.width === 12.2)).toBe(true);
    const cx = await findExample("caixa-dedos")!.build();
    expect(cx.shapes).toHaveLength(5);
    const dv = await findExample("dobradica-viva")!.build();
    expect(dv.shapes.filter((s) => s.kind === "slot").length).toBeGreaterThanOrEqual(30);
    const gb = await findExample("gabarito-32")!.build();
    expect(gb.shapes.filter((s) => s.operation === "drill")).toHaveLength(12);
    const dp = await findExample("descanso-panela")!.build();
    expect(dp.shapes.filter((s) => s.tabs).length).toBe(2);
  });
});
