import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Guest Invitation & RSVP Site Workflows", () => {
  test("Guest invitation gate and details render with accessible ceremony info", async ({
    page,
  }) => {
    await page.goto("/i/anniversary/emma-party-g9qtmt?opened=1");

    // Title and couple/host name
    await expect(page.locator("body")).toContainText("Emma & Liam");
    await expect(page.locator("body")).toContainText("The Grand Estate & Ballroom");

    // Verify RSVP section is loaded
    const rsvpSection = page.locator("#rsvp-section");
    await expect(rsvpSection).toBeVisible();
    await expect(rsvpSection).toContainText("Will You Attend?");

    // Pass link is present in header
    const passLink = page.getByRole("link", { name: "Entry Pass", exact: true });
    await expect(passLink).toBeVisible();

    // Verify viewport and accessibility
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test("Guest can successfully complete the RSVP flow and receive digital pass access", async ({
    page,
  }) => {
    await page.goto("/i/anniversary/farhad-family-7kd92m?opened=1");

    const rsvpSection = page.locator("#rsvp-section");
    await expect(rsvpSection).toBeVisible();

    // If already submitted in state, verify confirmation is shown
    const isConfirmed = await rsvpSection
      .getByText("Thank You! Your RSVP is Confirmed.")
      .isVisible()
      .catch(() => false);

    if (!isConfirmed) {
      // Fill out note and submit
      const noteInput = page.locator('textarea[placeholder="Write a note..."]');
      if (await noteInput.isVisible()) {
        await noteInput.fill("Looking forward to celebrating with you both!");
      }
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Thank You! Your RSVP is Confirmed.")).toBeVisible();
    }

    // Pass button is available
    const passButton = page.locator('a[href*="/pass"]').first();
    await expect(passButton).toBeVisible();
  });

  test("Digital Ceremony Pass renders QR code, guest status, and table allocation", async ({
    page,
  }) => {
    await page.goto("/i/anniversary/emma-party-g9qtmt/pass");

    // Verify Pass heading and details
    await expect(page.locator("body")).toContainText("Emma & Liam");
    await expect(page.locator("body")).toContainText("Table 1 (VIP)");

    // Verify QR code image is rendered
    const qrImage = page.getByAltText("Check-in QR Code");
    await expect(qrImage).toBeVisible();

    // Verify accessibility on pass view
    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test("Calendar ICS export returns valid RFC 5545 calendar file", async ({ request }) => {
    const res = await request.get("/i/anniversary/emma-party-g9qtmt/calendar.ics");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");

    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("VERSION:2.0");
    expect(body).toContain("SUMMARY:Emma & Liam — 10th Anniversary");
    expect(body).toContain("END:VCALENDAR");
  });

  test("Memorial Mode renders solemn respectful styling without celebratory badges", async ({
    page,
  }) => {
    await page.goto("/i/dariush-memorial-3kp/cyrus-family-9xm42k?opened=1");

    // Memorial heading and copy
    await expect(page.locator("body")).toContainText("Robert");
    await expect(page.locator("body")).toContainText("A Life Well Lived, Forever in Our Hearts");

    // Ensure no celebratory/confetti text
    await expect(page.getByText("Dance Floor")).toHaveCount(0);
    await expect(page.getByText("Party Time")).toHaveCount(0);

    // Verify accessibility of Memorial Mode
    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test("Unknown guest tokens return a genuine 404 to protect host privacy", async ({ page }) => {
    const res = await page.goto("/i/anniversary/invalid-guest-token-xyz999");
    expect(res?.status()).toBe(404);
  });
});

test.describe("Host Studio & Management Workflows", () => {
  test("Studio Dashboard renders event overview and navigation links", async ({ page }) => {
    await page.goto("/studio");

    await expect(page.locator("h1")).toContainText("Your Event Invitations");
    await expect(page.locator("body")).toContainText("Host Studio");
    await expect(page.locator("body")).toContainText("Emma & Liam — 10th Anniversary");

    // Verify link to Awaiting Replies
    const awaitingLink = page.locator('a[href*="/awaiting"]').first();
    await expect(awaitingLink).toBeVisible();

    // Verify accessibility
    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test("Host Awaiting Replies chase dashboard renders statistics, party list, and copy generation", async ({
    page,
  }) => {
    await page.goto("/studio/evt_anniversary_10/awaiting");

    await expect(page.locator("body")).toContainText("Awaiting replies");

    // Verify stats cards (Awaiting, Replied, Total)
    await expect(page.locator("body")).toContainText("Total parties");

    // Verify back to studio link
    const studioLink = page.locator('a[href="/studio/evt_anniversary_10"]');
    await expect(studioLink).toBeVisible();

    // Verify accessibility
    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test("Host guest export API returns CSV for catering and logistics", async ({ request }) => {
    const res = await request.get("/api/guests/export?eventId=evt_anniversary_10&format=csv");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");

    const csvContent = await res.text();
    expect(csvContent).toContain("Party Name");
    expect(csvContent).toContain("Emma & Liam");
  });

  test("0-to-100 Workflow: Host creates invitation, launches studio, copies guest link, and verifies guest micro-site", async ({
    page,
  }) => {
    // 1. Host arrives at wizard
    await page.goto("/studio/new");
    await expect(page.locator("h2")).toContainText("Select Ceremony Type");

    // 2. Step 1: Ceremony & Honourees
    await page
      .getByPlaceholder("e.g. Emily & James' Wedding or 10th Anniversary")
      .fill("Sarah & David's Wedding Celebration");
    await page.getByPlaceholder("e.g. Emma & Liam").fill("Sarah & David");
    await page.getByRole("button", { name: "Continue to Venue & Date" }).click();

    // 3. Step 2: Date & Location
    await expect(page.locator("h2")).toContainText("Ceremony Date & Location");
    await page
      .getByPlaceholder("e.g. Royal Perth Yacht Club or Swan Valley Estate")
      .fill("Cottesloe Beach Hotel");
    await page
      .getByPlaceholder("e.g. Australia II Dr, Crawley WA 6009")
      .fill("104 Marine Parade, Cottesloe WA 6011");
    await page.getByRole("button", { name: "Continue to Design & Theme" }).click();

    // 4. Step 3: Visual Design & Gate Style
    await expect(page.locator("h2")).toContainText("Visual Design & Gate Reveal");
    await page.getByRole("button", { name: "Create & Launch Studio" }).click();

    // 5. Lands on Studio with newly created event
    await page.waitForURL(/\/studio\/evt_/);
    await expect(page.locator("h1")).toContainText("Sarah & David's Wedding Celebration");
    await expect(page.locator("body")).toContainText("Cottesloe Beach Hotel");

    // 6. Locate preview micro-site link
    const previewLink = page.getByRole("link", { name: "Preview Micro-site" });
    await expect(previewLink).toBeVisible();
    const guestUrl = await previewLink.getAttribute("href");
    expect(guestUrl).toBeTruthy();
    expect(guestUrl).toContain("/i/");

    // 7. Verify Guest Micro-site renders 200 OK with correct ceremony details
    const guestRes = await page.goto(`${guestUrl}?opened=1`);
    expect(guestRes?.status()).toBe(200);
    await expect(page.locator("body")).toContainText("Sarah & David");
    await expect(page.locator("body")).toContainText("Cottesloe Beach Hotel");

    // 8. Verify RSVP section is loaded and functional
    const rsvpSection = page.locator("#rsvp-section");
    await expect(rsvpSection).toBeVisible();
    await expect(rsvpSection).toContainText("Will You Attend?");

    // 9. Accessibility check on newly created invitation
    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });
});
