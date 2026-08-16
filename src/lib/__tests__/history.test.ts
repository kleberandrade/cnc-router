import { describe, it, expect } from "vitest";
import { describeStep } from "../history";
import { DEFAULT_MACHINE_SETTINGS, type Shape } from "../../types";

const S = DEFAULT_MACHINE_SETTINGS;
const r = (id: string, x = 0, extra: Partial<Shape> = {}): Shape => ({ id, kind: "rectangle", x, y: 0, width: 10, height: 10, rotation: 0, depth: 1, operation: "outline", ...extra } as Shape);

describe("describeStep", () => {
  it("add / remove / move / edit / settings / reorder / load", () => {
    expect(describeStep({ shapes: [], settings: S }, { shapes: [r("a")], settings: S })).toMatchObject({ kind: "add", label: "Adicionar retângulo", ids: ["a"] });
    expect(describeStep({ shapes: [r("a", 0, { name: "Placa" })], settings: S }, { shapes: [], settings: S })).toMatchObject({ kind: "remove", label: "Excluir Placa" });
    expect(describeStep({ shapes: [r("a")], settings: S }, { shapes: [r("a", 5)], settings: S })).toMatchObject({ kind: "move", label: "Mover retângulo" });
    expect(describeStep({ shapes: [r("a")], settings: S }, { shapes: [r("a", 0, { depth: 4 })], settings: S })).toMatchObject({ kind: "edit", label: "Editar retângulo (depth)" });
    expect(describeStep({ shapes: [], settings: S }, { shapes: [], settings: { ...S, stock: { ...S.stock, width: 1 } } })).toMatchObject({ kind: "settings", label: "Chapa" });
    expect(describeStep({ shapes: [r("a"), r("b")], settings: S }, { shapes: [r("b"), r("a")], settings: S })).toMatchObject({ label: "Reordenar peças" });
    expect(describeStep({ shapes: [r("a"), r("b")], settings: S }, { shapes: [r("c"), r("d"), r("e")], settings: S })).toMatchObject({ kind: "load" });
    expect(describeStep({ shapes: [r("a")], settings: S }, { shapes: [r("a")], settings: S })).toMatchObject({ kind: "unknown" });
  });
});
