import { useState } from "react";
import { parseNumberInput } from "../lib/numberInput";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Extra decoration after the label (e.g. a "manual" badge). */
  badge?: React.ReactNode;
  testId?: string;
  disabled?: boolean;
  /** Short helper text under the field. */
  hint?: string;
}

/** Translate stepping keys without coupling keyboard policy to component state. */
function stepDelta(key: string, step: number, shift: boolean): number | undefined {
  const direction = key === "ArrowUp" ? 1 : key === "ArrowDown" ? -1 : undefined;
  return direction === undefined ? undefined : direction * step * (shift ? 10 : 1);
}

/**
 * Numeric input that never pushes an invalid value to the store:
 * empty/invalid text keeps the last valid value (restored on blur / Enter).
 * Arrow keys step by `step` (×10 with Shift).
 */
export function NumberField({ label, value, onChange, unit, min, max, step = 1, badge, testId, disabled, hint }: Props) {
  // A draft exists only while editing. External updates render directly when idle,
  // so a delayed effect cannot overwrite a newly focused/filled field.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const v = parseNumberInput(raw, value, { min, max });
    if (v !== value) onChange(v);
    return v;
  };

  return (
    <label className="number-field">
      <span className="label-row">
        {label}
        {badge}
      </span>
      <span className="number-field-input">
        <input
          type="number"
          inputMode="decimal"
          value={draft ?? String(value)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          data-testid={testId}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => {
            commit(draft ?? String(value));
            setDraft(null);
          }}
          onKeyDown={(e) => {
            const delta = stepDelta(e.key, step, e.shiftKey);
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            } else if (delta !== undefined) {
              e.preventDefault();
              const next = Math.round((value + delta) * 1000) / 1000;
              const v = parseNumberInput(String(next), value, { min, max });
              setDraft(String(v));
              if (v !== value) onChange(v);
            }
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
