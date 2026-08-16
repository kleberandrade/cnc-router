import { describe, it, expect } from "vitest";
import { encodeGrid, reliefGrid, reliefDepthAt, reliefLines } from "../relief";
import { buildToolpath } from "../toolpath";
import { verifyProject } from "../verify";
import { DEFAULT_MACHINE_SETTINGS, type ReliefShape } from "../../types";

const ramp = (cols: number, rows: number): ReliefShape => {
  const g = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g[r * cols + c] = Math.round((255 * c) / (cols - 1)); // black left → white right
  return { id: "rl", kind: "relief", x: 20, y: 20, width: 60, height: 30, cols, rows, data: encodeGrid(g), depthMax: 4, depth: 4, operation: "pocket" };
};

describe("relevo", () => {
  it("codifica/decodifica a grade e amostra profundidade (preto = fundo, branco = 0)", () => {
    const s = ramp(61, 31);
    const g = reliefGrid(s);
    expect(g.length).toBe(61 * 31);
    expect(reliefDepthAt(s, g, 20, 35)).toBeCloseTo(4, 1);   // left edge → black → 4 mm
    expect(reliefDepthAt(s, g, 80, 35)).toBeCloseTo(0, 1);   // right edge → white
    expect(reliefDepthAt(s, g, 50, 35)).toBeCloseTo(2, 0);   // middle
    expect(reliefDepthAt(s, g, 5, 5)).toBe(0);               // outside
    expect(reliefDepthAt({ ...s, invert: true }, g, 20, 35)).toBeCloseTo(0, 1);
  });
  it("linhas raster: fresa esférica nunca corta abaixo do alvo, fresa reta segue o máximo da janela", () => {
    const s = ramp(61, 31);
    const S = { ...DEFAULT_MACHINE_SETTINGS, stepover: 2 };
    const ball = reliefLines(s, S, { type: "ball", radius: 1.5, angle: 0 });
    expect(ball.length).toBeGreaterThan(10);
    const g = reliefGrid(s);
    for (const ln of ball) for (let i = 0; i < ln.pts.length; i++) expect(ln.z[i]).toBeGreaterThanOrEqual(-reliefDepthAt(s, g, ln.pts[i][0], ln.pts[i][1]) - 1e-6);
    const flat = reliefLines(s, S, { type: "flat", radius: 3, angle: 0 });
    // flat tool at x=50: window reaches x=53 where the surface is shallower → tip must stay above the shallowest point in the window
    const mid = flat[5].pts.findIndex((p) => Math.abs(p[0] - 50) < 0.6);
    expect(flat[5].z[mid]).toBeGreaterThan(-reliefDepthAt(s, g, 50, flat[5].pts[mid][1]));
  });
  it("percurso: linhas contínuas (sem mergulho por linha), passes de desbaste, e o simulador/verificação entendem", () => {
    const s = ramp(31, 16);
    const S = { ...DEFAULT_MACHINE_SETTINGS, stepover: 2, passDepth: 2, toolType: "ball" as const };
    const tp = buildToolpath([s], S);
    const seg = tp.segments.filter((x) => x.op === "relief");
    expect(seg.length).toBeGreaterThan(50);
    const plunges = seg.filter((x) => x.type === "plunge").length;
    expect(plunges).toBeLessThanOrEqual(2 * 2); // ≤ 1 per pass (+ tolerance)
    expect(seg.some((x) => x.type === "feed" && x.from[2] !== x.to[2])).toBe(true); // Z varies along the line
    const rep = verifyProject([s], S, { res: 0.5 });
    expect(rep.gougeArea).toBeLessThanOrEqual(2);
  });
});
