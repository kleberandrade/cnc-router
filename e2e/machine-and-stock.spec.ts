import { test, expect } from "@playwright/test";

test.describe("machine & stock (sprint 01)", () => {
  test("changing the machine preset resizes the table without losing shapes", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("add-rectangle").click();
    const caption = page.locator(".editor-caption");
    await expect(caption).toContainText("Mesa 600 × 400 mm");

    await page.getByTestId("section-toggle-machine").click();
    await page.getByTestId("machine-preset").selectOption("1325");
    await expect(caption).toContainText("Mesa 1300 × 2500 mm");
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
  });

  test("a shape outside the table blocks export with an inline error", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("section-toggle-machine").click();
    await page.getByTestId("machine-preset").selectOption("custom");
    await page.getByTestId("work-width").fill("20");
    await expect(page.getByTestId("issues")).toContainText("fora da área útil");
    await page.getByTestId("export-gcode").click();
    await expect(page.getByTestId("notice")).toContainText("fora da área útil");
  });

  test("a shape outside the stock only warns and export still works", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("section-toggle-machine").click();
    await page.getByTestId("stock-width").fill("30"); // rect spans x 10..50 → outside stock but inside table
    await expect(page.getByTestId("issues")).toContainText("fora da chapa");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    await downloadPromise;
  });

  test("dragging a shape cannot leave the table", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("section-toggle-machine").click();
    await page.getByTestId("machine-preset").selectOption("3018");
    await page.getByTestId("add-circle").click();
    const canvas = page.locator(".editor-canvas canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("no canvas");
    // Circle spawns at (25,25) mm; drag it far beyond the top-right corner.
    const scaleText = await page.locator(".editor-caption").textContent();
    const scale = parseFloat(scaleText?.match(/([\d.]+) px\/mm/)?.[1] ?? "1");
    const startX = box.x + 34 + 25 * scale;
    const startY = box.y + 12 + 180 * scale - 25 * scale;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 2000, startY - 2000, { steps: 10 });
    await page.mouse.up();
    // The shape must have been clamped: no "shape outside table" error may appear.
    await expect(page.locator(".status-bar .issue-error")).toHaveCount(0);
  });
});
