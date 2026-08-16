import "@testing-library/jest-dom/vitest";

// Node 25+ exposes a broken experimental localStorage (no setItem) that
// shadows jsdom's. Replace it when the API is incomplete.
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.setItem !== "function") {
  const data = new Map<string, string>();
  const memory: Storage = {
    get length() { return data.size; },
    clear() { data.clear(); },
    getItem(key) { return data.has(key) ? data.get(key)! : null; },
    key(i) { return [...data.keys()][i] ?? null; },
    removeItem(key) { data.delete(key); },
    setItem(key, value) { data.set(String(key), String(value)); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: memory, configurable: true });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", { value: memory, configurable: true });
  }
}

// jsdom's ResizeObserver implementation is incomplete in some versions;
// fall back to a no-op stub so components using it don't crash in tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
