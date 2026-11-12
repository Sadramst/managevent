/**
 * The staff console against the REAL API and database (`playwright.real.config.ts`).
 *
 * The staff account comes from the operator CLI and signs in with a real authenticator code;
 * the enquiry is a real one sent through the public contact form. Nothing is mocked.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { e2eAccounts, E2E_EMAIL_DOMAIN } from "./support/real-api";
import { freshTotpCode } from "./support/totp";

/** Set `ADMIN_QA_DIR` to save 1440px and 390px screenshots of each console page there. */
const qaDir = process.env.ADMIN_QA_DIR;

async function snap(page: Page, name: string): Promise<void> {
  if (!qaDir || test.info().project.name !== "desktop") return;
  mkdirSync(qaDir, { recursive: true });
  const original = page.viewportSize();
  for (const [label, width, height] of [
    ["1440", 1440, 900],
    ["390", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(qaDir, `${name}-${label}.png`), fullPage: true });
  }
  if (original) await page.setViewportSize(original);
}

const fitsViewport = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const expectNoAxeViolations = async (page: Page) =>
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

/** Console errors and page errors. A CSP violation is reported as a console error. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** Today's date in Perth as DD/MM/YYYY, worked out independently of the app's own helper. */
function perthToday(): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

async function enterCredentials(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Email and password, then the authenticator code: the only way into the console. */
async function signInAsStaff(page: Page): Promise<void> {
  const { staff } = e2eAccounts();
  await enterCredentials(page, staff.email, staff.password);
  const code = page.getByLabel("Authenticator code");
  await expect(code).toBeFocused();
  await code.fill(await freshTotpCode(staff.totpUri));
  await page.getByRole("button", { name: "Verify and sign in" }).click();
}

test("signed out, every console address leads to sign-in and nothing is indexable", async ({
  page,
  request,
}) => {
  const leadPath = "/admin/leads/lead_0192b400-0000-7000-8000-000000000001";
  for (const [target, location] of [
    ["/admin", "/admin/sign-in"],
    ["/admin?stage=NEW", "/admin/sign-in?next=%2Fadmin%3Fstage%3DNEW"],
    [leadPath, `/admin/sign-in?next=${encodeURIComponent(leadPath)}`],
    ["/admin/anything-else", "/admin/sign-in?next=%2Fadmin%2Fanything-else"],
  ] as const) {
    const response = await request.get(target, { maxRedirects: 0 });
    expect(response.status(), target).toBe(307);
    expect(response.headers().location, target).toBe(location);
    expect(response.headers()["x-robots-tag"], target).toContain("noindex");
    expect(response.headers()["cache-control"], target).toContain("no-store");
  }

  // The data routes behind the console refuse a caller with no session.
  const session = await request.get("/api/auth/get-session");
  expect(await session.json()).toBeNull();

  const errors = trackErrors(page);
  const response = await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  expect(response?.headers()["cache-control"]).toMatch(/private/);
  expect(response?.headers()["cache-control"]).toMatch(/no-store/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator("h1")).toHaveText("Sign in");
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await expect(page.locator("body")).not.toContainText(/sign up|create an account/i);
  expect(await fitsViewport(page)).toBe(true);
  await expectNoAxeViolations(page);
  await snap(page, "sign-in");
  expect(errors).toEqual([]);
});

test("a wrong password and a wrong code are refused with a clear message", async ({ page }) => {
  const { staff } = e2eAccounts();
  await page.goto("/admin/sign-in");
  await enterCredentials(page, staff.email, "not-the-password-1");
  await expect(page.locator("main").getByRole("alert")).toContainText("do not match");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);

  await enterCredentials(page, staff.email, staff.password);
  const code = page.getByLabel("Authenticator code");
  await expect(code).toBeFocused();
  await expectNoAxeViolations(page);
  await snap(page, "sign-in-code");
  // The password alone is not a session: the console still redirects.
  expect((await page.request.get("/admin", { maxRedirects: 0 })).status()).toBe(307);
  await code.fill("000000");
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("code was not accepted");
  expect((await page.request.get("/admin", { maxRedirects: 0 })).status()).toBe(307);
});

