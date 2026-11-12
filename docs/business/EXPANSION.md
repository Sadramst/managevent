# Expansion

**Order:** Perth (WA) → Sydney (NSW) → Melbourne (VIC) → Brisbane (QLD) → Adelaide (SA) → Gold Coast (QLD).

Each city has `content/locations/<city>/city.json` with a `status` of `live`, `waitlist` or `hidden` (`content/schemas/city.schema.json`). Today Perth is `live` and the other five are `hidden`; only Perth has a `venues.json`. Launching the second city is ROADMAP **BIZ-13** and needs the city pages of **MKT-10**.

## City readiness checklist

- [ ] Legal: the state's liquor, food and working-with-children regimes reviewed, and state rows added to [`../compliance/COMPLIANCE_REGISTER.md`](../compliance/COMPLIANCE_REGISTER.md).
- [ ] Time zone: daylight saving verified (NSW, VIC and SA observe it; QLD and WA do not). Events store an IANA `timeZone` (ADR-0006).
- [ ] At least 10 verified vendors across the core categories (needs the vendor portal, VEN-01 and VEN-02) and at least 8 venues in `content/locations/<city>/venues.json`.
- [ ] A city price list, travel zones and areas served.
- [ ] Local SEO pages pass the thin-content check (MKT-10). Then set `city.json` `status` to `live` (from `hidden` or `waitlist`).
- [ ] Crew: a local coordinator, or a marketplace-only launch where agency service is not offered yet.
