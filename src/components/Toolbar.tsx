import { useRef } from "react";
import { useProjectStore, generateShapeId } from "../state/store";
import { parseSvgToShapes } from "../lib/svgImport";
import { generateGCode } from "../lib/gcode";
import type { RectangleShape, CircleShape } from "../types";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedShape = shapes.find((s) => s.id === selectedId);

  const handleAddRectangle = () => {
    const shape: RectangleShape = {
      id: generateShapeId("rect"),
      kind: "rectangle",
      x: 20,
      y: 20,
      width: 40,
      height: 30,
      rotation: 0,
      depth: 5,
      operation: "outline",
    };
    addShape(shape);
  };

  const handleAddCircle = () => {
    const shape: CircleShape = {
      id: generateShapeId("circle"),
      kind: "circle",
      x: 60,
      y: 60,
      radius: 15,
      depth: 5,
      operation: "outline",
    };
    addShape(shape);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseSvgToShapes(text);
      addShapes(imported);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      window.alert("Não foi possível importar esse arquivo SVG.");
    } finally {
      e.target.value = "";
    }
  };

  const handleExport = () => {
    if (shapes.length === 0) {
      window.alert("Adicione ao menos uma forma antes de exportar.");
      return;
    }
    const gcode = generateGCode(shapes, settings);
    downloadTextFile("projeto.gcode", gcode);
  };

  return (
    <aside className="toolbar" aria-label="Ferramentas">
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
                updateShape(selectedShape.id, { depth: Number(e.target.value) })
              }
            />
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
        <h2>Máquina (GRBL)</h2>
        <label>
          Avanço de corte (mm/min)
          <input
            type="number"
            value={settings.feedRate}
            onChange={(e) => updateSettings({ feedRate: Number(e.target.value) })}
          />
        </label>
        <label>
          Profundidade por passe (mm)
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={settings.passDepth}
            onChange={(e) => updateSettings({ passDepth: Number(e.target.value) })}
          />
        </label>
        <label>
          Rotação do spindle (RPM)
          <input
            type="number"
            value={settings.spindleSpeed}
            onChange={(e) =>
              updateSettings({ spindleSpeed: Number(e.target.value) })
            }
          />
        </label>
      </div>

      <button type="button" className="primary" onClick={handleExport} data-testid="export-gcode">
        Exportar G-code
      </button>
    </aside>
  );
}
