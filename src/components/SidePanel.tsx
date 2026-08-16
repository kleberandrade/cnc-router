import { useMemo } from "react";
import { useProjectStore } from "../state/store";
import { useUiStore, type PanelSection } from "../state/uiStore";
import { MACHINE_PRESETS, CUSTOM_PRESET_ID, findMachinePreset } from "../lib/machinePresets";
import { MATERIAL_PRESETS, CUSTOM_MATERIAL_ID, findMaterial } from "../lib/materials";
import { boundingBox, shapeToPoints } from "../lib/geometry";
import { Shapes, Cpu, Drill, FileOutput } from "lucide-react";
import { NumberField } from "./NumberField";
import { Navigator } from "./Navigator";
import { ToolLibrary } from "./ToolLibrary";
import { Notice } from "./Notice";
import type { StockOrigin, MaterialId, CutParamKey, Shape, CutSide, OrderMode, ToolType, CornerType, CornerId, TextAlign, PostId, ExportUnits, ExtraOperation } from "../types";
import { throughCutDepth } from "../state/store";
import { helixDiameter } from "../lib/toolpath";
import { POSTS } from "../lib/post";
import { FONTS } from "../lib/text";
import { DEFAULT_TABS } from "../types";

interface SectionProps {
  id: PanelSection;
  title: string;
  children: React.ReactNode;
}

/** Body of a panel tab (only the active one renders). */
function Section({ id, title, children }: SectionProps) {
  const open = useUiStore((s) => s.section === id);
  if (!open) return null;
  return (
    <section className="panel-section open" data-testid={`section-${id}`} aria-labelledby={`tab-${id}`}>
      <div className="panel-body" id={`panel-${id}`} role="tabpanel">
        <h2 className="panel-heading">{title}</h2>
        {children}
      </div>
    </section>
  );
}

const TABS: { id: PanelSection; label: string; icon: React.ReactNode }[] = [
  { id: "shape", label: "Peça", icon: <Shapes size={15} /> },
  { id: "machine", label: "Máquina", icon: <Cpu size={15} /> },
  { id: "cut", label: "Corte", icon: <Drill size={15} /> },
  { id: "post", label: "Exportar", icon: <FileOutput size={15} /> },
];

