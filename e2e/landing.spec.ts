import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("sprint 32: landing page", () => {
  test("carrega leve, com cover, seções e footer; Iniciar entra no app", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Oficina CNC/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("veja o corte antes");
    // navbar fixa com navegação por seção
    const nav = page.getByTestId("landing-nav");
    await expect(nav).toBeVisible();
    await nav.getByText("Folha técnica").click();
    await expect(page).toHaveURL(/#folha-tecnica$/);
    expect(await page.locator("header.top").evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    // seções essenciais presentes
    await expect(page.getByText("Três passos, nenhuma instalação")).toBeVisible();
    await expect(page.getByText("Folha técnica que vai para o lado da máquina")).toBeVisible();
    await expect(page.getByText("A peça aguenta? A análise de resistência responde")).toBeVisible();
    await expect(page.getByText("Para quem é (e o que não é)")).toBeVisible();
    // footer com legal e contato
    await expect(page.locator("footer")).toContainText("Privacidade");
    await expect(page.locator("footer")).toContainText("pdjkleber@gmail.com");
    await expect(page.locator("footer")).toContainText(/v\d+\.\d+\.\d+/); // versão injetada no build

    await page.getByTestId("landing-start").click();
    await expect(page).toHaveURL(/\/app\/$/);
    await expect(page.getByTestId("editor-canvas")).toBeVisible();
  });

  test("link de compartilhamento antigo redireciona e abre o projeto", async ({ page }) => {
    // o formato que circula por aí: /#p=<projeto comprimido> apontando para a raiz
    const lz = (await import("lz-string")).default;
    const packed = lz.compressToEncodedURIComponent(JSON.stringify({
      app: "oficina-cnc", version: 99, savedAt: "2026-08-22",
      shapes: [{ id: "c1", kind: "circle", x: 30, y: 30, radius: 9, depth: 5, operation: "outline" }],
      settings: {},
    }));
    await page.goto(`/#p=${packed}`);
    await expect(page).toHaveURL(/\/app\/(#|$)/);
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
  });

  test("âncoras legais antigas chegam ao diálogo do app", async ({ page }) => {
    await page.goto("/#privacidade");
    await expect(page).toHaveURL(/\/app\//);
    await expect(page.getByTestId("dialog")).toContainText("Política de privacidade");
  });

  test("?galeria=1 abre a galeria; ?exemplo= abre a peça (e limpa a URL)", async ({ page }) => {
    await page.goto("/app/?galeria=1");
    await expect(page.getByTestId("examples-gallery")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/app/?exemplo=tabua-carnes");
    await expect(page.getByTestId("status-shapes")).toHaveText("4 peças");
    expect(new URL(page.url()).search).toBe("");
  });

  test("?exemplo= com peças na mesa pede confirmação", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.goto("/app/?exemplo=tabua-carnes");
    await expect(page.getByTestId("ask-dialog")).toContainText("Tábua de carnes");
    await page.getByTestId("ask-ok").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("4 peças");
  });

  test("acessibilidade da landing (axe, sério/crítico)", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(bad.map((v) => v.id)).toEqual([]);
  });
});

test("menu do app tem o caminho de volta para o site", async ({ page }) => {
  await page.goto("/app/");
  await page.getByTestId("empty-close").click();
  await page.getByTestId("project-menu").click();
  await page.getByTestId("menu-site").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("landing-start")).toBeVisible();
});
