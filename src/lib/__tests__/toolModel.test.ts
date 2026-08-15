import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { buildToolModel } from "../toolModel";

describe("buildToolModel", () => {
  it("builds flat, ball and V tools with the tip at the origin and disposes cleanly", () => {
    for (const type of ["flat", "ball", "vbit"] as const) {
      const g = buildToolModel({ type, diameter: 6, vbitAngle: 90 });
      const box = new THREE.Box3().setFromObject(g);
      expect(box.min.z).toBeGreaterThanOrEqual(-1e-6);
      expect(box.max.z).toBeGreaterThan(50); // spindle body above
      expect(box.max.x - box.min.x).toBeGreaterThanOrEqual(6 - 1e-6); // at least the tool diameter (spindle is wider)
      (g.userData.dispose as () => void)();
    }
  });
  it("V tool tip is a cone whose height matches the angle", () => {
    const g = buildToolModel({ type: "vbit", diameter: 6, vbitAngle: 90 });
    const cone = g.children[0] as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(cone);
    expect(box.max.z - box.min.z).toBeCloseTo(3, 1); // r / tan(45°)
  });
});
