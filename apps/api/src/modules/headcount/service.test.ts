import { describe, expect, it } from "vitest";
import { encryptField } from "@managevent/db";
import { DietaryCountsSchema } from "@managevent/validators";
import { InMemoryJobQueue } from "../../lib/queue.js";
import {
  computeHeadcountTotals,
  emptyDietaryCounts,
  enqueueHeadcountChanged,
  readDietaryTags,
} from "./service.js";

describe("headcount/service (pure)", () => {
  it("counts adults, children, maybe, no and pending; no Rsvp row is pending", () => {
    const totals = computeHeadcountTotals([
      { isChild: false, status: "YES", dietary: [] },
      { isChild: false, status: "YES", dietary: ["VEGAN"] },
      { isChild: true, status: "YES", dietary: ["NUT_ALLERGY", "VEGAN"] },
      { isChild: false, status: "MAYBE", dietary: ["HALAL"] },
      { isChild: true, status: "NO", dietary: ["KOSHER"] },
      { isChild: false, status: "PENDING", dietary: [] },
      { isChild: false, status: null, dietary: [] },
    ]);
    expect(totals).toMatchObject({ adultsYes: 2, childrenYes: 1, maybe: 1, no: 1, pending: 2 });
    // Dietary needs are counted for attending guests only.
    expect(totals.dietaryCounts).toEqual({ ...emptyDietaryCounts(), VEGAN: 2, NUT_ALLERGY: 1 });
  });

  it("produces strict dietary counts: no NONE, no unknown keys, one count per guest per tag", () => {
    const totals = computeHeadcountTotals([
      { isChild: false, status: "YES", dietary: ["NONE"] },
      { isChild: false, status: "YES", dietary: ["HALAL", "HALAL", "SOMETHING_ELSE"] },
    ]);
    expect(totals.dietaryCounts).toEqual({ ...emptyDietaryCounts(), HALAL: 1 });
    expect(Object.keys(totals.dietaryCounts)).not.toContain("NONE");
    // `.strict()` rejects any extra key, so this proves the stored JSON matches the contract.
    expect(DietaryCountsSchema.safeParse(totals.dietaryCounts).success).toBe(true);
  });

  it("is all zeroes for an empty guest list", () => {
    expect(computeHeadcountTotals([])).toEqual({
      adultsYes: 0,
      childrenYes: 0,
      maybe: 0,
      no: 0,
      pending: 0,
      dietaryCounts: emptyDietaryCounts(),
    });
  });

  it("reads dietary tags from ciphertext and drops anything that is not a tag", () => {
    expect(readDietaryTags(encryptField(JSON.stringify(["VEGAN", "HALAL", "VEGAN"])))).toEqual([
      "VEGAN",
      "HALAL",
    ]);
    expect(readDietaryTags(encryptField(JSON.stringify(["VEGAN", "nope", 3])))).toEqual(["VEGAN"]);
    expect(readDietaryTags(encryptField(JSON.stringify({ not: "an array" })))).toEqual([]);
    expect(readDietaryTags(null)).toEqual([]);
    expect(readDietaryTags(undefined)).toEqual([]);
    // Corrupt ciphertext never throws out of a headcount.
    expect(readDietaryTags("enc:v1:00:00:00")).toEqual([]);
  });

  it("enqueues headcount.changed once per snapshot", async () => {
    const queue = new InMemoryJobQueue();
    await enqueueHeadcountChanged(queue, "evt_1", "hc_1");
    await enqueueHeadcountChanged(queue, "evt_1", "hc_1");
    await enqueueHeadcountChanged(queue, "evt_1", "hc_2");
    expect(queue.jobs).toEqual([
      {
        name: "headcount.changed",
        payload: { eventId: "evt_1", headcountId: "hc_1" },
        opts: { singletonKey: "headcount.changed:hc_1" },
      },
      {
        name: "headcount.changed",
        payload: { eventId: "evt_1", headcountId: "hc_2" },
        opts: { singletonKey: "headcount.changed:hc_2" },
      },
    ]);
  });
});
