import { test, expect } from "@playwright/test";

test.describe("SEO", () => {
  test("serves canonical, Open Graph, JSON-LD and brand icon", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://cnc-router.vercel.app/");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Oficina CNC — desenhe, simule, exporte G-code",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://cnc-router.vercel.app/og-image.png",
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const data = JSON.parse((await jsonLd.textContent()) ?? "{}") as { name?: string; "@type"?: string };
    expect(data["@type"]).toBe("WebApplication");
    expect(data.name).toBe("Oficina CNC");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Sitemap: https://cnc-router.vercel.app/sitemap.xml");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("https://cnc-router.vercel.app/");

    const og = await request.get("/og-image.png");
    expect(og.ok()).toBe(true);
  });

  test("document title follows the active view", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Desenhar — Oficina CNC");
    await page.getByTestId("tab-simulator").click();
    await expect(page).toHaveTitle("Simular — Oficina CNC");
  });
});
