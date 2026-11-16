import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { put } from "@vercel/blob";
import feedback from "../feedback";

vi.mock("@vercel/blob", () => ({ put: vi.fn() }));

const origin = "https://cnc-router-ten.vercel.app";

describe("Vercel feedback Web entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns the unavailable response through the platform fetch contract", async () => {
    const response = await feedback.fetch(new Request(`${origin}/api/feedback`));
    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
    expect(put).not.toHaveBeenCalled();
  });

  it("answers production preflight without writing a feedback blob", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-only-token");
    const response = await feedback.fetch(new Request(`${origin}/api/feedback`, {
      method: "OPTIONS", headers: { origin },
    }));
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(put).not.toHaveBeenCalled();
  });

  it("returns method rejection through the same Web entry point", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-only-token");
    const response = await feedback.fetch(new Request(`${origin}/api/feedback`));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
    expect(put).not.toHaveBeenCalled();
  });
});
