import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("the app loads and shows the main workspace", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("project-menu")).toContainText("Oficina CNC");
    await expect(page.getByTestId("editor-canvas")).toBeVisible();
    await expect(page.getByTestId("add-rectangle")).toBeVisible();
    await expect(page.getByTestId("export-gcode")).toBeVisible();
  });

  test("switching to the simulator tab renders the 3D view", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tab-simulator").click();
    await expect(page.getByTestId("simulator")).toBeVisible();
  });
});
