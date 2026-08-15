import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";
import { useProjectStore } from "../../state/store";
import { useUiStore } from "../../state/uiStore";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";

const openSection = (id: string) => fireEvent.click(screen.getByTestId(`section-toggle-${id}`));

describe("Toolbar (ActionBar + SidePanel + StatusBar)", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useProjectStore.temporal.getState().clear();
    useUiStore.setState({ notice: null, section: "shape", tool: "select", draft: [] });
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

  it("shows the selected shape's fields once a shape is selected", async () => {
    render(<Toolbar />);
    expect(screen.queryByTestId("shape-depth")).toBeNull();
    await userEvent.click(screen.getByTestId("add-rectangle"));
    expect(screen.getByTestId("shape-depth")).toBeInTheDocument();
    expect(screen.getByTestId("shape-width")).toBeInTheDocument();
  });

  it("updates the selected shape's depth from the input", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    fireEvent.change(screen.getByTestId("shape-depth"), { target: { value: "9" } });
    expect(useProjectStore.getState().shapes[0].depth).toBe(9);
  });

  it("edits X/Y/width numerically", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    fireEvent.change(screen.getByTestId("shape-x"), { target: { value: "100" } });
    fireEvent.change(screen.getByTestId("shape-width"), { target: { value: "55" } });
    const r = useProjectStore.getState().shapes[0];
    expect(r.kind === "rectangle" && r.x).toBe(100);
    expect(r.kind === "rectangle" && r.width).toBe(55);
  });

  it("updates the selected shape's operation from the select", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-circle"));
    fireEvent.change(screen.getByTestId("shape-operation"), { target: { value: "pocket" } });
    expect(useProjectStore.getState().shapes[0].operation).toBe("pocket");
  });

  it("removes the selected shape (button and Delete key)", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByText("Remover forma"));
    expect(useProjectStore.getState().shapes).toHaveLength(0);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    fireEvent.keyDown(window, { key: "Delete" });
    expect(useProjectStore.getState().shapes).toHaveLength(0);
  });

  it("duplicates the selected shape", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("duplicate"));
    expect(useProjectStore.getState().shapes).toHaveLength(2);
    expect(useProjectStore.getState().selectedId).toBe(useProjectStore.getState().shapes[1].id);
  });

  it("undo/redo via buttons and keyboard", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("undo"));
    expect(useProjectStore.getState().shapes).toHaveLength(0);
    await userEvent.click(screen.getByTestId("redo"));
    expect(useProjectStore.getState().shapes).toHaveLength(1);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(useProjectStore.getState().shapes).toHaveLength(0);
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(useProjectStore.getState().shapes).toHaveLength(1);
  });

  it("arrow keys nudge the selected shape (Shift = 10 mm)", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    const x0 = (useProjectStore.getState().shapes[0] as { x: number }).x;
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    expect((useProjectStore.getState().shapes[0] as { x: number }).x).toBe(x0 + 11);
  });

  it("updates machine settings (feed rate) and keeps last valid value on empty/zero", () => {
    render(<Toolbar />);
    openSection("cut");
    const feed = screen.getByTestId("cut-feedRate");
    fireEvent.change(feed, { target: { value: "1500" } });
    expect(useProjectStore.getState().settings.feedRate).toBe(1500);
    fireEvent.change(feed, { target: { value: "" } });
    expect(useProjectStore.getState().settings.feedRate).toBe(1500);
    fireEvent.change(feed, { target: { value: "0" } });
    expect(useProjectStore.getState().settings.feedRate).toBe(1500);
  });

  it("warns inline and does not export when there are no shapes", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("export-gcode"));
    expect(screen.getByTestId("notice")).toHaveTextContent("Adicione ao menos uma forma antes de exportar.");
  });

  it("shows validation problems instead of throwing when settings are invalid", async () => {
    useProjectStore.setState({ settings: { ...DEFAULT_MACHINE_SETTINGS, passDepth: 0 } });
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("export-gcode"));
    expect(screen.getByTestId("notice")).toHaveTextContent(/Profundidade por passe/);
  });

  it("triggers a download when exporting with at least one shape", async () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("export-gcode"));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it("saves the project as JSON and opens it back", async () => {
    let saved = "";
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn((blob: Blob) => { void blob.text().then((t) => (saved = t)); return "blob:mock"; }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-circle"));
    await userEvent.click(screen.getByTestId("save-project"));
    await waitFor(() => expect(saved).toContain('"app": "oficina-cnc"'));

    useProjectStore.getState().newProject();
    const file = new File([saved], "p.json", { type: "application/json" });
    await userEvent.upload(screen.getByTestId("json-file-input") as HTMLInputElement, file);
    await waitFor(() => expect(useProjectStore.getState().shapes).toHaveLength(1));
    expect(useProjectStore.getState().shapes[0].kind).toBe("circle");
  });

  it("imports shapes from a valid SVG file", async () => {
    render(<Toolbar />);
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="5" height="5"/></svg>`;
    const file = new File([svgText], "peca.svg", { type: "image/svg+xml" });
    await userEvent.upload(screen.getByTestId("svg-file-input") as HTMLInputElement, file);
    await waitFor(() => expect(useProjectStore.getState().shapes).toHaveLength(1));
  });

  it("shows an inline error when importing an invalid SVG file", async () => {
    render(<Toolbar />);
    const file = new File(["<svg><rect></svg"], "ruim.svg", { type: "image/svg+xml" });
    await userEvent.upload(screen.getByTestId("svg-file-input") as HTMLInputElement, file);
    await waitFor(() => expect(screen.getByTestId("notice")).toHaveTextContent("Não foi possível importar esse arquivo SVG."));
  });

  it("changing the machine preset updates the work area", () => {
    render(<Toolbar />);
    openSection("machine");
    fireEvent.change(screen.getByTestId("machine-preset"), { target: { value: "3018" } });
    expect(useProjectStore.getState().settings.workArea).toEqual({ width: 300, height: 180, zTravel: 45 });
    fireEvent.change(screen.getByTestId("work-width"), { target: { value: "350" } });
    expect(useProjectStore.getState().settings.machinePreset).toBe("custom");
  });

  it("new shapes spawn inside the stock with depth = stock thickness", async () => {
    render(<Toolbar />);
    openSection("stock");
    fireEvent.change(screen.getByTestId("stock-thickness"), { target: { value: "12" } });
    await userEvent.click(screen.getByTestId("add-rectangle"));
    expect(useProjectStore.getState().shapes[0].depth).toBe(12);
  });

  it("lists validation issues in the status bar and blocks export on errors", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    openSection("machine");
    fireEvent.change(screen.getByTestId("machine-preset"), { target: { value: "custom" } });
    fireEvent.change(screen.getByTestId("work-width"), { target: { value: "20" } });
    expect(screen.getByTestId("issues")).toHaveTextContent(/fora da área útil/);
    await userEvent.click(screen.getByTestId("export-gcode"));
    expect(screen.getByTestId("notice")).toHaveTextContent(/fora da área útil/);
    // clicking the issue selects the shape and opens the shape section
    useProjectStore.getState().select(null);
    await userEvent.click(within(screen.getByTestId("issues")).getByText(/Forma 1 está fora/));
    expect(useProjectStore.getState().selectedId).toBe(useProjectStore.getState().shapes[0].id);
    expect(useUiStore.getState().section).toBe("shape");
  });

  it("selecting a material fills cutting params; manual edits survive a material change", async () => {
    render(<Toolbar />);
    openSection("material");
    fireEvent.change(screen.getByTestId("material-select"), { target: { value: "aluminum" } });
    expect(useProjectStore.getState().settings.feedRate).toBe(300);
    expect(screen.getByTestId("material-notes")).toHaveTextContent(/Avançado/);
    openSection("cut");
    fireEvent.change(screen.getByTestId("cut-feedRate"), { target: { value: "450" } });
    expect(screen.getByText("manual")).toBeInTheDocument();
    openSection("material");
    fireEvent.change(screen.getByTestId("material-select"), { target: { value: "mdf" } });
    expect(useProjectStore.getState().settings.feedRate).toBe(450);
    openSection("cut");
    await userEvent.click(screen.getByTestId("restore-preset"));
    expect(useProjectStore.getState().settings.feedRate).toBe(1500);
  });

  it("cut-through checkbox sets depth to thickness + 0.2", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("cut-through"));
    expect(useProjectStore.getState().shapes[0].depth).toBe(18.2);
  });

  it("starts a new project (shapes + default settings) after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    openSection("cut");
    fireEvent.change(screen.getByTestId("cut-feedRate"), { target: { value: "1500" } });
    await userEvent.click(screen.getByTestId("new-project"));
    expect(useProjectStore.getState().shapes).toHaveLength(0);
    expect(useProjectStore.getState().settings.feedRate).toBe(800);
  });

  it("polygon tool toggles from the action bar and with P/Esc", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("tool-polygon"));
    expect(useUiStore.getState().tool).toBe("polygon");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useUiStore.getState().tool).toBe("select");
    fireEvent.keyDown(window, { key: "p" });
    expect(useUiStore.getState().tool).toBe("polygon");
  });
});
