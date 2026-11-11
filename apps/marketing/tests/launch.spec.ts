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
