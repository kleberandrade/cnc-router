import { TopBar } from "./components/TopBar";
import { SidePanel } from "./components/SidePanel";
import { StatusBar } from "./components/StatusBar";
import { Editor } from "./components/Editor";
import { Simulator } from "./components/Simulator";
import { useUiStore } from "./state/uiStore";
import "./App.css";

function App() {
  const view = useUiStore((s) => s.view);
  const panelOpen = useUiStore((s) => s.panelOpen);

  return (
    <div className="app">
      <TopBar />
      <main className={`app-body${panelOpen ? "" : " panel-collapsed"}`}>
        {panelOpen && <SidePanel />}
        <section className="workspace">{view === "editor" ? <Editor /> : <Simulator />}</section>
      </main>
      <StatusBar />
    </div>
  );
}

export default App;
