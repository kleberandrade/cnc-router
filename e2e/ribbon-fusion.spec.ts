import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test.describe("sprint 22: barra estilo Fusion", () => {
  test("tabs switch the ribbon; group title opens a menu that triggers actions; ribbon minimizes", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await expect(page.getByTestId("ribbon-tab-formas")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("add-rectangle")).toBeVisible();
    // group menu with shortcuts
    await page.getByTestId("group-criar").click();
    await expect(page.getByTestId("add-circle-gm")).toBeVisible();
    await expect(page.getByTestId("add-circle-gm")).toContainText("C");
    await page.getByTestId("add-circle-gm").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 forma(s)");
    // usinagem tab mirrors the selection
    await page.getByTestId("ribbon-tab-usinagem").click();
    await expect(page.getByTestId("op-outline")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("op-pocket").click();
    await expect(page.getByTestId("shape-operation")).toHaveValue("pocket");
    await page.getByTestId("op-outline").click();
    await page.getByTestId("side-inside").click();
    await expect(page.getByTestId("shape-side")).toHaveValue("inside");
    // vista tab
    await page.getByTestId("ribbon-tab-vista").click();
    await expect(page.getByTestId("zoom-fit")).toBeVisible();
    // minimize by double click, restore by clicking the tab
    await page.getByTestId("ribbon-tab-vista").dblclick();
    await expect(page.locator(".topbar .ribbon")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".topbar .ribbon")).toHaveCount(0); // persisted
    await page.getByTestId("ribbon-tab-formas").click();
    await expect(page.locator(".topbar .ribbon")).toBeVisible();
    // Selecionar always at the right
    const sel = await page.getByTestId("tool-select").boundingBox();
    const rect = await page.getByTestId("add-rectangle").boundingBox();
    expect(sel!.x).toBeGreaterThan(rect!.x + 400);
  });

  test("rich tooltip appears on hover with shortcut and description", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").hover();
    await expect(page.getByTestId("rich-tooltip")).toBeVisible();
    await expect(page.getByTestId("rich-tooltip")).toContainText("Retângulo");
    await expect(page.getByTestId("rich-tooltip")).toContainText("R");
    await page.mouse.move(5, 300);
    await expect(page.getByTestId("rich-tooltip")).toHaveCount(0);
  });

  test("project name goes to the tab title, the G-code header and the file names", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("project-name").fill("Placa da Bancada");
    await page.getByTestId("project-name").press("Enter");
    await expect(page).toHaveTitle("Placa da Bancada — Oficina CNC");
    await page.getByTestId("add-rectangle").click();
    const dl = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    const d = await dl;
    expect(d.suggestedFilename()).toBe("placa-da-bancada.gcode");
    const text = await fs.readFile((await d.path()) as string, "utf8");
    expect(text).toContain("; projeto: Placa da Bancada");
    await page.reload();
    await expect(page.getByTestId("project-name")).toHaveValue("Placa da Bancada");
  });

  test("simulator workspace shows the Reproduzir tab with transport", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("tab-simulator").click();
    await expect(page.getByTestId("ribbon-tab-reproduzir")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("simulate-toggle")).toBeEnabled();
    await expect(page.getByTestId("sim-speed")).toBeVisible();
    await page.getByTestId("group-reproduzir").click();
    await expect(page.getByTestId("simulate-toggle-gm")).toBeVisible();
  });
});
