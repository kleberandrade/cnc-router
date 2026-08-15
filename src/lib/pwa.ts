import { create } from "zustand";
import { registerSW } from "virtual:pwa-register";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  /** A new version was downloaded; call `update()` to reload with it. */
  needRefresh: boolean;
  offlineReady: boolean;
  /** Install prompt is available (Chrome/Edge/Android). */
  canInstall: boolean;
  installed: boolean;
  isIos: boolean;
  isStandalone: boolean;
  update: () => void;
  install: () => Promise<boolean>;
  dismissRefresh: () => void;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export const usePwaStore = create<PwaState>((set) => ({
  needRefresh: false,
  offlineReady: false,
  canInstall: false,
  installed: false,
  isIos: isIos(),
  isStandalone: isStandalone(),
  update: () => { void updateSW?.(true); },
  install: async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    set({ canInstall: false, installed: choice.outcome === "accepted" });
    return choice.outcome === "accepted";
  },
  dismissRefresh: () => set({ needRefresh: false }),
}));

/** Call once at startup (browser only). Safe to call in tests: no-ops without `window`. */
export function initPwa() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    usePwaStore.setState({ canInstall: true });
  });
  window.addEventListener("appinstalled", () => usePwaStore.setState({ installed: true, canInstall: false }));
  try {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => usePwaStore.setState({ needRefresh: true }),
      onOfflineReady: () => usePwaStore.setState({ offlineReady: true }),
    });
  } catch {
    // service worker unsupported (e.g. insecure context) — the app still works online
  }
}
