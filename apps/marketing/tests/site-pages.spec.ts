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
