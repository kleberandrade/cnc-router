import { describe, it, expect, vi } from "vitest";

vi.mock("virtual:pwa-register", () => ({
  registerSW: (opts: { onNeedRefresh?: () => void; onOfflineReady?: () => void }) => {
    opts.onOfflineReady?.();
    opts.onNeedRefresh?.();
    return vi.fn(async () => {});
  },
}));

import { initPwa, usePwaStore } from "../pwa";

describe("pwa store", () => {
  it("initPwa wires the service worker callbacks and install prompt", async () => {
    initPwa();
    expect(usePwaStore.getState().offlineReady).toBe(true);
    expect(usePwaStore.getState().needRefresh).toBe(true);
    usePwaStore.getState().dismissRefresh();
    expect(usePwaStore.getState().needRefresh).toBe(false);
    usePwaStore.getState().update();
    // beforeinstallprompt
    const ev = new Event("beforeinstallprompt") as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" }> };
    ev.prompt = async () => {};
    ev.userChoice = Promise.resolve({ outcome: "accepted" as const });
    window.dispatchEvent(ev);
    expect(usePwaStore.getState().canInstall).toBe(true);
    const ok = await usePwaStore.getState().install();
    expect(ok).toBe(true);
    expect(usePwaStore.getState().installed).toBe(true);
    window.dispatchEvent(new Event("appinstalled"));
    expect(usePwaStore.getState().canInstall).toBe(false);
  });
});
