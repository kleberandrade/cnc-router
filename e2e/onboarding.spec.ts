import { test, expect } from "@playwright/test";

test.describe("sprint 21: primeiro uso", () => {
  test("first visit shows the tour; it can be skipped and does not come back; the empty state offers examples", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("oficina-cnc:tour-done"));
    await page.reload();
    await expect(page.getByTestId("tour")).toBeVisible();
    await expect(page.getByTestId("tour-spot")).toBeVisible();
    await page.getByTestId("tour-next").click();
    await expect(page.getByTestId("tour")).toContainText("2/5");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("tour")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("tour")).toHaveCount(0);
    await expect(page.getByTestId("empty-state")).toBeVisible();
    // tour again from the menu, then finish it fully
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-tour").click();
    for (let i = 0; i < 5; i++) await page.getByTestId("tour-next").click();
    await expect(page.getByTestId("tour")).toHaveCount(0);
    // example
    await page.getByTestId("example-placa-furos").click();
    await expect(page.getByTestId("empty-state")).toHaveCount(0);
    await expect(page.getByTestId("status-shapes")).toHaveText("6 forma(s)");
    await expect(page.getByTestId("notice")).toContainText("Placa com 4 furos");
    // examples also in the menu; confirm dialog when replacing
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-examples").click();
    await page.getByTestId("gallery-letreiro").click();
    await page.getByTestId("ask-ok").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("2 forma(s)");
  });

  test("empty state can be closed and adding a rectangle from it works", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("oficina-cnc:tour-done", "1"));
    await page.reload();
    await page.getByTestId("empty-close").click();
    await expect(page.getByTestId("empty-state")).toHaveCount(0);
    await page.reload();
    await page.getByTestId("empty-add-rectangle").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
    await expect(page.getByTestId("empty-state")).toHaveCount(0);
  });

  test("preferences: density and text size change the html attributes and persist", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("oficina-cnc:tour-done", "1"));
    await page.reload();
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-prefs").click();
    await page.getByTestId("pref-density").selectOption("comfortable");
    await page.getByTestId("pref-text").selectOption("large");
    await expect(page.locator("html")).toHaveAttribute("data-density", "comfortable");
    await expect(page.locator("html")).toHaveAttribute("data-text", "large");
    const h = await page.locator(".panel-tab").first().evaluate((e) => e.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(36);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-density", "comfortable");
  });
});
