import { getAdminPages } from "@managevent/i18n";
import type { LeadResponse } from "@managevent/types";
import { describe, expect, it } from "vitest";
import {
  canMoveLeadStage,
  ceremonyLabel,
  formatPerthDate,
  formatPerthDateTime,
  humaniseSlug,
  inboxHref,
  isMemorialEnquiry,
  isStaff,
  LEAD_STAGES,
  leadHref,
  nextLeadStages,
  parseLeadCursor,
  parseSearchQuery,
  parseSignInReason,
  parseStageFilter,
  primaryStaffRole,
  safeAdminNext,
  signInHref,
  stageBadgeClass,
  stageCounts,
  telHref,
  toInboxRow,
} from "./leads";

const LEAD_ID = "lead_0192b400-0000-7000-8000-000000000001";

const lead: LeadResponse = {
  id: LEAD_ID,
  stage: "NEW",
  source: "CONTACT_FORM",
  name: "Test Host",
  email: "host@example.com",
  phone: null,
  preferredLanguage: "en",
  preferredChannel: "EMAIL",
  ceremonySlug: "wedding",
  eventDate: "2027-03-14T00:00:00.000Z",
  dateFlexible: false,
  guestEstimate: 120,
  area: null,
  estimateId: null,
  marketingConsentId: null,
  createdAt: "2026-11-12T17:30:00.000Z",
};

describe("staff roles", () => {
  it("lets planners and administrators in, and nobody else", () => {
    expect(isStaff(["PLANNER_STAFF"])).toBe(true);
    expect(isStaff(["CUSTOMER_HOST", "SUPER_ADMIN"])).toBe(true);
    expect(isStaff(["CUSTOMER_HOST"])).toBe(false);
    expect(isStaff(["VENDOR", "CHECKIN_CREW", "GUEST"])).toBe(false);
    expect(isStaff([])).toBe(false);
  });

  it("shows the administrator role when both are held", () => {
    expect(primaryStaffRole(["PLANNER_STAFF", "SUPER_ADMIN"])).toBe("SUPER_ADMIN");
    expect(primaryStaffRole(["PLANNER_STAFF"])).toBe("PLANNER_STAFF");
    expect(primaryStaffRole(["CUSTOMER_HOST"])).toBeNull();
  });
});

describe("lead stage moves", () => {
  it("covers every stage in the contract, in pipeline order", () => {
    expect(LEAD_STAGES).toEqual(["NEW", "QUALIFIED", "PROPOSAL_SENT", "BOOKED", "LOST"]);
    for (const stage of LEAD_STAGES) {
      expect(nextLeadStages(stage).length).toBeGreaterThan(0);
      expect(nextLeadStages(stage)).not.toContain(stage);
      expect(stageBadgeClass(stage)).toMatch(/^badge/);
    }
  });

  it("offers the next step first", () => {
    expect(nextLeadStages("NEW")[0]).toBe("QUALIFIED");
    expect(nextLeadStages("QUALIFIED")[0]).toBe("PROPOSAL_SENT");
    expect(nextLeadStages("PROPOSAL_SENT")[0]).toBe("BOOKED");
  });

  it("allows only the offered moves", () => {
    expect(canMoveLeadStage("NEW", "QUALIFIED")).toBe(true);
    expect(canMoveLeadStage("NEW", "LOST")).toBe(true);
    expect(canMoveLeadStage("NEW", "BOOKED")).toBe(false);
    expect(canMoveLeadStage("NEW", "NEW")).toBe(false);
    expect(canMoveLeadStage("LOST", "NEW")).toBe(true);
    expect(canMoveLeadStage("LOST", "BOOKED")).toBe(false);
    expect(canMoveLeadStage("BOOKED", "PROPOSAL_SENT")).toBe(true);
  });

  it("lets every stage reach LOST, and LOST reopen", () => {
    for (const stage of LEAD_STAGES.filter((value) => value !== "LOST")) {
      expect(canMoveLeadStage(stage, "LOST")).toBe(true);
    }
    expect(nextLeadStages("LOST")).toEqual(["NEW"]);
  });
});

