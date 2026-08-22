import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";
import { readFileSync } from "node:fs";

test.describe("sprint 25: importar imagem (silhueta e relevo), exemplos de imagem, contorno paralelo", () => {
  test.slow();
  test("PNG → silhueta vira peça; PNG → relevo vira ReliefShape e simula", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    const png = readFileSync("public/examples/raposa.png");
    // silhouette
    await page.getByTestId("project-menu").click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTestId("menu-import").click();
    await (await chooser).setFiles({ name: "raposa.png", mimeType: "image/png", buffer: png });
    await expect(page.getByTestId("import-image")).toBeVisible();
    await expect(page.getByTestId("ii-preview")).toBeVisible();
    await page.getByTestId("ii-apply").click();
    await expect(page.getByTestId("import-image")).toHaveCount(0);
    await expect(page.getByTestId("status-shapes")).toContainText("peça");
    await expect(page.getByTestId("notice")).toContainText("vieram de");
    // relief
    await page.getByTestId("project-menu").click();
    const chooser2 = page.waitForEvent("filechooser");
    await page.getByTestId("menu-import").click();
    await (await chooser2).setFiles({ name: "relevo.png", mimeType: "image/png", buffer: png });
    await page.getByTestId("ii-mode-relief").click();
    await page.getByTestId("ii-apply").click();
    await expect(page.getByTestId("notice")).toContainText("Relevo importado");
    await expect(page.getByTestId("relief-invert")).toBeVisible();
    await gotoWorkspace(page, "simulator");
    await expect(page.getByTestId("simulate-toggle")).toBeEnabled();
  });

  test("gallery has image examples; pocket strategy select mirrors icons", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-examples").click();
    await page.getByTestId("gallery-pratinho-relevo").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("2 peças");
    await page.getByTestId("section-toggle-cut").click();
    await expect(page.getByTestId("pocket-strategy")).toHaveValue("contour");
    await page.getByTestId("pocket-icons-zigzag").click();
    await expect(page.getByTestId("pocket-strategy")).toHaveValue("zigzag");
  });
});
