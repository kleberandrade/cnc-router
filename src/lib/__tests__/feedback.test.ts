import { describe, it, expect, vi } from "vitest";
import { buildPayload, buildDiagnostics, sendFeedback, mailtoFor, recordError, lastErrors, clearErrors, MAX_PROJECT_BYTES, type FeedbackDraft } from "../feedback";
import { DEFAULT_MACHINE_SETTINGS, type Shape } from "../../types";

const shapes: Shape[] = [
  { id: "r", kind: "rectangle", x: 0, y: 0, width: 10, height: 10, rotation: 0, depth: 1, operation: "outline" },
  { id: "c", kind: "circle", x: 0, y: 0, radius: 5, depth: 1, operation: "pocket" },
];
const draft: FeedbackDraft = { type: "problema", title: "Algo quebrou", message: "Cliquei em exportar e nada aconteceu.", email: "", includeDiagnostics: true, includeProject: false };

describe("feedback client", () => {
  it("diagnostics carry version, environment and an anonymous project summary (no geometry, no email)", () => {
    const d = buildDiagnostics(shapes, DEFAULT_MACHINE_SETTINGS);
    expect(d.version).toBeTruthy();
    expect(d.project).toMatchObject({ shapes: 2, kinds: { rectangle: 1, circle: 1 }, post: "grbl", units: "mm", tools: 1 });
    expect(JSON.stringify(d)).not.toContain('"points"');
  });
  it("payload: honeypot empty, e-mail only when filled, diagnostics + last error when asked, project when asked and small", () => {
    clearErrors();
    recordError("TypeError: boom");
    const { payload, projectTooBig } = buildPayload({ ...draft, email: " a@b.co " }, shapes, DEFAULT_MACHINE_SETTINGS);
    expect(payload.website).toBe("");
    expect(payload.email).toBe("a@b.co");
    expect(payload.diagnostics?.project.shapes).toBe(2);
    expect(payload.lastError).toContain("TypeError: boom");
    expect(payload.project).toBeUndefined();
    expect(projectTooBig).toBe(false);
    const withProject = buildPayload({ ...draft, includeProject: true, includeDiagnostics: false }, shapes, DEFAULT_MACHINE_SETTINGS);
    expect((withProject.payload.project as { shapes: Shape[] }).shapes).toHaveLength(2);
    expect(withProject.payload.diagnostics).toBeUndefined();
    // huge project → flagged, not attached
    const big: Shape[] = Array.from({ length: 4000 }, (_, i) => ({ id: `p${i}`, kind: "path", closed: true, points: Array.from({ length: 20 }, (_, k) => [k, i] as [number, number]), depth: 1, operation: "outline" }));
    expect(JSON.stringify({ shapes: big }).length).toBeGreaterThan(MAX_PROJECT_BYTES);
    const tooBig = buildPayload({ ...draft, includeProject: true }, big, DEFAULT_MACHINE_SETTINGS);
    expect(tooBig.projectTooBig).toBe(true);
    expect(tooBig.payload.project).toBeUndefined();
    expect(lastErrors().length).toBeLessThanOrEqual(5);
  });
  it("sendFeedback maps responses: ok, 501/404 → unavailable, 429 → ratelimit, 400 → rejected, network error", async () => {
    const { payload } = buildPayload(draft, shapes, DEFAULT_MACHINE_SETTINGS);
    const mk = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
    expect(await sendFeedback(payload, { fetchFn: mk(200, { ok: true, id: "x1" }) })).toEqual({ ok: true, id: "x1" });
    expect((await sendFeedback(payload, { fetchFn: mk(501, { error: "no token" }) }))).toMatchObject({ ok: false, reason: "unavailable" });
    expect((await sendFeedback(payload, { fetchFn: mk(404, {}) }))).toMatchObject({ ok: false, reason: "unavailable" });
    expect((await sendFeedback(payload, { fetchFn: mk(429, { error: "muitos" }) }))).toMatchObject({ ok: false, reason: "ratelimit", message: "muitos" });
    expect((await sendFeedback(payload, { fetchFn: mk(400, { error: "título" }) }))).toMatchObject({ ok: false, reason: "rejected", message: "título" });
    expect((await sendFeedback(payload, { fetchFn: vi.fn().mockRejectedValue(new Error("down")) }))).toMatchObject({ ok: false, reason: "network" });
    const sent = mk(200, { ok: true, id: "x" });
    await sendFeedback(payload, { fetchFn: sent });
    const [url, init] = sent.mock.calls[0];
    expect(url).toBe("/api/feedback");
    expect(JSON.parse((init as RequestInit).body as string).title).toBe("Algo quebrou");
  });
  it("mailto fallback carries subject with type/version and the message", () => {
    const { payload } = buildPayload(draft, shapes, DEFAULT_MACHINE_SETTINGS);
    const m = mailtoFor(payload);
    expect(m.startsWith("mailto:pdjkleber@gmail.com?subject=")).toBe(true);
    expect(decodeURIComponent(m)).toContain("Problema / erro: Algo quebrou");
    expect(decodeURIComponent(m)).toContain("Cliquei em exportar");
  });
});
