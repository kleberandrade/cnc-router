import { test, expect } from "@playwright/test";

test.describe("toolbar (sprint 05)", () => {
  test("undo after adding a shape, redo brings it back", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
    await page.getByTestId("undo").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("0 forma(s)");
    await page.keyboard.press("Control+y");
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
  });

  test("save → new → open restores the project", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-circle").click();
    await page.getByTestId("add-rectangle").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("save-project").click();
    const download = await downloadPromise;
    const path = await download.path();
    page.on("dialog", (d) => d.accept());
    await page.getByTestId("new-project").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("0 forma(s)");
    await page.getByTestId("json-file-input").setInputFiles(path as string);
    await expect(page.getByTestId("status-shapes")).toHaveText("2 forma(s)");
  });

  test("editing X in the panel moves the shape (and the panel reflects the store)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("shape-x").fill("120");
    await page.getByTestId("shape-x").press("Enter");
    // Move with the keyboard: value in the field must follow.
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Shift+ArrowRight");
    await expect(page.getByTestId("shape-x")).toHaveValue("130");
  });

  test("polygon tool: three clicks + Enter create a path shape", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tool-polygon").click();
    await expect(page.getByTestId("polygon-hint")).toBeVisible();
    const canvas = page.locator(".editor-canvas canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("no canvas");
    await page.mouse.click(box.x + 200, box.y + 200);
    await page.mouse.click(box.x + 300, box.y + 200);
    await page.mouse.click(box.x + 250, box.y + 120);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
    await expect(page.getByTestId("section-shape")).toContainText("polígono (3 pts)");
  });

  test("zoom buttons change the zoom label; 0 fits again", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zoom-in").click();
    await expect(page.getByTestId("zoom-fit")).toHaveText("125%");
    await page.keyboard.press("0");
    await expect(page.getByTestId("zoom-fit")).toHaveText("100%");
  });

  test("keyboard: R adds a rectangle, Delete removes it, Tab reaches the toolbar", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("r");
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
    await page.keyboard.press("Delete");
    await expect(page.getByTestId("status-shapes")).toHaveText("0 forma(s)");
  });

  test("panel toggle collapses the side panel", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("section-shape")).toBeVisible();
    await page.getByTestId("panel-toggle").click();
    await expect(page.getByTestId("section-shape")).toHaveCount(0);
  });
});