/** Tab strip at the top of the side panel. */
function PanelTabs() {
  const section = useUiStore((s) => s.section);
  const setSection = useUiStore((s) => s.setSection);
  return (
    <div className="panel-tabs" role="tablist" aria-label="Seções do painel">
      {TABS.map((t) => {
        const active = section === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active}
            aria-controls={`panel-${t.id}`}
            className={`panel-tab${active ? " active" : ""}`}
            onClick={() => setSection(t.id)}
            data-testid={`section-toggle-${t.id}`}
            title={t.label}
          >
            <span className="panel-tab-icon">{t.icon}</span>
            <span className="panel-tab-label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Extra operations on the same geometry (rebaixo + contorno passante…). */
function ExtraOps({ shape }: { shape: Shape }) {
  const addExtraOp = useProjectStore((s) => s.addExtraOp);
  const updateExtraOp = useProjectStore((s) => s.updateExtraOp);
  const removeExtraOp = useProjectStore((s) => s.removeExtraOp);
  const stock = useProjectStore((s) => s.settings.stock);
  const tools = useProjectStore((s) => s.settings.tools);
  const ops = shape.extraOps ?? [];
  const suggest = (): Omit<ExtraOperation, "id"> =>
    shape.operation === "pocket"
      ? { operation: "outline", side: "outside", depth: throughCutDepth(stock.thickness), cutThrough: true, tabs: { ...DEFAULT_TABS } }
      : { operation: "pocket", depth: Math.min(shape.depth, Math.max(1, Math.round(stock.thickness / 3))) };
  return (
    <div className="extra-ops" data-testid="extra-ops">
      <div className="extra-ops-head">
        <span className="panel-group-title">Operações adicionais {ops.length ? `(${ops.length})` : ""}</span>
        <button type="button" className="link" onClick={() => addExtraOp(shape.id, suggest())} data-testid="extra-op-add">+ adicionar</button>
      </div>
      {ops.length === 0 && <p className="hint">Mesma geometria, outra operação — ex.: rebaixo de 4 mm e depois recorte passante. Executadas depois da principal.</p>}
      {ops.map((op, i) => (
        <div key={op.id} className="extra-op" data-testid={`extra-op-${i}`}>
          <div className="field-row">
            <label>
              Operação
              <select value={op.operation} onChange={(e) => updateExtraOp(shape.id, op.id, { operation: e.target.value as ExtraOperation["operation"] })} data-testid={`extra-op-${i}-operation`}>
                <option value="outline">Contorno</option>
                <option value="pocket">Rebaixo</option>
                {shape.kind === "circle" && <option value="drill">Furação</option>}
              </select>
            </label>
            <NumberField label="Profundidade" unit="mm" min={0.1} step={0.5} value={op.depth} testId={`extra-op-${i}-depth`} onChange={(v) => updateExtraOp(shape.id, op.id, { depth: v, cutThrough: false })} />
          </div>
          {op.operation === "outline" && (
            <div className="field-row">
              <label>
                Compensação
                <select value={op.side ?? shape.side ?? "on"} onChange={(e) => updateExtraOp(shape.id, op.id, { side: e.target.value as CutSide })} data-testid={`extra-op-${i}-side`}>
                  <option value="outside">Por fora</option>
                  <option value="inside">Por dentro</option>
                  <option value="on">Na linha</option>
                </select>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={!!op.tabs} onChange={(e) => updateExtraOp(shape.id, op.id, { tabs: e.target.checked ? { ...DEFAULT_TABS } : undefined })} />
                Tabs
              </label>
            </div>
          )}
          <div className="field-row">
            <label className="checkbox">
              <input type="checkbox" checked={!!op.cutThrough} onChange={(e) => updateExtraOp(shape.id, op.id, { cutThrough: e.target.checked, depth: e.target.checked ? throughCutDepth(stock.thickness) : op.depth })} data-testid={`extra-op-${i}-through`} />
              Cortar através
            </label>
            {tools.length > 0 && (
              <label>
                Fresa
                <select value={op.toolId ?? ""} onChange={(e) => updateExtraOp(shape.id, op.id, { toolId: e.target.value || undefined })}>
                  <option value="">Igual à peça</option>
                  {tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            )}
            <button type="button" className="link danger-link" onClick={() => removeExtraOp(shape.id, op.id)} data-testid={`extra-op-${i}-remove`}>remover</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Small sub-heading inside a tab. */
function Group({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="panel-group">
      <h3 className="panel-group-title">{title}</h3>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </div>
  );
}

function shapeSummary(shape: Shape): string {
  switch (shape.kind) {
    case "rectangle": return `retângulo ${shape.width}×${shape.height}`;
    case "circle": return `círculo r${shape.radius}`;
    case "ngon": return `polígono regular ${shape.sides} lados r${shape.radius}`;
    case "slot": return `rasgo ${shape.length}×${shape.width}`;
    case "text": return `texto "${shape.text.slice(0, 10)}" ${shape.size} mm`;
    default: return `polígono (${shape.points.length} pts${shape.holes?.length ? `, ${shape.holes.length} furo(s)` : ""})`;
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

  const selectedIds = useProjectStore((s) => s.selectedIds);
  const alignSelected = useProjectStore((s) => s.alignSelected);
  const removeSelected = useProjectStore((s) => s.removeSelected);
  const selectedShape = selectedIds.length === 1 ? shapes.find((s) => s.id === selectedId) : undefined;
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

      <PanelTabs />

      <Section id="shape" title="Peça">
        <Group title={`Peças (${shapes.length})`}>
          <Navigator />
        </Group>
        <h3 className="panel-group-title">{selectedShape ? "Selecionada" : selectedIds.length > 1 ? `${selectedIds.length} selecionadas` : "Nenhuma selecionada"}</h3>
        {!selectedShape && selectedIds.length < 2 && <p className="hint">Clique numa peça no desenho ou crie uma pela barra. Shift+clique ou arraste no fundo para pegar várias.</p>}
        {selectedIds.length > 1 && (
          <>
            <p className="hint" data-testid="multi-summary">{selectedIds.length} peças selecionadas — alinhe pela barra, setas para mover, Del para excluir.</p>
            <div className="field-row">
              <button type="button" onClick={() => alignSelected("left")}>Alinhar esq.</button>
              <button type="button" onClick={() => alignSelected("centerX")}>Centralizar</button>
              <button type="button" onClick={() => alignSelected("bottom")}>Alinhar base</button>
            </div>
            <button type="button" className="danger" onClick={removeSelected}>Remover {selectedIds.length} formas</button>
          </>
        )}
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
            {selectedShape.kind === "rectangle" && (
              <>
                <label>
                  Cantos
                  <select
                    value={selectedShape.corners?.type ?? "sharp"}
                    onChange={(e) => {
                      const type = e.target.value as CornerType;
                      updateShape(selectedShape.id, { corners: type === "sharp" ? undefined : { type, size: selectedShape.corners?.size || 5, which: selectedShape.corners?.which } });
                    }}
                    data-testid="corner-type"
                  >
                    <option value="sharp">Vivos</option>
                    <option value="fillet">Arredondados (raio)</option>
                    <option value="chamfer">Chanfrados</option>
                  </select>
                </label>
                {selectedShape.corners && selectedShape.corners.type !== "sharp" && (
                  <>
                    <NumberField
                      label={selectedShape.corners.type === "fillet" ? "Raio do canto" : "Chanfro"}
                      unit="mm"
                      min={0.1}
                      max={Math.min(selectedShape.width, selectedShape.height) / 2}
                      step={0.5}
                      value={selectedShape.corners.size}
                      testId="corner-size"
                      onChange={(v) => updateShape(selectedShape.id, { corners: { ...selectedShape.corners!, size: v } })}
                    />
                    <div className="corner-grid" role="group" aria-label="Quais cantos">
                      {(["tl", "tr", "bl", "br"] as CornerId[]).map((id) => {
                        const all = !selectedShape.corners!.which || selectedShape.corners!.which.length === 0;
                        const on = all || selectedShape.corners!.which!.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            className={`corner-btn ${id}${on ? " on" : ""}`}
                            aria-pressed={on}
                            title={{ tl: "Superior esquerdo", tr: "Superior direito", bl: "Inferior esquerdo", br: "Inferior direito" }[id]}
                            data-testid={`corner-${id}`}
                            onClick={() => {
                              const cur = all ? (["tl", "tr", "bl", "br"] as CornerId[]) : selectedShape.corners!.which!;
                              const next = cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id];
                              updateShape(selectedShape.id, { corners: { ...selectedShape.corners!, which: next.length === 4 ? undefined : next } });
                            }}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
            {selectedShape.kind === "circle" && (
              <NumberField label="Raio" unit="mm" min={0.1} step={1} value={selectedShape.radius} testId="shape-radius"
                onChange={(v) => updateShape(selectedShape.id, { radius: v })} />
            )}
            {selectedShape.kind === "ngon" && (
              <>
                <div className="field-row">
                  <NumberField label="Raio" unit="mm" min={0.1} step={1} value={selectedShape.radius} testId="shape-radius"
                    onChange={(v) => updateShape(selectedShape.id, { radius: v })} />
                  <NumberField label="Lados" min={3} max={64} step={1} value={selectedShape.sides} testId="shape-sides"
                    onChange={(v) => updateShape(selectedShape.id, { sides: Math.round(v) })} />
                </div>
                <NumberField label="Rotação" unit="°" min={-360} max={360} step={5} value={selectedShape.rotation} testId="shape-rotation"
                  onChange={(v) => updateShape(selectedShape.id, { rotation: v })} />
              </>
            )}
            {selectedShape.kind === "text" && (
              <>
                <label>
                  Texto
                  <input type="text" value={selectedShape.text} onChange={(e) => updateShape(selectedShape.id, { text: e.target.value })} data-testid="text-value" />
                </label>
                <div className="field-row">
                  <label>
                    Fonte
                    <select value={selectedShape.fontId} onChange={(e) => updateShape(selectedShape.id, { fontId: e.target.value })} data-testid="text-font">
                      {FONTS.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Alinhamento
                    <select value={selectedShape.align} onChange={(e) => updateShape(selectedShape.id, { align: e.target.value as TextAlign })} data-testid="text-align">
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </label>
                </div>
                <div className="field-row">
                  <NumberField label="Tamanho" unit="mm" min={1} step={1} value={selectedShape.size} testId="text-size"
                    onChange={(v) => updateShape(selectedShape.id, { size: v })} />
                  <NumberField label="Espaçamento" unit="mm" min={-10} max={50} step={0.5} value={selectedShape.letterSpacing} testId="text-spacing"
                    onChange={(v) => updateShape(selectedShape.id, { letterSpacing: v })} />
                </div>
                <NumberField label="Rotação" unit="°" min={-360} max={360} step={5} value={selectedShape.rotation} testId="shape-rotation"
                  onChange={(v) => updateShape(selectedShape.id, { rotation: v })} />
                <p className="hint">Letras com furos (a, o, e) mantêm o miolo. Para gravar, use contorno "na linha" com fresa V; para recortar, "por fora".</p>
              </>
            )}
            {selectedShape.kind === "slot" && (
              <>
                <div className="field-row">
                  <NumberField label="Comprimento" unit="mm" min={0.1} step={1} value={selectedShape.length} testId="shape-length"
                    onChange={(v) => updateShape(selectedShape.id, { length: v })} />
                  <NumberField label="Largura" unit="mm" min={0.1} step={1} value={selectedShape.width} testId="shape-width"
                    onChange={(v) => updateShape(selectedShape.id, { width: v })} />
                </div>
                <NumberField label="Rotação" unit="°" min={-360} max={360} step={5} value={selectedShape.rotation} testId="shape-rotation"
                  onChange={(v) => updateShape(selectedShape.id, { rotation: v })} />
              </>
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
              Cortar através <span className="field-hint">(espessura + 0,2 mm)</span>
            </label>
            <label>
              Nome
              <input
                type="text"
                value={selectedShape.name ?? ""}
                placeholder="(automático)"
                onChange={(e) => updateShape(selectedShape.id, { name: e.target.value || undefined })}
                data-testid="shape-name"
              />
            </label>
            {settings.tools.length > 0 && (
              <label>
                Fresa
                <select value={selectedShape.toolId ?? ""} onChange={(e) => updateShape(selectedShape.id, { toolId: e.target.value || undefined })} data-testid="shape-tool">
                  <option value="">Padrão (Ø{settings.toolDiameter} mm)</option>
                  {settings.tools.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (Ø{t.diameter} mm)</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Operação
              <select
                value={selectedShape.operation}
                onChange={(e) => updateShape(selectedShape.id, { operation: e.target.value as Shape["operation"] })}
                data-testid="shape-operation"
              >
                <option value="outline">Contorno</option>
                <option value="pocket">Rebaixo (pocket)</option>
                {selectedShape.kind === "circle" && <option value="drill">Furação (mergulho no centro)</option>}
              </select>
            </label>
            {selectedShape.operation === "outline" && (
              <>
                <label>
                  Compensação da fresa
                  <select
                    value={selectedShape.side ?? "on"}
                    onChange={(e) => updateShape(selectedShape.id, { side: e.target.value as CutSide })}
                    data-testid="shape-side"
                  >
                    <option value="outside">Por fora (recorte)</option>
                    <option value="inside">Por dentro (furo)</option>
                    <option value="on">Na linha (gravação)</option>
                  </select>
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!selectedShape.tabs && selectedShape.tabs.count > 0}
                    onChange={(e) => updateShape(selectedShape.id, { tabs: e.target.checked ? { ...DEFAULT_TABS } : undefined })}
                    data-testid="shape-tabs"
                  />
                  Pontes (tabs) para segurar a peça
                </label>
                {selectedShape.tabs && selectedShape.tabs.count > 0 && (
                  <div className="field-row">
                    <NumberField label="Qtd" min={1} max={20} step={1} value={selectedShape.tabs.count} testId="tabs-count"
                      onChange={(v) => updateShape(selectedShape.id, { tabs: { ...selectedShape.tabs!, count: Math.round(v) } })} />
                    <NumberField label="Largura" unit="mm" min={1} step={1} value={selectedShape.tabs.width} testId="tabs-width"
                      onChange={(v) => updateShape(selectedShape.id, { tabs: { ...selectedShape.tabs!, width: v } })} />
                    <NumberField label="Altura" unit="mm" min={0.5} step={0.5} value={selectedShape.tabs.height} testId="tabs-height"
                      onChange={(v) => updateShape(selectedShape.id, { tabs: { ...selectedShape.tabs!, height: v } })} />
                  </div>
                )}
              </>
            )}
            <ExtraOps shape={selectedShape} />
            <button type="button" className="danger" onClick={() => removeShape(selectedShape.id)}>
              Remover forma
            </button>
          </>
        )}
      </Section>

      <Section id="machine" title="Máquina & chapa">
        <Group title="Máquina (área útil)">
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
        </Group>
        <Group title="Chapa / base" hint="O X0 Y0 do G-code fica na chapa.">
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
            <option value="front-left">Canto frontal esquerdo</option>
            <option value="center">Centro da chapa</option>
          </select>
        </label>
        </Group>
      </Section>

      <Section id="cut" title="Fresas & corte">
        <Group title="Material e fresa padrão">
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
                    ? "Atualizei o corte — os campos manuais ficaram. Confira."
                    : "Atualizei o corte para o material. Confira.",
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
        <label>
          Tipo de fresa
          <select value={settings.toolType} onChange={(e) => updateSettings({ toolType: e.target.value as ToolType })} data-testid="tool-type">
            <option value="flat">Topo reto (flat)</option>
            <option value="ball">Ponta esférica (ball nose)</option>
            <option value="vbit">V (gravação)</option>
          </select>
        </label>
        {settings.toolType === "vbit" && (
          <NumberField label="Ângulo da fresa V" unit="°" min={10} max={170} step={5} value={settings.vbitAngle} testId="vbit-angle" onChange={(v) => updateSettings({ vbitAngle: v })} />
        )}
        </Group>
        <Group title={`Outras fresas (${settings.tools.length})`}>
        <ToolLibrary />
        </Group>
        <Group title="Parâmetros de corte">
        {material && hasOverrides && (
          <button
            type="button"
            className="link"
            onClick={() => { setMaterial(settings.material, true); setNotice({ kind: "info", title: `Voltei o preset ${material.label}.` }); }}
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
        <NumberField label="Rampa de entrada" hint="0 = mergulho vertical" unit="°" min={0} max={45} step={1} value={settings.rampAngle} testId="ramp-angle" onChange={(v) => updateSettings({ rampAngle: v })} />
        <label className="checkbox">
          <input type="checkbox" checked={settings.helixEntry} onChange={(e) => updateSettings({ helixEntry: e.target.checked })} data-testid="helix-entry" />
          Hélice de entrada nos rebaixos <span className="field-hint">(furo Ø {round(helixDiameter(settings.toolDiameter) + settings.toolDiameter)} mm)</span>
        </label>
        {settings.helixEntry && (
          <NumberField label="Passo da hélice" hint="mm por volta" unit="mm" min={0.1} step={0.1} value={settings.helixPitch} testId="helix-pitch" onChange={(v) => updateSettings({ helixPitch: v })} />
        )}
        <NumberField label="Furação: bicada" hint="profundidade por bicada; 0 = direto" unit="mm" min={0} step={0.5} value={settings.peckDepth} testId="peck-depth" onChange={(v) => updateSettings({ peckDepth: v })} />
        <label>
          Ordem de usinagem
          <select value={settings.orderMode} onChange={(e) => updateSettings({ orderMode: e.target.value as OrderMode })} data-testid="order-mode">
            <option value="auto">Automática (rebaixos → furos → recortes)</option>
            <option value="manual">Manual (ordem do navegador)</option>
          </select>
        </label>
        </Group>
      </Section>

      <Section id="post" title="Exportação">
        <Group title="Máquina (movimento)">
          <NumberField label="Deslocamento rápido (G0)" unit="mm/min" min={1} step={100} value={settings.rapidRate} testId="rapid-rate" onChange={(v) => updateSettings({ rapidRate: v })} />
          <NumberField label="Altura segura" unit="mm" min={0} step={1} value={settings.safeHeight} testId="safe-height" onChange={(v) => updateSettings({ safeHeight: v })} />
          <NumberField label="Aceleração dos eixos" unit="mm/s²" min={0} step={10} value={settings.accel} testId="accel" onChange={(v) => updateSettings({ accel: v })} hint="0 = ignorar na estimativa de tempo" />
        </Group>
        <Group title="G-code">
        <label>
          Pós-processador (controlador)
          <select value={settings.post} onChange={(e) => updateSettings({ post: e.target.value as PostId })} data-testid="post">
            {POSTS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <p className="hint">{POSTS.find((p) => p.id === settings.post)?.description}</p>
        <label>
          Unidades do G-code
          <select value={settings.exportUnits} onChange={(e) => updateSettings({ exportUnits: e.target.value as ExportUnits })} data-testid="export-units">
            <option value="mm">Milímetros (G21)</option>
            <option value="inch">Polegadas (G20)</option>
          </select>
        </label>
        </Group>
      </Section>
    </aside>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
