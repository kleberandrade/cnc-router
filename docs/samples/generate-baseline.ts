import { generateGCode } from "../../src/lib/gcode";
import { DEFAULT_MACHINE_SETTINGS } from "../../src/types";
const shapes = [
  { id: "r1", kind: "rectangle", x: 20, y: 20, width: 40, height: 30, rotation: 0, depth: 5, operation: "outline" },
  { id: "c1", kind: "circle", x: 100, y: 60, radius: 15, depth: 3, operation: "pocket" },
  { id: "p1", kind: "path", points: [[10, 100], [50, 100], [30, 130]], closed: true, depth: 2, operation: "outline" },
] as any;
process.stdout.write(generateGCode(shapes, DEFAULT_MACHINE_SETTINGS));
