import { booleanRegions, type Region } from "../boolean";
import { offsetRegion } from "../offset";

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
