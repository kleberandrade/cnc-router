import { describe, it, expect } from "vitest";
import { serializeProject, parseProject } from "../projectFile";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";
import type { CircleShape } from "../../types";

const c: CircleShape = { id: "c", kind: "circle", x: 1, y: 2, radius: 3, depth: 4, operation: "outline" };

describe("project file", () => {
  it("round-trips shapes and settings", () => {
    const text = serializeProject([c], { ...DEFAULT_MACHINE_SETTINGS, feedRate: 777 }, new Date("2026-01-01"));
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe("oficina-cnc");
    expect(parsed.savedAt).toBe("2026-01-01T00:00:00.000Z");
    const back = parseProject(text);
    expect(back.shapes).toEqual([c]);
    expect(back.settings.feedRate).toBe(777);
  });
  it("migrates old versions (fills new settings)", () => {
    const back = parseProject(JSON.stringify({ app: "oficina-cnc", version: 1, shapes: [], settings: { feedRate: 5 } }));
    expect(back.settings.workArea).toEqual(DEFAULT_MACHINE_SETTINGS.workArea);
    expect(back.settings.material).toBe("custom");
  });
  it("rejects garbage", () => {
    expect(() => parseProject("nope")).toThrow(/JSON/);
    expect(() => parseProject('{"foo":1}')).toThrow(/Oficina CNC/);
  });
});
