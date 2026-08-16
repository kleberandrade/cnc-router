import { test, expect } from "@playwright/test";
import { alignClick } from "./helpers";
import fs from "node:fs/promises";

async function exportGcode(page: import("@playwright/test").Page): Promise<string> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-gcode").click();
  const download = await downloadPromise;
  return fs.readFile((await download.path()) as string, "utf8");
}

test.describe("shapes & canvas editing (sprint 09)", () => {
  test("rectangle with fillet keeps 40×30 bbox and G-code has arcs (many short moves)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("shape-side").selectOption("on");
    const sharp = await exportGcode(page);
    await page.getByTestId("corner-type").selectOption("fillet");
    await page.getByTestId("corner-size").fill("5");
    await page.getByTestId("corner-size").press("Enter");
    const round = await exportGcode(page);
    expect(round.split("\n").filter((l) => l.startsWith("G1 X")).length).toBeGreaterThan(sharp.split("\n").filter((l) => l.startsWith("G1 X")).length + 10);
    // bbox unchanged: extreme X still 10..50 (rect at x=10 w=40)
    expect(round).toMatch(/G1 X50 Y/);
    expect(round).not.toMatch(/G1 X10 Y10 F/); // sharp corner point gone
  });

  test("regular polygon and slot can be created and edited numerically", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-ngon").click();
    await expect(page.getByTestId("shape-sides")).toHaveValue("6");
    await page.getByTestId("shape-sides").fill("8");
    await page.getByTestId("shape-sides").press("Enter");
    await page.getByTestId("add-slot").click();
    await expect(page.getByTestId("shape-length")).toHaveValue("50");
    await expect(page.getByTestId("status-shapes")).toHaveText("2 forma(s)");
  });

  test("inline dimensions: typing L Tab A Enter resizes the rectangle", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await expect(page.getByTestId("inline-dims")).toBeVisible();
    await page.getByTestId("dim-w").fill("70");
    await page.keyboard.press("Tab");
    await page.getByTestId("dim-h").fill("25");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("shape-width")).toHaveValue("70");
    await expect(page.getByTestId("shape-height")).toHaveValue("25");
  });

  test("dragging a transformer handle changes the width", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    // rectangle 40×30 at (10,10). Find right-middle anchor: compute px via caption scale.
    const canvas = page.locator(".editor-canvas canvas").first();
    const box = (await canvas.boundingBox())!;
    const caption = await page.locator(".editor-caption").textContent();
    const scale = parseFloat(caption!.match(/([\d.]+) px\/mm/)![1]);
    const ox = box.x + 34, oyBottom = box.y + 12 + 400 * scale; // table origin px (RULER+PADDING, PADDING) for 600×400 table
    const rightMid = { x: ox + 50 * scale, y: oyBottom - 25 * scale };
    await page.mouse.move(rightMid.x, rightMid.y);
    await page.mouse.down();
    await page.mouse.move(rightMid.x + 20 * scale, rightMid.y, { steps: 6 });
    await page.mouse.up();
    const w = Number(await page.getByTestId("shape-width").inputValue());
    expect(w).toBeGreaterThan(55);
    expect(w).toBeLessThan(65);
  });

  test("snap: dragging a shape near the stock centre aligns its centre", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-circle").click(); // r=15 at (25,25)
    const canvas = page.locator(".editor-canvas canvas").first();
    const box = (await canvas.boundingBox())!;
    const caption = await page.locator(".editor-caption").textContent();
    const scale = parseFloat(caption!.match(/([\d.]+) px\/mm/)![1]);
    const ox = box.x + 34, oyBottom = box.y + 12 + 400 * scale;
    const from = { x: ox + 25 * scale, y: oyBottom - 25 * scale };
    // stock centre is (150,100); drop 2 mm off
    const to = { x: ox + 152 * scale, y: oyBottom - 98 * scale };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    await expect(page.getByTestId("shape-x")).toHaveValue("150");
    await expect(page.getByTestId("shape-y")).toHaveValue("100");
  });

  test("marquee selects several shapes; align left and Delete act on all", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("add-circle").click();
    await page.getByTestId("shape-x").fill("120");
    await page.getByTestId("shape-x").press("Enter");
    const canvas = page.locator(".editor-canvas canvas").first();
    const box = (await canvas.boundingBox())!;
    const caption = await page.locator(".editor-caption").textContent();
    const scale = parseFloat(caption!.match(/([\d.]+) px\/mm/)![1]);
    const ox = box.x + 34, oyBottom = box.y + 12 + 400 * scale;
    await page.mouse.move(ox + 250 * scale, oyBottom - 150 * scale);
    await page.mouse.down();
    await page.mouse.move(ox + 2 * scale, oyBottom - 2 * scale, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId("multi-summary")).toContainText("2 formas");
    await alignClick(page, "align-left");
    await page.getByTestId("shape-x").waitFor({ state: "detached" });
    // both now share minX = 10 → delete both
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Delete");
    await expect(page.getByTestId("status-shapes")).toHaveText("0 forma(s)");
  });
});
