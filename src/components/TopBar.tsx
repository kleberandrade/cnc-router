import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown, FilePlus, FolderOpen, Save, Download, Upload, Undo2, Redo2, Square, Circle as CircleIcon, Pentagon,
  Copy, Trash2, ZoomIn, ZoomOut, Maximize, PanelLeft, SkipBack, SkipForward, StepBack, StepForward, Play, Pause,
  RotateCcw, ArrowUpFromLine, Box, Keyboard, Info, Hexagon, Sparkles, Mail, ExternalLink, MessageSquarePlus, BookOpen, Compass,
  Link2, ClipboardCheck, Scissors, SquareDashedBottom, Drill, SquareArrowOutUpRight, SquareArrowDownLeft, Minus, Anchor, Spline, ListOrdered, Sun, Moon, MousePointer2, BoxSelect, ChevronUp, RectangleHorizontal, Magnet, Settings2, Type,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Combine, SquareMinus, SquareDot, LayoutGrid, AlignCenterHorizontal as AlignIcon, Printer, PencilRuler, FileText, FileDown, Layers,
} from "lucide-react";
import { OverflowRibbon, RibbonButton, ICON, type RibbonGroupDef } from "./Ribbon";
import { useProjectActions } from "./useProjectActions";
import { useUiStore, type View } from "../state/uiStore";
import { useProjectStore } from "../state/store";
import { useSimStore, SPEEDS, type Speed } from "../state/simStore";
import type { StepMode } from "../lib/playback";
import { DEFAULT_TABS, type Shape } from "../types";
import { useInstallAction } from "../hooks/useInstallAction";
import { BrandMark } from "./BrandMark";
import { PRODUCT, AUTHOR, THIRD_PARTY } from "../content/about";
import { FeedbackDialog } from "./FeedbackDialog";
import { EXAMPLES } from "../content/examples";
import { ExamplesGallery } from "./ExamplesGallery";
import { ImportImageDialog } from "./ImportImageDialog";
import { ImportVectorDialog } from "./ImportVectorDialog";
import { useSheetsStore, printSheets } from "../state/sheets";
import { standaloneSvg } from "../lib/sheet";
import { resetTour } from "./Tour";
import { verifyProject } from "../lib/verify";
import { Dialog } from "./Dialog";
import { LegalContent, LegalLinks } from "./LegalDialog";
import { versionLabel, buildLabel, CHANGELOG, isNewVersion, isFirstRun, markVersionSeen } from "../lib/version";

