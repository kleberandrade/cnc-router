import { useEffect, useState } from "react";
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

/**
 * Numeric input that never pushes an invalid value to the store:
 * empty/invalid text keeps the last valid value (restored on blur / Enter).
 * Arrow keys step by `step` (×10 with Shift).
 */
export function NumberField({ label, value, onChange, unit, min, max, step = 1, badge, testId, disabled, hint }: Props) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Sync from store when not editing.
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

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
          value={text}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          data-testid={testId}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => {
            setFocused(false);
            setText(String(commit(text)));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const delta = (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
              const next = Math.round((value + delta) * 1000) / 1000;
              const v = parseNumberInput(String(next), value, { min, max });
              setText(String(v));
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
