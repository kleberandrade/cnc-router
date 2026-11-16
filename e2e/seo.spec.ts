import { test, expect } from "@playwright/test";
import { gotoWorkspace } from "./helpers";

test.describe("SEO", () => {
  test("serves canonical, Open Graph, JSON-LD and brand icon", async ({ page, request }) => {
    await page.goto("/app/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://cnc-router-ten.vercel.app/app/");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Oficina CNC — desenhe, simule, exporte G-code",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://cnc-router-ten.vercel.app/og-image.png",
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const data = JSON.parse((await jsonLd.textContent()) ?? "{}") as { name?: string; "@type"?: string };
    expect(data["@type"]).toBe("WebApplication");
    expect(data.name).toBe("Oficina CNC");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Sitemap: https://cnc-router-ten.vercel.app/sitemap.xml");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    const sm = await sitemap.text();
    expect(sm).toContain("https://cnc-router-ten.vercel.app/</loc>");
    expect(sm).toContain("https://cnc-router-ten.vercel.app/app/</loc>");

    const og = await request.get("/og-image.png");
    expect(og.ok()).toBe(true);
  });

  test("landing: canonical próprio, descrição e sem bundle do app", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://cnc-router-ten.vercel.app/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /router CNC de bancada/);
    // a landing não pode carregar o bundle do app
    expect(await page.locator('script[type="module"]').count()).toBe(0);
    // dados estruturados: aplicação + FAQ
    const ld = page.locator('script[type="application/ld+json"]');
    await expect(ld).toHaveCount(2);
    const types = await ld.allTextContents();
    expect(types.join(" ")).toContain('"SoftwareApplication"');
    expect(types.join(" ")).toContain('"FAQPage"');
  });

  test("document title follows the active view", async ({ page }) => {
    await page.goto("/app/");
    await expect(page).toHaveTitle("Desenhar — Oficina CNC");
    await gotoWorkspace(page, "simulator");
    await expect(page).toHaveTitle("Simular — Oficina CNC");
  });
});
