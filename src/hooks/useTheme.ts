import { useEffect, useState } from "react";
import { useUiStore, resolveTheme } from "../state/uiStore";

/** Applies `data-theme` on <html> and returns the resolved scheme. */
export function useTheme(): "light" | "dark" {
  const theme = useUiStore((s) => s.theme);
  const [resolved, setResolved] = useState(() => resolveTheme(theme));
  useEffect(() => {
    const apply = () => {
      const r = resolveTheme(theme);
      setResolved(r);
      document.documentElement.setAttribute("data-theme", r);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", r === "dark" ? "#0f1720" : "#16283d");
    };
    apply();
    if (theme !== "system" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, [theme]);
  return resolved;
}