test("an ordinary host account is refused and signed out again", async ({ page }) => {
  const { host } = e2eAccounts();
  await page.goto("/admin/sign-in");
  await enterCredentials(page, host.email, host.password);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "This area is for Managevent staff",
  );
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await expectNoAxeViolations(page);
  await snap(page, "sign-in-staff-only");

  // No session is left behind, and the console is still closed.
  expect(await (await page.request.get("/api/auth/get-session")).json()).toBeNull();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await expect(page.locator("h1")).toHaveText("Sign in");
});

test("a live host session, however it was obtained, never reaches the console", async ({
  page,
  baseURL,
}) => {
  // A host who signed in elsewhere (the session cookie is shared across our sites) or who
  // registered straight through the proxy holds a real session. It must open nothing here.
  const email = `walkin-${randomBytes(4).toString("hex")}@${E2E_EMAIL_DOMAIN}`;
  const origin = new URL(baseURL ?? "http://localhost").origin;
  const signUp = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: { name: "E2E Walk-in", email, password: `Walkin-${randomBytes(9).toString("hex")}` },
  });
  expect(signUp.status()).toBe(200);
  const session = (await (await page.request.get("/api/auth/get-session")).json()) as {
    user?: { email?: string };
  } | null;
  expect(session?.user?.email).toBe(email);

  const leadPath = "/admin/leads/lead_0192b400-0000-7000-8000-000000000001";
  for (const [target, location] of [
    ["/admin", "/admin/sign-in?reason=staff"],
    ["/admin?stage=NEW", "/admin/sign-in?reason=staff&next=%2Fadmin%3Fstage%3DNEW"],
    [leadPath, `/admin/sign-in?reason=staff&next=${encodeURIComponent(leadPath)}`],
  ] as const) {
    const response = await page.request.get(target, { maxRedirects: 0 });
    expect(response.status(), target).toBe(307);
    expect(response.headers().location, target).toBe(location);
    expect(response.headers()["cache-control"], target).toContain("no-store");
    expect(await response.text(), target).not.toMatch(/<table|console-inbox|mailto:/);
  }

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in\?reason=staff$/);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "This area is for Managevent staff",
  );
  await expect(page.getByTestId("signed-in-user")).toHaveCount(0);

  // The sign-in proxy forwards to the API's auth mount and nowhere else, and does not relay
  // the API's CORS headers.
  for (const outside of ["/api/auth/..%2f..%2fv1%2fleads", "/api/auth/x%5c..%5c..%5cv1/leads"]) {
    const response = await page.request.get(outside, { maxRedirects: 0 });
    expect(response.status(), outside).toBe(404);
    expect(await response.text(), outside).not.toContain("items");
  }
  const proxied = await page.request.get("/api/auth/get-session", { headers: { origin } });
  expect(proxied.headers()["access-control-allow-origin"]).toBeUndefined();
  expect(proxied.headers()["cache-control"]).toContain("no-store");

  await page.request.post("/api/auth/sign-out", { headers: { origin }, data: {} });
  expect(await (await page.request.get("/api/auth/get-session")).json()).toBeNull();
});

