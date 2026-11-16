import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

/** Duas chapas 100×80 lado a lado; `gap` separa a segunda (0 = encostadas). */
async function twoParts(page: import("@playwright/test").Page, gap: number) {
  await page.goto("/app/");
  await page.getByTestId("empty-close").click();
  await page.getByTestId("add-rectangle").click();
  await page.getByTestId("section-toggle-shape").click();
  await page.getByTestId("shape-width").fill("100");
  await page.getByTestId("shape-width").press("Enter");
  await expect(page.getByTestId("shape-width")).toHaveValue("100");
  await page.getByTestId("shape-height").fill("80");
  await page.getByTestId("shape-height").press("Enter");
  await page.getByTestId("shape-x").fill("0");
  await page.getByTestId("shape-x").press("Enter");
  await page.getByTestId("shape-y").fill("0");
  await page.getByTestId("shape-y").press("Enter");
  await page.getByTestId("add-rectangle").click();
  await page.getByTestId("shape-width").fill("100");
  await page.getByTestId("shape-width").press("Enter");
  await expect(page.getByTestId("shape-width")).toHaveValue("100");
  await page.getByTestId("shape-height").fill("80");
  await page.getByTestId("shape-height").press("Enter");
  await page.getByTestId("shape-x").fill(String(100 + gap));
  await page.getByTestId("shape-x").press("Enter");
  await page.getByTestId("shape-y").fill("0");
  await page.getByTestId("shape-y").press("Enter");
}

test.describe("sprint 33: resistência no conjunto", () => {
  test.slow();

  test("peças encostadas: o conjunto cola, calcula e aparece em 3D", async ({ page }) => {
    await twoParts(page, 0);
    await gotoWorkspace(page, "analysis");
    await page.getByTestId("an-scope-assembly").click();

    // conjunto 200 × 80 no canvas 900 × 620 (pad 40): bordas em x = 40 e x = 860
    const canvas = page.getByTestId("an-canvas");
    const box = (await canvas.boundingBox())!;
    const sx = box.width / 900, sy = box.height / 620;
    await canvas.click({ position: { x: 40 * sx, y: 310 * sy } }); // apoiar (ferramenta padrão)
    await page.getByTestId("an-tool-load").click();
    await canvas.click({ position: { x: 860 * sx, y: 310 * sy } });

    await page.getByTestId("an-load-kg").fill("20");
    await page.getByTestId("an-load-kg").press("Enter");
    await page.getByTestId("an-run").click();
    await expect(page.getByTestId("an-results")).toContainText("MPa", { timeout: 20_000 });
    await expect(page.getByTestId("an-disclaimer")).toContainText("cola ideal");

    // o 3D do conjunto é a extrusão da região colada
    await page.getByTestId("an-view-3d").click();
    await expect(page.getByTestId("part-view-3d").locator("canvas")).toHaveCount(1, { timeout: 15_000 });
  });

  test("peças afastadas: a estação explica os grupos em vez de calcular", async ({ page }) => {
    await twoParts(page, 50);
    await gotoWorkspace(page, "analysis");
    await page.getByTestId("an-scope-assembly").click();
    await expect(page.getByTestId("an-scope-warn")).toContainText("grupos separados");
    await page.getByTestId("an-run").click();
    await expect(page.getByTestId("an-error")).toContainText("grupos separados");
    // voltando para Uma peça, o seletor de peça reaparece
    await page.getByTestId("an-scope-part").click();
    await expect(page.getByTestId("an-shape")).toBeVisible();
    await expect(page.getByTestId("an-canvas")).toBeVisible();
  });
});
