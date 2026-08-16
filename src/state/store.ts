import { translateShape } from "../lib/transform";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { temporal, type TemporalState } from "zundo";
import { useStore } from "zustand";
import type { Shape, MachineSettings } from "../types";
import { DEFAULT_MACHINE_SETTINGS } from "../types";
import { generateShapeId } from "../lib/ids";
import { presetIdForWorkArea } from "../lib/machinePresets";
import { applyMaterial, applyToolDiameter } from "../lib/materials";
import type { WorkArea, Stock, MaterialId, CutParamKey, Tool } from "../types";
import { THROUGH_CUT_EXTRA } from "../types";
import { boundingBox, shapeToPoints } from "../lib/geometry";
import { booleanShapes, type BooleanOp } from "../lib/boolean";
import { nestShapes, applyPlacements, type NestOptions, type NestResult } from "../lib/nesting";

/** Translate any shape by (dx, dy) mm. */
export { translateShape };

/** Depth a through-cut shape should have for a given stock thickness. */
export const throughCutDepth = (thickness: number) => Math.round((thickness + THROUGH_CUT_EXTRA) * 100) / 100;

export { generateShapeId };

/** localStorage key + schema version. Bump `PROJECT_SCHEMA_VERSION` and extend `migrateProject` on breaking changes. */
export const PROJECT_STORAGE_KEY = "oficina-cnc:project";
export const PROJECT_SCHEMA_VERSION = 7;

type PersistedProject = { shapes: Shape[]; settings: MachineSettings };

/** Migrates a persisted project from an older schema version. Unknown/invalid input falls back to defaults. */
export function migrateProject(persisted: unknown, version: number): PersistedProject {
  const p = (persisted ?? {}) as Partial<PersistedProject>;
  const shapes = Array.isArray(p.shapes) ? p.shapes : [];
  const raw = (p.settings ?? {}) as Partial<MachineSettings>;
  // v0/v1 -> v2: workArea/stock/machinePreset were introduced in sprint 01; fill from defaults.
  const settings: MachineSettings = {
    ...DEFAULT_MACHINE_SETTINGS,
    ...raw,
    workArea: { ...DEFAULT_MACHINE_SETTINGS.workArea, ...(raw.workArea ?? {}) },
    stock: { ...DEFAULT_MACHINE_SETTINGS.stock, ...(raw.stock ?? {}) },
  };
  if (version < 2 && !raw.machinePreset) {
    settings.machinePreset = presetIdForWorkArea(settings.workArea);
  }
  // v2 -> v3: material/stepover/overrides. Old projects keep their behaviour (stepover = 0.6 × Ø).
  if (version < 3) {
    if (raw.stepover === undefined) settings.stepover = Math.round(Math.max(settings.toolDiameter * 0.6, 0.1) * 100) / 100;
    if (!raw.material) settings.material = "custom";
    settings.overrides = { ...(raw.overrides ?? {}) };
  }
  // v3 -> v4: rampAngle/orderMode; existing shapes keep side "on" (undefined) so their G-code is unchanged.
  if (version < 4) {
    if (raw.rampAngle === undefined) settings.rampAngle = 0;
    if (!raw.orderMode) settings.orderMode = "auto";
  }
  // v4 -> v5: tool geometry.
  if (version < 5) {
    if (!raw.toolType) settings.toolType = "flat";
    if (raw.vbitAngle === undefined) settings.vbitAngle = 90;
  }
  // v5 -> v6: tool library.
  if (version < 6 && !Array.isArray(raw.tools)) settings.tools = [];
  // v6 -> v7: post-processor, export units, acceleration, helix, peck (defaults keep old G-code identical; time estimate now includes acceleration).
  if (version < 7) {
    if (!raw.post) settings.post = "grbl";
    if (!raw.exportUnits) settings.exportUnits = "mm";
    if (raw.accel === undefined) settings.accel = DEFAULT_MACHINE_SETTINGS.accel;
    if (raw.helixEntry === undefined) settings.helixEntry = false;
    if (raw.helixPitch === undefined) settings.helixPitch = 1;
    if (raw.peckDepth === undefined) settings.peckDepth = 0;
  }
  return { shapes, settings };
}

