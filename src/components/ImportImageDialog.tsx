import { useEffect, useMemo, useRef, useState } from "react";
import { imageToGray, traceImage, regionsToMm, otsuThreshold, boxBlur, type GrayImage } from "../lib/imageTrace";
import { encodeGrid } from "../lib/relief";
import { useProjectStore, throughCutDepth } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { generateShapeId } from "../lib/ids";
import type { Shape, PathShape, ReliefShape } from "../types";
import { NumberField } from "./NumberField";

type Mode = "silhouette" | "relief";

/** Import a PNG/JPG as vector silhouette (threshold → contours) or as a 2.5D relief (gray → depth). */
export function ImportImageDialog({ file, onDone }: { file: File; onDone: () => void }) {
  const stock = useProjectStore((s) => s.settings.stock);
  const addShapes = useProjectStore((s) => s.addShapes);
  const select = useProjectStore((s) => s.select);
  const setNotice = useUiStore((s) => s.setNotice);
  const setSection = useUiStore((s) => s.setSection);
  const [gray, setGray] = useState<GrayImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("silhouette");
  const [threshold, setThreshold] = useState<number | null>(null);
  const [invert, setInvert] = useState(false);
  const [blur, setBlur] = useState(1);
  const [widthMm, setWidthMm] = useState(Math.min(120, stock.width - 20));
  const [depthMax, setDepthMax] = useState(3);
  const [gamma, setGamma] = useState(1);
  const [operation, setOperation] = useState<"outline" | "pocket">("outline");
  const previewRef = useRef<HTMLCanvasElement>(null);

  // load the file → gray (max 800 px on the long side to keep tracing snappy)
  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      const k = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
      const g = imageToGray(img, w, h);
      setGray(g);
      setThreshold(otsuThreshold(boxBlur(g, 1)));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { if (alive) setError("Não consegui abrir essa imagem. Tente PNG ou JPG."); URL.revokeObjectURL(url); };
    img.src = url;
    return () => { alive = false; };
  }, [file]);

  const traced = useMemo(() => {
    if (!gray || threshold === null || mode !== "silhouette") return null;
    return traceImage(gray, { threshold, invert, blur, tolerance: 0.8, minArea: 6 });
  }, [gray, threshold, invert, blur, mode]);

  const heightMm = gray ? (widthMm * gray.h) / gray.w : 0;

  // preview
  useEffect(() => {
    const c = previewRef.current;
    if (!c || !gray) return;
    const scale = Math.min(360 / gray.w, 240 / gray.h);
    c.width = Math.round(gray.w * scale); c.height = Math.round(gray.h * scale);
    const ctx = c.getContext("2d")!;
    const src = document.createElement("canvas");
    src.width = gray.w; src.height = gray.h;
    const sctx = src.getContext("2d")!;
    const id = sctx.createImageData(gray.w, gray.h);
    const g = boxBlur(gray, mode === "silhouette" ? blur : 0);
    for (let i = 0; i < g.data.length; i++) {
      let v = g.data[i];
      if (mode === "silhouette" && threshold !== null) { const dark = v < threshold; v = (invert ? !dark : dark) ? 40 : 245; }
      else if (invert) v = 255 - v;
      id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255;
    }
    sctx.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    if (traced) {
      ctx.strokeStyle = "#2f6d8f"; ctx.lineWidth = 1.2;
      for (const r of traced.regions) {
        for (const loop of [r.outer, ...r.holes]) {
          ctx.beginPath();
          loop.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x * scale, y * scale); else ctx.lineTo(x * scale, y * scale); });
          ctx.closePath(); ctx.stroke();
        }
      }
    }
  }, [gray, traced, mode, threshold, invert, blur]);

  const apply = () => {
    if (!gray) return;
    const x0 = 10, y0 = 10;
    if (mode === "silhouette" && traced) {
      const regions = regionsToMm(traced.regions, gray, widthMm, x0, y0);
      const shapes: Shape[] = regions.map((r, i) => ({
        id: generateShapeId("img"), kind: "path", points: r.outer, holes: r.holes.length ? r.holes : undefined, closed: true,
        depth: operation === "outline" ? throughCutDepth(stock.thickness) : Math.min(3, stock.thickness), cutThrough: operation === "outline",
        operation, side: "outside", name: `${file.name.replace(/\.[^.]+$/, "")}${regions.length > 1 ? ` ${i + 1}` : ""}`,
      } satisfies PathShape));
      if (shapes.length === 0) { setNotice({ kind: "warning", title: "Nenhum contorno encontrado — mexa no limiar ou inverta." }); return; }
      addShapes(shapes);
      select(shapes[shapes.length - 1].id);
      setNotice({ kind: "info", title: `${shapes.length} ${shapes.length === 1 ? "contorno veio" : "contornos vieram"} de ${file.name}.`, details: [`limiar ${threshold}, ${widthMm} mm de largura`] });
    } else {
      // relief: keep ≤ 400 px wide grid
      const k = Math.min(1, 400 / gray.w);
      const cols = Math.max(2, Math.round(gray.w * k)), rows = Math.max(2, Math.round(gray.h * k));
      const grid = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r * cols + c] = gray.data[Math.min(gray.h - 1, Math.round(r / k)) * gray.w + Math.min(gray.w - 1, Math.round(c / k))];
      const shape: ReliefShape = {
        id: generateShapeId("relief"), kind: "relief", x: x0, y: y0, width: widthMm, height: Math.round(heightMm * 100) / 100, cols, rows, data: encodeGrid(grid),
        depthMax, depth: depthMax, invert, gamma, operation: "pocket", name: file.name.replace(/\.[^.]+$/, ""),
      };
      addShapes([shape]);
      select(shape.id);
      setNotice({ kind: "info", title: `Relevo importado de ${file.name} (${cols} × ${rows} px, ${depthMax} mm).`, details: ["Use fresa esférica e stepover pequeno para acabamento liso."] });
    }
    setSection("shape");
    onDone();
  };

  return (
    <div className="import-image" data-testid="import-image">
      <h2>Importar imagem</h2>
      {error && <p className="hint hint-warn">{error}</p>}
      <div className="ii-mode" role="radiogroup" aria-label="Modo">
        <button type="button" role="radio" aria-checked={mode === "silhouette"} className={`choice-icon${mode === "silhouette" ? " active" : ""}`} onClick={() => setMode("silhouette")} data-testid="ii-mode-silhouette">Silhueta (contornos)</button>
        <button type="button" role="radio" aria-checked={mode === "relief"} className={`choice-icon${mode === "relief" ? " active" : ""}`} onClick={() => setMode("relief")} data-testid="ii-mode-relief">Relevo (tons de cinza)</button>
      </div>
      <p className="hint">{mode === "silhouette" ? "Preto vira peça: recorte por fora, gravação ou rebaixo. Ajuste o limiar até o contorno azul ficar certo." : "Branco fica na superfície, preto desce até a profundidade máxima. Use fresa esférica."}</p>
      <div className="ii-body">
        <canvas ref={previewRef} className="ii-preview" data-testid="ii-preview" />
        <div className="ii-controls">
          {mode === "silhouette" && threshold !== null && (
            <label>Limiar ({threshold})<input type="range" min={1} max={254} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} data-testid="ii-threshold" /></label>
          )}
          {mode === "silhouette" && <label>Suavização ({blur} px)<input type="range" min={0} max={3} value={blur} onChange={(e) => setBlur(Number(e.target.value))} data-testid="ii-blur" /></label>}
          <label className="checkbox"><input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} data-testid="ii-invert" /> Inverter (fundo/figura)</label>
          <NumberField label="Largura final" unit="mm" min={5} step={5} value={widthMm} onChange={setWidthMm} testId="ii-width" hint={gray ? `altura ${heightMm.toFixed(1)} mm (${gray.w} × ${gray.h} px)` : undefined} />
          {mode === "silhouette" ? (
            <label>Operação
              <select value={operation} onChange={(e) => setOperation(e.target.value as "outline" | "pocket")} data-testid="ii-operation">
                <option value="outline">Recorte por fora (passante)</option>
                <option value="pocket">Rebaixo / gravação (3 mm)</option>
              </select>
            </label>
          ) : (
            <>
              <NumberField label="Profundidade máxima" unit="mm" min={0.2} step={0.5} value={depthMax} onChange={setDepthMax} testId="ii-depth" />
              <NumberField label="Gama (curva)" min={0.3} max={3} step={0.1} value={gamma} onChange={setGamma} testId="ii-gamma" hint="< 1 aprofunda os meios-tons; > 1 suaviza" />
            </>
          )}
          {traced && <p className="hint" data-testid="ii-count">{traced.regions.length} {traced.regions.length === 1 ? "contorno" : "contornos"}, {traced.regions.reduce((n, r) => n + r.holes.length, 0)} {traced.regions.reduce((n, r) => n + r.holes.length, 0) === 1 ? "furo" : "furos"}</p>}
        </div>
      </div>
      <div className="dialog-actions" style={{ padding: 0 }}>
        <button type="button" className="dialog-close" onClick={onDone}>Cancelar</button>
        <button type="button" className="rb primary" onClick={apply} disabled={!gray || (mode === "silhouette" && !traced)} data-testid="ii-apply">Importar</button>
      </div>
    </div>
  );
}
