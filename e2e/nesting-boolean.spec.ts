import { test, expect } from "@playwright/test";

test.describe("sprint 15: booleanas e nesting", () => {
  test("união de dois retângulos vira 1 path; subtração cria furo; undo volta", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("add-rectangle").click(); // second one spawns offset, overlapping the first
    await page.getByTestId("section-toggle-navigator").click();
    await expect(page.getByTestId("bool-union")).toBeDisabled();
    await page.keyboard.press("Control+a");
    await expect(page.getByTestId("bool-union")).toBeEnabled();
    await page.getByTestId("bool-union").click();
    await expect(page.getByTestId("notice")).toContainText("União: 1 forma");
    await expect(page.locator('[data-testid^="nav-item-"]')).toHaveCount(1);
    // undo restores both
    await page.getByTestId("undo").click();
    await expect(page.locator('[data-testid^="nav-item-"]')).toHaveCount(2);
    // difference: circle inside a rectangle → hole
    page.on("dialog", (d) => d.accept());
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-new").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("add-circle").click();
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("shape-x").fill("30"); await page.getByTestId("shape-x").press("Enter");
    await page.getByTestId("shape-y").fill("25"); await page.getByTestId("shape-y").press("Enter");
    await page.getByTestId("shape-radius").fill("5"); await page.getByTestId("shape-radius").press("Enter");
    await page.keyboard.press("Control+a");
    await page.getByTestId("bool-difference").click();
    await expect(page.getByTestId("notice")).toContainText("Subtração: 1 forma");
    await page.getByTestId("section-toggle-navigator").click();
    await expect(page.locator('[data-testid^="nav-item-"]')).toHaveCount(1);
  });

  test("organizar na chapa arruma as peças e avisa as que não cabem", async ({ page }) => {
    await page.goto("/");
    for (let i = 0; i < 6; i++) await page.getByTestId("add-rectangle").click();
    await page.getByTestId("nest").click();
    await expect(page.getByTestId("nest-dialog")).toBeVisible();
    await page.getByTestId("nest-gap").fill("3");
    await page.getByTestId("nest-apply").click();
    await expect(page.getByTestId("notice")).toContainText("6 peça(s) organizada(s)");
    // the last-added (still selected) shape is inside the stock with the 6 mm spacing (tool 3 + gap 3)
    const xs = Number(await page.getByTestId("shape-x").inputValue());
    const ys = Number(await page.getByTestId("shape-y").inputValue());
    expect(xs).toBeGreaterThanOrEqual(6);
    expect(ys).toBeGreaterThanOrEqual(6);
    expect(xs + 40).toBeLessThanOrEqual(300 - 6);
    // now something too big for the 300×200 stock
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("shape-width").fill("350"); await page.getByTestId("shape-width").press("Enter");
    await page.getByTestId("nest").click();
    await page.getByTestId("nest-apply").click();
    await expect(page.getByTestId("notice")).toContainText("1 não cabem na chapa");
  });
});
