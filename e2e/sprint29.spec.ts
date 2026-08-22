import { test, expect } from "@playwright/test";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" width="100mm" height="60mm"><path d="M5,5 H95 V55 H5 Z M40,25 H60 V40 H40 Z"/></svg>`;

test.describe("sprint 29: imprimir e entrada rápida", () => {
  test.slow();

  test("Ctrl+P abre a impressão (hoje: estação Folha técnica, Sprint 30)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.keyboard.press("Control+p");
    await expect(page.getByTestId("drawing-workspace")).toBeVisible();
    await expect(page.getByTestId("drawing-page")).toContainText("Chapa");
  });

  test("tempo por peça aparece no navegador", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("section-toggle-shape").click();
    await expect(page.getByTestId("nav-time-0")).toContainText(/\d/);
  });

  test("arrastar um SVG para a janela abre o diálogo de importação, nunca importa direto", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    // drop sintético com DataTransfer real do navegador
    await page.evaluate((svg) => {
      const dt = new DataTransfer();
      dt.items.add(new File([svg], "solto.svg", { type: "image/svg+xml" }));
      window.dispatchEvent(new DragEvent("dragenter", { dataTransfer: dt, bubbles: true }));
      window.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, SVG);
    await expect(page.getByTestId("drop-overlay")).toBeVisible();
    await page.evaluate((svg) => {
      const dt = new DataTransfer();
      dt.items.add(new File([svg], "solto.svg", { type: "image/svg+xml" }));
      window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, SVG);
    await expect(page.getByTestId("drop-overlay")).toHaveCount(0);
    await expect(page.getByTestId("import-vector")).toBeVisible();
    await expect(page.getByTestId("status-shapes")).toHaveText("0 peças");
    await page.getByTestId("import-confirm").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
  });

  test("colar SVG (Ctrl+V) abre o diálogo de importação", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.evaluate((svg) => {
      const dt = new DataTransfer();
      dt.setData("text/plain", svg);
      const ev = new ClipboardEvent("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(ev, "clipboardData", { value: dt });
      window.dispatchEvent(ev);
    }, SVG);
    await expect(page.getByTestId("import-vector")).toBeVisible();
    await expect(page.getByTestId("import-count")).toHaveText("1 peça");
    await page.getByTestId("import-cancel").click();
  });

  test("soltar um projeto .json com peças na mesa pede confirmação", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("empty-close").click();
    await page.getByTestId("add-rectangle").click();
    const json = JSON.stringify({ app: "oficina-cnc", version: 9, savedAt: "2026-08-22", shapes: [
      { id: "c9", kind: "circle", x: 30, y: 30, radius: 9, depth: 5, operation: "outline" },
    ], settings: {} });
    await page.evaluate((body) => {
      const dt = new DataTransfer();
      dt.items.add(new File([body], "outro.oficina-cnc.json", { type: "application/json" }));
      window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, json);
    await expect(page.getByTestId("ask-dialog")).toBeVisible();
    await page.getByTestId("ask-ok").click();
    await expect(page.getByTestId("status-shapes")).toHaveText("1 peça");
  });
});
