import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidePanel } from "../SidePanel";
import { useProjectStore } from "../../state/store";
import { useUiStore } from "../../state/uiStore";
import type { CircleShape, RectangleShape, SlotShape, TextShape } from "../../types";

const openSection = (id: string) => fireEvent.click(screen.getByTestId(`section-toggle-${id}`));
const rect = (over: Partial<RectangleShape> = {}): RectangleShape => ({
  id: "r1", kind: "rectangle", x: 10, y: 10, width: 60, height: 40, rotation: 0, depth: 5, operation: "outline", side: "outside", ...over,
});
const selectShape = (s: RectangleShape | CircleShape | SlotShape | TextShape) =>
  useProjectStore.setState({ shapes: [s], selectedId: s.id, selectedIds: [s.id] });

describe("SidePanel — abas máquina, corte e exportação", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useUiStore.setState({ notice: null, section: "shape" });
  });

  it("preset de máquina aplica a área útil e editar um campo vira 'personalizada'", () => {
    render(<SidePanel />);
    openSection("machine");
    fireEvent.change(screen.getByTestId("machine-preset"), { target: { value: "3018" } });
    expect(useProjectStore.getState().settings.workArea.width).toBe(300);
    fireEvent.change(screen.getByTestId("work-width"), { target: { value: "555" } });
    expect(useProjectStore.getState().settings.machinePreset).toBe("custom");
    expect((screen.getByTestId("machine-preset") as HTMLSelectElement).value).toBe("custom");
  });

  it("origem da chapa muda pelo OriginPicker", () => {
    render(<SidePanel />);
    openSection("machine");
    fireEvent.click(screen.getByRole("radio", { name: /Centro/ }));
    expect(useProjectStore.getState().settings.stock.origin).toBe("center");
  });

  it("material aplica os parâmetros; editar um campo marca override; restaurar volta ao preset", () => {
    render(<SidePanel />);
    openSection("cut");
    fireEvent.change(screen.getByTestId("material-select"), { target: { value: "pine" } });
    const applied = useProjectStore.getState().settings.feedRate;
    expect(applied).toBe(1800);
    fireEvent.change(screen.getByTestId("cut-feedRate"), { target: { value: "999" } });
    expect(useProjectStore.getState().settings.overrides.feedRate).toBe(true);
    fireEvent.click(screen.getByTestId("restore-preset"));
    expect(useProjectStore.getState().settings.feedRate).toBe(1800);
    expect(useUiStore.getState().notice?.title).toContain("Voltei o preset");
  });

  it("fresa V mostra o campo de ângulo; hélice mostra o passo", () => {
    render(<SidePanel />);
    openSection("cut");
    expect(screen.queryByTestId("vbit-angle")).toBeNull();
    fireEvent.change(screen.getByTestId("tool-type"), { target: { value: "vbit" } });
    expect(screen.getByTestId("vbit-angle")).toBeInTheDocument();

    expect(screen.queryByTestId("helix-pitch")).toBeNull();
    fireEvent.click(screen.getByTestId("helix-entry"));
    expect(screen.getByTestId("helix-pitch")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("helix-pitch"), { target: { value: "2" } });
    expect(useProjectStore.getState().settings.helixPitch).toBe(2);
  });

  it("estratégia de rebaixo, bicada e ordem de usinagem", () => {
    render(<SidePanel />);
    openSection("cut");
    fireEvent.change(screen.getByTestId("pocket-strategy"), { target: { value: "zigzag" } });
    expect(useProjectStore.getState().settings.pocketStrategy).toBe("zigzag");
    fireEvent.change(screen.getByTestId("peck-depth"), { target: { value: "3" } });
    expect(useProjectStore.getState().settings.peckDepth).toBe(3);
    fireEvent.change(screen.getByTestId("order-mode"), { target: { value: "manual" } });
    expect(useProjectStore.getState().settings.orderMode).toBe("manual");
  });

  it("exportação: pós-processador, unidades e movimento", () => {
    render(<SidePanel />);
    openSection("post");
    fireEvent.change(screen.getByTestId("post"), { target: { value: "marlin" } });
    expect(useProjectStore.getState().settings.post).toBe("marlin");
    fireEvent.change(screen.getByTestId("export-units"), { target: { value: "inch" } });
    expect(useProjectStore.getState().settings.exportUnits).toBe("inch");
    fireEvent.change(screen.getByTestId("rapid-rate"), { target: { value: "2500" } });
    fireEvent.change(screen.getByTestId("accel"), { target: { value: "400" } });
    expect(useProjectStore.getState().settings.rapidRate).toBe(2500);
    expect(useProjectStore.getState().settings.accel).toBe(400);
  });

  it("peça circular oferece furação; cortar através segue a espessura da chapa", () => {
    selectShape({ id: "c1", kind: "circle", x: 20, y: 20, radius: 5, depth: 5, operation: "outline" } as CircleShape);
    render(<SidePanel />);
    fireEvent.change(screen.getByTestId("shape-operation"), { target: { value: "drill" } });
    expect(useProjectStore.getState().shapes[0].operation).toBe("drill");

    fireEvent.click(screen.getByTestId("cut-through"));
    const s = useProjectStore.getState();
    expect(s.shapes[0].cutThrough).toBe(true);
    expect(s.shapes[0].depth).toBeGreaterThan(s.settings.stock.thickness);
  });

  it("cantos do retângulo: fillet com raio", () => {
    selectShape(rect());
    render(<SidePanel />);
    fireEvent.change(screen.getByTestId("corner-type"), { target: { value: "fillet" } });
    fireEvent.change(screen.getByTestId("corner-size"), { target: { value: "6" } });
    const r = useProjectStore.getState().shapes[0] as RectangleShape;
    expect(r.corners).toMatchObject({ type: "fillet", size: 6 });
  });

  it("operação adicional entra, edita e sai pela UI", () => {
    selectShape(rect({ operation: "pocket", depth: 4, side: undefined }));
    render(<SidePanel />);
    fireEvent.click(screen.getByTestId("extra-op-add"));
    let s = useProjectStore.getState().shapes[0];
    expect(s.extraOps).toHaveLength(1);
    expect(s.extraOps![0].operation).toBe("outline"); // sugestão: rebaixo ganha recorte passante
    fireEvent.change(screen.getByTestId("extra-op-0-depth"), { target: { value: "9" } });
    s = useProjectStore.getState().shapes[0];
    expect(s.extraOps![0].depth).toBe(9);
    fireEvent.click(screen.getByTestId("extra-op-0-remove"));
    expect(useProjectStore.getState().shapes[0].extraOps ?? []).toHaveLength(0);
  });

  it("rasgo edita comprimento e largura", () => {
    selectShape({ id: "s1", kind: "slot", x: 10, y: 10, length: 50, width: 12, rotation: 0, depth: 5, operation: "outline" } as SlotShape);
    render(<SidePanel />);
    fireEvent.change(screen.getByTestId("shape-length"), { target: { value: "80" } });
    expect((useProjectStore.getState().shapes[0] as SlotShape).length).toBe(80);
  });

  it("duas peças selecionadas mostram o resumo múltiplo e o alinhar da barra", () => {
    const a = rect(); const b = rect({ id: "r2", x: 120 });
    useProjectStore.setState({ shapes: [a, b], selectedId: "r2", selectedIds: ["r1", "r2"] });
    render(<SidePanel />);
    expect(screen.getByTestId("multi-summary")).toHaveTextContent("2 peças selecionadas");
    fireEvent.click(screen.getByText("Alinhar base"));
    const [s1, s2] = useProjectStore.getState().shapes as RectangleShape[];
    expect(s1.y).toBe(s2.y);
  });

  it("posição X move a peça; nome e fresa por peça gravam", () => {
    useProjectStore.getState().updateSettings({ tools: [{ id: "t1", name: "Fina", type: "flat", diameter: 2, vbitAngle: 60 }] });
    selectShape(rect());
    render(<SidePanel />);
    fireEvent.change(screen.getByTestId("shape-x"), { target: { value: "50" } });
    expect((useProjectStore.getState().shapes[0] as RectangleShape).x).toBe(50);
    fireEvent.change(screen.getByTestId("shape-name"), { target: { value: "Tampa" } });
    fireEvent.change(screen.getByTestId("shape-tool"), { target: { value: "t1" } });
    const r = useProjectStore.getState().shapes[0];
    expect(r.name).toBe("Tampa");
    expect(r.toolId).toBe("t1");
  });

  it("texto: alinhamento, tamanho e espaçamento", () => {
    selectShape({
      id: "t", kind: "text", x: 10, y: 10, text: "Oi", fontId: "inter", size: 20, rotation: 0,
      align: "left", letterSpacing: 0, depth: 1, operation: "outline", side: "on",
    } as TextShape);
    render(<SidePanel />);
    fireEvent.change(screen.getByTestId("text-align"), { target: { value: "center" } });
    fireEvent.change(screen.getByTestId("text-size"), { target: { value: "30" } });
    fireEvent.change(screen.getByTestId("text-spacing"), { target: { value: "2" } });
    const t = useProjectStore.getState().shapes[0] as TextShape;
    expect(t.align).toBe("center");
    expect(t.size).toBe(30);
    expect(t.letterSpacing).toBe(2);
  });

  it("polígono regular edita o número de lados", () => {
    useProjectStore.setState({ shapes: [{ id: "n1", kind: "ngon", x: 30, y: 30, radius: 20, sides: 6, rotation: 0, depth: 5, operation: "outline" }], selectedId: "n1", selectedIds: ["n1"] });
    render(<SidePanel />);
    fireEvent.change(screen.getByTestId("shape-sides"), { target: { value: "8" } });
    expect((useProjectStore.getState().shapes[0] as { sides: number }).sides).toBe(8);
  });
});
