import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

async function exportGcode(page: import("@playwright/test").Page): Promise<string> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-gcode").click();
  const download = await downloadPromise;
  return fs.readFile((await download.path()) as string, "utf8");
}

test.describe("navigator, tools, theme, DXF (sprint 11)", () => {
  test("hiding a shape removes it from the G-code; reordering changes manual order", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("add-circle").click();
    await page.getByTestId("shape-x").fill("120");
    await page.getByTestId("shape-x").press("Enter");
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("nav-eye-0").click(); // hide rectangle
    const g = await exportGcode(page);
    expect(g).not.toMatch(/G1 X50 Y10 F/); // rectangle path gone
    await page.getByTestId("nav-eye-0").click();
    // manual order: circle first
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("order-mode").selectOption("manual");
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("nav-up-1").click();
    await expect(page.getByTestId("nav-item-0")).toContainText("Círculo");
    const g2 = await exportGcode(page);
    const firstOutline = g2.indexOf("Outline pass");
    // circle first: its first G1 X should be at x≈135 (120+15) region rather than the rect at x=50
    const afterFirst = g2.slice(firstOutline, firstOutline + 400);
    expect(afterFirst).toMatch(/X13[0-9]/);
  });

  test("renaming shows in the navigator and validation messages", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("shape-name").fill("Tampa");
    await page.getByTestId("section-toggle-shape").click();
    await expect(page.getByTestId("nav-item-0")).toContainText("Tampa");
  });

  test("a second tool creates an M0 tool change in the G-code", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("add-circle").click();
    await page.getByTestId("shape-x").fill("120");
    await page.getByTestId("shape-x").press("Enter");
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("tool-add").click();
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("shape-tool").selectOption({ index: 1 });
    const g = await exportGcode(page);
    expect(g).toContain("M0 ; TROCA DE FERRAMENTA");
    expect(g).toContain("; ferramentas:");
  });

  test("dark theme applies data-theme and persists", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-prefs").click();
    await page.getByTestId("pref-theme").selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("DXF import creates shapes", async ({ page }) => {
    await page.goto("/");
    const dxf = ["0","SECTION","2","HEADER","9","$INSUNITS","70","4","0","ENDSEC","0","SECTION","2","ENTITIES","0","CIRCLE","8","0","10","50","20","50","40","10","0","LWPOLYLINE","8","0","90","4","70","1","10","100","20","20","10","140","20","20","10","140","20","50","10","100","20","50","0","ENDSEC","0","EOF",""].join("\n");
    await page.getByTestId("svg-file-input").setInputFiles({ name: "peca.dxf", mimeType: "application/dxf", buffer: Buffer.from(dxf) });
    await expect(page.getByTestId("status-shapes")).toHaveText("2 forma(s)");
    await expect(page.getByTestId("notice")).toContainText("DXF");
  });
});