describe("inbox query string", () => {
  it("accepts only real stages", () => {
    expect(parseStageFilter("QUALIFIED")).toBe("QUALIFIED");
    expect(parseStageFilter("CONTACTED")).toBeUndefined();
    expect(parseStageFilter("new")).toBeUndefined();
    expect(parseStageFilter(["NEW", "LOST"])).toBeUndefined();
    expect(parseStageFilter(undefined)).toBeUndefined();
  });

  it("trims the search and caps it at the API limit", () => {
    expect(parseSearchQuery("  swan valley ")).toBe("swan valley");
    expect(parseSearchQuery("   ")).toBeUndefined();
    expect(parseSearchQuery(undefined)).toBeUndefined();
    expect(parseSearchQuery("x".repeat(200))).toHaveLength(80);
  });

  it("ignores a cursor that is not a lead id", () => {
    expect(parseLeadCursor(LEAD_ID)).toBe(LEAD_ID);
    expect(parseLeadCursor("1; drop table")).toBeUndefined();
    expect(parseLeadCursor("usr_0192b400-0000-7000-8000-000000000001")).toBeUndefined();
  });

  it("builds stable inbox and lead links", () => {
    expect(inboxHref()).toBe("/admin");
    expect(inboxHref({ stage: "NEW" })).toBe("/admin?stage=NEW");
    expect(inboxHref({ q: "o'brien & co", stage: "LOST", cursor: LEAD_ID })).toBe(
      `/admin?stage=LOST&q=o%27brien+%26+co&cursor=${LEAD_ID}`,
    );
    expect(leadHref(LEAD_ID)).toBe(`/admin/leads/${LEAD_ID}`);
  });
});

describe("sign-in redirects", () => {
  it("only ever returns a path inside the console", () => {
    expect(safeAdminNext(undefined)).toBe("/admin");
    expect(safeAdminNext("/admin")).toBe("/admin");
    expect(safeAdminNext(`/admin/leads/${LEAD_ID}`)).toBe(`/admin/leads/${LEAD_ID}`);
    expect(safeAdminNext("/admin?stage=NEW&q=a")).toBe("/admin?stage=NEW&q=a");
    // Dots are only refused as whole path segments, and never in the query.
    expect(safeAdminNext("/admin?q=a..b%2Fc")).toBe("/admin?q=a..b%2Fc");
    for (const hostile of [
      "https://evil.example/admin",
      "//evil.example/admin",
      "/admin//evil.example",
      "/admin\\evil",
      "/administrator",
      "/contact",
      "javascript:alert(1)",
      "/admin/sign-in",
      "/admin/sign-in?next=/admin",
      "/admin/sign-out",
      "/admin\n/x",
      // Starts with /admin but leaves the console once a browser resolves it.
      "/admin/../contact",
      "/admin/..",
      "/admin/leads/../../contact?x=1",
      "/admin/%2e%2e/contact",
      "/admin/.%2E/contact",
      "/admin/./leads",
      "/admin/x%2f..%2f..%2fcontact",
      "/admin/x%5Ccontact",
    ]) {
      expect(safeAdminNext(hostile), hostile).toBe("/admin");
    }
    expect(safeAdminNext(["/admin/leads/a", "/admin/leads/b"])).toBe("/admin");
  });

  it("builds the sign-in link with a reason and a destination", () => {
    expect(signInHref()).toBe("/admin/sign-in");
    expect(signInHref({ next: "/admin" })).toBe("/admin/sign-in");
    expect(signInHref({ reason: "staff" })).toBe("/admin/sign-in?reason=staff");
    expect(signInHref({ reason: "session", next: `/admin/leads/${LEAD_ID}` })).toBe(
      `/admin/sign-in?reason=session&next=%2Fadmin%2Fleads%2F${LEAD_ID}`,
    );
    expect(signInHref({ next: "https://evil.example" })).toBe("/admin/sign-in");
  });

  it("reads only known reasons", () => {
    expect(parseSignInReason("staff")).toBe("staff");
    expect(parseSignInReason("session")).toBe("session");
    expect(parseSignInReason("signed-out")).toBe("signed-out");
    expect(parseSignInReason("<script>")).toBeUndefined();
    expect(parseSignInReason(undefined)).toBeUndefined();
  });
});

