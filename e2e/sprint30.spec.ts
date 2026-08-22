import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

test.describe("sprint 30: estações e folha técnica na tela", () => {
  test.slow();

  test("dropdown troca as três estações e o título da aba acompanha", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await expect(page).toHaveTitle("Desenhar — Oficina CNC");
    await page.getByTestId("workspace-menu").click();
    await expect(page.getByTestId("workspace-list")).toBeVisible();
    await page.getByTestId("ws-simulator").click();
    await expect(page.getByTestId("simulator")).toBeVisible();
    await expect(page).toHaveTitle("Simular — Oficina CNC");
    await gotoWorkspace(page, "drawing");
    await expect(page.getByTestId("drawing-workspace")).toBeVisible();
    await expect(page).toHaveTitle("Folha técnica — Oficina CNC");
    await gotoWorkspace(page, "editor");
    await expect(page.getByTestId("editor-canvas")).toBeVisible();
  });

  test("estação de folha: miniaturas, troca de página, opções da ribbon", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("add-circle").click();
    await gotoWorkspace(page, "drawing");

    // folha de oficina + 2 desenhos + conjunto (as formas padrão se sobrepõem e colam)
    await expect(page.getByTestId("sheet-thumb-3")).toBeVisible();
    await expect(page.getByTestId("drawing-page")).toContainText("Chapa");
    await page.getByTestId("sheet-thumb-1").click();
    await expect(page.getByTestId("drawing-page").locator(".titleblock")).toContainText("esc. 1:1");

    // sem a folha de oficina sobram só os desenhos
    await page.getByTestId("sheet-with-setup").click();
    await expect(page.getByTestId("sheet-thumb-3")).toHaveCount(0);
    await page.getByTestId("sheet-with-setup").click();

    // zoom 100% mantém a página visível
    await page.getByTestId("sheet-zoom-full").click();
    await expect(page.getByTestId("drawing-page")).toBeVisible();
    await page.getByTestId("sheet-zoom-fit").click();
  });

  test("Ctrl+P e o menu Imprimir… levam à estação; Imprimir cria o iframe", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.keyboard.press("Control+p");
    await expect(page.getByTestId("drawing-workspace")).toBeVisible();
    await gotoWorkspace(page, "editor");
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-print").click();
    await expect(page.getByTestId("drawing-workspace")).toBeVisible();

    await expect(page.getByTestId("drawing-page")).toBeVisible();
    // stub do print do iframe: o sistema não abre diálogo em headless
    await page.addInitScript(() => {});
    await page.getByTestId("sheet-print").click();
    const frame = page.locator('iframe[data-testid="print-frame"]');
    await expect(frame).toHaveCount(1);
  });

  test("Baixar SVG entrega um .svg bem-formado da página atual", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await gotoWorkspace(page, "drawing");
    await expect(page.getByTestId("drawing-page")).toBeVisible();
    // página 0 é a folha de oficina (sem SVG único): o botão fica travado
    await expect(page.getByTestId("sheet-download-svg")).toBeDisabled();
    await page.getByTestId("sheet-thumb-1").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("sheet-download-svg").click();
    const dl = await download;
    expect(dl.suggestedFilename()).toMatch(/\.svg$/);
    const body = await (await import("node:fs/promises")).readFile(await dl.path(), "utf8");
    expect(body).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(body).toContain('viewBox="0 0 210 297"');
    expect(body).toContain("<style>");
  });

  test("projeto vazio: a estação explica em vez de mostrar folha em branco", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await gotoWorkspace(page, "drawing");
    await expect(page.getByTestId("drawing-empty")).toBeVisible();
  });
});
