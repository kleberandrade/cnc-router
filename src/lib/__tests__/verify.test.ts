import { describe, it, expect } from "vitest";
import { verifyProject } from "../verify";
import { DEFAULT_MACHINE_SETTINGS, type Shape } from "../../types";

const S = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 6, stepover: 3, passDepth: 6, stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 120, height: 80, thickness: 12 } };

describe("verifyProject", () => {
  it("rectangular pocket: leftover only in the 4 corners (≈ (1−π/4)·r² each), no gouge", () => {
    const pocket: Shape = { id: "p", kind: "rectangle", x: 20, y: 20, width: 60, height: 40, rotation: 0, depth: 4, operation: "pocket" };
    const rep = verifyProject([pocket], S, { res: 0.5 });
    expect(rep.results).toHaveLength(1);
    const r = rep.results[0];
    const expected = 4 * (1 - Math.PI / 4) * 9; // r = 3 → ~7.7 mm²
    expect(r.leftoverArea).toBeGreaterThan(1);
    expect(r.leftoverArea).toBeLessThan(expected * 3);
    expect(r.leftoverRatio).toBeLessThan(0.02);
    expect(r.minRadius).toBe(3);
    expect(rep.gougeArea).toBeLessThanOrEqual(1);
    expect(rep.warnings).toEqual([]);
  });
  it("pocket narrower than the tool is reported as (mostly) not reached", () => {
    const narrow: Shape = { id: "n", kind: "rectangle", x: 20, y: 20, width: 60, height: 5, rotation: 0, depth: 3, operation: "pocket" };
    const rep = verifyProject([narrow], S, { res: 0.5 });
    expect(rep.results[0].leftoverRatio).toBeGreaterThan(0.9);
    expect(rep.warnings.some((w) => w.includes("não alcançados"))).toBe(true);
  });
  it("outside-compensated outline is not judged and does not count as gouge; hidden shapes are ignored", () => {
    const part: Shape = { id: "a", kind: "rectangle", x: 20, y: 20, width: 60, height: 40, rotation: 0, depth: 12.2, operation: "outline", side: "outside" };
    const hidden: Shape = { id: "h", kind: "rectangle", x: 20, y: 20, width: 10, height: 10, rotation: 0, depth: 3, operation: "pocket", hidden: true };
    const rep = verifyProject([part, hidden], S, { res: 0.5 });
    expect(rep.results).toHaveLength(0);
    expect(rep.gougeArea).toBeLessThanOrEqual(1);
  });
  it("extra operations (rebaixo + recorte) are verified per operation and machined", () => {
    const shape: Shape = { id: "x", kind: "rectangle", x: 20, y: 20, width: 60, height: 40, rotation: 0, depth: 12.2, operation: "outline", side: "outside", extraOps: [{ id: "o1", operation: "pocket", depth: 3 }] };
    const rep = verifyProject([shape], S, { res: 0.5 });
    expect(rep.results.map((r) => r.operation)).toEqual(["pocket"]);
    expect(rep.results[0].shapeId).toBe("x");
  });
});

describe("regressão: rebaixo de letra com furo (A) não corta fora da peça", () => {
  it("texto 'A' em rebaixo com fresa de 1 mm: 0 mm² fora e ~0 % não alcançado", async () => {
    const { registerFont } = await import("../text");
    const { readFileSync } = await import("node:fs");
    const buf = readFileSync("public/fonts/Inter-Bold.ttf");
    registerFont("inter-bold", buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const s = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 1, stepover: 0.5, passDepth: 1 };
    const t: Shape = { id: "t", kind: "text", x: 20, y: 20, text: "A", fontId: "inter-bold", size: 40, rotation: 0, align: "left", letterSpacing: 0, depth: 2, operation: "pocket" };
    const rep = verifyProject([t], s, { res: 0.25 });
    expect(rep.gougeArea).toBeLessThanOrEqual(1);
    expect(rep.results[0].leftoverRatio).toBeLessThan(0.02);
  });
});
