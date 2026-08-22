import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

test.describe("sprint 24: exemplos, galeria, ilustrações, notice compacto", () => {
  test.slow();
  test("menu opens the gallery (≥ 11 cards with thumbnails, grouped by category); example opens and simulates", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-examples").click();
    await expect(page.getByTestId("examples-gallery")).toBeVisible();
    await expect(page.getByTestId("examples-gallery")).toContainText("Casa e oficina");
    expect(await page.locator(".ex-card").count()).toBeGreaterThanOrEqual(11);
    await expect(page.locator(".ex-thumb path").first()).toBeVisible();
    await page.getByTestId("gallery-placa-pata").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("8 peças");
    await expect(page.getByTestId("notice")).toContainText("pata de cachorro");
    // gallery again, replacing the project asks first
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-examples").click();
    await page.getByTestId("gallery-tabua-carnes").click();
    await page.getByTestId("ask-ok").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("4 peças");
    await gotoWorkspace(page, "simulator");
    await expect(page.getByTestId("simulate-toggle")).toBeEnabled();
  });

  test("option illustrations mirror the selects (operation, compensation, tool type, corners)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await expect(page.getByTestId("op-icons-outline")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("op-icons-pocket").click();
    await expect(page.getByTestId("shape-operation")).toHaveValue("pocket");
    await page.getByTestId("op-icons-outline").click();
    await page.getByTestId("side-icons-inside").click();
    await expect(page.getByTestId("shape-side")).toHaveValue("inside");
    await page.getByTestId("corner-icons-fillet").click();
    await expect(page.getByTestId("corner-type")).toHaveValue("fillet");
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("tool-type-icons-vbit").click();
    await expect(page.getByTestId("tool-type")).toHaveValue("vbit");
    await page.getByTestId("entry-icons-helix").click();
    await expect(page.getByTestId("helix-entry")).toBeChecked();
    // tool change notice
    await page.getByTestId("tool-diameter").fill("4");
    await page.getByTestId("tool-diameter").press("Enter");
    await expect(page.getByTestId("notice")).toContainText("recalculados para a fresa Ø4");
    await expect(page.locator(".notice-compact")).toBeVisible();
  });
});
