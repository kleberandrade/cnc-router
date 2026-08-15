import { test, expect } from "@playwright/test";

test.describe("materials (sprint 02)", () => {
  test("selecting aluminium sets feed 300; a manual edit survives changing material", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("section-toggle-material").click();
    await page.getByTestId("material-select").selectOption("aluminum");
    await page.getByTestId("section-toggle-cut").click();
    await expect(page.getByTestId("cut-feedRate")).toHaveValue("300");
    await page.getByTestId("cut-feedRate").fill("450");
    await expect(page.locator(".badge", { hasText: "manual" })).toBeVisible();
    await page.getByTestId("section-toggle-material").click();
    await expect(page.getByTestId("material-notes")).toContainText("Avançado");
    await page.getByTestId("material-select").selectOption("mdf");
    await page.getByTestId("section-toggle-cut").click();
    await expect(page.getByTestId("cut-feedRate")).toHaveValue("450");
    await expect(page.getByTestId("cut-spindleSpeed")).toHaveValue("18000");
    await page.getByTestId("restore-preset").click();
    await expect(page.getByTestId("cut-feedRate")).toHaveValue("1500");
  });

  test("changing the tool diameter rescales pass depth for a preset", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("section-toggle-material").click();
    await page.getByTestId("material-select").selectOption("mdf");
    await page.getByTestId("tool-diameter").fill("6");
    await page.getByTestId("section-toggle-cut").click();
    await expect(page.getByTestId("cut-passDepth")).toHaveValue("3");
    await expect(page.getByTestId("cut-stepover")).toHaveValue("3");
  });

  test("cut through keeps depth in sync with stock thickness", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("cut-through").check();
    await expect(page.getByTestId("shape-depth")).toHaveValue("18.2");
    await page.getByTestId("section-toggle-stock").click();
    await page.getByTestId("stock-thickness").fill("12");
    await page.getByTestId("section-toggle-shape").click();
    await expect(page.getByTestId("shape-depth")).toHaveValue("12.2");
  });
});
