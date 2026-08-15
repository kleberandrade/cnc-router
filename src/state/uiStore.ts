import { create } from "zustand";
import type { NoticeData } from "../components/Notice";

export type PanelSection = "machine" | "stock" | "material" | "cut" | "shape";
export type EditorTool = "select" | "polygon";

interface UiState {
  notice: NoticeData | null;
  setNotice: (n: NoticeData | null) => void;
  /** Open accordion section in the side panel. */
  section: PanelSection;
  setSection: (s: PanelSection) => void;
  /** Editor zoom multiplier over the "fit" scale (1 = fit). */
  zoom: number;
  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  /** Editor pan offset in px. */
  pan: { x: number; y: number };
  setPan: (p: { x: number; y: number }) => void;
  tool: EditorTool;
  setTool: (t: EditorTool) => void;
  /** Points (mm) of the polygon being drawn. */
  draft: [number, number][];
  setDraft: (pts: [number, number][]) => void;
  /** Whether the side panel is collapsed (narrow screens). */
  panelOpen: boolean;
  togglePanel: () => void;
}

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 8;
const clampZoom = (z: number) => Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX);

export const useUiStore = create<UiState>((set) => ({
  notice: null,
  setNotice: (notice) => set({ notice }),
  section: "shape",
  setSection: (section) => set({ section }),
  zoom: 1,
  setZoom: (z) => set({ zoom: clampZoom(z) }),
  zoomIn: () => set((s) => ({ zoom: clampZoom(s.zoom * 1.25) })),
  zoomOut: () => set((s) => ({ zoom: clampZoom(s.zoom / 1.25) })),
  zoomFit: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
  pan: { x: 0, y: 0 },
  setPan: (pan) => set({ pan }),
  tool: "select",
  setTool: (tool) => set({ tool, draft: [] }),
  draft: [],
  setDraft: (draft) => set({ draft }),
  panelOpen: true,
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
}));
