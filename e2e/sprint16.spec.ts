import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test.describe("sprint 16: operações adicionais, verificação, link", () => {
  test("extra operation: pocket + through cut on the same rectangle → both in the G-code; verification lists the pocket", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("extra-op-add").click();
    await expect(page.getByTestId("extra-op-0")).toBeVisible();
    await expect(page.getByTestId("extra-op-0-operation")).toHaveValue("pocket");
    await page.getByTestId("extra-op-0-depth").fill("4");
    await page.getByTestId("extra-op-0-depth").press("Enter");
    const dl = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    const text = await fs.readFile((await (await dl).path()) as string, "utf8");
    expect(text).toContain("Pocket clear, target depth 4mm");
    expect(text).toMatch(/G1 Z-18/); // through cut of the main outline (18 mm stock)
    // verification
    await page.getByTestId("tab-simulator").click();
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("verify-report")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".verify-table tbody tr")).toHaveCount(1);
    await expect(page.locator(".verify-table tbody tr").first()).toContainText("rebaixo");
    await expect(page.getByTestId("verify-gouge")).toContainText(/Corte fora das peças: \d+ mm²/);
    // remove the extra op
    await page.locator(".dialog-close").click();
    await page.getByTestId("tab-editor").click();
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("nav-item-0").click();
    await expect(page.getByTestId("extra-op-0")).toBeVisible();
    await page.getByTestId("extra-op-0-remove").click();
    await expect(page.getByTestId("extra-op-0")).toHaveCount(0);
  });

  test("share link round-trips the project through the URL hash", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("project-name").fill("Compartilhado");
    await page.getByTestId("project-name").press("Enter");
    await page.getByTestId("add-circle").click();
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-share").click();
    await expect(page.getByTestId("notice")).toContainText("Link do projeto copiado");
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain("#p=");
    // open in a clean page
    await page.evaluate(() => localStorage.removeItem("oficina-cnc:project"));
    await page.goto(url);
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
    await expect(page.getByTestId("project-name")).toHaveValue("Compartilhado");
    await expect(page.getByTestId("notice")).toContainText("Projeto aberto a partir do link");
    expect(page.url()).not.toContain("#p=");
  });
});
