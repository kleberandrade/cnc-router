import { Plus, Trash2 } from "lucide-react";
import { useProjectStore, generateShapeId } from "../state/store";
import { NumberField } from "./NumberField";
import type { ToolType } from "../types";

/** Project tool library (extra tools beyond the default one). Shapes pick a tool in the shape section. */
export function ToolLibrary() {
  const settings = useProjectStore((s) => s.settings);
  const addTool = useProjectStore((s) => s.addTool);
  const updateTool = useProjectStore((s) => s.updateTool);
  const removeTool = useProjectStore((s) => s.removeTool);
  const shapes = useProjectStore((s) => s.shapes);

  return (
    <div className="tool-library" data-testid="tool-library">
      <p className="hint">
        Fresa padrão: Ø{settings.toolDiameter} mm ({settings.toolType}). Adicione outras fresas e escolha-as por peça; o G-code
        pausa (M0) a cada troca e o simulador troca o modelo.
      </p>
      {settings.tools.map((t) => {
        const uses = shapes.filter((s) => s.toolId === t.id).length;
        return (
          <div key={t.id} className="panel-section open" style={{ padding: 8 }} data-testid={`tool-${t.id}`}>
            <div className="tool-row">
              <input className="tool-name" value={t.name} onChange={(e) => updateTool(t.id, { name: e.target.value })} aria-label="Nome da fresa" data-testid={`tool-name-${t.id}`} />
              <span className="nav-tool">{uses} peça(s)</span>
              <button type="button" className="icon-button" onClick={() => removeTool(t.id)} aria-label="Remover fresa" title="Remover fresa" data-testid={`tool-remove-${t.id}`}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="field-row">
              <NumberField label="Ø" unit="mm" min={0.1} step={0.5} value={t.diameter} testId={`tool-diameter-${t.id}`} onChange={(v) => updateTool(t.id, { diameter: v })} />
              <label>
                Tipo
                <select value={t.type} onChange={(e) => updateTool(t.id, { type: e.target.value as ToolType })}>
                  <option value="flat">Reta</option>
                  <option value="ball">Esférica</option>
                  <option value="vbit">V</option>
                </select>
              </label>
              {t.type === "vbit" && <NumberField label="Ângulo" unit="°" min={10} max={170} step={5} value={t.vbitAngle} onChange={(v) => updateTool(t.id, { vbitAngle: v })} />}
            </div>
            <div className="field-row">
              <NumberField label="Avanço" unit="mm/min" min={1} step={50} value={t.feedRate ?? settings.feedRate} onChange={(v) => updateTool(t.id, { feedRate: v })} />
              <NumberField label="Mergulho" unit="mm/min" min={1} step={50} value={t.plungeRate ?? settings.plungeRate} onChange={(v) => updateTool(t.id, { plungeRate: v })} />
              <NumberField label="RPM" min={1} step={500} value={t.spindleSpeed ?? settings.spindleSpeed} onChange={(v) => updateTool(t.id, { spindleSpeed: v })} />
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => addTool({ id: generateShapeId("tool"), name: `Fresa ${settings.tools.length + 2}`, type: "flat", diameter: 3, vbitAngle: 90 })}
        data-testid="tool-add"
      >
        <Plus size={14} aria-hidden="true" /> Adicionar fresa
      </button>
    </div>
  );
}
