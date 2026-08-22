import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../state/store";
import {
  useAnalysisStore, analysisGeometry, runAnalysis, runShelf, type LoadDir,
} from "../state/analysis";
import { boundarySides } from "../lib/fem/mesh";
import { boundingBox, type Point } from "../lib/geometry";
import { findMaterial } from "../lib/materials";
import { NumberField } from "./NumberField";

const PartView3D = lazy(() => import("./PartView3D").then((m) => ({ default: m.PartView3D })));

/**
 * Estação Resistência (Sprint 31): análise orientativa de tensão e flecha.
 * O mapa de von Mises é desenhado num canvas 2D puro — milhares de triângulos coloridos
 * ficariam pesados como nós de cena; num canvas são um loop de fill().
 */

/** Viridis compacta (5 paradas interpoladas). */
function viridis(t: number): string {
  const stops = [
    [68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37],
  ];
  const x = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
  const i = Math.floor(x), f = x - i;
  const a = stops[i], b = stops[i + 1];
  const c = [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const DIR_LABEL: Record<LoadDir, string> = { down: "Para baixo", up: "Para cima", left: "Para a esquerda", right: "Para a direita" };

export function AnalysisWorkspace() {
  // a lista muda junto com shapes; o eslint não enxerga a leitura via getState dentro do helper
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const st = useAnalysisStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view3d, setView3d] = useState(false);
  const material = findMaterial(settings.material);

  const candidates = useMemo(
    () => shapes.filter((s) => !s.hidden && s.kind !== "text" && s.kind !== "relief"),
    [shapes]
  );
  const shape = candidates.find((s) => s.id === st.shapeId) ?? candidates[0] ?? null;
  useEffect(() => {
    if (shape && shape.id !== st.shapeId) st.setShape(shape.id);
    if (!shape && st.shapeId) st.setShape(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape?.id]);

  const geo = useMemo(() => (shape ? analysisGeometry(shape) : null), [shape]);
  // lados da peça: contorno + furos, com polilinha própria para desenhar/clicar
  const sideShapes = useMemo(() => {
    if (!geo) return [];
    const out: { side: number; pts: Point[] }[] = [];
    let base = 0;
    for (const loop of [geo.outer, ...geo.holes]) {
      const ids = boundarySides(loop);
      const byId = new Map<number, Point[]>();
      for (let i = 0; i < loop.length; i++) {
        const id = base + ids[i];
        if (!byId.has(id)) byId.set(id, [loop[i]]);
        byId.get(id)!.push(loop[(i + 1) % loop.length]);
      }
      for (const [side, pts] of byId) out.push({ side, pts });
      base += Math.max(...ids) + 1;
    }
    return out;
  }, [geo]);

  // desenho: peça + lados marcados + resultado
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !geo) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const b = boundingBox(geo.outer);
    const pad = 40;
    const W = canvas.width, H = canvas.height;
    const k = Math.min((W - 2 * pad) / Math.max(b.maxX - b.minX, 1e-6), (H - 2 * pad) / Math.max(b.maxY - b.minY, 1e-6));
    const tx = (x: number) => pad + (x - b.minX) * k + (W - 2 * pad - (b.maxX - b.minX) * k) / 2;
    const ty = (y: number) => H - pad - (y - b.minY) * k - (H - 2 * pad - (b.maxY - b.minY) * k) / 2;

    ctx.clearRect(0, 0, W, H);
    const res = st.result;
    if (res) {
      // deformada exagerada: escala para ~6% do vão
      const span = Math.max(b.maxX - b.minX, b.maxY - b.minY);
      const defScale = st.showDeformed && res.maxDisp > 1e-9 ? (0.06 * span) / res.maxDisp : 0;
      const px = (i: number) => tx(res.nodes[2 * i] + res.disp[2 * i] * defScale);
      const py = (i: number) => ty(res.nodes[2 * i + 1] + res.disp[2 * i + 1] * defScale);
      const vmMax = Math.max(res.maxVonMises, 1e-9);
      for (let t = 0; t < res.tris.length; t += 3) {
        const [a, bb, c] = [res.tris[t], res.tris[t + 1], res.tris[t + 2]];
        const vm = (res.vonMises[a] + res.vonMises[bb] + res.vonMises[c]) / 3;
        ctx.fillStyle = viridis(vm / vmMax);
        ctx.beginPath();
        ctx.moveTo(px(a), py(a)); ctx.lineTo(px(bb), py(bb)); ctx.lineTo(px(c), py(c));
        ctx.closePath(); ctx.fill();
      }
      // barra de escala
      const grad = ctx.createLinearGradient(W - 26, H - pad, W - 26, pad);
      for (let i = 0; i <= 10; i++) grad.addColorStop(i / 10, viridis(i / 10));
      ctx.fillStyle = grad;
      ctx.fillRect(W - 30, pad, 12, H - 2 * pad);
      ctx.fillStyle = getComputedStyle(canvas).color;
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(`${res.maxVonMises.toFixed(1)} MPa`, W - 36, pad + 10);
      ctx.fillText("0", W - 36, H - pad);
    } else {
      // contorno da peça
      ctx.strokeStyle = getComputedStyle(canvas).color;
      ctx.lineWidth = 1.2;
      for (const loop of [geo.outer, ...geo.holes]) {
        ctx.beginPath();
        loop.forEach((p, i) => { if (i === 0) ctx.moveTo(tx(p[0]), ty(p[1])); else ctx.lineTo(tx(p[0]), ty(p[1])); });
        ctx.closePath(); ctx.stroke();
      }
    }
    // lados marcados por cima (sempre visíveis)
    for (const s of sideShapes) {
      const isSup = st.supports.includes(s.side);
      const isLoad = st.loads.includes(s.side);
      if (!isSup && !isLoad) continue;
      ctx.strokeStyle = isSup ? "#2f6d8f" : "#c2571f";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      s.pts.forEach((p, i) => { if (i === 0) ctx.moveTo(tx(p[0]), ty(p[1])); else ctx.lineTo(tx(p[0]), ty(p[1])); });
      ctx.stroke();
    }
  }, [geo, sideShapes, st.supports, st.loads, st.result, st.showDeformed]);

  const pickSide = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !geo) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const my = ((e.clientY - rect.top) * canvas.height) / rect.height;
    const b = boundingBox(geo.outer);
    const pad = 40;
    const W = canvas.width, H = canvas.height;
    const k = Math.min((W - 2 * pad) / Math.max(b.maxX - b.minX, 1e-6), (H - 2 * pad) / Math.max(b.maxY - b.minY, 1e-6));
    const tx = (x: number) => pad + (x - b.minX) * k + (W - 2 * pad - (b.maxX - b.minX) * k) / 2;
    const ty = (y: number) => H - pad - (y - b.minY) * k - (H - 2 * pad - (b.maxY - b.minY) * k) / 2;
    let best = -1, bestD = 14 * 14; // 14 px de tolerância
    for (const s of sideShapes) {
      for (let i = 0; i + 1 < s.pts.length; i++) {
        const ax = tx(s.pts[i][0]), ay = ty(s.pts[i][1]);
        const bx = tx(s.pts[i + 1][0]), by = ty(s.pts[i + 1][1]);
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((mx - ax) * dx + (my - ay) * dy) / len2));
        const qx = ax + t * dx - mx, qy = ay + t * dy - my;
        const d = qx * qx + qy * qy;
        if (d < bestD) { bestD = d; best = s.side; }
      }
    }
    if (best >= 0) st.toggleSide(best);
  };

  if (!shape) {
    return (
      <section className="workspace analysis-ws" data-testid="analysis-workspace">
        <p className="drawing-empty" data-testid="analysis-empty">Desenhe ou importe uma peça fechada — a análise aparece aqui.</p>
      </section>
    );
  }

  return (
    <section className="workspace analysis-ws" data-testid="analysis-workspace">
      <aside className="analysis-panel">
        <label>
          Peça
          <select value={shape.id} onChange={(e) => st.setShape(e.target.value)} data-testid="an-shape">
            {candidates.map((s, i) => <option key={s.id} value={s.id}>{s.name ?? `${s.kind} ${i + 1}`}</option>)}
          </select>
        </label>
        <div className="an-mode" role="radiogroup" aria-label="Tipo de análise">
          <button type="button" role="radio" aria-checked={st.mode === "inplane"} className={`choice-icon${st.mode === "inplane" ? " active" : ""}`} onClick={() => st.setMode("inplane")} data-testid="an-mode-inplane">No plano da chapa</button>
          <button type="button" role="radio" aria-checked={st.mode === "shelf"} className={`choice-icon${st.mode === "shelf" ? " active" : ""}`} onClick={() => st.setMode("shelf")} data-testid="an-mode-shelf">Prateleira (flexão)</button>
        </div>

        {st.mode === "inplane" ? (
          <>
            <p className="hint">Clique nos lados da peça para marcar. Azul = apoiado, laranja = onde a carga entra.</p>
            <div className="an-mode" role="radiogroup" aria-label="Ferramenta">
              <button type="button" role="radio" aria-checked={st.tool === "support"} className={`choice-icon${st.tool === "support" ? " active" : ""}`} onClick={() => st.setTool("support")} data-testid="an-tool-support">Apoiar</button>
              <button type="button" role="radio" aria-checked={st.tool === "load"} className={`choice-icon${st.tool === "load" ? " active" : ""}`} onClick={() => st.setTool("load")} data-testid="an-tool-load">Carregar</button>
            </div>
            <NumberField label="Carga" unit="kg" min={0.1} step={1} value={st.loadKg} testId="an-load-kg" onChange={st.setLoadKg} />
            <label>
              Direção
              <select value={st.loadDir} onChange={(e) => st.setLoadDir(e.target.value as LoadDir)} data-testid="an-load-dir">
                {(Object.keys(DIR_LABEL) as LoadDir[]).map((d) => <option key={d} value={d}>{DIR_LABEL[d]}</option>)}
              </select>
            </label>
            <button type="button" className="rb primary an-run" onClick={runAnalysis} data-testid="an-run" disabled={st.status === "running"}>
              {st.status === "running" ? "Calculando…" : "Calcular"}
            </button>
            {st.error && <p className="hint hint-warn" data-testid="an-error">{st.error}</p>}
            {st.result && (
              <div className="an-results" data-testid="an-results">
                <p><strong>{st.result.maxVonMises.toFixed(1)} MPa</strong> de tensão máxima (von Mises)</p>
                <p><strong>{st.result.maxDisp < 0.01 ? "< 0,01" : st.result.maxDisp.toFixed(2)} mm</strong> de deslocamento máximo</p>
                <p data-testid="an-utilization">
                  {Math.round(st.result.utilization * 100)}% da resistência típica do {material?.label ?? "material (usando valores de MDF)"}
                  {st.result.utilization >= 1 ? " — acima do limite, reforce a peça" : st.result.utilization >= 0.5 ? " — margem apertada" : ""}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="hint">A peça deitada num vão, com peso em cima — o caso da prateleira. Largura usada: a menor dimensão da peça.</p>
            <NumberField label="Vão entre apoios" unit="mm" min={50} step={10} value={st.shelfSpan} testId="an-shelf-span" onChange={st.setShelfSpan} />
            <NumberField label="Peso em cima" unit="kg" min={0.1} step={1} value={st.shelfLoadKg} testId="an-shelf-kg" onChange={st.setShelfLoadKg} />
            <label>
              Como o peso senta
              <select value={st.shelfLoadType} onChange={(e) => st.setShelfLoadType(e.target.value as "distributed" | "point")} data-testid="an-shelf-type">
                <option value="distributed">Espalhado (livros)</option>
                <option value="point">No meio (um objeto só)</option>
              </select>
            </label>
            <button type="button" className="rb primary an-run" onClick={runShelf} data-testid="an-shelf-run">Calcular</button>
            {st.shelfResult && (
              <div className="an-results" data-testid="an-shelf-results">
                <p><strong>{st.shelfResult.deflection.toFixed(1)} mm</strong> de flecha no meio do vão</p>
                <p data-testid="an-shelf-verdict">
                  {st.shelfResult.deflection > st.shelfResult.visibleLimit
                    ? `Acima de vão/300 (${st.shelfResult.visibleLimit.toFixed(1)} mm): vai vergar visível. Encurte o vão ou engrosse a chapa.`
                    : `Dentro de vão/300 (${st.shelfResult.visibleLimit.toFixed(1)} mm): não deve vergar visível.`}
                </p>
                <p>{Math.round(st.shelfResult.utilization * 100)}% da resistência típica do {material?.label ?? "material (usando valores de MDF)"}</p>
              </div>
            )}
          </>
        )}

        <p className="an-disclaimer" data-testid="an-disclaimer">
          Números orientativos: madeira varia de chapa para chapa e o modelo é simplificado.
          Para estrutura de verdade, procure um engenheiro.
        </p>
      </aside>
      <div className="analysis-stage">
        {st.mode === "inplane" ? (
          view3d ? (
            <Suspense fallback={<p className="hint" role="status">Montando a peça em 3D…</p>}>
              <PartView3D shape={shape} />
            </Suspense>
          ) : (
            <canvas ref={canvasRef} width={900} height={620} className="an-canvas" data-testid="an-canvas" onClick={pickSide} aria-label="Peça com apoios, cargas e resultado" />
          )
        ) : (
          <ShelfSketch span={st.shelfSpan} thickness={settings.stock.thickness} deflection={st.shelfResult?.deflection ?? 0} />
        )}
        {st.mode === "inplane" && (
          <div className="an-stage-tools">
            <button type="button" className={`rb${view3d ? "" : " active"}`} onClick={() => setView3d(false)} data-testid="an-view-2d">Análise</button>
            <button type="button" className={`rb${view3d ? " active" : ""}`} onClick={() => setView3d(true)} data-testid="an-view-3d">Peça em 3D</button>
            {!view3d && st.result && (
              <label className="checkbox an-deformed">
                <input type="checkbox" checked={st.showDeformed} onChange={(e) => st.setShowDeformed(e.target.checked)} data-testid="an-deformed" />
                Mostrar deformada exagerada
              </label>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Esboço da prateleira no vão, com a flecha exagerada quando há resultado. */
function ShelfSketch({ span, thickness, deflection }: { span: number; thickness: number; deflection: number }) {
  const W = 520, H = 220, pad = 40;
  const k = (W - 2 * pad) / span;
  const t = Math.max(6, thickness * k);
  const sag = deflection > 0 ? Math.min(60, 8 + deflection * 6) : 0;
  const midY = 80;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="an-shelf-sketch" role="img" aria-label="Esboço da prateleira no vão" data-testid="an-shelf-sketch">
      <path d={`M ${pad} ${midY} Q ${W / 2} ${midY + sag * 2} ${W - pad} ${midY} l 0 ${t} Q ${W / 2} ${midY + t + sag * 2} ${pad} ${midY + t} Z`} className="shelf-board" />
      <path d={`M ${pad - 12} ${midY + t} l 24 0 l -12 30 Z M ${W - pad - 12} ${midY + t} l 24 0 l -12 30 Z`} className="shelf-supports" />
      {deflection > 0 && <text x={W / 2} y={midY + t + sag * 2 + 24} textAnchor="middle" className="shelf-label">{deflection.toFixed(1)} mm</text>}
    </svg>
  );
}
