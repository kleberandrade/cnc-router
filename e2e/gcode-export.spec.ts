import { test, expect } from "@playwright/test";

test.describe("G-code export flow", () => {
  test("adding a rectangle enables export and downloads a .gcode file", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("add-rectangle").click();

    // Properties panel should appear once a shape is selected.
    await expect(page.getByText("Propriedades")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-gcode").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("projeto.gcode");
  });

  test("exporting with no shapes shows a warning instead of downloading", async ({
    page,
  }) => {
    await page.goto("/");

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Adicione ao menos uma forma");
      await dialog.accept();
    });

    await page.getByTestId("export-gcode").click();
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
