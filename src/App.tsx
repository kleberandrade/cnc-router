import { useEffect } from "react";
import { TopBar } from "./components/TopBar";
import { SidePanel } from "./components/SidePanel";
import { StatusBar } from "./components/StatusBar";
import { Editor } from "./components/Editor";
import { Simulator } from "./components/Simulator";
import { BottomBar } from "./components/BottomBar";
import { BottomSheet } from "./components/BottomSheet";
import { PwaBanner } from "./components/PwaBanner";
import { Notice } from "./components/Notice";
import { useUiStore } from "./state/uiStore";
import { useLayout } from "./hooks/useMediaQuery";
import "./App.css";

function App() {
  const view = useUiStore((s) => s.view);
  const panelOpen = useUiStore((s) => s.panelOpen);
  const setPanelOpen = useUiStore((s) => s.setPanelOpen);
  const notice = useUiStore((s) => s.notice);
  const setNotice = useUiStore((s) => s.setNotice);
  const layout = useLayout();

  // Tablet: the side panel becomes an overlay drawer, closed by default.
  useEffect(() => {
    if (layout === "tablet") setPanelOpen(false);
    if (layout === "desktop") setPanelOpen(true);
  }, [layout, setPanelOpen]);

  const workspace = <section className="workspace">{view === "editor" ? <Editor /> : <Simulator />}</section>;

  return (
    <div className={`app layout-${layout}`} data-layout={layout}>
      <TopBar />
      <PwaBanner />
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
    </div>
  );
}

export default App;
