import { describe, it, expect } from "vitest";
import { buildSimulationPath } from "../Simulator";
import type { RectangleShape, PathShape } from "../../types";

describe("buildSimulationPath", () => {
  const rect: RectangleShape = {
    id: "r1",
    kind: "rectangle",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    depth: 4,
    operation: "outline",
  };

  it("returns an empty path for no shapes", () => {
    expect(buildSimulationPath([], 5)).toEqual([]);
  });

  it("starts at safe height above the shape's first point", () => {
    const path = buildSimulationPath([rect], 5);
    expect(path[0]).toEqual([0, 0, 5]);
  });

  it("plunges to the negative cut depth before tracing the outline", () => {
    const path = buildSimulationPath([rect], 5);
    expect(path[1]).toEqual([0, 0, -4]);
  });

  it("ends back at safe height", () => {
    const path = buildSimulationPath([rect], 5);
    expect(path[path.length - 1][2]).toBe(5);
  });

  it("skips shapes with no resolvable points", () => {
    const empty: PathShape = {
      id: "p-empty",
      kind: "path",
      points: [],
      closed: false,
      depth: 3,
      operation: "outline",
    };
    expect(buildSimulationPath([empty], 5)).toEqual([]);
  });
});
