import type { Point } from "../geometry";
import { pointInPoly } from "../text";

/**
 * Malha triangular para a análise de resistência (Sprint 31).
 *
 * Estratégia: pontos de contorno amostrados a cada `h` + grade regular interna, triangulados por
 * Delaunay (Bowyer–Watson) e filtrados pelo centroide (dentro do contorno, fora dos furos).
 * A grade dá triângulos bem formados no miolo — onde ear-clipping produziria lascas que
 * envenenam a rigidez do CST — e o contorno amostrado carrega o id do lado de origem,
 * que é como apoios e cargas chegam aos nós certos.
 */

export interface FemMesh {
  /** [x0, y0, x1, y1, …] em mm. */
  nodes: Float64Array;
  /** Índices dos vértices, 3 por triângulo. */
  tris: Uint32Array;
  /**
   * Lados que cada nó de contorno toca (um nó de canto pertence a dois). -1 = nenhum.
   * `nodeSideLenA/B` é o comprimento tributário daquele lado no nó — é assim que a carga
   * total vira forças nodais consistentes, sem canto puxando torto.
   */
  nodeSideA: Int32Array;
  nodeSideB: Int32Array;
  nodeSideLenA: Float64Array;
  nodeSideLenB: Float64Array;
}

/** Nó pertence a um dos lados do conjunto? */
export function nodeOnSides(mesh: FemMesh, i: number, sides: ReadonlySet<number>): boolean {
  return (mesh.nodeSideA[i] >= 0 && sides.has(mesh.nodeSideA[i])) || (mesh.nodeSideB[i] >= 0 && sides.has(mesh.nodeSideB[i]));
}

/** Comprimento tributário do nó restrito aos lados do conjunto, mm. */
export function nodeLenOnSides(mesh: FemMesh, i: number, sides: ReadonlySet<number>): number {
  let len = 0;
  if (mesh.nodeSideA[i] >= 0 && sides.has(mesh.nodeSideA[i])) len += mesh.nodeSideLenA[i];
  if (mesh.nodeSideB[i] >= 0 && sides.has(mesh.nodeSideB[i])) len += mesh.nodeSideLenB[i];
  return len;
}

export interface MeshOptions {
  /** Espaçamento alvo da malha, mm. */
  h: number;
}

/**
 * Lados selecionáveis de um laço: arestas consecutivas com mudança de direção < 30° viram um lado
 * só (retângulo → 4 lados; círculo amostrado → 1). Curvas suaves também separam: quando a direção
 * deriva mais de ~60° desde o início do lado, começa um lado novo — é o que faz cantos
 * arredondados dividirem as arestas retas em lados distintos (Sprint 34). A exceção é o laço
 * uniforme (círculo amostrado: arestas parecidas, sem canto vivo), que continua um lado só para
 * a borda de um furo redondo seguir selecionável num clique.
 * Determinístico — a UI e o worker derivam o mesmo.
 */
export function boundarySides(loop: Point[], angleDeg = 30, curveDeg = 60): number[] {
  const n = loop.length;
  const sideOfEdge = new Array<number>(n).fill(0);
  const dir = (i: number): Point => {
    const a = loop[i], b = loop[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  };
  const turnAt = (i: number): number => {
    const d0 = dir((i - 1 + n) % n), d1 = dir(i);
    return Math.acos(Math.max(-1, Math.min(1, d0[0] * d1[0] + d0[1] * d1[1])));
  };
  const sharp = (angleDeg * Math.PI) / 180;
  const curve = (curveDeg * Math.PI) / 180;

  // laço uniforme (círculo amostrado): sem canto vivo e arestas de comprimento parecido → 1 lado
  const lens = [];
  for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n];
    lens.push(Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const sorted = [...lens].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)] || 1;
  let hasSharp = false;
  for (let i = 0; i < n; i++) if (turnAt(i) >= sharp) { hasSharp = true; break; }
  if (!hasSharp && Math.max(...lens) <= 3 * median) return sideOfEdge;

  let side = 0;
  let drift = 0; // curvatura acumulada desde o início do lado atual
  for (let i = 1; i < n; i++) {
    const t = turnAt(i);
    if (t >= sharp || drift + t > curve) { side++; drift = 0; }
    else drift += t;
    sideOfEdge[i] = side;
  }
  // fecha o laço: se a última aresta continua na direção da primeira, funde os lados das pontas
  if (side > 0) {
    if (turnAt(0) < sharp && drift + turnAt(0) <= curve) {
      const last = sideOfEdge[n - 1];
      for (let i = 0; i < n; i++) if (sideOfEdge[i] === last) sideOfEdge[i] = 0;
      // renumera para ids contíguos
      const map = new Map<number, number>();
      for (let i = 0; i < n; i++) {
        if (!map.has(sideOfEdge[i])) map.set(sideOfEdge[i], map.size);
        sideOfEdge[i] = map.get(sideOfEdge[i])!;
      }
    }
  }
  return sideOfEdge;
}

