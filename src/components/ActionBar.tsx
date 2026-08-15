import { useEffect, useRef } from "react";
import { useProjectStore, generateShapeId, undo, redo, useTemporalStore, throughCutDepth } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { parseSvgToShapes } from "../lib/svgImport";
import { tryGenerateGCode } from "../lib/gcode";
import { serializeProject, parseProject } from "../lib/projectFile";
import type { RectangleShape, CircleShape } from "../types";

function downloadTextFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Icon({ id }: { id: string }) {
  return (
    <svg className="icon" aria-hidden="true" width="16" height="16">
      <use href={`/icons.svg#${id}`} />
    </svg>
  );
}

interface ActionProps {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  active?: boolean;
  testId?: string;
  title?: string;
}

function Action({ icon, label, onClick, disabled, primary, active, testId, title }: ActionProps) {
  return (
    <button
      type="button"
      className={`action${primary ? " primary" : ""}${active ? " active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      title={title ?? label}
      aria-pressed={active}
    >
      <Icon id={icon} />
      <span>{label}</span>
    </button>
  );
}

export function ActionBar() {
  const shapes = useProjectStore((s) => s.shapes);
  const selectedId = useProjectStore((s) => s.selectedId);
  const settings = useProjectStore((s) => s.settings);
  const addShape = useProjectStore((s) => s.addShape);
  const addShapes = useProjectStore((s) => s.addShapes);
  const removeShape = useProjectStore((s) => s.removeShape);
  const duplicateShape = useProjectStore((s) => s.duplicateShape);
  const newProject = useProjectStore((s) => s.newProject);
  const loadProject = useProjectStore((s) => s.loadProject);
  const pastStates = useTemporalStore((s) => s.pastStates.length);
  const futureStates = useTemporalStore((s) => s.futureStates.length);

  const setNotice = useUiStore((s) => s.setNotice);
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const zoomIn = useUiStore((s) => s.zoomIn);
  const zoomOut = useUiStore((s) => s.zoomOut);
  const zoomFit = useUiStore((s) => s.zoomFit);
  const zoom = useUiStore((s) => s.zoom);
  const setSection = useUiStore((s) => s.setSection);

  const svgInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const { stock } = settings;
  const spawnX = stock.offsetX + 10;
  const spawnY = stock.offsetY + 10;

  const handleAddRectangle = () => {
    const shape: RectangleShape = {
      id: generateShapeId("rect"), kind: "rectangle", x: spawnX, y: spawnY, width: 40, height: 30, rotation: 0,
      depth: stock.thickness, operation: "outline",
    };
    addShape(shape);
    setSection("shape");
  };

  const handleAddCircle = () => {
    const shape: CircleShape = {
      id: generateShapeId("circle"), kind: "circle", x: spawnX + 15, y: spawnY + 15, radius: 15,
      depth: stock.thickness, operation: "outline",
    };
    addShape(shape);
    setSection("shape");
  };

  const handleSvgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseSvgToShapes(await file.text());
      addShapes(imported);
      setNotice({
        kind: imported.length > 0 ? "info" : "warning",
        title: imported.length > 0 ? `${imported.length} forma(s) importada(s).` : "Nenhuma forma reconhecida nesse SVG.",
      });
    } catch {
      setNotice({ kind: "error", title: "Não foi possível importar esse arquivo SVG." });
    } finally {
      e.target.value = "";
    }
  };

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = parseProject(await file.text());
      loadProject(project);
      setNotice({ kind: "info", title: `Projeto "${file.name}" aberto (${project.shapes.length} forma(s)).` });
    } catch (err) {
      setNotice({ kind: "error", title: (err as Error).message });
    } finally {
      e.target.value = "";
    }
  };

  const handleSave = () => {
    downloadTextFile("projeto.oficina-cnc.json", serializeProject(shapes, settings), "application/json");
    setNotice({ kind: "info", title: "Projeto salvo (projeto.oficina-cnc.json)." });
  };

  const handleExport = () => {
    if (shapes.length === 0) {
      setNotice({ kind: "warning", title: "Adicione ao menos uma forma antes de exportar." });
      return;
    }
    const result = tryGenerateGCode(shapes, settings);
    if (!result.ok) {
      setNotice({ kind: "error", title: "Não foi possível gerar o G-code:", details: result.problems });
      return;
    }
    setNotice(null);
    downloadTextFile("projeto.gcode", result.gcode);
  };

  const handleNewProject = () => {
    if (shapes.length > 0 && !window.confirm("Começar um novo projeto? As formas atuais serão apagadas.")) return;
    newProject();
    setNotice({ kind: "info", title: "Novo projeto criado." });
  };

  // Global keyboard shortcuts (ignored while typing in inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        if (typing) return;
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if (typing) return;
      const st = useProjectStore.getState();
      switch (e.key) {
        case "Delete":
        case "Backspace":
          if (st.selectedId) { e.preventDefault(); st.removeShape(st.selectedId); }
          break;
        case "d":
        case "D":
          if (mod && st.selectedId) { e.preventDefault(); st.duplicateShape(st.selectedId); }
          break;
        case "r": case "R": if (!mod) handleAddRectangle(); break;
        case "c": case "C": if (!mod) handleAddCircle(); break;
        case "p": case "P": if (!mod) setTool(tool === "polygon" ? "select" : "polygon"); break;
        case "Escape":
          if (tool === "polygon") setTool("select");
          else st.select(null);
          break;
        case "ArrowUp": case "ArrowDown": case "ArrowLeft": case "ArrowRight": {
          if (!st.selectedId) break;
          e.preventDefault();
          const d = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
          const dy = e.key === "ArrowUp" ? d : e.key === "ArrowDown" ? -d : 0;
          st.nudgeShape(st.selectedId, dx, dy);
          break;
        }
        case "+": case "=": zoomIn(); break;
        case "-": zoomOut(); break;
        case "0": zoomFit(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, shapes, settings]);

  return (
    <div className="action-bar" role="toolbar" aria-label="Ações">
      <div className="action-group">
        <Action icon="new" label="Novo" onClick={handleNewProject} testId="new-project" />
        <Action icon="open" label="Abrir" onClick={() => jsonInputRef.current?.click()} testId="open-project" title="Abrir projeto (.json)" />
        <Action icon="save" label="Salvar" onClick={handleSave} testId="save-project" title="Salvar projeto (.json) — Ctrl+S" />
        <Action icon="import" label="SVG" onClick={() => svgInputRef.current?.click()} testId="import-svg" title="Importar SVG" />
      </div>
      <div className="action-group">
        <Action icon="undo" label="Desfazer" onClick={undo} disabled={pastStates === 0} testId="undo" title="Desfazer (Ctrl+Z)" />
        <Action icon="redo" label="Refazer" onClick={redo} disabled={futureStates === 0} testId="redo" title="Refazer (Ctrl+Y)" />
      </div>
      <div className="action-group">
        <Action icon="rect" label="Retângulo" onClick={handleAddRectangle} testId="add-rectangle" title="Retângulo (R)" />
        <Action icon="circle" label="Círculo" onClick={handleAddCircle} testId="add-circle" title="Círculo (C)" />
        <Action
          icon="polygon"
          label="Polígono"
          onClick={() => setTool(tool === "polygon" ? "select" : "polygon")}
          active={tool === "polygon"}
          testId="tool-polygon"
          title="Polígono: clique os vértices no desenho, Enter/duplo clique fecha (P)"
        />
        <Action icon="duplicate" label="Duplicar" onClick={() => selectedId && duplicateShape(selectedId)} disabled={!selectedId} testId="duplicate" title="Duplicar (Ctrl+D)" />
        <Action icon="delete" label="Excluir" onClick={() => selectedId && removeShape(selectedId)} disabled={!selectedId} testId="delete" title="Excluir (Del)" />
      </div>
      <div className="action-group">
        <Action icon="zoom-out" label="" onClick={zoomOut} title="Reduzir (−)" testId="zoom-out" />
        <button type="button" className="action" onClick={zoomFit} title="Ajustar à mesa (0)" data-testid="zoom-fit">
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        </button>
        <Action icon="zoom-in" label="" onClick={zoomIn} title="Ampliar (+)" testId="zoom-in" />
      </div>
      <div className="action-spacer" />
      <Action icon="export" label="Exportar G-code" onClick={handleExport} primary testId="export-gcode" />

      <input ref={svgInputRef} type="file" accept=".svg,image/svg+xml" style={{ display: "none" }} onChange={handleSvgFile} data-testid="svg-file-input" />
      <input ref={jsonInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleJsonFile} data-testid="json-file-input" />
    </div>
  );
}

export { throughCutDepth };
