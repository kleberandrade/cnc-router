/** Build-time product info injected by Vite (`define` in vite.config.ts). Falls back for tests. */
const safe = <T,>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };

export const APP_VERSION: string = safe(() => __APP_VERSION__, "0.0.0-test");
export const GIT_SHA: string = safe(() => __GIT_SHA__, "dev");
export const BUILD_DATE: string = safe(() => __BUILD_DATE__, "");

export interface ChangelogEntry { title: string; date: string; body: string }
export const CHANGELOG: ChangelogEntry[] = safe(() => __CHANGELOG__, []);

/** "v0.19.0" */
export const versionLabel = (): string => `v${APP_VERSION}`;
/** "v0.19.0 (abc1234, 2026-08-16)" */
export const buildLabel = (): string => `v${APP_VERSION} (${GIT_SHA}${BUILD_DATE ? `, ${BUILD_DATE}` : ""})`;

const SEEN_KEY = "oficina-cnc:seen-version";

/** True when this version was not seen yet on this device (and marks the previous one as reference). */
export function isNewVersion(storage: Pick<Storage, "getItem"> | null = safeStorage()): boolean {
  if (!storage) return false;
  const seen = storage.getItem(SEEN_KEY);
  return seen !== null && seen !== APP_VERSION;
}
/** First run on this device (nothing seen yet). */
export function isFirstRun(storage: Pick<Storage, "getItem"> | null = safeStorage()): boolean {
  return !!storage && storage.getItem(SEEN_KEY) === null;
}
export function markVersionSeen(storage: Pick<Storage, "setItem"> | null = safeStorage()): void {
  storage?.setItem(SEEN_KEY, APP_VERSION);
}
function safeStorage(): Storage | null {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}
