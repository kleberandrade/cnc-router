import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../state/store";
import { parseNumberInput } from "../lib/numberInput";
import type { Shape } from "../types";

interface Field { key: string; label: string; value: number; min: number; apply: (v: number) => Partial<Shape> }

function fieldsFor(shape: Shape): Field[] {
  switch (shape.kind) {
    case "rectangle":
      return [
        { key: "w", label: "L", value: shape.width, min: 0.1, apply: (v) => ({ width: v }) },
        { key: "h", label: "A", value: shape.height, min: 0.1, apply: (v) => ({ height: v }) },
      ];
    case "circle":
      return [{ key: "r", label: "R", value: shape.radius, min: 0.1, apply: (v) => ({ radius: v }) }];
    case "ngon":
      return [
        { key: "r", label: "R", value: shape.radius, min: 0.1, apply: (v) => ({ radius: v }) },
        { key: "n", label: "N", value: shape.sides, min: 3, apply: (v) => ({ sides: Math.round(v) }) },
      ];
    case "text":
      return [{ key: "s", label: "Tam", value: shape.size, min: 1, apply: (v) => ({ size: v }) }];
    case "slot":
      return [
        { key: "l", label: "L", value: shape.length, min: 0.1, apply: (v) => ({ length: v }) },
        { key: "w", label: "A", value: shape.width, min: 0.1, apply: (v) => ({ width: v }) },
      ];
    default:
      return [];
  }
}

/**
 * Fusion-like inline dimension inputs floating next to the selected shape.
 * Tab cycles fields, Enter commits, Esc leaves.
 */
export function InlineDimensions({ shape, anchorPx }: { shape: Shape; anchorPx: [number, number] }) {
  const updateShape = useProjectStore((s) => s.updateShape);
  const fields = fieldsFor(shape);
  const [values, setValues] = useState<Record<string, string>>({});
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.key] = String(f.value);
    setValues(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);

  if (fields.length === 0) return null;

  const commit = (f: Field) => {
    const v = parseNumberInput(values[f.key] ?? "", f.value, { min: f.min });
    if (v !== f.value) updateShape(shape.id, f.apply(v));
    else setValues((s) => ({ ...s, [f.key]: String(f.value) }));
  };

  return (
    <div className="inline-dims" style={{ left: anchorPx[0] + 10, top: anchorPx[1] - 34 }} data-testid="inline-dims" onMouseDown={(e) => e.stopPropagation()}>
      {fields.map((f, i) => (
        <label key={f.key} className="inline-dim">
          <span>{f.label}</span>
          <input
            ref={i === 0 ? firstRef : undefined}
            type="number"
            inputMode="decimal"
            value={values[f.key] ?? ""}
            min={f.min}
            step={f.key === "n" ? 1 : 0.5}
            data-testid={`dim-${f.key}`}
            onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
            onBlur={() => commit(f)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commit(f); (e.target as HTMLInputElement).blur(); }
              else if (e.key === "Escape") { setValues((s) => ({ ...s, [f.key]: String(f.value) })); (e.target as HTMLInputElement).blur(); }
              // Tab: browser moves focus to the next input; commit happens on blur.
              e.stopPropagation();
            }}
          />
          <span className="unit">{f.key === "n" ? "" : "mm"}</span>
        </label>
      ))}
    </div>
  );
}