interface BoundaryPoint { x: number; y: number; sideA: number; sideB: number; lenA: number; lenB: number }

/**
 * Amostra um laço a cada ~h. Cada trecho entre amostras pertence a um lado; a metade de cada
 * trecho vai para os nós das pontas — no canto, o nó acumula tributos dos dois lados.
 */
function sampleLoop(loop: Point[], h: number, sideBase: number): BoundaryPoint[] {
  const sides = boundarySides(loop);
  const pts: { x: number; y: number; edgeSide: number; segLen: number }[] = [];
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-9) continue;
    const steps = Math.max(1, Math.round(len / h));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      // edgeSide/segLen descrevem o trecho que COMEÇA neste ponto
      pts.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, edgeSide: sideBase + sides[i], segLen: len / steps });
    }
  }
  const m = pts.length;
  const out: BoundaryPoint[] = [];
  for (let i = 0; i < m; i++) {
    const cur = pts[i], prev = pts[(i - 1 + m) % m];
    const acc = new Map<number, number>();
    acc.set(cur.edgeSide, (acc.get(cur.edgeSide) ?? 0) + cur.segLen / 2);
    acc.set(prev.edgeSide, (acc.get(prev.edgeSide) ?? 0) + prev.segLen / 2);
    const entries = [...acc.entries()];
    out.push({
      x: cur.x, y: cur.y,
      sideA: entries[0][0], lenA: entries[0][1],
      sideB: entries[1]?.[0] ?? -1, lenB: entries[1]?.[1] ?? 0,
    });
  }
  return out;
}

/* ---------- Delaunay (Bowyer–Watson) ---------- */

interface Tri { a: number; b: number; c: number; cx: number; cy: number; r2: number }

function circum(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): { x: number; y: number; r2: number } | null {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  const dx = ux - ax, dy = uy - ay;
  return { x: ux, y: uy, r2: dx * dx + dy * dy };
}

/** Delaunay de um conjunto de pontos (x/y intercalados). Devolve triângulos CCW. */
export function delaunay(px: Float64Array): Uint32Array {
  const n = px.length / 2;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, px[2 * i]); maxX = Math.max(maxX, px[2 * i]);
    minY = Math.min(minY, px[2 * i + 1]); maxY = Math.max(maxY, px[2 * i + 1]);
  }
  const d = Math.max(maxX - minX, maxY - minY) * 10 + 1;
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  // super-triângulo
  const pts = new Float64Array(px.length + 6);
  pts.set(px);
  pts.set([midX - d, midY - d, midX + d, midY - d, midX, midY + d], px.length);
  const S = n, tris: Tri[] = [];
  const mk = (a: number, b: number, c: number): Tri | null => {
    const cc = circum(pts[2 * a], pts[2 * a + 1], pts[2 * b], pts[2 * b + 1], pts[2 * c], pts[2 * c + 1]);
    return cc ? { a, b, c, cx: cc.x, cy: cc.y, r2: cc.r2 } : null;
  };
  const t0 = mk(S, S + 1, S + 2);
  if (t0) tris.push(t0);
  for (let p = 0; p < n; p++) {
    const x = pts[2 * p], y = pts[2 * p + 1];
    const bad: number[] = [];
    for (let t = 0; t < tris.length; t++) {
      const dx = x - tris[t].cx, dy = y - tris[t].cy;
      if (dx * dx + dy * dy <= tris[t].r2) bad.push(t);
    }
    // borda do buraco = arestas que aparecem uma vez só
    const edges = new Map<string, [number, number]>();
    for (const t of bad) {
      const { a, b, c } = tris[t];
      for (const [u, v] of [[a, b], [b, c], [c, a]] as [number, number][]) {
        const key = u < v ? `${u}:${v}` : `${v}:${u}`;
        if (edges.has(key)) edges.delete(key);
        else edges.set(key, [u, v]);
      }
    }
    for (let i = bad.length - 1; i >= 0; i--) tris.splice(bad[i], 1);
    for (const [u, v] of edges.values()) {
      const nt = mk(u, v, p);
      if (nt) tris.push(nt);
    }
  }
  const out: number[] = [];
  for (const t of tris) {
    if (t.a >= S || t.b >= S || t.c >= S) continue;
    // orientação CCW
    const ax = pts[2 * t.a], ay = pts[2 * t.a + 1], bx = pts[2 * t.b], by = pts[2 * t.b + 1], cx2 = pts[2 * t.c], cy2 = pts[2 * t.c + 1];
    const area2 = (bx - ax) * (cy2 - ay) - (cx2 - ax) * (by - ay);
    if (Math.abs(area2) < 1e-9) continue;
    if (area2 > 0) out.push(t.a, t.b, t.c);
    else out.push(t.a, t.c, t.b);
  }
  return new Uint32Array(out);
}

