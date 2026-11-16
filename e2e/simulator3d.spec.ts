import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

test.describe("realistic simulator (sprint 10)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("add-circle").click();
    await page.getByTestId("shape-operation").selectOption("pocket");
    await page.getByTestId("shape-depth").fill("4");
    await page.getByTestId("shape-depth").press("Enter");
    await gotoWorkspace(page, "simulator");
    await page.waitForTimeout(400);
  });

  test("material is removed as time advances and restored when scrubbing back", async ({ page }) => {
    const removed = () => page.evaluate(() => (window as unknown as { __simRemoved?: number }).__simRemoved ?? 0);
    expect(await removed()).toBe(0);
    const slider = page.getByTestId("sim-timeline");
    const max = Number(await slider.getAttribute("max"));
    // set the range value natively (Chromium rejects fill() values that don't sit exactly on the step grid)
    const setValue = (v: string) => slider.evaluate((el, val) => {
      const input = el as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, val);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, v);
    await setValue(max.toFixed(2));
    await page.waitForTimeout(300);
    const full = await removed();
    expect(full).toBeGreaterThan(1000); // mm³ — a Ø30 pocket 4 mm deep ≈ 2800 mm³
    await setValue((max / 2).toFixed(2));
    await page.waitForTimeout(300);
    const half = await removed();
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(full);
    await setValue("0");
    await page.waitForTimeout(300);
    expect(await removed()).toBe(0);
  });

  test("ViewCube faces and ribbon views move the camera", async ({ page }) => {
    const cam = () => page.evaluate(() => (window as unknown as { __simCam?: number[] }).__simCam ?? [0, 0, 0]);
    // from the default iso view the FRENTE face is visible → click it
    await page.getByTestId("viewcube-front").click({ force: true });
    await expect.poll(async () => {
      const [, y, z] = await cam();
      return y < 0 && Math.abs(z) < Math.abs(y) * 0.1;
    }).toBe(true);
    await page.getByTestId("sim-top").click();
    await expect.poll(async () => {
      const [, y, z] = await cam();
      return Math.abs(z) > Math.abs(y) * 10; // looking straight down
    }).toBe(true);
    await page.getByTestId("viewcube-ortho").click({ force: true });
    await expect(page.getByTestId("viewcube-ortho")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("viewcube-home").click({ force: true });
    await expect.poll(async () => {
      const [x, y, z] = await cam();
      return x > 0 && y < 0 && z > 0 && z < Math.abs(y) * 2;
    }).toBe(true);
  });

  test("tool type can be changed (V-bit shows angle field)", async ({ page }) => {
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("tool-type").selectOption("vbit");
    await expect(page.getByTestId("vbit-angle")).toHaveValue("90");
  });
});
