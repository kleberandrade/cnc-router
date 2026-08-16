import { describe, it, expect } from "vitest";
import { buildShareUrl, readShareHash } from "../share";
import { expandShapes, sourceId } from "../expand";
import { buildToolpath } from "../toolpath";
import { DEFAULT_MACHINE_SETTINGS, type Shape } from "../../types";

describe("share link", () => {
  it("round-trips a project through #p=", () => {
    const shapes: Shape[] = [{ id: "r", kind: "rectangle", x: 1, y: 2, width: 30, height: 20, rotation: 0, depth: 5, operation: "outline", side: "outside", extraOps: [{ id: "o", operation: "pocket", depth: 2 }] }];
    const settings = { ...DEFAULT_MACHINE_SETTINGS, projectName: "Teste" };
    const { url, tooLong } = buildShareUrl(shapes, settings, "https://x.test/");
    expect(url.startsWith("https://x.test/#p=")).toBe(true);
    expect(tooLong).toBe(false);
    const back = readShareHash(url.slice(url.indexOf("#")));
    expect(back?.shapes).toEqual(shapes);
    expect(back?.settings.projectName).toBe("Teste");
    expect(readShareHash("#nope")).toBeNull();
    expect(readShareHash("#p=!!!")).toBeNull();
  });
});

describe("extra operations", () => {
  it("expand creates one virtual shape per extra op, after the main one; sourceId maps back", () => {
    const s: Shape = { id: "a", kind: "rectangle", x: 0, y: 0, width: 40, height: 30, rotation: 0, depth: 12, operation: "outline", side: "outside", extraOps: [{ id: "o1", operation: "pocket", depth: 3 }, { id: "o2", operation: "outline", depth: 1, side: "on" }] };
    const ex = expandShapes([s]);
    expect(ex.map((x) => x.id)).toEqual(["a", "a~0", "a~1"]);
    expect(ex[1].operation).toBe("pocket");
    expect(ex[1].depth).toBe(3);
    expect(ex[2].side).toBe("on");
    expect(sourceId("a~1")).toBe("a");
    expect(sourceId("t#2~0")).toBe("t");
    const tp = buildToolpath([s], { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 4 });
    const ops = new Set(tp.segments.filter((g) => g.shapeId).map((g) => `${g.shapeId}:${g.op}`));
    expect(ops.has("a~0:pocket")).toBe(true);
    expect(ops.has("a:outline")).toBe(true);
  });
});
