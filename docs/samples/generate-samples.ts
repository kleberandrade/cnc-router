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

// Sprint 14: same part in the three post-processors (+ inches for LinuxCNC), drill + helix.
const s14 = { ...DEFAULT_MACHINE_SETTINGS, toolDiameter: 6, passDepth: 3, stepover: 3, helixEntry: true, peckDepth: 4, tools: [{ id: "t3", name: "Fresa 3mm", type: "flat" as const, diameter: 3, vbitAngle: 90 }] };
const part14: Shape[] = [
  { id: "pocket", kind: "rectangle", x: 30, y: 30, width: 50, height: 30, rotation: 0, depth: 6, operation: "pocket" },
  { id: "hole", kind: "circle", x: 100, y: 45, radius: 1.5, depth: 18.2, operation: "drill", toolId: "t3" },
  { id: "part", kind: "rectangle", x: 20, y: 20, width: 100, height: 60, rotation: 0, depth: 18.2, operation: "outline", side: "outside", tabs: { count: 4, width: 8, height: 3 } },
];
writeFileSync("docs/samples/sprint14-grbl.gcode", generateGCode(part14, { ...s14, post: "grbl" }));
writeFileSync("docs/samples/sprint14-marlin.gcode", generateGCode(part14, { ...s14, post: "marlin" }));
writeFileSync("docs/samples/sprint14-linuxcnc.ngc", generateGCode(part14, { ...s14, post: "linuxcnc" }));
writeFileSync("docs/samples/sprint14-linuxcnc-inch.ngc", generateGCode(part14, { ...s14, post: "linuxcnc", exportUnits: "inch" }));
