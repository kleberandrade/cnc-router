import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineDimensions } from "../InlineDimensions";
import { useProjectStore } from "../../state/store";
import type { RectangleShape, CircleShape, RegularPolygonShape, SlotShape } from "../../types";

const rect: RectangleShape = { id: "r", kind: "rectangle", x: 0, y: 0, width: 40, height: 30, rotation: 0, depth: 1, operation: "outline" };

describe("InlineDimensions", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useProjectStore.getState().addShape(rect);
  });

  it("commits width/height on Enter and ignores invalid values", () => {
    render(<InlineDimensions shape={rect} anchorPx={[100, 100]} />);
    fireEvent.change(screen.getByTestId("dim-w"), { target: { value: "55" } });
    fireEvent.keyDown(screen.getByTestId("dim-w"), { key: "Enter" });
    expect((useProjectStore.getState().shapes[0] as RectangleShape).width).toBe(55);
    fireEvent.change(screen.getByTestId("dim-h"), { target: { value: "" } });
    fireEvent.blur(screen.getByTestId("dim-h"));
    expect((useProjectStore.getState().shapes[0] as RectangleShape).height).toBe(30);
  });

  it("shows the right fields per kind", () => {
    const circle: CircleShape = { id: "c", kind: "circle", x: 0, y: 0, radius: 5, depth: 1, operation: "outline" };
    const { unmount } = render(<InlineDimensions shape={circle} anchorPx={[0, 0]} />);
    expect(screen.getByTestId("dim-r")).toBeInTheDocument();
    unmount();
    const ngon: RegularPolygonShape = { id: "n", kind: "ngon", x: 0, y: 0, radius: 5, sides: 6, rotation: 0, depth: 1, operation: "outline" };
    const r2 = render(<InlineDimensions shape={ngon} anchorPx={[0, 0]} />);
    expect(screen.getByTestId("dim-n")).toBeInTheDocument();
    r2.unmount();
    const slot: SlotShape = { id: "s", kind: "slot", x: 0, y: 0, length: 20, width: 5, rotation: 0, depth: 1, operation: "outline" };
    render(<InlineDimensions shape={slot} anchorPx={[0, 0]} />);
    expect(screen.getByTestId("dim-l")).toBeInTheDocument();
  });
});

describe("InlineDimensions keys", () => {
  it("Escape restores the value", () => {
    useProjectStore.getState().newProject();
    useProjectStore.getState().addShape(rect);
    render(<InlineDimensions shape={rect} anchorPx={[0, 0]} />);
    const w = screen.getByTestId("dim-w") as HTMLInputElement;
    fireEvent.change(w, { target: { value: "99" } });
    fireEvent.keyDown(w, { key: "Escape" });
    expect(w.value).toBe("40");
    expect((useProjectStore.getState().shapes[0] as RectangleShape).width).toBe(40);
  });
});
