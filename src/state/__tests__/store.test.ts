import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, generateShapeId } from "../store";
import type { CircleShape } from "../../types";

const makeCircle = (id: string): CircleShape => ({
  id,
  kind: "circle",
  x: 0,
  y: 0,
  radius: 5,
  depth: 2,
  operation: "outline",
});

describe("generateShapeId", () => {
  it("produces unique ids on successive calls", () => {
    const a = generateShapeId("c");
    const b = generateShapeId("c");
    expect(a).not.toBe(b);
  });
});

describe("useProjectStore", () => {
  beforeEach(() => {
    useProjectStore.getState().clear();
  });

  it("starts with no shapes and no selection", () => {
    const state = useProjectStore.getState();
    expect(state.shapes).toEqual([]);
    expect(state.selectedId).toBeNull();
  });

  it("adds a shape and selects it", () => {
    const shape = makeCircle("c1");
    useProjectStore.getState().addShape(shape);
    const state = useProjectStore.getState();
    expect(state.shapes).toHaveLength(1);
    expect(state.selectedId).toBe("c1");
  });

  it("adds multiple shapes without changing selection", () => {
    useProjectStore.getState().addShapes([makeCircle("c1"), makeCircle("c2")]);
    expect(useProjectStore.getState().shapes).toHaveLength(2);
    expect(useProjectStore.getState().selectedId).toBeNull();
  });

  it("updates a shape by id", () => {
    useProjectStore.getState().addShape(makeCircle("c1"));
    useProjectStore.getState().updateShape("c1", { radius: 9 });
    const shape = useProjectStore.getState().shapes[0] as CircleShape;
    expect(shape.radius).toBe(9);
  });

  it("removes a shape and clears selection if it was selected", () => {
    useProjectStore.getState().addShape(makeCircle("c1"));
    useProjectStore.getState().removeShape("c1");
    const state = useProjectStore.getState();
    expect(state.shapes).toHaveLength(0);
    expect(state.selectedId).toBeNull();
  });

  it("updates machine settings partially", () => {
    useProjectStore.getState().updateSettings({ feedRate: 1234 });
    expect(useProjectStore.getState().settings.feedRate).toBe(1234);
  });

  it("clears all shapes and selection", () => {
    useProjectStore.getState().addShape(makeCircle("c1"));
    useProjectStore.getState().clear();
    expect(useProjectStore.getState().shapes).toEqual([]);
    expect(useProjectStore.getState().selectedId).toBeNull();
  });
});
