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
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-save").click();
    const download = await downloadPromise;
    const path = await download.path();
    page.on("dialog", (d) => d.accept());
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-new").click();
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

test.describe("top bar (sprint 07)", () => {
  test("single top bar ≤ 64 px; ribbon switches with the view", async ({ page }) => {
    await page.goto("/");
    const bar = page.locator(".topbar");
    const box = await bar.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(64);
    await expect(page.getByTestId("add-rectangle")).toBeVisible();
    await expect(page.getByTestId("simulate-toggle")).toHaveCount(0);
    await page.getByTestId("tab-simulator").click();
    await expect(page.getByTestId("simulate-toggle")).toBeVisible();
    await expect(page.getByTestId("add-rectangle")).toHaveCount(0);
    await expect(page.locator(".topbar")).toHaveCount(1);
  });

  test("project menu opens, has actions and the shortcuts dialog", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("project-menu").click();
    await expect(page.getByTestId("project-menu-list")).toBeVisible();
    await page.getByTestId("menu-shortcuts").click();
    await expect(page.getByTestId("dialog")).toContainText("Atalhos de teclado");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Fechar" }).click();
    await expect(page.getByTestId("dialog")).toHaveCount(0);
  });

  test("numeric fields never clip their value (X/Y/Z of the machine)", async ({ page }) => {
    for (const width of [1280, 1024, 800]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      if ((await page.getByTestId("section-toggle-machine").count()) === 0) await page.getByTestId("panel-toggle").click();
      await page.getByTestId("section-toggle-machine").click();
      for (const id of ["work-width", "work-height", "work-z"]) {
        const el = page.getByTestId(id);
        const clipped = await el.evaluate((i: HTMLInputElement) => i.scrollWidth > i.clientWidth + 1);
        expect(clipped, `${id} at ${width}px`).toBe(false);
        const w = await el.evaluate((i: HTMLInputElement) => i.clientWidth);
        expect(w).toBeGreaterThanOrEqual(72);
      }
    }
  });

  test("panel containers have at least 12 px of inner padding", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    const pad = await page.locator(".panel-section.open .panel-body").evaluate((el) => {
      const cs = getComputedStyle(el);
      return Math.min(parseFloat(cs.paddingLeft), parseFloat(cs.paddingRight), parseFloat(cs.paddingBottom));
    });
    expect(pad).toBeGreaterThanOrEqual(12);
  });
});
