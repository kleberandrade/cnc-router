import { useMemo } from "react";
import { useProjectStore } from "../state/store";
import { useUiStore, type PanelSection } from "../state/uiStore";
import { MACHINE_PRESETS, CUSTOM_PRESET_ID, findMachinePreset } from "../lib/machinePresets";
import { MATERIAL_PRESETS, CUSTOM_MATERIAL_ID, findMaterial } from "../lib/materials";
import { boundingBox, shapeToPoints } from "../lib/geometry";
import { NumberField } from "./NumberField";
import { Notice } from "./Notice";
import type { StockOrigin, MaterialId, CutParamKey, Shape } from "../types";

interface SectionProps {
  id: PanelSection;
  title: string;
  children: React.ReactNode;
  summary?: string;
}

function Section({ id, title, children, summary }: SectionProps) {
  const open = useUiStore((s) => s.section === id);
  const setSection = useUiStore((s) => s.setSection);
  return (
    <section className={`panel-section${open ? " open" : ""}`} data-testid={`section-${id}`}>
      <button
        type="button"
        className="panel-header"
        aria-expanded={open}
        aria-controls={`panel-${id}`}
        onClick={() => setSection(id)}
        data-testid={`section-toggle-${id}`}
      >
        <span className="chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>
        <span className="panel-title">{title}</span>
        {!open && summary && <span className="panel-summary">{summary}</span>}
      </button>
      {open && (
        <div className="panel-body" id={`panel-${id}`}>
          {children}
        </div>
      )}
    </section>
  );
}

function shapeSummary(shape: Shape): string {
  switch (shape.kind) {
    case "rectangle": return `retângulo ${shape.width}×${shape.height}`;
    case "circle": return `círculo r${shape.radius}`;
    default: return `polígono (${shape.points.length} pts)`;
  }
}

