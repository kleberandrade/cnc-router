import { booleanRegions, shapeRegions, type Region } from "../boolean";
import { offsetRegion } from "../offset";
import { expandShapes } from "../expand";
import type { Shape } from "../../types";

/**
 * Colagem de peças para a análise no conjunto (Sprint 33).
 *
 * Peças que se encostam no desenho (ou quase — folga de encaixe) viram um corpo só, como se
 * coladas com cola ideal. A ferramenta é fechamento morfológico com o Clipper que o app já usa:
 * infla cada peça `tol/2`, une tudo, defla `tol/2`. Vãos de até `tol` fecham de vez (a união
 * preenche e a deflação não reabre); peças longe continuam separadas, cada grupo vira uma região.
 * O preço é honesto: cantos reentrantes ganham um raio ~`tol/2` — nada que uma fresa já não faça.
 */

/** Folga que ainda conta como "encostado", mm — a folga típica de um encaixe fresado. */
export const GLUE_TOL = 0.5;

/**
 * Cola um conjunto de regiões: grupos conectados (a menos de `tol`) fundem num corpo só.
 * Devolve uma região por grupo. Furos sobrevivem; regiões degeneradas somem.
 */
export function glueParts(parts: Region[], tol = GLUE_TOL): Region[] {
  const usable = parts.filter((r) => r.outer.length >= 3);
  if (usable.length === 0) return [];
  if (usable.length === 1) return usable;
  const half = Math.max(tol, 1e-3) / 2;
  const inflated = usable.flatMap((r) => offsetRegion(r.outer, r.holes, half));
  const united = booleanRegions("union", inflated, []);
  return united.flatMap((r) => offsetRegion(r.outer, r.holes, -half)).filter((r) => r.outer.length >= 3);
}

/** As peças (sólidos) e os recortes estruturais que a análise desconta. */
export interface AssemblyParts {
  solids: Region[];
  cutouts: Region[];
}

const through = (s: Shape, thickness: number): boolean => !!s.cutThrough || s.depth >= thickness - 1e-6;

/**
 * Separa o desenho pela semântica de corte (Sprint 34): contorno **por fora** = peça; furação e
 * contorno/rebaixo **por dentro que atravessam a chapa** = recorte descontado (o rasgo da alça
 * vira furo). Rebaixo parcial e gravação não mudam o contorno — limitação declarada no aviso.
 * `extraOps` valem pela própria operação (a expansão já separa cada uma).
 */
export function partitionShapes(shapes: Shape[], thickness: number): AssemblyParts {
  const solids: Region[] = [], cutouts: Region[] = [];
  // texto gravado (raso) nem precisa das fontes: só expande texto que atravessa a chapa
  const relevant = shapes.filter((s) => !s.hidden && s.kind !== "relief" && (s.kind !== "text" || through(s, thickness)));
  for (const s of expandShapes(relevant)) {
    const regions = shapeRegions(s);
    if (regions.length === 0) continue;
    if (s.operation === "outline" && s.side !== "inside") solids.push(...regions);
    else if (through(s, thickness)) cutouts.push(...regions); // furação, passante por dentro, rebaixo vazado
  }
  return { solids, cutouts };
}

/** Conjunto pronto para analisar: sólidos colados, recortes passantes descontados. */
export function assembleShapes(shapes: Shape[], thickness: number, tol = GLUE_TOL): Region[] {
  const { solids, cutouts } = partitionShapes(shapes, thickness);
  const glued = glueParts(solids, tol);
  if (cutouts.length === 0) return glued;
  return booleanRegions("difference", glued, cutouts).filter((r) => r.outer.length >= 3);
}
