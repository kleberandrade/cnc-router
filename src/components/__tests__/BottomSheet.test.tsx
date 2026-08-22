import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomSheet } from "../BottomSheet";
import { useUiStore } from "../../state/uiStore";

const swipe = (el: HTMLElement, fromY: number, toY: number) => {
  fireEvent.touchStart(el, { touches: [{ clientY: fromY }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientY: toY }] });
};

describe("BottomSheet (mobile)", () => {
  beforeEach(() => useUiStore.setState({ sheetOpen: true, sheetExpanded: false }));

  it("fechado não renderiza; aberto mostra o conteúdo", () => {
    useUiStore.setState({ sheetOpen: false });
    const { rerender } = render(<BottomSheet>conteudo</BottomSheet>);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
    useUiStore.setState({ sheetOpen: true });
    rerender(<BottomSheet>conteudo</BottomSheet>);
    expect(screen.getByTestId("bottom-sheet")).toHaveTextContent("conteudo");
  });

  it("arrastar para cima expande; para baixo reduz e depois fecha", () => {
    render(<BottomSheet>x</BottomSheet>);
    const row = screen.getByTestId("sheet-handle").parentElement as HTMLElement;
    swipe(row, 300, 200); // para cima
    expect(useUiStore.getState().sheetExpanded).toBe(true);
    swipe(row, 200, 300); // para baixo: reduz
    expect(useUiStore.getState().sheetExpanded).toBe(false);
    swipe(row, 200, 300); // para baixo de novo: fecha
    expect(useUiStore.getState().sheetOpen).toBe(false);
  });

  it("arrasto curto não muda nada; Esc e o backdrop fecham", () => {
    render(<BottomSheet>x</BottomSheet>);
    const row = screen.getByTestId("sheet-handle").parentElement as HTMLElement;
    swipe(row, 200, 210); // < 40 px
    expect(useUiStore.getState().sheetOpen).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useUiStore.getState().sheetOpen).toBe(false);

    useUiStore.setState({ sheetOpen: true });
    render(<BottomSheet>y</BottomSheet>);
    fireEvent.click(document.querySelector(".sheet-backdrop") as HTMLElement);
    expect(useUiStore.getState().sheetOpen).toBe(false);
  });
});
