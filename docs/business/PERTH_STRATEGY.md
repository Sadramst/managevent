# Perth strategy (0 to 100)

The market strategy for Perth and Western Australia: Metro, Swan Valley, Perth Hills, Fremantle and Peel. The company-level plan is [BUSINESS_PLAN.md](BUSINESS_PLAN.md); launch channels and the seasonal calendar are in [GO_TO_MARKET_PERTH.md](GO_TO_MARKET_PERTH.md). Product and page design are owned by [`WEBSITE.md`](../../WEBSITE.md) and [`../design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md), not by this file.

## Vision

Managevent is Perth's full-lifecycle event partner: hands-on event production backed by our own software. Traditional agencies run on spreadsheets; invitation sites stop at the RSVP. We join the two:

1. **Full-service production:** concept, venue sourcing, styling, catering coordination, furniture and marquee hire, AV and on-the-day staffing.
2. **Digital invitations and guest experience** (`invitation.managevent.com.au`): invitations, RSVP with encrypted dietary and allergy answers, QR entry passes, wishing well or tribute book. Built.
3. **The RSVP-to-fulfilment bridge:** guest replies drive catering headcounts, dietary splits, cake serves, table counts and hire quantities. The calculation is built (`packages/logistics`, worker job `headcount.changed`); the customer-facing view is planned (PRT-03, PRT-04).
4. **Planner operations:** today the staff console at `www.managevent.com.au/admin` has the enquiry inbox. Proposals, event command centre, vendor checks, inventory and finance are planned (ADM-02 to ADM-08).

## Five event verticals

Weekend celebrations, weekday corporate work and year-round memorials balance each other and smooth out seasonal dips.

| Vertical                                      | Example occasions                                                                              | Target Perth locations                                                                | Revenue model                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **1. Weddings and engagements**               | Weddings, vineyard receptions, elopements, engagement parties, bridal showers                  | Swan Valley wineries, Kings Park, Matilda Bay, Cottesloe, Perth Hills                 | Package fee plus styling and hire margin plus vendor commission (phase 2)   |
| **2. Milestones and private celebrations**    | 21st to 50th+ birthdays, anniversaries, baby showers, graduations, housewarmings               | Fremantle heritage spaces, riverside venues, private homes with marquees, South Perth | Tiered fixed-price packages plus add-ons                                    |
| **3. Corporate and community**                | End-of-year galas, launches, award nights, conferences, fundraisers, council and school events | CBD hotels and rooftops, Elizabeth Quay, Joondalup, Canning and Melville halls        | Fixed B2B proposals, recurring corporate accounts, AV and hire              |
| **4. Cultural and traditional ceremonies**    | Multicultural weddings, engagements, community festivals                                       | Swan Valley estates, community banquet halls, riverfront pavilions                    | Specialist styling and cultural prop hire                                   |
| **5. Memorials, wakes, celebrations of life** | Wakes after a service, celebrations of life, unveilings, anniversary remembrances              | Kings Park pavilions, yacht clubs, community halls, family homes                      | Fixed-fee coordination plus wake catering; Premium invitation features free |

Venue names above are target locations, not partners. The `/venues` page may name a venue as a partner only once an agreement exists (BIZ-07). Funeral-director work itself is out of scope (D-09).

Package prices and tiers (Essential, Signature, Luxe) are not approved yet (DEC-01); see [PRICING_MODEL.md](PRICING_MODEL.md).

## Stages

| Stage                                             | Goal                                                                                                                                                                                                                               | Depends on                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **1. Launch and agency cashflow** (months 1–3)    | `www.` and `invitation.` live; first partner network (3 caterers including Halal and dietary specialists, 2 venues, 2 florists, a hire partner, AV and DJ); search campaigns; free and Premium invitations as the acquisition loop | ROADMAP milestones M1 and M2 (OPS-01 to OPS-04, OPS-07, BIZ-01 to BIZ-06) |
| **2. Customer portal** (months 4–6)               | `app.managevent.com.au`: hosts manage checklists, approve RSVP-driven catering changes and pay milestones (cards, Apple Pay, Google Pay, Afterpay; PayID per D-08); grow owned styling inventory                                   | PRT-01 to PRT-11, ADM-05                                                  |
| **3. Marketplace and on-site tech** (months 7–12) | `vendors.managevent.com.au` with ABN checks and Stripe Connect payouts; crew check-in on mobile and Windows door kiosks for large events; then Sydney and Melbourne                                                                | VEN, MKP, MOB, WIN rows; [EXPANSION.md](EXPANSION.md)                     |
