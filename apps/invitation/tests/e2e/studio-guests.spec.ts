import type { Page } from "@playwright/test";
import {
  API_URL,
  apiHeaders,
  type ApiHost,
  expect,
  expectNoAxeViolations as expectNoAxe,
  expectNoSidewaysScroll as expectNoScroll,
  localDateTime,
  signUpHost,
  test,
  uniqueVisitorIp,
} from "./support/stack";

/**
 * The guest side of the Host Studio: guest list, share, responses, awaiting replies and door
 * check-in, end to end against the real stack (see the README).
 *
 * Each test signs up its own throwaway host through the API and creates its own event, so
 * nothing depends on earlier runs. The event is a memorial service: memorial events include
 * every feature at no cost, so door check-in can be exercised without a card payment, and the
 * calm wording is checked on the way.
 *
 * Email sending and card payments are off in a local stack. The specs assert the honest
 * "not set up yet" notices rather than the sending forms.
 */

type Host = ApiHost;

interface Party {
  id: string;
  displayName: string;
  invitePath: string;
  guests: { id: string; name: string }[];
}

async function createMemorial(host: Host) {
  const event = await host.call<{ id: string }>("post", "/v1/events", {
    title: "A service for Edith Carroway",
    ceremonySlug: "memorial-service",
    startsAtLocal: localDateTime(60, 11),
    timeZone: "Australia/Perth",
    templateSlug: "memorial-calm",
    hosts: "The Carroway family",
    honoureeName: "Edith Carroway",
    venue: { name: "Karrakatta Chapel", address: "Railway Road, Karrakatta WA 6010" },
  });
  const carroway = await host.call<Party>("post", `/v1/events/${event.id}/parties`, {
    displayName: "The Carroway family",
    tableLabel: "2",
    tags: ["Family"],
    guests: [{ name: "Henry Carroway", phone: "0412 345 678" }, { name: "June Carroway" }],
  });
  const okafor = await host.call<Party>("post", `/v1/events/${event.id}/parties`, {
    displayName: "Amara Okafor",
    tags: ["Friends"],
    guests: [{ name: "Amara Okafor" }],
  });
  await host.call("post", `/v1/events/${event.id}/invitation/publish`);
  return { eventId: event.id, carroway, okafor };
}

const expectNoAxeViolations = (page: Page) => expectNoAxe(page, "this page", "main");

const expectNoSidewaysScroll = (page: Page) => expectNoScroll(page, "this page");

