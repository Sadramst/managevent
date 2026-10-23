import { describe, expect, it } from "vitest";
import { loadCeremonies } from "./content";
import { localePath, pageMetadata } from "./site";

describe("marketing launch", () => {
  it("loads the shared ceremony catalogue through its validator", () => {
    expect(loadCeremonies().some((ceremony) => ceremony.slug === "sofreh-aghd")).toBe(true);
  });
  it("keeps language in URLs and publishes locale alternates", () => {
    expect(localePath("en")).toBe("/");
    expect(localePath("fa", "/privacy")).toBe("/fa/privacy");
    expect(pageMetadata("fa", "Privacy", "/privacy").alternates?.canonical).toBe("/fa/privacy");
  });
});
