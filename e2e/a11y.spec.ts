import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";
import AxeBuilder from "@axe-core/playwright";

const scan = async (page: import("@playwright/test").Page) => {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("canvas").analyze();
  return results.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
};

test.describe("sprint 21: acessibilidade (axe, sério/crítico)", () => {
  test("editor with a shape, side panel tabs, About dialog", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("add-rectangle").click();
    expect(await scan(page)).toEqual([]);
    await page.getByTestId("section-toggle-cut").click();
    expect(await scan(page)).toEqual([]);
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-about").click();
    expect(await scan(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await page.getByTestId("project-menu").click();
    await page.getByTestId("menu-examples").click();
    await page.getByTestId("ex-tag-encaixe").click();
    expect(await scan(page)).toEqual([]);
  });
  test("import dialog (DXF com camadas e furos)", async ({ page }) => {
    await page.goto("/app/");
    const dxf = [
      "0", "SECTION", "2", "ENTITIES",
      "0", "LWPOLYLINE", "8", "0", "90", "4", "70", "1", "10", "0", "20", "0", "10", "100", "20", "0", "10", "100", "20", "60", "10", "0", "20", "60",
      "0", "CIRCLE", "8", "0", "10", "50", "20", "30", "40", "5",
      "0", "CIRCLE", "8", "COTAS", "10", "250", "20", "30", "40", "5",
      "0", "ENDSEC", "0", "EOF", "",
    ].join("\n");
    await page.getByTestId("svg-file-input").setInputFiles({ name: "peca.dxf", mimeType: "application/dxf", buffer: Buffer.from(dxf) });
    await page.getByTestId("import-vector").waitFor();
    expect(await scan(page)).toEqual([]);
  });
  test("analysis workspace (Resistência)", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("add-rectangle").click();
    await gotoWorkspace(page, "analysis");
    await page.getByTestId("an-canvas").waitFor();
    expect(await scan(page)).toEqual([]);
  });
  test("drawing workspace (folha técnica)", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("add-rectangle").click();
    await gotoWorkspace(page, "drawing");
    await page.getByTestId("drawing-page").waitFor();
    expect(await scan(page)).toEqual([]);
  });
  test("simulator view and empty state", async ({ page }) => {
    await page.goto("/app/");
    expect(await scan(page)).toEqual([]);
    await page.getByTestId("add-rectangle").click();
    await gotoWorkspace(page, "simulator");
    await page.waitForTimeout(500);
    expect(await scan(page)).toEqual([]);
  });
});
