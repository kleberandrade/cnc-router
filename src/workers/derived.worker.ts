/// <reference lib="webworker" />
import { computeDerived } from "../lib/derivedCompute";
import { loadEmbeddedFonts } from "../lib/text";
import type { Shape, MachineSettings } from "../types";

export interface DerivedRequest { id: number; shapes: Shape[]; settings: MachineSettings }

const fontsReady = loadEmbeddedFonts();

self.onmessage = async (e: MessageEvent<DerivedRequest>) => {
  const { id, shapes, settings } = e.data;
  if (shapes.some((s) => s.kind === "text")) await fontsReady; // text outlines need the fonts in this thread too
  const result = computeDerived(shapes, settings);
  (self as unknown as Worker).postMessage({ id, result });
};
