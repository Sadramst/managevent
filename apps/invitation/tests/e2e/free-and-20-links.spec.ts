import {
  expect,
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  futureDate,
  localDateTime,
  newHostIdentity,
  newVisitorContext,
  openGate,
  runTag,
  signUpHost,
  signUpInBrowser,
  test,
  watchForPageErrors,
} from "./support/stack";

const JAMES_COUPLES: [string, string][] = [
  ["A and B", "Alice A, Bob B"],
  ["C and D", "Clara C, David D"],
  ["E and F", "Elena E, Frank F"],
  ["G and J", "Grace G, Jack J"],
  ["E and Q", "Evan E, Quinn Q"],
];

test.describe("Free tier (5 links) and 20-link simulated payment unlock flow", () => {
  test("James signs up, creates an invitation with 5 free links (A and B, C and D, E and F, G and J, E and Q), and all 5 links work", async ({
    browser,
  }) => {
    test.slow();
    const hostContext = await newVisitorContext(browser, {
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const host = await hostContext.newPage();
    const hostErrors = watchForPageErrors(host);

    const tag = runTag();
    const james = {
      name: "James Host",
      email: `james-${tag}@example.org`,
    };
    const eventTitle = `James Celebration ${tag}`;

    await signUpInBrowser(host, james);
    await expect(host).toHaveURL(/\/studio$/);

    // Create invitation in the wizard with all 5 couples on the Free tier.
    await host.goto("/studio/new");
    await host.getByText("Wedding", { exact: true }).click();
    await host.getByRole("button", { name: "Continue" }).click();

    await host.getByLabel("Event name").fill(eventTitle);
    await host.getByLabel("Hosted by").fill("James and Partner");
    await host.getByLabel("Date", { exact: true }).fill(futureDate(90));
    await host.getByLabel("Start time").fill("16:00");
    await host.getByLabel("Venue name").fill("Botanic Glasshouse");
    await host.getByRole("button", { name: "Continue" }).click();

    for (const [index, [householdName, people]] of JAMES_COUPLES.entries()) {
      await host
        .getByRole("button", {
          name: index === 0 ? "Add a household" : "Add another household",
        })
        .click();
      await host.getByLabel("Name on the invitation").nth(index).fill(householdName);
      await host.getByLabel("People in this household").nth(index).fill(people);
    }

    await host.getByRole("button", { name: "Continue" }).click();
    await expect(host.getByRole("heading", { name: "Review and create" })).toBeVisible();
    await host.getByRole("button", { name: "Create invitation" }).click();
    await host.waitForURL(/\/studio\/evt_[^/]+\?created=1/);

    const eventId = new URL(host.url()).pathname.split("/")[2] ?? "";
    expect(eventId).toMatch(/^evt_/);

    // Publish the invitation so the 5 guest links are live.
    await host.getByRole("button", { name: "Publish invitation" }).click();
    await expect(host.getByRole("heading", { name: "This invitation is live" })).toBeVisible();

    // Open Share tab and verify all 5 links are unlocked on the Free tier.
    await host.goto(`/studio/${eventId}/share`);
    await expect(
      host.getByText("Free tier: 5 of 5 free private links in use"),
    ).toBeVisible();
    await expect(host.locator(".sb-share-row")).toHaveCount(5);
    await expect(host.getByText("Locked — Free tier covers 5 links")).toHaveCount(0);
    await expectNoSidewaysScroll(host, "James share page");
    await expectNoAxeViolations(host, "James share page", "main");

    // Copy and test every single one of James's 5 links in a clean guest context.
    const guestContext = await newVisitorContext(browser);
    const guest = await guestContext.newPage();

    for (const [householdName] of JAMES_COUPLES) {
      const row = host.locator(".sb-share-row", { hasText: householdName });
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "Copy link" }).click();
      const copiedUrl = await host.evaluate(() => navigator.clipboard.readText());
      expect(copiedUrl).toContain("/i/");

      const response = await guest.goto(`${copiedUrl}?opened=1`);
      expect(response?.status(), `Guest link for ${householdName}`).toBe(200);
      await expect(guest.getByText(`Dear ${householdName}`)).toBeVisible();
      await expect(guest.getByRole("heading", { level: 1 })).toContainText(eventTitle);
    }

    hostErrors.expectClean("James 5-link flow");
    await guestContext.close();
    await hostContext.close();
  });

  test("20-link flow: links 6-20 are hidden before payment, fake payment unlocks all 20 links, and all 20 links work", async ({
    page,
    context,
    browser,
    request,
    appOrigin,
  }) => {
    test.slow();
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const host = await signUpHost(request, appOrigin, "twenty-links");
    const tag = runTag();
    const eventTitle = `Twenty Links Gala ${tag}`;

    const event = await host.call<{ id: string; invitation: { eventSlug: string } }>(
      "post",
      "/v1/events",
      {
        title: eventTitle,
        ceremonySlug: "wedding",
        startsAtLocal: localDateTime(75, 17),
        timeZone: "Australia/Perth",
        templateSlug: "modern-minimal",
        hosts: "Evelyn and Marcus",
        venue: { name: "State Buildings", address: "1 Cathedral Ave, Perth WA 6000" },
      },
    );

    for (let i = 1; i <= 20; i++) {
      const label = `Party ${String(i).padStart(2, "0")}`;
      await host.call("post", `/v1/events/${event.id}/parties`, {
        displayName: label,
        guests: [{ name: `Guest ${String(i).padStart(2, "0")}` }],
      });
    }
    await host.call("post", `/v1/events/${event.id}/invitation/publish`);
    await host.signIn(context);

    // 1. Before payment: Guests page warns that 15 of 20 links are locked.
    await page.goto(`/studio/${event.id}/guests`);
    await expect(
      page.getByText("15 of your 20 household links need the Premium Event Pass"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Activate all 20 links — $69" }),
    ).toBeVisible();

    // 2. Before payment: Share page shows 5 unlocked links and 15 locked links.
    await page.goto(`/studio/${event.id}/share`);
    await expect(
      page.getByText("15 of 20 private links need the Premium Event Pass"),
    ).toBeVisible();
    await expect(page.locator(".sb-share-row")).toHaveCount(20);
    await expect(
      page.locator(".sb-share-row").getByRole("button", { name: "Copy link" }),
    ).toHaveCount(5);
    await expect(page.getByText("Locked — Free tier covers 5 links")).toHaveCount(15);
    await expect(
      page.locator(".sb-share-row").getByRole("button", { name: "Activate link ($69)" }),
    ).toHaveCount(15);
    await expectNoSidewaysScroll(page, "Share page with locked links");
    await expectNoAxeViolations(page, "Share page with locked links", "main");

    // 3. Click "Activate all 20 links — $69" -> opens simulated checkout page.
    await page.getByRole("button", { name: "Activate all 20 links — $69" }).click();
    await page.waitForURL(new RegExp(`/studio/${event.id}/checkout\\?session_id=cs_sim_`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Complete your Premium Event Pass" }),
    ).toBeVisible();
    await expect(page.getByText("Simulated payment (test mode)")).toBeVisible();
    await expect(
      page.getByText("All 20 household links (plus unlimited new links)"),
    ).toBeVisible();
    await expectNoSidewaysScroll(page, "Simulated checkout page");
    await expectNoAxeViolations(page, "Simulated checkout page", "main");

    // 4. Complete the simulated payment -> redirects back to Share with all 20 links active!
    await page
      .getByRole("button", { name: "Pay $69 AUD and unlock all links" })
      .click();
    await page.waitForURL(new RegExp(`/studio/${event.id}/share\\?upgraded=1$`));

    await expect(
      page.getByText("All 20 private guest links are now active"),
    ).toBeVisible();
    await expect(page.getByText("Locked — Free tier covers 5 links")).toHaveCount(0);
    await expect(
      page.locator(".sb-share-row").getByRole("button", { name: "Copy link" }),
    ).toHaveCount(20);

    // 5. Verify all 20 links work end-to-end!
    const listed = await host.call<{
      items: Array<{ id: string; displayName: string; invitePath: string | null }>;
    }>("get", `/v1/events/${event.id}/parties`);
    expect(listed.items).toHaveLength(20);

    const guestContext = await newVisitorContext(browser);
    const guest = await guestContext.newPage();

    // Verify every single one of the 20 invite paths resolves (200 OK) and open the 20th in the browser to RSVP.
    for (const party of listed.items) {
      expect(party.invitePath, `invitePath for ${party.displayName}`).toMatch(
        /^\/i\/[^/]+\/party-\d{2}-[a-z0-9]{8}$/,
      );
      const res = await guestContext.request.get(party.invitePath ?? "");
      expect(res.status(), `HTTP status for ${party.displayName}`).toBe(200);
    }

    const twentieth = listed.items[19];
    expect(twentieth?.displayName).toBe("Party 20");
    await guest.goto(`${twentieth?.invitePath ?? ""}`);
    await openGate(guest);
    await expect(guest.getByText("Dear Party 20")).toBeVisible();
    await guest.getByRole("radio", { name: "Yes, I will be there" }).check();
    await guest.getByRole("button", { name: "Send reply" }).click();
    await expect(
      guest.getByRole("heading", { name: /We cannot wait to see you/i }),
    ).toBeVisible();

    await guestContext.close();
  });
});
