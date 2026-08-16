import { test, expect } from "@playwright/test";

const WIDTHS = [1024, 1280, 1440, 1920];

test.describe("sprint 18: ribbon overflow and panel tabs", () => {
  for (const w of WIDTHS) {
    test(`at ${w}px every ribbon action is reachable and nothing overflows the viewport`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto("/");
      await page.getByTestId("add-rectangle").click();
      // every visible ribbon button lies inside the viewport
      const buttons = page.locator(".ribbon .rb");
      const n = await buttons.count();
      for (let i = 0; i < n; i++) {
        const box = await buttons.nth(i).boundingBox();
        expect(box, `button ${i}`).not.toBeNull();
        expect(box!.x + box!.width).toBeLessThanOrEqual(w + 1);
      }
      // "Mais" (if present) exposes the hidden actions
      const more = page.getByTestId("ribbon-more");
      if (await more.count()) {
        await more.click();
        await expect(page.locator(".ribbon-menu")).toBeVisible();
        for (const id of ["nest", "new-project"]) {
          const inMenu = page.locator(`.ribbon-menu [data-testid="${id}"]`);
          const inRibbon = page.locator(`.rgroup-items [data-testid="${id}"]`);
          expect((await inMenu.count()) + (await inRibbon.count())).toBe(1);
        }
        await page.keyboard.press("Escape");
      } else {
        await expect(page.getByTestId("nest")).toBeVisible();
      }
      // panel tabs: 4, none with clipped text (scrollWidth ≤ clientWidth)
      const tabs = page.locator(".panel-tab");
      if (w < 1100) return; // tablet layout: panel lives in the bottom sheet
      await expect(tabs).toHaveCount(4);
      const clipped = await tabs.evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
      expect(clipped).toBe(0);
    });
  }

  test("panel tabs switch sections; selecting a shape opens Peça", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("section-toggle-post").click();
    await expect(page.getByTestId("section-post")).toBeVisible();
    await expect(page.getByTestId("section-shape")).toHaveCount(0);
    await page.getByTestId("add-circle").click();
    await expect(page.getByTestId("section-shape")).toBeVisible();
    await expect(page.getByTestId("shape-radius")).toBeVisible();
    await page.getByTestId("section-toggle-cut").click();
    await expect(page.getByTestId("tool-diameter")).toBeVisible();
    await expect(page.getByTestId("cut-feedRate")).toBeVisible();
    await page.getByTestId("section-toggle-machine").click();
    await expect(page.getByTestId("stock-width")).toBeVisible();
  });

  test("no select option text is clipped in the panel (short labels + hints)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    const clipped = await page.locator(".side-panel select").evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text));
    expect(clipped).toEqual([]);
  });
});
