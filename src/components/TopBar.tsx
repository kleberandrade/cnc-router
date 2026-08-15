import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown, FilePlus, FolderOpen, Save, Download, Upload, Undo2, Redo2, Square, Circle as CircleIcon, Pentagon,
  Copy, Trash2, ZoomIn, ZoomOut, Maximize, PanelLeft, SkipBack, SkipForward, StepBack, StepForward, Play, Pause,
  RotateCcw, ArrowUpFromLine, Box, Keyboard, Info, Grid2x2, Hexagon, RectangleHorizontal, Magnet,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround,
} from "lucide-react";
import { useProjectActions } from "./useProjectActions";
import { useUiStore, type View } from "../state/uiStore";
import { useSimStore, SPEEDS, type Speed } from "../state/simStore";
import type { StepMode } from "../lib/playback";
import { useInstallAction } from "../hooks/useInstallAction";

const ICON = 18;

interface RibbonButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  primary?: boolean;
  testId?: string;
  title?: string;
}

function RibbonButton({ icon, label, onClick, disabled, active, primary, testId, title }: RibbonButtonProps) {
  return (
    <button
      type="button"
      className={`rb${active ? " active" : ""}${primary ? " primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={title ?? label}
      data-testid={testId}
    >
      <span className="rb-icon">{icon}</span>
      <span className="rb-label">{label}</span>
    </button>
  );
}

function RibbonGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={`rgroup rgroup-${title.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}`} role="group" aria-label={title}>
      <div className="rgroup-items">{children}</div>
      <div className="rgroup-title">{title}</div>
    </div>
  );
}

function ProjectMenu({ actions }: { actions: ReturnType<typeof useProjectActions> }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "shortcuts" | "about">(null);
  const ref = useRef<HTMLDivElement>(null);
  const installAction = useInstallAction();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, [open]);

  const item = (icon: ReactNode, label: string, onClick: () => void, testId?: string, hint?: string) => (
    <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); onClick(); }} data-testid={testId}>
      {icon}<span>{label}</span>{hint && <kbd>{hint}</kbd>}
    </button>
  );

  return (
    <div className="brand" ref={ref}>
      <button type="button" className="brand-button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} data-testid="project-menu">
        <Grid2x2 size={ICON} className="brand-mark" aria-hidden="true" />
        <span className="brand-name">Oficina CNC</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="menu" role="menu" data-testid="project-menu-list">
          {item(<FilePlus size={16} />, "Novo projeto", actions.newProject, "menu-new")}
          {item(<FolderOpen size={16} />, "Abrir projeto (.json)…", actions.openProject, "menu-open")}
          {item(<Save size={16} />, "Salvar projeto (.json)", actions.saveProject, "menu-save", "Ctrl+S")}
          {item(<Upload size={16} />, "Importar SVG…", actions.importSvg, "menu-import")}
          <div className="menu-sep" />
          {item(<Download size={16} />, "Exportar G-code", actions.exportGcode, "menu-export")}
          <div className="menu-sep" />
          {installAction && item(installAction.icon, installAction.label, installAction.run, "menu-install")}
          {item(<Keyboard size={16} />, "Atalhos de teclado", () => setDialog("shortcuts"), "menu-shortcuts", "?")}
          {item(<Info size={16} />, "Sobre", () => setDialog("about"), "menu-about")}
        </div>
      )}
      {dialog && (
        <div className="dialog-backdrop" onClick={() => setDialog(null)} role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} data-testid="dialog">
            {dialog === "shortcuts" ? <Shortcuts /> : <About />}
            <button type="button" className="dialog-close" onClick={() => setDialog(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Shortcuts() {
  const rows: [string, string][] = [
    ["R / C / P", "Retângulo / Círculo / Polígono"],
    ["Enter · duplo clique · Esc", "Fechar polígono · cancelar"],
    ["Del", "Excluir forma"],
    ["Ctrl+D", "Duplicar"],
    ["Ctrl+Z / Ctrl+Y", "Desfazer / Refazer"],
    ["Ctrl+S", "Salvar projeto"],
    ["Setas (Shift = 10 mm)", "Mover forma 1 mm"],
    ["Roda · + / − · 0", "Zoom · ajustar à mesa"],
    ["Espaço + arrastar", "Mover a vista"],
    ["Simulador: espaço · ← → · Home/End", "Play/pause · passo · início/fim"],
  ];
  return (
    <>
      <h2>Atalhos de teclado</h2>
      <table className="shortcuts">
        <tbody>
          {rows.map(([k, d]) => (
            <tr key={k}><td><kbd>{k}</kbd></td><td>{d}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function About() {
  return (
    <>
      <h2>Oficina CNC</h2>
      <p>Editor 2D, gerador de G-code (GRBL) e simulador 3D para router CNC — 100 % no navegador.</p>
      <p className="hint">Unidades: milímetros. Origem de trabalho definida pela chapa. Percurso do simulador é o mesmo do G-code exportado.</p>
    </>
  );
}

export function TopBar() {
  const actions = useProjectActions();
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const panelOpen = useUiStore((s) => s.panelOpen);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const simCamera = useUiStore((s) => s.simCamera);

  const playing = useSimStore((s) => s.playing);
  const speed = useSimStore((s) => s.speed);
  const stepMode = useSimStore((s) => s.stepMode);
  const duration = useSimStore((s) => s.duration);
  const t = useSimStore((s) => s.t);
  const { toggle, stepForward, stepBack, reset, toEnd, setSpeed, setStepMode } = useSimStore.getState();
  const simDisabled = duration <= 0;
  const atEnd = duration > 0 && t >= duration;

  const tab = (id: View, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === id}
      className={`tab${view === id ? " active" : ""}`}
      onClick={() => setView(id)}
      data-testid={`tab-${id}`}
    >
      {label}
    </button>
  );

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-button"
          onClick={togglePanel}
          aria-label={panelOpen ? "Ocultar painel" : "Mostrar painel"}
          aria-expanded={panelOpen}
          title="Painel lateral"
          data-testid="panel-toggle"
        >
          <PanelLeft size={ICON} />
        </button>
        <ProjectMenu actions={actions} />
        <nav className="tabs" role="tablist" aria-label="Modo de visualização">
          {tab("editor", "Desenhar")}
          {tab("simulator", "Simular")}
        </nav>
      </div>

      <div className="ribbon" role="toolbar" aria-label="Ações">
        {view === "editor" ? (
          <>
            <RibbonGroup title="Projeto">
              <RibbonButton icon={<FilePlus size={ICON} />} label="Novo" onClick={actions.newProject} testId="new-project" />
              <RibbonButton icon={<FolderOpen size={ICON} />} label="Abrir" onClick={actions.openProject} testId="open-project" title="Abrir projeto (.json)" />
              <RibbonButton icon={<Save size={ICON} />} label="Salvar" onClick={actions.saveProject} testId="save-project" title="Salvar projeto (.json) — Ctrl+S" />
              <RibbonButton icon={<Upload size={ICON} />} label="SVG" onClick={actions.importSvg} testId="import-svg" title="Importar SVG" />
            </RibbonGroup>
            <RibbonGroup title="Criar">
              <RibbonButton icon={<Square size={ICON} />} label="Retângulo" onClick={actions.addRectangle} testId="add-rectangle" title="Retângulo (R)" />
              <RibbonButton icon={<CircleIcon size={ICON} />} label="Círculo" onClick={actions.addCircle} testId="add-circle" title="Círculo (C)" />
              <RibbonButton
                icon={<Pentagon size={ICON} />}
                label="Polígono"
                onClick={() => actions.setTool(actions.tool === "polygon" ? "select" : "polygon")}
                active={actions.tool === "polygon"}
                testId="tool-polygon"
                title="Polígono: clique os vértices, Enter/duplo clique fecha (P)"
              />
              <RibbonButton icon={<Hexagon size={ICON} />} label="Regular" onClick={actions.addNgon} testId="add-ngon" title="Polígono regular (N)" />
              <RibbonButton icon={<RectangleHorizontal size={ICON} />} label="Rasgo" onClick={actions.addSlot} testId="add-slot" title="Rasgo / oblongo (O)" />
            </RibbonGroup>
            <RibbonGroup title="Modificar">
              <RibbonButton icon={<Copy size={ICON} />} label="Duplicar" onClick={actions.duplicate} disabled={!actions.selectedId} testId="duplicate" title="Duplicar (Ctrl+D)" />
              <RibbonButton icon={<Trash2 size={ICON} />} label="Excluir" onClick={actions.remove} disabled={!actions.selectedId} testId="delete" title="Excluir (Del)" />
              <RibbonButton icon={<Undo2 size={ICON} />} label="Desfazer" onClick={actions.undo} disabled={actions.pastStates === 0} testId="undo" title="Desfazer (Ctrl+Z)" />
              <RibbonButton icon={<Redo2 size={ICON} />} label="Refazer" onClick={actions.redo} disabled={actions.futureStates === 0} testId="redo" title="Refazer (Ctrl+Y)" />
            </RibbonGroup>
            {actions.selectedIds.length >= 2 && (
            <RibbonGroup title="Alinhar">
              <RibbonButton icon={<AlignStartVertical size={ICON} />} label="Esq." onClick={() => actions.alignSelected("left")} disabled={actions.selectedIds.length < 2} testId="align-left" title="Alinhar à esquerda" />
              <RibbonButton icon={<AlignCenterVertical size={ICON} />} label="Centro" onClick={() => actions.alignSelected("centerX")} disabled={actions.selectedIds.length < 2} testId="align-centerx" title="Centralizar horizontalmente" />
              <RibbonButton icon={<AlignEndVertical size={ICON} />} label="Dir." onClick={() => actions.alignSelected("right")} disabled={actions.selectedIds.length < 2} testId="align-right" title="Alinhar à direita" />
              <RibbonButton icon={<AlignStartHorizontal size={ICON} />} label="Topo" onClick={() => actions.alignSelected("top")} disabled={actions.selectedIds.length < 2} testId="align-top" title="Alinhar ao topo" />
              <RibbonButton icon={<AlignCenterHorizontal size={ICON} />} label="Meio" onClick={() => actions.alignSelected("centerY")} disabled={actions.selectedIds.length < 2} testId="align-centery" title="Centralizar verticalmente" />
              <RibbonButton icon={<AlignEndHorizontal size={ICON} />} label="Base" onClick={() => actions.alignSelected("bottom")} disabled={actions.selectedIds.length < 2} testId="align-bottom" title="Alinhar à base" />
              <RibbonButton icon={<AlignHorizontalSpaceAround size={ICON} />} label="Distr. H" onClick={() => actions.distributeSelected("horizontal")} disabled={actions.selectedIds.length < 3} testId="distribute-h" title="Distribuir horizontalmente" />
              <RibbonButton icon={<AlignVerticalSpaceAround size={ICON} />} label="Distr. V" onClick={() => actions.distributeSelected("vertical")} disabled={actions.selectedIds.length < 3} testId="distribute-v" title="Distribuir verticalmente" />
            </RibbonGroup>
            )}
            <RibbonGroup title="Vista">
              <RibbonButton icon={<ZoomOut size={ICON} />} label="Reduzir" onClick={actions.zoomOut} testId="zoom-out" title="Reduzir (−)" />
              <button type="button" className="rb" onClick={actions.zoomFit} title="Ajustar à mesa (0)" data-testid="zoom-fit">
                <span className="rb-icon"><Maximize size={ICON} /></span>
                <span className="rb-label zoom-label">{Math.round(actions.zoom * 100)}%</span>
              </button>
              <RibbonButton icon={<ZoomIn size={ICON} />} label="Ampliar" onClick={actions.zoomIn} testId="zoom-in" title="Ampliar (+)" />
              <RibbonButton icon={<Magnet size={ICON} />} label="Snap" onClick={actions.toggleSnap} active={actions.snap} testId="snap-toggle" title="Snap a chapa/formas (S)" />
            </RibbonGroup>
          </>
        ) : (
          <>
            <RibbonGroup title="Reproduzir">
              <RibbonButton icon={<SkipBack size={ICON} />} label="Início" onClick={reset} disabled={simDisabled} title="Início (Home)" />
              <RibbonButton icon={<StepBack size={ICON} />} label="Anterior" onClick={stepBack} disabled={simDisabled} testId="sim-step-back" title="Passo anterior (←)" />
              <RibbonButton
                icon={playing ? <Pause size={ICON} /> : atEnd ? <RotateCcw size={ICON} /> : <Play size={ICON} />}
                label={playing ? "Pausar simulação" : atEnd ? "Reiniciar" : "Simular"}
                onClick={toggle}
                disabled={simDisabled}
                primary
                testId="simulate-toggle"
                title="Reproduzir/pausar (espaço)"
              />
              <RibbonButton icon={<StepForward size={ICON} />} label="Próximo" onClick={stepForward} disabled={simDisabled} testId="sim-step-forward" title="Próximo passo (→)" />
              <RibbonButton icon={<SkipForward size={ICON} />} label="Fim" onClick={toEnd} disabled={simDisabled} title="Fim (End)" />
            </RibbonGroup>
            <RibbonGroup title="Ajustes">
              <label className="rb-select">
                <span>Velocidade</span>
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value) as Speed)} data-testid="sim-speed">
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>{s}×</option>
                  ))}
                </select>
              </label>
              <label className="rb-select">
                <span>Passo</span>
                <select value={stepMode} onChange={(e) => setStepMode(e.target.value as StepMode)} data-testid="sim-step-mode">
                  <option value="segment">segmento</option>
                  <option value="pass">passe</option>
                  <option value="shape">forma</option>
                </select>
              </label>
            </RibbonGroup>
            <RibbonGroup title="Vista">
              <RibbonButton icon={<Maximize size={ICON} />} label="Ajustar" onClick={() => simCamera?.fit()} disabled={!simCamera} testId="sim-fit" title="Ajustar à peça" />
              <RibbonButton icon={<ArrowUpFromLine size={ICON} />} label="Vista superior" onClick={() => simCamera?.top()} disabled={!simCamera} testId="sim-top" />
              <RibbonButton icon={<Box size={ICON} />} label="Isométrica" onClick={() => simCamera?.iso()} disabled={!simCamera} testId="sim-iso" />
            </RibbonGroup>
          </>
        )}
      </div>

      <div className="topbar-right">
        <RibbonButton icon={<Download size={ICON} />} label="Exportar G-code" onClick={actions.exportGcode} primary testId="export-gcode" />
      </div>
      {actions.inputs}
    </header>
  );
}
