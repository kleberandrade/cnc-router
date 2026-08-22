import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test.describe("text & islands (sprint 13)", () => {
  test("text shape exports G-code with one outline per glyph loop and preserves counters", async ({ page }) => {
    await page.goto("/app/");
    await page.waitForTimeout(600); // fonts
    await page.getByTestId("add-text").click();
    await page.getByTestId("text-value").fill("O");
    await page.getByTestId("shape-side").selectOption("outside");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    const g = await fs.readFile((await (await downloadPromise).path()) as string, "utf8");
    // outer (+r) and inner counter (−r) → at least 2 "G0 X" rapids inside the outline block
    const block = g.slice(g.indexOf("Outline pass"));
    expect((block.match(/^G0 X/gm) ?? []).length).toBeGreaterThanOrEqual(2);
    // status shows the shape and no errors
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
  });

  test("text size via inline dimension and font/alignment fields", async ({ page }) => {
    await page.goto("/app/");
    await page.waitForTimeout(600);
    await page.getByTestId("add-text").click();
    await page.getByTestId("dim-s").fill("40");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("text-size")).toHaveValue("40");
    await page.getByTestId("text-align").selectOption("center");
    await page.getByTestId("text-font").selectOption("inter-bold");
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
  });

  test("SVG path with an inner sub-path imports as a shape with a hole and pockets around it", async ({ page }) => {
    await page.goto("/app/");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100mm" height="100mm"><path d="M10,10 H70 V60 H10 Z M30,25 H50 V45 H30 Z"/></svg>`;
    await page.getByTestId("svg-file-input").setInputFiles({ name: "furo.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) });
    await page.getByTestId("import-confirm").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("nav-item-0").dblclick();
    await page.getByTestId("shape-operation").selectOption("pocket");
    await page.getByTestId("shape-depth").fill("3");
    await page.getByTestId("shape-depth").press("Enter");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    const g = await fs.readFile((await (await downloadPromise).path()) as string, "utf8");
    // pocket rows must not pass through the island interior x∈(31.5,48.5) at y=35 (tool r=1.5)
    const rows = g.split("\n").filter((l) => /^G1 X[\d.]+ Y35(\.\d+)? F/.test(l));
    for (const l of rows) {
      const x = Number(/X([\d.]+)/.exec(l)![1]);
      expect(x <= 31.6 || x >= 48.4).toBe(true);
    }
  });
});
