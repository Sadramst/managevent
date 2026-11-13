import AxeBuilder from "@axe-core/playwright";
import { expect, test, WCAG_TAGS as WCAG } from "./support/stack";

/**
 * Public pages: home, templates, pricing, email preferences, page not found and old links.
 * Runs against the real stack (API on 4000 with the sample invitations seeded).
 */

test.describe("home", () => {
  test("is indexable, describes the service and links to six live samples", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.flatMap((text) => JSON.parse(text) as { "@type": string }[]);
    expect(types.map((item) => item["@type"])).toEqual(
      expect.arrayContaining(["Service", "FAQPage"]),
    );

    const samples = page.locator("a.pub-sample");
    await expect(samples).toHaveCount(6);
    const href = await samples.first().getAttribute("href");
    expect(href).toMatch(/^\/i\/[^/]+\/[^/]+$/);
    expect((await page.request.get(href ?? "")).status()).toBe(200);
  });

  test("sends a signed-out visitor to sign-up, then on to the wizard", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".page-hero-actions a").first()).toHaveAttribute(
      "href",
      "/sign-up?next=%2Fstudio%2Fnew",
    );
  });

  test("answers its questions from the keyboard", async ({ page }) => {
    await page.goto("/");
    const first = page.locator(".pub-faq details").first();
    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
  });
});

test.describe("templates", () => {
  test("lists all six templates with a sample and a way to start", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator(".pub-template")).toHaveCount(6);
    await expect(page.getByRole("link", { name: /^View sample: / })).toHaveCount(6);
    await expect(page.getByRole("link", { name: /^Use this template: / })).toHaveCount(6);
    // The memorial templates sit in Memorial Mode and carry no plan badge.
    const memorial = page.locator('#memorial[data-experience-mode="memorial"] .pub-template');
    await expect(memorial).toHaveCount(2);
    await expect(memorial.getByText("Premium", { exact: true })).toHaveCount(0);
  });

  test("keeps the chosen template through sign-up", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("link", { name: "Use this template: Celestial Evening" }).click();
    await expect(page).toHaveURL(/\/sign-up\?next=%2Fstudio%2Fnew%3Ftemplate%3Dcelestial-evening/);
  });
});

test("pricing is noindex and shows the plans", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator(".pub-plan")).toHaveCount(4);
  await expect(page.getByRole("table")).toBeVisible();
});

test.describe("email preferences", () => {
  test("says so when the link has no token", async ({ page }) => {
    await page.goto("/unsubscribe");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link is not valid");
  });

  test("asks before changing anything, and rejects a forged token", async ({ page }) => {
    await page.goto(`/unsubscribe?t=${"a".repeat(40)}`);
    await page.getByRole("button", { name: "Stop these emails" }).click();
    await expect(page).toHaveURL(/\/unsubscribe\?status=invalid$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link is not valid");
  });
});

test.describe("unknown addresses", () => {
  for (const path of [
    "/no-such-page",
    "/legacy/old/link",
    "/anniversary/nobody",
    "/e/gala/nobody",
  ]) {
    test(`${path} is a real 404`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(404);
    });
  }

  test("the 404 page helps guests and hosts", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We cannot find that page");
    await expect(page.getByRole("heading", { name: "Looking for your invitation?" })).toBeVisible();
  });
});

test("search engines are told about the two public pages only", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap.match(/<loc>/g)).toHaveLength(2);
  expect(sitemap).toContain("/templates");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /i/");
  expect(robots).toContain("Disallow: /studio");
});

for (const path of ["/", "/templates", "/pricing", "/unsubscribe", "/no-such-page"]) {
  test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
}

test("no page scrolls sideways on a phone", async ({ page }) => {
  for (const path of ["/", "/templates", "/pricing"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("brand icon and Open Graph share image return 200", async ({ request }) => {
  const icon = await request.get("/icon.svg");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");

  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});
