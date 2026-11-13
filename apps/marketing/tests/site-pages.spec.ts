import { test, expect } from "@playwright/test";

// Per-route checks (status, h1, metadata, axe, console errors) live in launch.spec.ts.

test("the home page loads under the Content-Security-Policy with no console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#estimator select").first()).toBeVisible();
  // Hydration ran: the estimator reacts to input.
  await page.locator("#est-ceremony").selectOption("celebration-of-life");
  await expect(page.locator(".estimator-grid")).toHaveAttribute("data-experience-mode", "memorial");
  expect(errors).toEqual([]);
});

test("security headers are sent and X-Powered-By is removed", async ({ request }) => {
  const headers = (await request.get("/pricing")).headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("old and alias paths redirect permanently", async ({ request }) => {
  const cases = [
    ["/legal/privacy", "/privacy"],
    ["/book", "/contact"],
    ["/packages", "/pricing"],
    ["/plan", "/#estimator"],
  ] as const;
  for (const [from, to] of cases) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    const location = new URL(response.headers()["location"] ?? "", "http://x");
    expect(`${location.pathname}${location.hash}`, from).toBe(to);
  }
});

test("/api is not rewritten into the locale tree", async ({ request }) => {
  const response = await request.get("/api/health", { maxRedirects: 0 });
  expect(response.status()).toBe(404);
  expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
});

test("invitation prices come from plan config and the plan table is complete", async ({ page }) => {
  await page.goto("/invitations");
  await expect(page.locator(".sp-plan")).toHaveCount(4);
  await expect(page.locator(".sp-plan-price").nth(1)).toContainText("$69");
  await expect(page.locator("table caption")).toBeVisible();
  await expect(page.locator("#memorial-mode")).toHaveAttribute("data-experience-mode", "memorial");
  await expect(page.locator("body")).not.toContainText(/photo wall|Apple Wallet|Google Wallet/i);
});

test("the contact page submits the shared enquiry form and accepts a ceremony prefill", async ({
  page,
}) => {
  await page.goto("/contact?ceremony=wedding");
  await expect(page.locator('select[name="ceremonySlug"]')).toHaveValue("wedding");
  await page.locator('input[name="dateUnknown"]').check();
  await page.locator('input[name="name"]').fill("Test Host");
  await page.locator('input[name="email"]').fill("host@example.com");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("status")).toContainText("Your enquiry has been received");
});

test("the sitemap lists the new routes and ceremony pages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/invitations", "/pricing", "/ceremonies/wedding", "/memorials", "/faq"]) {
    expect(xml).toContain(`<loc>https://www.managevent.com.au${path}</loc>`);
  }
});

test("hero quick-select pills meet 44px touch targets and open ceremony pages", async ({
  page,
}) => {
  await page.goto("/");
  const pills = page.locator(".hero-quick-pill");
  await expect(pills.first()).toBeVisible();
  const count = await pills.count();
  expect(count).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < count; i += 1) {
    const box = await pills.nth(i).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await pills.first().click();
  await expect(page).toHaveURL(/\/ceremonies\//);
  await expect(page.locator("h1")).toBeVisible();
});

test("estimator guest presets, summary chips and enquiry attachment confirmation work together", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".estimator-breakdown")).toBeVisible();
  await expect(page.locator(".estimator-breakdown-list")).toContainText("Base coordination");
  await expect(page.locator(".estimator-breakdown-list")).toContainText("Guest allocation");
  await expect(page.locator(".estimator-breakdown-list")).not.toContainText("Travel & logistics");

  const memorialPill = page.locator(".estimator-cat-pill", { hasText: /memorial/i });
  await memorialPill.click();
  await expect(memorialPill).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#est-ceremony")).toHaveValue("celebration-of-life");
  await expect(page.locator(".estimator-grid")).toHaveAttribute("data-experience-mode", "memorial");

  const weddingPill = page.locator(".estimator-cat-pill", { hasText: /wedding/i });
  await weddingPill.click();
  await expect(page.locator("#est-ceremony")).toHaveValue("wedding");

  const preset150 = page.locator(".estimator-preset", { hasText: /^150$/ });
  await preset150.click();
  await expect(preset150).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".estimator-guest-badge")).toContainText("150");
  await page.locator("#est-tier").selectOption("LUXE");
  await page.locator("#est-zone").selectOption("REGIONAL");
  await expect(page.locator(".estimator-breakdown-list")).toContainText("Travel & logistics");
  await expect(page.locator(".estimator-summary-chips")).toContainText("Luxe");
  await page.locator(".estimator-cta").click();
  await expect(page.locator(".estimator-applied")).toBeVisible();
  await expect(page.locator(".estimate-note")).toBeVisible();
  await expect(page.locator('input[name="guestEstimate"]')).toHaveValue("150");
});

test("brand icon and Open Graph share image return 200", async ({ request }) => {
  const icon = await request.get("/icon.svg");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");

  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});
