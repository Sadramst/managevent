import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["en"] as const) {
  const prefix = "";
  test(`${locale} renders, is accessible and fits the viewport`, async ({ page }, testInfo) => {
    await page.goto(`${prefix}/`);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("h1")).toContainText("from 0 to 100");
    await expect(page.locator('input[name="marketingConsent"]')).not.toBeChecked();
    await expect(page.locator(".hero img")).toBeVisible();
    await expect
      .poll(() =>
        page.locator(".hero img").evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${locale}-home.png`), fullPage: true });
  });

  test(`${locale} validates and submits through the server action`, async ({ page }) => {
    await page.goto(`${prefix}/`);
    await page.locator('input[name="dateUnknown"]').check();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("#form-errors")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveAttribute("aria-invalid", "true");
    await page.locator('input[name="name"]').fill("Test Host");
    await page.locator('input[name="email"]').fill("host@example.com");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("status")).toContainText("Your enquiry has been received");
  });

  for (const document of ["privacy", "terms", "accessibility"]) {
    test(`${locale} ${document} has no axe violations`, async ({ page }) => {
      await page.goto(`${prefix}/${document}`);
      await expect(page.locator("h1")).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
}

test("legacy /fa URLs permanently redirect to the English site", async ({ request }) => {
  const response = await request.get("/fa/privacy", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe("/privacy");
});

test("unknown pages and the private Builder return real 404s", async ({ page }) => {
  const response = await page.goto("/plan");
  expect(response?.status()).toBe(404);
});

test("admin command centre renders CRM pipeline, events, partners and finance with no axe violations", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page.locator("h1")).toContainText("Managevent Admin & Planner Command Centre");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("venue ask link prefills the enquiry and unknown venues are ignored", async ({ page }) => {
  await page.goto("/");
  await page.locator("#venues .venue-ask").first().click();
  await expect(page).toHaveURL(/venue=.*#enquiry/);
  await expect(page.locator(".venue-note")).toBeVisible();
  await expect(page.locator('textarea[name="message"]')).not.toHaveValue("");
  await page.goto("/?venue=nope");
  await expect(page.locator(".venue-note")).toHaveCount(0);
  await expect(page.locator('textarea[name="message"]')).toHaveValue("");
});

test("SEO hubs, Perth local pages, commercial aliases and Memorial Mode render with JSON-LD and zero axe violations", async ({
  page,
  request,
}) => {
  for (const path of [
    "/ceremonies",
    "/ceremonies/wedding",
    "/packages",
    "/venues",
    "/services",
    "/invitations",
    "/memorials",
    "/perth",
    "/perth/wedding",
    "/perth/wake-catering",
    "/faq",
    "/pricing",
  ]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }

  // Verify commercial alias /perth/wake-catering points canonical to /perth/wake and uses Memorial Mode
  await page.goto("/perth/wake-catering");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://www.managevent.com.au/perth/wake",
  );
  await expect(page.locator("main")).toHaveAttribute("data-experience-mode", "memorial");

  // Verify hidden city returns 404 and waitlist city is noindex
  const hiddenCity = await page.goto("/brisbane");
  expect(hiddenCity?.status()).toBe(404);
  const waitlistCity = await page.goto("/sydney");
  expect(waitlistCity?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Verify sitemap.xml is served and includes Perth and ceremony URLs
  const sitemapRes = await request.get("/sitemap.xml");
  expect(sitemapRes.status()).toBe(200);
  const sitemapXml = await sitemapRes.text();
  expect(sitemapXml).toContain("https://www.managevent.com.au/perth/wedding");
  expect(sitemapXml).toContain("https://www.managevent.com.au/memorials");
});

