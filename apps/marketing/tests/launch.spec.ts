import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origin = "https://www.managevent.com.au";

const ceremonySlugs = [
  "wedding",
  "engagement",
  "birthday-milestone",
  "anniversary",
  "baby-shower",
  "cultural-celebration",
  "gala-dinner",
  "celebration-of-life",
  "memorial-service",
  "wake",
] as const;
const memorialSlugs: readonly string[] = ["celebration-of-life", "memorial-service", "wake"];

/** Every public, indexable route. `heading` is checked where the wording is fixed in copy. */
const routes: readonly { path: string; heading?: string; memorial?: boolean }[] = [
  { path: "/", heading: "from 0 to 100" },
  { path: "/invitations", heading: "Invitations your guests can answer" },
  { path: "/pricing", heading: "Clear prices" },
  { path: "/how-it-works", heading: "From 0 to 100" },
  { path: "/services", heading: "Everything an event needs" },
  { path: "/about", heading: "A Perth team" },
  { path: "/contact", heading: "Talk to us" },
  { path: "/faq", heading: "Questions people ask us" },
  { path: "/ceremonies", heading: "Every occasion" },
  ...ceremonySlugs.map((slug) => ({
    path: `/ceremonies/${slug}`,
    memorial: memorialSlugs.includes(slug),
  })),
  { path: "/venues", heading: "Perth settings we work in" },
  { path: "/memorials", heading: "Gatherings of remembrance", memorial: true },
  { path: "/privacy", heading: "Privacy policy" },
  { path: "/terms", heading: "Website terms" },
  { path: "/accessibility", heading: "Accessibility statement" },
];

