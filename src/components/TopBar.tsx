import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown, FilePlus, FolderOpen, Save, Download, Upload, Undo2, Redo2, Square, Circle as CircleIcon, Pentagon,
  Copy, Trash2, ZoomIn, ZoomOut, Maximize, PanelLeft, SkipBack, SkipForward, StepBack, StepForward, Play, Pause,
  RotateCcw, ArrowUpFromLine, Box, Keyboard, Info, Hexagon, RectangleHorizontal, Magnet, Settings2, Type,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Combine, SquareMinus, SquareDot, LayoutGrid, AlignCenterHorizontal as AlignIcon,
} from "lucide-react";
import { OverflowRibbon, RibbonButton, ICON, type RibbonGroupDef } from "./Ribbon";
import { useProjectActions } from "./useProjectActions";
import { useUiStore, type View } from "../state/uiStore";
import { useProjectStore } from "../state/store";
import { useSimStore, SPEEDS, type Speed } from "../state/simStore";
import type { StepMode } from "../lib/playback";
import { useInstallAction } from "../hooks/useInstallAction";
import { BrandMark } from "./BrandMark";

function RibbonGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rgroup" role="group" aria-label={title}>
      <div className="rgroup-items">{children}</div>
      <div className="rgroup-title">{title}</div>
    </div>
  );
}

function ProjectMenu({ actions }: { actions: ReturnType<typeof useProjectActions> }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "shortcuts" | "about" | "prefs">(null);
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
        <BrandMark size={ICON} className="brand-mark" />
        <span className="brand-name">Oficina CNC</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="menu" role="menu" data-testid="project-menu-list">
          {item(<FilePlus size={16} />, "Novo projeto", actions.newProject, "menu-new")}
          {item(<FolderOpen size={16} />, "Abrir projeto (.json)…", actions.openProject, "menu-open")}
          {item(<Save size={16} />, "Salvar projeto (.json)", actions.saveProject, "menu-save", "Ctrl+S")}
          {item(<Upload size={16} />, "Importar SVG / DXF…", actions.importSvg, "menu-import")}
          <div className="menu-sep" />
          {item(<Download size={16} />, "Exportar G-code", actions.exportGcode, "menu-export")}
          <div className="menu-sep" />
          {installAction && item(installAction.icon, installAction.label, installAction.run, "menu-install")}
          {item(<Settings2 size={16} />, "Preferências (tema, mouse)", () => setDialog("prefs"), "menu-prefs")}
          {item(<Keyboard size={16} />, "Atalhos de teclado", () => setDialog("shortcuts"), "menu-shortcuts", "?")}
          {item(<Info size={16} />, "Sobre", () => setDialog("about"), "menu-about")}
        </div>
      )}
      {dialog && (
        <div className="dialog-backdrop" onClick={() => setDialog(null)} role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} data-testid="dialog">
            {dialog === "shortcuts" ? <Shortcuts /> : dialog === "prefs" ? <Preferences /> : <About />}
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
    ["Ctrl+A", "Selecionar tudo"],
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

function Preferences() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const mouse = useUiStore((s) => s.mousePreset);
  const setMouse = useUiStore((s) => s.setMousePreset);
  return (
    <>
      <h2>Preferências</h2>
      <label className="pref-row">
        Tema
        <select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")} data-testid="pref-theme">
          <option value="system">Seguir o sistema</option>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </label>
      <label className="pref-row">
        Mouse no 3D
        <select value={mouse} onChange={(e) => setMouse(e.target.value as "standard" | "fusion")} data-testid="pref-mouse">
          <option value="standard">Padrão — esquerdo orbita, direito move, roda zoom</option>
          <option value="fusion">Fusion — botão do meio move, esquerdo orbita</option>
        </select>
      </label>
      <p className="hint">Unidades: milímetros. Snap e ordem de usinagem ficam no projeto.</p>
    </>
  );
}