/** Ids de lado de uma peça: lados do contorno primeiro, depois os de cada furo (offset contínuo). */
export function partSides(outer: Point[], holes: Point[][]): { outer: number[]; holes: number[][]; count: number } {
  const o = boundarySides(outer);
  let base = Math.max(...o) + 1;
  const hs: number[][] = [];
  for (const h of holes) {
    const s = boundarySides(h);
    hs.push(s.map((x) => x + base));
    base += Math.max(...s) + 1;
  }
  return { outer: o, holes: hs, count: base };
}

/** Malha da peça (contorno + furos) com espaçamento ~h. */
export function meshPart(outer: Point[], holes: Point[][], opts: MeshOptions): FemMesh {
  const h = opts.h;
  const boundary: BoundaryPoint[] = sampleLoop(outer, h, 0);
  let sideBase = Math.max(...boundarySides(outer)) + 1;
  for (const hole of holes) {
    boundary.push(...sampleLoop(hole, h, sideBase));
    sideBase += Math.max(...boundarySides(hole)) + 1;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of outer) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }

  const inside = (x: number, y: number): boolean => {
    const p: Point = [x, y];
    if (!pointInPoly(p, outer)) return false;
    for (const hole of holes) if (pointInPoly(p, hole)) return false;
    return true;
  };
  const distToBoundary2 = (x: number, y: number): number => {
    let best = Infinity;
    for (const b of boundary) {
      const dx = x - b.x, dy = y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return best;
  };

  // grade interna: afastada ≥ 0,6h do contorno para não criar lascas; jitter determinístico quebra
  // as cocircularidades da grade (degeneram o Bowyer–Watson)
  const pts: number[] = [];
  const sA: number[] = [], sB: number[] = [], lA: number[] = [], lB: number[] = [];
  for (const b of boundary) { pts.push(b.x, b.y); sA.push(b.sideA); sB.push(b.sideB); lA.push(b.lenA); lB.push(b.lenB); }
  const jitter = (i: number, j: number) => (((i * 73856093) ^ (j * 19349663)) % 1000) / 1000 - 0.5;
  const clear2 = (0.6 * h) * (0.6 * h);
  let row = 0;
  for (let y = minY + h; y < maxY - h / 2; y += h, row++) {
    let col = 0;
    for (let x = minX + h; x < maxX - h / 2; x += h, col++) {
      const jx = x + jitter(row, col) * 0.2 * h;
      const jy = y + jitter(col, row) * 0.2 * h;
      if (!inside(jx, jy)) continue;
      if (distToBoundary2(jx, jy) < clear2) continue;
      pts.push(jx, jy); sA.push(-1); sB.push(-1); lA.push(0); lB.push(0);
    }
  }

  const nodes = new Float64Array(pts);
  const all = delaunay(nodes);
  // filtra pelo centroide (o Delaunay fecha o casco convexo — furos e concavidades saem aqui)
  const kept: number[] = [];
  for (let t = 0; t < all.length; t += 3) {
    const a = all[t], b = all[t + 1], c = all[t + 2];
    const cx = (nodes[2 * a] + nodes[2 * b] + nodes[2 * c]) / 3;
    const cy = (nodes[2 * a + 1] + nodes[2 * b + 1] + nodes[2 * c + 1]) / 3;
    if (inside(cx, cy)) kept.push(a, b, c);
  }
  return {
    nodes, tris: new Uint32Array(kept),
    nodeSideA: new Int32Array(sA), nodeSideB: new Int32Array(sB),
    nodeSideLenA: new Float64Array(lA), nodeSideLenB: new Float64Array(lB),
  };
}

/** Soma das áreas dos triângulos, mm² (teste de sanidade da malha). */
export function meshArea(mesh: FemMesh): number {
  let area = 0;
  const { nodes, tris } = mesh;
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    area += Math.abs((nodes[2 * b] - nodes[2 * a]) * (nodes[2 * c + 1] - nodes[2 * a + 1]) - (nodes[2 * c] - nodes[2 * a]) * (nodes[2 * b + 1] - nodes[2 * a + 1])) / 2;
  }
  return area;
}
