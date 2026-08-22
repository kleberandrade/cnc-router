import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

/** O fluxo do print do autor: a tábua de carnes tem cantos arredondados e um rasgo passante. */
test.describe("sprint 34: conjunto de verdade", () => {
  test.slow();

  test("tábua de carnes no Conjunto: lados marcáveis, rasgo descontado, análise roda", async ({ page }) => {
    await page.goto("/app/?exemplo=tabua-carnes");
    await expect(page.getByTestId("status-shapes")).toHaveText("4 peças");
    await gotoWorkspace(page, "analysis");
    await page.getByTestId("an-scope-assembly").click();

    // tábua 380×210 limitada pela largura do canvas: bordas em x = 40 e x = 860
    const canvas = page.getByTestId("an-canvas");
    const box = (await canvas.boundingBox())!;
    const sx = box.width / 900, sy = box.height / 620;
    await canvas.click({ position: { x: 40 * sx, y: 310 * sy } }); // lado esquerdo: apoiar
    await page.getByTestId("an-tool-load").click();
    await canvas.click({ position: { x: 860 * sx, y: 310 * sy } }); // lado direito: carregar

    await page.getByTestId("an-run").click();
    await expect(page.getByTestId("an-results")).toContainText("MPa", { timeout: 20_000 });

    // o 3D extruda o conjunto (com o rasgo da alça)
    await page.getByTestId("an-view-3d").click();
    await expect(page.getByTestId("part-view-3d").locator("canvas")).toHaveCount(1, { timeout: 15_000 });
  });

  test("a folha técnica ganha a página do conjunto montado", async ({ page }) => {
    await page.goto("/app/?exemplo=tabua-carnes");
    await expect(page.getByTestId("status-shapes")).toHaveText("4 peças");
    await gotoWorkspace(page, "drawing");
    await expect(page.getByText("Conjunto (peças coladas)").first()).toBeVisible({ timeout: 15_000 });
  });
});
