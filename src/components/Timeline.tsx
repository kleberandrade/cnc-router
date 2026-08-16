import { useEffect, useMemo, useState } from "react";
import { Play, Pause, Plus, Minus, Move, Pencil, Settings2, FolderInput, Circle } from "lucide-react";
import { useProjectStore, useTemporalStore } from "../state/store";
import { describeStep, type HistoryStep } from "../lib/history";
import type { Shape, MachineSettings } from "../types";

type Snap = { shapes: Shape[]; settings: MachineSettings };
const ICON: Record<HistoryStep["kind"], typeof Plus> = { add: Plus, remove: Minus, move: Move, edit: Pencil, settings: Settings2, load: FolderInput, unknown: Circle };

/**
 * Fusion-like timeline of the session: one marker per change (from the undo history), hover shows the
 * label, click jumps to that state (undo/redo in batch), ▶ replays the construction step by step.
 */
export function Timeline() {
  const past = useTemporalStore((s) => s.pastStates) as unknown as Snap[];
  const future = useTemporalStore((s) => s.futureStates) as unknown as Snap[];
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const [playing, setPlaying] = useState(false);

  // markers: transitions past[0]→past[1]→…→current→future[0]…; index i = "after step i"
  const steps = useMemo(() => {
    const seq: Snap[] = [...past, { shapes, settings }, ...[...future].reverse()];
    const out: (HistoryStep & { idx: number })[] = [];
    for (let i = 1; i < seq.length; i++) out.push({ ...describeStep(seq[i - 1], seq[i]), idx: i });
    return out;
  }, [past, future, shapes, settings]);
  const cursor = past.length; // current position (0 = initial)

  const jump = (target: number) => {
    const t = useProjectStore.temporal.getState();
    const cur = t.pastStates.length;
    if (target < cur) t.undo(cur - target);
    else if (target > cur) t.redo(target - cur);
  };

  useEffect(() => {
    if (!playing) return;
    if (cursor >= steps.length) { setPlaying(false); return; }
    const id = setTimeout(() => jump(cursor + 1), 450);
    return () => clearTimeout(id);
  }, [playing, cursor, steps.length]);

  if (steps.length === 0) return null;
  return (
    <div className="timeline" role="toolbar" aria-label="Histórico do projeto" data-testid="timeline">
      <button type="button" className="icon-button" onClick={() => { if (cursor >= steps.length) jump(0); setPlaying((p) => !p); }} aria-label={playing ? "Pausar" : "Reproduzir passos"} title={playing ? "Pausar" : "Reproduzir a construção passo a passo"} data-testid="timeline-play">
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <button type="button" className={`tl-mark tl-start${cursor === 0 ? " current" : ""}`} onClick={() => jump(0)} title="Início" aria-label="Início" data-testid="timeline-0" />
      <div className="tl-track">
        {steps.map((st) => {
          const I = ICON[st.kind];
          return (
            <button
              key={st.idx}
              type="button"
              className={`tl-mark tl-${st.kind}${st.idx === cursor ? " current" : ""}${st.idx > cursor ? " future" : ""}`}
              onClick={() => jump(st.idx)}
              title={st.label}
              aria-label={st.label}
              aria-current={st.idx === cursor ? "step" : undefined}
              data-testid={`timeline-${st.idx}`}
            >
              <I size={11} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <span className="tl-count" data-testid="timeline-count">{cursor}/{steps.length}</span>
    </div>
  );
}
