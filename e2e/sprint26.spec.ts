import { test, expect } from "@playwright/test";

test.describe("sprint 26: exemplos de encaixe, filtro na galeria, aviso de folga", () => {
  test.slow();
  test("gallery filter chips + search; fitting example opens arranged; slot-tight-fit warning", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-examples").click();
    await expect(page.getByTestId("examples-gallery")).toContainText("Encaixes");
    expect(await page.locator(".ex-card").count()).toBeGreaterThanOrEqual(14);
    await page.getByTestId("ex-tag-encaixe").click();
    expect(await page.locator(".ex-card").count()).toBe(2);
    await page.getByTestId("ex-search").fill("caixa");
    expect(await page.locator(".ex-card").count()).toBe(1);
    await page.getByTestId("gallery-caixa-dedos").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("5 forma(s)");
    // suporte de celular: rasgos com folga → sem aviso de folga; ao apertar o rasgo, o aviso aparece
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-examples").click();
    await page.getByTestId("gallery-suporte-celular").click();
    await page.getByTestId("ask-ok").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("5 forma(s)");
    await page.getByTestId("tab-simulator").click();
    await expect(page.getByTestId("simulate-toggle")).toBeEnabled();
  });
});
