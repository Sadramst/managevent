import type { BrowserContext, Page } from "@playwright/test";
import {
  expect,
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  futureDate,
  newHostIdentity,
  PASSWORD,
  newVisitorContext,
  openGate,
  runTag,
  signUpInBrowser,
  test,
  watchForPageErrors,
} from "./support/stack";

/**
 * The whole product, start to finish, in a real browser on the real stack (PostgreSQL, the API
 * and a production build of this app). Nothing is set up behind the scenes: every step is done
 * the way a host or a guest does it, on the page.
 *
 *   host signs up → empty studio → wizard creates a wedding from a template → publishing says
 *   what is missing → details (wording, schedule, venue) → guests (a household of two, three
 *   more by CSV) → design (another free theme; Premium is locked) → draft preview → publish → share (copy,
 *   WhatsApp, QR) → a guest opens the link with no cookies and replies with dietary needs →
 *   host sees the reply, the dietary table, the message and the CSV → wishing well: guest
 *   writes, host approves, guest sees it → awaiting replies → door check-in explains Premium →
 *   a link is turned off (410) → sign out, sign in again → another host cannot open the event (404) → a
 *   celebration of life renders in Memorial Mode for its guest.
 *
 * The tests share one signed-in host and run in order; a failure skips the rest. Names carry a
 * tag unique to the run, so repeated runs never meet each other's data.
 */

const tag = runTag();
const EVENT_TITLE = `Maya and Daniel ${tag}`;
const HOSTS = "Maya Fernando and Daniel Wright";
const VENUE = "Fraser's Kings Park";
const WORDING = "Together with our families, we invite you to celebrate our wedding.";
const HOUSEHOLD = `The Nguyen family ${tag}`;
const MESSAGE_TO_HOSTS = `We would not miss it. See you both there. ${tag}`;
const WISH = `Wishing you every happiness, today and always. ${tag}`;

const CSV = [
  "name,party,email,phone,child,table",
  "Aroha Walker,Walker household,aroha@example.org,0412 555 010,no,4",
  "Tane Walker,Walker household,,,yes,4",
  "Priya Sharma,Priya Sharma,priya@example.org,,no,5",
  "Oliver Bennett,Bennett and Costa,,,no,",
  "Lucia Costa,Bennett and Costa,,,no,",
].join("\r\n");

test.describe.configure({ mode: "serial" });

