import { describe, it, expect, beforeEach } from "vitest";
import {
  useProjectStore,
  generateShapeId,
  migrateProject,
  PROJECT_STORAGE_KEY,
} from "../store";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { CircleShape, TextShape } from "../../types";
import { readFileSync } from "node:fs";
import { registerFont, _resetFonts } from "../../lib/text";

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

describe("migrateProject v2 → v3", () => {
  it("derives stepover from tool diameter and defaults material to custom", () => {
    const out = migrateProject({ shapes: [], settings: { toolDiameter: 5 } }, 2);
    expect(out.settings.stepover).toBe(3);
    expect(out.settings.material).toBe("custom");
    expect(out.settings.overrides).toEqual({});
  });
});

describe("material / tool / cut-through actions", () => {
  beforeEach(() => useProjectStore.getState().newProject());

  it("setMaterial applies presets, setCutParam marks overrides, force restores", () => {
    const S = useProjectStore.getState;
    S().setMaterial("mdf");
    expect(S().settings.feedRate).toBe(1500);
    S().setCutParam("feedRate", 700);
    expect(S().settings.overrides.feedRate).toBe(true);
    S().setMaterial("pine");
    expect(S().settings.feedRate).toBe(700);
    expect(S().settings.plungeRate).toBe(600);
    S().setMaterial("pine", true);
    expect(S().settings.feedRate).toBe(1800);
    expect(S().settings.overrides).toEqual({});
  });

  it("setToolDiameter re-derives passDepth/stepover for a preset", () => {
    const S = useProjectStore.getState;
    S().setMaterial("mdf");
    S().setToolDiameter(6);
    expect(S().settings.passDepth).toBe(3);
    expect(S().settings.stepover).toBe(3);
  });

  it("cutThrough follows the stock thickness", () => {
    const S = useProjectStore.getState;
    S().addShape(makeCircle("c1"));
    S().setCutThrough("c1", true);
    expect(S().shapes[0].depth).toBe(18.2);
    S().updateStock({ thickness: 12 });
    expect(S().shapes[0].depth).toBe(12.2);
    S().setCutThrough("c1", false);
    expect(S().shapes[0].depth).toBe(12);
    expect(S().shapes[0].cutThrough).toBe(false);
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

describe("navigator & tool library (sprint 11)", () => {
  it("moveShape reorders; tools can be added/updated/removed (clearing toolId)", () => {
    const S = useProjectStore.getState;
    S().newProject();
    S().addShapes([makeCircle("a"), makeCircle("b"), makeCircle("c")]);
    S().moveShape("c", 0);
    expect(S().shapes.map((s) => s.id)).toEqual(["c", "a", "b"]);
    S().moveShape("c", 99);
    expect(S().shapes.map((s) => s.id)).toEqual(["a", "b", "c"]);
    S().addTool({ id: "t", name: "T", type: "flat", diameter: 3, vbitAngle: 90 });
    S().updateTool("t", { diameter: 4 });
    expect(S().settings.tools[0].diameter).toBe(4);
    S().updateShape("a", { toolId: "t" });
    S().removeTool("t");
    expect(S().settings.tools).toEqual([]);
    expect(S().shapes[0].toolId).toBeUndefined();
  });
});

describe("explodeTextShape", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    _resetFonts();
    const buf = readFileSync("public/fonts/Inter-Regular.ttf");
    registerFont("inter", buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  });

  const addText = (over: Partial<TextShape> = {}) => {
    const t: TextShape = {
      id: "t1", kind: "text", x: 20, y: 20, text: "Oi", fontId: "inter", size: 20,
      rotation: 0, align: "left", letterSpacing: 0, depth: 2, operation: "outline", ...over,
    };
    useProjectStore.setState({ shapes: [t], selectedId: t.id, selectedIds: [t.id] });
    return t;
  };

  it("troca o texto pelos contornos, no mesmo lugar da lista", () => {
    const t = addText();
    useProjectStore.setState({ shapes: [{ ...t }, { id: "depois", kind: "circle", x: 0, y: 0, radius: 5, depth: 1, operation: "outline" }] });
    const ids = useProjectStore.getState().explodeTextShape("t1");
    expect(ids.length).toBeGreaterThan(0);
    const shapes = useProjectStore.getState().shapes;
    expect(shapes.some((s) => s.kind === "text")).toBe(false);
    // os contornos entram na posição do texto, antes do círculo que já estava depois dele
    expect(shapes[shapes.length - 1].id).toBe("depois");
    expect(useProjectStore.getState().selectedIds).toEqual(ids);
  });

  it("não explode texto travado nem forma que não é texto", () => {
    addText({ locked: true });
    expect(useProjectStore.getState().explodeTextShape("t1")).toEqual([]);
    useProjectStore.setState({ shapes: [{ id: "c1", kind: "circle", x: 0, y: 0, radius: 5, depth: 1, operation: "outline" }] });
    expect(useProjectStore.getState().explodeTextShape("c1")).toEqual([]);
  });
});
