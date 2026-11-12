import AxeBuilder from "@axe-core/playwright";
import {
  demoPath,
  expect,
  loadDemos,
  localDateTime,
  openGate,
  SAMPLE_PARTY,
  signUpHost,
  test,
  WCAG_TAGS as WCAG,
} from "./support/stack";

/**
 * The guest micro-site: `/i/{eventSlug}/{guestToken}`, its passes and its calendar file.
 *
 * Runs against the real stack (API on 4000 with the six sample invitations seeded, see the
 * README). The read-only checks use the samples; the reply flow signs up a throwaway host
 * through the API and creates its own event, so nothing here depends on earlier runs.
 *
 * Each test presents its own visitor address (see `support/stack.ts`), so the API's per-visitor
 * limits on guest pages apply to it alone.
 */

test.describe("sample invitations", () => {
  test("every theme renders the guest's own page: noindex, themed, accessible, no guest name in metadata", async ({
    page,
    request,
    appOrigin,
  }) => {
    const demos = await loadDemos(request, appOrigin);
    expect(demos).toHaveLength(6);

    for (const demo of demos) {
      const response = await page.goto(`${demoPath(demo)}?opened=1`);
      expect(response?.status(), demo.themeId).toBe(200);
      expect(response?.headers()["x-robots-tag"]).toContain("noindex");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

      await expect(page.locator(".inv")).toHaveAttribute("data-theme", demo.themeId);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(demo.headline);
      await expect(page.getByText(`Dear ${SAMPLE_PARTY}`)).toBeVisible();
      await expect(page.getByText("Sample invitation.")).toBeVisible();

      // Link previews carry the event title only.
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        demo.title,
      );
      const head = await page.locator("head").innerHTML();
      expect(head, "no guest name in the document head").not.toContain(SAMPLE_PARTY);
      expect(head, "no guest link in the document head").not.toContain(demo.guestToken);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${demo.themeId} has no sideways scroll`).toBeLessThanOrEqual(0);

      // Accessibility scan, once the countdown has filled in after hydration.
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations.map((violation) => `${demo.themeId}: ${violation.id}`)).toEqual([]);
    }
  });

  test("the gate opens with a tap or Enter and is not replayed", async ({
    page,
    request,
    appOrigin,
  }) => {
    const [celebration] = await loadDemos(request, appOrigin);
    if (!celebration) throw new Error("no sample invitation");

    await page.goto(demoPath(celebration));
    await expect(page.locator(".inv-gate")).toBeVisible();
    await expect(page.locator(".inv-gate")).toContainText(SAMPLE_PARTY);
    // The invitation behind the gate cannot be reached until it is opened.
    await expect(page.locator("#invitation")).toHaveAttribute("inert", "");
    await openGate(page);
    await expect(page).toHaveURL(/opened=1/);
    await expect(page.locator("#invitation")).not.toHaveAttribute("inert", "");

    await page.reload();
    await expect(page.locator(".inv-gate")).toHaveCount(0);

    await page.goto(demoPath(celebration));
    await page.keyboard.press("Enter");
    await expect(page.locator(".inv-gate")).toHaveCount(0);
  });

  test("a sample can be explored but nothing can be sent", async ({ page, request, appOrigin }) => {
    const [demo] = await loadDemos(request, appOrigin);
    if (!demo) throw new Error("no sample invitation");
    await page.goto(`${demoPath(demo)}?opened=1`);
    await expect(page.getByText("This is a sample, so you can try the form")).toBeVisible();
    await page.getByRole("radio", { name: "Yes, I will be there" }).first().check();
    await expect(page.getByText("Dietary needs for")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reply" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  test("the calendar file downloads and the pass page explains itself", async ({
    page,
    request,
    appOrigin,
  }) => {
    const [demo] = await loadDemos(request, appOrigin);
    if (!demo) throw new Error("no sample invitation");

    const calendar = await page.request.get(`${demoPath(demo)}/calendar.ics`);
    expect(calendar.status()).toBe(200);
    expect(calendar.headers()["content-type"]).toContain("text/calendar");
    expect(calendar.headers()["content-disposition"]).toMatch(/^attachment; filename=".+\.ics"$/);
    const ics = await calendar.text();
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).not.toContain(SAMPLE_PARTY);

    const response = await page.goto(`${demoPath(demo)}/pass`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { name: "No passes yet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to your invitation" })).toBeVisible();
  });

  test("an unknown link is a real 404", async ({ page, request, appOrigin }) => {
    const [demo] = await loadDemos(request, appOrigin);
    if (!demo) throw new Error("no sample invitation");
    const response = await page.goto(`/i/${demo.eventSlug}/not-a-real-guest-2b3c4d5f`);
    expect(response?.status()).toBe(404);
    const calendar = await page.request.get(
      `/i/${demo.eventSlug}/not-a-real-guest-2b3c4d5f/calendar.ics`,
    );
    expect(calendar.status()).toBe(404);
  });
});

test.describe("memorial fixture", () => {
  test("renders calm: plain open, no countdown, no celebration ornament or wording", async ({
    page,
    request,
    appOrigin,
  }) => {
    const memorial = (await loadDemos(request, appOrigin)).find(
      (demo) => demo.experienceMode === "MEMORIAL",
    );
    if (!memorial) throw new Error("no memorial sample");

    await page.goto(demoPath(memorial));
    await expect(page.locator(".inv")).toHaveAttribute("data-experience-mode", "memorial");
    await expect(page.locator(".inv-gate")).toHaveAttribute("data-gate", "plain-fade");
    await expect(page.locator(".inv-seal")).toHaveCount(0);
    await expect(page.locator(".inv-gate-open")).toHaveText("Open");
    await openGate(page);

    await expect(page.locator(".inv-countdown")).toHaveCount(0);
    await expect(page.locator(".inv-starfield, .inv-branch")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Tribute book" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wishing well" })).toHaveCount(0);
    const text = (await page.locator("#rsvp").innerText()).toLowerCase();
    expect(text).not.toMatch(/dance floor|cannot wait|!/);
    await expect(page.getByRole("radio", { name: "I will attend" }).first()).toBeVisible();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("who, when and where, the reply link and the calendar link are all there", async ({
    page,
    request,
    appOrigin,
  }) => {
    const [demo] = await loadDemos(request, appOrigin);
    if (!demo) throw new Error("no sample invitation");
    await page.goto(demoPath(demo));

    await expect(page.locator(".inv-gate")).toBeHidden();
    await expect(page.getByText(`Dear ${SAMPLE_PARTY}`)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(demo.headline);
    await expect(page.locator(".inv-hero-date")).toHaveText(/^\w+day, \d{1,2} \w+ \d{4}$/);
    await expect(page.locator(".inv-detail address")).toBeVisible();
    await expect(page.getByRole("link", { name: "Reply", exact: true })).toHaveAttribute(
      "href",
      "#rsvp",
    );
    await expect(page.getByRole("link", { name: "Add to calendar" }).first()).toHaveAttribute(
      "href",
      `${demoPath(demo)}/calendar.ics`,
    );
    await expect(page.getByRole("link", { name: "Open in Maps" })).toBeVisible();
    // The notice lives in a <noscript>, which text locators skip.
    await expect(page.locator(".inv-noscript")).toBeVisible();
    await expect(page.locator(".inv-noscript")).toContainText("needs JavaScript");
    await expect(page.locator("form.inv-form").first()).toBeHidden();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the gate fades instead of playing its sequence", async ({ page, request, appOrigin }) => {
    const [demo] = await loadDemos(request, appOrigin);
    if (!demo) throw new Error("no sample invitation");
    await page.goto(demoPath(demo));
    await page.locator(".inv-gate-open").click();
    await expect(page.locator(".inv-gate")).toHaveCount(0, { timeout: 600 });
  });
});

test.describe("a real reply", () => {
  test("a household replies with dietary needs and a plus-one, and the host sees it", async ({
    page,
    request,
    appOrigin,
  }) => {
    const api = await signUpHost(request, appOrigin, "guest");
    const host = api.call.bind(api);
    const event = await host<{
      id: string;
      invitation: { rsvpConfig: Record<string, unknown> };
    }>("post", "/v1/events", {
      title: "Guest spec dinner",
      ceremonySlug: "birthday",
      startsAtLocal: localDateTime(45, 18),
      timeZone: "Australia/Perth",
      templateSlug: "royal-classic",
      hosts: "Hosted by the spec",
      venue: { name: "The Test Kitchen", address: "1 Example Street, Perth WA 6000" },
    });
    await host("patch", `/v1/events/${event.id}/invitation`, {
      rsvpConfig: { ...event.invitation.rsvpConfig, askContact: true },
    });
    const party = await host<{ invitePath: string }>("post", `/v1/events/${event.id}/parties`, {
      displayName: "The Okafor family",
      maxSeats: 3,
      allowPlusOnes: true,
      guests: [{ name: "Ada Okafor" }, { name: "Ben Okafor" }],
    });
    const revoked = await host<{ id: string; invitePath: string }>(
      "post",
      `/v1/events/${event.id}/parties`,
      { displayName: "Former Guest", guests: [{ name: "Former Guest" }] },
    );
    await host("post", `/v1/events/${event.id}/invitation/publish`);
    await host("post", `/v1/events/${event.id}/parties/${revoked.id}/revoke-link`);

    await page.goto(`${party.invitePath}?opened=1`);
    await expect(page.getByText("Dear The Okafor family")).toBeVisible();

    // Nothing chosen: every person needs an answer, and the form says so.
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.locator(".error-summary")).toBeFocused();
    await expect(page.locator(".error-summary")).toContainText("Please check your reply");
    await expect(
      page.getByRole("link", { name: "Choose an answer for Ada Okafor." }),
    ).toBeVisible();

    const ada = page.locator('section[aria-label="Ada Okafor"]');
    await ada.getByRole("radio", { name: "Yes, I will be there" }).check();
    await page
      .locator('section[aria-label="Ben Okafor"]')
      .getByRole("radio", { name: "Sorry, I cannot make it" })
      .check();
    await expect(page.getByText("Please check your reply")).toHaveCount(0);

    await ada.getByRole("checkbox", { name: "Nut allergy" }).check();
    await ada.getByLabel("How serious is the allergy?").selectOption("SEVERE_ANAPHYLAXIS");
    await ada.getByLabel(/Allergy details/).fill("Peanuts and cashews");
    await page.getByRole("button", { name: "Add a guest" }).click();
    await page.getByLabel("Their name").fill("Chi Okafor");
    await page.getByLabel("Song 1").fill("Lovely Day");
    await page.getByLabel(/A message for the hosts/).fill("Thank you for having us.");

    // Health information needs explicit consent, and the box starts unticked.
    const consent = page.getByLabel(/I agree that the dietary, allergy and access details/);
    await expect(consent).not.toBeChecked();
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(
      page.getByRole("link", { name: /Tick the box to agree, or remove the food/ }),
    ).toBeVisible();
    await expect(ada.getByLabel(/Allergy details/)).toHaveValue("Peanuts and cashews");
    await consent.check();
    await page.getByRole("button", { name: "Send reply" }).click();

    await expect(page.getByRole("heading", { name: /We cannot wait to see you/ })).toBeVisible();
    await expect(page.locator(".inv-reply-list")).toContainText("Chi Okafor");

    // Stored: a reload shows the reply, and health values are never sent back to the browser.
    await page.reload();
    const reply = page.locator(".inv-reply");
    await expect(reply).toContainText("Ada Okafor");
    await expect(reply).toContainText("Food and access details on file");
    await expect(reply).toContainText("Lovely Day");
    expect(await page.content()).not.toContain("Peanuts and cashews");

    // Changing the reply keeps what is on file unless the guest chooses to replace it.
    await page.getByRole("button", { name: "Change my reply" }).click();
    await expect(
      page.getByText(/We already have food and access details for Ada Okafor/),
    ).toBeVisible();
    await page
      .locator('section[aria-label="Ben Okafor"]')
      .getByRole("radio", { name: "Yes, I will be there" })
      .check();
    await page.getByRole("button", { name: "Update reply" }).click();
    await expect(page.locator(".inv-confirm")).toBeVisible();

    const summary = await host<{
      totals: { adultsYes: number };
      severeAllergyCount: number;
      dietaryCounts: Record<string, number>;
    }>("get", `/v1/events/${event.id}/responses`);
    expect(summary.totals.adultsYes).toBe(3);
    expect(summary.severeAllergyCount).toBe(1);
    expect(summary.dietaryCounts.NUT_ALLERGY).toBe(1);

    // A link the host has turned off: 410 on every guest path, with nothing about the event.
    for (const suffix of ["", "/pass", "/calendar.ics"]) {
      const gone = await page.request.get(`${revoked.invitePath}${suffix}`);
      expect(gone.status(), `revoked${suffix}`).toBe(410);
      expect(gone.headers()["x-robots-tag"]).toContain("noindex");
    }
    await page.goto(revoked.invitePath);
    await expect(
      page.getByRole("heading", { name: "This link is no longer active" }),
    ).toBeVisible();
    expect(await page.content()).not.toContain("Guest spec dinner");
  });
});

test.describe("after the reply date", () => {
  test("the page says replies have closed and stops offering a reply", async ({
    page,
    request,
    appOrigin,
  }) => {
    const api = await signUpHost(request, appOrigin, "closed");
    const host = api.call.bind(api);
    const event = await host<{ id: string }>("post", "/v1/events", {
      title: "Closed replies lunch",
      ceremonySlug: "birthday",
      startsAtLocal: localDateTime(20, 12),
      timeZone: "Australia/Perth",
      templateSlug: "modern-minimal",
      hosts: "Hosted by the spec",
      venue: { name: "The Test Kitchen", address: "1 Example Street, Perth WA 6000" },
    });
    const replied = await host<{ invitePath: string }>("post", `/v1/events/${event.id}/parties`, {
      displayName: "Early Bird",
      guests: [{ name: "Early Bird" }],
    });
    const silent = await host<{ invitePath: string }>("post", `/v1/events/${event.id}/parties`, {
      displayName: "Late Riser",
      guests: [{ name: "Late Riser" }],
    });
    await host("post", `/v1/events/${event.id}/invitation/publish`);

    // One household answers while replies are open.
    await page.goto(`${replied.invitePath}?opened=1`);
    await page.getByRole("radio", { name: "Yes, I will be there" }).check();
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.getByRole("button", { name: "Change my reply" })).toBeVisible();

    // The host moves the reply date into the past.
    await host("patch", `/v1/events/${event.id}/invitation`, {
      rsvpDeadlineLocal: localDateTime(-1, 17),
    });

    // A household that never answered: no reply button to lead them to a closed form, and the
    // calendar becomes the main action. The details are all still there.
    await page.goto(`${silent.invitePath}?opened=1`);
    await expect(page.getByText("Replies have closed")).toBeVisible();
    const hero = page.locator(".inv-hero-actions");
    await expect(hero.getByRole("link", { name: "Reply", exact: true })).toHaveCount(0);
    await expect(hero.getByRole("link", { name: "Add to calendar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reply" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Closed replies lunch");

    // The household that answered can still find what they said.
    await page.goto(`${replied.invitePath}?opened=1`);
    await expect(page.locator(".inv-hero-actions").getByRole("link").first()).toHaveAttribute(
      "href",
      "#rsvp",
    );
    await expect(page.getByRole("button", { name: "Change my reply" })).toHaveCount(0);

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(
      results.violations.map((item) => item.id),
      "axe on a closed invitation",
    ).toEqual([]);
  });
});
