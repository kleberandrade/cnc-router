/**
 * Build the sequence of cut depths (positive numbers, mm below surface) for a shape,
 * stepping down by at most `passDepth` per pass until `totalDepth` is reached.
 */
export function buildPassDepths(totalDepth: number, passDepth: number): number[] {
  if (totalDepth <= 0) throw new Error("totalDepth must be > 0");
  if (passDepth <= 0) throw new Error("passDepth must be > 0");
  const passes: number[] = [];
  let depth = passDepth;
  while (depth < totalDepth) {
    passes.push(depth);
    depth += passDepth;
  }
  passes.push(totalDepth);
  return passes;
}
