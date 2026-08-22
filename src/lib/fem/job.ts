import type { Point } from "../geometry";
import { meshPart } from "./mesh";
import { solve } from "./solve";

/** Job da análise no plano — puro: é o contrato entre a UI, o worker e os testes. */
export interface FemJob {
  outer: Point[];
  holes: Point[][];
  h: number;
  E: number;
  nu: number;
  strength: number;
  thickness: number;
  supports: number[];
  loads: number[];
  force: { fx: number; fy: number };
}

export interface AnalysisResultData {
  nodes: Float64Array;
  tris: Uint32Array;
  disp: Float64Array;
  vonMises: Float64Array;
  maxVonMises: number;
  maxDisp: number;
  /** Tensão máxima / resistência típica do material. */
  utilization: number;
}

/** Resolve um job (roda no worker e no fallback síncrono dos testes). */
export function runFemJob(job: FemJob): AnalysisResultData {
  const mesh = meshPart(job.outer, job.holes, { h: job.h });
  const res = solve({ mesh, E: job.E, nu: job.nu, thickness: job.thickness, supportSides: job.supports, loadSides: job.loads, force: job.force });
  return {
    nodes: mesh.nodes, tris: mesh.tris,
    disp: res.disp, vonMises: res.vonMises,
    maxVonMises: res.maxVonMises, maxDisp: res.maxDisp,
    utilization: job.strength > 0 ? res.maxVonMises / job.strength : 0,
  };
}
