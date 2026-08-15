import { describe, it, expect, beforeEach } from "vitest";
import {
  useProjectStore,
  generateShapeId,
  migrateProject,
  PROJECT_STORAGE_KEY,
} from "../store";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
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

describe("migrateProject", () => {
  it("falls back to defaults for empty/invalid persisted data", () => {
    expect(migrateProject(undefined, 0)).toEqual({ shapes: [], settings: DEFAULT_MACHINE_SETTINGS });
    expect(migrateProject({ shapes: "nope" }, 0).shapes).toEqual([]);
  });

  it("fills missing settings keys with defaults", () => {
    const out = migrateProject({ shapes: [], settings: { feedRate: 999 } }, 0);
    expect(out.settings.feedRate).toBe(999);
    expect(out.settings.passDepth).toBe(DEFAULT_MACHINE_SETTINGS.passDepth);
  });
});

describe("migrateProject v1 → v2", () => {
  it("adds workArea/stock defaults and derives machinePreset", () => {
    const out = migrateProject({ shapes: [], settings: { feedRate: 999 } }, 1);
    expect(out.settings.workArea).toEqual(DEFAULT_MACHINE_SETTINGS.workArea);
    expect(out.settings.stock).toEqual(DEFAULT_MACHINE_SETTINGS.stock);
    expect(out.settings.machinePreset).toBe("6040");
    expect(out.settings.feedRate).toBe(999);
  });
});

describe("work area / stock actions", () => {
  it("setWorkArea marks preset as custom when it matches none", () => {
    useProjectStore.getState().setWorkArea({ width: 333 });
    expect(useProjectStore.getState().settings.machinePreset).toBe("custom");
    useProjectStore.getState().setWorkArea({ width: 300, height: 180, zTravel: 45 });
    expect(useProjectStore.getState().settings.machinePreset).toBe("3018");
  });
  it("updateStock patches the stock", () => {
    useProjectStore.getState().updateStock({ thickness: 12, origin: "center" });
    expect(useProjectStore.getState().settings.stock.thickness).toBe(12);
    expect(useProjectStore.getState().settings.stock.origin).toBe("center");
    useProjectStore.getState().newProject();
  });
});

describe("persistence", () => {
  it("writes shapes and settings to localStorage", () => {
    useProjectStore.getState().clear();
    useProjectStore.getState().addShape(makeCircle("persist-1"));
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.shapes[0].id).toBe("persist-1");
    expect(parsed.state.selectedId).toBeUndefined();
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

  it("newProject clears shapes and resets settings", () => {
    useProjectStore.getState().addShape(makeCircle("c1"));
    useProjectStore.getState().updateSettings({ feedRate: 1 });
    useProjectStore.getState().newProject();
    expect(useProjectStore.getState().shapes).toEqual([]);
    expect(useProjectStore.getState().settings).toEqual(DEFAULT_MACHINE_SETTINGS);
  });

  it("clears all shapes and selection", () => {
    useProjectStore.getState().addShape(makeCircle("c1"));
    useProjectStore.getState().clear();
    expect(useProjectStore.getState().shapes).toEqual([]);
    expect(useProjectStore.getState().selectedId).toBeNull();
  });
});
