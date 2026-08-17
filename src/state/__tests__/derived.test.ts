import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "../store";
import { useDerivedStore, startDerived, _recomputeDerivedNow } from "../derived";
import { computeDerived, projectHash } from "../../lib/derivedCompute";
import { DEFAULT_MACHINE_SETTINGS } from "../../types";

describe("derived store (sprint 27)", () => {
  beforeEach(() => { useProjectStore.getState().newProject(); startDerived(); _recomputeDerivedNow(); });

  it("sem Worker (testes) calcula em modo síncrono e acompanha o projeto", () => {
    expect(useDerivedStore.getState().status).toBe("ready");
    expect(useDerivedStore.getState().segments).toEqual([]);
    useProjectStore.getState().addShape({ id: "r", kind: "rectangle", x: 10, y: 10, width: 40, height: 30, rotation: 0, depth: 3, operation: "pocket" });
    const d = useDerivedStore.getState();
    expect(d.status).toBe("ready");
    expect(d.segments.length).toBeGreaterThan(0);
    expect(d.time).toBeGreaterThan(0);
    expect(d.hash).toBe(projectHash(useProjectStore.getState().shapes, useProjectStore.getState().settings, "0"));
  });

  it("computeDerived: erro de validação não derruba o percurso; projeto vazio → tudo zerado", () => {
    const empty = computeDerived([], DEFAULT_MACHINE_SETTINGS);
    expect(empty).toMatchObject({ segments: [], time: 0, shapeCount: 0 });
    const d = computeDerived([{ id: "c", kind: "circle", x: 50, y: 50, radius: 10, depth: 3, operation: "pocket" }], DEFAULT_MACHINE_SETTINGS);
    expect(d.segments.length).toBeGreaterThan(0);
    expect(d.issues.length).toBe(0);
  });

  it("projectHash muda com o projeto e é estável", () => {
    const a = projectHash([], DEFAULT_MACHINE_SETTINGS), b = projectHash([], DEFAULT_MACHINE_SETTINGS);
    expect(a).toBe(b);
    expect(projectHash([], { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 4 })).not.toBe(a);
  });
});
