import { useEffect, useRef } from "react";
import { useProjectStore, generateShapeId, undo, redo, useTemporalStore } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { importFile, openProjectFromText, openExampleById } from "./importEntry";
import { tryGenerateGCode } from "../lib/gcode";
import { findPost } from "../lib/post";
import type { BooleanOp } from "../lib/boolean";
import { buildShareUrl } from "../lib/share";
import { confirmDialog, promptDialog } from "./Dialog";
import { serializeProject } from "../lib/projectFile";
import type { RectangleShape, CircleShape, RegularPolygonShape, SlotShape, TextShape } from "../types";

/** Safe file stem from the project name ("Placa furos" → "placa-furos"), default "projeto". */
export function fileStem(name?: string): string {
  const slug = (name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "projeto";
}

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
  // Only the count is subscribed: the full list is read on demand inside handlers, so adding/moving a shape
  // does not re-render every consumer of this hook (TopBar, ribbon…) — Sprint 27.
  const shapeCount = useProjectStore((s) => s.shapes.length);
  const getShapes = () => useProjectStore.getState().shapes;
  const selectedId = useProjectStore((s) => s.selectedId);
  const settings = useProjectStore((s) => s.settings);
  const addShape = useProjectStore((s) => s.addShape);
  const duplicateShape = useProjectStore((s) => s.duplicateShape);
  const newProject = useProjectStore((s) => s.newProject);
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

  const handleBoolean = (op: BooleanOp) => {
    const ids = useProjectStore.getState().booleanSelected(op);
    if (ids.length === 0) {
      setNotice({ kind: "warning", title: op === "intersection" ? "Essas peças não se cruzam — a interseção ficou vazia." : "Selecione pelo menos duas peças. A primeira é a base." });
      return;
    }
    const label = { union: "União", difference: "Subtração", intersection: "Interseção" }[op];
    setNotice({ kind: "info", title: `${label}: ${ids.length} peça${ids.length === 1 ? "" : "s"} pronta${ids.length === 1 ? "" : "s"}.` });
  };

  const handleNest = (opts: { spacing: number; allowRotate: boolean }) => {
    const st = useProjectStore.getState();
    const result = st.nestOnStock(opts, st.selectedIds.length >= 2 ? st.selectedIds : undefined);
    if (result.placed.length === 0 && result.overflow.length === 0) {
      setNotice({ kind: "warning", title: "Não tem peça livre para organizar. Mostre ou destrave alguma." });
      return result;
    }
    if (result.overflow.length > 0) {
      const names = result.overflow.map((id) => st.shapes.find((s) => s.id === id)?.name ?? id);
      setNotice({ kind: "warning", title: `${result.placed.length} peça${result.placed.length === 1 ? "" : "s"} organizada${result.placed.length === 1 ? "" : "s"}; ${result.overflow.length} não ${result.overflow.length === 1 ? "cabe" : "cabem"} na chapa e ${result.overflow.length === 1 ? "ficou" : "ficaram"} onde ${result.overflow.length === 1 ? "estava" : "estavam"}.`, details: names });
    } else {
      setNotice({ kind: "info", title: `${result.placed.length} peça${result.placed.length === 1 ? "" : "s"} organizada${result.placed.length === 1 ? "" : "s"} na chapa (${Math.round(result.fill * 100)}% ocupada).` });
    }
    return result;
  };

  const handleAddText = () => {
    const shape: TextShape = {
      id: generateShapeId("text"), kind: "text", x: spawnX, y: spawnY + 10, text: "Texto", fontId: "inter", size: 20, rotation: 0, align: "left", letterSpacing: 0,
      depth: Math.min(1, stock.thickness), operation: "outline", side: "on",
    };
    addShape(shape);
    setSection("shape");
  };

  const handleSvgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await importFile(file);
  };

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await openProjectFromText(await file.text(), file.name);
  };

  const handleSave = () => {
    downloadTextFile(`${fileStem(settings.projectName)}.oficina-cnc.json`, serializeProject(getShapes(), settings), "application/json");
    setNotice({ kind: "info", title: "Projeto salvo." });
  };

  const handleExport = () => {
    if (shapeCount === 0) {
      setNotice({ kind: "warning", title: "Desenhe uma peça antes de exportar." });
      return;
    }
    const result = tryGenerateGCode(getShapes(), settings);
    if (!result.ok) {
      setNotice({ kind: "error", title: "Esse G-code não saiu — confira o que falta:", details: result.problems });
      return;
    }
    setNotice(null);
    downloadTextFile(`${fileStem(settings.projectName)}.${findPost(settings.post).extension}`, result.gcode);
  };

  const handleOpenExample = async (id: string) => {
    if (await openExampleById(id)) setTimeout(() => zoomFit(), 0);
  };

  const handleShareLink = async () => {
    const { url, length, tooLong } = buildShareUrl(getShapes(), settings);
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ kind: tooLong ? "warning" : "info", title: tooLong ? `Link copiado, mas é grande (${Math.round(length / 1000)} k caracteres) — alguns apps cortam; prefira salvar o .json.` : "Link do projeto copiado. Quem abrir vê as mesmas peças e configurações." });
    } catch {
      await promptDialog({ title: "Link do projeto", message: "Não consegui copiar sozinho — selecione e copie:", defaultValue: url, confirmLabel: "Pronto" });
    }
  };

  const handleNewProject = async () => {
    if (shapeCount > 0 && !(await confirmDialog({ title: "Começar do zero?", message: "As peças da mesa vão embora. Se quiser guardar, salve o projeto antes.", confirmLabel: "Novo projeto", danger: true }))) return;
    newProject();
    setNotice({ kind: "info", title: "Mesa limpa. Projeto novo." });
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
      if (mod && e.key.toLowerCase() === "p") {
        // takes over the browser print: what makes sense to print here are the sheets, not a screenshot of the app
        e.preventDefault();
        useUiStore.getState().setView("drawing");
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
        case "t": case "T": if (!mod) handleAddText(); break;
        case "d":
        case "D":
          if (mod && st.selectedId) { e.preventDefault(); st.duplicateShape(st.selectedId); }
          break;
        case "a":
        case "A":
          if (mod) { e.preventDefault(); st.selectMany(st.shapes.filter((x) => !x.hidden).map((x) => x.id)); }
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
  }, [tool, shapeCount, settings]);

  const inputs = (
    <>
      <input ref={svgInputRef} type="file" accept=".svg,image/svg+xml,.dxf,application/dxf,image/vnd.dxf,.png,.jpg,.jpeg,.webp,.bmp,image/png,image/jpeg,image/webp,image/bmp" style={{ display: "none" }} onChange={handleSvgFile} data-testid="svg-file-input" />
      <input ref={jsonInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleJsonFile} data-testid="json-file-input" />
    </>
  );

  const selectedIds = useProjectStore((s) => s.selectedIds);
  const snap = useUiStore((s) => s.snap);
  const toggleSnap = useUiStore((s) => s.toggleSnap);

  return {
    inputs,
    shapeCount,
    selectedId,
    selectedIds,
    snap,
    toggleSnap,
    addNgon: handleAddNgon,
    addSlot: handleAddSlot,
    addText: handleAddText,
    boolean: handleBoolean,
    nest: handleNest,
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
    openExample: handleOpenExample,
    shareLink: handleShareLink,
    duplicate: () => selectedId && duplicateShape(selectedId),
    remove: () => useProjectStore.getState().removeSelected(),
    undo,
    redo,
  };
}
