import { create } from "zustand";
import type { NoticeData } from "../components/Notice";

export type PanelSection = "machine" | "stock" | "material" | "cut" | "shape";
export type View = "editor" | "simulator";
export interface SimCameraActions { fit: () => void; top: () => void; iso: () => void }
export type EditorTool = "select" | "polygon";

interface UiState {
  view: View;
  setView: (v: View) => void;
  /** Camera actions registered by the Simulator while mounted. */
  simCamera: SimCameraActions | null;
  setSimCamera: (a: SimCameraActions | null) => void;
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
  /** Snap to stock/shapes/grid while dragging. */
  snap: boolean;
  toggleSnap: () => void;
  /** Points (mm) of the polygon being drawn. */
  draft: [number, number][];
  setDraft: (pts: [number, number][]) => void;
  /** Whether the side panel is collapsed (narrow screens). */
  panelOpen: boolean;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  /** Mobile bottom sheet (settings) open state and size. */
  sheetOpen: boolean;
  sheetExpanded: boolean;
  setSheetOpen: (open: boolean) => void;
  toggleSheetExpanded: () => void;
}

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 8;
const clampZoom = (z: number) => Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX);

export const useUiStore = create<UiState>((set) => ({
  view: "editor",
  setView: (view) => set({ view }),
  simCamera: null,
  setSimCamera: (simCamera) => set({ simCamera }),
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
  snap: true,
  toggleSnap: () => set((s) => ({ snap: !s.snap })),
  draft: [],
  setDraft: (draft) => set({ draft }),
  panelOpen: true,
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  sheetOpen: false,
  sheetExpanded: false,
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),
  toggleSheetExpanded: () => set((s) => ({ sheetExpanded: !s.sheetExpanded })),
}));
