# Business plan (living document)

> See also [PERTH_STRATEGY.md](PERTH_STRATEGY.md) for the detailed Perth market strategy, 5 event verticals, UI/UX architecture, and stage-by-stage growth plan.

## One line

Managevent runs every kind of event and ceremony from 0 to 100 in Perth, Western Australia: weddings, milestone birthdays, corporate galas, cultural celebrations, and dignified memorials — covering planning, styling, venue sourcing, hire, catering coordination, digital invitations, and on-the-day delivery. It is powered by its own invitation, logistics bridge, and event management software, then grows into a national marketplace. _A product by Appilico._

## Language & market positioning

- **English-first UX (`en-AU`):** Built for the broad Perth event market (couples, families, corporate hosts, community organisations, and funeral/memorial coordinators) with clear Australian English copy and GST-inclusive AUD pricing.
- **Multi-language ready (`@managevent/i18n`):** Architected with logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`), deterministic date formatters, and typed dictionaries (`en` + `fa` active today, with `ar`, `zh`, and `hi` pre-configured) so additional languages can be enabled at any time without layout changes.

## The problem

- Hosts juggle 6 to 12 suppliers, spreadsheets and messaging groups. Headcounts change constantly, and catering, cakes and seating are sized by guesswork.
- Cultural and traditional ceremonies are under-served by mainstream planners (including Persian Sofreh Aghd, Baleh Boroon, Nowruz, Yalda, Mehmooni, as well as Arabic, South Asian and Chinese traditions).
- Corporate teams and community groups need reliable, turnkey event delivery across Perth CBD, Swan Valley, Fremantle and local council halls without agency mark-up opacity.
- Families arranging memorials and wakes need calm, competent help with the gathering itself (venue, wake catering, tribute displays, digital RSVP) at a difficult time.
- Digital invitations today are disconnected pages, detached from real-world catering and seating fulfilment.

## Our answer

1. **Agency (Phase 1 — Live in Perth):** Fixed-price and custom-quoted 0-to-100 packages across all event types, delivered by our Perth planners and vetted local partners.
2. **Tools (`invitation.`):** Digital invitations with animated gate reveals, RSVP, encrypted dietary/allergy tracking, QR check-in passes, and wishing well or tribute book. Free tier plus a `$69 AUD incl. GST` Premium Event Pass (free for Memorial Mode events).
3. **Admin & Planner Command Centre (`admin.`):** Staff CRM pipeline, instant proposal builder, live event run-sheets, Perth supplier compliance tracking, and ATO GST ledger.
4. **The Bridge (`@managevent/logistics`):** Live RSVP numbers automatically calculate catering portions, dietary/allergy splits, cake serves, table counts, chair/linen hire, and WA RSA staffing ratios.
5. **Marketplace (Phase 2):** Vetted Perth vendors take bookings through the platform with commission via Stripe Connect Express.

## Customers (Perth first)

| Segment                                                       | Why us                                                                                                                    |
| :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------ |
| **Couples (weddings & engagements)**                          | One accountable Perth team, transparent instant cost estimates, and seamless digital invitations                          |
| **Families (birthdays, anniversaries, showers, graduations)** | Turnkey 0-to-100 packages with clear GST-inclusive prices, styling, cakes, catering, and furniture hire                   |
| **Corporates & community groups**                             | End-of-year galas, product launches, award nights, and council hall know-how across Perth Metro                           |
| **Cultural & multicultural communities**                      | Specialist styling and cultural know-how (Sofreh Aghd sets, Halal catering coordination, multi-language support)          |
| **Families arranging memorials & wakes**                      | Dignified coordination and calm Memorial Mode tools (complimentary Premium features), working alongside funeral directors |

## Revenue streams

1. **Event & ceremony packages:** Margin on styling, catering coordination, and equipment hire, plus a tiered planning fee (_Essential_, _Signature_, _Luxe_).
2. **Invitation Premium Event Pass:** `$69 AUD incl. GST` one-off per celebration event (complimentary for Memorial Mode).
3. **Marketplace commission:** 10–15% commission on partner vendor bookings via Stripe Connect.
4. **Corporate & B2B retainers:** Recurring annual event management for Perth businesses and community organisations.

## Competitive edge

Full-spectrum 0-to-100 delivery in Perth, transparent instant online estimates, owned software connecting invitations directly to catering and seating fulfilment, and dedicated Memorial Mode support.

## Key risks & mitigations

| Risk                                 | Mitigation                                                                                                             |
| :----------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Supplier reliability**             | Verification queue in Admin, backup partners per category in Perth, standardized run-sheets                            |
| **Seasonality**                      | Balanced across spring/autumn weddings, Nov–Dec corporate galas, cultural peaks, and year-round milestones & memorials |
| **Holding customer money & refunds** | Clear milestone schedules (deposit, pre-event balance), Australian Consumer Law compliance                             |
| **Data & privacy**                   | Sydney (`ap-southeast-2`) hosting, AES-256-GCM field encryption for dietary/health data, strict redaction              |
| **Founder bandwidth**                | AI-assisted software automation + modular Admin Command Centre for rapid lead-to-proposal turnaround                   |

## Key metrics

Leads per week, lead-to-booking conversion rate, average event value (AUD incl. GST), gross margin per event, invitation sign-ups and Premium pass conversion, post-event NPS, and verified Perth partner count.
