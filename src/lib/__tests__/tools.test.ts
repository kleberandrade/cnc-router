import { describe, it, expect } from "vitest";
import { toolForShape, toolsInUse, defaultTool, settingsForTool } from "../tools";
import { buildToolpath } from "../toolpath";
import { generateGCode } from "../gcode";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { RectangleShape, MachineSettings } from "../../types";

const settings: MachineSettings = {
  ...DEFAULT_MACHINE_SETTINGS,
  toolDiameter: 6, stepover: 3,
  tools: [
    { id: "t1", name: "Fresa 3mm", type: "flat", diameter: 3, vbitAngle: 90, feedRate: 600 },
    { id: "v", name: "V 60°", type: "vbit", diameter: 12, vbitAngle: 60 },
  ],
};
const rect = (id: string, x: number, toolId?: string, extra: Partial<RectangleShape> = {}): RectangleShape => ({
  id, kind: "rectangle", x, y: 10, width: 20, height: 20, rotation: 0, depth: 3, operation: "outline", toolId, ...extra,
});

describe("tools", () => {
  it("resolves the effective tool and falls back to the default", () => {
    expect(toolForShape(rect("a", 0), settings).id).toBeUndefined();
    expect(toolForShape(rect("a", 0, "t1"), settings)).toMatchObject({ id: "t1", diameter: 3, feedRate: 600, stepover: 1.5 });
    expect(toolForShape(rect("a", 0, "missing"), settings).id).toBeUndefined();
    expect(defaultTool(settings).diameter).toBe(6);
    expect(settingsForTool(settings, toolForShape(rect("a", 0, "t1"), settings)).toolDiameter).toBe(3);
  });

  it("toolsInUse lists default first then library order, ignoring hidden shapes", () => {
    const list = toolsInUse([rect("a", 0, "v"), rect("b", 30), rect("c", 60, "t1", { hidden: true })], settings);
    expect(list.map((t) => t.id)).toEqual([undefined, "v"]);
  });

  it("toolpath groups shapes by tool with a toolchange segment and G-code emits M0", () => {
    const shapes = [rect("a", 0, "t1"), rect("b", 40), rect("c", 80, "t1")];
    const tp = buildToolpath(shapes, settings);
    const changes = tp.segments.filter((s) => s.type === "toolchange");
    expect(changes).toHaveLength(1);
    expect(changes[0].tool?.name).toBe("Fresa 3mm");
    // default-tool shape (b) is machined before the t1 shapes
    const firstIds = tp.segments.filter((s) => s.shapeId).map((s) => s.shapeId);
    expect(firstIds[0]).toBe("b");
    expect(firstIds.indexOf("a")).toBeGreaterThan(firstIds.lastIndexOf("b"));
    // t1 segments carry toolId and use the tool's feed
    const aFeed = tp.segments.find((s) => s.shapeId === "a" && s.type === "feed");
    expect(aFeed?.toolId).toBe("t1");
    expect(aFeed?.feed).toBe(600);
    const g = generateGCode(shapes, settings);
    expect(g).toContain("M0 ; TROCA DE FERRAMENTA: Fresa 3mm (Ø3 mm)");
    expect(g).toContain("; ferramentas: Padrão Ø6 Ø6 | Fresa 3mm Ø3 — trocas com M0");
  });

  it("hidden shapes are excluded from the toolpath", () => {
    const tp = buildToolpath([rect("a", 0, undefined, { hidden: true }), rect("b", 40)], settings);
    expect(tp.shapeCount).toBe(1);
    expect(tp.segments.some((s) => s.shapeId === "a")).toBe(false);
  });
});
