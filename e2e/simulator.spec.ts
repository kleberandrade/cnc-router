import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

test.describe("simulator player (sprint 04)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await gotoWorkspace(page, "simulator");
  });

  test("shows total time and plays: elapsed time advances", async ({ page }) => {
    await expect(page.getByTestId("sim-total")).not.toHaveText("00:00");
    await expect(page.getByTestId("sim-elapsed")).toHaveText("00:00");
    await page.getByTestId("sim-speed").selectOption("8");
    await page.getByTestId("simulate-toggle").click();
    await expect(page.getByTestId("simulate-toggle")).toHaveText("Pausar simulação");
    await expect(page.getByTestId("sim-elapsed")).not.toHaveText("00:00", { timeout: 5000 });
  });

  test("step forward moves to the next boundary and updates the current G-code line", async ({ page }) => {
    const line = page.getByTestId("sim-line");
    const before = await line.textContent();
    await page.getByTestId("sim-step-forward").click();
    await page.getByTestId("sim-step-forward").click();
    await expect(line).not.toHaveText(before ?? "");
    const value = await page.getByTestId("sim-timeline").inputValue();
    expect(Number(value)).toBeGreaterThan(0);
  });

  test("scrubbing to the end turns the button into 'Reiniciar' and back to start resets it", async ({ page }) => {
    const slider = page.getByTestId("sim-timeline");
    const max = await slider.getAttribute("max");
    await slider.fill(max ?? "1");
    await expect(page.getByTestId("simulate-toggle")).toHaveText("Reiniciar");
    await slider.fill("0");
    await expect(page.getByTestId("simulate-toggle")).toHaveText("Simular");
  });

  test("step mode 'shape' jumps to the end of the shape", async ({ page }) => {
    await page.getByTestId("sim-step-mode").selectOption("shape");
    await page.getByTestId("sim-step-forward").click();
    await expect(page.getByTestId("sim-status")).toContainText(/deslocamento|forma 1\/1/);
  });

  test("keyboard: space toggles play", async ({ page }) => {
    await page.getByTestId("simulator-controls").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("simulate-toggle")).toHaveText("Pausar simulação");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("simulate-toggle")).toHaveText("Simular");
  });
});
