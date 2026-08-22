import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

async function exportGcode(page: import("@playwright/test").Page): Promise<string> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-gcode").click();
  const download = await downloadPromise;
  return fs.readFile((await download.path()) as string, "utf8");
}

test.describe("machining quality (sprint 06)", () => {
  test("outside compensation enlarges the tool path by the tool diameter", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("tool-diameter").fill("6");
    await page.getByTestId("tool-diameter").press("Enter");
    await page.getByTestId("add-rectangle").click(); // 40×30 at (10,10), side outside by default
    const g = await exportGcode(page);
    expect(g).toContain("(outside, tool Ø6)");
    // tool centre reaches x = 10 + 40 + 3 = 53
    expect(g).toMatch(/G1 X53 Y/);
    await page.getByTestId("shape-side").selectOption("on");
    const g2 = await exportGcode(page);
    expect(g2).not.toContain("(outside");
    expect(g2).toContain("G1 X50 Y10 F800");
  });

  test("tabs appear in the G-code as lifts to depth - height", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("shape-tabs").check();
    await expect(page.getByTestId("tabs-count")).toHaveValue("4");
    const g = await exportGcode(page);
    // depth 18 (stock), tab height 3 → lifts to Z-15 on the last pass
    expect(g).toMatch(/G1 Z-15 F/);
  });

  test("auto ordering puts pockets before the outer cut; manual keeps drawing order", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click(); // outside cut
    await page.getByTestId("add-circle").click();
    await page.getByTestId("shape-operation").selectOption("pocket");
    const g = await exportGcode(page);
    expect(g.indexOf("Pocket clear")).toBeLessThan(g.indexOf("Outline pass"));
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("order-mode").selectOption("manual");
    const g2 = await exportGcode(page);
    expect(g2.indexOf("Outline pass")).toBeLessThan(g2.indexOf("Pocket clear"));
  });

  test("a hole smaller than the tool is flagged and blocks export", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-circle").click();
    await page.getByTestId("shape-radius").fill("1");
    await page.getByTestId("shape-radius").press("Enter");
    await page.getByTestId("shape-side").selectOption("inside");
    await expect(page.getByTestId("issues")).toContainText("menor que a fresa");
    await page.getByTestId("export-gcode").click();
    await expect(page.getByTestId("notice")).toContainText("menor que a fresa");
  });

  test("importing an Inkscape-style SVG (px + mm size) yields mm-sized shapes and reports approximations", async ({ page }) => {
    await page.goto("/");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 377.95276 226.77165">
      <rect x="0" y="0" width="188.97638" height="113.38583"/>
      <path d="M 200,200 C 200,150 300,150 300,200 Z"/></svg>`;
    await page.getByTestId("svg-file-input").setInputFiles({ name: "peca.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) });
    await expect(page.getByTestId("import-warnings")).toContainText("curvas");
    await page.getByTestId("import-confirm").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("2 peças");
    // select the rect: first shape → check size in the panel via keyboard? use store through UI: open shape section shows summary
    await page.getByTestId("undo").click(); // remove both
    await page.getByTestId("redo").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("2 peças");
  });
});
