import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnalysisWorkspace } from "../AnalysisWorkspace";
import { useProjectStore } from "../../state/store";
import { useAnalysisStore } from "../../state/analysis";
import type { RectangleShape } from "../../types";

const bracket: RectangleShape = {
  id: "b1", kind: "rectangle", x: 0, y: 0, width: 200, height: 100, rotation: 0, depth: 18, operation: "outline",
};

describe("AnalysisWorkspace (estação Resistência)", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useProjectStore.setState({ shapes: [bracket], selectedId: "b1", selectedIds: ["b1"] });
    useAnalysisStore.setState({
      mode: "inplane", shapeId: "b1", supports: [], loads: [], loadKg: 10, loadDir: "down",
      tool: "support", status: "idle", error: null, result: null, shelfResult: null,
    });
    // canvas 2D do jsdom: contexto fake absorve a pintura
    const fake = {
      clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
      stroke: vi.fn(), fill: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      strokeStyle: "", fillStyle: "", lineWidth: 0, lineCap: "", font: "", textAlign: "",
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fake as never);
  });

  it("mostra o aviso permanente, os controles e o canvas", () => {
    render(<AnalysisWorkspace />);
    expect(screen.getByTestId("an-disclaimer")).toHaveTextContent("orientativos");
    expect(screen.getByTestId("an-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("an-run")).toBeInTheDocument();
  });

  it("clicar perto de um lado marca apoio; trocar a ferramenta marca carga", () => {
    render(<AnalysisWorkspace />);
    const canvas = screen.getByTestId("an-canvas") as HTMLCanvasElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 900, height: 620, right: 900, bottom: 620, x: 0, y: 0, toJSON: () => ({}) });
    // lado esquerdo da peça (x = 0 → px ~ 40 do pad)
    fireEvent.click(canvas, { clientX: 45, clientY: 310 });
    expect(useAnalysisStore.getState().supports.length).toBe(1);
    fireEvent.click(screen.getByTestId("an-tool-load"));
    // lado direito
    fireEvent.click(canvas, { clientX: 855, clientY: 310 });
    expect(useAnalysisStore.getState().loads.length).toBe(1);
  });

  it("Calcular sem marcação mostra o recado; com apoio+carga mostra resultados e utilização", () => {
    render(<AnalysisWorkspace />);
    fireEvent.click(screen.getByTestId("an-run"));
    expect(screen.getByTestId("an-error")).toHaveTextContent("apoiado");

    useAnalysisStore.setState({ supports: [3], loads: [1], error: null });
    fireEvent.click(screen.getByTestId("an-run"));
    expect(screen.getByTestId("an-results")).toHaveTextContent("MPa");
    expect(screen.getByTestId("an-utilization")).toHaveTextContent(/%/);
  });

  it("modo prateleira calcula flecha e dá o veredito de vão/300", () => {
    render(<AnalysisWorkspace />);
    fireEvent.click(screen.getByTestId("an-mode-shelf"));
    fireEvent.change(screen.getByTestId("an-shelf-span"), { target: { value: "900" } });
    fireEvent.click(screen.getByTestId("an-shelf-run"));
    expect(screen.getByTestId("an-shelf-results")).toHaveTextContent("mm");
    expect(screen.getByTestId("an-shelf-verdict")).toHaveTextContent(/vão\/300/);
    expect(screen.getByTestId("an-shelf-sketch")).toBeInTheDocument();
  });

  it("sem peça analisável a estação explica", () => {
    useProjectStore.setState({ shapes: [], selectedId: null, selectedIds: [] });
    render(<AnalysisWorkspace />);
    expect(screen.getByTestId("analysis-empty")).toBeInTheDocument();
  });
});
