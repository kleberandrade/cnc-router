import { create } from "zustand";
import type { NoticeData } from "../components/Notice";

/** Panel tabs. Legacy ids (navigator/stock/material/tools) are accepted by `setSection` and mapped to the tab that now holds them. */
export type Density = "compact" | "comfortable";
export type TextSize = "small" | "normal" | "large";
export type PanelSection = "shape" | "machine" | "cut" | "post" | "navigator" | "stock" | "material" | "tools";
const SECTION_ALIAS: Partial<Record<PanelSection, PanelSection>> = { navigator: "shape", stock: "machine", material: "cut", tools: "cut" };
export const canonicalSection = (s: PanelSection): PanelSection => SECTION_ALIAS[s] ?? s;
export type Theme = "light" | "dark" | "system";
export type MousePreset = "standard" | "fusion";
export type View = "editor" | "simulator";
export interface SimCameraActions { fit: () => void; top: () => void; iso: () => void }
export type EditorTool = "select" | "polygon";

interface UiState {
  /** Bumped when a font finishes loading (text shapes re-render). */
  fontsVersion: number;
  bumpFonts: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** UI density (spacing) and text size — applied as data attributes on <html>. */
  density: Density;
  setDensity: (d: Density) => void;
  textSize: TextSize;
  setTextSize: (t: TextSize) => void;
  /** Active ribbon tab per workspace (Sprint 22) and minimized state. */
  ribbonTab: Record<View, string>;
  setRibbonTab: (view: View, tab: string) => void;
  ribbonMinimized: boolean;
  setRibbonMinimized: (m: boolean) => void;
  /** Tour open (first run or from the menu). */
  tourOpen: boolean;
  setTourOpen: (open: boolean) => void;
  /** "Comece por aqui" card closed for this session. */
  emptyDismissed: boolean;
  dismissEmpty: () => void;
  mousePreset: MousePreset;
  setMousePreset: (m: MousePreset) => void;
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

const readTheme = (): Theme => {
  try {
    const v = localStorage.getItem("oficina-cnc:theme");
    return v === "dark" || v === "light" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
};

/** Resolve "system" to the actual scheme. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const readPref = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try { const v = localStorage.getItem(key); return (allowed as readonly string[]).includes(v ?? "") ? (v as T) : fallback; } catch { return fallback; }
};
const applyPrefs = (density: Density, textSize: TextSize) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-density", density);
  document.documentElement.setAttribute("data-text", textSize);
};

const readMouse = (): MousePreset => {
  try { return localStorage.getItem("oficina-cnc:mouse") === "fusion" ? "fusion" : "standard"; } catch { return "standard"; }
};

export const useUiStore = create<UiState>((set) => ({
  fontsVersion: 0,
  bumpFonts: () => set((s) => ({ fontsVersion: s.fontsVersion + 1 })),
  mousePreset: readMouse(),
  setMousePreset: (mousePreset) => {
    try { localStorage.setItem("oficina-cnc:mouse", mousePreset); } catch { /* ignore */ }
    set({ mousePreset });
  },
  density: readPref<Density>("oficina-cnc:density", ["compact", "comfortable"], "compact"),
  setDensity: (density) => {
    try { localStorage.setItem("oficina-cnc:density", density); } catch { /* ignore */ }
    set({ density });
    applyPrefs(density, useUiStore.getState().textSize);
  },
  textSize: readPref<TextSize>("oficina-cnc:text", ["small", "normal", "large"], "normal"),
  setTextSize: (textSize) => {
    try { localStorage.setItem("oficina-cnc:text", textSize); } catch { /* ignore */ }
    set({ textSize });
    applyPrefs(useUiStore.getState().density, textSize);
  },
  ribbonTab: { editor: "formas", simulator: "reproduzir" },
  setRibbonTab: (view, tab) => set((st) => ({ ribbonTab: { ...st.ribbonTab, [view]: tab }, ribbonMinimized: false })),
  ribbonMinimized: readPref("oficina-cnc:ribbon-min", ["1", "0"], "0") === "1",
  setRibbonMinimized: (ribbonMinimized) => {
    try { localStorage.setItem("oficina-cnc:ribbon-min", ribbonMinimized ? "1" : "0"); } catch { /* ignore */ }
    set({ ribbonMinimized });
  },
  tourOpen: false,
  setTourOpen: (tourOpen) => set({ tourOpen }),
  emptyDismissed: false,
  dismissEmpty: () => set({ emptyDismissed: true }),
  theme: readTheme(),
  setTheme: (theme) => {
    try { localStorage.setItem("oficina-cnc:theme", theme); } catch { /* ignore */ }
    set({ theme });
  },
  view: "editor",
  setView: (view) => set({ view }),
  simCamera: null,
  setSimCamera: (simCamera) => set({ simCamera }),
  notice: null,
  setNotice: (notice) => set({ notice }),
  section: "shape",
  setSection: (section) => set({ section: canonicalSection(section) }),
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

/** Apply persisted density/text-size once at startup (browser only). */
export function initUiPrefs(): void {
  const { density, textSize } = useUiStore.getState();
  applyPrefs(density, textSize);
}
