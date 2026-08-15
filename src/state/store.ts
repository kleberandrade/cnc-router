import { create } from "zustand";
import type { Shape, MachineSettings } from "../types";
import { DEFAULT_MACHINE_SETTINGS } from "../types";

let idCounter = 0;
export function generateShapeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
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
  clear: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
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

  clear: () => set({ shapes: [], selectedId: null }),
}));
