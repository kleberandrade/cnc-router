import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}

/** Layout breakpoints (shared with App.css). */
export const BP = {
  mobile: "(max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1199px)",
  desktop: "(min-width: 1200px)",
  coarse: "(pointer: coarse)",
};

export type Layout = "mobile" | "tablet" | "desktop";

export function useLayout(): Layout {
  const mobile = useMediaQuery(BP.mobile);
  const tablet = useMediaQuery(BP.tablet);
  return mobile ? "mobile" : tablet ? "tablet" : "desktop";
}
