import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TopBar } from "../TopBar";
import { Toolbar } from "../Toolbar";
import userEvent from "@testing-library/user-event";
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

describe("Sobre / Novidades / versão (sprint 19)", () => {
  it("shows the version in the project menu, the status bar and the About dialog with author and contact", async () => {
    render(<Toolbar />);
    expect(screen.getByTestId("status-version")).toHaveTextContent(/^v\d+\.\d+\.\d+/);
    await userEvent.click(screen.getByTestId("project-menu"));
    expect(screen.getByTestId("menu-version")).toHaveTextContent(/Oficina CNC v\d+/);
    await userEvent.click(screen.getByTestId("menu-about"));
    expect(screen.getByTestId("about")).toHaveTextContent("Kleber Andrade");
    expect(screen.getByTestId("about")).toHaveTextContent("pdjkleber@gmail.com");
    expect(screen.getByTestId("about-version")).toHaveTextContent(/^v\d+\.\d+\.\d+ \(/);
  });
  it("Novidades badge appears when the stored version differs and disappears after opening", async () => {
    localStorage.setItem("oficina-cnc:seen-version", "0.0.1");
    render(<Toolbar />);
    expect(screen.getByTestId("news-dot")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("project-menu"));
    await userEvent.click(screen.getByTestId("menu-news"));
    expect(screen.getByTestId("news")).toBeInTheDocument();
    expect(localStorage.getItem("oficina-cnc:seen-version")).not.toBe("0.0.1");
    expect(screen.queryByTestId("news-dot")).toBeNull();
    localStorage.removeItem("oficina-cnc:seen-version");
  });
});

describe("Fusion top bar (sprint 22)", () => {
  it("tabs switch groups; usinagem mirrors the selected shape; project name updates the title", async () => {
    const { useProjectStore } = await import("../../state/store");
    useProjectStore.getState().newProject();
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("ribbon-tab-usinagem"));
    expect(screen.getByTestId("op-outline")).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByTestId("op-pocket"));
    expect(useProjectStore.getState().shapes[0].operation).toBe("pocket");
    await userEvent.click(screen.getByTestId("op-outline"));
    await userEvent.click(screen.getByTestId("side-on"));
    expect(useProjectStore.getState().shapes[0].side).toBe("on");
    await userEvent.click(screen.getByTestId("tabs-toggle"));
    expect(useProjectStore.getState().shapes[0].tabs).toBeTruthy();
    await userEvent.click(screen.getByTestId("helix-toggle"));
    expect(useProjectStore.getState().settings.helixEntry).toBe(true);
    await userEvent.click(screen.getByTestId("order-toggle"));
    expect(useProjectStore.getState().settings.orderMode).toBe("manual");
    await userEvent.click(screen.getByTestId("goto-post"));
    expect(useUiStore.getState().section).toBe("post");
    await userEvent.click(screen.getByTestId("ribbon-tab-vista"));
    await userEvent.click(screen.getByTestId("theme-toggle"));
    expect(["dark", "light"]).toContain(useUiStore.getState().theme);
    await userEvent.click(screen.getByTestId("select-all"));
    expect(useProjectStore.getState().selectedIds.length).toBe(1);
    // minimize / restore
    await userEvent.click(screen.getByTestId("ribbon-minimize"));
    expect(useUiStore.getState().ribbonMinimized).toBe(true);
    await userEvent.click(screen.getByTestId("ribbon-tab-formas"));
    expect(useUiStore.getState().ribbonMinimized).toBe(false);
    // project name
    const name = screen.getByTestId("project-name") as HTMLInputElement;
    await userEvent.click(name);
    await userEvent.type(name, "Minha peça");
    fireEvent.blur(name);
    expect(useProjectStore.getState().settings.projectName).toBe("Minha peça");
    expect(document.title).toBe("Minha peça — Oficina CNC");
    // app bar undo
    await userEvent.click(screen.getByTestId("appbar-undo"));
    expect(screen.getByTestId("appbar-redo")).toBeEnabled();
    useProjectStore.getState().newProject();
  });
});
