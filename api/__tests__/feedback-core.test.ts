import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleFeedback, validate, allow, resetRate, type Deps } from "../_lib/feedback-core";

const req = (body: unknown, headers: Record<string, string> = {}, method = "POST") =>
  new Request("https://oficina-cnc.vercel.app/api/feedback", { method, headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4", ...headers }, body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined });

const good = { type: "sugestao", title: "Ideia boa", message: "Seria ótimo ter um botão para isso e aquilo.", website: "" };

describe("feedback core", () => {
  let saved: { pathname: string; body: string }[];
  let deps: Deps;
  beforeEach(() => {
    resetRate();
    saved = [];
    deps = { save: async (pathname, body) => { saved.push({ pathname, body }); return { url: `blob://${pathname}` }; }, now: () => new Date("2026-08-16T12:00:00.000Z"), id: () => "abc123", origins: ["https://oficina-cnc.vercel.app"] };
  });

  it("stores a valid payload as JSON under feedback/AAAA-MM/ and returns the id", async () => {
    const res = await handleFeedback(req({ ...good, email: "a@b.co", diagnostics: { version: "0.20.0" } }), deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: "abc123", receivedAt: "2026-08-16T12:00:00.000Z" });
    expect(saved).toHaveLength(1);
    expect(saved[0].pathname).toBe("feedback/2026-08/2026-08-16T12-00-00-000Z-sugestao-abc123.json");
    const stored = JSON.parse(saved[0].body);
    expect(stored).toMatchObject({ id: "abc123", type: "sugestao", title: "Ideia boa", email: "a@b.co", ip: "1.2.3.4", diagnostics: { version: "0.20.0" } });
    expect(stored.website).toBeUndefined();
  });
  it("validates: type, title, message, email", () => {
    expect(validate({ ...good, type: "x" })).toMatch(/tipo/);
    expect(validate({ ...good, title: "ab" })).toMatch(/título/);
    expect(validate({ ...good, message: "curta" })).toMatch(/mensagem/);
    expect(validate({ ...good, email: "nope" })).toMatch(/e-mail/);
    expect(validate(good)).toBeNull();
    expect(validate(good, 10, 100)).toMatch(/grande/);
  });
  it("rejects bad JSON (400), wrong method (405), foreign origin (403), oversized body (413)", async () => {
    expect((await handleFeedback(req("{nope"), deps)).status).toBe(400);
    expect((await handleFeedback(req(null, {}, "GET"), deps)).status).toBe(405);
    expect((await handleFeedback(req(good, { origin: "https://evil.example" }), deps)).status).toBe(403);
    expect((await handleFeedback(req({ ...good, message: "x".repeat(2000) }), { ...deps, maxBodyBytes: 500 })).status).toBe(413);
    expect(saved).toHaveLength(0);
  });
  it("honeypot filled → pretends success without saving", async () => {
    const res = await handleFeedback(req({ ...good, website: "http://spam" }), deps);
    expect(res.status).toBe(200);
    expect(saved).toHaveLength(0);
  });
  it("rate limit: 6th request within a minute from the same IP → 429 with Retry-After", async () => {
    for (let i = 0; i < 5; i++) expect((await handleFeedback(req(good), deps)).status).toBe(200);
    const res = await handleFeedback(req(good), deps);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    // another IP is fine
    expect((await handleFeedback(req(good, { "x-forwarded-for": "9.9.9.9" }), deps)).status).toBe(200);
  });
  it("allow() slides the window", () => {
    resetRate();
    expect(allow("z", 2, 0)).toBe(true);
    expect(allow("z", 2, 10)).toBe(true);
    expect(allow("z", 2, 20)).toBe(false);
    expect(allow("z", 2, 60_001)).toBe(true);
  });
  it("CORS preflight from an allowed origin → 204 with headers; storage failure → 502", async () => {
    const pre = await handleFeedback(req(null, { origin: "https://oficina-cnc.vercel.app" }, "OPTIONS"), deps);
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe("https://oficina-cnc.vercel.app");
    const failing = { ...deps, save: vi.fn().mockRejectedValue(new Error("blob down")) };
    const res = await handleFeedback(req(good), failing);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("guardar") });
  });
});
