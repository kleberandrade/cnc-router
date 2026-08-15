export type ShapeKind = "rectangle" | "circle" | "path";

export interface BaseShape {
  id: string;
  kind: ShapeKind;
  /** Cut depth in millimeters (positive number, e.g. 5 = 5mm deep). */
  depth: number;
  /** Whether the toolpath follows the outline (outline) or removes the interior (pocket). */
  operation: "outline" | "pocket";
}

export interface RectangleShape extends BaseShape {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface CircleShape extends BaseShape {
  kind: "circle";
  x: number;
  y: number;
  radius: number;
}

export interface PathShape extends BaseShape {
  kind: "path";
  /** Flat list of [x, y] points in machine units (mm), already resolved (no curves). */
  points: [number, number][];
  closed: boolean;
}

export type Shape = RectangleShape | CircleShape | PathShape;

export interface MachineSettings {
  /** Feed rate while cutting, mm/min */
  feedRate: number;
  /** Feed rate while plunging into material, mm/min */
  plungeRate: number;
  /** Spindle speed in RPM */
  spindleSpeed: number;
  /** Safe travel height above material, mm */
  safeHeight: number;
  /** How much depth to remove per pass, mm. Passes are stacked until shape.depth is reached. */
  passDepth: number;
  /** Tool diameter, mm — used for pocket clearing stepover. */
  toolDiameter: number;
}

export const DEFAULT_MACHINE_SETTINGS: MachineSettings = {
  feedRate: 800,
  plungeRate: 200,
  spindleSpeed: 12000,
  safeHeight: 5,
  passDepth: 2,
  toolDiameter: 3,
};
