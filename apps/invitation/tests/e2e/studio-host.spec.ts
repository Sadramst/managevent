import type { BrowserContext, Page } from "@playwright/test";
import {
  expect,
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  futureDate,
  newHostIdentity,
  newVisitorContext,
  signUpInBrowser,
  test,
} from "./support/stack";

/**
 * The host's own screens: My events, the new-invitation wizard, and the Overview, Design,
 * Details and Settings tabs of an event (wedding and memorial).
 *
 * Runs against the real stack (see the README): it signs up a throwaway host through the
 * sign-up page, creates its own events and deletes one of them. Nothing depends on earlier
 * runs. The tests in each block share one signed-in browser context and run in order.
 */

interface NewEvent {
  occasion: string;
  title: string;
  hosts: string;
  honouree?: string;
  venue?: string;
  households?: [name: string, people: string][];
}

/** Walks the wizard and returns the new event id. */
async function createEvent(page: Page, event: NewEvent): Promise<string> {
  await page.goto("/studio/new");
  await page.getByText(event.occasion, { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Event name").fill(event.title);
  if (event.honouree) {
    await page.getByLabel("Name of the person being remembered").fill(event.honouree);
  }
  await page.getByLabel("Hosted by").fill(event.hosts);
  await page.getByLabel("Date", { exact: true }).fill(futureDate(120));
  await page.getByLabel("Start time").fill("16:30");
  if (event.venue) await page.getByLabel("Venue name").fill(event.venue);
  await page.getByRole("button", { name: "Continue" }).click();
  for (const [index, [name, people]] of (event.households ?? []).entries()) {
    await page
      .getByRole("button", { name: index === 0 ? "Add a household" : "Add another household" })
      .click();
    await page.getByLabel("Name on the invitation").nth(index).fill(name);
    await page.getByLabel("People in this household").nth(index).fill(people);
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Review and create" })).toBeVisible();
  await page.getByRole("button", { name: "Create invitation" }).click();
  await page.waitForURL(/\/studio\/evt_[^/]+\?created=1/);
  return new URL(page.url()).pathname.split("/")[2] ?? "";
}

test.describe.configure({ mode: "serial" });

test.describe("a host's events", () => {
  let context: BrowserContext;
  let page: Page;
  let weddingId = "";

  test.beforeAll(async ({ browser }) => {
    context = await newVisitorContext(browser);
    page = await context.newPage();
    await signUpInBrowser(page, newHostIdentity("studio"));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("a new host is invited to create a first invitation", async () => {
    await page.goto("/studio");
    await expect(page.getByRole("heading", { level: 1, name: "My events" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create your first invitation" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectNoAxeViolations(page, "empty event list");
    await expectNoSidewaysScroll(page, "empty event list");
  });

  test("the wizard checks each step and keeps what was typed", async () => {
    await page.goto("/studio/new?template=celestial-evening");
    // A Premium template cannot start a free event: the host is told and given a free one.
    await expect(page.getByText("Celestial Evening is a Premium template.")).toBeVisible();
    await expect(page.locator('input[name="template"][value="royal-classic"]')).toBeChecked();
    await expect(page.locator('input[name="template"][value="celestial-evening"]')).toBeDisabled();
    await expectNoAxeViolations(page, "wizard: template");

    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Enter a name for the event.")).toBeVisible();
    await expect(page.getByText("Choose the date.")).toBeVisible();
    await expect(page.getByLabel("Event name")).toBeFocused();
    await expect(page.getByLabel("Time zone")).toHaveValue("Australia/Perth");
    await expectNoAxeViolations(page, "wizard: basics with errors");

    await page.getByLabel("Event name").fill("Kept across steps");
    await page.goBack();
    await expect(page.getByRole("heading", { name: "What are you hosting?" })).toBeVisible();
    await page.goForward();
    await expect(page.getByLabel("Event name")).toHaveValue("Kept across steps");
  });

  test("memorial occasions offer memorial templates only, with no plan badges", async () => {
    await page.goto("/studio/new?template=memorial-linen");
    await expect(page.locator('input[name="occasion"][value="memorial-service"]')).toBeChecked();
    await expect(page.locator('input[name="template"]')).toHaveCount(2);
    await expect(page.locator('input[name="template"][value="memorial-linen"]')).toBeChecked();
    await expect(page.locator(".es-wizard")).toHaveAttribute("data-experience-mode", "memorial");
    await expect(page.locator(".es-choices").getByText("Premium", { exact: true })).toHaveCount(0);
    // The calm palette is painted behind the whole page, so its muted text keeps its contrast.
    await expectNoAxeViolations(page, "wizard: memorial occasion");
  });

  test("creating an event with first guests lands on its overview as a draft", async () => {
    weddingId = await createEvent(page, {
      occasion: "Wedding",
      title: "Spec wedding",
      hosts: "Alex Tan and Sam Reid",
      venue: "Kings Park",
      households: [
        ["The Nguyen family", "Linh Nguyen, Tom Nguyen"],
        ["Priya Sharma", ""],
      ],
    });
    expect(weddingId).toMatch(/^evt_/);
    await expect(page.getByText("Your invitation is saved as a draft")).toBeVisible();
    await expect(page.getByRole("heading", { name: "This invitation is a draft" })).toBeVisible();
    await expect(page.locator(".es-checklist-meter")).toHaveAttribute("max", "4");
    // Three guests in two households, from the wizard.
    const invited = page.locator(".stat", { hasText: "Guests invited" });
    await expect(invited.locator(".stat-value")).toHaveText("3");
    await expect(invited).toContainText("2 households");
    await expectNoAxeViolations(page, "overview");
    await expectNoSidewaysScroll(page, "overview");
  });

  test("design: Premium options preview but cannot be saved on the free plan", async () => {
    await page.goto(`/studio/${weddingId}/design`);
    await page.getByText("Midnight and rose gold", { exact: true }).click();
    await expect(page.getByText("Your preview includes Premium options")).toBeVisible();
    await expect(page.locator(".es-editor-aside .inv-preview")).toHaveAttribute(
      "style",
      /--pv-bg:\s*#0F172A/i,
    );
    await expect(page.getByRole("button", { name: "Save design" })).toBeDisabled();

    await page.getByText("Alabaster and platinum", { exact: true }).click();
    await page.getByRole("button", { name: "Save design" }).click();
    await expect(page.getByText("Design saved.")).toBeVisible();
    await page.reload();
    await expect(
      page.locator('input[name="design-theme"][value="alabaster-platinum"]'),
    ).toBeChecked();
    await expectNoAxeViolations(page, "design");
    await expectNoSidewaysScroll(page, "design");
  });

  test("details: inline validation, one save, and a guard on unsaved changes", async () => {
    await page.goto(`/studio/${weddingId}/content`);
    await page.getByLabel("Invitation wording").fill("We would love you to join us.");
    await page.getByRole("button", { name: "Add a schedule item" }).click();
    await page.getByLabel("What is happening").fill("Ceremony");
    await page.getByLabel("Cover photo link").fill("http://example.org/photo.jpg");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Choose a time.")).toBeVisible();
    await expect(page.getByText("Enter a link that starts with https://.")).toBeVisible();
    await expectNoAxeViolations(page, "details with errors");

    await page.getByLabel("Time", { exact: true }).fill("16:30");
    await page.getByLabel("Cover photo link").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Details saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("What is happening")).toHaveValue("Ceremony");

    await page.locator("#content-headline").fill("A changed headline");
    await page.getByRole("link", { name: "Design", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Leave without saving?" })).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page).toHaveURL(/\/content$/);
    await expectNoSidewaysScroll(page, "details");
  });

  test("details: a newer save elsewhere is reported, not overwritten", async () => {
    const other = await context.newPage();
    await other.goto(`/studio/${weddingId}/content`);
    await other.locator("#content-dress-code").fill("Black tie");
    await other.getByRole("button", { name: "Save changes" }).click();
    await expect(other.getByText("Details saved.")).toBeVisible();
    await other.close();

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("This invitation was changed somewhere else")).toBeVisible();
    await expect(page.locator("#content-headline")).toHaveValue("A changed headline");
    await page.getByRole("button", { name: "Load the latest version" }).click();
    await expect(page.locator("#content-dress-code")).toHaveValue("Black tie");
  });

  test("settings: replies, wishing well, link and plan say what is really available", async () => {
    await page.goto(`/studio/${weddingId}/settings`);
    await page.getByLabel("Let guests answer maybe").check();
    await page.getByLabel("Reply by date").fill(futureDate(60));
    await expect(page.getByLabel("Time", { exact: true })).toHaveValue("23:59");
    await page.getByRole("button", { name: "Save reply settings" }).click();
    await expect(page.getByText("Reply settings saved.")).toBeVisible();

    // The next section saves straight after: the shared stamp must not look stale.
    await page.getByLabel("Show a wishing well on the invitation").check();
    await page.getByLabel("BSB").fill("12");
    await page.getByRole("button", { name: "Save wishing well" }).click();
    await expect(page.getByText("Enter the BSB as six digits")).toBeVisible();
    await page.getByLabel("BSB").fill("066-123");
    await page.getByRole("button", { name: "Save wishing well" }).click();
    await expect(page.getByText("Wishing well saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Let guests answer maybe")).toBeChecked();
    await expect(page.getByLabel("BSB")).toHaveValue("066-123");
    await expect(
      page.getByText("Choosing your own link words is part of the Premium Event Pass."),
    ).toBeVisible();
    // The upgrade button exists only when this deployment can take card payments.
    const upgrade = page.getByRole("button", { name: /^Upgrade for \$/ });
    if ((await upgrade.count()) === 0) {
      await expect(page.getByText("Card payments are not switched on yet.")).toBeVisible();
      await expect(page.locator("#plan").getByRole("link", { name: "Contact us" })).toBeVisible();
    }
    await expectNoAxeViolations(page, "settings");
    await expectNoSidewaysScroll(page, "settings");
  });

  test("publish and unpublish", async () => {
    await page.goto(`/studio/${weddingId}`);
    await page.getByRole("button", { name: "Publish invitation" }).click();
    await expect(page.getByRole("heading", { name: "This invitation is live" })).toBeVisible();
    await expect(page.locator(".es-header-side").getByText("Live")).toBeVisible();
    await expect(page.getByRole("link", { name: "Share links with guests" })).toBeVisible();

    await page.getByRole("button", { name: "Unpublish" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Unpublish this invitation?" })).toBeVisible();
    await dialog.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByRole("heading", { name: "This invitation is a draft" })).toBeVisible();
  });

  test("a memorial event: calm palette, missing venue explained, no upsell", async () => {
    const memorialId = await createEvent(page, {
      occasion: "Celebration of life",
      title: "Remembering Margaret",
      hosts: "The Ellis family",
      honouree: "Margaret Ellis",
    });
    await expect(page.locator(".es-scope")).toHaveAttribute("data-experience-mode", "memorial");
    await page.getByRole("button", { name: "Publish invitation" }).click();
    await expect(page.getByText("A few details are needed before you can publish")).toBeVisible();
    await expect(page.getByText("Add the venue name.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Add it now" }).first()).toHaveAttribute(
      "href",
      `/studio/${memorialId}/content#venue`,
    );
    await expect(page.getByText(/Premium|Upgrade/)).toHaveCount(0);
    await expectNoAxeViolations(page, "memorial overview");

    await page.goto(`/studio/${memorialId}/settings`);
    await expect(page.getByRole("heading", { name: "Tribute book" })).toBeVisible();
    await expect(page.getByLabel("BSB")).toHaveCount(0);
    await expect(page.getByText("Memorial events include every feature at no cost.")).toBeVisible();
    await expect(page.getByText(/Premium Event Pass|Upgrade for/)).toHaveCount(0);

    await page.goto(`/studio/${memorialId}/design`);
    await expect(page.locator('input[name="design-template"]')).toHaveCount(2);
    await expect(
      page.getByText("Memorial invitations always open with a gentle fade."),
    ).toBeVisible();
    await expectNoAxeViolations(page, "memorial design");
  });

  test("the event list shows both events; deleting needs the name typed", async () => {
    await page.goto("/studio");
    await expect(page.locator(".es-event")).toHaveCount(2);
    await expectNoAxeViolations(page, "event list");

    await page.goto(`/studio/${weddingId}/settings`);
    await page.getByRole("button", { name: "Delete event" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Type the event name to confirm").fill("something else");
    await dialog.getByRole("button", { name: "Delete event" }).click();
    await expect(dialog.getByText("That does not match the event name.")).toBeVisible();
    await dialog.getByLabel("Type the event name to confirm").fill("Spec wedding");
    await dialog.getByRole("button", { name: "Delete event" }).click();
    await page.waitForURL(/\/studio\?deleted=1/);
    await expect(page.getByText("The event was deleted.")).toBeVisible();
    await expect(page.locator(".es-event")).toHaveCount(1);
  });
});
