import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";
import { useProjectStore } from "../../state/store";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";

describe("Toolbar", () => {
  beforeEach(() => {
    useProjectStore.getState().clear();
    useProjectStore.setState({ settings: DEFAULT_MACHINE_SETTINGS });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds a rectangle to the store when clicked", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    expect(useProjectStore.getState().shapes).toHaveLength(1);
    expect(useProjectStore.getState().shapes[0].kind).toBe("rectangle");
  });

  it("adds a circle to the store when clicked", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-circle"));
    expect(useProjectStore.getState().shapes[0].kind).toBe("circle");
  });

  it("shows the properties panel once a shape is selected", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    expect(screen.getByText("Propriedades")).toBeInTheDocument();
  });

  it("updates the selected shape's depth from the input", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    const depthInput = screen.getByLabelText(/Profundidade de corte/);
    fireEvent.change(depthInput, { target: { value: "9" } });
    expect(useProjectStore.getState().shapes[0].depth).toBe(9);
  });

  it("updates the selected shape's operation from the select", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-circle"));
    const opSelect = screen.getByLabelText(/Operação/);
    fireEvent.change(opSelect, { target: { value: "pocket" } });
    expect(useProjectStore.getState().shapes[0].operation).toBe("pocket");
  });

  it("removes the selected shape", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByText("Remover forma"));
    expect(useProjectStore.getState().shapes).toHaveLength(0);
  });

  it("updates machine settings (feed rate)", () => {
    render(<Toolbar />);
    const feedInput = screen.getByLabelText(/Avanço de corte/);
    fireEvent.change(feedInput, { target: { value: "1500" } });
    expect(useProjectStore.getState().settings.feedRate).toBe(1500);
  });

  it("warns inline and does not export when there are no shapes", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("export-gcode"));
    expect(screen.getByTestId("notice")).toHaveTextContent(
      "Adicione ao menos uma forma antes de exportar."
    );
  });

  it("shows validation problems instead of throwing when settings are invalid", async () => {
    useProjectStore.getState().updateSettings({ passDepth: 0 });
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("export-gcode"));
    expect(screen.getByTestId("notice")).toHaveTextContent(/Profundidade por passe/);
  });

  it("keeps the last valid value when a numeric field is cleared", async () => {
    render(<Toolbar />);
    const feedInput = screen.getByLabelText(/Avanço de corte/);
    fireEvent.change(feedInput, { target: { value: "" } });
    expect(useProjectStore.getState().settings.feedRate).toBe(800);
    fireEvent.change(feedInput, { target: { value: "0" } });
    expect(useProjectStore.getState().settings.feedRate).toBe(800);
  });

  it("changing the machine preset updates the work area", async () => {
    render(<Toolbar />);
    fireEvent.change(screen.getByTestId("machine-preset"), { target: { value: "3018" } });
    expect(useProjectStore.getState().settings.workArea).toEqual({ width: 300, height: 180, zTravel: 45 });
    fireEvent.change(screen.getByTestId("work-width"), { target: { value: "350" } });
    expect(useProjectStore.getState().settings.machinePreset).toBe("custom");
  });

  it("new shapes spawn inside the stock with depth = stock thickness", async () => {
    render(<Toolbar />);
    fireEvent.change(screen.getByTestId("stock-thickness"), { target: { value: "12" } });
    await userEvent.click(screen.getByTestId("add-rectangle"));
    const shape = useProjectStore.getState().shapes[0];
    expect(shape.depth).toBe(12);
    if (shape.kind === "rectangle") expect(shape.x).toBeGreaterThanOrEqual(0);
  });

  it("lists validation issues and blocks export on errors", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    // Shrink the table so the shape ends up outside it.
    fireEvent.change(screen.getByTestId("machine-preset"), { target: { value: "custom" } });
    fireEvent.change(screen.getByTestId("work-width"), { target: { value: "20" } });
    expect(screen.getByTestId("issues")).toHaveTextContent(/fora da área útil/);
    await userEvent.click(screen.getByTestId("export-gcode"));
    expect(screen.getByTestId("notice")).toHaveTextContent(/fora da área útil/);
  });

  it("starts a new project (shapes + default settings) after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    fireEvent.change(screen.getByLabelText(/Avanço de corte/), { target: { value: "1500" } });
    await userEvent.click(screen.getByTestId("new-project"));
    expect(useProjectStore.getState().shapes).toHaveLength(0);
    expect(useProjectStore.getState().settings.feedRate).toBe(800);
  });

  it("triggers a download when exporting with at least one shape", async () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("export-gcode"));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it("imports shapes from a valid SVG file", async () => {
    render(<Toolbar />);
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="5" height="5"/></svg>`;
    const file = new File([svgText], "peca.svg", { type: "image/svg+xml" });
    const input = screen.getByTestId("svg-file-input") as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(useProjectStore.getState().shapes).toHaveLength(1);
    });
  });

  it("shows an inline error when importing an invalid SVG file", async () => {
    render(<Toolbar />);
    const file = new File(["<svg><rect></svg"], "ruim.svg", {
      type: "image/svg+xml",
    });
    const input = screen.getByTestId("svg-file-input") as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId("notice")).toHaveTextContent(
        "Não foi possível importar esse arquivo SVG."
      );
    });
  });
});
