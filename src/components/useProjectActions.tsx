import { useEffect, useRef } from "react";
import { useProjectStore, generateShapeId, undo, redo, useTemporalStore } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { parseSvg } from "../lib/svgImport";
import { tryGenerateGCode } from "../lib/gcode";
import { serializeProject, parseProject } from "../lib/projectFile";
import type { RectangleShape, CircleShape, RegularPolygonShape, SlotShape } from "../types";

function downloadTextFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Project-level actions (create shapes, import/open/save/export, new project) + global keyboard shortcuts.
 * Renders nothing but the hidden file inputs; the TopBar consumes the returned handlers.
 */
export function useProjectActions() {
  const shapes = useProjectStore((s) => s.shapes);
  const selectedId = useProjectStore((s) => s.selectedId);
  const settings = useProjectStore((s) => s.settings);
  const addShape = useProjectStore((s) => s.addShape);
  const addShapes = useProjectStore((s) => s.addShapes);
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
      depth: stock.thickness, operation: "outline", side: "outside",
    };
    addShape(shape);
    setSection("shape");
  };

  const handleAddCircle = () => {
    const shape: CircleShape = {
      id: generateShapeId("circle"), kind: "circle", x: spawnX + 15, y: spawnY + 15, radius: 15,
      depth: stock.thickness, operation: "outline", side: "outside",
    };
    addShape(shape);
    setSection("shape");
  };

  const handleAddNgon = () => {
    const shape: RegularPolygonShape = {
      id: generateShapeId("ngon"), kind: "ngon", x: spawnX + 20, y: spawnY + 20, radius: 20, sides: 6, rotation: 0,
      depth: stock.thickness, operation: "outline", side: "outside",
    };
    addShape(shape);
    setSection("shape");
  };

  const handleAddSlot = () => {
    const shape: SlotShape = {
      id: generateShapeId("slot"), kind: "slot", x: spawnX + 25, y: spawnY + 10, length: 50, width: 12, rotation: 0,
      depth: stock.thickness, operation: "outline", side: "inside",
    };
    addShape(shape);
    setSection("shape");
  };

  const handleSvgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { shapes: imported, warnings } = parseSvg(await file.text(), { depth: stock.thickness });
      addShapes(imported.map((sh) => ({ ...sh, side: "outside" as const })));
      const details = warnings.filter((w) => !w.startsWith("Nenhuma forma"));
      setNotice({
        kind: imported.length > 0 ? (details.length ? "warning" : "info") : "warning",
        title: imported.length > 0 ? `${imported.length} forma(s) importada(s).` : "Nenhuma forma reconhecida nesse SVG.",
        details: details.length ? details : undefined,
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
          if (st.selectedIds.length) { e.preventDefault(); st.removeSelected(); }
          break;
        case "s": case "S": if (!mod) useUiStore.getState().toggleSnap(); break;
        case "n": case "N": if (!mod) handleAddNgon(); break;
        case "o": case "O": if (!mod) handleAddSlot(); break;
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
          if (!st.selectedIds.length) break;
          e.preventDefault();
          const d = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
          const dy = e.key === "ArrowUp" ? d : e.key === "ArrowDown" ? -d : 0;
          for (const id of st.selectedIds) st.nudgeShape(id, dx, dy);
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

  const inputs = (
    <>
      <input ref={svgInputRef} type="file" accept=".svg,image/svg+xml" style={{ display: "none" }} onChange={handleSvgFile} data-testid="svg-file-input" />
      <input ref={jsonInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleJsonFile} data-testid="json-file-input" />
    </>
  );

  const selectedIds = useProjectStore((s) => s.selectedIds);
  const snap = useUiStore((s) => s.snap);
  const toggleSnap = useUiStore((s) => s.toggleSnap);

  return {
    inputs,
    shapes,
    selectedId,
    selectedIds,
    snap,
    toggleSnap,
    addNgon: handleAddNgon,
    addSlot: handleAddSlot,
    alignSelected: useProjectStore.getState().alignSelected,
    distributeSelected: useProjectStore.getState().distributeSelected,
    tool,
    setTool,
    zoom,
    zoomIn,
    zoomOut,
    zoomFit,
    pastStates,
    futureStates,
    addRectangle: handleAddRectangle,
    addCircle: handleAddCircle,
    importSvg: () => svgInputRef.current?.click(),
    openProject: () => jsonInputRef.current?.click(),
    saveProject: handleSave,
    exportGcode: handleExport,
    newProject: handleNewProject,
    duplicate: () => selectedId && duplicateShape(selectedId),
    remove: () => useProjectStore.getState().removeSelected(),
    undo,
    redo,
  };
}
