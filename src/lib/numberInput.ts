export interface NumberInputOptions {
  min?: number;
  max?: number;
}

/**
 * Parse a numeric text-field value defensively.
 * Empty strings, NaN, Infinity or values outside [min, max] return `fallback`
 * (normally the last valid value) so a half-typed field never poisons the store
 * with 0/NaN and later crashes G-code generation.
 */
export function parseNumberInput(
  value: string,
  fallback: number,
  { min, max }: NumberInputOptions = {}
): number {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return fallback;
  if (min !== undefined && n < min) return fallback;
  if (max !== undefined && n > max) return fallback;
  return n;
}
