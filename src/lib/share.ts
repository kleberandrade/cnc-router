import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Shape, MachineSettings } from "../types";
import { serializeProject, parseProject } from "./projectFile";

export const SHARE_PARAM = "p";
/** Browsers/servers get unhappy far above this; we warn the user. */
export const SHARE_MAX_URL = 8000;

/** Build a shareable URL (`#p=<lz-string>`) for the project. */
export function buildShareUrl(shapes: Shape[], settings: MachineSettings, base = typeof location !== "undefined" ? `${location.origin}${location.pathname}` : "https://oficina-cnc.vercel.app/"): { url: string; length: number; tooLong: boolean } {
  const packed = compressToEncodedURIComponent(serializeProject(shapes, settings));
  const url = `${base}#${SHARE_PARAM}=${packed}`;
  return { url, length: url.length, tooLong: url.length > SHARE_MAX_URL };
}

/** Parse a `#p=` hash into a project, or null when absent/invalid. */
export function readShareHash(hash: string): { shapes: Shape[]; settings: MachineSettings } | null {
  const m = hash.match(new RegExp(`[#&]${SHARE_PARAM}=([^&]+)`));
  if (!m) return null;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    if (!json) return null;
    return parseProject(json);
  } catch {
    return null;
  }
}
