import { Square, Circle as CircleIcon, Pentagon, Check, Undo2, Redo2, Trash2, SlidersHorizontal, Play, Pause, RotateCcw, StepBack, StepForward, SkipBack, SkipForward, Maximize } from "lucide-react";
import { useProjectActions } from "./useProjectActions";
import { useUiStore } from "../state/uiStore";
import { useSimStore } from "../state/simStore";

const ICON = 20;

interface BtnProps { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; active?: boolean; primary?: boolean; testId?: string }
function Btn({ icon, label, onClick, disabled, active, primary, testId }: BtnProps) {
  return (
    <button
      type="button"
      className={`bb-btn${active ? " active" : ""}${primary ? " primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-testid={testId}
    >
      {icon}
      <span className="bb-label">{label}</span>
    </button>
  );
}

/** Mobile bottom action bar (replaces the ribbon below 768 px). */
export function BottomBar() {
  const actions = useProjectActions();
  const view = useUiStore((s) => s.view);
  const sheetOpen = useUiStore((s) => s.sheetOpen);
  const setSheetOpen = useUiStore((s) => s.setSheetOpen);
  const draft = useUiStore((s) => s.draft);
  const playing = useSimStore((s) => s.playing);
  const duration = useSimStore((s) => s.duration);
  const t = useSimStore((s) => s.t);
  const simCamera = useUiStore((s) => s.simCamera);
  const { toggle, stepForward, stepBack, reset, toEnd } = useSimStore.getState();
  const simDisabled = duration <= 0;
  const atEnd = duration > 0 && t >= duration;

  return (
    <nav className="bottom-bar" aria-label="Ações" data-testid="bottom-bar">
      {view === "editor" ? (
        <>
          <Btn icon={<Square size={ICON} />} label="Retângulo" onClick={actions.addRectangle} testId="mb-add-rectangle" />
          <Btn icon={<CircleIcon size={ICON} />} label="Círculo" onClick={actions.addCircle} testId="mb-add-circle" />
          {actions.tool === "polygon" ? (
            <Btn
              icon={<Check size={ICON} />}
              label={draft.length >= 3 ? "Fechar polígono" : "Cancelar polígono"}
              onClick={() => {
                if (draft.length >= 3) window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
                else actions.setTool("select");
              }}
              active
              testId="mb-close-polygon"
            />
          ) : (
            <Btn icon={<Pentagon size={ICON} />} label="Polígono" onClick={() => actions.setTool("polygon")} testId="mb-polygon" />
          )}
          <Btn icon={<Undo2 size={ICON} />} label="Desfazer" onClick={actions.undo} disabled={actions.pastStates === 0} testId="mb-undo" />
          <Btn icon={<Redo2 size={ICON} />} label="Refazer" onClick={actions.redo} disabled={actions.futureStates === 0} testId="mb-redo" />
          <Btn icon={<Trash2 size={ICON} />} label="Excluir" onClick={actions.remove} disabled={!actions.selectedId} testId="mb-delete" />
        </>
      ) : (
        <>
          <Btn icon={<SkipBack size={ICON} />} label="Início" onClick={reset} disabled={simDisabled} />
          <Btn icon={<StepBack size={ICON} />} label="Anterior" onClick={stepBack} disabled={simDisabled} testId="mb-step-back" />
          <Btn
            icon={playing ? <Pause size={ICON} /> : atEnd ? <RotateCcw size={ICON} /> : <Play size={ICON} />}
            label={playing ? "Pausar" : atEnd ? "Reiniciar" : "Simular"}
            onClick={toggle}
            disabled={simDisabled}
            primary
            testId="mb-simulate-toggle"
          />
          <Btn icon={<StepForward size={ICON} />} label="Próximo" onClick={stepForward} disabled={simDisabled} testId="mb-step-forward" />
          <Btn icon={<SkipForward size={ICON} />} label="Fim" onClick={toEnd} disabled={simDisabled} />
          <Btn icon={<Maximize size={ICON} />} label="Ajustar" onClick={() => simCamera?.fit()} disabled={!simCamera} />
        </>
      )}
      <Btn icon={<SlidersHorizontal size={ICON} />} label="Ajustes" onClick={() => setSheetOpen(!sheetOpen)} active={sheetOpen} testId="mb-settings" />
      {actions.inputs}
    </nav>
  );
}
