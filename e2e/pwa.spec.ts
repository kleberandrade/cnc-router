import { test, expect } from "@playwright/test";

test.describe("PWA (sprint 08)", () => {
  test("serves a valid manifest and registers a service worker; fonts are self-hosted", async ({ page, request }) => {
    await page.goto("/");
    const link = page.locator('link[rel="manifest"]');
    await expect(link).toHaveCount(1);
    const href = await link.getAttribute("href");
    const res = await request.get(href!);
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.name).toBe("Oficina CNC");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
    const registered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "unsupported";
      const reg = await navigator.serviceWorker.ready;
      return reg.active ? "active" : "none";
    });
    expect(["active", "unsupported"]).toContain(registered);
    expect(await page.content()).not.toContain("fonts.googleapis.com");
  });

  test("works offline after the first visit (service worker precache)", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForTimeout(800);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId("project-menu")).toBeVisible();
    await page.getByTestId("add-rectangle").click();
    await expect(page.getByTestId("status-shapes")).toContainText("1 peça");
    await context.setOffline(false);
  });
});
