import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Navigator } from "../Navigator";
import { ToolLibrary } from "../ToolLibrary";
import { useProjectStore } from "../../state/store";
import type { RectangleShape, CircleShape } from "../../types";

const rect: RectangleShape = { id: "r", kind: "rectangle", x: 0, y: 0, width: 10, height: 10, rotation: 0, depth: 1, operation: "outline" };
const circle: CircleShape = { id: "c", kind: "circle", x: 50, y: 50, radius: 5, depth: 1, operation: "outline" };
const S = useProjectStore.getState;

describe("Navigator", () => {
  beforeEach(() => {
    S().newProject();
    S().addShapes([rect, circle]);
  });

  it("lists shapes with automatic names, selects, hides, locks, reorders and renames", () => {
    render(<Navigator />);
    expect(screen.getByTestId("nav-item-0")).toHaveTextContent("Retângulo 1");
    expect(screen.getByTestId("nav-item-1")).toHaveTextContent("Círculo 2");
    fireEvent.click(screen.getByTestId("nav-item-1"));
    expect(S().selectedId).toBe("c");
    fireEvent.click(screen.getByTestId("nav-item-0"), { shiftKey: true });
    expect(S().selectedIds).toEqual(["c", "r"]);
    fireEvent.click(screen.getByTestId("nav-eye-0"));
    expect(S().shapes[0].hidden).toBe(true);
    fireEvent.click(screen.getByTestId("nav-lock-0"));
    expect(S().shapes[0].locked).toBe(true);
    fireEvent.click(screen.getByTestId("nav-down-0"));
    expect(S().shapes.map((s) => s.id)).toEqual(["c", "r"]);
    fireEvent.click(screen.getByTestId("nav-up-1"));
    expect(S().shapes.map((s) => s.id)).toEqual(["r", "c"]);
    // rename via double click
    fireEvent.doubleClick(screen.getByText("Retângulo 1"));
    const input = screen.getByTestId("nav-rename") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Tampa" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    expect(S().shapes[0].name).toBe("Tampa");
    // search
    fireEvent.change(screen.getByTestId("nav-search"), { target: { value: "círc" } });
    expect(screen.queryByText("Tampa")).toBeNull();
    expect(screen.getByText("Círculo 2")).toBeInTheDocument();
  });

  it("drag & drop reorders", () => {
    render(<Navigator />);
    const a = screen.getByTestId("nav-item-0"), b = screen.getByTestId("nav-item-1");
    fireEvent.dragStart(a);
    fireEvent.dragOver(b);
    fireEvent.drop(b);
    fireEvent.dragEnd(a);
    expect(S().shapes.map((s) => s.id)).toEqual(["c", "r"]);
  });
});

describe("ToolLibrary", () => {
  beforeEach(() => S().newProject());
  it("adds, edits and removes tools", () => {
    render(<ToolLibrary />);
    fireEvent.click(screen.getByTestId("tool-add"));
    const id = S().settings.tools[0].id;
    fireEvent.change(screen.getByTestId(`tool-name-${id}`), { target: { value: "V-bit" } });
    fireEvent.change(screen.getByTestId(`tool-diameter-${id}`), { target: { value: "8" } });
    expect(S().settings.tools[0]).toMatchObject({ name: "V-bit", diameter: 8 });
    fireEvent.click(screen.getByTestId(`tool-remove-${id}`));
    expect(S().settings.tools).toEqual([]);
  });
});
