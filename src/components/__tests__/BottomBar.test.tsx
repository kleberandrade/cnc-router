import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomBar } from "../BottomBar";
import { BottomSheet } from "../BottomSheet";
import { useProjectStore } from "../../state/store";
import { useUiStore } from "../../state/uiStore";
import { useSimStore } from "../../state/simStore";

describe("BottomBar / BottomSheet (mobile)", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useUiStore.setState({ view: "editor", sheetOpen: false, sheetExpanded: false, tool: "select", draft: [] });
    useSimStore.getState().configure(0, []);
  });

  it("adds shapes and toggles the settings sheet", () => {
    render(<><BottomBar /><BottomSheet><div data-testid="sheet-content">x</div></BottomSheet></>);
    fireEvent.click(screen.getByTestId("mb-add-rectangle"));
    expect(useProjectStore.getState().shapes).toHaveLength(1);
    fireEvent.click(screen.getByTestId("mb-settings"));
    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("sheet-handle"));
    expect(useUiStore.getState().sheetExpanded).toBe(true);
    fireEvent.click(screen.getByTestId("sheet-close"));
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });

  it("shows transport in the simulator view", () => {
    useUiStore.setState({ view: "simulator" });
    useSimStore.getState().configure(10, [10]);
    render(<BottomBar />);
    fireEvent.click(screen.getByTestId("mb-simulate-toggle"));
    expect(useSimStore.getState().playing).toBe(true);
  });

  it("polygon tool shows the close button", () => {
    useUiStore.setState({ tool: "polygon", draft: [[0, 0], [1, 0], [1, 1]] });
    render(<BottomBar />);
    expect(screen.getByTestId("mb-close-polygon")).toHaveAttribute("aria-label", "Fechar polígono");
  });
});