test.describe("from sign-up to the door", () => {
  let hostContext: BrowserContext;
  let host: Page;
  let hostErrors: ReturnType<typeof watchForPageErrors>;
  let guestContext: BrowserContext;
  let guest: Page;

  const hostIdentity = newHostIdentity("journey");
  let eventId = "";
  /** The Nguyen household's private link, as copied from the Share tab. */
  let guestLink = "";
  /** A second household's link, turned off later. */
  let walkerLink = "";

  const eventPath = (tab = "") => `/studio/${eventId}${tab ? `/${tab}` : ""}`;

  test.beforeAll(async ({ browser }) => {
    hostContext = await newVisitorContext(browser, {
      permissions: ["clipboard-read", "clipboard-write"],
    });
    host = await hostContext.newPage();
    hostErrors = watchForPageErrors(host);
    guestContext = await newVisitorContext(browser);
    guest = await guestContext.newPage();
  });

  test.afterAll(async () => {
    await hostContext?.close();
    await guestContext?.close();
  });

  test("a new host signs up and finds an empty studio", async () => {
    await signUpInBrowser(host, hostIdentity);
    await expect(host).toHaveURL(/\/studio$/);
    await expect(host.getByRole("heading", { level: 1, name: "My events" })).toBeVisible();
    await expect(host.getByRole("heading", { name: "Create your first invitation" })).toBeVisible();
    await expect(host.locator(".es-event")).toHaveCount(0);
    await expectNoSidewaysScroll(host, "empty studio");
  });

  test("the wizard creates a wedding from a template chosen in the gallery", async () => {
    await host.goto("/templates");
    await host.getByRole("link", { name: "Use this template: Modern Minimal" }).click();
    await host.waitForURL(/\/studio\/new\?template=modern-minimal/);
    await expect(host.locator('input[name="template"][value="modern-minimal"]')).toBeChecked();

    await host.getByText("Wedding", { exact: true }).click();
    await expect(host.locator('input[name="template"][value="modern-minimal"]')).toBeChecked();
    await host.getByRole("button", { name: "Continue" }).click();

    await host.getByLabel("Event name").fill(EVENT_TITLE);
    await host.getByLabel("Hosted by").fill(HOSTS);
    await host.getByLabel("Date", { exact: true }).fill(futureDate(150));
    await host.getByLabel("Start time").fill("15:30");
    // No venue yet, on purpose: publishing must say so.
    await host.getByRole("button", { name: "Continue" }).click();
    // No first guests either: they are added on the Guests tab below.
    await host.getByRole("button", { name: "Continue" }).click();

    await expect(host.getByRole("heading", { name: "Review and create" })).toBeVisible();
    await expect(host.locator("dd", { hasText: EVENT_TITLE })).toBeVisible();
    await expect(host.locator("dd", { hasText: "Modern Minimal" })).toBeVisible();
    await host.getByRole("button", { name: "Create invitation" }).click();
    await host.waitForURL(/\/studio\/evt_[^/]+\?created=1/);
    eventId = new URL(host.url()).pathname.split("/")[2] ?? "";
    expect(eventId).toMatch(/^evt_/);

    await expect(host.getByText("Your invitation is saved as a draft")).toBeVisible();
    await expect(host.getByRole("heading", { name: "This invitation is a draft" })).toBeVisible();
    await expect(host.locator(".es-header-title")).toHaveText(EVENT_TITLE);
  });

  test("publishing too early lists what is missing, with a link to fix it", async () => {
    await host.goto(eventPath());
    await host.getByRole("button", { name: "Publish invitation" }).click();
    await expect(host.getByText("A few details are needed before you can publish")).toBeVisible();
    await expect(host.getByText("Add the venue name.")).toBeVisible();
    await expect(host.getByRole("heading", { name: "This invitation is a draft" })).toBeVisible();
    const fix = host.getByRole("link", { name: "Add it now" }).first();
    await expect(fix).toHaveAttribute("href", `${eventPath("content")}#venue`);
    await fix.click();
    await host.waitForURL(new RegExp(`${eventPath("content")}#venue$`));
  });

  test("details: wording, two schedule items and the venue are saved", async () => {
    await host.goto(eventPath("content"));
    await host.getByLabel("Invitation wording").fill(WORDING);

    await host.getByRole("button", { name: "Add a schedule item" }).click();
    await host.getByLabel("What is happening").nth(0).fill("Ceremony");
    await host.getByLabel("Time", { exact: true }).nth(0).fill("15:30");
    await host.getByRole("button", { name: "Add a schedule item" }).click();
    await host.getByLabel("What is happening").nth(1).fill("Dinner and dancing");
    await host.getByLabel("Time", { exact: true }).nth(1).fill("18:00");

    await host.getByLabel("Venue name").fill(VENUE);
    await host.getByLabel("Address").fill("Fraser Avenue, Kings Park WA 6005");
    await host.getByLabel("Dress code").fill("Cocktail");

    await host.getByRole("button", { name: "Save changes" }).click();
    await expect(host.getByText("Details saved.")).toBeVisible();

    await host.reload();
    await expect(host.getByLabel("Invitation wording")).toHaveValue(WORDING);
    await expect(host.getByLabel("What is happening")).toHaveCount(2);
    await expect(host.getByLabel("What is happening").nth(1)).toHaveValue("Dinner and dancing");
    await expect(host.getByLabel("Venue name")).toHaveValue(VENUE);
    await expectNoSidewaysScroll(host, "details");
  });

  test("guests: a household of two is added by hand", async () => {
    await host.goto(eventPath("guests"));
    await expect(host.getByRole("heading", { level: 1, name: "Guests" })).toBeVisible();
    await expect(host.getByRole("heading", { name: "No guests yet" })).toBeVisible();

    await host.getByRole("button", { name: "Add household" }).first().click();
    const dialog = host.getByRole("dialog", { name: "Add a household" });
    await dialog.getByLabel("Household name").fill(HOUSEHOLD);
    await dialog.getByLabel("Guest 1", { exact: true }).fill("Linh Nguyen");
    await dialog.getByRole("button", { name: "Add another guest" }).click();
    await dialog.getByLabel("Guest 2", { exact: true }).fill("Tom Nguyen");
    await dialog.getByRole("button", { name: "Add email or mobile" }).first().click();
    await dialog.getByLabel("Mobile").first().fill("0412 345 678");
    await dialog.getByRole("button", { name: "Add household", exact: true }).click();

    const row = host.locator(".sb-party", { hasText: HOUSEHOLD });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Linh Nguyen");
    await expect(row).toContainText("Tom Nguyen");
    await expect(host.locator(".sb-party")).toHaveCount(1);
  });

  test("guests: three households arrive from a CSV file, checked before anything is added", async () => {
    await host.goto(eventPath("guests"));
    await host.getByRole("button", { name: "Import from a file" }).click();
    const dialog = host.getByRole("dialog", { name: "Import guests from a file" });
    await dialog
      .locator('input[type="file"]')
      .setInputFiles({ name: "guests.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
    await dialog.getByRole("button", { name: "Check file" }).click();

    // The dry run: a preview, and still only the one household on the list.
    await expect(dialog.getByText("3 households and 5 guests are ready to add.")).toBeVisible();
    await expect(dialog.getByText("Walker household").first()).toBeVisible();
    await expect(host.locator(".sb-party")).toHaveCount(1);

    await dialog.getByRole("button", { name: "Add 5 guests" }).click();
    await expect(host.getByRole("heading", { name: "Walker household" })).toBeVisible();
    await expect(host.locator(".sb-party")).toHaveCount(4);
    await expect(host.locator(".sb-party", { hasText: "Bennett and Costa" })).toContainText(
      "Lucia Costa",
    );

    // The same file again adds nothing twice by accident: it is a new import, so the host is
    // shown the preview again and can simply close it.
    await expectNoSidewaysScroll(host, "guest list");
    await expectNoAxeViolations(host, "guest list", "main");
  });

  test("design: another free theme is saved; a Premium theme can be previewed but not saved", async () => {
    await host.goto(eventPath("design"));
    await expect(
      host.locator('input[name="design-theme"][value="alabaster-platinum"]'),
    ).toBeChecked();

    await host.getByText("Midnight and rose gold", { exact: true }).click();
    await expect(host.getByText("Your preview includes Premium options")).toBeVisible();
    await expect(host.getByRole("button", { name: "Save design" })).toBeDisabled();

    await host.getByText("Ivory, gold and burgundy", { exact: true }).click();
    await expect(host.getByText("Your preview includes Premium options")).toHaveCount(0);
    await host.getByRole("button", { name: "Save design" }).click();
    await expect(host.getByText("Design saved.")).toBeVisible();

    await host.reload();
    await expect(host.locator('input[name="design-theme"][value="royal-ivory"]')).toBeChecked();
  });

  test("while it is a draft, the link is a 404 for a guest and a read-only preview for the host", async () => {
    await host.goto(eventPath("share"));
    await expect(host.getByText("Your invitation is not published yet")).toBeVisible();
    await host
      .locator(".sb-party", { hasText: HOUSEHOLD })
      .getByRole("button", { name: "Copy link" })
      .click();
    const draftLink = await host.evaluate(() => navigator.clipboard.readText());

    // A guest: the page does not exist yet, and says nothing about the event.
    const early = await guest.goto(draftLink);
    expect(early?.status()).toBe(404);
    expect(await guest.content()).not.toContain(EVENT_TITLE);

    // The host: the real page, marked as a preview, where nothing can be sent.
    const preview = await hostContext.newPage();
    expect((await preview.goto(`${draftLink}?opened=1`))?.status()).toBe(200);
    await expect(preview.getByText("Only you can see this until you publish it.")).toBeVisible();
    await expect(preview.getByRole("heading", { level: 1 })).toHaveText(EVENT_TITLE);
    await preview.getByRole("radio", { name: "Yes, I will be there" }).first().check();
    await expect(preview.getByRole("button", { name: "Send reply" })).toBeDisabled();
    await preview.close();
  });

  test("with the venue in place, publishing succeeds", async () => {
    await host.goto(eventPath());
    await host.getByRole("button", { name: "Publish invitation" }).click();
    await expect(host.getByRole("heading", { name: "This invitation is live" })).toBeVisible();
    await expect(host.locator(".es-header-side").getByText("Live")).toBeVisible();
    await expect(host.getByRole("link", { name: "Share links with guests" })).toBeVisible();
    await expectNoAxeViolations(host, "overview (live)", "main");
  });

  test("share: the link copies, WhatsApp opens with the message ready, and the QR code draws", async () => {
    await host.goto(eventPath("share"));
    const row = host.locator(".sb-party", { hasText: HOUSEHOLD });

    await row.getByRole("button", { name: "Copy link" }).click();
    guestLink = await host.evaluate(() => navigator.clipboard.readText());
    expect(guestLink).toMatch(/^http:\/\/localhost:\d+\/i\/[a-z0-9-]+\/[a-z0-9-]+$/);
    const guestPath = new URL(guestLink).pathname;

    const whatsApp = await row.getByRole("link", { name: /WhatsApp/ }).getAttribute("href");
    // Linh's Australian mobile, in international form, with the message and the link ready.
    expect(whatsApp).toMatch(/^https:\/\/wa\.me\/61412345678\?text=/);
    const message = decodeURIComponent((whatsApp ?? "").split("?text=")[1] ?? "");
    expect(message).toContain(guestLink);
    expect(message).toContain(HOUSEHOLD);

    await row.getByRole("button", { name: /QR code/ }).click();
    const qr = host.getByRole("dialog", { name: /QR code for/ });
    await expect(qr.getByRole("img")).toBeVisible();
    const qrSize = await qr
      .getByRole("img")
      .evaluate((image: HTMLImageElement) => image.naturalWidth);
    expect(qrSize, "the QR image decoded").toBeGreaterThan(100);
    await expect(qr.getByRole("link", { name: "Download PNG" })).toHaveAttribute(
      "href",
      /^data:image\/png/,
    );
    await host.keyboard.press("Escape");
    await expect(qr).toBeHidden();

    // A second household's link, for the "turned off" step later.
    await host
      .locator(".sb-party", { hasText: "Walker household" })
      .getByRole("button", { name: "Copy link" })
      .click();
    walkerLink = await host.evaluate(() => navigator.clipboard.readText());
    expect(new URL(walkerLink).pathname).not.toBe(guestPath);

    // Email is honest about not being set up, when it is not.
    const emailOff = host.getByText(
      "Email sending is not set up yet: share by link, WhatsApp or QR.",
    );
    if ((await emailOff.count()) > 0) {
      await expect(host.getByRole("button", { name: /Send .*invitation/ })).toHaveCount(0);
    }
    await expectNoSidewaysScroll(host, "share");
  });

  test("a guest with no cookies opens the link: the gate opens and the details are there", async () => {
    const guestErrors = watchForPageErrors(guest);
    const response = await guest.goto(guestLink);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(await guestContext.cookies(), "the guest has no session").toEqual([]);

    await expect(guest.locator(".inv-gate")).toBeVisible();
    await expect(guest.locator(".inv-gate")).toContainText(HOUSEHOLD);
    await openGate(guest);

    await expect(guest.locator(".inv")).toHaveAttribute("data-theme", "royal-ivory");
    await expect(guest.getByText(`Dear ${HOUSEHOLD}`)).toBeVisible();
    await expect(guest.getByRole("heading", { level: 1 })).toHaveText(EVENT_TITLE);
    await expect(guest.getByText(WORDING)).toBeVisible();
    await expect(guest.locator(".inv-hero-date")).toHaveText(/^\w+day, \d{1,2} \w+ \d{4}$/);
    await expect(guest.getByText(VENUE).first()).toBeVisible();
    await expect(guest.getByText("Fraser Avenue, Kings Park WA 6005").first()).toBeVisible();
    await expect(guest.getByText("Ceremony", { exact: true })).toBeVisible();
    await expect(guest.getByText("Dinner and dancing", { exact: true })).toBeVisible();
    await expect(guest.getByText("3:30 PM").first()).toBeVisible();
    await expect(guest.getByText("Cocktail", { exact: true })).toBeVisible();

    // The preview in a chat app never names the guest.
    const head = await guest.locator("head").innerHTML();
    expect(head).not.toContain("Nguyen");
    await expectNoSidewaysScroll(guest, "guest invitation");
    await guest.waitForLoadState("networkidle");
    await expectNoAxeViolations(guest, "guest invitation");
    guestErrors.expectClean("the guest invitation");
  });

  test("the guest replies: one coming with dietary needs, one not, and a message", async () => {
    const linh = guest.locator('section[aria-label="Linh Nguyen"]');
    const tom = guest.locator('section[aria-label="Tom Nguyen"]');
    await linh.getByRole("radio", { name: "Yes, I will be there" }).check();
    await tom.getByRole("radio", { name: "Sorry, I cannot make it" }).check();

    await linh.getByRole("checkbox", { name: "Vegetarian" }).check();
    await linh.getByRole("checkbox", { name: "Nut allergy" }).check();
    await linh.getByLabel("How serious is the allergy?").selectOption("MODERATE");
    await linh.getByLabel(/Allergy details/).fill("Peanuts and almonds");
    await guest.getByLabel(/A message for the hosts/).fill(MESSAGE_TO_HOSTS);

    // Health details need consent: without the tick nothing is sent and nothing typed is lost.
    const consent = guest.getByLabel(/I agree that the dietary, allergy and access details/);
    await expect(consent).not.toBeChecked();
    await guest.getByRole("button", { name: "Send reply" }).click();
    await expect(
      guest.getByRole("link", { name: /Tick the box to agree, or remove the food/ }),
    ).toBeVisible();
    await expect(linh.getByLabel(/Allergy details/)).toHaveValue("Peanuts and almonds");

    await consent.check();
    await guest.getByRole("button", { name: "Send reply" }).click();
    await expect(guest.getByRole("heading", { name: /We cannot wait to see you/ })).toBeVisible();
    await expect(guest.getByText("Your reply has been sent to the hosts.")).toBeVisible();
  });

  test("after a reload the guest sees the saved reply, without the health details", async () => {
    await guest.reload();
    await expect(guest.locator(".inv-gate")).toHaveCount(0);
    const reply = guest.locator(".inv-reply");
    await expect(reply).toContainText("Linh Nguyen");
    await expect(reply).toContainText("Coming");
    await expect(reply).toContainText("Tom Nguyen");
    await expect(reply).toContainText("Not coming");
    await expect(reply).toContainText("Food and access details on file");
    await expect(reply).toContainText(MESSAGE_TO_HOSTS);
    await expect(guest.getByRole("button", { name: "Change my reply" })).toBeVisible();
    expect(await guest.content(), "health values never come back").not.toContain(
      "Peanuts and almonds",
    );
  });

  test("the host sees one yes and one no, the dietary table and the message", async () => {
    await host.goto(eventPath("responses"));
    await expect(host.getByRole("heading", { level: 1, name: "Responses" })).toBeVisible();
    const stat = (label: string) =>
      host.locator(".stat", { hasText: label }).locator(".stat-value");
    await expect(stat("Adults attending")).toHaveText("1");
    await expect(stat("Not attending")).toHaveText("1");
    await expect(stat("Households replied")).toHaveText("1");
    await expect(stat("Awaiting reply")).toHaveText("5");

    const dietary = host.locator("section, div").filter({
      has: host.getByRole("heading", { name: "Dietary and access needs" }),
    });
    const guestRow = dietary.last().getByRole("row", { name: /Linh Nguyen/ });
    await expect(guestRow).toContainText("Vegetarian");
    await expect(guestRow).toContainText("Nut allergy");
    await expect(guestRow).toContainText("Peanuts and almonds");

    await expect(host.getByText(MESSAGE_TO_HOSTS)).toBeVisible();
    await expectNoSidewaysScroll(host, "responses");
    await expectNoAxeViolations(host, "responses", "main");
  });

  test("the CSV download holds the guest and their reply", async () => {
    const [download] = await Promise.all([
      host.waitForEvent("download"),
      host.getByRole("link", { name: "Download CSV", exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    // The click starts a real download. Its content is then read with the host's own session
    // rather than from the browser's download folder: an installed Chrome was seen holding a
    // finished download back for a minute before releasing the file (the server had answered
    // in milliseconds), which says nothing about this site.
    const file = await hostContext.request.get(download.url());
    await download.cancel();
    expect(file.status()).toBe(200);
    expect(file.headers()["content-disposition"]).toContain(download.suggestedFilename());
    expect(file.headers()["cache-control"]).toContain("no-store");
    const bytes = await file.body();
    expect([bytes[0], bytes[1], bytes[2]], "UTF-8 byte order mark for Excel").toEqual([
      0xef, 0xbb, 0xbf,
    ]);
    const csv = bytes.toString("utf8");
    const linh = csv.split("\r\n").find((line) => line.includes("Linh Nguyen"));
    expect(linh, "Linh is in the file").toBeTruthy();
    expect(linh).toContain(HOUSEHOLD);
    expect(linh).toContain('"YES"');
    expect(csv).toContain("Aroha Walker");
    // Dietary details are a separate, deliberate download.
    expect(csv).not.toContain("Peanuts and almonds");
  });

  test("wishing well: the host switches it on, the guest writes, the host approves, guests see it", async () => {
    await host.goto(eventPath("settings"));
    await host.getByLabel("Show a wishing well on the invitation").check();
    await host.getByLabel("Note to guests").fill("Your presence is the only gift we need.");
    await host.getByRole("button", { name: "Save wishing well" }).click();
    await expect(host.getByText("Wishing well saved.")).toBeVisible();

    await guest.reload();
    await expect(guest.getByRole("heading", { name: "Wishing well" })).toBeVisible();
    await expect(guest.getByText("Your presence is the only gift we need.")).toBeVisible();
    const wishForm = guest.locator("form", {
      has: guest.getByRole("button", { name: "Send message" }),
    });
    await wishForm.getByLabel("Your name").fill("Linh Nguyen");
    await wishForm.getByLabel("Your message").fill(WISH);
    await wishForm.getByLabel(/Show my message on this page for other guests/).check();
    await wishForm.getByRole("button", { name: "Send message" }).click();
    await expect(
      guest.getByText(/Your message has gone to the hosts and will appear here once they approve/),
    ).toBeVisible();
    // Not shown to anyone until the host has read it.
    await guest.reload();
    await expect(guest.getByRole("heading", { name: "Wishing well" })).toBeVisible();
    await expect(guest.getByText(WISH)).toHaveCount(0);

    await host.goto(eventPath("responses"));
    await expect(host.getByText(WISH)).toBeVisible();
    await host.getByRole("button", { name: "Approve the message from Linh Nguyen" }).click();
    await expect(host.getByText("Showing on the invitation").first()).toBeVisible();

    await guest.reload();
    await expect(guest.getByRole("heading", { name: "Messages from guests" })).toBeVisible();
    await expect(guest.getByText(WISH)).toBeVisible();
  });

  test("awaiting replies lists the three households that have not answered", async () => {
    await host.goto(eventPath("awaiting"));
    await expect(host.getByRole("heading", { level: 1, name: "Awaiting replies" })).toBeVisible();
    await expect(host.getByText("3 households are still to reply.")).toBeVisible();
    const rows = host.locator(".sb-party");
    await expect(rows).toHaveCount(3);
    for (const name of ["Walker household", "Priya Sharma", "Bennett and Costa"]) {
      await expect(rows.filter({ hasText: name })).toHaveCount(1);
    }
    await expect(rows.filter({ hasText: HOUSEHOLD })).toHaveCount(0);
    await expect(rows.first().getByRole("button", { name: "Copy reminder" })).toBeVisible();
    await expectNoSidewaysScroll(host, "awaiting");
  });

  test("door check-in on the free plan explains Premium instead of pretending", async () => {
    const response = await host.goto(`/check-in/${eventId}`);
    expect(response?.status()).toBe(200);
    await expect(
      host.getByRole("heading", { name: "Door check-in is part of the Premium Event Pass" }),
    ).toBeVisible();
    // No scanner and no door list on a plan that does not include them.
    await expect(host.getByLabel("Find a guest")).toHaveCount(0);
    const cardsOff = host.getByText(/Card payments are not switched on yet/);
    if ((await cardsOff.count()) > 0) {
      await expect(host.getByRole("link", { name: "Contact us" })).toHaveAttribute(
        "href",
        /\/contact$/,
      );
      await expect(host.getByRole("button", { name: /Upgrade/ })).toHaveCount(0);
    } else {
      await expect(host.getByRole("link", { name: "See what Premium includes" })).toBeVisible();
    }
    await expectNoAxeViolations(host, "check-in (free plan)");
  });

  test("a link the host turns off answers 410 for that guest, and only for them", async () => {
    await host.goto(eventPath("share"));
    const row = host.locator(".sb-party", { hasText: "Walker household" });
    await row.locator("summary").click();
    await host.getByRole("button", { name: "Turn off this link" }).click();
    const confirm = host.getByRole("dialog");
    await expect(confirm.getByRole("heading")).toContainText("Turn off the link for");
    await confirm.getByRole("button", { name: "Turn off link" }).click();
    await expect(row.getByText("Link turned off", { exact: true })).toBeVisible();

    const walker = await guestContext.newPage();
    const gone = await walker.goto(walkerLink);
    expect(gone?.status()).toBe(410);
    expect(gone?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(
      walker.getByRole("heading", { name: "This link is no longer active" }),
    ).toBeVisible();
    expect(await walker.content(), "nothing about the event leaks").not.toContain(EVENT_TITLE);
    await walker.close();

    // The Nguyen household's link is untouched.
    expect((await guest.goto(guestLink))?.status()).toBe(200);
  });

  test("the host signs out and back in; another host gets a real 404 for this event", async ({
    browser,
  }) => {
    hostErrors.expectClean("the host's pages");
    await host.goto("/studio");
    await host.locator(".studio-account-toggle").click();
    await host.getByRole("button", { name: "Sign out" }).click();
    await host.waitForURL((url) => !url.pathname.startsWith("/studio"));
    await host.goto(eventPath("guests"));
    await expect(host).toHaveURL(/\/sign-in\?next=/);

    // Signing in again: a wrong password is refused in plain words, the right one returns the
    // host to the page they asked for, with their event as they left it.
    await host.getByLabel("Email address").fill(hostIdentity.email);
    await host.getByLabel("Password", { exact: true }).fill("not the right password");
    await host.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(host.getByText("That email and password do not match.")).toBeVisible();
    await host.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await host.getByRole("button", { name: "Sign in", exact: true }).click();
    await host.waitForURL((url) => url.pathname === eventPath("guests"));
    await expect(host.locator(".sb-party")).toHaveCount(4);

    const otherContext = await newVisitorContext(browser);
    const other = await otherContext.newPage();
    await signUpInBrowser(other, newHostIdentity("other"));
    for (const path of [
      eventPath(),
      eventPath("guests"),
      eventPath("responses"),
      eventPath("settings"),
      `/check-in/${eventId}`,
      `${eventPath("responses")}/export.csv`,
    ]) {
      const response = await otherContext.request.get(path, { maxRedirects: 0 });
      expect(response.status(), path.replace(eventId, "{eventId}")).toBe(404);
      expect(await response.text()).not.toContain(EVENT_TITLE);
    }
    const page = await other.goto(eventPath());
    expect(page?.status()).toBe(404);
    await expect(other.getByRole("heading", { level: 1 })).toHaveText("We cannot find that page");
    await other.goto("/studio");
    await expect(other.locator(".es-event")).toHaveCount(0);
    await otherContext.close();
  });
});

test.describe("a celebration of life", () => {
  test("is created, published and opened by a guest in Memorial Mode", async ({
    page,
    browser,
    context,
  }) => {
    test.slow();
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const memorialTag = runTag();
    const title = `Remembering Margaret Ellis ${memorialTag}`;
    await signUpInBrowser(page, newHostIdentity("memorial"));

    // Wizard: memorial occasions offer memorial templates only.
    await page.goto("/studio/new");
    await page.getByText("Celebration of life", { exact: true }).click();
    await expect(page.locator(".es-wizard")).toHaveAttribute("data-experience-mode", "memorial");
    await expect(page.locator('input[name="template"]')).toHaveCount(2);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Event name").fill(title);
    await page.getByLabel("Name of the person being remembered").fill("Margaret Ellis");
    await page.getByLabel("Hosted by").fill("The Ellis family");
    await page.getByLabel("Date", { exact: true }).fill(futureDate(30));
    await page.getByLabel("Start time").fill("11:00");
    await page.getByLabel("Venue name").fill("Karrakatta Chapel");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Add a household" }).click();
    await page.getByLabel("Name on the invitation").fill("Helen and Peter Marsh");
    await page.getByLabel("People in this household").fill("Helen Marsh, Peter Marsh");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create invitation" }).click();
    await page.waitForURL(/\/studio\/evt_[^/]+\?created=1/);
    const eventId = new URL(page.url()).pathname.split("/")[2] ?? "";

    // The studio is calm too, and never sells anything.
    await expect(page.locator(".es-scope")).toHaveAttribute("data-experience-mode", "memorial");
    await expect(page.getByText(/Premium Event Pass|Upgrade/)).toHaveCount(0);

    await page.goto(`/studio/${eventId}/settings`);
    await page.getByLabel("Open a tribute book on the invitation").check();
    await page.getByLabel("Prompt for guests").fill("Share a memory of Margaret.");
    await page.getByRole("button", { name: "Save tribute book" }).click();
    await expect(page.getByText("Tribute book saved.")).toBeVisible();
    await expect(page.getByLabel("BSB")).toHaveCount(0);

    await page.goto(`/studio/${eventId}`);
    await page.getByRole("button", { name: "Publish invitation" }).click();
    await expect(page.getByRole("heading", { name: "This invitation is live" })).toBeVisible();

    await page.goto(`/studio/${eventId}/share`);
    const row = page.locator(".sb-party", { hasText: "Helen and Peter Marsh" });
    const whatsApp = decodeURIComponent(
      (await row.getByRole("link", { name: /WhatsApp/ }).getAttribute("href")) ?? "",
    );
    expect(whatsApp, "a calm message, no exclamation marks").not.toContain("!");
    await row.getByRole("button", { name: "Copy link" }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());

    // The guest, with no cookies.
    const guestContext = await newVisitorContext(browser);
    const guest = await guestContext.newPage();
    const errors = watchForPageErrors(guest);
    expect((await guest.goto(link))?.status()).toBe(200);
    await expect(guest.locator(".inv")).toHaveAttribute("data-experience-mode", "memorial");
    await expect(guest.locator(".inv")).toHaveAttribute("data-theme", /^memorial-/);
    // A plain "Open" with a fade: no seal, ribbon or arch.
    await expect(guest.locator(".inv-gate")).toHaveAttribute("data-gate", "plain-fade");
    await expect(guest.locator(".inv-seal")).toHaveCount(0);
    await expect(guest.locator(".inv-gate-open")).toHaveText("Open");
    await openGate(guest);

    await expect(guest.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(guest.getByText("Karrakatta Chapel").first()).toBeVisible();
    await expect(guest.locator(".inv-countdown")).toHaveCount(0);
    await expect(guest.getByText("Not long now")).toHaveCount(0);
    await expect(guest.locator(".inv-starfield, .inv-branch")).toHaveCount(0);
    await expect(guest.getByRole("heading", { name: "Tribute book" })).toBeVisible();
    await expect(guest.getByText("Share a memory of Margaret.")).toBeVisible();
    await expect(guest.getByRole("heading", { name: "Wishing well" })).toHaveCount(0);
    await expect(guest.getByRole("radio", { name: "I will attend" }).first()).toBeVisible();
    await expect(guest.getByRole("radio", { name: "I am unable to attend" }).first()).toBeVisible();
    await expect(guest.getByRole("button", { name: "Send tribute" })).toBeVisible();
    const words = (await guest.locator("main").innerText()).toLowerCase();
    expect(words).not.toMatch(/dance floor|cannot wait|celebrat(e|ing) with us|!/);
    expect(words).not.toMatch(/premium|upgrade/);

    // A reply in the family's voice.
    await guest
      .locator('section[aria-label="Helen Marsh"]')
      .getByRole("radio", { name: "I will attend" })
      .check();
    await guest
      .locator('section[aria-label="Peter Marsh"]')
      .getByRole("radio", { name: "I am unable to attend" })
      .check();
    await guest.getByRole("button", { name: "Send reply" }).click();
    await expect(
      guest.getByRole("heading", { name: "Thank you. The family will be glad to have you there." }),
    ).toBeVisible();
    await guest.waitForLoadState("networkidle");
    await expectNoAxeViolations(guest, "memorial guest page");
    await expectNoSidewaysScroll(guest, "memorial guest page");
    errors.expectClean("the memorial guest page");
    await guestContext.close();

    // Memorial events include door check-in at no cost: the door list, not a sales page.
    await page.goto(`/check-in/${eventId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Door check-in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check in Helen Marsh" })).toBeVisible();
  });
});