function NestDialog({ onDone }: { onDone: () => void }) {
  const actions = useProjectActions();
  const settings = useProjectStore((s) => s.settings);
  const [gap, setGap] = useState(2);
  const [rotate, setRotate] = useState(true);
  const spacing = Math.round((settings.toolDiameter + gap) * 100) / 100;
  const scope = actions.selectedIds.length >= 2 ? `${actions.selectedIds.length} peças selecionadas` : "todas as peças visíveis e destravadas";
  return (
    <>
      <h2>Organizar na chapa</h2>
      <p className="hint">Arruma {scope} na chapa {settings.stock.width} × {settings.stock.height} mm (caixas envolventes, maiores primeiro; rotação de 90° quando ajudar). Desfazer com Ctrl+Z.</p>
      <label className="pref-row">
        Folga entre peças (além do Ø da fresa)
        <span><input type="number" min={0} step={0.5} value={gap} onChange={(e) => setGap(Number(e.target.value) || 0)} data-testid="nest-gap" style={{ width: "5em" }} /> mm → espaçamento {spacing} mm</span>
      </label>
      <label className="pref-row">
        Permitir girar 90°
        <input type="checkbox" checked={rotate} onChange={(e) => setRotate(e.target.checked)} data-testid="nest-rotate" />
      </label>
      <button type="button" className="rb primary" onClick={() => { actions.nest({ spacing, allowRotate: rotate }); onDone(); }} data-testid="nest-apply">Organizar</button>
    </>
  );
}

function About() {
  return (
    <>
      <h2 className="about-title">
        <BrandMark size={28} filled />
        Oficina CNC
      </h2>
      <p>Editor 2D com importação SVG/DXF, gerador de G-code GRBL e simulador 3D para router CNC — 100% no navegador, instalável como PWA.</p>
      <p className="hint">Unidades: milímetros. Origem de trabalho definida pela chapa. Percurso do simulador é o mesmo do G-code exportado.</p>
    </>
  );
}

