import { nodeOnSides, nodeLenOnSides, type FemMesh } from "./mesh";

/**
 * FEA 2D plane-stress com elementos CST (Sprint 31). Unidades: mm, N, MPa.
 * Solver: gradiente conjugado com pré-condicionador de Jacobi sobre a matriz esparsa —
 * malhas de bancada têm poucos milhares de nós e convergem em centenas de iterações.
 *
 * Números orientativos por natureza: E de madeira varia de chapa para chapa, o modelo é
 * isotrópico e 2D. O aviso na tela não é decoração.
 */

export interface FemProblem {
  mesh: FemMesh;
  /** Módulo de elasticidade, MPa. */
  E: number;
  /** Poisson. */
  nu: number;
  /** Espessura da chapa, mm. */
  thickness: number;
  /** Lados apoiados (fixos nos dois eixos). */
  supportSides: number[];
  /** Lados carregados. */
  loadSides: number[];
  /** Força total, N, repartida pelos lados carregados proporcionalmente ao comprimento. */
  force: { fx: number; fy: number };
}

export interface FemResult {
  /** Deslocamentos [ux0, uy0, …], mm. */
  disp: Float64Array;
  /** von Mises por nó (média ponderada por área dos elementos vizinhos), MPa. */
  vonMises: Float64Array;
  maxVonMises: number;
  /** Maior deslocamento resultante, mm. */
  maxDisp: number;
  /** Iterações do CG (diagnóstico). */
  iterations: number;
}

interface Sparse { // CSR simétrica completa
  rowStart: Int32Array;
  col: Int32Array;
  val: Float64Array;
  n: number;
}

function assemble(problem: FemProblem): { K: Sparse; f: Float64Array; fixed: Uint8Array } {
  const { mesh, E, nu, thickness } = problem;
  const nNodes = mesh.nodes.length / 2;
  const n = nNodes * 2;

  // D plane stress
  const c = E / (1 - nu * nu);
  const D = [c, c * nu, 0, c * nu, c, 0, 0, 0, c * (1 - nu) / 2];

  // triplets por nó (mapa por linha)
  const rows: Map<number, number>[] = Array.from({ length: n }, () => new Map());
  const add = (i: number, j: number, v: number) => {
    rows[i].set(j, (rows[i].get(j) ?? 0) + v);
  };

  const { nodes, tris } = mesh;
  for (let t = 0; t < tris.length; t += 3) {
    const ia = tris[t], ib = tris[t + 1], ic = tris[t + 2];
    const xa = nodes[2 * ia], ya = nodes[2 * ia + 1];
    const xb = nodes[2 * ib], yb = nodes[2 * ib + 1];
    const xc = nodes[2 * ic], yc = nodes[2 * ic + 1];
    const area2 = (xb - xa) * (yc - ya) - (xc - xa) * (yb - ya);
    const A = area2 / 2;
    if (A <= 1e-9) continue;
    const b0 = yb - yc, b1 = yc - ya, b2 = ya - yb;
    const g0 = xc - xb, g1 = xa - xc, g2 = xb - xa;
    // B (3×6) / (2A)
    const B = [
      b0, 0, b1, 0, b2, 0,
      0, g0, 0, g1, 0, g2,
      g0, b0, g1, b1, g2, b2,
    ].map((v) => v / area2);
    // K_e = t * A * Bᵀ D B
    const DB = new Float64Array(18);
    for (let r = 0; r < 3; r++) for (let ccol = 0; ccol < 6; ccol++) {
      DB[r * 6 + ccol] = D[r * 3] * B[ccol] + D[r * 3 + 1] * B[6 + ccol] + D[r * 3 + 2] * B[12 + ccol];
    }
    const dofs = [2 * ia, 2 * ia + 1, 2 * ib, 2 * ib + 1, 2 * ic, 2 * ic + 1];
    for (let r = 0; r < 6; r++) for (let cc2 = 0; cc2 < 6; cc2++) {
      let v = 0;
      for (let k = 0; k < 3; k++) v += B[k * 6 + r] * DB[k * 6 + cc2];
      add(dofs[r], dofs[cc2], v * thickness * A);
    }
  }

  // forças: cada nó dos lados carregados recebe a fração do seu comprimento tributário
  const f = new Float64Array(n);
  const loadSet = new Set(problem.loadSides);
  let totalLen = 0;
  for (let i = 0; i < nNodes; i++) totalLen += nodeLenOnSides(mesh, i, loadSet);
  if (totalLen > 0) {
    for (let i = 0; i < nNodes; i++) {
      const w = nodeLenOnSides(mesh, i, loadSet) / totalLen;
      if (w > 0) { f[2 * i] += problem.force.fx * w; f[2 * i + 1] += problem.force.fy * w; }
    }
  }

  // apoios (canto que toca um lado apoiado fica preso — é o que a braçadeira faz)
  const fixed = new Uint8Array(n);
  const supSet = new Set(problem.supportSides);
  for (let i = 0; i < nNodes; i++) {
    if (nodeOnSides(mesh, i, supSet)) { fixed[2 * i] = 1; fixed[2 * i + 1] = 1; }
  }

  // aplica Dirichlet: zera linha/coluna, 1 na diagonal
  for (let i = 0; i < n; i++) {
    if (fixed[i]) {
      rows[i].clear();
      rows[i].set(i, 1);
      f[i] = 0;
    } else {
      for (const j of [...rows[i].keys()]) if (fixed[j]) rows[i].delete(j);
    }
  }

  // CSR
  let nnz = 0;
  for (const r of rows) nnz += r.size;
  const rowStart = new Int32Array(n + 1);
  const col = new Int32Array(nnz);
  const val = new Float64Array(nnz);
  let p = 0;
  for (let i = 0; i < n; i++) {
    rowStart[i] = p;
    for (const [j, v] of rows[i]) { col[p] = j; val[p] = v; p++; }
  }
  rowStart[n] = p;
  return { K: { rowStart, col, val, n }, f, fixed };
}

