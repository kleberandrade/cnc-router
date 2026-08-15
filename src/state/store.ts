import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Shape, MachineSettings } from "../types";
import { DEFAULT_MACHINE_SETTINGS } from "../types";
import { generateShapeId } from "../lib/ids";
import { presetIdForWorkArea } from "../lib/machinePresets";
import type { WorkArea, Stock } from "../types";

export { generateShapeId };

/** localStorage key + schema version. Bump `PROJECT_SCHEMA_VERSION` and extend `migrateProject` on breaking changes. */
export const PROJECT_STORAGE_KEY = "oficina-cnc:project";
export const PROJECT_SCHEMA_VERSION = 2;

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
  clear: () => void;
  /** Clears shapes AND resets machine settings to defaults. */
  newProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
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
    set((state) => ({ settings: { ...state.settings, stock: { ...state.settings.stock, ...patch } } })),

  clear: () => set({ shapes: [], selectedId: null }),

  newProject: () =>
    set({ shapes: [], selectedId: null, settings: DEFAULT_MACHINE_SETTINGS }),
    }),
    {
      name: PROJECT_STORAGE_KEY,
      version: PROJECT_SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ shapes: state.shapes, settings: state.settings }),
      migrate: migrateProject,
    }
  )
);
