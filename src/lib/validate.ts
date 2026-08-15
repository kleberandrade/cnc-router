import type { Shape, MachineSettings } from "../types";
import { shapeToPoints, boundingBox } from "./geometry";
import { offsetPolygon } from "./offset";

export type IssueLevel = "error" | "warning";

export interface Issue {
  level: IssueLevel;
  code:
    | "shape-outside-table"
    | "shape-outside-stock"
    | "depth-exceeds-stock"
    | "depth-exceeds-z"
    | "safe-height-exceeds-z"
    | "stock-outside-table"
    | "invalid-setting"
    | "shape-narrower-than-tool";
  message: string;
  shapeId?: string;
}

const EPS = 1e-6;

/** Bounding box of the stock on the table, in table coordinates (mm). */
export function stockBounds(settings: MachineSettings) {
  const { stock } = settings;
  return {
    minX: stock.offsetX,
    minY: stock.offsetY,
    maxX: stock.offsetX + stock.width,
    maxY: stock.offsetY + stock.height,
  };
}

/**
 * Validate the whole project against machine + stock limits.
 * Shape coordinates are in *table* space (mm from the machine's front-left corner);
 * the chosen work origin only affects the exported G-code.
 */
export function validateProject(shapes: Shape[], settings: MachineSettings): Issue[] {
  const issues: Issue[] = [];
  const { workArea, stock } = settings;
  const sb = stockBounds(settings);

  if (sb.minX < -EPS || sb.minY < -EPS || sb.maxX > workArea.width + EPS || sb.maxY > workArea.height + EPS) {
    issues.push({
      level: "warning",
      code: "stock-outside-table",
      message: "A chapa está parcialmente fora da área útil da máquina.",
    });
  }
  if (stock.thickness > workArea.zTravel) {
    issues.push({
      level: "error",
      code: "depth-exceeds-z",
      message: `A espessura da chapa (${stock.thickness} mm) é maior que o curso Z (${workArea.zTravel} mm).`,
    });
  }
  if (settings.safeHeight > workArea.zTravel) {
    issues.push({
      level: "error",
      code: "safe-height-exceeds-z",
      message: `A altura segura (${settings.safeHeight} mm) é maior que o curso Z (${workArea.zTravel} mm).`,
    });
  }

  shapes.forEach((shape, i) => {
    const label = `Forma ${i + 1}`;
    const pts = shapeToPoints(shape);
    if (pts.length === 0) return;
    const b = boundingBox(pts);

    if (b.minX < -EPS || b.minY < -EPS || b.maxX > workArea.width + EPS || b.maxY > workArea.height + EPS) {
      issues.push({
        level: "error",
        code: "shape-outside-table",
        message: `${label} está fora da área útil da máquina (${workArea.width} × ${workArea.height} mm).`,
        shapeId: shape.id,
      });
    } else if (b.minX < sb.minX - EPS || b.minY < sb.minY - EPS || b.maxX > sb.maxX + EPS || b.maxY > sb.maxY + EPS) {
      issues.push({
        level: "warning",
        code: "shape-outside-stock",
        message: `${label} está fora da chapa (${stock.width} × ${stock.height} mm).`,
        shapeId: shape.id,
      });
    }

    if (shape.operation === "pocket" || shape.side === "inside") {
      const open = pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? pts.slice(0, -1) : pts;
      if (open.length >= 3 && offsetPolygon(open, -settings.toolDiameter / 2).length === 0) {
        issues.push({
          level: "error",
          code: "shape-narrower-than-tool",
          message: `${label}: ${shape.operation === "pocket" ? "rebaixo" : "furo (contorno interno)"} menor que a fresa Ø${settings.toolDiameter} mm — nada será cortado.`,
          shapeId: shape.id,
        });
      }
    }

    if (shape.depth > workArea.zTravel) {
      issues.push({
        level: "error",
        code: "depth-exceeds-z",
        message: `${label}: profundidade (${shape.depth} mm) maior que o curso Z (${workArea.zTravel} mm).`,
        shapeId: shape.id,
      });
    } else if (shape.depth > stock.thickness + EPS) {
      issues.push({
        level: "warning",
        code: "depth-exceeds-stock",
        message: `${label}: profundidade (${shape.depth} mm) maior que a espessura da chapa (${stock.thickness} mm) — corte passante, confira a mesa de sacrifício.`,
        shapeId: shape.id,
      });
    }
  });

  return issues;
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.level === "error");
}

/** Worst issue level for a given shape, or null. */
export function shapeIssueLevel(issues: Issue[], shapeId: string): IssueLevel | null {
  let level: IssueLevel | null = null;
  for (const i of issues) {
    if (i.shapeId !== shapeId) continue;
    if (i.level === "error") return "error";
    level = "warning";
  }
  return level;
}
