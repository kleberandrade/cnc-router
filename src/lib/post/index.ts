import type { PostId, ExportUnits } from "../../types";

/**
 * A post-processor describes the G-code dialect of a controller: how comments are written,
 * how the spindle is switched, how a tool-change pause and the program end look.
 * Motion (G0/G1), G90 and the unit word are shared by every supported controller.
 */
export interface PostProcessor {
  id: PostId;
  label: string;
  description: string;
  /** File extension suggested on export. */
  extension: string;
  comment: (text: string) => string;
  /** Lines emitted after the unit/absolute words. */
  preamble: () => string[];
  spindleOn: (rpm: number) => string[];
  spindleOff: () => string[];
  /** Pause for a manual tool change with a message to the operator. */
  toolChange: (name: string, diameterText: string, rpm: number) => string[];
  programEnd: () => string[];
}

const grbl: PostProcessor = {
  id: "grbl",
  label: "GRBL (1.1 / grblHAL)",
  description: "Comentários com ';', M3/M5 para o spindle, M0 para a troca de fresa, M2 no fim. Padrão para routers hobby (3018, 6040, Shapeoko).",
  extension: "gcode",
  comment: (t) => `; ${t}`,
  preamble: () => [],
  spindleOn: (rpm) => [`M3 S${fmtNum(rpm)} ; spindle on`],
  spindleOff: () => ["M5 ; spindle off"],
  toolChange: (name, d, rpm) => [
    "M5 ; spindle off for tool change",
    `M0 ; TROCA DE FERRAMENTA: ${name} (Ø${d} mm) — monte a fresa e retome`,
    `M3 S${fmtNum(rpm)} ; spindle on`,
  ],
  programEnd: () => ["M2 ; program end"],
};

const marlin: PostProcessor = {
  id: "marlin",
  label: "Marlin (2.x, modo CNC)",
  description: "Comentários com ';', M3/M5 (Marlin com SPINDLE_LASER_ENABLE), M0 com mensagem no LCD para a troca, M400 + M84 no fim. Sem G28 (não faz homing sozinho).",
  extension: "gcode",
  comment: (t) => `; ${t}`,
  preamble: () => ["M117 Oficina CNC ; mensagem no LCD"],
  spindleOn: (rpm) => [`M3 S${fmtNum(rpm)} ; spindle on`, "G4 S2 ; aguarda o spindle acelerar"],
  spindleOff: () => ["M5 ; spindle off"],
  toolChange: (name, d, rpm) => [
    "M5 ; spindle off for tool change",
    `M0 Troca: ${name} O${d}mm ; pausa ate clicar no LCD`,
    `M3 S${fmtNum(rpm)} ; spindle on`,
    "G4 S2",
  ],
  programEnd: () => ["M400 ; espera terminar", "M84 ; desliga motores"],
};

const linuxcnc: PostProcessor = {
  id: "linuxcnc",
  label: "LinuxCNC / Mach3 / Mach4",
  description: "Comentários entre parênteses, G17 G40 G49 G64 no preâmbulo, (MSG,…) + M0 na troca de fresa, M30 no fim. Também serve para Mach3/4 e controladores industriais.",
  extension: "ngc",
  comment: (t) => `(${t.replace(/[()]/g, "")})`,
  preamble: () => ["G17 (plano XY)", "G40 (sem compensacao de raio)", "G49 (sem compensacao de comprimento)", "G64 P0.01 (trajetoria continua)"],
  spindleOn: (rpm) => [`M3 S${fmtNum(rpm)} (spindle on)`, "G4 P2 (aguarda o spindle)"],
  spindleOff: () => ["M5 (spindle off)"],
  toolChange: (name, d, rpm) => [
    "M5 (spindle off for tool change)",
    `(MSG, TROCA DE FERRAMENTA: ${name} O${d} mm)`,
    "M0 (pausa - monte a fresa e retome)",
    `M3 S${fmtNum(rpm)} (spindle on)`,
    "G4 P2",
  ],
  programEnd: () => ["M30 (program end)"],
};

export const POSTS: PostProcessor[] = [grbl, marlin, linuxcnc];

export function findPost(id: PostId | string | undefined): PostProcessor {
  return POSTS.find((p) => p.id === id) ?? grbl;
}

/** Number formatting shared by every post: up to 3 decimals (4 for inches), no trailing zeros. */
export function fmtNum(n: number, decimals = 3): string {
  const s = n.toFixed(decimals);
  return s.includes(".") ? s.replace(/\.?0+$/, "") || "0" : s;
}

export const MM_PER_INCH = 25.4;

/** Scale factor from mm to the export unit. */
export function unitScale(units: ExportUnits): number {
  return units === "inch" ? 1 / MM_PER_INCH : 1;
}

/** Unit word (G21/G20) with a comment in the post's dialect. */
export function unitWord(units: ExportUnits, post: PostProcessor): string {
  return units === "inch" ? `G20 ${post.comment("inches")}` : `G21 ${post.comment("millimeters")}`;
}
