import { onINP, onLCP, onCLS, type Metric } from "web-vitals/attribution";

export interface VitalsOptions {
  /** Log every metric (with attribution) to the console. */
  debug?: boolean;
  /** Custom sink (analytics). */
  send?: (metric: Metric) => void;
}

/** Whether to print vitals: dev, or `?vitals=1` in the URL. */
export function vitalsDebugEnabled(search = typeof location !== "undefined" ? location.search : "", dev = import.meta.env.DEV): boolean {
  return dev || /[?&]vitals=1\b/.test(search);
}

/** Human summary of an INP entry: what was touched and where the time went. */
export function describeMetric(m: Metric): string {
  const a = (m as { attribution?: Record<string, unknown> }).attribution ?? {};
  if (m.name === "INP") {
    const target = String(a.interactionTarget ?? "?");
    const type = String(a.interactionType ?? "?");
    const inp = Math.round(m.value);
    const d = Math.round(Number(a.inputDelay ?? 0)), p = Math.round(Number(a.processingDuration ?? 0)), pr = Math.round(Number(a.presentationDelay ?? 0));
    return `INP ${inp} ms (${m.rating}) — ${type} em ${target}: espera ${d} + processamento ${p} + pintura ${pr}`;
  }
  return `${m.name} ${Math.round(m.value * 1000) / 1000} (${m.rating})`;
}

let started = false;
/** Start reporting Web Vitals (idempotent). */
export function initVitals(opts: VitalsOptions = {}): void {
  if (started) return;
  started = true;
  const handle = (m: Metric) => {
    if (opts.debug) console.info(`[vitals] ${describeMetric(m)}`); // eslint-disable-line no-console
    opts.send?.(m);
  };
  onINP(handle, { reportAllChanges: true });
  onLCP(handle);
  onCLS(handle);
}
