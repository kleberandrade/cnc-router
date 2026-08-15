import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../useTheme";
import { useUiStore, resolveTheme } from "../../state/uiStore";

describe("useTheme", () => {
  it("applies data-theme on <html> and follows the store", () => {
    const { result } = renderHook(() => useTheme());
    act(() => useUiStore.getState().setTheme("dark"));
    expect(result.current).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    act(() => useUiStore.getState().setTheme("light"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(["light", "dark"]).toContain(resolveTheme("system"));
  });
});
