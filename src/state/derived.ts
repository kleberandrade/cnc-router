import { create } from "zustand";
import { useProjectStore } from "./store";
import { onFontsChanged } from "../lib/text";
import { computeDerived, projectHash, type Derived } from "../lib/derivedCompute";
import type { Shape, MachineSettings } from "../types";

/**
 * Derived data (validation, toolpath, time) kept off the click path (Sprint 27):
 * the project store changes → we hash it → ask a Web Worker (latest request wins) → publish here.
 * Without `Worker` (tests, old browsers) it computes synchronously, so the store is always consistent.
 */
export interface DerivedState extends Derived {
  status: "idle" | "computing" | "ready";
  /** Hash of the project the current data belongs to. */
  hash: string;
}

const EMPTY: Derived = { issues: [], segments: [], warnings: [], shapeCount: 0, time: 0, timePerShape: {} };
export const useDerivedStore = create<DerivedState>()(() => ({ ...EMPTY, status: "idle", hash: "" }));

const cache = new Map<string, Derived>();
const CACHE_MAX = 24;
function remember(hash: string, d: Derived) {
  cache.set(hash, d);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

let worker: Worker | null = null;
let seq = 0;
let fontsGen = 0;
let started = false;

function hasWorker(): boolean {
  return typeof Worker !== "undefined" && typeof window !== "undefined" && !("__vitest_worker__" in globalThis) && import.meta.env.MODE !== "test";
}

function getWorker(): Worker | null {
  if (!hasWorker()) return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("../workers/derived.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent<{ id: number; result: Derived }>) => {
        const { id, result } = e.data;
        if (id !== seq) return; // stale
        const hash = pendingHash;
        remember(hash, result);
        useDerivedStore.setState({ ...result, status: "ready", hash });
      };
      worker.onerror = () => { worker = null; recompute(); };
    } catch { worker = null; }
  }
  return worker;
}

let pendingHash = "";
function recompute() {
  const { shapes, settings } = useProjectStore.getState();
  const hash = projectHash(shapes, settings, String(fontsGen));
  if (hash === useDerivedStore.getState().hash && useDerivedStore.getState().status === "ready") return;
  const hit = cache.get(hash);
  if (hit) { useDerivedStore.setState({ ...hit, status: "ready", hash }); return; }
  const w = getWorker();
  if (!w) {
    const d = computeDerived(shapes, settings);
    remember(hash, d);
    useDerivedStore.setState({ ...d, status: "ready", hash });
    return;
  }
  seq += 1;
  pendingHash = hash;
  useDerivedStore.setState({ status: "computing" });
  w.postMessage({ id: seq, shapes, settings });
}

/** Start following the project store (idempotent). Called by the hooks below and by main.tsx. */
export function startDerived(): void {
  if (started) return;
  started = true;
  recompute();
  let last: { shapes: Shape[]; settings: MachineSettings } | null = null;
  useProjectStore.subscribe((s) => {
    if (last && last.shapes === s.shapes && last.settings === s.settings) return;
    last = { shapes: s.shapes, settings: s.settings };
    recompute();
  });
  onFontsChanged(() => { fontsGen += 1; cache.clear(); recompute(); });
}

/** Force a synchronous recompute (tests). */
export function _recomputeDerivedNow(): void {
  const { shapes, settings } = useProjectStore.getState();
  const hash = projectHash(shapes, settings, String(fontsGen));
  const d = computeDerived(shapes, settings);
  remember(hash, d);
  useDerivedStore.setState({ ...d, status: "ready", hash });
}

/** Derived data for components (with an optional selector so they only re-render for what they use); starts the pipeline on first use. */
export function useDerived(): DerivedState;
export function useDerived<T>(selector: (s: DerivedState) => T): T;
export function useDerived<T>(selector?: (s: DerivedState) => T): T | DerivedState {
  if (!started) startDerived();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return selector ? useDerivedStore(selector) : useDerivedStore();
}
