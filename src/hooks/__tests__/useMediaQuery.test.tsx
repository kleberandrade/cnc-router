import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMediaQuery, useLayout } from "../useMediaQuery";

describe("useMediaQuery / useLayout", () => {
  it("returns matchMedia results and maps to a layout", () => {
    const orig = window.matchMedia;
    const mm = vi.fn((q: string) => ({ matches: q.includes("max-width: 767px"), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(), onchange: null, addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() }));
    window.matchMedia = mm as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(true);
    const layout = renderHook(() => useLayout());
    expect(layout.result.current).toBe("mobile");
    window.matchMedia = orig;
  });
});
