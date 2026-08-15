import { useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { Editor } from "./components/Editor";
import { Simulator } from "./components/Simulator";
import "./App.css";

type Tab = "editor" | "simulator";

function App() {
  const [tab, setTab] = useState<Tab>("editor");

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header-mark" aria-hidden="true">⌗</span>
        <h1>Oficina CNC</h1>
        <nav className="tabs" aria-label="Modo de visualização">
          <button
            type="button"
            className={tab === "editor" ? "tab active" : "tab"}
            onClick={() => setTab("editor")}
            data-testid="tab-editor"
          >
            Desenhar
          </button>
          <button
            type="button"
            className={tab === "simulator" ? "tab active" : "tab"}
            onClick={() => setTab("simulator")}
            data-testid="tab-simulator"
          >
            Simular
          </button>
        </nav>
      </header>

      <main className="app-body">
        <Toolbar />
        <section className="workspace">
          {tab === "editor" ? <Editor /> : <Simulator />}
        </section>
      </main>
    </div>
  );
}

export default App;
