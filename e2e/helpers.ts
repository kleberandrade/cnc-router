import type { Page } from "@playwright/test";

const RIBBON_TABS = ["formas", "usinagem", "vista"];

/**
 * Click a ribbon action by test id. Looks in the current ribbon tab, then in the "Mais ▾"
 * overflow menu, then in the other ribbon tabs (Sprint 22 tabs) — so tests don't depend on layout.
 */
export async function ribbonClick(page: Page, testId: string): Promise<void> {
  const min = page.getByTestId("ribbon-minimize");
  if ((await min.count()) && (await min.getAttribute("aria-label"))?.startsWith("Mostrar")) await min.click();
  const tryHere = async () => {
    const direct = page.locator(`.ribbon [data-testid="${testId}"]`);
    if (await direct.count()) { await direct.click(); return true; }
    const more = page.getByTestId("ribbon-more");
    if (await more.count()) {
      await more.click();
      const inMenu = page.locator(`.ribbon-menu [data-testid="${testId}"]`);
      if (await inMenu.count()) { await inMenu.click(); return true; }
      await page.keyboard.press("Escape");
    }
    return false;
  };
  if (await tryHere()) return;
  for (const tab of RIBBON_TABS) {
    const t = page.getByTestId(`ribbon-tab-${tab}`);
    if (!(await t.count())) continue;
    await t.click();
    if (await tryHere()) return;
  }
  throw new Error(`ribbon action not found: ${testId}`);
}

/** Open the Alinhar dropdown (in the ribbon or inside "Mais") and click one of its items. */
export async function alignClick(page: Page, testId: string): Promise<void> {
  await page.getByTestId("ribbon-tab-formas").click().catch(() => {});
  const menuButton = page.locator('.ribbon [data-testid="align-menu"]');
  if (await menuButton.count()) { await menuButton.click(); await page.getByTestId(testId).click(); return; }
  await page.getByTestId("ribbon-more").click();
  await page.getByTestId(testId).click();
}

/** Troca de estação pelo dropdown (Sprint 30): Desenhar, Simular ou Folha técnica. */
export async function gotoWorkspace(page: Page, ws: "editor" | "simulator" | "drawing"): Promise<void> {
  await page.getByTestId("workspace-menu").click();
  await page.getByTestId(`ws-${ws}`).click();
}
