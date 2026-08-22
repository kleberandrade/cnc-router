import { test, expect } from "@playwright/test";

test.describe("sprint 20: sugestões e problemas", () => {
  test("form validates, sends to /api/feedback and shows the reference id", async ({ page }) => {
    let received: unknown = null;
    await page.route("**/api/feedback", async (route) => {
      received = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: "e2e123", receivedAt: "2026-08-16T00:00:00Z" }) });
    });
    await page.goto("/app/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-feedback").click();
    await expect(page.getByTestId("feedback-form")).toBeVisible();
    await expect(page.getByTestId("fb-send")).toBeDisabled();
    await page.getByTestId("fb-type").selectOption("problema");
    await page.getByTestId("fb-title").fill("Botão não responde");
    await page.getByTestId("fb-message").fill("Cliquei em exportar duas vezes e nada aconteceu.");
    await expect(page.getByTestId("fb-preview")).toContainText(/1 peça/);
    await page.getByTestId("fb-project").check();
    await expect(page.getByTestId("fb-send")).toBeEnabled();
    await page.getByTestId("fb-send").click();
    await expect(page.getByTestId("feedback-sent")).toBeVisible();
    await expect(page.getByTestId("feedback-id")).toHaveText("e2e123");
    const r = received as { type: string; title: string; website: string; diagnostics: { project: { shapes: number } }; project: { shapes: unknown[] } };
    expect(r.type).toBe("problema");
    expect(r.title).toBe("Botão não responde");
    expect(r.website).toBe("");
    expect(r.diagnostics.project.shapes).toBe(1);
    expect(r.project.shapes).toHaveLength(1);
  });

  test("when the channel is not configured (501) the form offers e-mail; About links to the form", async ({ page }) => {
    await page.route("**/api/feedback", (route) => route.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ error: "no token" }) }));
    await page.goto("/app/");
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-about").click();
    await page.getByTestId("about-feedback").click();
    await expect(page.getByTestId("feedback-form")).toBeVisible();
    await page.getByTestId("fb-title").fill("Uma sugestão");
    await page.getByTestId("fb-message").fill("Seria bom ter atalhos configuráveis.");
    await page.getByTestId("fb-send").click();
    await expect(page.getByTestId("fb-error")).toContainText("não está ativo");
    const href = await page.getByTestId("fb-mailto").getAttribute("href");
    expect(href).toMatch(/^mailto:pdjkleber@gmail\.com\?subject=/);
    expect(decodeURIComponent(href!)).toContain("Uma sugestão");
  });

  test("offline: sending is refused with a clear message", async ({ page, context }) => {
    await page.goto("/app/");
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-feedback").click();
    await page.getByTestId("fb-title").fill("Sem rede");
    await page.getByTestId("fb-message").fill("Tentando enviar sem conexão nenhuma.");
    await context.setOffline(true);
    await page.getByTestId("fb-send").click();
    await expect(page.getByTestId("fb-error")).toContainText("offline");
    await context.setOffline(false);
  });
});
