import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";
import { useProjectStore } from "../../state/store";
import { useUiStore } from "../../state/uiStore";

describe("Sprint 16: extra ops panel, verify dialog", () => {
  beforeEach(() => { useProjectStore.getState().newProject(); useUiStore.setState({ view: "editor" }); });

  it("adds, edits and removes an extra operation from the panel; store keeps depth in sync with the stock when through", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    await userEvent.click(screen.getByTestId("extra-op-add"));
    let s = useProjectStore.getState().shapes[0];
    expect(s.extraOps).toHaveLength(1);
    expect(s.extraOps![0].operation).toBe("pocket");
    fireEvent.change(screen.getByTestId("extra-op-0-operation"), { target: { value: "outline" } });
    fireEvent.change(screen.getByTestId("extra-op-0-side"), { target: { value: "inside" } });
    fireEvent.click(screen.getByTestId("extra-op-0-through"));
    s = useProjectStore.getState().shapes[0];
    expect(s.extraOps![0]).toMatchObject({ operation: "outline", side: "inside", cutThrough: true });
    useProjectStore.getState().updateStock({ thickness: 9 });
    expect(useProjectStore.getState().shapes[0].extraOps![0].depth).toBeCloseTo(9.2);
    // second op suggested as through cut when the main is a pocket
    useProjectStore.getState().updateShape(s.id, { operation: "pocket", depth: 3 });
    await userEvent.click(screen.getByTestId("extra-op-add"));
    expect(useProjectStore.getState().shapes[0].extraOps![1]).toMatchObject({ operation: "outline", side: "outside", cutThrough: true });
    await userEvent.click(screen.getByTestId("extra-op-1-remove"));
    await userEvent.click(screen.getByTestId("extra-op-0-remove"));
    expect(useProjectStore.getState().shapes[0].extraOps).toBeUndefined();
  });

  it("verify dialog renders the report for a pocket", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByTestId("add-rectangle"));
    useProjectStore.getState().updateShape(useProjectStore.getState().shapes[0].id, { operation: "pocket", depth: 3 });
    useUiStore.getState().setView("simulator");
    await waitFor(() => expect(screen.getByTestId("verify")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("verify"));
    await waitFor(() => expect(screen.getByTestId("verify-report")).toBeInTheDocument(), { timeout: 15000 });
    expect(screen.getByTestId("verify-report")).toHaveTextContent("rebaixo");
    expect(screen.getByTestId("verify-gouge")).toHaveTextContent(/mm²/);
  }, 20000);
});
