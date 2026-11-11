import { describe, expect, it } from "vitest";
import { loadCeremonies, loadPerthVenues } from "./content";
import { localePath, pageMetadata } from "./site";

describe("marketing launch", () => {
  it("loads the shared ceremony catalogue and Perth venues through validators", () => {
    expect(loadCeremonies().some((ceremony) => ceremony.slug === "sofreh-aghd")).toBe(true);
    expect(loadPerthVenues().length).toBeGreaterThanOrEqual(6);
  });
  it("keeps language in URLs and publishes locale alternates", () => {
    expect(localePath("en")).toBe("/");
    expect(localePath("fa", "/privacy")).toBe("/fa/privacy");
    expect(pageMetadata("fa", "Privacy", "/privacy").alternates?.canonical).toBe("/fa/privacy");
  });
});
