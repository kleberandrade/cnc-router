import { useEffect, useMemo, useRef } from "react";
import { useSimStore } from "../state/simStore";
import type { Segment } from "../lib/toolpath";
import type { Timing } from "../lib/timing";
import { formatClock } from "../lib/timing";
import { progressAt } from "../lib/playback";

interface Props {
  segments: Segment[];
  timing: Timing;
  currentLine: string;
}

const OP_LABEL: Record<Segment["op"], string> = {
  outline: "contorno",
  pocket: "rebaixo",
  travel: "deslocamento",
};

/** Timeline + status readout under the 3D view (transport buttons live in the TopBar ribbon). */
export function SimulatorControls({ segments, timing, currentLine }: Props) {
  const t = useSimStore((s) => s.t);
  const stepMode = useSimStore((s) => s.stepMode);
  const duration = useSimStore((s) => s.duration);
  const boundaries = useSimStore((s) => s.boundaries);
  const { toggle, seek, stepForward, stepBack, reset, toEnd } = useSimStore.getState();

  const disabled = segments.length === 0 || duration <= 0;
  const rootRef = useRef<HTMLDivElement>(null);
  const progress = useMemo(() => progressAt(segments, timing, t), [segments, timing, t]);

  // Keyboard shortcuts while the simulator has focus.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          toggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) useSimStore.getState().setStepMode("pass");
          stepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          stepBack();
          break;
        case "Home":
          e.preventDefault();
          reset();
          break;
        case "End":
          e.preventDefault();
          toEnd();
          break;
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [disabled, toggle, stepForward, stepBack, reset, toEnd]);

  const shapeBoundaries = useMemo(() => {
    // tick marks at the end of each shape (independent of the current step mode)
    const marks: number[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const s = segments[i];
      if (s.shapeId !== null && s.shapeId !== segments[i + 1].shapeId) marks.push(timing.cumulative[i]);
    }
    return marks;
  }, [segments, timing]);

  return (
    <div
      ref={rootRef}
      className="simulator-controls"
      tabIndex={0}
      aria-label="Controles da simulação"
      data-testid="simulator-controls"
    >
      <div className="sim-timeline">
        <span className="sim-clock" data-testid="sim-elapsed">
          {formatClock(t)}
        </span>
        <div className="sim-range-wrap">
          <input
            type="range"
            min={0}
            max={Math.max(Math.ceil(duration * 100) / 100, 0.01)}
            step={0.01}
            value={Math.round(Math.min(t, duration) * 100) / 100}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={disabled}
            aria-label="Linha do tempo da simulação"
            data-testid="sim-timeline"
          />
          <div className="sim-ticks" aria-hidden="true">
            {duration > 0 &&
              shapeBoundaries.map((b) => (
                <span key={b} className="sim-tick" style={{ left: `${(b / duration) * 100}%` }} />
              ))}
          </div>
        </div>
        <span className="sim-clock" data-testid="sim-total">
          {formatClock(duration)}
        </span>
      </div>

      <div className="sim-status" data-testid="sim-status">
        <span>restante {formatClock(Math.max(duration - t, 0))}</span>
        {progress.segmentIndex >= 0 && (
          <span>
            {progress.shapeIndex >= 0
              ? `forma ${progress.shapeIndex + 1}/${progress.shapeCount} · passe ${progress.pass}/${progress.passCount} · ${OP_LABEL[progress.op]}`
              : OP_LABEL[progress.op]}
          </span>
        )}
        <code className="sim-line" data-testid="sim-line">
          {currentLine}
        </code>
        <span className="sim-muted">
          {boundaries.length} {stepMode === "segment" ? "segmentos" : stepMode === "pass" ? "passes" : "formas"}
        </span>
      </div>
    </div>
  );
}
