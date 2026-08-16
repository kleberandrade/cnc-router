import type { StockOrigin } from "../types";

const POINTS: { id: StockOrigin; label: string; x: number; y: number }[] = [
  { id: "back-left", label: "Fundo esquerdo", x: 0, y: 0 },
  { id: "back-right", label: "Fundo direito", x: 1, y: 0 },
  { id: "center", label: "Centro", x: 0.5, y: 0.5 },
  { id: "front-left", label: "Frente esquerda (padrão)", x: 0, y: 1 },
  { id: "front-right", label: "Frente direita", x: 1, y: 1 },
];

/** Miniature of the stock with clickable origin points (4 corners + centre). Keyboard: arrows move between points. */
export function OriginPicker({ value, onChange, width, height }: { value: StockOrigin; onChange: (o: StockOrigin) => void; width: number; height: number }) {
  const W = 120, ratio = height / Math.max(width, 1);
  const H = Math.max(40, Math.min(90, W * ratio));
  const move = (dx: number, dy: number) => {
    const cur = POINTS.find((p) => p.id === value)!;
    const nx = Math.min(1, Math.max(0, cur.x + dx * 0.5)), ny = Math.min(1, Math.max(0, cur.y + dy * 0.5));
    // nearest point to the target (ties → the one further from the centre row, i.e. corners first)
    const cand = [...POINTS].filter((p) => p.id !== value).sort((a, b) => Math.hypot(a.x - nx, a.y - ny) - Math.hypot(b.x - nx, b.y - ny) || b.y - a.y)[0];
    if (cand) onChange(cand.id);
  };
  const label = POINTS.find((p) => p.id === value)?.label ?? value;
  return (
    <div className="origin-picker" data-testid="stock-origin" data-value={value} role="radiogroup" aria-label="Origem (X0 Y0)"
      onKeyDown={(e) => { if (e.key === "ArrowLeft") move(-1, 0); if (e.key === "ArrowRight") move(1, 0); if (e.key === "ArrowUp") move(0, -1); if (e.key === "ArrowDown") move(0, 1); }}>
      <div className="op-box" style={{ width: W + 24, height: H + 24 }}>
      <svg width={W + 24} height={H + 24} viewBox={`-12 -12 ${W + 24} ${H + 24}`} aria-hidden="true">
        <rect x={0} y={0} width={W} height={H} rx={3} className="op-stock" />
        <text x={W / 2} y={H + 10} className="op-caption" textAnchor="middle">frente da máquina</text>
        <text x={W / 2} y={-4} className="op-caption" textAnchor="middle">fundo</text>
      </svg>
      {POINTS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          aria-label={p.label}
          title={p.label}
          className={`op-point${value === p.id ? " active" : ""}`}
          style={{ left: 12 + p.x * W, top: 12 + p.y * H }}
          onClick={() => onChange(p.id)}
          data-testid={`origin-${p.id}`}
        >
          {value === p.id ? "0,0" : ""}
        </button>
      ))}
      </div>
      <span className="op-label">{label}</span>
    </div>
  );
}
