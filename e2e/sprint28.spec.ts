import { test, expect } from "@playwright/test";
import { ribbonClick } from "./helpers";

/** Minimal ENTITIES-only DXF. */
const dxfDoc = (...entities: string[][]) =>
  ["0", "SECTION", "2", "ENTITIES", ...entities.flat(), "0", "ENDSEC", "0", "EOF", ""].join("\n");

const rect = (x: number, y: number, w: number, h: number, layer = "0") => [
  "0", "LWPOLYLINE", "8", layer, "90", "4", "70", "1",
  "10", `${x}`, "20", `${y}`,
  "10", `${x + w}`, "20", `${y}`,
  "10", `${x + w}`, "20", `${y + h}`,
  "10", `${x}`, "20", `${y + h}`,
];

const circle = (x: number, y: number, r: number, layer = "0") => [
  "0", "CIRCLE", "8", layer, "10", `${x}`, "20", `${y}`, "40", `${r}`,
];

const upload = async (page: import("@playwright/test").Page, name: string, body: string) =>
  page.getByTestId("svg-file-input").setInputFiles({ name, mimeType: "application/dxf", buffer: Buffer.from(body) });

test.describe("sprint 28: traga seu desenho", () => {
  test.slow();

  test("DXF com furos entra como uma peça só, e o diálogo deixa desligar a inferência", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    // flange: chapa 100 × 60 com 3 furos
    await upload(page, "flange.dxf", dxfDoc(rect(0, 0, 100, 60), circle(20, 30, 5), circle(50, 30, 5), circle(80, 30, 5)));
    await expect(page.getByTestId("import-vector")).toBeVisible();
    await expect(page.getByTestId("import-count")).toHaveText("1 peça");
    await expect(page.getByTestId("import-infer-holes")).toBeChecked();

    // desligar a inferência devolve os 4 laços soltos, sem reabrir o arquivo
    await page.getByTestId("import-infer-holes").uncheck();
    await expect(page.getByTestId("import-count")).toHaveText("4 peças");
    await page.getByTestId("import-infer-holes").check();
    await expect(page.getByTestId("import-count")).toHaveText("1 peça");

    // nada entra na chapa antes de confirmar
    await expect(page.getByTestId("status-shapes")).toHaveText("0 peças");
    await page.getByTestId("import-confirm").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
    await expect(page.getByTestId("notice")).toContainText("3 furos");
  });

  test("camadas desmarcadas ficam de fora", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await upload(page, "cotado.dxf", dxfDoc(rect(0, 0, 100, 60), circle(50, 30, 5), rect(200, 0, 30, 30, "COTAS")));
    await expect(page.getByTestId("import-layers")).toBeVisible();
    await expect(page.getByTestId("import-count")).toHaveText("2 peças");
    await page.getByTestId("import-layer-COTAS").uncheck();
    await expect(page.getByTestId("import-count")).toHaveText("1 peça");
    await page.getByTestId("import-confirm").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
  });

  // retângulo em (4, 2): em mm o canto fica em x = 4; lido como polegadas, em x = 101,6
  const inchDoc = dxfDoc(rect(4, 2, 4, 2));

  test("sem sobrescrever, o desenho entra como está no arquivo", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await upload(page, "pol.dxf", inchDoc);
    await page.getByTestId("import-confirm").click();
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("nav-item-0").dblclick();
    await expect(page.getByTestId("shape-x")).toHaveValue(/^4([.,]0*)?$/);
  });

  test("unidade do desenho pode ser sobrescrita no diálogo", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await upload(page, "pol.dxf", inchDoc);
    await page.getByTestId("import-unit").selectOption("25.4");
    await page.getByTestId("import-confirm").click();
    await page.getByTestId("section-toggle-shape").click();
    await page.getByTestId("nav-item-0").dblclick();
    await expect(page.getByTestId("shape-x")).toHaveValue(/101[.,]6/);
  });

  test("explodir texto: vira contornos editáveis e some da fonte", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await ribbonClick(page, "add-text");
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
    await page.getByTestId("section-toggle-shape").click();
    await expect(page.getByTestId("text-value")).toBeVisible();

    await page.getByTestId("explode-text").click();
    await expect(page.getByTestId("notice")).toContainText("contorno");
    // "Texto" na Inter rende 6 contornos (o "x" sai em duas partes); o painel deixa de mostrar campos de texto
    await expect(page.getByTestId("status-shapes")).toHaveText("6 peças");
    await expect(page.getByTestId("text-value")).toHaveCount(0);

    // um desfazer devolve o texto inteiro
    await page.getByTestId("undo").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
  });

  test("carregar fonte própria pelo painel", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await ribbonClick(page, "add-text");
    await page.getByTestId("section-toggle-shape").click();
    const ttf = await page.request.get("/fonts/Inter-Bold.ttf");
    await page.getByTestId("font-file-input").setInputFiles({
      name: "Minha Fonte.ttf", mimeType: "font/ttf", buffer: await ttf.body(),
    });
    await expect(page.getByTestId("notice")).toContainText("Minha Fonte");
    await expect(page.getByTestId("text-font")).toHaveValue("user:minha fonte");
    // a fonte fica na lista para as próximas peças
    await expect(page.getByTestId("text-font")).toContainText("Minha Fonte");
  });
});