export type AlignMode = "left" | "centerX" | "right" | "top" | "centerY" | "bottom";
export type DistributeMode = "horizontal" | "vertical";

interface ProjectState {
  shapes: Shape[];
  /** Primary selection (last selected). */
  selectedId: string | null;
  /** All selected ids (multi-selection); always contains selectedId when not null. */
  selectedIds: string[];
  settings: MachineSettings;
  addShape: (shape: Shape) => void;
  addShapes: (shapes: Shape[]) => void;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  select: (id: string | null) => void;
  /** Toggle a shape in/out of the multi-selection (Shift+click). */
  toggleSelect: (id: string) => void;
  selectMany: (ids: string[]) => void;
  /** Remove every selected shape. */
  removeSelected: () => void;
  alignSelected: (mode: AlignMode) => void;
  distributeSelected: (mode: DistributeMode) => void;
  /** Boolean between the selected shapes (selection order: first = base). Returns the ids created (empty = nothing to do). */
  booleanSelected: (op: BooleanOp) => string[];
  /** Arrange shapes on the stock (selection when ≥ 2 selected, else all visible unlocked). Returns the nesting result. */
  nestOnStock: (opts: Pick<NestOptions, "spacing" | "allowRotate">, ids?: string[]) => NestResult;
  updateSettings: (patch: Partial<MachineSettings>) => void;
  /** Sets the work area and re-derives `machinePreset` ("custom" when it matches none). */
  setWorkArea: (patch: Partial<WorkArea>) => void;
  updateStock: (patch: Partial<Stock>) => void;
  /** Select a material preset; `force` re-applies over manual overrides. */
  setMaterial: (id: MaterialId, force?: boolean) => void;
  /** Change the tool diameter and re-derive pass depth / stepover when not overridden. */
  setToolDiameter: (d: number) => void;
  /** Edit a cutting parameter by hand (marks it as overridden). */
  setCutParam: (key: CutParamKey, value: number) => void;
  /** Toggle "cut through" on a shape (depth follows stock thickness + extra). */
  setCutThrough: (id: string, on: boolean) => void;
  clear: () => void;
  /** Clears shapes AND resets machine settings to defaults. */
  newProject: () => void;
  /** Duplicate a shape (offset by 10 mm) and select the copy. */
  duplicateShape: (id: string) => void;
  /** Move a shape by (dx, dy) mm. */
  nudgeShape: (id: string, dx: number, dy: number) => void;
  /** Move a shape to a new index (navigator reorder = manual machining order). */
  moveShape: (id: string, toIndex: number) => void;
  /** Tool library. */
  addTool: (tool: Tool) => void;
  updateTool: (id: string, patch: Partial<Tool>) => void;
  removeTool: (id: string) => void;
  /** Replace the whole project (used by "open .json"). */
  loadProject: (project: { shapes: Shape[]; settings: MachineSettings }) => void;
}