function cg(K: Sparse, f: Float64Array, tol = 1e-9, maxIter = 20_000): { x: Float64Array; iterations: number } {
  const n = K.n;
  const x = new Float64Array(n);
  const r = Float64Array.from(f);
  const invDiag = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let p = K.rowStart[i]; p < K.rowStart[i + 1]; p++) if (K.col[p] === i) { invDiag[i] = 1 / K.val[p]; break; }
    if (!invDiag[i]) invDiag[i] = 1;
  }
  const z = new Float64Array(n);
  for (let i = 0; i < n; i++) z[i] = r[i] * invDiag[i];
  const d = Float64Array.from(z);
  let rz = 0;
  for (let i = 0; i < n; i++) rz += r[i] * z[i];
  const f2 = Math.max(1e-30, f.reduce((a, b) => a + b * b, 0));
  const q = new Float64Array(n);
  let it = 0;
  for (; it < maxIter; it++) {
    q.fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let p = K.rowStart[i]; p < K.rowStart[i + 1]; p++) s += K.val[p] * d[K.col[p]];
      q[i] = s;
    }
    let dq = 0;
    for (let i = 0; i < n; i++) dq += d[i] * q[i];
    if (dq <= 0) break;
    const alpha = rz / dq;
    let r2 = 0;
    for (let i = 0; i < n; i++) { x[i] += alpha * d[i]; r[i] -= alpha * q[i]; r2 += r[i] * r[i]; }
    if (r2 / f2 < tol * tol) { it++; break; }
    let rzNew = 0;
    for (let i = 0; i < n; i++) { z[i] = r[i] * invDiag[i]; rzNew += r[i] * z[i]; }
    const beta = rzNew / rz;
    rz = rzNew;
    for (let i = 0; i < n; i++) d[i] = z[i] + beta * d[i];
  }
  return { x, iterations: it };
}

/** Resolve o problema e devolve deslocamentos + von Mises nodal. */
export function solve(problem: FemProblem): FemResult {
  const { K, f } = assemble(problem);
  const { x: disp, iterations } = cg(K, f);

  const { mesh, E, nu } = problem;
  const nNodes = mesh.nodes.length / 2;
  const c = E / (1 - nu * nu);
  const D = [c, c * nu, 0, c * nu, c, 0, 0, 0, c * (1 - nu) / 2];
  const vmSum = new Float64Array(nNodes);
  const wSum = new Float64Array(nNodes);
  const { nodes, tris } = mesh;
  for (let t = 0; t < tris.length; t += 3) {
    const ia = tris[t], ib = tris[t + 1], ic = tris[t + 2];
    const xa = nodes[2 * ia], ya = nodes[2 * ia + 1];
    const xb = nodes[2 * ib], yb = nodes[2 * ib + 1];
    const xc = nodes[2 * ic], yc = nodes[2 * ic + 1];
    const area2 = (xb - xa) * (yc - ya) - (xc - xa) * (yb - ya);
    const A = area2 / 2;
    if (A <= 1e-9) continue;
    const b0 = yb - yc, b1 = yc - ya, b2 = ya - yb;
    const g0 = xc - xb, g1 = xa - xc, g2 = xb - xa;
    const u = [disp[2 * ia], disp[2 * ia + 1], disp[2 * ib], disp[2 * ib + 1], disp[2 * ic], disp[2 * ic + 1]];
    const ex = (b0 * u[0] + b1 * u[2] + b2 * u[4]) / area2;
    const ey = (g0 * u[1] + g1 * u[3] + g2 * u[5]) / area2;
    const gxy = (g0 * u[0] + b0 * u[1] + g1 * u[2] + b1 * u[3] + g2 * u[4] + b2 * u[5]) / area2;
    const sx = D[0] * ex + D[1] * ey;
    const sy = D[3] * ex + D[4] * ey;
    const txy = D[8] * gxy;
    const vm = Math.sqrt(Math.max(0, sx * sx + sy * sy - sx * sy + 3 * txy * txy));
    for (const i of [ia, ib, ic]) { vmSum[i] += vm * A; wSum[i] += A; }
  }
  const vonMises = new Float64Array(nNodes);
  let maxVm = 0, maxDisp = 0;
  for (let i = 0; i < nNodes; i++) {
    vonMises[i] = wSum[i] > 0 ? vmSum[i] / wSum[i] : 0;
    maxVm = Math.max(maxVm, vonMises[i]);
    maxDisp = Math.max(maxDisp, Math.hypot(disp[2 * i], disp[2 * i + 1]));
  }
  return { disp, vonMises, maxVonMises: maxVm, maxDisp, iterations };
}
