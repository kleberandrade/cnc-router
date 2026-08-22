import { runFemJob, type FemJob } from "../lib/fem/job";

/** Worker da análise de resistência (Sprint 31): malha + CST + CG fora da thread principal. */
self.onmessage = (e: MessageEvent<{ id: number; job: FemJob }>) => {
  const { id, job } = e.data;
  try {
    const result = runFemJob(job);
    (self as unknown as Worker).postMessage({ id, ok: true, result }, [
      result.nodes.buffer, result.tris.buffer, result.disp.buffer, result.vonMises.buffer,
    ] as unknown as Transferable[]);
  } catch {
    (self as unknown as Worker).postMessage({ id, ok: false });
  }
};
