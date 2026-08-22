import { lazy, Suspense, useEffect } from "react";
import { TopBar } from "./components/TopBar";
import { SidePanel } from "./components/SidePanel";
import { StatusBar } from "./components/StatusBar";
import { Editor } from "./components/Editor";
import { BottomBar } from "./components/BottomBar";
import { BottomSheet } from "./components/BottomSheet";
import { PwaBanner, StorageNotice } from "./components/PwaBanner";
import { Notice } from "./components/Notice";
import { useUiStore } from "./state/uiStore";
import { useLayout } from "./hooks/useMediaQuery";
import { useTheme } from "./hooks/useTheme";
import { EmptyState } from "./components/EmptyState";
import { Tour, tourDone } from "./components/Tour";
import { useProjectStore } from "./state/store";
import { AskHost } from "./components/Dialog";
import { DropImport } from "./components/DropImport";
import { DrawingWorkspace } from "./components/DrawingWorkspace";
import { AnalysisWorkspace } from "./components/AnalysisWorkspace";
import { Timeline } from "./components/Timeline";
import { readShareHash } from "./lib/share";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";

// Simulator (Three.js) is its own chunk: loaded on first "Simular", prefetched when the browser is idle (Sprint 27).
const loadSimulator = () => import("./components/Simulator");
const Simulator = lazy(() => loadSimulator().then((m) => ({ default: m.Simulator })));

function App() {
  const view = useUiStore((s) => s.view);
  const panelOpen = useUiStore((s) => s.panelOpen);
  const setPanelOpen = useUiStore((s) => s.setPanelOpen);
  const notice = useUiStore((s) => s.notice);
  const setNotice = useUiStore((s) => s.setNotice);
  const layout = useLayout();
  useTheme();
  const shapeCount = useProjectStore((s) => s.shapes.length);
  const tourOpen = useUiStore((s) => s.tourOpen);
  const setTourOpen = useUiStore((s) => s.setTourOpen);
  const emptyDismissed = useUiStore((s) => s.emptyDismissed);
  const tool = useUiStore((s) => s.tool);
  // Shared link (#p=…): load once, then clean the URL.
  useEffect(() => {
    const openShared = () => {
      const shared = readShareHash(window.location.hash);
      if (!shared) return;
      useProjectStore.getState().loadProject(shared);
      history.replaceState(null, "", window.location.pathname + window.location.search);
      setNotice({ kind: "info", title: `Projeto aberto a partir do link${shared.settings.projectName ? `: ${shared.settings.projectName}` : ""}.` });
    };
    openShared();
    window.addEventListener("hashchange", openShared);
    return () => window.removeEventListener("hashchange", openShared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Ganchos da landing (Sprint 32): /app/?galeria=1 abre a galeria; /app/?exemplo=<id> abre o exemplo.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const exemplo = params.get("exemplo");
    const galeria = params.get("galeria");
    if (!exemplo && !galeria) return;
    history.replaceState(null, "", window.location.pathname + window.location.hash);
    if (exemplo) {
      void import("./components/importEntry").then(({ openExampleById }) => openExampleById(exemplo));
    } else if (galeria === "1") {
      useUiStore.getState().setGalleryOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First visit on a desktop-sized screen: offer the tour once (never on mobile).
  useEffect(() => {
    if (layout === "desktop" && shapeCount === 0 && !tourDone() && !tourOpen) {
      const t = setTimeout(() => setTourOpen(true), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Prefetch the simulator chunk when idle so the first tap on "Simular" doesn't pay the download.
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const run = () => { void loadSimulator(); };
    if (idle) idle(run, { timeout: 3000 }); else setTimeout(run, 1500);
  }, []);

  // Tablet: the side panel becomes an overlay drawer, closed by default.
  useEffect(() => {
    if (layout === "tablet") setPanelOpen(false);
    if (layout === "desktop") setPanelOpen(true);
  }, [layout, setPanelOpen]);

  const showEmpty = view === "editor" && shapeCount === 0 && !emptyDismissed && layout !== "mobile" && tool === "select";
  const workspace = view === "drawing" ? (
    <DrawingWorkspace />
  ) : view === "analysis" ? (
    <AnalysisWorkspace />
  ) : (
    <section className="workspace">
      {view === "editor" ? (
        <Editor />
      ) : (
        <Suspense fallback={<div className="workspace-fallback" role="status">Carregando simulador…</div>}>
          <Simulator />
        </Suspense>
      )}
      {showEmpty && <EmptyState onTour={() => setTourOpen(true)} />}
      {view === "editor" && layout !== "mobile" && <Timeline />}
    </section>
  );

  return (
    <div className={`app layout-${layout}`} data-layout={layout}>
      <TopBar />
      <PwaBanner />
      <StorageNotice onLegal={() => { window.location.hash = "privacidade"; }} />
      {tourOpen && layout !== "mobile" && <Tour onClose={() => setTourOpen(false)} />}
      <AskHost />
      <DropImport />
      {layout === "mobile" ? (
        <>
          <main className="app-body mobile">
            {notice && <div className="mobile-notice"><Notice notice={notice} onDismiss={() => setNotice(null)} /></div>}
            {workspace}
          </main>
          <BottomBar />
          <BottomSheet>
            <SidePanel />
          </BottomSheet>
        </>
      ) : (
        <main className={`app-body${panelOpen ? "" : " panel-collapsed"}${layout === "tablet" ? " tablet" : ""}`}>
          {panelOpen && layout === "tablet" && <div className="drawer-backdrop" onClick={() => setPanelOpen(false)} role="presentation" />}
          {panelOpen && <SidePanel />}
          {workspace}
        </main>
      )}
      <StatusBar />
      <Analytics />
    </div>
  );
}

export default App;
