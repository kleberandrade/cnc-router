import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

// Runs in the mobile-chrome (Pixel 7) and tablet-chrome (iPad) projects.
test.describe("responsive layouts (sprint 08)", () => {
  test("no horizontal scroll and the main flow works with taps", async ({ page, viewport }) => {
    await page.goto("/app/");
    const layout = await page.locator(".app").getAttribute("data-layout");
    expect(layout).toBe(viewport!.width < 768 ? "mobile" : "tablet");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);

    if (layout === "mobile") {
      await page.getByTestId("mb-add-rectangle").tap();
      await expect(page.getByTestId("status-shapes")).toContainText("1 peça");
      await page.getByTestId("mb-settings").tap();
      await expect(page.getByTestId("bottom-sheet")).toBeVisible();
      await page.getByTestId("shape-depth").fill("7");
      await page.getByTestId("shape-depth").press("Enter");
      await page.getByTestId("sheet-close").tap();
      await gotoWorkspace(page, "simulator");
      await page.getByTestId("mb-simulate-toggle").tap();
      await expect(page.getByTestId("mb-simulate-toggle")).toHaveAttribute("aria-label", "Pausar");
    } else {
      await page.getByTestId("add-rectangle").tap();
      await expect(page.getByTestId("status-shapes")).toContainText("1 peça");
      await expect(page.getByTestId("section-shape")).toHaveCount(0);
      await page.getByTestId("panel-toggle").tap();
      await expect(page.getByTestId("section-shape")).toBeVisible();
      await page.getByTestId("shape-depth").fill("7");
      await page.getByTestId("shape-depth").press("Enter");
    }
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").tap();
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toBe("projeto.gcode");
  });

  test("touch targets in the bottom bar / ribbon are at least 40 px", async ({ page, viewport }) => {
    await page.goto("/app/");
    const sel = viewport!.width < 768 ? ".bottom-bar .bb-btn" : ".ribbon .rb";
    const sizes = await page.locator(sel).evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => [r.width, r.height])
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const [w, h] of sizes) {
      expect(w).toBeGreaterThanOrEqual(40);
      expect(h).toBeGreaterThanOrEqual(40);
    }
  });

  test("pinch changes the editor zoom", async ({ page, viewport }) => {
    test.skip(viewport!.width >= 768, "mobile only");
    await page.goto("/app/");
    const canvas = page.locator(".editor-canvas canvas").first();
    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.evaluate(({ cx, cy }) => {
      const el = document.querySelector(".editor-canvas .konvajs-content") as HTMLElement;
      const mk = (type: string, pts: [number, number][]) => {
        const touches = pts.map(([x, y], i) => new Touch({ identifier: i, target: el, clientX: x, clientY: y, pageX: x, pageY: y }));
        el.dispatchEvent(new TouchEvent(type, { touches, changedTouches: touches, targetTouches: touches, bubbles: true, cancelable: true }));
      };
      mk("touchstart", [[cx - 20, cy], [cx + 20, cy]]);
      mk("touchmove", [[cx - 60, cy], [cx + 60, cy]]);
      mk("touchend", []);
    }, { cx, cy });
    const zoom = await page.evaluate(() => (window as unknown as { __zoom?: number }).__zoom ?? 1);
    expect(zoom).toBeGreaterThan(1.5);
  });
});

test.describe("sprint 29 no toque", () => {
  const dxf = ["0", "SECTION", "2", "ENTITIES",
    "0", "LWPOLYLINE", "8", "0", "90", "4", "70", "1", "10", "0", "20", "0", "10", "100", "20", "0", "10", "100", "20", "60", "10", "0", "20", "60",
    "0", "CIRCLE", "8", "0", "10", "50", "20", "30", "40", "5",
    "0", "ENDSEC", "0", "EOF", ""].join("\n");

  test("importar DXF cabe na tela e funciona por toque", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("svg-file-input").first().setInputFiles({ name: "peca.dxf", mimeType: "application/dxf", buffer: Buffer.from(dxf) });
    await expect(page.getByTestId("import-vector")).toBeVisible();
    // o diálogo não pode estourar a largura da tela
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    await page.getByTestId("import-infer-holes").tap();
    await expect(page.getByTestId("import-count")).toHaveText("2 peças");
    await page.getByTestId("import-infer-holes").tap();
    await expect(page.getByTestId("import-count")).toHaveText("1 peça");
    await page.getByTestId("import-confirm").tap();
    await expect(page.getByTestId("status-shapes")).toContainText("1 peça");
  });

  test("menu Imprimir… leva à estação de folha no toque", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("svg-file-input").first().setInputFiles({ name: "peca.dxf", mimeType: "application/dxf", buffer: Buffer.from(dxf) });
    await page.getByTestId("import-confirm").tap();
    await page.getByTestId("project-menu").tap();
    await page.getByTestId("menu-print").tap();
    await expect(page.getByTestId("drawing-workspace")).toBeVisible();
    await expect(page.getByTestId("drawing-page")).toBeVisible();
  });
});

test.describe("sprint 30 no toque", () => {
  test("estação de folha no celular: página, navegação e imprimir na barra", async ({ page, viewport }) => {
    test.skip(viewport!.width >= 768, "mobile only");
    await page.goto("/app/");
    await page.getByTestId("mb-add-rectangle").tap();
    await page.getByTestId("mb-add-circle").tap();
    await gotoWorkspace(page, "drawing");
    await expect(page.getByTestId("drawing-page")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    await expect(page.getByTestId("mb-sheet-prev")).toBeDisabled();
    // navega até a última página (a contagem varia: o conjunto colado ganha página própria)
    for (let i = 0; i < 8 && !(await page.getByTestId("mb-sheet-next").isDisabled()); i++) {
      await page.getByTestId("mb-sheet-next").tap();
    }
    await expect(page.getByTestId("mb-sheet-next")).toBeDisabled();
    await page.getByTestId("mb-sheet-print").tap();
    await expect(page.locator('iframe[data-testid="print-frame"]')).toHaveCount(1);
  });
});

test.describe("sprint 31 no toque", () => {
  test("Resistência no celular: prateleira calcula e o aviso está lá", async ({ page }) => {
    await page.goto("/app/");
    await page.getByTestId("svg-file-input").first().setInputFiles({ name: "peca.dxf", mimeType: "application/dxf", buffer: Buffer.from([
      "0","SECTION","2","ENTITIES",
      "0","LWPOLYLINE","8","0","90","4","70","1","10","0","20","0","10","200","20","0","10","200","20","100","10","0","20","100",
      "0","ENDSEC","0","EOF",""].join("\n")) });
    await page.getByTestId("import-confirm").tap();
    await gotoWorkspace(page, "analysis");
    await expect(page.getByTestId("analysis-workspace")).toBeVisible();
    await expect(page.getByTestId("an-disclaimer")).toContainText("orientativos");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    await page.getByTestId("an-mode-shelf").tap();
    await page.getByTestId("an-shelf-run").tap();
    await expect(page.getByTestId("an-shelf-results")).toContainText("flecha");
  });
});
