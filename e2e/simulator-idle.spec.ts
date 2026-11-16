import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

test("a paused scene stops GPU draws and redraws when the camera changes", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { __simDraws: number };
    state.__simDraws = 0;
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const draw = proto.drawElements;
      proto.drawElements = function (mode: number, count: number, type: number, offset: number) {
        state.__simDraws++;
        return draw.call(this, mode, count, type, offset);
      };
    }
  });
  await page.goto("/app/");
  await page.getByTestId("add-rectangle").click();
  await gotoWorkspace(page, "simulator");
  const draws = () => page.evaluate(() => (window as unknown as { __simDraws: number }).__simDraws);
  await expect.poll(draws).toBeGreaterThan(0);
  const expectIdle = () => expect.poll(async () => {
    const before = await draws();
    await page.waitForTimeout(200);
    return (await draws()) - before;
  }).toBe(0);
  await expectIdle();
  const beforeCameraChange = await draws();
  await page.getByTestId("sim-top").click();
  await expect.poll(draws).toBeGreaterThan(beforeCameraChange);
  await expectIdle();
});
