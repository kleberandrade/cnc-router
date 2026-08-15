import "@testing-library/jest-dom/vitest";

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