export function TopBar() {
  const actions = useProjectActions();
  const [nestOpen, setNestOpen] = useState(false);
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);

  useEffect(() => {
    document.title = view === "simulator" ? "Simular — Oficina CNC" : "Desenhar — Oficina CNC";
  }, [view]);
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

  const sel = actions.selectedIds.length;
  const editorGroups: RibbonGroupDef[] = [
    {
      key: "criar", title: "Criar", priority: 1, items: [
        { icon: <Square size={ICON} />, label: "Retângulo", onClick: actions.addRectangle, testId: "add-rectangle", title: "Retângulo (R)" },
        { icon: <CircleIcon size={ICON} />, label: "Círculo", onClick: actions.addCircle, testId: "add-circle", title: "Círculo (C)" },
        { icon: <Pentagon size={ICON} />, label: "Polígono", onClick: () => actions.setTool(actions.tool === "polygon" ? "select" : "polygon"), active: actions.tool === "polygon", testId: "tool-polygon", title: "Polígono: clique os vértices, Enter/duplo clique fecha (P)" },
        { icon: <Hexagon size={ICON} />, label: "Regular", onClick: actions.addNgon, testId: "add-ngon", title: "Polígono regular (N)" },
        { icon: <RectangleHorizontal size={ICON} />, label: "Rasgo", onClick: actions.addSlot, testId: "add-slot", title: "Rasgo / oblongo (O)" },
        { icon: <Type size={ICON} />, label: "Texto", onClick: actions.addText, testId: "add-text", title: "Texto (T)" },
      ],
    },
    {
      key: "modificar", title: "Modificar", priority: 2, items: [
        { icon: <Copy size={ICON} />, label: "Duplicar", onClick: actions.duplicate, disabled: !actions.selectedId, testId: "duplicate", title: "Duplicar (Ctrl+D)" },
        { icon: <Trash2 size={ICON} />, label: "Excluir", onClick: actions.remove, disabled: !actions.selectedId, testId: "delete", title: "Excluir (Del)" },
        { icon: <Undo2 size={ICON} />, label: "Desfazer", onClick: actions.undo, disabled: actions.pastStates === 0, testId: "undo", title: "Desfazer (Ctrl+Z)" },
        { icon: <Redo2 size={ICON} />, label: "Refazer", onClick: actions.redo, disabled: actions.futureStates === 0, testId: "redo", title: "Refazer (Ctrl+Y)" },
      ],
    },
    {
      key: "arranjar", title: "Arranjar", priority: 3, items: [
        { icon: <LayoutGrid size={ICON} />, label: "Organizar", onClick: () => setNestOpen(true), disabled: actions.shapes.length === 0, testId: "nest", title: "Organizar as peças na chapa (nesting)" },
        { icon: <Combine size={ICON} />, label: "Unir", onClick: () => actions.boolean("union"), disabled: sel < 2, testId: "bool-union", title: "União das formas selecionadas" },
        { icon: <SquareMinus size={ICON} />, label: "Subtrair", onClick: () => actions.boolean("difference"), disabled: sel < 2, testId: "bool-difference", title: "Subtrair as outras da primeira selecionada" },
        { icon: <SquareDot size={ICON} />, label: "Intersec.", onClick: () => actions.boolean("intersection"), disabled: sel < 2, testId: "bool-intersection", title: "Interseção das formas selecionadas" },
        {
          icon: <AlignIcon size={ICON} />, label: "Alinhar", disabled: sel < 2, testId: "align-menu", title: "Alinhar / distribuir (2+ formas)", onClick: () => {},
          menu: [
            { icon: <AlignStartVertical size={ICON} />, label: "Esquerda", onClick: () => actions.alignSelected("left"), testId: "align-left", title: "Alinhar à esquerda" },
            { icon: <AlignCenterVertical size={ICON} />, label: "Centro (horizontal)", onClick: () => actions.alignSelected("centerX"), testId: "align-centerx", title: "Centralizar horizontalmente" },
            { icon: <AlignEndVertical size={ICON} />, label: "Direita", onClick: () => actions.alignSelected("right"), testId: "align-right", title: "Alinhar à direita" },
            { icon: <AlignStartHorizontal size={ICON} />, label: "Topo", onClick: () => actions.alignSelected("top"), testId: "align-top", title: "Alinhar ao topo" },
            { icon: <AlignCenterHorizontal size={ICON} />, label: "Meio (vertical)", onClick: () => actions.alignSelected("centerY"), testId: "align-centery", title: "Centralizar verticalmente" },
            { icon: <AlignEndHorizontal size={ICON} />, label: "Base", onClick: () => actions.alignSelected("bottom"), testId: "align-bottom", title: "Alinhar à base" },
            { icon: <AlignHorizontalSpaceAround size={ICON} />, label: "Distribuir na horizontal", onClick: () => actions.distributeSelected("horizontal"), disabled: sel < 3, testId: "distribute-h", title: "Distribuir horizontalmente (3+)" },
            { icon: <AlignVerticalSpaceAround size={ICON} />, label: "Distribuir na vertical", onClick: () => actions.distributeSelected("vertical"), disabled: sel < 3, testId: "distribute-v", title: "Distribuir verticalmente (3+)" },
          ],
        },
      ],
    },
    {
      key: "vista", title: "Vista", priority: 4, items: [
        { icon: <ZoomOut size={ICON} />, label: "Reduzir", onClick: actions.zoomOut, testId: "zoom-out", title: "Reduzir (−)" },
        { icon: <Maximize size={ICON} />, label: `${Math.round(actions.zoom * 100)}%`, onClick: actions.zoomFit, testId: "zoom-fit", title: "Ajustar à mesa (0)", labelClass: "zoom-label" },
        { icon: <ZoomIn size={ICON} />, label: "Ampliar", onClick: actions.zoomIn, testId: "zoom-in", title: "Ampliar (+)" },
        { icon: <Magnet size={ICON} />, label: "Snap", onClick: actions.toggleSnap, active: actions.snap, testId: "snap-toggle", title: "Snap a chapa/formas (S)" },
      ],
    },
    {
      key: "projeto", title: "Projeto", priority: 5, items: [
        { icon: <FilePlus size={ICON} />, label: "Novo", onClick: actions.newProject, testId: "new-project", title: "Novo projeto" },
        { icon: <FolderOpen size={ICON} />, label: "Abrir", onClick: actions.openProject, testId: "open-project", title: "Abrir projeto (.json)" },
        { icon: <Save size={ICON} />, label: "Salvar", onClick: actions.saveProject, testId: "save-project", title: "Salvar projeto (.json) — Ctrl+S" },
        { icon: <Upload size={ICON} />, label: "Importar", onClick: actions.importSvg, testId: "import-svg", title: "Importar SVG ou DXF" },
      ],
    },
  ];

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

      {view === "editor" ? (
        <OverflowRibbon groups={editorGroups} />
      ) : (
      <div className="ribbon" role="toolbar" aria-label="Ações">
        {(
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
      )}

      <div className="topbar-right">
        <RibbonButton icon={<Download size={ICON} />} label="Exportar G-code" onClick={actions.exportGcode} primary testId="export-gcode" />
      </div>
      {actions.inputs}
      {nestOpen && (
        <div className="dialog-backdrop" onClick={() => setNestOpen(false)} role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} data-testid="nest-dialog">
            <NestDialog onDone={() => setNestOpen(false)} />
            <button type="button" className="dialog-close" onClick={() => setNestOpen(false)}>Fechar</button>
          </div>
        </div>
      )}
    </header>
  );
}
