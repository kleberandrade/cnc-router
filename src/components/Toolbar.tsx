import { useCallback, useMemo, useRef, useState } from "react";
import { useProjectStore, generateShapeId } from "../state/store";
import { parseSvgToShapes } from "../lib/svgImport";
import { tryGenerateGCode } from "../lib/gcode";
import { parseNumberInput } from "../lib/numberInput";
import { MACHINE_PRESETS, CUSTOM_PRESET_ID, findMachinePreset } from "../lib/machinePresets";
import { validateProject } from "../lib/validate";
import { MATERIAL_PRESETS, CUSTOM_MATERIAL_ID, findMaterial } from "../lib/materials";
import { buildToolpath } from "../lib/toolpath";
import { estimateTime, formatDuration } from "../lib/timing";
import { Notice, type NoticeData } from "./Notice";
import type { RectangleShape, CircleShape, StockOrigin, MaterialId, CutParamKey } from "../types";

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Toolbar() {
  const shapes = useProjectStore((s) => s.shapes);
  const selectedId = useProjectStore((s) => s.selectedId);
  const settings = useProjectStore((s) => s.settings);
  const addShape = useProjectStore((s) => s.addShape);
  const addShapes = useProjectStore((s) => s.addShapes);
  const updateShape = useProjectStore((s) => s.updateShape);
  const removeShape = useProjectStore((s) => s.removeShape);
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const newProject = useProjectStore((s) => s.newProject);
  const setWorkArea = useProjectStore((s) => s.setWorkArea);
  const updateStock = useProjectStore((s) => s.updateStock);
  const setMaterial = useProjectStore((s) => s.setMaterial);
  const setToolDiameter = useProjectStore((s) => s.setToolDiameter);
  const setCutParam = useProjectStore((s) => s.setCutParam);
  const setCutThrough = useProjectStore((s) => s.setCutThrough);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<NoticeData | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const selectedShape = shapes.find((s) => s.id === selectedId);
  const issues = useMemo(() => validateProject(shapes, settings), [shapes, settings]);
  const estimatedTime = useMemo(() => {
    if (shapes.length === 0) return 0;
    try {
      return estimateTime(buildToolpath(shapes, settings).segments, { rapidRate: settings.rapidRate }).total;
    } catch {
      return 0;
    }
  }, [shapes, settings]);
  const { workArea, stock } = settings;
  const material = findMaterial(settings.material);
  const hasOverrides = Object.values(settings.overrides).some(Boolean);

  // New shapes are placed inside the stock, 10 mm from its front-left corner,
  // and default to a through-cut (depth = stock thickness).
  const spawnX = stock.offsetX + 10;
  const spawnY = stock.offsetY + 10;
  const defaultDepth = stock.thickness;

  const handleAddRectangle = () => {
    const shape: RectangleShape = {
      id: generateShapeId("rect"),
      kind: "rectangle",
      x: spawnX,
      y: spawnY,
      width: 40,
      height: 30,
      rotation: 0,
      depth: defaultDepth,
      operation: "outline",
    };
    addShape(shape);
  };

  const handleAddCircle = () => {
    const shape: CircleShape = {
      id: generateShapeId("circle"),
      kind: "circle",
      x: spawnX + 15,
      y: spawnY + 15,
      radius: 15,
      depth: defaultDepth,
      operation: "outline",
    };
    addShape(shape);
  };

  const handlePresetChange = (id: string) => {
    if (id === CUSTOM_PRESET_ID) {
      updateSettings({ machinePreset: CUSTOM_PRESET_ID });
      return;
    }
    const preset = findMachinePreset(id);
    if (preset) setWorkArea(preset.workArea);
  };

  const num = (value: string, fallback: number, min = 0.01) => parseNumberInput(value, fallback, { min });

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseSvgToShapes(text);
      addShapes(imported);
      setNotice({
        kind: imported.length > 0 ? "info" : "warning",
        title:
          imported.length > 0
            ? `${imported.length} forma(s) importada(s).`
            : "Nenhuma forma reconhecida nesse SVG.",
      });
    } catch {
      setNotice({ kind: "error", title: "Não foi possível importar esse arquivo SVG." });
    } finally {
      e.target.value = "";
    }
  };

  const handleExport = () => {
    if (shapes.length === 0) {
      setNotice({ kind: "warning", title: "Adicione ao menos uma forma antes de exportar." });
      return;
    }
    const result = tryGenerateGCode(shapes, settings);
    if (!result.ok) {
      setNotice({
        kind: "error",
        title: "Não foi possível gerar o G-code:",
        details: result.problems,
      });
      return;
    }
    setNotice(null);
    downloadTextFile("projeto.gcode", result.gcode);
  };

  const handleNewProject = () => {
    if (shapes.length > 0 && !window.confirm("Começar um novo projeto? As formas atuais serão apagadas.")) {
      return;
    }
    newProject();
    setNotice({ kind: "info", title: "Novo projeto criado." });
  };

  return (
    <aside className="toolbar" aria-label="Ferramentas">
      <div className="toolbar-section">
        <h2>Projeto</h2>
        <button type="button" className="secondary" onClick={handleNewProject} data-testid="new-project">
          Novo projeto
        </button>
      </div>

      <div className="toolbar-section">
        <h2>Formas</h2>
        <div className="button-row">
          <button type="button" onClick={handleAddRectangle} data-testid="add-rectangle">
            + Retângulo
          </button>
          <button type="button" onClick={handleAddCircle} data-testid="add-circle">
            + Círculo
          </button>
        </div>
        <button type="button" onClick={handleImportClick} data-testid="import-svg">
          Importar SVG
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          style={{ display: "none" }}
          onChange={handleFileChange}
          data-testid="svg-file-input"
        />
      </div>

      {selectedShape && (
        <div className="toolbar-section">
          <h2>Propriedades</h2>
          <label>
            Profundidade de corte (mm)
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={selectedShape.depth}
              onChange={(e) =>
                updateShape(selectedShape.id, {
                  depth: parseNumberInput(e.target.value, selectedShape.depth, { min: 0.01 }),
                  cutThrough: false,
                })
              }
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={!!selectedShape.cutThrough}
              onChange={(e) => setCutThrough(selectedShape.id, e.target.checked)}
              data-testid="cut-through"
            />
            Cortar através (espessura + 0,2 mm)
          </label>
          <label>
            Operação
            <select
              value={selectedShape.operation}
              onChange={(e) =>
                updateShape(selectedShape.id, {
                  operation: e.target.value as "outline" | "pocket",
                })
              }
            >
              <option value="outline">Contorno</option>
              <option value="pocket">Rebaixo (pocket)</option>
            </select>
          </label>
          <button
            type="button"
            className="danger"
            onClick={() => removeShape(selectedShape.id)}
          >
            Remover forma
          </button>
        </div>
      )}

      <div className="toolbar-section">
        <h2>Máquina</h2>
        <label>
          Modelo / área útil
          <select
            value={settings.machinePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            data-testid="machine-preset"
          >
            {MACHINE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value={CUSTOM_PRESET_ID}>Personalizada</option>
          </select>
        </label>
        <div className="field-row">
          <label>
            X (mm)
            <input
              type="number"
              min={10}
              value={workArea.width}
              data-testid="work-width"
              onChange={(e) => setWorkArea({ width: num(e.target.value, workArea.width, 10) })}
            />
          </label>
          <label>
            Y (mm)
            <input
              type="number"
              min={10}
              value={workArea.height}
              data-testid="work-height"
              onChange={(e) => setWorkArea({ height: num(e.target.value, workArea.height, 10) })}
            />
          </label>
          <label>
            Z (mm)
            <input
              type="number"
              min={1}
              value={workArea.zTravel}
              onChange={(e) => setWorkArea({ zTravel: num(e.target.value, workArea.zTravel, 1) })}
            />
          </label>
        </div>
      </div>

      <div className="toolbar-section">
        <h2>Chapa / base</h2>
        <div className="field-row">
          <label>
            Largura (mm)
            <input
              type="number"
              min={1}
              value={stock.width}
              data-testid="stock-width"
              onChange={(e) => updateStock({ width: num(e.target.value, stock.width, 1) })}
            />
          </label>
          <label>
            Altura (mm)
            <input
              type="number"
              min={1}
              value={stock.height}
              onChange={(e) => updateStock({ height: num(e.target.value, stock.height, 1) })}
            />
          </label>
          <label>
            Espessura (mm)
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={stock.thickness}
              data-testid="stock-thickness"
              onChange={(e) => updateStock({ thickness: num(e.target.value, stock.thickness, 0.1) })}
            />
          </label>
        </div>
        <div className="field-row">
          <label>
            Posição X (mm)
            <input
              type="number"
              min={0}
              value={stock.offsetX}
              onChange={(e) => updateStock({ offsetX: num(e.target.value, stock.offsetX, 0) })}
            />
          </label>
          <label>
            Posição Y (mm)
            <input
              type="number"
              min={0}
              value={stock.offsetY}
              onChange={(e) => updateStock({ offsetY: num(e.target.value, stock.offsetY, 0) })}
            />
          </label>
        </div>
        <label>
          Origem (X0 Y0)
          <select
            value={stock.origin}
            onChange={(e) => updateStock({ origin: e.target.value as StockOrigin })}
            data-testid="stock-origin"
          >
            <option value="front-left">Canto frontal esquerdo da chapa</option>
            <option value="center">Centro da chapa</option>
          </select>
        </label>
      </div>

      {issues.length > 0 && (
        <div className="toolbar-section" data-testid="issues">
          <h2>Avisos</h2>
          <ul className="issue-list">
            {issues.map((i, idx) => (
              <li key={idx} className={`issue issue-${i.level}`}>
                {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="toolbar-section">
        <h2>Material &amp; ferramenta</h2>
        <label>
          Material
          <select
            value={settings.material}
            onChange={(e) => {
              const id = e.target.value as MaterialId;
              setMaterial(id);
              if (id !== CUSTOM_MATERIAL_ID) {
                setNotice({
                  kind: "info",
                  title: hasOverrides
                    ? "Parâmetros de corte atualizados (campos manuais mantidos) — revise."
                    : "Parâmetros de corte atualizados para o material — revise.",
                });
              }
            }}
            data-testid="material-select"
          >
            {MATERIAL_PRESETS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.advanced ? " (avançado)" : ""}
              </option>
            ))}
            <option value={CUSTOM_MATERIAL_ID}>Personalizado</option>
          </select>
        </label>
        {material?.notes && (
          <p className={material.advanced ? "hint hint-warn" : "hint"} data-testid="material-notes">
            {material.notes}
          </p>
        )}
        <label>
          Ø da fresa (mm)
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={settings.toolDiameter}
            data-testid="tool-diameter"
            onChange={(e) => setToolDiameter(num(e.target.value, settings.toolDiameter, 0.1))}
          />
        </label>
      </div>

      <div className="toolbar-section">
        <h2>
          Corte (GRBL)
          {material && hasOverrides && (
            <button
              type="button"
              className="link"
              onClick={() => {
                setMaterial(settings.material, true);
                setNotice({ kind: "info", title: `Preset ${material.label} restaurado.` });
              }}
              data-testid="restore-preset"
            >
              restaurar preset
            </button>
          )}
        </h2>
        {(
          [
            ["feedRate", "Avanço de corte (mm/min)", 1],
            ["plungeRate", "Avanço de mergulho (mm/min)", 1],
            ["spindleSpeed", "Rotação do spindle (RPM)", 1],
            ["passDepth", "Profundidade por passe (mm)", 0.01],
            ["stepover", "Passo lateral do pocket (mm)", 0.05],
          ] as [CutParamKey, string, number][]
        ).map(([key, label, min]) => (
          <label key={key}>
            <span className="label-row">
              {label}
              {settings.overrides[key] && material && (
                <span className="badge" title="Editado manualmente — o preset não sobrescreve">
                  manual
                </span>
              )}
            </span>
            <input
              type="number"
              min={min}
              step={key === "passDepth" ? 0.5 : key === "stepover" ? 0.1 : undefined}
              value={settings[key]}
              data-testid={`cut-${key}`}
              onChange={(e) => setCutParam(key, num(e.target.value, settings[key], min))}
            />
          </label>
        ))}
        <label>
          Deslocamento rápido G0 (mm/min)
          <input
            type="number"
            min={1}
            value={settings.rapidRate}
            onChange={(e) =>
              updateSettings({ rapidRate: parseNumberInput(e.target.value, settings.rapidRate, { min: 1 }) })
            }
          />
        </label>
        <label>
          Altura segura (mm)
          <input
            type="number"
            min={0}
            step={1}
            value={settings.safeHeight}
            onChange={(e) =>
              updateSettings({ safeHeight: parseNumberInput(e.target.value, settings.safeHeight, { min: 0 }) })
            }
          />
        </label>
      </div>

      <Notice notice={notice} onDismiss={dismissNotice} />

      {shapes.length > 0 && (
        <p className="toolbar-estimate" data-testid="toolbar-estimate">
          {shapes.length} forma(s) · tempo estimado {formatDuration(estimatedTime)}
        </p>
      )}

      <button type="button" className="primary" onClick={handleExport} data-testid="export-gcode">
        Exportar G-code
      </button>
    </aside>
  );
}
