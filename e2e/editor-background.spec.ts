import { test, expect } from "@playwright/test";

test("editing parts preserves the background drawing while zoom redraws it", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { __canvasClears: WeakMap<HTMLCanvasElement, number> };
    state.__canvasClears = new WeakMap();
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      state.__canvasClears.set(this.canvas, (state.__canvasClears.get(this.canvas) ?? 0) + 1);
      return clear.call(this, x, y, width, height);
    };
  });
  await page.goto("/app/");
  await page.getByTestId("add-rectangle").click();
  const background = page.locator(".editor-canvas canvas").first();
  const clears = () => background.evaluate((canvas) =>
    (window as unknown as { __canvasClears: WeakMap<HTMLCanvasElement, number> }).__canvasClears.get(canvas as HTMLCanvasElement) ?? 0);
  await expect.poll(clears).toBeGreaterThan(0);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => {
    const before = await clears();
    await page.waitForTimeout(100);
    return (await clears()) - before;
  }).toBe(0);
  const beforeEdit = await clears();
  await page.getByTestId("add-circle").click();
  await expect(page.getByTestId("status-shapes")).toHaveText("2 peças");
  await page.waitForTimeout(200);
  expect(await clears()).toBe(beforeEdit);
  await page.getByTestId("editor-canvas").hover();
  await page.mouse.wheel(0, -100);
  await expect.poll(clears).toBeGreaterThan(beforeEdit);
});
