import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { temporal, type TemporalState } from "zundo";
import { useStore } from "zustand";
import type { Shape, MachineSettings } from "../types";
import { DEFAULT_MACHINE_SETTINGS } from "../types";
import { generateShapeId } from "../lib/ids";
import { presetIdForWorkArea } from "../lib/machinePresets";
import { applyMaterial, applyToolDiameter } from "../lib/materials";
import type { WorkArea, Stock, MaterialId, CutParamKey } from "../types";
import { THROUGH_CUT_EXTRA } from "../types";

/** Translate any shape by (dx, dy) mm. */
export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  if (shape.kind === "path") {
    return { ...shape, points: shape.points.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
  }
  return { ...shape, x: shape.x + dx, y: shape.y + dy };
}

/** Depth a through-cut shape should have for a given stock thickness. */
export const throughCutDepth = (thickness: number) => Math.round((thickness + THROUGH_CUT_EXTRA) * 100) / 100;

export { generateShapeId };

/** localStorage key + schema version. Bump `PROJECT_SCHEMA_VERSION` and extend `migrateProject` on breaking changes. */
export const PROJECT_STORAGE_KEY = "oficina-cnc:project";
export const PROJECT_SCHEMA_VERSION = 4;

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
  return { shapes, settings };
}

interface ProjectState {
  shapes: Shape[];
  selectedId: string | null;
  settings: MachineSettings;
  addShape: (shape: Shape) => void;
  addShapes: (shapes: Shape[]) => void;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  select: (id: string | null) => void;
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
  /** Replace the whole project (used by "open .json"). */
  loadProject: (project: { shapes: Shape[]; settings: MachineSettings }) => void;
}

export const useProjectStore = create<ProjectState>()(
  temporal(
  persist(
    (set) => ({
  shapes: [],
  selectedId: null,
  settings: DEFAULT_MACHINE_SETTINGS,

  addShape: (shape) =>
    set((state) => ({ shapes: [...state.shapes, shape], selectedId: shape.id })),

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
    })),

  select: (id) => set({ selectedId: id }),

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

  clear: () => set({ shapes: [], selectedId: null }),

  newProject: () =>
    set({ shapes: [], selectedId: null, settings: DEFAULT_MACHINE_SETTINGS }),

  duplicateShape: (id) =>
    set((state) => {
      const src = state.shapes.find((s) => s.id === id);
      if (!src) return {};
      const copy = translateShape({ ...src, id: generateShapeId(src.kind) }, 10, 10);
      return { shapes: [...state.shapes, copy], selectedId: copy.id };
    }),

  nudgeShape: (id, dx, dy) =>
    set((state) => ({ shapes: state.shapes.map((s) => (s.id === id ? translateShape(s, dx, dy) : s)) })),

  loadProject: (project) =>
    set({ shapes: project.shapes, settings: project.settings, selectedId: null }),
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
