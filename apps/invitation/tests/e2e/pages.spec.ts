import type { Page } from "@playwright/test";
import {
  demoPath,
  expect,
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  loadDemos,
  SAMPLE_PARTY,
  test,
  watchForPageErrors,
} from "./support/stack";

/**
 * The health check every page a stranger can reach must pass: the public pages, the two
 * account pages and each of the six sample invitations.
 *
 * For each one: it answers 200, has exactly one `<h1>`, has no WCAG 2.2 AA violations, reports
 * no console error, uncaught exception or failed request, and does not scroll sideways on a
 * 390px phone (the width most hosts and guests see it at, often inside WhatsApp).
 */

const PHONE = { width: 390, height: 844 };

const PUBLIC_PAGES = [
  { path: "/", indexable: true },
  { path: "/templates", indexable: true },
  { path: "/pricing", indexable: false },
  { path: "/sign-in", indexable: false },
  { path: "/sign-up", indexable: false },
];

/** The checks shared by every page. `open` navigates and returns the HTTP status. */
async function checkPage(page: Page, label: string, open: () => Promise<number | undefined>) {
  const errors = watchForPageErrors(page);
  expect(await open(), `${label} status`).toBe(200);
  await expect(page.locator("h1"), `${label} has one h1`).toHaveCount(1);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("main"), `${label} has one main landmark`).toHaveCount(1);
  expect(await page.title(), `${label} has a title`).not.toBe("");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-AU");

  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, label);
  await expectNoSidewaysScroll(page, label);

  // The same page on a 390px phone, whichever project is running.
  const original = page.viewportSize();
  await page.setViewportSize(PHONE);
  await expectNoSidewaysScroll(page, `${label} at 390px`);
  await expectNoAxeViolations(page, `${label} at 390px`);
  if (original) await page.setViewportSize(original);

  errors.expectClean(label);
}

test.describe("public pages", () => {
  for (const { path, indexable } of PUBLIC_PAGES) {
    test(`${path} is healthy`, async ({ page }) => {
      let robotsHeader: string | undefined;
      await checkPage(page, path, async () => {
        const response = await page.goto(path);
        robotsHeader = response?.headers()["x-robots-tag"];
        return response?.status();
      });
      // Only the home page and the template gallery may be indexed: header and meta tag agree.
      if (indexable) {
        expect(robotsHeader ?? "").not.toContain("noindex");
        await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      } else {
        expect(robotsHeader).toContain("noindex");
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      }
    });
  }

  test("the site looks like www: brand header, footer and typefaces", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Managevent Invitations" }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    const fonts = await page.evaluate(() => ({
      heading: getComputedStyle(document.querySelector("h1") as Element).fontFamily,
      body: getComputedStyle(document.body).fontFamily,
    }));
    expect(fonts.heading).toContain("Cormorant Garamond");
    expect(fonts.body).toContain("Plus Jakarta Sans");
  });

  test("the sign-up and sign-in pages offer only what this deployment can do", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    // A sign-in link by email is offered only when email sending is configured.
    const magicOff = page.getByText("Sign-in links by email are not set up yet.");
    if ((await magicOff.count()) > 0) {
      await expect(page.getByRole("button", { name: /Email me a sign-in link/ })).toHaveCount(0);
    }
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Create account" }).click();
    // Nothing typed: the form explains itself and sends nothing.
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  });

  test("the studio and the door send a signed-out visitor to sign in, and back again", async ({
    page,
  }) => {
    await page.goto("/studio/new?template=royal-classic");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fstudio%2Fnew%3Ftemplate%3Droyal-classic$/);
    await page.goto("/check-in/evt_does_not_exist");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcheck-in%2Fevt_does_not_exist$/);
  });
});

test.describe("sample invitations", () => {
  test("there is one for each of the six templates", async ({ request, appOrigin }) => {
    const demos = await loadDemos(request, appOrigin);
    expect(demos.map((demo) => demo.templateSlug).sort()).toEqual([
      "botanic-garden",
      "celestial-evening",
      "memorial-calm",
      "memorial-linen",
      "modern-minimal",
      "royal-classic",
    ]);
  });

  // One test per sample, so a failure names the template. The list is read inside each test:
  // sample links are data from the API, never constants in this repository.
  for (const index of [0, 1, 2, 3, 4, 5]) {
    test(`sample ${index + 1} is healthy, with the gate closed and opened`, async ({
      page,
      request,
      appOrigin,
    }) => {
      const demo = (await loadDemos(request, appOrigin))[index];
      if (!demo) throw new Error(`sample ${index + 1} is not seeded`);
      const label = `sample ${demo.templateSlug}`;

      // Opened: the whole invitation.
      await checkPage(page, label, async () => {
        const response = await page.goto(`${demoPath(demo)}?opened=1`);
        expect(response?.headers()["x-robots-tag"]).toContain("noindex");
        expect(response?.headers()["cache-control"]).toMatch(/no-store|private/);
        return response?.status();
      });
      await expect(page.locator(".inv")).toHaveAttribute("data-theme", demo.themeId);
      await expect(page.locator("h1")).toHaveText(demo.headline);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByText("Sample invitation.")).toBeVisible();

      // Closed: the gate is itself accessible, and opens from the keyboard.
      const errors = watchForPageErrors(page);
      expect((await page.goto(demoPath(demo)))?.status()).toBe(200);
      await expect(page.locator(".inv-gate")).toBeVisible();
      await expectNoAxeViolations(page, `${label} gate`);
      await expectNoSidewaysScroll(page, `${label} gate`);
      await page.locator(".inv-gate-open").focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".inv-gate")).toHaveCount(0);
      await expect(page.locator("#invitation")).not.toHaveAttribute("inert", "");
      errors.expectClean(`${label} gate`);

      // Memorial samples are calm; celebrations count down.
      if (demo.experienceMode === "MEMORIAL") {
        await expect(page.locator(".inv")).toHaveAttribute("data-experience-mode", "memorial");
        await expect(page.locator(".inv-countdown")).toHaveCount(0);
      } else {
        await expect(page.locator(".inv-countdown")).toBeVisible();
      }
    });
  }
});