export function SidePanel() {
  const shapes = useProjectStore((s) => s.shapes);
  const selectedId = useProjectStore((s) => s.selectedId);
  const settings = useProjectStore((s) => s.settings);
  const updateShape = useProjectStore((s) => s.updateShape);
  const removeShape = useProjectStore((s) => s.removeShape);
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const setWorkArea = useProjectStore((s) => s.setWorkArea);
  const updateStock = useProjectStore((s) => s.updateStock);
  const setMaterial = useProjectStore((s) => s.setMaterial);
  const setToolDiameter = useProjectStore((s) => s.setToolDiameter);
  const setCutParam = useProjectStore((s) => s.setCutParam);
  const setCutThrough = useProjectStore((s) => s.setCutThrough);
  const nudgeShape = useProjectStore((s) => s.nudgeShape);

  const notice = useUiStore((s) => s.notice);
  const setNotice = useUiStore((s) => s.setNotice);

  const selectedShape = shapes.find((s) => s.id === selectedId);
  const { workArea, stock } = settings;
  const material = findMaterial(settings.material);
  const hasOverrides = Object.values(settings.overrides).some(Boolean);

  const selectedBox = useMemo(() => (selectedShape ? boundingBox(shapeToPoints(selectedShape)) : null), [selectedShape]);

  const handlePresetChange = (id: string) => {
    if (id === CUSTOM_PRESET_ID) { updateSettings({ machinePreset: CUSTOM_PRESET_ID }); return; }
    const preset = findMachinePreset(id);
    if (preset) setWorkArea(preset.workArea);
  };

  return (
    <aside className="toolbar side-panel" aria-label="Configurações">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      <Section id="shape" title="Peça selecionada" summary={selectedShape ? shapeSummary(selectedShape) : "nenhuma"}>
        {!selectedShape && <p className="hint">Clique numa forma no desenho, ou adicione uma pela barra de ações.</p>}
        {selectedShape && selectedBox && (
          <>
            <p className="hint">{shapeSummary(selectedShape)}</p>
            <div className="field-row">
              <NumberField
                label="X"
                unit="mm"
                step={1}
                value={round(selectedShape.kind === "path" ? selectedBox.minX : selectedShape.x)}
                testId="shape-x"
                onChange={(v) => {
                  const cur = selectedShape.kind === "path" ? selectedBox.minX : selectedShape.x;
                  nudgeShape(selectedShape.id, v - cur, 0);
                }}
              />
              <NumberField
                label="Y"
                unit="mm"
                step={1}
                value={round(selectedShape.kind === "path" ? selectedBox.minY : selectedShape.y)}
                testId="shape-y"
                onChange={(v) => {
                  const cur = selectedShape.kind === "path" ? selectedBox.minY : selectedShape.y;
                  nudgeShape(selectedShape.id, 0, v - cur);
                }}
              />
            </div>
            {selectedShape.kind === "rectangle" && (
              <>
                <div className="field-row">
                  <NumberField label="Largura" unit="mm" min={0.1} step={1} value={selectedShape.width} testId="shape-width"
                    onChange={(v) => updateShape(selectedShape.id, { width: v })} />
                  <NumberField label="Altura" unit="mm" min={0.1} step={1} value={selectedShape.height} testId="shape-height"
                    onChange={(v) => updateShape(selectedShape.id, { height: v })} />
                </div>
                <NumberField label="Rotação" unit="°" min={-360} max={360} step={5} value={selectedShape.rotation} testId="shape-rotation"
                  onChange={(v) => updateShape(selectedShape.id, { rotation: v })} />
              </>
            )}
            {selectedShape.kind === "circle" && (
              <NumberField label="Raio" unit="mm" min={0.1} step={1} value={selectedShape.radius} testId="shape-radius"
                onChange={(v) => updateShape(selectedShape.id, { radius: v })} />
            )}
            <NumberField
              label="Profundidade de corte"
              unit="mm"
              min={0.01}
              step={0.5}
              value={selectedShape.depth}
              testId="shape-depth"
              onChange={(v) => updateShape(selectedShape.id, { depth: v, cutThrough: false })}
            />
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
                onChange={(e) => updateShape(selectedShape.id, { operation: e.target.value as "outline" | "pocket" })}
                data-testid="shape-operation"
              >
                <option value="outline">Contorno</option>
                <option value="pocket">Rebaixo (pocket)</option>
              </select>
            </label>
            <button type="button" className="danger" onClick={() => removeShape(selectedShape.id)}>
              Remover forma
            </button>
          </>
        )}
      </Section>

      <Section id="machine" title="Máquina" summary={`${workArea.width}×${workArea.height}×${workArea.zTravel}`}>
        <label>
          Modelo / área útil
          <select value={settings.machinePreset} onChange={(e) => handlePresetChange(e.target.value)} data-testid="machine-preset">
            {MACHINE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
            <option value={CUSTOM_PRESET_ID}>Personalizada</option>
          </select>
        </label>
        <div className="field-row">
          <NumberField label="X" unit="mm" min={10} step={10} value={workArea.width} testId="work-width" onChange={(v) => setWorkArea({ width: v })} />
          <NumberField label="Y" unit="mm" min={10} step={10} value={workArea.height} testId="work-height" onChange={(v) => setWorkArea({ height: v })} />
          <NumberField label="Z" unit="mm" min={1} step={5} value={workArea.zTravel} testId="work-z" onChange={(v) => setWorkArea({ zTravel: v })} />
        </div>
      </Section>

      <Section id="stock" title="Chapa / base" summary={`${stock.width}×${stock.height}×${stock.thickness}`}>
        <div className="field-row">
          <NumberField label="Largura" unit="mm" min={1} step={10} value={stock.width} testId="stock-width" onChange={(v) => updateStock({ width: v })} />
          <NumberField label="Altura" unit="mm" min={1} step={10} value={stock.height} testId="stock-height" onChange={(v) => updateStock({ height: v })} />
        </div>
        <NumberField label="Espessura" unit="mm" min={0.1} step={0.5} value={stock.thickness} testId="stock-thickness" onChange={(v) => updateStock({ thickness: v })} />
        <div className="field-row">
          <NumberField label="Posição X" unit="mm" min={0} step={10} value={stock.offsetX} testId="stock-x" onChange={(v) => updateStock({ offsetX: v })} />
          <NumberField label="Posição Y" unit="mm" min={0} step={10} value={stock.offsetY} testId="stock-y" onChange={(v) => updateStock({ offsetY: v })} />
        </div>
        <label>
          Origem (X0 Y0)
          <select value={stock.origin} onChange={(e) => updateStock({ origin: e.target.value as StockOrigin })} data-testid="stock-origin">
            <option value="front-left">Canto frontal esquerdo da chapa</option>
            <option value="center">Centro da chapa</option>
          </select>
        </label>
      </Section>

      <Section id="material" title="Material & ferramenta" summary={`${material?.label ?? "personalizado"} · Ø${settings.toolDiameter}`}>
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
              <option key={m.id} value={m.id}>{m.label}{m.advanced ? " (avançado)" : ""}</option>
            ))}
            <option value={CUSTOM_MATERIAL_ID}>Personalizado</option>
          </select>
        </label>
        {material?.notes && (
          <p className={material.advanced ? "hint hint-warn" : "hint"} data-testid="material-notes">{material.notes}</p>
        )}
        <NumberField label="Ø da fresa" unit="mm" min={0.1} step={0.5} value={settings.toolDiameter} testId="tool-diameter" onChange={setToolDiameter} />
      </Section>

      <Section id="cut" title="Corte (GRBL)" summary={`F${settings.feedRate} · S${settings.spindleSpeed} · ${settings.passDepth}mm/passe`}>
        {material && hasOverrides && (
          <button
            type="button"
            className="link"
            onClick={() => { setMaterial(settings.material, true); setNotice({ kind: "info", title: `Preset ${material.label} restaurado.` }); }}
            data-testid="restore-preset"
          >
            restaurar preset {material.label}
          </button>
        )}
        {(
          [
            ["feedRate", "Avanço de corte", "mm/min", 1, 50],
            ["plungeRate", "Avanço de mergulho", "mm/min", 1, 50],
            ["spindleSpeed", "Rotação do spindle", "RPM", 1, 500],
            ["passDepth", "Profundidade por passe", "mm", 0.01, 0.5],
            ["stepover", "Passo lateral do pocket", "mm", 0.05, 0.1],
          ] as [CutParamKey, string, string, number, number][]
        ).map(([key, label, unit, min, step]) => (
          <NumberField
            key={key}
            label={label}
            unit={unit}
            min={min}
            step={step}
            value={settings[key]}
            testId={`cut-${key}`}
            badge={settings.overrides[key] && material ? <span className="badge" title="Editado manualmente — o preset não sobrescreve">manual</span> : undefined}
            onChange={(v) => setCutParam(key, v)}
          />
        ))}
        <NumberField label="Deslocamento rápido G0" unit="mm/min" min={1} step={100} value={settings.rapidRate} testId="rapid-rate" onChange={(v) => updateSettings({ rapidRate: v })} />
        <NumberField label="Altura segura" unit="mm" min={0} step={1} value={settings.safeHeight} testId="safe-height" onChange={(v) => updateSettings({ safeHeight: v })} />
      </Section>
    </aside>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
