import type { Page } from "@playwright/test";
import {
  type ApiHost,
  demoPath,
  expect,
  expectNoAxeViolations,
  futureDate,
  loadDemos,
  localDateTime,
  newVisitorContext,
  PASSWORD,
  signUpHost,
  test,
} from "./support/stack";

/**
 * What must keep working when things go wrong, and what must never leave the server: a dropped
 * connection at the door or in a dialog, a redirecting action, a host reloading a draft
 * preview, the auth proxy, the personal details a screen receives, and the fallbacks for
 * devices that cannot copy or scan.
 *
 * Real stack, as everywhere in `tests/e2e`. Each test signs up its own host and makes its own
 * event (a memorial service where door check-in is needed: memorial events include it).
 */

const NETWORK_MESSAGE = "We could not reach Managevent. Check your connection and try again.";

interface Party {
  id: string;
  displayName: string;
  invitePath: string;
  guests: { id: string; name: string }[];
}

async function createMemorial(host: ApiHost, options: { publish?: boolean } = {}) {
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
    guests: [
      { name: "Henry Carroway", email: "henry.carroway@example.org", phone: "0412 345 678" },
      { name: "June Carroway", email: "june.carroway@example.org", phone: "0413 987 654" },
    ],
  });
  const okafor = await host.call<Party>("post", `/v1/events/${event.id}/parties`, {
    displayName: "Amara Okafor",
    guests: [{ name: "Amara Okafor" }],
  });
  if (options.publish !== false) {
    await host.call("post", `/v1/events/${event.id}/invitation/publish`);
  }
  return { eventId: event.id, carroway, okafor };
}

const attending = (party: Party) => ({
  members: party.guests.map((guest) => ({ guestId: guest.id, status: "YES" })),
});

