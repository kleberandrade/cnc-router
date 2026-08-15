import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TopBar } from "../TopBar";
import { useUiStore } from "../../state/uiStore";
import { useSimStore } from "../../state/simStore";

describe("TopBar", () => {
  beforeEach(() => {
    useUiStore.setState({ view: "editor", simCamera: null });
    useSimStore.getState().configure(0, []);
  });

  it("updates the document title when switching views", () => {
    render(<TopBar />);
    expect(document.title).toBe("Desenhar — Oficina CNC");
    fireEvent.click(screen.getByTestId("tab-simulator"));
    expect(document.title).toBe("Simular — Oficina CNC");
  });

  it("shows drawing groups in the editor view and transport in the simulator view", () => {
    render(<TopBar />);
    expect(screen.getByTestId("add-rectangle")).toBeInTheDocument();
    expect(screen.queryByTestId("simulate-toggle")).toBeNull();
    fireEvent.click(screen.getByTestId("tab-simulator"));
    expect(useUiStore.getState().view).toBe("simulator");
    expect(screen.getByTestId("simulate-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("add-rectangle")).toBeNull();
  });

  it("simulator transport is disabled without a toolpath and enabled with one", () => {
    useUiStore.setState({ view: "simulator" });
    render(<TopBar />);
    expect(screen.getByTestId("simulate-toggle")).toBeDisabled();
    act(() => useSimStore.getState().configure(10, [10]));
    expect(screen.getByTestId("simulate-toggle")).toBeEnabled();
    fireEvent.click(screen.getByTestId("simulate-toggle"));
    expect(useSimStore.getState().playing).toBe(true);
    expect(screen.getByTestId("simulate-toggle")).toHaveTextContent("Pausar simulação");
  });

  it("camera buttons call the registered simulator actions", () => {
    let fitCalls = 0;
    useUiStore.setState({ view: "simulator", simCamera: { fit: () => fitCalls++, top: () => {}, iso: () => {} } });
    render(<TopBar />);
    fireEvent.click(screen.getByTestId("sim-fit"));
    expect(fitCalls).toBe(1);
  });

  it("project menu opens and lists actions", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByTestId("project-menu"));
    expect(screen.getByTestId("project-menu-list")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("menu-about"));
    expect(screen.getByTestId("dialog")).toHaveTextContent("Oficina CNC");
  });
});
