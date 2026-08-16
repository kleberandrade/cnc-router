import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const scan = async (page: import("@playwright/test").Page) => {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("canvas").analyze();
  return results.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
};

test.describe("sprint 21: acessibilidade (axe, sério/crítico)", () => {
  test("editor with a shape, side panel tabs, About dialog", async ({ page }) => {
    await page.goto("/");
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
  test("simulator view and empty state", async ({ page }) => {
    await page.goto("/");
    expect(await scan(page)).toEqual([]);
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("tab-simulator").click();
    await page.waitForTimeout(500);
    expect(await scan(page)).toEqual([]);
  });
});
