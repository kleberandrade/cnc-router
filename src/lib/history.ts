import type { Shape, MachineSettings } from "../types";

export interface HistoryStep {
  /** Short label for the timeline ("Adicionar retângulo", "Mover Furo 1", "Chapa"). */
  label: string;
  /** Icon hint for the UI. */
  kind: "add" | "remove" | "move" | "edit" | "settings" | "load" | "unknown";
  /** Ids involved (for highlighting). */
  ids: string[];
}

const KIND_PT: Record<Shape["kind"], string> = { rectangle: "retângulo", circle: "círculo", path: "polígono", ngon: "polígono regular", slot: "rasgo", text: "texto", relief: "relevo" };
const SETTING_PT: Partial<Record<keyof MachineSettings, string>> = {
  stock: "Chapa", workArea: "Máquina", material: "Material", toolDiameter: "Ø da fresa", toolType: "Tipo de fresa", tools: "Fresas", feedRate: "Avanço", plungeRate: "Mergulho", spindleSpeed: "Rotação",
  passDepth: "Passe", stepover: "Stepover", rampAngle: "Rampa", helixEntry: "Hélice", peckDepth: "Bicada", orderMode: "Ordem", post: "Pós-processador", exportUnits: "Unidades", accel: "Aceleração", rapidRate: "G0", safeHeight: "Altura segura", projectName: "Nome do projeto", machinePreset: "Máquina", vbitAngle: "Ângulo V",
};

const nameOf = (s: Shape) => s.name ?? KIND_PT[s.kind];

/** Describe the transition between two project snapshots (heuristic diff, no store changes needed). */
export function describeStep(prev: { shapes: Shape[]; settings: MachineSettings }, next: { shapes: Shape[]; settings: MachineSettings }): HistoryStep {
  const pIds = new Map(prev.shapes.map((s) => [s.id, s]));
  const nIds = new Map(next.shapes.map((s) => [s.id, s]));
  const added = next.shapes.filter((s) => !pIds.has(s.id));
  const removed = prev.shapes.filter((s) => !nIds.has(s.id));
  if (added.length && removed.length && (added.length > 1 || removed.length > 1)) return { label: `Substituir ${removed.length} → ${added.length} peças`, kind: "load", ids: added.map((s) => s.id) };
  if (added.length && removed.length) return { label: `${nameOf(removed[0])} → ${nameOf(added[0])}`, kind: "edit", ids: added.map((s) => s.id) };
  if (added.length) return { label: added.length === 1 ? `Adicionar ${nameOf(added[0])}` : `Adicionar ${added.length} peças`, kind: "add", ids: added.map((s) => s.id) };
  if (removed.length) return { label: removed.length === 1 ? `Excluir ${nameOf(removed[0])}` : `Excluir ${removed.length} peças`, kind: "remove", ids: removed.map((s) => s.id) };
  // same set: what changed?
  const changed = next.shapes.filter((s) => pIds.get(s.id) !== s && JSON.stringify(pIds.get(s.id)) !== JSON.stringify(s));
  if (changed.length) {
    const s = changed[0], p = pIds.get(s.id)!;
    const geomKeys = new Set(["x", "y", "points", "holes"]);
    const keys = Object.keys({ ...p, ...s }).filter((k) => JSON.stringify((p as unknown as Record<string, unknown>)[k]) !== JSON.stringify((s as unknown as Record<string, unknown>)[k]));
    const onlyMove = keys.length > 0 && keys.every((k) => geomKeys.has(k));
    const label = changed.length > 1 ? `${onlyMove ? "Mover" : "Editar"} ${changed.length} peças` : onlyMove ? `Mover ${nameOf(s)}` : `Editar ${nameOf(s)}${keys.length === 1 ? ` (${keys[0]})` : ""}`;
    return { label, kind: onlyMove ? "move" : "edit", ids: changed.map((c) => c.id) };
  }
  if (prev.shapes.length === next.shapes.length && prev.shapes.some((s, i) => s.id !== next.shapes[i].id)) return { label: "Reordenar peças", kind: "edit", ids: [] };
  const sk = (Object.keys({ ...prev.settings, ...next.settings }) as (keyof MachineSettings)[]).filter((k) => JSON.stringify(prev.settings[k]) !== JSON.stringify(next.settings[k]));
  if (sk.length) return { label: sk.length === 1 ? (SETTING_PT[sk[0]] ?? String(sk[0])) : `Configurações (${sk.length})`, kind: "settings", ids: [] };
  return { label: "Alteração", kind: "unknown", ids: [] };
}
