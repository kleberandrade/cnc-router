// Regenerate: npx tsx docs/samples/generate-samples.ts
import { writeFileSync } from "node:fs";
import { generateGCode } from "../../src/lib/gcode";
import { DEFAULT_MACHINE_SETTINGS } from "../../src/types";
import type { Shape } from "../../src/types";

const legacy: Shape[] = [
  { id: "r1", kind: "rectangle", x: 20, y: 20, width: 40, height: 30, rotation: 0, depth: 5, operation: "outline" },
  { id: "c1", kind: "circle", x: 100, y: 60, radius: 15, depth: 3, operation: "pocket" },
  { id: "p1", kind: "path", points: [[10, 100], [50, 100], [30, 130]], closed: true, depth: 2, operation: "outline" },
];
writeFileSync("docs/samples/baseline-v1.gcode", generateGCode(legacy, DEFAULT_MACHINE_SETTINGS));

const s6 = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 6, passDepth: 6, stepover: 3, rampAngle: 5 };
const compensated: Shape[] = [
  { id: "part", kind: "rectangle", x: 20, y: 20, width: 80, height: 60, rotation: 0, depth: 18.2, operation: "outline", side: "outside", tabs: { count: 4, width: 8, height: 3 } },
  { id: "hole", kind: "circle", x: 60, y: 50, radius: 10, depth: 18.2, operation: "outline", side: "inside" },
  { id: "pocket", kind: "rectangle", x: 30, y: 30, width: 20, height: 15, rotation: 0, depth: 6, operation: "pocket" },
];
writeFileSync("docs/samples/sprint06-compensacao-tabs-rampa.gcode", generateGCode(compensated, s6));
console.log("ok");
