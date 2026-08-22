import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DrawingWorkspace } from "../DrawingWorkspace";
import { useProjectStore } from "../../state/store";
import { _recomputeDerivedNow } from "../../state/derived";
import { useSheetsStore, buildSheetsNow, sheetsDocument, printSheets } from "../../state/sheets";
import { standaloneSvg } from "../../lib/sheet";
import type { RectangleShape } from "../../types";

const rect = (id: string, x = 10): RectangleShape => ({
  id, kind: "rectangle", x, y: 10, width: 60, height: 40, rotation: 0, depth: 4, operation: "outline", side: "outside",
});

const resetSheets = () => useSheetsStore.setState({ pages: [], current: 0, status: "idle", hash: "", withSetup: true, scope: "all", scale: "auto" });

describe("estação Folha técnica", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useProjectStore.setState({ shapes: [rect("a"), rect("b", 90)], selectedId: "a", selectedIds: ["a"] });
    useProjectStore.getState().updateSettings({ projectName: "Bancada" });
    _recomputeDerivedNow();
    resetSheets();
  });

  it("monta folha de oficina + um desenho por peça, e troca a página pela miniatura", () => {
    render(<DrawingWorkspace />);
    expect(screen.getAllByTestId(/sheet-thumb-/)).toHaveLength(3);
    expect(screen.getByTestId("drawing-page").textContent).toContain("Bancada"); // página 0 = folha de oficina
    fireEvent.click(screen.getByTestId("sheet-thumb-1"));
    expect(useSheetsStore.getState().current).toBe(1);
    expect(screen.getByTestId("drawing-page").innerHTML).toContain("titleblock");
  });

  it("opções da ribbon mudam as páginas: sem folha de oficina, só a selecionada, 1:1", () => {
    render(<DrawingWorkspace />);
    useSheetsStore.getState().setWithSetup(false);
    expect(useSheetsStore.getState().pages).toHaveLength(2);
    useSheetsStore.getState().setScope("selected");
    expect(useSheetsStore.getState().pages).toHaveLength(1);
    useSheetsStore.getState().setScale("1:1");
    expect(useSheetsStore.getState().pages[0].html).toContain("esc. 1:1");
  });

  it("projeto vazio mostra o recado, sem montar nada", () => {
    useProjectStore.getState().newProject();
    render(<DrawingWorkspace />);
    expect(screen.getByTestId("drawing-empty")).toBeInTheDocument();
  });

  it("a estação mostra exatamente o que sai na impressão (mesma lib)", () => {
    render(<DrawingWorkspace />);
    const printed = sheetsDocument(buildSheetsNow("22/08/2026"));
    const onScreen = useSheetsStore.getState().pages;
    // o doc impresso contém o HTML de cada página exibida (datas podem diferir; compara com data fixa)
    const rebuilt = buildSheetsNow("22/08/2026");
    expect(rebuilt.map((p) => p.title)).toEqual(onScreen.map((p) => p.title));
    for (const p of rebuilt) expect(printed).toContain(p.html);
  });

  it("SVG baixável é bem-formado: xml, xmlns, viewBox em mm e estilos embutidos", () => {
    const pages = buildSheetsNow("22/08/2026");
    const drawing = pages.find((p) => p.svg);
    expect(drawing).toBeTruthy();
    const file = standaloneSvg(drawing!)!;
    expect(file.startsWith(`<?xml version="1.0"`)).toBe(true);
    expect(file).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(file).toContain('viewBox="0 0 210 297"');
    expect(file).toContain('width="210mm"');
    expect(file).toContain("<style>");
    expect(standaloneSvg(pages[0])).toBeNull(); // folha de oficina não é um SVG único
  });

  it("printSheets cria o iframe, imprime e não depende do tema do app", () => {
    const print = vi.fn(); const focus = vi.fn();
    const pages = buildSheetsNow("22/08/2026");
    printSheets(pages);
    const frame = document.querySelector('iframe[data-testid="print-frame"]') as HTMLIFrameElement;
    expect(frame).toBeTruthy();
    expect(frame.srcdoc).toContain("@page { size: A4; margin: 0; }");
    Object.defineProperty(frame, "contentWindow", { value: { print, focus }, configurable: true });
    frame.onload?.(new Event("load"));
    expect(print).toHaveBeenCalled();
    frame.remove();
  });
});
