import type { Shape, MachineSettings } from "../types";
import { migrateProject, PROJECT_SCHEMA_VERSION } from "../state/store";

export interface ProjectFile {
  app: "oficina-cnc";
  version: number;
  savedAt: string;
  shapes: Shape[];
  settings: MachineSettings;
}

export function serializeProject(shapes: Shape[], settings: MachineSettings, now = new Date()): string {
  const file: ProjectFile = { app: "oficina-cnc", version: PROJECT_SCHEMA_VERSION, savedAt: now.toISOString(), shapes, settings };
  return JSON.stringify(file, null, 2);
}

/** Parse a project file; throws (pt-BR message) when it is not one of ours. */
export function parseProject(text: string): { shapes: Shape[]; settings: MachineSettings } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Arquivo de projeto inválido (não é JSON).");
  }
  const obj = raw as Partial<ProjectFile> | null;
  if (!obj || typeof obj !== "object" || obj.app !== "oficina-cnc" || !Array.isArray(obj.shapes)) {
    throw new Error("Este arquivo não é um projeto do Oficina CNC.");
  }
  const version = typeof obj.version === "number" ? obj.version : 0;
  return migrateProject({ shapes: obj.shapes, settings: obj.settings }, version);
}
