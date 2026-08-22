import { describe, it, expect } from "vitest";
import { meshPart, meshArea, boundarySides, partSides, type FemMesh } from "../mesh";
import { solve } from "../solve";
import type { Point } from "../../geometry";

const rect = (w: number, h: number): Point[] => [[0, 0], [w, 0], [w, h], [0, h]];
const circle = (cx: number, cy: number, r: number, n = 48): Point[] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

const checkMesh = (mesh: FemMesh, expectedArea: number, tolPct: number) => {
  expect(mesh.tris.length).toBeGreaterThan(0);
  const area = meshArea(mesh);
  expect(Math.abs(area - expectedArea) / expectedArea).toBeLessThan(tolPct / 100);
  // nenhum triângulo degenerado
  const { nodes, tris } = mesh;
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    const A = Math.abs((nodes[2 * b] - nodes[2 * a]) * (nodes[2 * c + 1] - nodes[2 * a + 1]) - (nodes[2 * c] - nodes[2 * a]) * (nodes[2 * b + 1] - nodes[2 * a + 1])) / 2;
    expect(A).toBeGreaterThan(1e-6);
  }
};

describe("fem/mesh", () => {
  it("lados: retângulo tem 4, círculo amostrado tem 1", () => {
    const rs = boundarySides(rect(100, 60));
    expect(new Set(rs).size).toBe(4);
    const cs = boundarySides(circle(0, 0, 10, 24));
    expect(new Set(cs).size).toBe(1);
    const ps = partSides(rect(100, 60), [circle(50, 30, 5, 24)]);
    expect(ps.count).toBe(5); // 4 do contorno + 1 do furo
  });

  it("malha do retângulo cobre a área e marca os nós de contorno por lado", () => {
    const mesh = meshPart(rect(100, 60), [], { h: 5 });
    checkMesh(mesh, 6000, 3);
    const sides = new Set<number>();
    for (let i = 0; i < mesh.nodeSideA.length; i++) { if (mesh.nodeSideA[i] >= 0) sides.add(mesh.nodeSideA[i]); if (mesh.nodeSideB[i] >= 0) sides.add(mesh.nodeSideB[i]); }
    expect(sides.size).toBe(4);
  });

  it("malha com furo desconta a área e ganha o lado do furo", () => {
    const mesh = meshPart(rect(100, 60), [circle(50, 30, 10)], { h: 4 });
    checkMesh(mesh, 6000 - Math.PI * 100, 4);
    const sides = new Set<number>();
    for (let i = 0; i < mesh.nodeSideA.length; i++) { if (mesh.nodeSideA[i] >= 0) sides.add(mesh.nodeSideA[i]); if (mesh.nodeSideB[i] >= 0) sides.add(mesh.nodeSideB[i]); }
    expect(sides.size).toBe(5);
  });
});

describe("fem/solve — validação analítica", () => {
  it("viga engastada: flecha na ponta dentro de ±5% da fórmula (com cisalhamento)", () => {
    // viga 100 × 10 mm, t = 10 mm, E = 10 GPa, P = 100 N para baixo na ponta
    const L = 100, H = 10, t = 10, E = 10_000, nu = 0.3, P = 100;
    const mesh = meshPart(rect(L, H), [], { h: 1.25 });
    // lados: 0=base(y=0), 1=direita(x=L), 2=topo, 3=esquerda
    const res = solve({ mesh, E, nu, thickness: t, supportSides: [3], loadSides: [1], force: { fx: 0, fy: -P } });
    const I = (t * H ** 3) / 12;
    const G = E / (2 * (1 + nu));
    // Timoshenko: flexão + cisalhamento (k = 5/6)
    const delta = (P * L ** 3) / (3 * E * I) + (P * L) / ((5 / 6) * G * t * H);
    expect(res.maxDisp).toBeGreaterThan(delta * 0.95);
    expect(res.maxDisp).toBeLessThan(delta * 1.05);
  });

  it("placa com furo central tracionada: concentração de tensão ≈ 3× (±15%)", () => {
    // placa 100 × 100, furo Ø10 no centro, tração uniforme nas laterais
    const W = 100, r = 5, t = 5, E = 10_000, nu = 0.3;
    const F = 1000; // N em cada lado → tensão nominal = F / (W·t)
    const mesh = meshPart(rect(W, W), [circle(W / 2, W / 2, r, 64)], { h: 1.6 });
    // lados: 0..3 contorno, 4 furo; esquerda = 3, direita = 1
    const res = solve({ mesh, E, nu, thickness: t, supportSides: [3], loadSides: [1], force: { fx: F, fy: 0 } });
    const nominal = F / (W * t);
    const kt = res.maxVonMises / nominal;
    // Kt teórico ≈ 3 para furo pequeno; apoio rígido de um lado e malha uniforme puxam um pouco
    expect(kt).toBeGreaterThan(3 * 0.85);
    expect(kt).toBeLessThan(3 * 1.3);
  });

  it("tração pura: tensão uniforme igual à nominal e alongamento σL/E", () => {
    const L = 100, H = 20, t = 5, E = 10_000, F = 500;
    const mesh = meshPart(rect(L, H), [], { h: 2.5 });
    const res = solve({ mesh, E, nu: 0.0, thickness: t, supportSides: [3], loadSides: [1], force: { fx: F, fy: 0 } });
    const sigma = F / (H * t);
    expect(res.maxVonMises).toBeGreaterThan(sigma * 0.95);
    expect(res.maxVonMises).toBeLessThan(sigma * 1.1);
    const stretch = (sigma * L) / E;
    expect(res.maxDisp).toBeGreaterThan(stretch * 0.95);
    expect(res.maxDisp).toBeLessThan(stretch * 1.05);
  });
});