/** Collects console errors and page errors. A CSP violation is reported as a console error. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const fitsViewport = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const primaryColour = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).getPropertyValue("--me-primary").trim());

for (const { path, heading, memorial } of routes) {
  test(`${path} returns 200 with one h1, page metadata, no overflow, no axe violations and no console errors`, async ({
    page,
  }) => {
    const errors = trackErrors(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    await expect(page.locator("html")).toHaveAttribute("lang", "en-AU");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    if (heading) await expect(page.locator("h1")).toContainText(heading);

    await expect(page).toHaveTitle(/Managevent/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      path === "/" ? origin : `${origin}${path}`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
    if (path !== "/") {
      await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
    }

    // Structured data must be valid JSON.
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const block of blocks) expect(() => JSON.parse(block) as unknown).not.toThrow();

    // Memorial Mode: the calm palette covers the whole page, with no upsell and no estimator.
    const main = page.locator("main");
    if (memorial) {
      await expect(main).toHaveAttribute("data-experience-mode", "memorial");
      expect(await primaryColour(page, ".site-header-bar")).toBe(await primaryColour(page, "main"));
      expect(await primaryColour(page, ".footer-shell")).toBe(await primaryColour(page, "main"));
      await expect(main).not.toContainText(/Premium Event Pass|upgrade|estimator/i);
      await expect(main.locator('a[href*="#estimator"]')).toHaveCount(0);
    } else {
      await expect(main).not.toHaveAttribute("data-experience-mode", "memorial");
    }

    // Honesty rules: features that do not exist in this release are never mentioned.
    await expect(page.locator("body")).not.toContainText(
      /photo wall|Apple Wallet|Google Wallet|\bSMS\b|-placeholder|\bTBC\b/i,
    );

    expect(await fitsViewport(page)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("the home page shows the hero image and leaves marketing consent unticked", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator('input[name="marketingConsent"]')).not.toBeChecked();
  await expect(page.locator(".hero img")).toBeVisible();
  await expect
    .poll(() =>
      page.locator(".hero img").evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
});

test("header navigation reaches every main page and marks the current one", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  const items = [
    { label: "Ceremonies", path: "/ceremonies" },
    { label: "Services", path: "/services" },
    { label: "Invitations", path: "/invitations" },
    { label: "Pricing", path: "/pricing" },
    { label: "About", path: "/about" },
  ];
  for (const { label, path } of items) {
    await page.goto("/");
    if (mobile) {
      await expect(page.locator(".site-nav")).toBeHidden();
      await page.locator(".site-menu-toggle").click();
      await expect(page.locator(".site-menu-panel")).toBeVisible();
      await page
        .locator(".site-menu-panel")
        .getByRole("link", { name: label, exact: true })
        .click();
    } else {
      await page.locator(".site-nav").getByRole("link", { name: label, exact: true }).click();
    }
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator("h1")).toBeVisible();
    const current = page.locator(
      mobile ? `.site-menu-link[href="${path}"]` : `.site-nav-link[href="${path}"]`,
    );
    await expect(current).toHaveAttribute("aria-current", "page");
  }

  // The header button goes to the contact page, and the logo goes home.
  await page.goto("/pricing");
  if (mobile) {
    await page.locator(".site-menu-toggle").click();
    await page.locator(".site-menu-actions").getByRole("link", { name: "Talk to us" }).click();
  } else {
    await page.locator(".site-header-actions").getByRole("link", { name: "Talk to us" }).click();
  }
  await expect(page).toHaveURL(/\/contact$/);
  await page.locator(".site-brand").first().click();
  await expect(page.locator("h1")).toContainText("from 0 to 100");
});

test("the mobile menu opens, closes with Escape and works as a plain details element", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The menu is only shown on small screens.");
  await page.goto("/services");
  const menu = page.locator("details.site-menu");
  await expect(menu).not.toHaveAttribute("open", "");
  await page.locator(".site-menu-toggle").click();
  await expect(menu).toHaveAttribute("open", "");
  await expect(page.locator(".site-menu-list a")).toHaveCount(5);
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
});

test("the enquiry form validates and submits through the server action", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[name="dateUnknown"]').check();
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#form-errors")).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveAttribute("aria-invalid", "true");
  await page.locator('input[name="name"]').fill("Test Host");
  await page.locator('input[name="email"]').fill("host@example.com");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("status")).toContainText("Your enquiry has been received");
});

test("every ceremony page prefills its occasion on the contact form", async ({ page }) => {
  for (const slug of ceremonySlugs) {
    await page.goto(`/ceremonies/${slug}`);
    const enquire = page.locator(`.page-hero a[href="/contact?ceremony=${slug}"]`);
    await expect(enquire).toBeVisible();
    await enquire.click();
    await expect(page.locator('select[name="ceremonySlug"]')).toHaveValue(slug);
  }
});

test("a setting on the home page prefills the enquiry and unknown venues are ignored", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#venues .venue-ask").first().click();
  await expect(page).toHaveURL(/venue=.*#enquiry/);
  await expect(page.locator(".venue-note")).toBeVisible();
  await expect(page.locator('textarea[name="message"]')).not.toHaveValue("");
  await page.goto("/?venue=nope");
  await expect(page.locator(".venue-note")).toHaveCount(0);
  await expect(page.locator('textarea[name="message"]')).toHaveValue("");
});

test("every setting on /venues prefills the enquiry on the contact page", async ({ page }) => {
  await page.goto("/venues");
  const links = await page
    .locator(".cp-setting-ask")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
  expect(links.length).toBeGreaterThan(5);
  for (const href of links) {
    await page.goto(href);
    await expect(page.locator(".venue-note")).toBeVisible();
  }
});

test("the estimator hands its estimate to the enquiry form", async ({ page }) => {
  await page.goto("/");
  await page.locator("#est-ceremony").selectOption("gala-dinner");
  await page.locator(".estimator-cta").click();
  await expect(page.locator('select[name="ceremonySlug"]')).toHaveValue("gala-dinner");
  await expect(page.locator('textarea[name="message"]')).toHaveValue(/Indicative range/);
});

test("/plan and other old paths redirect permanently", async ({ page, request }) => {
  const cases = [
    ["/plan", "/#estimator"],
    ["/plan/wedding", "/#estimator"],
    ["/estimator", "/#estimator"],
    ["/book", "/contact"],
    ["/packages", "/pricing"],
    ["/legal/privacy", "/privacy"],
    ["/ceremonies/corporate-gala", "/ceremonies/gala-dinner"],
    ["/ceremonies/milestone-birthday", "/ceremonies/birthday-milestone"],
    ["/en/pricing", "/pricing"],
  ] as const;
  for (const [from, to] of cases) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    const location = new URL(response.headers()["location"] ?? "", "http://x");
    expect(`${location.pathname}${location.hash}`, from).toBe(to);
  }

  // In a browser, /plan lands on the estimator section of the home page.
  await page.goto("/plan");
  await expect(page).toHaveURL(/\/#estimator$/);
  await expect(page.locator("#estimator")).toBeInViewport();
});

test("legacy /fa URLs permanently redirect to the English site", async ({ request }) => {
  const response = await request.get("/fa/privacy", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe("/privacy");
});

test("unknown pages return a real 404 with the branded page", async ({ page }) => {
  for (const path of ["/no-such-page", "/no/such/page", "/ceremonies/no-such-ceremony"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.locator("h1")).toContainText("This page could not be found");
    await expect(page).toHaveTitle(/Page not found/);
    await expect(page.locator(".site-header-bar")).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
    expect(await fitsViewport(page)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

test("the sitemap lists every indexable route and robots.txt points to it", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const { path } of routes) {
    expect(xml, path).toContain(`<loc>${path === "/" ? origin : `${origin}${path}`}</loc>`);
  }
  expect(xml).not.toContain("/admin");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
  expect(robots).toContain("Disallow: /admin");
});

test("the staff console is closed to the public: /admin sends a signed-out visitor to sign in", async ({
  page,
  request,
}) => {
  // The redirect itself, before any page renders: no enquiry data is ever in the response.
  const gate = await request.get("/admin", { maxRedirects: 0 });
  expect(gate.status()).toBe(307);
  expect(gate.headers().location).toBe("/admin/sign-in");
  expect(gate.headers()["x-robots-tag"]).toContain("noindex");
  expect(gate.headers()["cache-control"]).toContain("no-store");
  // The redirect carries the page title only: no table, no enquiry, none of the old mock data.
  expect(await gate.text()).not.toMatch(/<table|console-inbox|Command Centre|ABN|Wesfarmers/);

  const errors = trackErrors(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await expect(page.locator("h1")).toHaveText("Sign in");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // The console has its own shell: no public header, footer or sign-up.
  await expect(page.locator(".site-header-bar, .footer-shell")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/sign up|create an account/i);
  expect(await fitsViewport(page)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("the footer and contact page show an email, and no phone until one is set", async ({
  page,
}) => {
  for (const path of ["/", "/contact", "/memorials"]) {
    await page.goto(path);
    await expect(page.locator('footer a[href^="mailto:"]').first(), path).toBeVisible();
    // The phone number is staff-editable and blank by default: no empty `tel:` link anywhere.
    await expect(page.locator('a[href="tel:"]'), path).toHaveCount(0);
    await expect(page.locator('a[href^="tel:"]'), path).toHaveCount(0);
  }
});
