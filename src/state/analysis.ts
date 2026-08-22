import { create } from "zustand";
import { useProjectStore } from "./store";
import { findMaterial } from "../lib/materials";
import { shapeToPoints, boundingBox, type Point } from "../lib/geometry";

import { runFemJob, type FemJob, type AnalysisResultData } from "../lib/fem/job";
import { shelfBeam, type BeamResult } from "../lib/fem/beam";
import { glueParts, GLUE_TOL } from "../lib/fem/assembly";
import { shapeRegions, type Region } from "../lib/boolean";
import type { PathShape, Shape } from "../types";
export type { FemJob, AnalysisResultData } from "../lib/fem/job";

/**
 * Estação Resistência (Sprint 31). A conta pesada roda em `workers/fem.worker.ts` (última
 * requisição vence); nos testes, o fallback síncrono mantém o store determinístico.
 * Tudo aqui é orientativo — o aviso na estação é permanente por decisão de projeto.
 */

export type AnalysisMode = "inplane" | "shelf";
export type AnalysisScope = "part" | "assembly";
export type LoadDir = "down" | "up" | "left" | "right";


interface AnalysisState {
  mode: AnalysisMode;
  /** Peça única (como sempre) ou o conjunto de peças encostadas, coladas (Sprint 33). */
  scope: AnalysisScope;
  shapeId: string | null;
  /** Lados apoiados / carregados (ids de `partSides`). */
  supports: number[];
  loads: number[];
  loadKg: number;
  loadDir: LoadDir;
  /** Ferramenta ativa ao clicar num lado. */
  tool: "support" | "load";
  showDeformed: boolean;
  status: "idle" | "running" | "ready" | "error";
  error: string | null;
  result: AnalysisResultData | null;
  // prateleira
  shelfSpan: number;
  shelfLoadKg: number;
  shelfLoadType: "distributed" | "point";
  shelfResult: (BeamResult & { utilization: number; widthUsed: number }) | null;

  setMode: (m: AnalysisMode) => void;
  setScope: (s: AnalysisScope) => void;
  setShape: (id: string | null) => void;
  setTool: (t: "support" | "load") => void;
  toggleSide: (side: number) => void;
  setLoadKg: (v: number) => void;
  setLoadDir: (d: LoadDir) => void;
  setShowDeformed: (v: boolean) => void;
  setShelfSpan: (v: number) => void;
  setShelfLoadKg: (v: number) => void;
  setShelfLoadType: (t: "distributed" | "point") => void;
  clear: () => void;
}

export const useAnalysisStore = create<AnalysisState>()((set, get) => ({
  mode: "inplane",
  scope: "part",
  shapeId: null,
  supports: [],
  loads: [],
  loadKg: 10,
  loadDir: "down",
  tool: "support",
  showDeformed: true,
  status: "idle",
  error: null,
  result: null,
  shelfSpan: 800,
  shelfLoadKg: 20,
  shelfLoadType: "distributed",
  shelfResult: null,
  // a prateleira é um conceito de chapa única: mudar para ela volta o escopo (lados mudam de dono)
  setMode: (mode) =>
    mode === "shelf" && get().scope === "assembly"
      ? set({ mode, scope: "part", supports: [], loads: [], result: null, status: "idle", error: null })
      : set({ mode }),
  setScope: (scope) => set({ scope, supports: [], loads: [], result: null, status: "idle", error: null }),
  setShape: (shapeId) => set({ shapeId, supports: [], loads: [], result: null, status: "idle", error: null }),
  setTool: (tool) => set({ tool }),
  toggleSide: (side) => {
    const st = get();
    const list = st.tool === "support" ? "supports" : "loads";
    const other = st.tool === "support" ? "loads" : "supports";
    const has = st[list].includes(side);
    set({
      [list]: has ? st[list].filter((s) => s !== side) : [...st[list], side],
      [other]: st[other].filter((s) => s !== side),
      result: null, status: "idle",
    } as Partial<AnalysisState>);
  },
  setLoadKg: (loadKg) => set({ loadKg, result: null, status: "idle" }),
  setLoadDir: (loadDir) => set({ loadDir, result: null, status: "idle" }),
  setShowDeformed: (showDeformed) => set({ showDeformed }),
  setShelfSpan: (shelfSpan) => set({ shelfSpan, shelfResult: null }),
  setShelfLoadKg: (shelfLoadKg) => set({ shelfLoadKg, shelfResult: null }),
  setShelfLoadType: (shelfLoadType) => set({ shelfLoadType, shelfResult: null }),
  clear: () => set({ supports: [], loads: [], result: null, shelfResult: null, status: "idle", error: null }),
}));

/** Peças fechadas que a análise aceita (a geometria vem normalizada para a origem da caixa). */
export function analyzableShapes(): Shape[] {
  return useProjectStore.getState().shapes.filter((s) => !s.hidden && s.kind !== "text" && s.kind !== "relief");
}

export function analysisGeometry(shape: Shape): { outer: Point[]; holes: Point[][] } {
  return { outer: shapeToPoints(shape), holes: shape.kind === "path" ? (shape as PathShape).holes ?? [] : [] };
}