export const useProjectStore = create<ProjectState>()(
  temporal(
  persist(
    (set, get) => ({
  shapes: [],
  selectedId: null,
  selectedIds: [],
  settings: DEFAULT_MACHINE_SETTINGS,

  addShape: (shape) =>
    set((state) => ({ shapes: [...state.shapes, shape], selectedId: shape.id, selectedIds: [shape.id] })),

  addShapes: (shapes) =>
    set((state) => ({ shapes: [...state.shapes, ...shapes] })),

  updateShape: (id, patch) =>
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? ({ ...s, ...patch } as Shape) : s
      ),
    })),

  removeShape: (id) =>
    set((state) => ({
      shapes: state.shapes.filter((s) => s.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedIds: state.selectedIds.filter((x) => x !== id),
    })),

  select: (id) => set({ selectedId: id, selectedIds: id ? [id] : [] }),

  toggleSelect: (id) =>
    set((state) => {
      const has = state.selectedIds.includes(id);
      const selectedIds = has ? state.selectedIds.filter((x) => x !== id) : [...state.selectedIds, id];
      return { selectedIds, selectedId: has ? (selectedIds[selectedIds.length - 1] ?? null) : id };
    }),

  selectMany: (ids) => set({ selectedIds: ids, selectedId: ids[ids.length - 1] ?? null }),

  removeSelected: () =>
    set((state) => ({
      shapes: state.shapes.filter((s) => !state.selectedIds.includes(s.id)),
      selectedId: null,
      selectedIds: [],
    })),

  alignSelected: (mode) =>
    set((state) => {
      const sel = state.shapes.filter((s) => state.selectedIds.includes(s.id));
      if (sel.length < 2) return {};
      const boxes = sel.map((s) => ({ s, b: boundingBox(shapeToPoints(s)) }));
      const minX = Math.min(...boxes.map((x) => x.b.minX)), maxX = Math.max(...boxes.map((x) => x.b.maxX));
      const minY = Math.min(...boxes.map((x) => x.b.minY)), maxY = Math.max(...boxes.map((x) => x.b.maxY));
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      const moved = new Map<string, Shape>();
      for (const { s, b } of boxes) {
        let dx = 0, dy = 0;
        switch (mode) {
          case "left": dx = minX - b.minX; break;
          case "right": dx = maxX - b.maxX; break;
          case "centerX": dx = cx - (b.minX + b.maxX) / 2; break;
          case "top": dy = maxY - b.maxY; break;
          case "bottom": dy = minY - b.minY; break;
          case "centerY": dy = cy - (b.minY + b.maxY) / 2; break;
        }
        moved.set(s.id, translateShape(s, dx, dy));
      }
      return { shapes: state.shapes.map((s) => moved.get(s.id) ?? s) };
    }),

  distributeSelected: (mode) =>
    set((state) => {
      const sel = state.shapes.filter((s) => state.selectedIds.includes(s.id));
      if (sel.length < 3) return {};
      const boxes = sel.map((s) => ({ s, b: boundingBox(shapeToPoints(s)) }));
      const key = mode === "horizontal" ? "X" : "Y";
      boxes.sort((a, b) => (a.b[`min${key}`] + a.b[`max${key}`]) / 2 - (b.b[`min${key}`] + b.b[`max${key}`]) / 2);
      const first = boxes[0], last = boxes[boxes.length - 1];
      const c0 = (first.b[`min${key}`] + first.b[`max${key}`]) / 2;
      const c1 = (last.b[`min${key}`] + last.b[`max${key}`]) / 2;
      const step = (c1 - c0) / (boxes.length - 1);
      const moved = new Map<string, Shape>();
      boxes.forEach(({ s, b }, i) => {
        const cur = (b[`min${key}`] + b[`max${key}`]) / 2;
        const d = c0 + step * i - cur;
        moved.set(s.id, mode === "horizontal" ? translateShape(s, d, 0) : translateShape(s, 0, d));
      });
      return { shapes: state.shapes.map((s) => moved.get(s.id) ?? s) };
    }),

  booleanSelected: (op) => {
    const state = get();
    const sel = state.selectedIds.map((id) => state.shapes.find((s) => s.id === id)).filter((s): s is Shape => !!s && !s.locked);
    if (sel.length < 2) return [];
    const prefix = { union: "uniao", difference: "subtracao", intersection: "intersecao" }[op];
    const results = booleanShapes(op, sel, () => generateShapeId(prefix));
    const removed = new Set(sel.map((s) => s.id));
    const firstIdx = state.shapes.findIndex((s) => removed.has(s.id));
    const kept = state.shapes.filter((s) => !removed.has(s.id));
    const shapes = [...kept.slice(0, firstIdx), ...results, ...kept.slice(firstIdx)];
    const ids = results.map((r) => r.id);
    set({ shapes, selectedIds: ids, selectedId: ids[ids.length - 1] ?? null });
    return ids;
  },

  nestOnStock: (opts, ids) => {
    const state = get();
    const { stock } = state.settings;
    const pool = ids && ids.length >= 2 ? state.shapes.filter((s) => ids.includes(s.id)) : state.shapes.filter((s) => !s.hidden && !s.locked);
    const result = nestShapes(pool, { width: stock.width, height: stock.height, spacing: opts.spacing, allowRotate: opts.allowRotate });
    if (result.placed.length > 0) {
      set({ shapes: applyPlacements(state.shapes, result.placed, [stock.offsetX, stock.offsetY]) });
    }
    return result;
  },

  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),

  setWorkArea: (patch) =>
    set((state) => {
      const workArea = { ...state.settings.workArea, ...patch };
      return { settings: { ...state.settings, workArea, machinePreset: presetIdForWorkArea(workArea) } };
    }),

  updateStock: (patch) =>
    set((state) => {
      const stock = { ...state.settings.stock, ...patch };
      const shapes =
        patch.thickness !== undefined
          ? state.shapes.map((s) => (s.cutThrough ? { ...s, depth: throughCutDepth(stock.thickness) } : s))
          : state.shapes;
      return { settings: { ...state.settings, stock }, shapes };
    }),

  setMaterial: (id, force = false) =>
    set((state) => ({ settings: applyMaterial(state.settings, id, force) })),

  setToolDiameter: (d) => set((state) => ({ settings: applyToolDiameter(state.settings, d) })),

  setCutParam: (key, value) =>
    set((state) => ({
      settings: { ...state.settings, [key]: value, overrides: { ...state.settings.overrides, [key]: true } },
    })),

  setCutThrough: (id, on) =>
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id
          ? { ...s, cutThrough: on, depth: on ? throughCutDepth(state.settings.stock.thickness) : state.settings.stock.thickness }
          : s
      ),
    })),

  clear: () => set({ shapes: [], selectedId: null, selectedIds: [] }),

  newProject: () =>
    set({ shapes: [], selectedId: null, selectedIds: [], settings: DEFAULT_MACHINE_SETTINGS }),

  duplicateShape: (id) =>
    set((state) => {
      const src = state.shapes.find((s) => s.id === id);
      if (!src) return {};
      const copy = translateShape({ ...src, id: generateShapeId(src.kind) }, 10, 10);
      return { shapes: [...state.shapes, copy], selectedId: copy.id, selectedIds: [copy.id] };
    }),

  nudgeShape: (id, dx, dy) =>
    set((state) => ({ shapes: state.shapes.map((s) => (s.id === id ? translateShape(s, dx, dy) : s)) })),

  moveShape: (id, toIndex) =>
    set((state) => {
      const from = state.shapes.findIndex((s) => s.id === id);
      if (from < 0) return {};
      const arr = [...state.shapes];
      const [item] = arr.splice(from, 1);
      arr.splice(Math.max(0, Math.min(toIndex, arr.length)), 0, item);
      return { shapes: arr };
    }),

  addTool: (tool) => set((state) => ({ settings: { ...state.settings, tools: [...state.settings.tools, tool] } })),
  updateTool: (id, patch) =>
    set((state) => ({ settings: { ...state.settings, tools: state.settings.tools.map((t) => (t.id === id ? { ...t, ...patch } : t)) } })),
  removeTool: (id) =>
    set((state) => ({
      settings: { ...state.settings, tools: state.settings.tools.filter((t) => t.id !== id) },
      shapes: state.shapes.map((s) => (s.toolId === id ? { ...s, toolId: undefined } : s)),
    })),

  loadProject: (project) =>
    set({ shapes: project.shapes, settings: project.settings, selectedId: null, selectedIds: [] }),
    }),
    {
      name: PROJECT_STORAGE_KEY,
      version: PROJECT_SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ shapes: state.shapes, settings: state.settings }),
      migrate: migrateProject,
    }
  ),
  {
    limit: 100,
    // Undo/redo tracks project content only (not the selection).
    partialize: (state) => ({ shapes: state.shapes, settings: state.settings }) as ProjectState,
    equality: (a, b) => a.shapes === b.shapes && a.settings === b.settings,
  }
  )
);

/** Undo/redo API (zundo temporal store), usable as a hook. */
export const useTemporalStore = <T,>(selector: (state: TemporalState<ProjectState>) => T): T =>
  useStore(useProjectStore.temporal, selector);
export const undo = () => useProjectStore.temporal.getState().undo();
export const redo = () => useProjectStore.temporal.getState().redo();
