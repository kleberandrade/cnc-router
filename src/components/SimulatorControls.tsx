import { useEffect, useMemo, useRef } from "react";
import { useSimStore, SPEEDS, type Speed } from "../state/simStore";
import type { Segment } from "../lib/toolpath";
import type { Timing } from "../lib/timing";
import { formatClock } from "../lib/timing";
import { progressAt, type StepMode } from "../lib/playback";

interface Props {
  segments: Segment[];
  timing: Timing;
  currentLine: string;
  onFit: () => void;
  onTopView: () => void;
}

const OP_LABEL: Record<Segment["op"], string> = {
  outline: "contorno",
  pocket: "rebaixo",
  travel: "deslocamento",
};

export function SimulatorControls({ segments, timing, currentLine, onFit, onTopView }: Props) {
  const t = useSimStore((s) => s.t);
  const playing = useSimStore((s) => s.playing);
  const speed = useSimStore((s) => s.speed);
  const stepMode = useSimStore((s) => s.stepMode);
  const duration = useSimStore((s) => s.duration);
  const boundaries = useSimStore((s) => s.boundaries);
  const { toggle, seek, stepForward, stepBack, reset, toEnd, setSpeed, setStepMode } = useSimStore.getState();

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

  const atEnd = duration > 0 && t >= duration;

  return (
    <div
      ref={rootRef}
      className="simulator-controls"
      tabIndex={0}
      aria-label="Controles da simulação"
      data-testid="simulator-controls"
    >
      <div className="sim-row">
        <button type="button" onClick={reset} disabled={disabled} title="Início (Home)" aria-label="Início">
          ⏮
        </button>
        <button type="button" onClick={stepBack} disabled={disabled} title="Passo anterior (←)" aria-label="Passo anterior" data-testid="sim-step-back">
          ⏪
        </button>
        <button
          type="button"
          className="primary"
          onClick={toggle}
          disabled={disabled}
          title="Reproduzir/pausar (espaço)"
          data-testid="simulate-toggle"
        >
          {playing ? "Pausar simulação" : atEnd ? "Reiniciar" : "Simular"}
        </button>
        <button type="button" onClick={stepForward} disabled={disabled} title="Próximo passo (→)" aria-label="Próximo passo" data-testid="sim-step-forward">
          ⏩
        </button>
        <button type="button" onClick={toEnd} disabled={disabled} title="Fim (End)" aria-label="Fim">
          ⏭
        </button>

        <label className="sim-select">
          Velocidade
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value) as Speed)} data-testid="sim-speed">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <label className="sim-select">
          Passo
          <select value={stepMode} onChange={(e) => setStepMode(e.target.value as StepMode)} data-testid="sim-step-mode">
            <option value="segment">segmento</option>
            <option value="pass">passe</option>
            <option value="shape">forma</option>
          </select>
        </label>
        <button type="button" onClick={onFit} title="Ajustar à peça">
          Ajustar
        </button>
        <button type="button" onClick={onTopView} title="Vista superior">
          Vista superior
        </button>
      </div>

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