function ProjectMenu({ actions }: { actions: ReturnType<typeof useProjectActions> }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "shortcuts" | "about" | "prefs" | "news" | "feedback" | "privacidade" | "cookies" | "termos" | "examples">(null);
  const [hasNews, setHasNews] = useState(false);
  useEffect(() => {
    if (isFirstRun()) markVersionSeen();
    else setHasNews(isNewVersion());
  }, []);
  const openNews = () => { setDialog("news"); markVersionSeen(); setHasNews(false); };
  const galleryOpen = useUiStore((s) => s.galleryOpen);
  useEffect(() => { if (galleryOpen) { setDialog("examples"); useUiStore.getState().setGalleryOpen(false); } }, [galleryOpen]);
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace(/^#\/?/, "");
      if (h === "privacidade" || h === "cookies" || h === "termos" || h === "sobre") { setDialog(h === "sobre" ? "about" : h); history.replaceState(null, "", window.location.pathname + window.location.search); }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
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
        {hasNews && <span className="news-dot" aria-label="Há novidades" data-testid="news-dot" />}
        <span className="brand-name">Oficina CNC</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="menu" role="menu" data-testid="project-menu-list">
          {item(<FilePlus size={16} />, "Novo projeto", actions.newProject, "menu-new")}
          {item(<FolderOpen size={16} />, "Abrir projeto (.json)…", actions.openProject, "menu-open")}
          {item(<Save size={16} />, "Salvar projeto (.json)", actions.saveProject, "menu-save", "Ctrl+S")}
          {item(<Upload size={16} />, "Importar SVG / DXF / imagem…", actions.importSvg, "menu-import")}
          {item(<Link2 size={16} />, "Copiar link do projeto", () => void actions.shareLink(), "menu-share")}
          <div className="menu-sep" />
          {item(<BookOpen size={16} />, `Exemplos… (${EXAMPLES.length})`, () => setDialog("examples"), "menu-examples")}
          {item(<Compass size={16} />, "Tour rápido", () => { resetTour(); useUiStore.getState().setTourOpen(true); }, "menu-tour")}
          <div className="menu-sep" />
          {item(<Download size={16} />, "Exportar G-code", actions.exportGcode, "menu-export")}
          {item(<Printer size={16} />, "Imprimir…", () => useUiStore.getState().setView("drawing"), "menu-print", "Ctrl+P")}
          <div className="menu-sep" />
          {installAction && item(installAction.icon, installAction.label, installAction.run, "menu-install")}
          {item(<Settings2 size={16} />, "Preferências (tema, mouse)", () => setDialog("prefs"), "menu-prefs")}
          {item(<Keyboard size={16} />, "Atalhos de teclado", () => setDialog("shortcuts"), "menu-shortcuts", "?")}
          {item(<MessageSquarePlus size={16} />, "Sugestões e problemas…", () => setDialog("feedback"), "menu-feedback")}
          {item(<Sparkles size={16} />, hasNews ? "Novidades desta versão" : "Novidades", openNews, "menu-news", hasNews ? "novo" : undefined)}
          {item(<Info size={16} />, "Sobre", () => setDialog("about"), "menu-about")}
          {item(<ExternalLink size={16} />, "Página do projeto", () => { window.location.href = "/"; }, "menu-site")}
          <div className="menu-sep" />
          <div className="menu-footer" data-testid="menu-version">{PRODUCT.name} {versionLabel()}</div>
        </div>
      )}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} size={dialog === "feedback" || dialog === "about" || dialog === "examples" ? "lg" : "md"} testId="dialog">
        {dialog === "shortcuts" ? <Shortcuts /> : dialog === "prefs" ? <Preferences /> : dialog === "news" ? <News /> : dialog === "feedback" ? <FeedbackDialog onDone={() => setDialog(null)} /> : dialog === "about" ? <About onFeedback={() => setDialog("feedback")} onLegal={(id) => setDialog(id)} /> : dialog === "privacidade" || dialog === "cookies" || dialog === "termos" ? <LegalContent id={dialog} /> : dialog === "examples" ? <ExamplesGallery onOpen={(id) => { setDialog(null); void actions.openExample(id); }} /> : null}
      </Dialog>
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
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);
  const textSize = useUiStore((s) => s.textSize);
  const setTextSize = useUiStore((s) => s.setTextSize);
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
      <label className="pref-row">
        Densidade
        <select value={density} onChange={(e) => setDensity(e.target.value as "compact" | "comfortable")} data-testid="pref-density">
          <option value="compact">Compacta (padrão)</option>
          <option value="comfortable">Confortável — mais espaço e alvos maiores</option>
        </select>
      </label>
      <label className="pref-row">
        Tamanho do texto
        <select value={textSize} onChange={(e) => setTextSize(e.target.value as "small" | "normal" | "large")} data-testid="pref-text">
          <option value="small">Pequeno</option>
          <option value="normal">Normal</option>
          <option value="large">Grande</option>
        </select>
      </label>
      <p className="hint">Unidades: milímetros. Snap e ordem de usinagem ficam no projeto.</p>
    </>
  );
}

