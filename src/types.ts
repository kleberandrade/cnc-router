export type ShapeKind = "rectangle" | "circle" | "path" | "ngon" | "slot";

export interface BaseShape {
  id: string;
  kind: ShapeKind;
  /** Cut depth in millimeters (positive number, e.g. 5 = 5mm deep). */
  depth: number;
  /** Whether the toolpath follows the outline (outline) or removes the interior (pocket). */
  operation: "outline" | "pocket";
  /** When true, depth follows the stock thickness + THROUGH_CUT_EXTRA (kept in sync when the stock changes). */
  cutThrough?: boolean;
  /**
   * Tool compensation for outlines: "on" follows the line with the tool centre (legacy/engraving),
   * "outside" keeps the drawn size for a part cut-out, "inside" keeps the drawn size for a hole.
   * Ignored for pockets. Defaults to "on".
   */
  side?: CutSide;
  /** Holding tabs left on the last passes of an outline (through-cuts). */
  tabs?: TabSettings;
}

export type CutSide = "on" | "outside" | "inside";

export interface TabSettings {
  /** Number of tabs spread evenly along the perimeter (0 = none). */
  count: number;
  /** Tab length along the path, mm. */
  width: number;
  /** Tab height above the bottom of the cut, mm. */
  height: number;
}

export const DEFAULT_TABS: TabSettings = { count: 4, width: 8, height: 3 };

/** Extra depth (mm) added below the stock for through-cuts, so the bottom face is fully cut. */
export const THROUGH_CUT_EXTRA = 0.2;

export type CornerType = "sharp" | "fillet" | "chamfer";
export type CornerId = "bl" | "br" | "tr" | "tl";

export interface RectangleCorners {
  type: CornerType;
  /** Fillet radius or chamfer distance, mm. */
  size: number;
  /** Which corners; undefined/empty = all four. Order: bl (x,y), br, tr, tl. */
  which?: CornerId[];
}

export interface RectangleShape extends BaseShape {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  corners?: RectangleCorners;
}

/** Regular polygon (n sides) inscribed in a circle of `radius`, centred at (x, y). */
export interface RegularPolygonShape extends BaseShape {
  kind: "ngon";
  x: number;
  y: number;
  radius: number;
  sides: number;
  rotation: number;
}

/** Slot / obround: total `length` (end to end) and `width` (= end diameter), centred at (x, y). */
export interface SlotShape extends BaseShape {
  kind: "slot";
  x: number;
  y: number;
  length: number;
  width: number;
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

export type Shape = RectangleShape | CircleShape | PathShape | RegularPolygonShape | SlotShape;

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

export type MaterialId = "mdf" | "plywood" | "pine" | "aluminum" | "custom";

/** Cutting parameters that a material preset fills in (and the user may override). */
export type CutParamKey = "feedRate" | "plungeRate" | "spindleSpeed" | "passDepth" | "stepover";

export type OrderMode = "auto" | "manual";

export type ToolType = "flat" | "ball" | "vbit";

export interface MachineSettings {
  /** Tool tip geometry (visual + material removal). */
  toolType: ToolType;
  /** Included angle for V-bits, degrees (e.g. 60, 90). */
  vbitAngle: number;
  /** Ramp entry angle in degrees for outlines (0 = vertical plunge). */
  rampAngle: number;
  /** "auto": pockets → inner outlines → outer outlines, nearest-first; "manual": drawing order. */
  orderMode: OrderMode;
  /** Selected material preset (see lib/materials). */
  material: MaterialId;
  /** Pocket stepover, mm (distance between scanlines). */
  stepover: number;
  /** Cutting parameters edited by hand — a material preset will not overwrite these. */
  overrides: Partial<Record<CutParamKey, boolean>>;
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
  toolType: "flat",
  vbitAngle: 90,
  rampAngle: 0,
  orderMode: "auto",
  material: "custom",
  stepover: 1.8,
  overrides: {},
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
