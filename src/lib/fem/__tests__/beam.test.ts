import { describe, it, expect } from "vitest";
import { shelfBeam } from "../beam";

describe("fem/beam — prateleira", () => {
  // prateleira de pinus: vão 800, largura 250, chapa 18, E 9 GPa
  const base = { span: 800, width: 250, thickness: 18, E: 9000 };

  it("carga distribuída bate com a fórmula 5FL³/384EI (±2%)", () => {
    const r = shelfBeam({ ...base, loadKg: 20, loadType: "distributed" });
    const I = (250 * 18 ** 3) / 12;
    const exact = (5 * 20 * 9.81 * 800 ** 3) / (384 * 9000 * I);
    expect(Math.abs(r.deflection - exact) / exact).toBeLessThan(0.02);
    expect(r.visibleLimit).toBeCloseTo(800 / 300, 3);
  });

  it("carga no meio cede mais que a mesma carga espalhada", () => {
    const dist = shelfBeam({ ...base, loadKg: 20, loadType: "distributed" });
    const point = shelfBeam({ ...base, loadKg: 20, loadType: "point" });
    expect(point.deflection).toBeGreaterThan(dist.deflection);
    expect(point.deflection / dist.deflection).toBeCloseTo(1.6, 5); // (1/48)/(5/384) = 1,6
    expect(point.stress).toBeGreaterThan(dist.stress);
  });

  it("chapa mais grossa ajuda ao cubo: 18 → 25 mm derruba a flecha ~2,7×", () => {
    const t18 = shelfBeam({ ...base, loadKg: 20, loadType: "distributed" });
    const t25 = shelfBeam({ ...base, thickness: 25, loadKg: 20, loadType: "distributed" });
    expect(t18.deflection / t25.deflection).toBeGreaterThan(2.4);
    expect(t18.deflection / t25.deflection).toBeLessThan(2.9);
  });

  it("números plausíveis de oficina: 20 kg em 800 mm de pinus 18 verga alguns mm", () => {
    const r = shelfBeam({ ...base, loadKg: 20, loadType: "distributed" });
    expect(r.deflection).toBeGreaterThan(0.5);
    expect(r.deflection).toBeLessThan(10);
    expect(r.stress).toBeLessThan(40); // abaixo da resistência típica do pinus
  });
});
