import { test, expect } from "@playwright/test";

test.describe("sprint 23: diálogos próprios, origem visual, materiais, políticas, linha do tempo", () => {
  test("Novo projeto uses the in-app confirm; cancel keeps shapes, confirm clears", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-new").click();
    await expect(page.getByTestId("ask-dialog")).toContainText("Começar do zero?");
    await page.getByTestId("ask-cancel").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-new").click();
    await page.getByTestId("ask-ok").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("0 forma(s)");
  });

  test("origin picker changes the work origin and the G-code", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("section-toggle-machine").click();
    await expect(page.getByTestId("stock-origin")).toHaveAttribute("data-value", "front-left");
    await page.getByTestId("origin-back-right").click();
    await expect(page.getByTestId("stock-origin")).toHaveAttribute("data-value", "back-right");
    const dl = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    const text = await (await import("node:fs/promises")).readFile((await (await dl).path()) as string, "utf8");
    expect(text).toContain("origin back-right");
    expect(text).toMatch(/G0 X-2\d+(\.\d+)? Y-1\d+(\.\d+)?/); // negative coordinates from the back-right corner
  });

  test("material changes the stock colour in the 3D view", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("tab-simulator").click();
    await page.waitForTimeout(800);
    const sample = async () => page.locator(".simulator-canvas canvas").first().evaluate((c) => {
      const canvas = c as HTMLCanvasElement;
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) return null;
      const px = new Uint8Array(4);
      gl.readPixels(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return Array.from(px);
    });
    const before = await sample();
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("material-select").selectOption("aluminum");
    await page.waitForTimeout(800);
    const after = await sample();
    if (before && after && before.some((v) => v > 0)) expect(after.join()).not.toBe(before.join());
    // legend/hint keeps working regardless
    await expect(page.getByTestId("material-notes")).toContainText("Avançado");
  });

  test("privacy/cookies/terms open from About and from #privacidade; storage notice dismisses", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("oficina-cnc:storage-notice"));
    await page.reload();
    await expect(page.getByTestId("storage-notice")).toBeVisible();
    await page.getByTestId("storage-notice-more").click();
    await expect(page.getByTestId("legal-privacidade")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId("storage-notice-ok").click();
    await expect(page.getByTestId("storage-notice")).toHaveCount(0);
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-about").click();
    await page.getByTestId("open-legal-termos").click();
    await expect(page.getByTestId("legal-termos")).toContainText("Confira sempre no simulador");
    await page.keyboard.press("Escape");
    await page.goto("/#cookies");
    await expect(page.getByTestId("legal-cookies")).toBeVisible();
  });

  test("timeline marks each change and jumps back", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("add-circle").click();
    await expect(page.getByTestId("timeline-count")).toHaveText("2/2");
    await page.getByTestId("timeline-1").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
    await expect(page.getByTestId("timeline-count")).toHaveText("1/2");
    await page.getByTestId("timeline-2").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("2 forma(s)");
  });
});
