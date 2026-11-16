/** Offline example: prints G-code; never opens a device or sends machine commands. */
import { generateGCode } from "../src/lib/gcode";
import { DEFAULT_MACHINE_SETTINGS, type Shape } from "../src/types";

const shapes: Shape[] = [{
  id: "example-pocket", kind: "rectangle", x: 30, y: 30,
  width: 40, height: 30, rotation: 0, depth: 3, operation: "pocket",
}];
process.stdout.write(generateGCode(shapes, DEFAULT_MACHINE_SETTINGS));