test.describe("a guest page without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("still says who is invited, when and where", async ({ page, request, appOrigin }) => {
    const [demo] = await loadDemos(request, appOrigin);
    if (!demo) throw new Error("no sample invitation");
    const response = await page.goto(demoPath(demo));
    expect(response?.status()).toBe(200);

    // Who.
    await expect(page.locator(".inv-gate")).toBeHidden();
    await expect(page.getByText(`Dear ${SAMPLE_PARTY}`)).toBeVisible();
    await expect(page.locator("h1")).toHaveText(demo.headline);
    await expect(page.getByText(demo.hosts).first()).toBeVisible();
    // When: a full date with its weekday and a time, already in the event's time zone.
    await expect(page.locator(".inv-hero-date")).toHaveText(/^\w+day, \d{1,2} \w+ \d{4}$/);
    await expect(page.getByText(/\d{1,2}:\d{2} (AM|PM)/).first()).toBeVisible();
    // Where: the venue, its address and a maps link that is a plain link.
    await expect(page.locator(".inv-detail address")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open in Maps" })).toHaveAttribute(
      "href",
      /^https:\/\//,
    );
    await expect(page.getByRole("link", { name: "Add to calendar" }).first()).toHaveAttribute(
      "href",
      `${demoPath(demo)}/calendar.ics`,
    );
    // Replying needs JavaScript, and the page says so instead of showing a dead form.
    await expect(page.locator(".inv-noscript")).toContainText("needs JavaScript");
    await expect(page.locator("form.inv-form").first()).toBeHidden();
  });
});

test.describe("links that lead nowhere", () => {
  test("an unknown guest token is a real 404, on the page, the pass and the calendar", async ({
    page,
    request,
    appOrigin,
  }) => {
    const [demo] = await loadDemos(request, appOrigin);
    if (!demo) throw new Error("no sample invitation");
    const unknown = `/i/${demo.eventSlug}/not-a-real-guest-2b3c4d5f`;
    for (const path of [
      unknown,
      `${unknown}/pass`,
      `${unknown}/calendar.ics`,
      "/i/no-such-event-zzzz/someone-2b3c4d5f",
      // A token that is not even token-shaped must not be an error page.
      `/i/${demo.eventSlug}/%3Cscript%3E`,
    ]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status(), path.replace(demo.eventSlug, "{sample}")).toBe(404);
      expect(response.headers()["x-robots-tag"]).toContain("noindex");
    }
    const response = await page.goto(unknown);
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("We cannot find that page");
    // The 404 gives nothing away about the event the slug belongs to.
    expect(await page.content()).not.toContain(demo.title);
  });

  test("an unknown page is a branded 404 with a way back", async ({ page }) => {
    const response = await page.goto("/there-is-nothing-here");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("banner")).toBeVisible();
    await expectNoAxeViolations(page, "404");
    await expectNoSidewaysScroll(page, "404");
  });
});

/**
 * Guests mostly arrive from a chat app, whose built-in browser has its own user agent and can
 * refuse storage. The page must not depend on either.
 */
const IN_APP_BROWSERS = [
  {
    name: "WhatsApp (Android)",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.12.78",
  },
  {
    name: "Instagram (iPhone)",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.0.27.103 (iPhone15,2; iOS 17_5; en_AU; en-AU; scale=3.00; 1179x2556; 612062163)",
  },
  {
    name: "Facebook (iPhone)",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/468.0.0.44.108;FBBV/606932137;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_GB;FBOP/5]",
  },
];

for (const inApp of IN_APP_BROWSERS) {
  test.describe(`inside ${inApp.name}`, () => {
    test.use({ userAgent: inApp.userAgent, viewport: PHONE, hasTouch: true });

    test("the invitation opens and the reply form works with storage refused", async ({
      page,
      request,
      appOrigin,
    }) => {
      // Some in-app browsers throw on any use of storage. Nothing on a guest page may need it.
      await page.addInitScript(() => {
        const refuse = () => {
          throw new DOMException("The operation is insecure.", "SecurityError");
        };
        for (const name of ["localStorage", "sessionStorage"] as const) {
          Object.defineProperty(window, name, { get: refuse, configurable: true });
        }
      });
      const errors = watchForPageErrors(page);
      const [demo] = await loadDemos(request, appOrigin);
      if (!demo) throw new Error("no sample invitation");

      expect((await page.goto(demoPath(demo)))?.status()).toBe(200);
      await expect(page.locator(".inv-gate")).toBeVisible();
      await page.locator(".inv-gate-open").tap();
      await expect(page.locator(".inv-gate")).toHaveCount(0);
      // The opened state lives in the address, so a reload inside the app keeps it.
      await expect(page).toHaveURL(/opened=1/);

      await expect(page.locator("h1")).toHaveText(demo.headline);
      await expect(page.locator(".inv-detail address")).toBeVisible();
      await page.getByRole("radio", { name: "Yes, I will be there" }).first().check();
      await expect(page.getByText("Dietary needs for").first()).toBeVisible();
      await expectNoSidewaysScroll(page, `sample in ${inApp.name}`);
      errors.expectClean(`sample in ${inApp.name}`);
    });
  });
}
