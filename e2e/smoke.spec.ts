import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

/**
 * Caminho feliz completo, do zero ao G-code (Sprint 30). É o teste que responde "o app está de pé?"
 * — marcado @smoke para rodar primeiro no CI.
 */
test.describe("smoke @smoke", () => {
  test("the app loads and shows the main workspace", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("project-menu")).toContainText("Oficina CNC");
    await expect(page.getByTestId("editor-canvas")).toBeVisible();
    await expect(page.getByTestId("add-rectangle")).toBeVisible();
    await expect(page.getByTestId("export-gcode")).toBeVisible();
  });

  test("caminho feliz: exemplo → editar → simular → folha técnica → G-code", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();

    // abrir um exemplo pela galeria
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-examples").click();
    await page.getByTestId("gallery-tabua-carnes").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("4 peças");

    // editar um campo de corte (recalcula percurso no worker)
    await page.getByTestId("section-toggle-cut").click();
    await page.getByTestId("tool-diameter").fill("5");
    await page.getByTestId("tool-diameter").press("Enter");
    await expect(page.getByTestId("toolbar-estimate")).toContainText(/tempo estimado \d/);

    // simular
    await gotoWorkspace(page, "simulator");
    await expect(page.getByTestId("simulator")).toBeVisible();
    await page.getByTestId("simulate-toggle").click();
    await expect(page.getByTestId("simulate-toggle")).toHaveAttribute("aria-label", /Pausar simulação/);

    // folha técnica: páginas montam e mostram o projeto
    await gotoWorkspace(page, "drawing");
    await expect(page.getByTestId("drawing-workspace")).toBeVisible();
    await expect(page.getByTestId("drawing-page")).toContainText("Tábua", { timeout: 10_000 });

    // exportar G-code
    const download = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    expect((await download).suggestedFilename()).toMatch(/\.gcode$/);
  });
});
