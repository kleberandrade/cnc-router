import { describe, it, expect } from "vitest";
import { EXAMPLES, findExample } from "../../content/examples";
import { validateProject, hasErrors } from "../validate";
import { tryGenerateGCode } from "../gcode";
import { nestShapes } from "../nesting";

describe("exemplos", () => {
  it("há 3 exemplos, todos validam sem erro e geram G-code", () => {
    expect(EXAMPLES).toHaveLength(3);
    for (const ex of EXAMPLES) {
      const { shapes, settings } = ex.build();
      expect(shapes.length).toBeGreaterThan(0);
      const issues = validateProject(shapes, settings);
      expect(hasErrors(issues), `${ex.id}: ${issues.map((i) => i.message).join("; ")}`).toBe(false);
      const g = tryGenerateGCode(shapes, settings);
      expect(g.ok, ex.id).toBe(true);
      // every example fits the sheet without nesting
      const res = nestShapes(shapes, { width: settings.stock.width, height: settings.stock.height, spacing: 4, allowRotate: true });
      expect(res.overflow, ex.id).toEqual([]);
    }
    expect(findExample("nope")).toBeUndefined();
  });
  it("placa: 4 furações + rebaixo + recorte; letreiro tem texto", () => {
    const placa = findExample("placa-furos")!.build();
    expect(placa.shapes.filter((s) => s.operation === "drill")).toHaveLength(4);
    expect(placa.shapes.some((s) => s.operation === "pocket")).toBe(true);
    const let_ = findExample("letreiro")!.build();
    expect(let_.shapes.some((s) => s.kind === "text")).toBe(true);
  });
});
