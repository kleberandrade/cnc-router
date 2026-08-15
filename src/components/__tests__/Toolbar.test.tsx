import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";
import { useProjectStore } from "../../state/store";

describe("Toolbar", () => {
  beforeEach(() => {
    useProjectStore.getState().clear();
    useProjectStore.setState({
      settings: {
        feedRate: 800,
        plungeRate: 200,
        spindleSpeed: 12000,
        safeHeight: 5,
        passDepth: 2,
        toolDiameter: 3,
      },
    });
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

  it("warns and does not export when there are no shapes", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("export-gcode"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Adicione ao menos uma forma antes de exportar."
    );
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

  it("shows an alert when importing an invalid SVG file", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<Toolbar />);
    const file = new File(["<svg><rect></svg"], "ruim.svg", {
      type: "image/svg+xml",
    });
    const input = screen.getByTestId("svg-file-input") as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Não foi possível importar esse arquivo SVG."
      );
    });
  });
});
