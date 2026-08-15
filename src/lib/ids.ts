let counter = 0;

/**
 * Generate a unique, stable id for a shape. Uses `crypto.randomUUID` when available
 * (browsers, Node 19+) and falls back to a counter + random suffix otherwise.
 * Ids are persisted with the project, so they must never depend on session state alone.
 */
export function generateShapeId(prefix: string): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return `${prefix}-${cryptoObj.randomUUID()}`;
  }
  counter += 1;
  return `${prefix}-${counter}-${Math.random().toString(36).slice(2, 10)}`;
}
