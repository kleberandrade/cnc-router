import { describe, it, expect } from "vitest";
import { extrudeShape, extrudedVolume } from "../extrude";
import type { PathShape, RectangleShape, CircleShape } from "../../types";

const rect: RectangleShape = { id: "r", kind: "rectangle", x: 0, y: 0, width: 100, height: 60, rotation: 0, depth: 18, operation: "outline" };
const circleShape: CircleShape = { id: "c", kind: "circle", x: 50, y: 50, radius: 30, depth: 18, operation: "outline" };
const circlePts = (cx: number, cy: number, r: number, n = 32): [number, number][] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

describe("extrudeShape — peça pronta em 3D", () => {
  it("retângulo 100×60×18: volume bate e a malha é consistente", () => {
    const m = extrudeShape(rect, 18);
    expect(m.indices.length % 3).toBe(0);
    expect(m.positions.length).toBe(m.normals.length);
    const vol = extrudedVolume(m);
    expect(Math.abs(vol - 100 * 60 * 18) / (100 * 60 * 18)).toBeLessThan(0.03);
    // z só em 0 e 18
    for (let i = 2; i < m.positions.length; i += 3) {
      expect(m.positions[i] === 0 || m.positions[i] === 18).toBe(true);
    }
  });

  it("furo desconta o volume (flange com furo central)", () => {
    const flange: PathShape = {
      id: "f", kind: "path", closed: true, depth: 10, operation: "outline",
      points: [[0, 0], [100, 0], [100, 60], [0, 60]],
      holes: [circlePts(50, 30, 10)],
    };
    const m = extrudeShape(flange, 10, 2);
    const expected = (100 * 60 - Math.PI * 100) * 10;
    expect(Math.abs(extrudedVolume(m) - expected) / expected).toBeLessThan(0.04);
  });

  it("círculo extrudado vira cilindro com volume πr²t", () => {
    const m = extrudeShape(circleShape, 12);
    const expected = Math.PI * 30 * 30 * 12;
    expect(Math.abs(extrudedVolume(m) - expected) / expected).toBeLessThan(0.05);
  });

  it("normais das paredes apontam para fora (produto com o raio positivo no cilindro)", () => {
    const m = extrudeShape(circleShape, 12);
    let outward = 0, total = 0;
    for (let v = 0; v < m.positions.length / 3; v++) {
      const nz = m.normals[3 * v + 2];
      if (nz !== 0) continue; // só paredes
      const px = m.positions[3 * v] - 50, py = m.positions[3 * v + 1] - 50;
      const dot = px * m.normals[3 * v] + py * m.normals[3 * v + 1];
      total++;
      if (dot > 0) outward++;
    }
    expect(total).toBeGreaterThan(0);
    expect(outward / total).toBeGreaterThan(0.99);
  });
});
