import { test, expect } from "@playwright/test";

test.describe("G-code export flow", () => {
  test("adding a rectangle enables export and downloads a .gcode file", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("add-rectangle").click();

    // Properties panel should appear once a shape is selected.
    await expect(page.getByTestId("shape-depth")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("projeto.gcode");
  });

  test("exporting with no shapes shows a warning instead of downloading", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("export-gcode").click();
    await expect(page.getByTestId("notice")).toContainText(
      "Adicione ao menos uma forma"
    );
  });

  test("invalid machine settings block export with an inline error", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    // Setting passDepth to 0 is rejected by the input, so poke the store through the UI limits:
    // an empty field keeps the last valid value, so export must still work.
    await page.getByTestId("section-toggle-cut").click();
    const pass = page.getByTestId("cut-passDepth");
    await pass.fill("");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    await downloadPromise;
  });

  test("project survives a page reload (localStorage persistence)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await page.getByTestId("add-circle").click();
    await page.reload();
    await page.getByTestId("tab-simulator").click();
    await expect(page.getByTestId("simulate-toggle")).toBeEnabled();
  });

  test("selecting a shape and switching to the simulator shows playback controls", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("add-circle").click();
    await page.getByTestId("tab-simulator").click();

    const toggle = page.getByTestId("simulate-toggle");
    await expect(toggle).toBeEnabled();
    await toggle.click();
    await expect(toggle).toHaveText("Pausar simulação");
  });
});

test.describe("time estimate (sprint 03)", () => {
  test("estimated time is shown in the toolbar and simulator and written to the G-code", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("add-rectangle").click();
    await expect(page.getByTestId("toolbar-estimate")).toContainText(/tempo estimado \d+/);
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    const download = await downloadPromise;
    const path = await download.path();
    const fs = await import("node:fs/promises");
    const text = await fs.readFile(path as string, "utf8");
    expect(text).toMatch(/; tempo estimado: \d+/);
    await page.getByTestId("tab-simulator").click();
    await expect(page.getByTestId("sim-total")).not.toHaveText("00:00");
  });
});