describe("Perth-time formatting", () => {
  it("formats DD/MM/YYYY in Perth time, across the UTC day boundary", () => {
    // 17:30 UTC on the 12th is 01:30 on the 13th in Perth (UTC+8).
    expect(formatPerthDate("2026-11-12T17:30:00.000Z")).toBe("13/11/2026");
    expect(formatPerthDate("2026-11-12T15:59:59.000Z")).toBe("12/11/2026");
    expect(formatPerthDate("2026-12-31T16:00:00.000Z")).toBe("01/01/2027");
    // A date-only event date is stored as UTC midnight and stays on its calendar day.
    expect(formatPerthDate("2027-03-14T00:00:00.000Z")).toBe("14/03/2027");
  });

  it("adds a 12-hour time", () => {
    expect(formatPerthDateTime("2026-11-12T17:30:00.000Z")).toBe("13/11/2026, 1:30 am");
    expect(formatPerthDateTime("2026-11-12T04:05:00.000Z")).toBe("12/11/2026, 12:05 pm");
    expect(formatPerthDateTime("2026-11-12T16:00:00.000Z")).toBe("13/11/2026, 12:00 am");
    expect(formatPerthDateTime("2026-11-12T09:45:00.000Z")).toBe("12/11/2026, 5:45 pm");
  });

  it("returns an empty string for a value that is not a date", () => {
    expect(formatPerthDate("not a date")).toBe("");
    expect(formatPerthDateTime("")).toBe("");
  });
});

describe("display helpers", () => {
  it("names an occasion from content, or from its slug", () => {
    expect(ceremonyLabel("wedding", { wedding: "Weddings" })).toBe("Weddings");
    expect(ceremonyLabel("other-occasion", {})).toBe("Other occasion");
    expect(ceremonyLabel(null, {})).toBe("");
    expect(humaniseSlug("birthday-milestone")).toBe("Birthday milestone");
    expect(humaniseSlug("")).toBe("");
  });

  it("marks memorial enquiries through the shared helper", () => {
    expect(isMemorialEnquiry("celebration-of-life")).toBe(true);
    expect(isMemorialEnquiry("memorial-service")).toBe(true);
    expect(isMemorialEnquiry("wake")).toBe(true);
    expect(isMemorialEnquiry("wedding")).toBe(false);
    expect(isMemorialEnquiry(null)).toBe(false);
  });

  it("builds tel: links from a typed phone number", () => {
    expect(telHref("0412 345 678")).toBe("tel:0412345678");
    expect(telHref("+61 (0) 412-345-678")).toBe("tel:+610412345678");
  });
});

describe("stage totals", () => {
  it("counts each stage when the page holds every lead", () => {
    const counts = stageCounts({
      items: [{ stage: "NEW" }, { stage: "NEW" }, { stage: "BOOKED" }, { stage: "LOST" }],
      nextCursor: null,
    });
    expect(counts).toEqual({ NEW: 2, QUALIFIED: 0, PROPOSAL_SENT: 0, BOOKED: 1, LOST: 1, all: 4 });
  });

  it("reports zeros for an empty inbox", () => {
    expect(stageCounts({ items: [], nextCursor: null })?.all).toBe(0);
  });

  it("gives no totals rather than wrong ones when there are more leads than one page", () => {
    expect(stageCounts({ items: [{ stage: "NEW" }], nextCursor: LEAD_ID })).toBeNull();
    expect(stageCounts(null)).toBeNull();
  });
});

describe("inbox rows", () => {
  const copy = getAdminPages("en");

  it("formats a lead for the table", () => {
    expect(toInboxRow(lead, copy, { wedding: "Weddings" })).toEqual({
      id: LEAD_ID,
      href: `/admin/leads/${LEAD_ID}`,
      received: "13/11/2026",
      receivedIso: "2026-11-12T17:30:00.000Z",
      name: "Test Host",
      email: "host@example.com",
      ceremony: "Weddings",
      memorial: false,
      eventDate: "14/03/2027",
      dateFlexible: false,
      guests: "120",
      area: "",
      stage: "NEW",
      stageLabel: "New",
      stageClass: "badge badge-solid",
    });
  });

  it("leaves missing details empty and keeps the flexible flag", () => {
    const row = toInboxRow(
      {
        ...lead,
        ceremonySlug: "wake",
        eventDate: null,
        dateFlexible: true,
        guestEstimate: null,
        area: "Fremantle",
        stage: "LOST",
      },
      copy,
      {},
    );
    expect(row).toMatchObject({
      ceremony: "Wake",
      memorial: true,
      eventDate: "",
      dateFlexible: true,
      guests: "",
      area: "Fremantle",
      stageLabel: "Lost",
    });
  });
});
