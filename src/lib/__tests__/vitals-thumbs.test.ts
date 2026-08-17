import { describe, it, expect, vi } from "vitest";
import { describeMetric, vitalsDebugEnabled } from "../vitals";
import { loadThumbs, thumbsHash, _resetThumbs } from "../thumbs";
import type { Metric } from "web-vitals";

describe("vitals (sprint 27)", () => {
  it("liga em dev ou com ?vitals=1", () => {
    expect(vitalsDebugEnabled("?vitals=1", false)).toBe(true);
    expect(vitalsDebugEnabled("?x=1", false)).toBe(false);
    expect(vitalsDebugEnabled("", true)).toBe(true);
  });
  it("descreve INP com alvo e fases", () => {
    const m = { name: "INP", value: 816, rating: "poor", attribution: { interactionTarget: "#menu", interactionType: "pointer", inputDelay: 10, processingDuration: 700, presentationDelay: 106 } } as unknown as Metric;
    expect(describeMetric(m)).toContain("INP 816 ms (poor) — pointer em #menu: espera 10 + processamento 700 + pintura 106");
    expect(describeMetric({ name: "CLS", value: 0.01, rating: "good" } as Metric)).toBe("CLS 0.01 (good)");
  });
});

describe("thumbs (sprint 27)", () => {
  it("carrega uma vez e cai em {} sem arquivo", async () => {
    _resetThumbs();
    const f = vi.fn(async () => new Response("null", { status: 404 }));
    expect(await loadThumbs(f as unknown as typeof fetch)).toEqual({});
    await loadThumbs(f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
    _resetThumbs();
    expect(thumbsHash([])).toBe(thumbsHash([]));
  });
});