/** Records whether a piece of text was ever on the page, however briefly, from now on. */
async function watchForText(page: Page, text: string): Promise<() => Promise<boolean>> {
  await page.evaluate((needle) => {
    const state = window as unknown as { __sawText?: boolean };
    state.__sawText = false;
    new MutationObserver(() => {
      // `innerText` is what is rendered: the copy also sits in the page's inline data scripts.
      if (document.body.innerText.includes(needle)) state.__sawText = true;
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }, text);
  return () =>
    page.evaluate(() => (window as unknown as { __sawText?: boolean }).__sawText === true);
}

function collectUncaught(page: Page): string[] {
  const uncaught: string[] = [];
  page.on("pageerror", (error) => uncaught.push(error.message));
  return uncaught;
}

test.describe("a dropped connection", () => {
  test("door check-in: one failed request does not lock the list, and Try again finishes it", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "door");
    const { eventId, carroway } = await createMemorial(host);
    await host.call(
      "put",
      `/v1/events/${eventId}/parties/${carroway.id}/rsvp`,
      attending(carroway),
    );
    await host.signIn(context);
    const uncaught = collectUncaught(page);

    await page.goto(`/check-in/${eventId}`);
    const totals = page.locator(".sb-door-totals dd");
    await expect(totals).toHaveText(["0", "2"]);

    await context.setOffline(true);
    await page.getByRole("button", { name: "Check in Henry Carroway" }).click();
    const result = page.locator(".sb-door-result");
    await expect(result).toHaveAttribute("data-tone", "danger");
    await expect(result).toContainText("Check-in did not go through");
    await expect(result).toContainText(NETWORK_MESSAGE);

    // Nothing is stuck: every row can be tapped again and nothing is left "busy".
    await expect(page.getByRole("button", { name: "Check in Henry Carroway" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Check in June Carroway" })).toBeEnabled();
    await expect(page.locator(".sb-door-list [aria-busy='true']")).toHaveCount(0);

    // Still offline: a second attempt fails the same clear way, it does not freeze either.
    await result.getByRole("button", { name: "Try again" }).click();
    await expect(result).toContainText(NETWORK_MESSAGE);
    await expect(page.getByRole("button", { name: "Check in June Carroway" })).toBeEnabled();

    await context.setOffline(false);
    await result.getByRole("button", { name: "Try again" }).click();
    await expect(result).toHaveAttribute("data-tone", "success");
    await expect(result).toContainText("Henry Carroway is checked in.");
    await expect(totals).toHaveText(["1", "2"]);

    // The rest of the door still works: the next guest, and a manual refresh.
    await page.getByRole("button", { name: "Check in June Carroway" }).click();
    await expect(result).toContainText("June Carroway is checked in.");
    await expect(totals).toHaveText(["2", "2"]);
    await page.getByRole("button", { name: "Refresh list" }).click();
    await expect(page.getByText("List updated.")).toBeAttached();
    expect(uncaught, "uncaught errors on the door page").toEqual([]);
  });

  test("add a household: the dialog stays open with what was typed, and a retry adds it once", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "offline");
    const { eventId } = await createMemorial(host);
    await host.signIn(context);
    const uncaught = collectUncaught(page);

    await page.goto(`/studio/${eventId}/guests`);
    await page.getByRole("button", { name: "Add household" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a household" });
    await dialog.getByLabel("Household name").fill("Helen and Peter Marsh");
    await dialog.getByLabel("Guest 1", { exact: true }).fill("Helen Marsh");
    await dialog.getByRole("button", { name: "Add another guest" }).click();
    await dialog.getByLabel("Guest 2", { exact: true }).fill("Peter Marsh");

    await context.setOffline(true);
    await dialog.getByRole("button", { name: "Add household", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText(NETWORK_MESSAGE);
    // Not the error screen, and nothing typed is gone.
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Household name")).toHaveValue("Helen and Peter Marsh");
    await expect(dialog.getByLabel("Guest 1", { exact: true })).toHaveValue("Helen Marsh");
    await expect(dialog.getByLabel("Guest 2", { exact: true })).toHaveValue("Peter Marsh");

    await context.setOffline(false);
    await dialog.getByRole("button", { name: "Add household", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Helen and Peter Marsh" })).toHaveCount(1);
    const list = await host.call<{ items: { displayName: string }[] }>(
      "get",
      `/v1/events/${eventId}/parties`,
    );
    expect(list.items.filter((item) => item.displayName === "Helen and Peter Marsh")).toHaveLength(
      1,
    );
    expect(uncaught, "uncaught errors on the guests page").toEqual([]);
  });

  test("record a reply and turn a link off: the reason is shown and the page survives", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "offline");
    const { eventId } = await createMemorial(host);
    await host.signIn(context);
    const uncaught = collectUncaught(page);

    // Awaiting replies → Record a reply.
    await page.goto(`/studio/${eventId}/awaiting`);
    const row = page.locator(".sb-party", { hasText: "Amara Okafor" });
    await row.getByRole("button", { name: /Record a reply/ }).click();
    const reply = page.getByRole("dialog", { name: "Record a reply" });
    await reply.getByRole("radio", { name: "Attending", exact: true }).check();
    await context.setOffline(true);
    await reply.getByRole("button", { name: "Save reply" }).click();
    await expect(reply.getByRole("alert")).toContainText(NETWORK_MESSAGE);
    await expect(reply.getByRole("radio", { name: "Attending", exact: true })).toBeChecked();
    await context.setOffline(false);
    await reply.getByRole("button", { name: "Save reply" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Share → turn a link off.
    await page.goto(`/studio/${eventId}/share`);
    const share = page.locator(".sb-share-row", { hasText: "Amara Okafor" });
    await share.locator("summary").click();
    await share.getByRole("button", { name: "Turn off this link" }).click();
    await context.setOffline(true);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Turn off link", exact: true })
      .click();
    await expect(page.locator(".toast", { hasText: NETWORK_MESSAGE })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Share" })).toBeVisible();
    await context.setOffline(false);
    expect(uncaught, "uncaught errors").toEqual([]);
  });
});

test.describe("actions that redirect", () => {
  test("creating an invitation never shows a false error, and two taps make one event", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "create");
    await host.signIn(context);
    const title = `Redirect check ${Date.now().toString(36)}`;

    await page.goto("/studio/new");
    await page.getByText("Wedding", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Event name").fill(title);
    await page.getByLabel("Hosted by").fill("The spec");
    await page.getByLabel("Date", { exact: true }).fill(futureDate(120));
    await page.getByLabel("Start time").fill("16:30");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Review and create" })).toBeVisible();

    const sawFalseError = await watchForText(page, "could not reach Managevent");
    // Two quick taps, as an impatient thumb does.
    await page.getByRole("button", { name: "Create invitation" }).dblclick();
    await page.waitForURL(/\/studio\/evt_[^/]+\?created=1/);
    expect(await sawFalseError(), "a 'could not reach Managevent' message appeared").toBe(false);

    const events = await host.call<{ items: { title: string }[] }>("get", "/v1/events");
    expect(events.items.filter((item) => item.title === title)).toHaveLength(1);
  });

  test("a session that ended sends the host to sign in, not to a connection error", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "expired");
    const { eventId } = await createMemorial(host);
    await host.signIn(context);

    await page.goto(`/studio/${eventId}/guests`);
    await page.getByRole("button", { name: "Add household" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a household" });
    await dialog.getByLabel("Household name").fill("After the session ended");

    const sawFalseError = await watchForText(page, "could not reach Managevent");
    await context.clearCookies();
    await dialog.getByRole("button", { name: "Add household", exact: true }).click();
    await page.waitForURL(/\/sign-in\?next=/);
    expect(await sawFalseError(), "a 'could not reach Managevent' message appeared").toBe(false);
  });
});

test.describe("a host previewing a draft", () => {
  test("reloading the preview does not spend the limit for unknown links", async ({
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "preview");
    const { eventId, carroway, okafor } = await createMemorial(host, { publish: false });
    const extra: Party[] = [];
    for (const name of ["Preview One", "Preview Two"]) {
      extra.push(
        await host.call<Party>("post", `/v1/events/${eventId}/parties`, {
          displayName: name,
          guests: [{ name }],
        }),
      );
    }
    await host.signIn(context);

    // 32 loads of an unpublished invitation, spread over four links so the per-link limit for
    // guest pages (60 reads a minute) is not what is being measured. Before the fix each load
    // counted as an "unknown link" and the 31st was answered 429.
    const links = [carroway, okafor, ...extra].map((party) => `${party.invitePath}?opened=1`);
    for (let load = 0; load < 32; load += 1) {
      const response = await context.request.get(links[load % links.length] ?? "");
      expect(response.status(), `draft preview, load ${load + 1}`).toBe(200);
    }

    // A real guest link opened from the same address (the `request` fixture shares the test's
    // address and has no session) is still served.
    const [demo] = await loadDemos(request, appOrigin);
    if (!demo) throw new Error("no sample invitation");
    const sample = await request.get(`${appOrigin}${demoPath(demo)}?opened=1`);
    expect(sample.status(), "a guest link from the same address").toBe(200);
  });
});

test.describe("the auth proxy", () => {
  test("forwards only the sign-in calls: no session token, no CORS headers, no large bodies", async ({
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "proxy");
    await host.signIn(context);

    // Signed in, with the session cookie: the endpoints that return the session token as JSON
    // are not reachable through this origin, and neither is Better Auth's own error page.
    for (const path of [
      "/api/auth/get-session",
      "/api/auth/list-sessions",
      "/api/auth/list-accounts",
      "/api/auth/error?error=Your%20account%20is%20locked",
    ]) {
      const response = await context.request.get(path);
      expect(response.status(), path).toBe(404);
      expect(await response.text(), path).toBe("");
    }
    for (const path of ["/api/auth/revoke-sessions", "/api/auth/change-password"]) {
      const response = await context.request.post(path, { data: {} });
      expect(response.status(), path).toBe(404);
    }

    // A sign-in, with an Origin the API trusts and answers CORS headers for.
    const signIn = await context.request.post("/api/auth/sign-in/email", {
      headers: { origin: appOrigin },
      data: { email: host.identity.email, password: PASSWORD, rememberMe: true },
    });
    expect(signIn.status()).toBe(200);
    const headerNames = signIn.headersArray().map((header) => header.name.toLowerCase());
    expect(headerNames.filter((name) => name.startsWith("access-control-"))).toEqual([]);
    expect(headerNames).not.toContain("set-auth-token");
    expect(headerNames, "the session still arrives as a cookie").toContain("set-cookie");
    const body = (await signIn.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("token");
    expect(body).toHaveProperty("user");

    // Sign-in bodies are a few hundred bytes. Anything large is refused before it is read.
    const large = await context.request.post("/api/auth/sign-in/email", {
      headers: { origin: appOrigin },
      data: { email: host.identity.email, password: "x".repeat(64 * 1024) },
    });
    expect(large.status()).toBe(413);
    const notJson = await context.request.post("/api/auth/sign-in/email", {
      headers: { origin: appOrigin, "content-type": "text/plain" },
      data: "email=someone",
    });
    expect(notJson.status()).toBe(415);
  });

  test("a failed emailed link lands on the sign-in page with a fixed message", async ({ page }) => {
    await page.goto("/sign-in?error=link");
    await expect(page.locator(".alert-danger")).toContainText("That link did not work.");
    // Only that one value is recognised: text from the address is never shown.
    await page.goto("/sign-in?error=Your%20account%20is%20locked.%20Call%200400%20000%20000");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expect(page.getByText("locked")).toHaveCount(0);
  });
});

test.describe("what each screen receives", () => {
  test("Share and Awaiting replies carry no guest email addresses and one phone number", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "privacy");
    const { eventId } = await createMemorial(host);
    await host.signIn(context);
    const digits = (html: string) => html.replace(/[\s+()-]/g, "");

    for (const tab of ["share", "awaiting"]) {
      await page.goto(`/studio/${eventId}/${tab}`);
      await expect(page.getByRole("heading", { name: "The Carroway family" })).toBeVisible();
      const html = await page.content();
      expect(html, `${tab}: guest email`).not.toContain("henry.carroway@example.org");
      expect(html, `${tab}: guest email`).not.toContain("june.carroway@example.org");
      // The household's first number opens WhatsApp; the second is not needed here.
      expect(digits(html), `${tab}: second phone number`).not.toContain("413987654");
    }

    // The Guests tab is where contact details are edited, so they are there.
    await page.goto(`/studio/${eventId}/guests`);
    await expect(page.getByRole("heading", { name: "The Carroway family" })).toBeVisible();
    expect(await page.content()).toContain("june.carroway@example.org");
  });
});

test.describe("awaiting replies", () => {
  test("lists a household that has answered while one member has not", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "awaiting");
    const { eventId, carroway, okafor } = await createMemorial(host);
    await host.call(
      "put",
      `/v1/events/${eventId}/parties/${carroway.id}/rsvp`,
      attending(carroway),
    );
    await host.call("put", `/v1/events/${eventId}/parties/${okafor.id}/rsvp`, attending(okafor));
    // Added after the household replied: the household still reads "attending".
    await host.call("post", `/v1/events/${eventId}/parties/${carroway.id}/guests`, {
      name: "Grandma Carroway",
    });
    await host.signIn(context);

    await page.goto(`/studio/${eventId}/awaiting`);
    await expect(page.getByRole("heading", { level: 1, name: "Awaiting replies" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Everyone has replied" })).toHaveCount(0);
    await expect(page.getByText("1 household is still to reply.")).toBeVisible();
    const row = page.locator(".sb-party", { hasText: "The Carroway family" });
    await expect(row).toContainText("Waiting on Grandma Carroway");

    await row.getByRole("button", { name: /Record a reply/ }).click();
    const reply = page.getByRole("dialog", { name: "Record a reply" });
    await reply
      .getByRole("group", { name: /Grandma Carroway/ })
      .getByRole("radio", { name: "Not attending", exact: true })
      .check();
    await reply.getByRole("button", { name: "Save reply" }).click();
    await expect(page.getByRole("heading", { name: "Everyone has replied" })).toBeVisible();
  });
});

test.describe("when a device cannot copy or scan", () => {
  test("a refused copy shows the link, selected, and the QR dialog shows it as text", async ({
    page,
    context,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "copy");
    const { eventId, okafor } = await createMemorial(host);
    await host.signIn(context);
    // An in-app browser, or a denied permission: both ways of copying fail.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error("denied")) },
      });
      document.execCommand = () => false;
    });
    const link = `${appOrigin}${okafor.invitePath}`;

    await page.goto(`/studio/${eventId}/share`);
    const row = page.locator(".sb-share-row", { hasText: "Amara Okafor" });
    await row.getByRole("button", { name: "Copy link" }).click();
    await expect(row.locator(".copy-manual .error")).toHaveText(
      "Could not copy. Select the text and copy it yourself.",
    );
    const field = row.getByRole("textbox", { name: "Text to copy" });
    await expect(field).toHaveValue(link);
    await expect(field).toBeFocused();
    const selected = await field.evaluate(
      (element: HTMLInputElement) =>
        element.selectionEnd === element.value.length && element.selectionStart === 0,
    );
    expect(selected, "the whole link is selected").toBe(true);
    // The field stays until the host has copied it.
    await page.waitForTimeout(6500);
    await expect(field).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "no sideways scroll with the link shown").toBeLessThanOrEqual(0);
    await expectNoAxeViolations(page, "Share with a link shown to copy by hand", "main");

    await row.getByRole("button", { name: /Show a QR code/ }).click();
    const qr = page.getByRole("dialog", { name: /QR code for Amara Okafor/ });
    await expect(qr.getByLabel("Private link")).toHaveValue(link);
    await expect(qr.getByRole("img", { name: /QR code that opens/ })).toBeVisible();
    await expectNoAxeViolations(page, "the QR dialog", "dialog[open]");
  });

  test("a pass shows its code as text, and the door accepts that code", async ({
    page,
    context,
    browser,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "pass");
    const { eventId, carroway } = await createMemorial(host);
    await host.call(
      "put",
      `/v1/events/${eventId}/parties/${carroway.id}/rsvp`,
      attending(carroway),
    );

    // The guest's phone, without JavaScript: the code is on the pass.
    const guest = await newVisitorContext(browser, { javaScriptEnabled: false });
    const pass = await guest.newPage();
    await pass.goto(`${appOrigin}${carroway.invitePath}/pass`);
    const june = pass.locator(".inv-pass", { hasText: "June Carroway" });
    await expect(june.getByText("Pass code")).toBeVisible();
    const code = (await june.locator(".inv-pass-code code").innerText()).trim();
    expect(code).toMatch(/^MV1\.pass_[0-9a-f-]{36}\.[A-Za-z0-9_-]{32}$/);
    const overflow = await pass.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "the pass page has no sideways scroll").toBeLessThanOrEqual(0);
    await guest.close();

    // The door: camera scanning is offered wherever the browser can open a camera (not only
    // where it has a built-in barcode reader), and the code read off the pass checks June in.
    await host.signIn(context);
    await page.goto(`/check-in/${eventId}`);
    await expect(page.getByRole("button", { name: "Scan a pass" })).toBeVisible();
    await page.getByRole("button", { name: "Enter a pass code" }).click();
    await page.getByLabel("Pass code").fill(code);
    await page.locator(".sb-door-code").getByRole("button", { name: "Check in" }).click();
    const result = page.locator(".sb-door-result");
    await expect(result).toHaveAttribute("data-tone", "success");
    await expect(result).toContainText("June Carroway is checked in.");

    // The pass page with its codes, as the guest sees it with JavaScript on.
    await page.goto(`${carroway.invitePath}/pass`);
    await expect(page.getByText("Pass code").first()).toBeVisible();
    await expectNoAxeViolations(page, "the pass page");
  });
});

test.describe("a reply the invitation no longer fits", () => {
  test("the guest is told the invitation changed and offered a reload", async ({
    page,
    request,
    appOrigin,
  }) => {
    const host = await signUpHost(request, appOrigin, "changed");
    const event = await host.call<{ id: string }>("post", "/v1/events", {
      title: "Changed while open",
      ceremonySlug: "birthday",
      startsAtLocal: localDateTime(45, 18),
      timeZone: "Australia/Perth",
      templateSlug: "royal-classic",
      hosts: "Hosted by the spec",
      venue: { name: "The Test Kitchen", address: "1 Example Street, Perth WA 6000" },
    });
    const party = await host.call<Party>("post", `/v1/events/${event.id}/parties`, {
      displayName: "The Okafor family",
      guests: [{ name: "Ada Okafor" }, { name: "Ben Okafor" }],
    });
    await host.call("post", `/v1/events/${event.id}/invitation/publish`);

    await page.goto(`${party.invitePath}?opened=1`);
    for (const name of ["Ada Okafor", "Ben Okafor"]) {
      await page
        .locator(`section[aria-label="${name}"]`)
        .getByRole("radio", { name: "Yes, I will be there" })
        .check();
    }
    // The host removes Ben while the guest still has the old page open.
    const ben = party.guests.find((guest) => guest.name === "Ben Okafor");
    await host.call("delete", `/v1/events/${event.id}/parties/${party.id}/guests/${ben?.id}`);

    await page.getByRole("button", { name: "Send reply" }).click();
    const alert = page.locator(".inv-form").getByRole("alert");
    await expect(alert).toContainText("This invitation has changed since you opened it");
    await expect(alert).not.toContainText("highlighted");
    await alert.getByRole("button", { name: "Reload the page" }).click();
    await expect(page.locator('section[aria-label="Ben Okafor"]')).toHaveCount(0);
    await expect(page.locator('section[aria-label="Ada Okafor"]')).toBeVisible();
  });
});
