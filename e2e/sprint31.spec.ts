import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

test.describe("sprint 31: estação Resistência", () => {
  test.slow();

  test("o dropdown ganhou a quarta estação e o título acompanha", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("workspace-menu").click();
    await expect(page.getByTestId("ws-analysis")).toBeVisible();
    await page.getByTestId("ws-analysis").click();
    await expect(page.getByTestId("analysis-workspace")).toBeVisible();
    await expect(page).toHaveTitle("Resistência — Oficina CNC");
    await expect(page.getByTestId("an-disclaimer")).toContainText("orientativos");
  });

  test("análise no plano: apoiar um lado, carregar o outro, calcular no worker", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    // peça 200 × 100: com o canvas 900 × 620 (pad 40), as bordas caem em x = 40 e x = 860
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("shape-width").fill("200");
    await page.getByTestId("shape-width").press("Enter");
    await page.getByTestId("shape-height").fill("100");
    await page.getByTestId("shape-height").press("Enter");
    await gotoWorkspace(page, "analysis");

    const canvas = page.getByTestId("an-canvas");
    const box = (await canvas.boundingBox())!;
    const sx = box.width / 900, sy = box.height / 620;
    // lado esquerdo (apoiar) — a ferramenta Apoiar já vem ativa
    await canvas.click({ position: { x: 40 * sx, y: 310 * sy } });
    // lado direito (carregar)
    await page.getByTestId("an-tool-load").click();
    await canvas.click({ position: { x: 860 * sx, y: 310 * sy } });

    await page.getByTestId("an-load-kg").fill("25");
    await page.getByTestId("an-load-kg").press("Enter");
    await page.getByTestId("an-run").click();
    await expect(page.getByTestId("an-results")).toContainText("MPa", { timeout: 20_000 });
    await expect(page.getByTestId("an-results")).toContainText("mm");
    await expect(page.getByTestId("an-utilization")).toContainText("%");
    // deformada liga/desliga sem sumir com o resultado
    await page.getByTestId("an-deformed").uncheck();
    await expect(page.getByTestId("an-results")).toBeVisible();
  });

  test("calcular sem apoios explica em vez de rodar", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await gotoWorkspace(page, "analysis");
    await page.getByTestId("an-run").click();
    await expect(page.getByTestId("an-error")).toContainText("apoiado");
  });

  test("modo prateleira: flecha e veredito de vão/300", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await gotoWorkspace(page, "analysis");
    await page.getByTestId("an-mode-shelf").click();
    await page.getByTestId("an-shelf-span").fill("900");
    await page.getByTestId("an-shelf-span").press("Enter");
    await page.getByTestId("an-shelf-kg").fill("25");
    await page.getByTestId("an-shelf-kg").press("Enter");
    await page.getByTestId("an-shelf-run").click();
    await expect(page.getByTestId("an-shelf-results")).toContainText("flecha");
    await expect(page.getByTestId("an-shelf-verdict")).toContainText("vão/300");
    await expect(page.getByTestId("an-shelf-sketch")).toBeVisible();
  });

  test("a ribbon ANÁLISE calcula e limpa", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("shape-width").fill("200");
    await page.getByTestId("shape-width").press("Enter");
    await page.getByTestId("shape-height").fill("100");
    await page.getByTestId("shape-height").press("Enter");
    await gotoWorkspace(page, "analysis");
    const canvas = page.getByTestId("an-canvas");
    const box = (await canvas.boundingBox())!;
    const sx = box.width / 900, sy = box.height / 620;
    await canvas.click({ position: { x: 40 * sx, y: 310 * sy } });
    await page.getByTestId("an-tool-load").click();
    await canvas.click({ position: { x: 860 * sx, y: 310 * sy } });
    await page.getByTestId("an-run-ribbon").click();
    await expect(page.getByTestId("an-results")).toContainText("MPa", { timeout: 20_000 });
    await page.getByTestId("an-clear").click();
    await expect(page.getByTestId("an-results")).toHaveCount(0);
  });
});

test("peça pronta em 3D: alternar a vista monta o WebGL e volta", async ({ page }) => {
  await page.goto("/app/");
  await page.getByTestId("empty-close").click();
  await page.getByTestId("add-rectangle").click();
  await gotoWorkspace(page, "analysis");
  await page.getByTestId("an-view-3d").click();
  await expect(page.getByTestId("part-view-3d")).toBeVisible();
  await expect(page.getByTestId("part-view-3d").locator("canvas")).toHaveCount(1, { timeout: 15_000 });
  await page.getByTestId("an-view-2d").click();
  await expect(page.getByTestId("an-canvas")).toBeVisible();
});