/** Result of comparing the simulated removal with what each operation asks for. */
function VerifyDialog() {
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const [report, setReport] = useState<ReturnType<typeof verifyProject> | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setReport(verifyProject(shapes, settings)), 10);
    return () => clearTimeout(t);
  }, [shapes, settings]);
  if (!report) return <><h2>Verificação</h2><p className="hint">Calculando…</p></>;
  return (
    <div className="verify" data-testid="verify-report">
      <h2>Verificação do resultado</h2>
      <p className="hint">Malha de {report.res} mm. Cantos internos sempre ficam com raio ≥ raio da fresa; vãos mais estreitos que a fresa não são cortados.</p>
      {report.results.length === 0 && <p>Nenhum rebaixo, furo ou furação para conferir — contornos por fora/na linha só seguem a linha.</p>}
      {report.results.length > 0 && (
        <table className="verify-table">
          <thead><tr><th>Peça</th><th>Operação</th><th>Não alcançado</th><th>Raio mín.</th></tr></thead>
          <tbody>
            {report.results.map((r, i) => (
              <tr key={`${r.shapeId}-${i}`} className={r.leftoverRatio > 0.02 ? "warn" : ""}>
                <td>{r.name}</td>
                <td>{{ outline: "furo (contorno por dentro)", pocket: "rebaixo", drill: "furação" }[r.operation]}</td>
                <td>{r.leftoverArea} mm² ({Math.round(r.leftoverRatio * 100)} %)</td>
                <td>{r.minRadius} mm</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className={report.gougeArea > 1 ? "hint hint-warn" : "hint"} data-testid="verify-gouge">Corte fora das peças: {report.gougeArea} mm²</p>
      {report.warnings.length > 0 && (
        <ul className="verify-warnings">{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
      )}
    </div>
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

function About({ onFeedback, onLegal }: { onFeedback?: () => void; onLegal?: (id: "privacidade" | "cookies" | "termos") => void }) {
  return (
    <div className="about" data-testid="about">
      <h2 className="about-title">
        <BrandMark size={28} filled />
        {PRODUCT.name} <span className="about-version" data-testid="about-version">{buildLabel()}</span>
      </h2>
      <p>{PRODUCT.tagline}</p>
      <p className="hint">{PRODUCT.audience}</p>
      <dl className="about-facts">
        <dt>Autor</dt>
        <dd>{AUTHOR.name} — {AUTHOR.role}</dd>
        <dt>Contato</dt>
        <dd><a href={`mailto:${AUTHOR.email}?subject=${encodeURIComponent(`${PRODUCT.name} ${versionLabel()}`)}`}><Mail size={13} aria-hidden="true" /> {AUTHOR.email}</a></dd>
        <dt>Site do autor</dt>
        <dd><a href={AUTHOR.url} target="_blank" rel="noreferrer">{AUTHOR.url.replace(/^https?:\/\//, "")} <ExternalLink size={12} aria-hidden="true" /></a></dd>
        <dt>Site do app</dt>
        <dd><a href={PRODUCT.url} target="_blank" rel="noreferrer">{PRODUCT.url.replace(/^https?:\/\//, "")} <ExternalLink size={12} aria-hidden="true" /></a></dd>
        <dt>Licença</dt>
        <dd>{PRODUCT.license}</dd>
      </dl>
      <p className="hint">
        <button type="button" className="link" onClick={onFeedback} data-testid="about-feedback">Sugestão ou problema? Manda por aqui</button> · Tudo em milímetros. A origem fica na chapa; o que você vê no simulador é o mesmo G-code que sai.
      </p>
      <p className="hint"><LegalLinks onOpen={(id) => onLegal?.(id)} /></p>
      <details className="about-licenses">
        <summary>Bibliotecas e fontes de terceiros ({THIRD_PARTY.length})</summary>
        <ul>
          {THIRD_PARTY.map((t) => (
            <li key={t.name}><a href={t.url} target="_blank" rel="noreferrer">{t.name}</a> — {t.license}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function News() {
  const entries = CHANGELOG.slice(0, 3);
  return (
    <div className="news" data-testid="news">
      <h2>Novidades <span className="about-version">{versionLabel()}</span></h2>
      {entries.length === 0 && <p className="hint">Sem histórico nesta build.</p>}
      {entries.map((e) => (
        <section key={e.title} className="news-entry">
          <h3>{e.title} {e.date && <span className="hint">— {e.date}</span>}</h3>
          <ul>
            {e.body.split("\n").filter((l) => l.startsWith("- ")).slice(0, 6).map((l, i) => (
              <li key={i}>{l.slice(2).replace(/\*\*/g, "").replace(/`/g, "")}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="hint">Histórico completo no CHANGELOG do projeto.</p>
    </div>
  );
}

/** Editable project name in the app bar (file name, G-code header, tab title). */
function ProjectName() {
  const name = useProjectStore((s) => s.settings.projectName ?? "");
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const titleView = useUiStore((s) => (s.view === "simulator" ? "Simular" : s.view === "drawing" ? "Folha técnica" : "Desenhar"));
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    // Duas features disputavam o título da aba: o nome do projeto (Sprint 22) e a vista (SEO).
    // Projeto com nome ganha — é o que identifica a aba entre várias. Sem nome, a vista é mais
    // útil que "Sem nome", e é o que o e2e de SEO espera.
    document.title = `${name.trim() || titleView} — Oficina CNC`;
  }, [name, titleView]);
  return (
    <input
      className="project-name"
      type="text"
      value={draft ?? name}
      placeholder="Nome do projeto"
      aria-label="Nome do projeto"
      maxLength={80}
      onFocus={() => setDraft(name)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== null) updateSettings({ projectName: draft.trim() || undefined }); setDraft(null); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
      data-testid="project-name"
    />
  );
}

const WORKSPACES: { id: View; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "editor", label: "Desenhar", icon: <PencilRuler size={15} />, desc: "Peças, medidas e operações na chapa." },
  { id: "simulator", label: "Simular", icon: <Play size={15} />, desc: "A fresa percorrendo o caminho, com remoção de material." },
  { id: "drawing", label: "Folha técnica", icon: <FileText size={15} />, desc: "Folha de oficina e desenhos cotados — ver, imprimir, baixar." },
];

/** Dropdown de estações de trabalho (estilo Fusion, Sprint 30). */
function WorkspaceMenu({ view, setView }: { view: View; setView: (v: View) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, [open]);
  const active = WORKSPACES.find((w) => w.id === view) ?? WORKSPACES[0];
  return (
    <div className="ws-menu" ref={ref}>
      <button type="button" className="ws-button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} data-testid="workspace-menu">
        {active.icon}
        <span>{active.label}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div className="menu ws-list" role="menu" data-testid="workspace-list">
          {WORKSPACES.map((w) => (
            <button
              key={w.id} type="button" role="menuitemradio" aria-checked={view === w.id}
              className={`menu-item${view === w.id ? " active" : ""}`}
              onClick={() => { setOpen(false); setView(w.id); }}
              data-testid={`ws-${w.id}`}
            >
              {w.icon}<span className="ws-item-text"><strong>{w.label}</strong><small>{w.desc}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const actions = useProjectActions();
  const [nestOpen, setNestOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const imageFile = useUiStore((s) => s.imageFile);
  const vectorFile = useUiStore((s) => s.vectorFile);
  const setVectorFile = useUiStore((s) => s.setVectorFile);
  const setImageFile = useUiStore((s) => s.setImageFile);
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const panelOpen = useUiStore((s) => s.panelOpen);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const simCamera = useUiStore((s) => s.simCamera);
  const ribbonTab = useUiStore((s) => s.ribbonTab);
  const setRibbonTab = useUiStore((s) => s.setRibbonTab);
  const ribbonMinimized = useUiStore((s) => s.ribbonMinimized);
  const setRibbonMinimized = useUiStore((s) => s.setRibbonMinimized);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const settings = useProjectStore((s) => s.settings);

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
        { icon: <Square size={ICON} />, label: "Retângulo", onClick: actions.addRectangle, testId: "add-rectangle", featured: true , shortcut: "R", description: "Retângulo com cantos vivos, arredondados ou chanfrados. Recorte por fora, furo por dentro ou gravação na linha." },
        { icon: <CircleIcon size={ICON} />, label: "Círculo", onClick: actions.addCircle, testId: "add-circle" , shortcut: "C", description: "Círculo: furo por dentro, disco por fora, rebaixo ou furação no centro (Ø ≤ fresa)." },
        { icon: <Pentagon size={ICON} />, label: "Polígono", onClick: () => actions.setTool(actions.tool === "polygon" ? "select" : "polygon"), active: actions.tool === "polygon", testId: "tool-polygon" , shortcut: "P", description: "Clique os vértices na mesa; Enter ou duplo clique fecha; Esc cancela." },
        { icon: <Hexagon size={ICON} />, label: "Regular", onClick: actions.addNgon, testId: "add-ngon" , shortcut: "N", description: "Polígono regular (3–64 lados) definido por raio." },
        { icon: <RectangleHorizontal size={ICON} />, label: "Rasgo", onClick: actions.addSlot, testId: "add-slot" , shortcut: "O", description: "Rasgo oblongo (comprimento × largura) — encaixes e furos alongados." },
        { icon: <Type size={ICON} />, label: "Texto", onClick: actions.addText, testId: "add-text" , shortcut: "T", description: "Texto com fonte embarcada; letras viram polígonos com miolo preservado." },
      ],
    },
    {
      key: "modificar", title: "Modificar", priority: 2, items: [
        { icon: <Copy size={ICON} />, label: "Duplicar", onClick: actions.duplicate, disabled: !actions.selectedId, testId: "duplicate", featured: true , shortcut: "Ctrl+D", description: "Cópia deslocada da peça selecionada, com os mesmos parâmetros de corte." },
        { icon: <Trash2 size={ICON} />, label: "Excluir", onClick: actions.remove, disabled: !actions.selectedId, testId: "delete" , shortcut: "Del", description: "Remove as peças selecionadas (Ctrl+Z desfaz)." },
        { icon: <Undo2 size={ICON} />, label: "Desfazer", onClick: actions.undo, disabled: actions.pastStates === 0, testId: "undo" , shortcut: "Ctrl+Z", description: "Desfaz a última alteração de formas ou configurações." },
        { icon: <Redo2 size={ICON} />, label: "Refazer", onClick: actions.redo, disabled: actions.futureStates === 0, testId: "redo" , shortcut: "Ctrl+Y", description: "Refaz o que foi desfeito." },
      ],
    },
    {
      key: "arranjar", title: "Arranjar", priority: 3, items: [
        { icon: <LayoutGrid size={ICON} />, label: "Organizar", onClick: () => setNestOpen(true), disabled: actions.shapeCount === 0, testId: "nest", featured: true , description: "Arruma as peças na chapa (caixas envolventes, maiores primeiro, giro de 90° opcional)." },
        { icon: <Combine size={ICON} />, label: "Unir", onClick: () => actions.boolean("union"), disabled: sel < 2, testId: "bool-union" , description: "Une as peças selecionadas numa só; herda os parâmetros da primeira." },
        { icon: <SquareMinus size={ICON} />, label: "Subtrair", onClick: () => actions.boolean("difference"), disabled: sel < 2, testId: "bool-difference" , description: "Subtrai as outras peças da primeira selecionada — cria furos/ilhas." },
        { icon: <SquareDot size={ICON} />, label: "Intersec.", onClick: () => actions.boolean("intersection"), disabled: sel < 2, testId: "bool-intersection" , description: "Mantém só a área comum às peças selecionadas." },
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
        { icon: <ZoomOut size={ICON} />, label: "Reduzir", onClick: actions.zoomOut, testId: "zoom-out" , shortcut: "−", description: "Afasta a vista." },
        { icon: <Maximize size={ICON} />, label: `${Math.round(actions.zoom * 100)}%`, onClick: actions.zoomFit, testId: "zoom-fit", featured: true, labelClass: "zoom-label" , shortcut: "0", description: "Ajusta a mesa inteira na tela." },
        { icon: <ZoomIn size={ICON} />, label: "Ampliar", onClick: actions.zoomIn, testId: "zoom-in" , shortcut: "+", description: "Aproxima a vista." },
        { icon: <Magnet size={ICON} />, label: "Snap", onClick: actions.toggleSnap, active: actions.snap, testId: "snap-toggle" , shortcut: "S", description: "Gruda em bordas/centros da chapa e das outras peças ao mover ou redimensionar." },
      ],
    },
    {
      key: "projeto", title: "Projeto", priority: 5, items: [
        { icon: <FilePlus size={ICON} />, label: "Novo", onClick: actions.newProject, testId: "new-project" , description: "Limpa a mesa e volta às configurações padrão." },
        { icon: <FolderOpen size={ICON} />, label: "Abrir", onClick: actions.openProject, testId: "open-project" , description: "Abre um projeto .json salvo por aqui." },
        { icon: <Save size={ICON} />, label: "Salvar", onClick: actions.saveProject, testId: "save-project", featured: true , shortcut: "Ctrl+S", description: "Baixa o projeto (.json) com formas e configurações." },
        { icon: <Upload size={ICON} />, label: "Importar", onClick: actions.importSvg, testId: "import-svg" , description: "Importa contornos de SVG/DXF (mm) ou uma imagem PNG/JPG (silhueta ou relevo)." },
      ],
    },
  ];

  // ---- Simulator ribbon (data) ----
  const simGroups: RibbonGroupDef[] = [
    {
      key: "reproduzir", title: "Reproduzir", priority: 1, items: [
        { icon: <SkipBack size={ICON} />, label: "Início", onClick: reset, disabled: simDisabled, shortcut: "Home", description: "Volta o percurso para o começo." },
        { icon: <StepBack size={ICON} />, label: "Anterior", onClick: stepBack, disabled: simDisabled, testId: "sim-step-back", shortcut: "←", description: "Um passo atrás (segmento, passe ou forma, conforme o modo)." },
        { icon: playing ? <Pause size={ICON} /> : atEnd ? <RotateCcw size={ICON} /> : <Play size={ICON} />, label: playing ? "Pausar simulação" : atEnd ? "Reiniciar" : "Simular", onClick: toggle, disabled: simDisabled, testId: "simulate-toggle", primary: true, shortcut: "Espaço", featured: true, description: "Reproduz a usinagem com remoção de material na velocidade escolhida." },
        { icon: <StepForward size={ICON} />, label: "Próximo", onClick: stepForward, disabled: simDisabled, testId: "sim-step-forward", shortcut: "→", description: "Um passo à frente." },
        { icon: <SkipForward size={ICON} />, label: "Fim", onClick: toEnd, disabled: simDisabled, shortcut: "End", description: "Pula para o resultado final." },
      ],
    },
    {
      key: "ajustes", title: "Ajustes", priority: 2, items: [
        { icon: null, label: "Velocidade", onClick: () => {}, testId: "sim-speed-wrap", custom: (
          <label className="rb-select"><span>Velocidade</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value) as Speed)} data-testid="sim-speed">
              {SPEEDS.map((sp) => <option key={sp} value={sp}>{sp}×</option>)}
            </select>
          </label>
        ) },
        { icon: null, label: "Passo", onClick: () => {}, testId: "sim-step-mode-wrap", custom: (
          <label className="rb-select"><span>Passo</span>
            <select value={stepMode} onChange={(e) => setStepMode(e.target.value as StepMode)} data-testid="sim-step-mode">
              <option value="segment">segmento</option>
              <option value="pass">passe</option>
              <option value="shape">forma</option>
            </select>
          </label>
        ) },
      ],
    },
    {
      key: "resultado", title: "Resultado", priority: 2, items: [
        { icon: <ClipboardCheck size={ICON} />, label: "Verificar", onClick: () => setVerifyOpen(true), disabled: actions.shapeCount === 0, testId: "verify", featured: true, description: "Compara o que a fresa remove com o que cada rebaixo/furo pede: cantos não alcançados, vãos estreitos, corte fora das peças." },
        { icon: <Link2 size={ICON} />, label: "Copiar link", onClick: () => void actions.shareLink(), disabled: actions.shapeCount === 0, testId: "share-link", description: "Copia um link com o projeto inteiro dentro (sem servidor)." },
      ],
    },
    {
      key: "vista3d", title: "Vista", priority: 3, items: [
        { icon: <Maximize size={ICON} />, label: "Ajustar", onClick: () => simCamera?.fit(), disabled: !simCamera, testId: "sim-fit", featured: true, description: "Enquadra a chapa e a peça." },
        { icon: <ArrowUpFromLine size={ICON} />, label: "Superior", onClick: () => simCamera?.top(), disabled: !simCamera, testId: "sim-top", description: "Vista de cima (como o desenho)." },
        { icon: <Box size={ICON} />, label: "Isométrica", onClick: () => simCamera?.iso(), disabled: !simCamera, testId: "sim-iso", description: "Vista em perspectiva 3/4." },
      ],
    },
  ];

  // ---- Editor: USINAGEM tab (mirrors the panel for the selected piece) ----
  const selShape = useProjectStore((s) => (s.selectedId ? s.shapes.find((x) => x.id === s.selectedId) : undefined));
  const upd = (patch: Partial<Shape>) => { if (selShape) useProjectStore.getState().updateShape(selShape.id, patch); };
  const usinagemGroups: RibbonGroupDef[] = [
    {
      key: "operacao", title: "Operação", priority: 1, items: [
        { icon: <Scissors size={ICON} />, label: "Contorno", onClick: () => upd({ operation: "outline" }), disabled: !selShape, active: selShape?.operation === "outline", testId: "op-outline", featured: true, description: "Segue a linha da peça (por fora, por dentro ou na linha)." },
        { icon: <SquareDashedBottom size={ICON} />, label: "Rebaixo", onClick: () => upd({ operation: "pocket" }), disabled: !selShape, active: selShape?.operation === "pocket", testId: "op-pocket", description: "Remove todo o material de dentro até a profundidade." },
        { icon: <Drill size={ICON} />, label: "Furação", onClick: () => upd({ operation: "drill" }), disabled: !selShape || selShape.kind !== "circle", active: selShape?.operation === "drill", testId: "op-drill", description: "Só círculos: mergulha no centro, com bicadas se configurado." },
      ],
    },
    {
      key: "compensacao", title: "Compensação", priority: 2, items: [
        { icon: <SquareArrowOutUpRight size={ICON} />, label: "Por fora", onClick: () => upd({ side: "outside" }), disabled: !selShape || selShape.operation !== "outline", active: selShape?.operation === "outline" && (selShape.side ?? "on") === "outside", testId: "side-outside", featured: true, description: "Recorte: a peça fica no tamanho desenhado." },
        { icon: <SquareArrowDownLeft size={ICON} />, label: "Por dentro", onClick: () => upd({ side: "inside" }), disabled: !selShape || selShape.operation !== "outline", active: selShape?.operation === "outline" && selShape.side === "inside", testId: "side-inside", description: "Furo/abertura: o vão fica no tamanho desenhado." },
        { icon: <Minus size={ICON} />, label: "Na linha", onClick: () => upd({ side: "on" }), disabled: !selShape || selShape.operation !== "outline", active: selShape?.operation === "outline" && (selShape.side ?? "on") === "on", testId: "side-on", description: "Gravação: o centro da fresa passa sobre a linha." },
        { icon: <Anchor size={ICON} />, label: "Tabs", onClick: () => upd({ tabs: selShape?.tabs ? undefined : { ...DEFAULT_TABS } }), disabled: !selShape || selShape.operation !== "outline", active: !!selShape?.tabs, testId: "tabs-toggle", description: "Pontes que seguram a peça na chapa até o fim do recorte." },
      ],
    },
    {
      key: "corte-rapido", title: "Corte", priority: 3, items: [
        { icon: <Spline size={ICON} />, label: "Hélice", onClick: () => useProjectStore.getState().updateSettings({ helixEntry: !settings.helixEntry }), active: settings.helixEntry, testId: "helix-toggle", description: "Entrada em hélice nos rebaixos (sem mergulho vertical)." },
        { icon: <ListOrdered size={ICON} />, label: settings.orderMode === "auto" ? "Ordem auto" : "Ordem manual", onClick: () => useProjectStore.getState().updateSettings({ orderMode: settings.orderMode === "auto" ? "manual" : "auto" }), testId: "order-toggle", description: "Automática: rebaixos → furos → recortes. Manual: ordem do navegador." },
        { icon: <Settings2 size={ICON} />, label: "Corte…", onClick: () => useUiStore.getState().setSection("cut"), testId: "goto-cut", description: "Abre a aba Corte do painel (material, fresa, avanços)." },
        { icon: <Download size={ICON} />, label: "Exportar…", onClick: () => useUiStore.getState().setSection("post"), testId: "goto-post", description: "Abre a aba Exportar do painel (controlador, unidades)." },
      ],
    },
  ];
  const vistaGroups: RibbonGroupDef[] = [
    editorGroups.find((g) => g.key === "vista")!,
    {
      key: "tela", title: "Tela", priority: 2, items: [
        { icon: <PanelLeft size={ICON} />, label: panelOpen ? "Ocultar painel" : "Mostrar painel", onClick: togglePanel, active: panelOpen, testId: "panel-toggle-ribbon", description: "Mostra ou esconde o painel lateral." },
        { icon: theme === "dark" ? <Sun size={ICON} /> : <Moon size={ICON} />, label: theme === "dark" ? "Tema claro" : "Tema escuro", onClick: () => setTheme(theme === "dark" ? "light" : "dark"), testId: "theme-toggle", description: "Alterna claro/escuro (Preferências tem “seguir o sistema”)." },
      ],
    },
  ];
  const selectGroup: RibbonGroupDef = {
    key: "selecionar", title: "Selecionar", priority: 0, items: [
      { icon: <MousePointer2 size={ICON} />, label: "Selecionar", onClick: () => actions.setTool("select"), active: actions.tool === "select", testId: "tool-select", featured: true, shortcut: "Esc", description: "Clique para selecionar; arraste no fundo para laço; Shift+clique acumula." },
      { icon: <BoxSelect size={ICON} />, label: "Tudo", onClick: () => useProjectStore.getState().selectMany(useProjectStore.getState().shapes.filter((x) => !x.hidden).map((x) => x.id)), disabled: actions.shapeCount === 0, testId: "select-all", shortcut: "Ctrl+A", description: "Seleciona todas as peças visíveis." },
    ],
  };

  const sheetOpts = useSheetsStore();
  const sheetPage = sheetOpts.pages[sheetOpts.current];
  const downloadSvg = () => {
    const svg = sheetPage ? standaloneSvg(sheetPage) : null;
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sheetPage.title.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const sheetGroups: RibbonGroupDef[] = [
    {
      key: "saida", title: "Saída", priority: 1, items: [
        { icon: <Printer size={ICON} />, label: "Imprimir", onClick: () => printSheets(), disabled: sheetOpts.pages.length === 0, testId: "sheet-print", primary: true, featured: true, shortcut: "Ctrl+P", description: "Manda as folhas para a impressora, em A4 preto no branco." },
        { icon: <FileDown size={ICON} />, label: "Baixar SVG", onClick: downloadSvg, disabled: !sheetPage?.svg, testId: "sheet-download-svg", description: "Salva a página atual em SVG vetorial — abre no Inkscape, plotter ou laser." },
      ],
    },
    {
      key: "conteudo", title: "Conteúdo", priority: 2, items: [
        { icon: <Layers size={ICON} />, label: "Folha de setup", onClick: () => sheetOpts.setWithSetup(!sheetOpts.withSetup), active: sheetOpts.withSetup, testId: "sheet-with-setup", description: "Inclui a página de setup: chapa, origem, fresas, tempos e avisos." },
        { icon: <BoxSelect size={ICON} />, label: sheetOpts.scope === "all" ? "Todas" : "Selecionada", onClick: () => sheetOpts.setScope(sheetOpts.scope === "all" ? "selected" : "all"), disabled: sheetOpts.scope === "all" && !actions.selectedId, testId: "sheet-scope", description: "Um desenho por peça, ou só o da peça selecionada." },
        { icon: <Maximize size={ICON} />, label: sheetOpts.scale === "auto" ? "Escala auto" : "Escala 1:1", onClick: () => sheetOpts.setScale(sheetOpts.scale === "auto" ? "1:1" : "auto"), testId: "sheet-scale", description: "1:1 sai em tamanho real — imprima em 100% e use como gabarito." },
      ],
    },
  ];

  const TABS: Record<View, { id: string; label: string; groups: RibbonGroupDef[] }[]> = {
    editor: [
      { id: "formas", label: "Formas", groups: [...editorGroups.filter((g) => g.key !== "vista"), selectGroup] },
      { id: "usinagem", label: "Usinagem", groups: [...usinagemGroups, selectGroup] },
      { id: "vista", label: "Vista", groups: [...vistaGroups, selectGroup] },
    ],
    simulator: [
      { id: "reproduzir", label: "Reproduzir", groups: simGroups },
    ],
    drawing: [
      { id: "folhas", label: "Folhas", groups: sheetGroups },
    ],
  };
  const tabs = TABS[view];
  const activeTab = tabs.find((tb) => tb.id === ribbonTab[view]) ?? tabs[0];


  return (
    <header className={`topbar fusion${ribbonMinimized ? " minimized" : ""}`} role="banner">
      {/* Row 1: app bar */}
      <div className="appbar">
        <button
          type="button"
          className="icon-button"
          onClick={togglePanel}
          aria-label={panelOpen ? "Ocultar painel" : "Mostrar painel"}
          aria-expanded={panelOpen}
          title="Painel lateral"
          data-testid="panel-toggle"
        >
          <PanelLeft size={16} />
        </button>
        <ProjectMenu actions={actions} />
        <ProjectName />
        <div className="appbar-undo">
          <button type="button" className="icon-button" onClick={actions.undo} disabled={actions.pastStates === 0} title="Desfazer (Ctrl+Z)" aria-label="Desfazer" data-testid="appbar-undo"><Undo2 size={15} /></button>
          <button type="button" className="icon-button" onClick={actions.redo} disabled={actions.futureStates === 0} title="Refazer (Ctrl+Y)" aria-label="Refazer" data-testid="appbar-redo"><Redo2 size={15} /></button>
        </div>
        <div className="appbar-spacer" />
        <div className="topbar-right">
          <RibbonButton icon={<Download size={ICON} />} label="Exportar G-code" onClick={actions.exportGcode} primary testId="export-gcode" />
        </div>
      </div>

      {/* Row 2: workspace + context tabs */}
      <div className="tabrow">
        <WorkspaceMenu view={view} setView={setView} />
        <div className="ribbon-tabs" role="tablist" aria-label="Abas da barra">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={activeTab.id === tb.id}
              className={`ribbon-tab${activeTab.id === tb.id ? " active" : ""}`}
              onClick={() => { if (activeTab.id === tb.id && ribbonMinimized) setRibbonMinimized(false); setRibbonTab(view, tb.id); }}
              onDoubleClick={() => setRibbonMinimized(!ribbonMinimized)}
              data-testid={`ribbon-tab-${tb.id}`}
              title="Duplo clique minimiza/restaura a barra"
            >
              {tb.label}
            </button>
          ))}
        </div>
        <button type="button" className="icon-button ribbon-min" onClick={() => setRibbonMinimized(!ribbonMinimized)} aria-label={ribbonMinimized ? "Mostrar barra de ferramentas" : "Minimizar barra de ferramentas"} title={ribbonMinimized ? "Mostrar barra" : "Minimizar barra"} data-testid="ribbon-minimize">
          {ribbonMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Row 3: ribbon */}
      {!ribbonMinimized && <OverflowRibbon key={`${view}-${activeTab.id}`} groups={activeTab.groups} />}

      {actions.inputs}
      <Dialog open={!!imageFile} onClose={() => setImageFile(null)} size="lg" testId="import-image-dialog" footer={null}>{imageFile && <ImportImageDialog file={imageFile} onDone={() => setImageFile(null)} />}</Dialog>
      <Dialog open={!!vectorFile} onClose={() => setVectorFile(null)} size="lg" testId="import-vector-dialog" footer={null}>{vectorFile && <ImportVectorDialog file={vectorFile.file} text={vectorFile.text} onDone={() => setVectorFile(null)} />}</Dialog>

      <Dialog open={verifyOpen} onClose={() => setVerifyOpen(false)} size="lg" testId="verify-dialog"><VerifyDialog /></Dialog>
      <Dialog open={nestOpen} onClose={() => setNestOpen(false)} testId="nest-dialog"><NestDialog onDone={() => setNestOpen(false)} /></Dialog>
    </header>
  );
}
