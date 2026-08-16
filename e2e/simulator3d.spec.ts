import { test, expect } from "@playwright/test";

test.describe("realistic simulator (sprint 10)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-circle").click();
    await page.getByTestId("shape-operation").selectOption("pocket");
    await page.getByTestId("shape-depth").fill("4");
    await page.getByTestId("shape-depth").press("Enter");
    await page.getByTestId("tab-simulator").click();
    await page.waitForTimeout(400);
  });

  test("material is removed as time advances and restored when scrubbing back", async ({ page }) => {
    const removed = () => page.evaluate(() => (window as unknown as { __simRemoved?: number }).__simRemoved ?? 0);
    expect(await removed()).toBe(0);
    const slider = page.getByTestId("sim-timeline");
    const max = Number(await slider.getAttribute("max"));
    await slider.fill(max.toFixed(2));
    await page.waitForTimeout(300);
    const full = await removed();
    expect(full).toBeGreaterThan(1000); // mm³ — a Ø30 pocket 4 mm deep ≈ 2800 mm³
    await slider.fill((max / 2).toFixed(2));
    await page.waitForTimeout(300);
    const half = await removed();
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(full);
    await slider.fill("0");
    await page.waitForTimeout(300);
    expect(await removed()).toBe(0);
  });

  test("ViewCube faces and ribbon views move the camera", async ({ page }) => {
    const cam = () => page.evaluate(() => (window as unknown as { __simCam?: number[] }).__simCam ?? [0, 0, 0]);
    // from the default iso view the FRENTE face is visible → click it
    await page.getByTestId("viewcube-front").click();
    await page.waitForTimeout(500);
    const front = await cam();
    expect(front[1]).toBeLessThan(0);
    expect(Math.abs(front[2])).toBeLessThan(Math.abs(front[1]) * 0.1);
    await page.getByTestId("sim-top").click();
    await page.waitForTimeout(500);
    const top = await cam();
    expect(Math.abs(top[2])).toBeGreaterThan(Math.abs(top[1]) * 10); // looking straight down
    await page.getByTestId("viewcube-ortho").click();
    await expect(page.getByTestId("viewcube-ortho")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("viewcube-home").click();
    await page.waitForTimeout(400);
    const iso = await cam();
    expect(iso[2]).toBeGreaterThan(0);
  });

  test("tool type can be changed (V-bit shows angle field)", async ({ page }) => {
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("tool-type").selectOption("vbit");
    await expect(page.getByTestId("vbit-angle")).toHaveValue("90");
  });
});