/** Peças visíveis coladas (folga até 0,5 mm conta como encostado): uma região por grupo conectado. */
export function assemblyRegions(shapes: Shape[] = analyzableShapes()): Region[] {
  return glueParts(shapes.flatMap(shapeRegions), GLUE_TOL);
}

/** Geometria que a análise vai malhar, pelo escopo atual — ou o motivo de não dar. */
export function analysisTarget(): { outer: Point[]; holes: Point[][] } | { error: string } {
  const st = useAnalysisStore.getState();
  if (st.scope === "assembly") {
    const regions = assemblyRegions();
    if (regions.length === 0) return { error: "Desenhe ou importe uma peça fechada antes de analisar." };
    if (regions.length > 1)
      return { error: `As peças formam ${regions.length} grupos separados. Encoste as peças: folga de até ${GLUE_TOL.toLocaleString("pt-BR")} mm fecha como colado.` };
    return regions[0];
  }
  const shape = useProjectStore.getState().shapes.find((s) => s.id === st.shapeId);
  if (!shape) return { error: "Escolha uma peça para analisar." };
  return analysisGeometry(shape);
}

const G = 9.81;
const DIR: Record<LoadDir, { fx: number; fy: number }> = {
  down: { fx: 0, fy: -1 }, up: { fx: 0, fy: 1 }, left: { fx: -1, fy: 0 }, right: { fx: 1, fy: 0 },
};


/** Monta o job a partir do estado atual (null quando falta apoio, carga ou peça). */
export function buildJob(): FemJob | null {
  const st = useAnalysisStore.getState();
  const target = analysisTarget();
  if ("error" in target || st.supports.length === 0 || st.loads.length === 0 || st.loadKg <= 0) return null;
  const { outer, holes } = target;
  const settings = useProjectStore.getState().settings;
  const material = findMaterial(settings.material);
  const b = boundingBox(outer);
  const span = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  const h = Math.max(1, Math.min(5, span / 60)); // ~60 elementos no maior vão
  const F = st.loadKg * G;
  const d = DIR[st.loadDir];
  return {
    outer, holes, h,
    E: material?.youngMPa ?? 3000,
    nu: material?.poisson ?? 0.3,
    strength: material?.strengthMPa ?? 18,
    thickness: settings.stock.thickness,
    supports: st.supports, loads: st.loads,
    force: { fx: d.fx * F, fy: d.fy * F },
  };
}


let worker: Worker | null = null;
let seq = 0;
const inTest = typeof globalThis !== "undefined" && "__vitest_worker__" in globalThis;
const hasWorker = typeof Worker !== "undefined" && !inTest && import.meta.env.MODE !== "test";

/** Dispara a análise no plano (worker; síncrona nos testes). */
export function runAnalysis(): void {
  const target = analysisTarget();
  if ("error" in target) {
    useAnalysisStore.setState({ status: "error", error: target.error });
    return;
  }
  const job = buildJob();
  if (!job) {
    useAnalysisStore.setState({ status: "error", error: "Marque pelo menos um lado apoiado e um lado com carga (e uma carga > 0)." });
    return;
  }
  const id = ++seq;
  useAnalysisStore.setState({ status: "running", error: null });
  if (!hasWorker) {
    try {
      const result = runFemJob(job);
      useAnalysisStore.setState({ status: "ready", result });
    } catch {
      useAnalysisStore.setState({ status: "error", error: "A conta não fechou nessa geometria. Confira a peça e tente de novo." });
    }
    return;
  }
  if (!worker) {
    worker = new Worker(new URL("../workers/fem.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: AnalysisResultData; error?: string }>) => {
      if (e.data.id !== seq) return; // chegou tarde: outra análise já foi pedida
      if (e.data.ok && e.data.result) useAnalysisStore.setState({ status: "ready", result: e.data.result });
      else useAnalysisStore.setState({ status: "error", error: "A conta não fechou nessa geometria. Confira a peça e tente de novo." });
    };
  }
  worker.postMessage({ id, job });
}

/** Calcula a prateleira (fórmula fechada — instantânea, sem worker). */
export function runShelf(): void {
  const st = useAnalysisStore.getState();
  const shape = useProjectStore.getState().shapes.find((s) => s.id === st.shapeId);
  if (!shape) return;
  const settings = useProjectStore.getState().settings;
  const material = findMaterial(settings.material);
  const b = boundingBox(shapeToPoints(shape));
  // largura da prateleira = a dimensão da peça perpendicular ao vão (a menor das duas, tipicamente)
  const widthUsed = Math.min(b.maxX - b.minX, b.maxY - b.minY);
  const r = shelfBeam({
    span: st.shelfSpan, width: widthUsed, thickness: settings.stock.thickness,
    E: material?.youngMPa ?? 3000, loadKg: st.shelfLoadKg, loadType: st.shelfLoadType,
  });
  const utilization = (material?.strengthMPa ?? 18) > 0 ? r.stress / (material?.strengthMPa ?? 18) : 0;
  useAnalysisStore.setState({ shelfResult: { ...r, utilization, widthUsed }, status: "ready" });
}
