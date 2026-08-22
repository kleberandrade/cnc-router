import { useEffect, useState } from "react";
import { useSheetsStore, requestSheets, SCOPED_SHEET_CSS } from "../state/sheets";
import { useProjectStore } from "../state/store";
import { useDerived } from "../state/derived";

/**
 * Estação "Folha técnica" (Sprint 30): ver as páginas — folha de oficina e desenhos cotados —
 * antes de imprimir ou baixar. Miniaturas na lateral, página em foco no centro, zoom simples.
 * As ações (escala, escopo, Imprimir, Baixar SVG) moram na ribbon FOLHAS do TopBar.
 */
export function DrawingWorkspace() {
  const pages = useSheetsStore((s) => s.pages);
  const current = useSheetsStore((s) => s.current);
  const status = useSheetsStore((s) => s.status);
  const setCurrent = useSheetsStore((s) => s.setCurrent);
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const shapeCount = shapes.length;
  // o tempo do derived chega async do worker: quando ele muda, a folha remonta com os tempos certos
  const derivedTime = useDerived((d) => d.time);
  const [zoom, setZoom] = useState<"fit" | "full">("fit");

  useEffect(() => {
    requestSheets(); // idempotente: só reconstrói se o hash (projeto + opções) mudou
  }, [shapes, settings, derivedTime]);

  if (shapeCount === 0) {
    return (
      <section className="workspace drawing-ws" data-testid="drawing-workspace">
        <p className="drawing-empty" data-testid="drawing-empty">Desenhe ou importe uma peça — as folhas aparecem aqui.</p>
      </section>
    );
  }

  const page = pages[current];
  return (
    <section className="workspace drawing-ws" data-testid="drawing-workspace">
      <style>{SCOPED_SHEET_CSS}</style>
      <aside className="drawing-thumbs" aria-label="Páginas">
        {pages.map((p, i) => (
          <button
            key={i}
            type="button"
            className={`drawing-thumb${i === current ? " active" : ""}`}
            onClick={() => setCurrent(i)}
            aria-current={i === current}
            data-testid={`sheet-thumb-${i}`}
          >
            <span className="drawing-thumb-page sheet-host" dangerouslySetInnerHTML={{ __html: p.html }} />
            <span className="drawing-thumb-title">{p.title}</span>
          </button>
        ))}
        {status !== "ready" && pages.length === 0 && <p className="hint">Montando as folhas…</p>}
      </aside>
      <div className={`drawing-stage${zoom === "full" ? " full" : ""}`} data-testid="drawing-stage">
        {page ? (
          <div className="drawing-page sheet-host" data-testid="drawing-page" dangerouslySetInnerHTML={{ __html: page.html }} />
        ) : (
          <p className="hint" role="status">Montando as folhas…</p>
        )}
        <div className="drawing-zoom" role="group" aria-label="Zoom da página">
          <button type="button" className={`rb${zoom === "fit" ? " active" : ""}`} onClick={() => setZoom("fit")} data-testid="sheet-zoom-fit">Ajustar</button>
          <button type="button" className={`rb${zoom === "full" ? " active" : ""}`} onClick={() => setZoom("full")} data-testid="sheet-zoom-full">100%</button>
        </div>
      </div>
    </section>
  );
}
