import { test, expect } from "@playwright/test";

// Runs in the mobile-chrome (Pixel 7) and tablet-chrome (iPad) projects.
test.describe("responsive layouts (sprint 08)", () => {
  test("no horizontal scroll and the main flow works with taps", async ({ page, viewport }) => {
    await page.goto("/");
    const layout = await page.locator(".app").getAttribute("data-layout");
    expect(layout).toBe(viewport!.width < 768 ? "mobile" : "tablet");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);

    if (layout === "mobile") {
      await page.getByTestId("mb-add-rectangle").tap();
      await expect(page.getByTestId("status-shapes")).toContainText("1 forma(s)");
      await page.getByTestId("mb-settings").tap();
      await expect(page.getByTestId("bottom-sheet")).toBeVisible();
      await page.getByTestId("shape-depth").fill("7");
      await page.getByTestId("shape-depth").press("Enter");
      await page.getByTestId("sheet-close").tap();
      await page.getByTestId("tab-simulator").tap();
      await page.getByTestId("mb-simulate-toggle").tap();
      await expect(page.getByTestId("mb-simulate-toggle")).toHaveAttribute("aria-label", "Pausar");
    } else {
      await page.getByTestId("add-rectangle").tap();
      await expect(page.getByTestId("status-shapes")).toContainText("1 forma(s)");
      await expect(page.getByTestId("section-shape")).toHaveCount(0);
      await page.getByTestId("panel-toggle").tap();
      await expect(page.getByTestId("section-shape")).toBeVisible();
      await page.getByTestId("shape-depth").fill("7");
      await page.getByTestId("shape-depth").press("Enter");
    }
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").tap();
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toBe("projeto.gcode");
  });

  test("touch targets in the bottom bar / ribbon are at least 40 px", async ({ page, viewport }) => {
    await page.goto("/");
    const sel = viewport!.width < 768 ? ".bottom-bar .bb-btn" : ".ribbon .rb";
    const sizes = await page.locator(sel).evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => [r.width, r.height])
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const [w, h] of sizes) {
      expect(w).toBeGreaterThanOrEqual(40);
      expect(h).toBeGreaterThanOrEqual(40);
    }
  });

  test("pinch changes the editor zoom", async ({ page, viewport }) => {
    test.skip(viewport!.width >= 768, "mobile only");
    await page.goto("/");
    const canvas = page.locator(".editor-canvas canvas").first();
    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.evaluate(({ cx, cy }) => {
      const el = document.querySelector(".editor-canvas .konvajs-content") as HTMLElement;
      const mk = (type: string, pts: [number, number][]) => {
        const touches = pts.map(([x, y], i) => new Touch({ identifier: i, target: el, clientX: x, clientY: y, pageX: x, pageY: y }));
        el.dispatchEvent(new TouchEvent(type, { touches, changedTouches: touches, targetTouches: touches, bubbles: true, cancelable: true }));
      };
      mk("touchstart", [[cx - 20, cy], [cx + 20, cy]]);
      mk("touchmove", [[cx - 60, cy], [cx + 60, cy]]);
      mk("touchend", []);
    }, { cx, cy });
    const zoom = await page.evaluate(() => (window as unknown as { __zoom?: number }).__zoom ?? 1);
    expect(zoom).toBeGreaterThan(1.5);
  });
});