test("staff sign in with two-factor, find a real enquiry, move it on and add a note", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  const { staff } = e2eAccounts();
  const run = randomBytes(4).toString("hex");
  const enquirer = `E2E Enquiry ${run}`;
  const mourner = `E2E Remembrance ${run}`;
  const enquirerEmail = `enquiry-${run}@${E2E_EMAIL_DOMAIN}`;
  const message = `Garden ceremony for ${run}.\nSecond line about catering.`;
  const note = `Called back, sending the brochure (${run}).\nFollow up on Friday.`;

  // 1. A real enquiry through the public contact form.
  await page.goto("/contact");
  await page.locator('input[name="name"]').fill(enquirer);
  await page.locator('input[name="email"]').fill(enquirerEmail);
  await page.locator('input[name="phone"]').fill("0412 345 678");
  await page.locator('select[name="ceremonySlug"]').selectOption("wedding");
  await page.locator('input[name="eventDate"]').fill("2027-03-14");
  await page.locator('input[name="guestEstimate"]').fill("120");
  await page.locator('textarea[name="message"]').fill(message);
  await page.locator('#enquiry button[type="submit"]').click();
  await expect(page.getByRole("status")).toContainText("Your enquiry has been received");

  // And a memorial enquiry with no date yet.
  await page.goto("/contact?ceremony=celebration-of-life");
  await expect(page.locator('select[name="ceremonySlug"]')).toHaveValue("celebration-of-life");
  await page.locator('input[name="name"]').fill(mourner);
  await page.locator('input[name="email"]').fill(`memorial-${run}@${E2E_EMAIL_DOMAIN}`);
  await page.locator('input[name="dateUnknown"]').check();
  await page.locator('#enquiry button[type="submit"]').click();
  await expect(page.getByRole("status")).toContainText("Your enquiry has been received");

  // 2. Sign in: password, then the authenticator code.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await signInAsStaff(page);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator("h1")).toHaveText("Enquiries");
  await expect(page.getByTestId("signed-in-user")).toContainText(staff.name);
  await expect(page.getByTestId("signed-in-user")).toContainText("Administrator");
  await expect(page.locator(".site-header-bar, .footer-shell")).toHaveCount(0);

  // 3. The enquiry is in the inbox with what was entered.
  const row = page.locator("tbody tr", { hasText: enquirer });
  await expect(row).toHaveCount(1);
  await expect(row.locator('[data-cell="received"]')).toContainText(perthToday());
  await expect(row.locator('[data-cell="ceremony"]')).toContainText(/wedding/i);
  await expect(row.locator('[data-cell="event-date"]')).toContainText("14/03/2027");
  await expect(row.locator('[data-cell="guests"]')).toContainText("120");
  await expect(row.locator('[data-cell="area"]')).toContainText("Not given");
  await expect(row.locator('[data-cell="stage"]')).toHaveText("New");
  // The memorial enquiry is marked, and its missing date reads as flexible.
  const memorialRow = page.locator("tbody tr", { hasText: mourner });
  await expect(memorialRow.locator('[data-cell="ceremony"] .pill')).toHaveText("Memorial");
  await expect(memorialRow.locator('[data-cell="event-date"]')).toHaveText("Flexible");
  await expect(memorialRow.locator('[data-cell="guests"]')).toHaveText("Not given");
  expect(await fitsViewport(page)).toBe(true);
  await expectNoAxeViolations(page);
  await snap(page, "inbox");

  // A memorial enquiry opens in Memorial Mode, header included, with the tone reminder.
  await memorialRow.getByRole("link", { name: mourner }).click();
  const memorialMain = page.locator('main[data-experience-mode="memorial"]');
  await expect(memorialMain.locator("h1")).toHaveText(mourner);
  await expect(memorialMain).toContainText("This is a memorial enquiry");
  const colour = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--me-primary").trim().toLowerCase(),
      );
  const memorialPrimary = await colour("main");
  expect(await colour(".console-bar")).toBe(memorialPrimary);
  await expectNoAxeViolations(page);
  await snap(page, "lead-detail-memorial");
  await page.getByRole("link", { name: "All enquiries" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  // Back on the inbox the celebration palette returns.
  expect(await colour(".console-bar")).not.toBe(memorialPrimary);

  // Search and the stage tabs narrow the list on the server.
  await page.getByLabel("Search enquiries").fill(enquirer);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]q=E2E\\+Enquiry\\+${run}`));
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByTestId("count-all")).toHaveText("1");
  await expect(page.getByTestId("count-NEW")).toHaveText("1");
  await page.locator('.tabs a[data-stage="BOOKED"]').click();
  await expect(page.locator('.tabs a[data-stage="BOOKED"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByTestId("inbox-empty")).toContainText("Nothing matches");
  await expectNoAxeViolations(page);
  await page.locator('.tabs a[data-stage="NEW"]').click();
  await expect(page.locator("tbody tr")).toHaveCount(1);

  // 4. Open it: the full detail, with working contact links.
  await page.getByRole("link", { name: enquirer }).click();
  await expect(page).toHaveURL(/\/admin\/leads\/lead_[0-9a-f-]+$/);
  const leadUrl = page.url();
  await expect(page.locator("h1")).toHaveText(enquirer);
  await expect(page.getByRole("link", { name: enquirerEmail })).toHaveAttribute(
    "href",
    `mailto:${enquirerEmail}`,
  );
  await expect(page.getByRole("link", { name: "0412 345 678" })).toHaveAttribute(
    "href",
    "tel:0412345678",
  );
  await expect(page.getByTestId("lead-message")).toHaveText(message);
  await expect(page.getByTestId("lead-marketing-consent")).toHaveText("Not agreed");
  await expect(page.locator("#lead-source + dl")).toContainText("Contact form");
  await expect(page.getByTestId("lead-stage")).toHaveText("New");
  await expect(page.getByTestId("lead-updated")).toContainText(perthToday());
  await expect(page.getByTestId("lead-owner-value")).toHaveText("Not assigned");
  expect(await fitsViewport(page)).toBe(true);
  await expectNoAxeViolations(page);

  // 5. Move the stage, add a note, take ownership.
  await page.getByRole("button", { name: "Mark as qualified" }).click();
  await expect(page.locator("#lead-stage-outcome")).toHaveText("Stage updated.");
  await expect(page.getByTestId("lead-stage")).toHaveText("Qualified");
  await expect(page.getByRole("button", { name: "Mark proposal sent" })).toBeVisible();

  await page.getByLabel("Notes for the team").fill(note);
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(page.locator("#lead-notes-outcome")).toHaveText("Notes saved.");

  await page.getByRole("button", { name: "Assign to me" }).click();
  await expect(page.locator("#lead-assign-outcome")).toHaveText("Assignment updated.");
  await expect(page.getByTestId("lead-owner-value")).toHaveText("Assigned to you");
  await expectNoAxeViolations(page);
  await snap(page, "lead-detail");

  // 6. Reload: everything came back from the database.
  await page.reload();
  await expect(page.getByTestId("lead-stage")).toHaveText("Qualified");
  await expect(page.getByLabel("Notes for the team")).toHaveValue(note);
  await expect(page.getByTestId("lead-owner-value")).toHaveText("Assigned to you");
  await expect(page.getByRole("button", { name: "Remove assignment" })).toBeVisible();

  // The inbox agrees.
  await page.goto(`/admin?stage=QUALIFIED&q=${encodeURIComponent(enquirer)}`);
  await expect(page.locator("tbody tr", { hasText: enquirer })).toHaveCount(1);
  await expect(page.locator('tbody [data-cell="stage"]')).toHaveText("Qualified");
  await page.goto(`/admin?stage=NEW&q=${encodeURIComponent(enquirer)}`);
  await expect(page.getByTestId("inbox-empty")).toBeVisible();

  // Nothing above logged a console error or tripped the Content-Security-Policy. (Checked here
  // because the browser reports the deliberate 404 below as a failed resource.)
  expect(errors).toEqual([]);

  // An address that is not an enquiry is a real 404 inside the console.
  const missing = await page.goto("/admin/leads/lead_0192b400-0000-7000-8000-00000000dead");
  expect(missing?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page not found");
  await expectNoAxeViolations(page);

  // 7. Sign out: the session is gone and the console is closed again.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/sign-in\?reason=signed-out$/);
  await expect(page.getByRole("status")).toContainText("You have signed out");
  expect(await (await page.request.get("/api/auth/get-session")).json()).toBeNull();
  await page.goto(leadUrl);
  await expect(page).toHaveURL(/\/admin\/sign-in\?next=/);
});
