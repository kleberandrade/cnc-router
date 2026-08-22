import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImportVectorDialog } from "../ImportVectorDialog";
import { useProjectStore } from "../../state/store";
import { useUiStore } from "../../state/uiStore";
import type { PathShape } from "../../types";

const dxfDoc = (...entities: string[][]) =>
  ["0", "SECTION", "2", "ENTITIES", ...entities.flat(), "0", "ENDSEC", "0", "EOF", ""].join("\n");

const rect = (x: number, y: number, w: number, h: number, layer = "0") => [
  "0", "LWPOLYLINE", "8", layer, "90", "4", "70", "1",
  "10", `${x}`, "20", `${y}`,
  "10", `${x + w}`, "20", `${y}`,
  "10", `${x + w}`, "20", `${y + h}`,
  "10", `${x}`, "20", `${y + h}`,
];

const circle = (x: number, y: number, r: number, layer = "0") => [
  "0", "CIRCLE", "8", layer, "10", `${x}`, "20", `${y}`, "40", `${r}`,
];

const show = (name: string, text: string, onDone = () => {}) =>
  render(<ImportVectorDialog file={new File([text], name)} text={text} onDone={onDone} />);

const flange = dxfDoc(rect(0, 0, 100, 60), circle(20, 30, 5), circle(50, 30, 5), circle(80, 30, 5));

describe("ImportVectorDialog", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useUiStore.setState({ notice: null });
  });

  it("mostra a contagem com os furos agrupados e importa só ao confirmar", () => {
    let done = false;
    show("flange.dxf", flange, () => { done = true; });
    expect(screen.getByTestId("import-count")).toHaveTextContent("1 peça");
    expect(screen.getByTestId("import-preview").querySelectorAll("path").length).toBeGreaterThan(0);
    expect(useProjectStore.getState().shapes).toHaveLength(0);

    fireEvent.click(screen.getByTestId("import-confirm"));
    const shapes = useProjectStore.getState().shapes;
    expect(shapes).toHaveLength(1);
    expect((shapes[0] as PathShape).holes).toHaveLength(3);
    expect(shapes[0].side).toBe("outside");
    expect(useUiStore.getState().notice?.title).toMatch(/3 furos/);
    expect(done).toBe(true);
  });

  it("desligar 'inferir furos' devolve os laços soltos", () => {
    show("flange.dxf", flange);
    fireEvent.click(screen.getByTestId("import-infer-holes"));
    expect(screen.getByTestId("import-count")).toHaveTextContent("4 peças");
    fireEvent.click(screen.getByTestId("import-confirm"));
    expect(useProjectStore.getState().shapes).toHaveLength(4);
  });

  it("camadas desmarcadas saem da conta e da importação", () => {
    show("cotado.dxf", dxfDoc(rect(0, 0, 100, 60), circle(50, 30, 5), rect(200, 0, 30, 30, "COTAS")));
    expect(screen.getByTestId("import-layers")).toBeInTheDocument();
    expect(screen.getByTestId("import-count")).toHaveTextContent("2 peças");
    fireEvent.click(screen.getByTestId("import-layer-COTAS"));
    expect(screen.getByTestId("import-count")).toHaveTextContent("1 peça");
    fireEvent.click(screen.getByTestId("import-layer-COTAS"));
    expect(screen.getByTestId("import-count")).toHaveTextContent("2 peças");
  });

  it("sobrescrever a unidade reescala o desenho", () => {
    show("pol.dxf", dxfDoc(rect(4, 2, 4, 2)));
    fireEvent.change(screen.getByTestId("import-unit"), { target: { value: "25.4" } });
    fireEvent.click(screen.getByTestId("import-confirm"));
    const p = useProjectStore.getState().shapes[0] as PathShape;
    expect(Math.min(...p.points.map(([x]) => x))).toBeCloseTo(101.6, 1);
  });

  it("arquivo quebrado mostra o erro e trava o botão", () => {
    show("ruim.dxf", "isso não é um DXF");
    expect(screen.getByTestId("import-error")).toHaveTextContent("Esse DXF não abriu.");
    expect(screen.getByTestId("import-confirm")).toBeDisabled();
    expect(screen.getByTestId("import-count")).toHaveTextContent("Nada para importar");
  });

  it("SVG entra sem camadas nem unidade", () => {
    show("peca.svg", `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="5" height="5"/></svg>`);
    expect(screen.queryByTestId("import-layers")).toBeNull();
    expect(screen.queryByTestId("import-unit")).toBeNull();
    expect(screen.queryByTestId("import-infer-holes")).toBeNull();
    fireEvent.click(screen.getByTestId("import-confirm"));
    expect(useProjectStore.getState().shapes).toHaveLength(1);
    expect(useUiStore.getState().notice?.title).toMatch(/SVG/);
  });

  it("cancelar não põe nada na chapa", () => {
    let done = false;
    show("flange.dxf", flange, () => { done = true; });
    fireEvent.click(screen.getByTestId("import-cancel"));
    expect(useProjectStore.getState().shapes).toHaveLength(0);
    expect(done).toBe(true);
  });

  it("aviso do parser aparece na lista", () => {
    // moldura em volta de duas peças com furo
    const doc = dxfDoc(
      rect(-10, -10, 240, 100),
      rect(0, 0, 100, 60), circle(50, 30, 5),
      rect(120, 0, 100, 60), circle(170, 30, 5),
    );
    show("moldura.dxf", doc);
    expect(screen.getByTestId("import-warnings")).toHaveTextContent(/borda em volta/);
  });
});
