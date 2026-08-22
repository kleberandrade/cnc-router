import type { PathShape, Shape } from "../types";
import { shapeToPoints, type Point } from "./geometry";
import { meshPart } from "./fem/mesh";

/**
 * Peça pronta em 3D (Sprint 31): o sólido implícito que o app sempre teve — contorno + furos +
 * espessura — vira malha de triângulos (tampas + paredes) para a vista 3D e para a análise.
 * Sem modelador, sem passo extra: é extrusão do desenho 2D.
 */

export interface ExtrudedMesh {
  /** Posições xyz intercaladas, mm (Z para cima, base em z = 0). */
  positions: Float32Array;
  /** Normais por vértice. */
  normals: Float32Array;
  /** Índices, 3 por triângulo. */
  indices: Uint32Array;
}

const loopsOf = (shape: Shape): { outer: Point[]; holes: Point[][] } => ({
  outer: shapeToPoints(shape),
  holes: shape.kind === "path" ? (shape as PathShape).holes ?? [] : [],
});

/** Área com sinal (CCW positiva). */
const signedArea = (pts: Point[]): number => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

/**
 * Extruda a peça para a espessura dada. `h` controla a densidade das tampas (padrão: adaptativo,
 * mirando ~2k triângulos por tampa — o suficiente para furos redondos saírem redondos).
 */
export function extrudeShape(shape: Shape, thickness: number, h?: number): ExtrudedMesh {
  const { outer, holes } = loopsOf(shape);
  return extrudeRegion(outer, holes, thickness, h);
}

/** Extrusão de um contorno + furos crus — é como o conjunto colado (Sprint 33) vira 3D. */
export function extrudeRegion(outer: Point[], holes: Point[][], thickness: number, h?: number): ExtrudedMesh {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of outer) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  const step = h ?? Math.max(1, Math.max(maxX - minX, maxY - minY) / 40);
  const cap = meshPart(outer, holes, { h: step });

  const nCap = cap.nodes.length / 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // tampa de cima (z = thickness, normal +z) e de baixo (z = 0, normal -z)
  for (let i = 0; i < nCap; i++) { positions.push(cap.nodes[2 * i], cap.nodes[2 * i + 1], thickness); normals.push(0, 0, 1); }
  for (let i = 0; i < nCap; i++) { positions.push(cap.nodes[2 * i], cap.nodes[2 * i + 1], 0); normals.push(0, 0, -1); }
  for (let t = 0; t < cap.tris.length; t += 3) {
    const [a, b, c] = [cap.tris[t], cap.tris[t + 1], cap.tris[t + 2]];
    indices.push(a, b, c);                       // topo CCW visto de cima
    indices.push(nCap + a, nCap + c, nCap + b);  // fundo invertido
  }

  // paredes: cada laço vira uma tira de quads com normal própria (vértices duplicados por face).
  // Num laço CCW o interior fica à esquerda do sentido de percurso — a direita é "para fora" do
  // sólido; num furo CW, a direita aponta para dentro do furo, que também é "para fora" do sólido.
  const wall = (loop: Point[]) => {
    const n = loop.length;
    for (let i = 0; i < n; i++) {
      const a = loop[i], b = loop[(i + 1) % n];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-9) continue;
      const nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len; // direita do sentido a→b
      const base = positions.length / 3;
      positions.push(a[0], a[1], 0, b[0], b[1], 0, b[0], b[1], thickness, a[0], a[1], thickness);
      for (let k = 0; k < 4; k++) normals.push(nx, ny, 0);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };
  wall(signedArea(outer) >= 0 ? outer : [...outer].reverse());          // contorno em CCW
  for (const hole of holes) wall(signedArea(hole) >= 0 ? [...hole].reverse() : hole); // furos em CW

  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}

/** Volume do sólido extrudado, mm³ (sanidade: área da tampa × espessura). */
export function extrudedVolume(mesh: ExtrudedMesh): number {
  // soma dos volumes assinados dos tetraedros (origem como apex)
  let v = 0;
  const p = mesh.positions, ix = mesh.indices;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    v += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1])
        - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c])
        + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
  }
  return Math.abs(v);
}
