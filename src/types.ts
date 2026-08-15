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

/** Usable travel of the machine (work envelope), in mm. */
export interface WorkArea {
  width: number;   // X
  height: number;  // Y
  zTravel: number; // Z
}

/** Where the G54 work origin (X0 Y0) sits relative to the stock. */
export type StockOrigin = "front-left" | "center";

/** Raw material (sheet/block) clamped on the table, in mm. */
export interface Stock {
  width: number;
  height: number;
  thickness: number;
  /** Position of the stock's front-left corner on the table (from the machine's front-left). */
  offsetX: number;
  offsetY: number;
  origin: StockOrigin;
}

export interface MachineSettings {
  /** Machine preset id (see lib/machinePresets); "custom" when edited by hand. */
  machinePreset: string;
  workArea: WorkArea;
  stock: Stock;
  /** Feed rate while cutting, mm/min */
  feedRate: number;
  /** Rapid (G0) travel speed of the machine, mm/min — used only for time estimation. */
  rapidRate: number;
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

export const DEFAULT_WORK_AREA: WorkArea = { width: 600, height: 400, zTravel: 80 };

export const DEFAULT_STOCK: Stock = {
  width: 300,
  height: 200,
  thickness: 18,
  offsetX: 0,
  offsetY: 0,
  origin: "front-left",
};

export const DEFAULT_MACHINE_SETTINGS: MachineSettings = {
  machinePreset: "6040",
  workArea: DEFAULT_WORK_AREA,
  stock: DEFAULT_STOCK,
  feedRate: 800,
  rapidRate: 3000,
  plungeRate: 200,
  spindleSpeed: 12000,
  safeHeight: 5,
  passDepth: 2,
  toolDiameter: 3,
};