test.describe("Host Studio: guests, share, responses and the door", () => {
  test("signed out, every page sends the host to sign in", async ({ page }) => {
    for (const path of ["/studio/evt_x/guests", "/studio/evt_x/share", "/check-in/evt_x"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in\?next=/);
    }
  });

  test("guest list: add a household, validate, filter and record a reply", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "guests");
    const { eventId } = await createMemorial(host);
    await host.signIn(context);

    await page.goto(`/studio/${eventId}/guests`);
    await expect(page.getByRole("heading", { level: 1, name: "Guests" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The Carroway family" })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectNoAxeViolations(page);

    // Keyboard: Enter opens the dialog, Escape closes it and focus returns to the button.
    const addButton = page.getByRole("button", { name: "Add household" });
    await addButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Add a household" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(addButton).toBeFocused();

    // Add a household: inline validation first, then a real add.
    await page.getByRole("button", { name: "Add household" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a household" });
    await dialog.getByRole("button", { name: "Add household", exact: true }).click();
    await expect(dialog.getByText("Enter a name for this household.")).toBeVisible();
    await dialog.getByLabel("Household name").fill("Helen and Peter Marsh");
    await dialog.getByLabel("Guest 1", { exact: true }).fill("Helen Marsh");
    await dialog.getByRole("button", { name: "Add another guest" }).click();
    await dialog.getByLabel("Guest 2", { exact: true }).fill("Peter Marsh");
    await dialog.getByLabel("Tags (optional)").fill("Neighbours");
    await dialog.getByRole("button", { name: "Add household", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Helen and Peter Marsh" })).toBeVisible();

    // Search and the reply filter work on what is loaded.
    await page.getByLabel("Search guests").fill("peter");
    await expect(page.locator(".sb-party")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator(".sb-party")).toHaveCount(3);

    // A reply taken by phone.
    await page.getByRole("button", { name: "Record a reply for Amara Okafor" }).click();
    const reply = page.getByRole("dialog", { name: "Record a reply" });
    await reply.getByRole("radio", { name: "Not attending" }).check();
    await reply.getByRole("button", { name: "Save reply" }).click();
    await expect(
      page.locator(".sb-party", { hasText: "Amara Okafor" }).getByText("Not attending"),
    ).toBeVisible();

    // Memorial events never see an upsell.
    await expect(page.getByText(/Premium/)).toHaveCount(0);
  });

  test("CSV import shows a preview with row problems before anything is added", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "guests");
    const { eventId } = await createMemorial(host);
    await host.signIn(context);

    await page.goto(`/studio/${eventId}/guests`);
    await page.getByRole("button", { name: "Import from a file" }).click();
    const dialog = page.getByRole("dialog", { name: "Import guests from a file" });
    await expect(dialog.getByRole("link", { name: "Download a CSV template" })).toHaveAttribute(
      "href",
      /^data:text\/csv/,
    );
    await dialog.getByText("Or paste rows").click();
    await dialog
      .getByLabel("Pasted rows")
      .fill(
        [
          "name,party,email,child",
          "Ana Petrovic,Petrovic family,ana@example.org,no",
          "Milan Petrovic,Petrovic family,,yes",
          ",Petrovic family,,",
          "James Whitlock,,not-an-email,no",
        ].join("\n"),
      );
    await dialog.getByRole("button", { name: "Check file" }).click();
    await expect(dialog.getByText("2 households and 3 guests are ready to add.")).toBeVisible();
    await expect(dialog.getByText("No guest name, so this row is skipped.")).toBeVisible();
    await expect(dialog.getByText(/The email address is not valid/)).toBeVisible();
    // Nothing has been added yet.
    await expect(page.locator(".sb-party")).toHaveCount(2);
    await dialog.getByRole("button", { name: "Add 3 guests" }).click();
    await expect(page.getByRole("heading", { name: "Petrovic family" })).toBeVisible();
    await expect(page.locator(".sb-party")).toHaveCount(4);
  });

  test("share: private link, WhatsApp, QR code, and turning a link off and on", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "guests");
    const { eventId, carroway } = await createMemorial(host);
    await host.signIn(context);

    await page.goto(`/studio/${eventId}/share`);
    await expectNoSidewaysScroll(page);
    await expectNoAxeViolations(page);
    const row = page.locator(".sb-party", { hasText: "The Carroway family" });

    // WhatsApp: the Australian mobile in international form, a calm message and the link.
    const whatsApp = await row.getByRole("link", { name: /WhatsApp/ }).getAttribute("href");
    expect(whatsApp).toMatch(/^https:\/\/wa\.me\/61412345678\?text=/);
    const message = decodeURIComponent(whatsApp ?? "");
    expect(message).toContain("Dear The Carroway family,");
    expect(message).toContain(carroway.invitePath);
    expect(message).not.toMatch(/!/);
    // No mobile on file: WhatsApp asks the host who to send it to.
    await expect(
      page
        .locator(".sb-party", { hasText: "Amara Okafor" })
        .getByRole("link", { name: /WhatsApp/ }),
    ).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);

    // QR code with a PNG download.
    await row.getByRole("button", { name: /QR code/ }).click();
    const qr = page.getByRole("dialog", { name: /QR code for The Carroway family/ });
    await expect(qr.getByRole("img")).toBeVisible();
    await expect(qr.getByRole("link", { name: "Download PNG" })).toHaveAttribute(
      "href",
      /^data:image\/png/,
    );
    await page.keyboard.press("Escape");

    // Turn the link off (confirmed), then issue a new one.
    await row.locator("summary").click();
    await page.getByRole("button", { name: "Turn off this link" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Turn off link" }).click();
    await expect(row.getByText("Link turned off", { exact: true })).toBeVisible();
    const gone = await request.get(`${API_URL}/v1${carroway.invitePath}`, {
      headers: apiHeaders(appOrigin, uniqueVisitorIp()),
    });
    expect(gone.status(), "the old link is gone").toBe(410);
    await row.getByRole("button", { name: "Issue a new link" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Issue new link" }).click();
    await expect(row.getByRole("button", { name: "Copy link" })).toBeVisible();

    // Email is not configured locally: say so, never show a form that cannot send.
    await expect(
      page.getByText("Email sending is not set up yet: share by link, WhatsApp or QR."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Send .*invitation/ })).toHaveCount(0);
  });

  test("responses, CSV download and awaiting replies", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "guests");
    const { eventId, carroway } = await createMemorial(host);
    await host.call("put", `/v1/events/${eventId}/parties/${carroway.id}/rsvp`, {
      members: carroway.guests.map((guest) => ({ guestId: guest.id, status: "YES" })),
    });
    await host.signIn(context);

    await page.goto(`/studio/${eventId}/responses`);
    await expect(page.getByRole("heading", { level: 1, name: "Responses" })).toBeVisible();
    await expect(page.locator(".stat", { hasText: "Adults attending" })).toContainText("2");
    await expect(page.locator(".stat", { hasText: "Awaiting reply" })).toContainText("1");
    await expectNoSidewaysScroll(page);
    await expectNoAxeViolations(page);

    for (const query of ["", "?includeHealth=true"]) {
      const csv = await context.request.get(`/studio/${eventId}/responses/export.csv${query}`);
      expect(csv.status()).toBe(200);
      expect(csv.headers()["content-type"]).toContain("text/csv");
      expect(csv.headers()["content-disposition"]).toMatch(/attachment; filename="[^"]+\.csv"/);
      expect(csv.headers()["cache-control"]).toContain("no-store");
      const body = await csv.body();
      expect([body[0], body[1], body[2]], "UTF-8 byte order mark").toEqual([0xef, 0xbb, 0xbf]);
      expect(body.toString("utf8").includes("Allergy Severity")).toBe(query !== "");
    }

    await page.getByRole("link", { name: "Awaiting replies" }).click();
    await page.waitForURL(new RegExp(`/studio/${eventId}/awaiting$`));
    await expect(page.getByRole("heading", { level: 1, name: "Awaiting replies" })).toBeVisible();
    await expect(page.getByText("1 household is still to reply.")).toBeVisible();
    const row = page.locator(".sb-party", { hasText: "Amara Okafor" });
    await expect(row.getByRole("button", { name: "Copy reminder" })).toBeVisible();
    await expectNoAxeViolations(page);
    await row.getByRole("button", { name: /Record a reply/ }).click();
    const reply = page.getByRole("dialog", { name: "Record a reply" });
    await reply.getByRole("radio", { name: "Attending", exact: true }).check();
    await reply.getByRole("button", { name: "Save reply" }).click();
    await expect(page.getByRole("heading", { name: "Everyone has replied" })).toBeVisible();
  });

  test("door check-in: search, check in, and clear feedback for a repeat or unknown pass", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "guests");
    const { eventId, carroway } = await createMemorial(host);
    await host.call("put", `/v1/events/${eventId}/parties/${carroway.id}/rsvp`, {
      members: carroway.guests.map((guest) => ({ guestId: guest.id, status: "YES" })),
    });
    const passes = await host.call<{ passes: { guestName: string; qr: string }[] }>(
      "get",
      `/v1${carroway.invitePath}/passes`,
    );
    const junePass = passes.passes.find((pass) => pass.guestName === "June Carroway");
    expect(junePass, "an attending guest has a pass").toBeTruthy();

    await page.goto(`${carroway.invitePath}/pass`);
    await expect(page.locator(".inv-pass")).toHaveCount(2);
    await expect(page.locator(".inv-pass-qr img").first()).toBeVisible();
    const labelTransform = await page
      .locator(".inv-pass-code-label")
      .first()
      .evaluate((el) => getComputedStyle(el).textTransform);
    expect(labelTransform).toBe("none");

    await host.signIn(context);

    await page.goto(`/check-in/${eventId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Door check-in" })).toBeVisible();
    const totals = page.locator(".sb-door-totals dd");
    await expect(totals).toHaveText(["0", "2"]);
    await expectNoSidewaysScroll(page);
    await expectNoAxeViolations(page);

    await page.getByLabel("Find a guest").fill("henry");
    await expect(page.locator(".sb-door-row")).toHaveCount(1);
    await page.getByRole("button", { name: "Check in Henry Carroway" }).click();
    const result = page.locator(".sb-door-result");
    await expect(result).toHaveAttribute("data-tone", "success");
    await expect(result).toContainText("Checked in");
    await expect(result).toContainText("Henry Carroway is checked in.");
    await expect(totals).toHaveText(["1", "2"]);
    await page.getByRole("button", { name: "Clear search" }).click();

    // A pass code: first time checks in, second time is a clear "already checked in".
    await page.getByRole("button", { name: "Enter a pass code" }).click();
    const code = page.getByLabel("Pass code");
    const submit = page.locator(".sb-door-code").getByRole("button", { name: "Check in" });
    await code.fill(junePass?.qr ?? "");
    await submit.click();
    await expect(result).toContainText("June Carroway is checked in.");
    await code.fill(junePass?.qr ?? "");
    await submit.click();
    await expect(result).toHaveAttribute("data-tone", "warning");
    await expect(result).toContainText("Already checked in");
    await code.fill("MV1.not-a-real-pass.signature");
    await submit.click();
    await expect(result).toHaveAttribute("data-tone", "danger");
    await expect(result).toContainText("Pass not recognised");
    await expect(totals).toHaveText(["2", "2"]);
  });

  test("door check-in on the free plan explains Premium honestly", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "guests");
    const event = await host.call<{ id: string }>("post", "/v1/events", {
      title: "Spec birthday",
      ceremonySlug: "birthday",
      startsAtLocal: localDateTime(60, 18),
      timeZone: "Australia/Perth",
      templateSlug: "modern-minimal",
      hosts: "Spec Host",
    });
    const me = await host.call<{ capabilities: { stripeCheckout: boolean } }>("get", "/v1/me");
    await host.signIn(context);

    await page.goto(`/check-in/${event.id}`);
    await expect(
      page.getByRole("heading", { name: "Door check-in is part of the Premium Event Pass" }),
    ).toBeVisible();
    if (me.capabilities.stripeCheckout) {
      await expect(page.getByRole("link", { name: "See what Premium includes" })).toBeVisible();
    } else {
      await expect(page.getByText(/Card payments are not switched on yet/)).toBeVisible();
      await expect(page.getByRole("link", { name: "Contact us" })).toBeVisible();
    }
  });
});
