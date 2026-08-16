import type { Page } from "@playwright/test";

/**
 * Click a ribbon action by test id. When the ribbon has moved the action into the
 * "Mais ▾" overflow menu (narrow viewports), open the menu first.
 */
export async function ribbonClick(page: Page, testId: string): Promise<void> {
  const direct = page.getByTestId(testId);
  if (await direct.count()) { await direct.click(); return; }
  await page.getByTestId("ribbon-more").click();
  await page.getByTestId(testId).click();
}

/** Open the Alinhar dropdown (in the ribbon or inside "Mais") and click one of its items. */
export async function alignClick(page: Page, testId: string): Promise<void> {
  const menuButton = page.getByTestId("align-menu");
  if (await menuButton.count()) { await menuButton.click(); await page.getByTestId(testId).click(); return; }
  await page.getByTestId("ribbon-more").click();
  await page.getByTestId(testId).click();
}
