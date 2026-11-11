import { describe, expect, it } from "vitest";
import { resolveVenueName } from "./venue-prefill";

const venues = [
  { slug: "kings-park", name: { en: "  Kings Park Pavilion " } },
  { slug: "long", name: { en: "x".repeat(300) } },
];

describe("resolveVenueName", () => {
  it("resolves a known slug to a trimmed name", () => {
    expect(resolveVenueName("kings-park", venues)).toBe("Kings Park Pavilion");
    expect(resolveVenueName(" kings-park ", venues)).toBe("Kings Park Pavilion");
  });
  it("caps the length", () => {
    expect(resolveVenueName("long", venues)?.length).toBe(120);
  });
  it("returns undefined for unknown, empty, null or array values", () => {
    expect(resolveVenueName("nope", venues)).toBeUndefined();
    expect(resolveVenueName("", venues)).toBeUndefined();
    expect(resolveVenueName("  ", venues)).toBeUndefined();
    expect(resolveVenueName(null, venues)).toBeUndefined();
    expect(resolveVenueName(["kings-park"], venues)).toBeUndefined();
    expect(resolveVenueName("<script>", venues)).toBeUndefined();
  });
});
