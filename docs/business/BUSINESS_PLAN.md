# Business plan (living document)

Company-level strategy. The Perth market detail is in [PERTH_STRATEGY.md](PERTH_STRATEGY.md), the launch plan in [GO_TO_MARKET_PERTH.md](GO_TO_MARKET_PERTH.md), prices in [PRICING_MODEL.md](PRICING_MODEL.md). What the software does today is in the root [`README.md`](../../README.md); what is left to build or decide is in [`ROADMAP.md`](../../ROADMAP.md).

## One line

Managevent runs every kind of event and ceremony from 0 to 100 in Perth, Western Australia: weddings, milestone birthdays, corporate galas, cultural celebrations and dignified memorials. It covers planning, styling, venue sourcing, hire, catering coordination, digital invitations and on-the-day delivery, powered by its own invitation and logistics software, and later grows into a national marketplace. _A product by Appilico._

## Market positioning

- **English first (en-AU)** for the broad Perth market: couples, families, corporate hosts, community organisations and families arranging memorials. Prices in AUD, GST-inclusive.
- **Ready for more languages later.** The product uses typed dictionaries in `packages/i18n` and logical CSS properties, so Arabic, Mandarin or Hindi can be enabled without layout rework ([`../design/I18N_RTL.md`](../design/I18N_RTL.md)). Only English is enabled.

## The problem

- Hosts juggle 6 to 12 suppliers, spreadsheets and messaging groups. Headcounts change constantly, and catering, cakes and seating are sized by guesswork.
- Cultural and traditional ceremonies (Arabic, South Asian and Chinese traditions among them) are under-served by mainstream planners.
- Corporate teams and community groups need reliable, turnkey delivery across Perth CBD, the Swan Valley, Fremantle and council halls, without opaque agency mark-ups.
- Families arranging memorials and wakes need calm, competent help with the gathering itself at a difficult time.
- Digital invitations are usually disconnected pages, detached from catering and seating.

## Our answer: three business lines on one platform

| Line                      | What it is                                                                                                                    | State of the product today                                                                                                                                                                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agency** (phase 1)      | Fixed-price and quoted packages for every event type, delivered by our planners and vetted Perth partners.                    | The www site takes enquiries; staff work them in the console at `www.managevent.com.au/admin` (enquiry inbox and detail, password plus TOTP). Proposals, event command centre, vendor checks and finance are planned (ADM-02 to ADM-08). No partner agreements are signed yet (BIZ-06, BIZ-07).             |
| **Tools** (`invitation.`) | Digital invitations with RSVP, encrypted dietary and allergy answers, QR passes, door check-in, wishing well or tribute book. | Built: sign-up, studio, guest site, RSVP, email invitations and reminders (when Resend is configured), signed QR passes, check-in, wishes. Free plan plus the $69 Premium Event Pass through Stripe Checkout (when configured). SMS, WhatsApp, media uploads and a photo wall are planned (INV-08, INV-11). |
| **Marketplace** (phase 2) | Vetted vendors take bookings through the platform; we take commission through Stripe Connect Express.                         | Not built (VEN-01 to VEN-06, MKP-01, MKP-02).                                                                                                                                                                                                                                                               |

**The bridge** joins them: when a guest replies, the worker recomputes the headcount and writes catering, dietary, cake, seating, hire and RSA staffing recommendations (`packages/logistics`). Showing and applying them is the customer portal's job (PRT-03, PRT-04), which is not built.

## Customers (Perth first)

| Segment                                          | Why us                                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Couples** (weddings, engagements)              | One accountable Perth team, clear prices and invitations that feed the catering numbers                                 |
| **Families** (birthdays, anniversaries, showers) | Turnkey packages with GST-inclusive prices, styling, cakes, catering and hire                                           |
| **Corporates and community groups**              | End-of-year galas, launches and award nights; council hall know-how across metro Perth                                  |
| **Cultural and multicultural communities**       | Specialist styling and cultural know-how (traditional ceremony sets, Halal catering coordination)                       |
| **Families arranging memorials and wakes**       | Dignified coordination and calm Memorial Mode tools, with Premium invitation features free, alongside funeral directors |

## Revenue streams

1. **Event and ceremony packages:** margin on styling, catering coordination and hire, plus a planning fee in three tiers (Essential, Signature, Luxe). Rates are not approved yet (DEC-01).
2. **Premium Event Pass:** $69 AUD incl. GST, one-off per event; free for memorial events. Live in code; never exercised against live Stripe (OPS-03).
3. **Marketplace commission** (phase 2): 10 to 15% on vendor bookings through Stripe Connect.
4. **Corporate retainers:** recurring event management for Perth businesses and community organisations (MKP-02).

## Competitive edge

Full 0-to-100 delivery in Perth, owned software that connects invitations to catering and seating, and dedicated Memorial Mode support.

## Key risks and mitigations

| Risk                       | Mitigation                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Supplier reliability**   | Verification of documents (ADM-04, planned), backup partners per category, standard run-sheets                                                                           |
| **Seasonality**            | A mix of spring and autumn weddings, Nov–Dec corporate galas, cultural peaks, and year-round milestones and memorials                                                    |
| **Holding customer money** | Milestone schedules (deposit, pre-event balance) and Australian Consumer Law compliance; legal advice before escrow (D-07)                                               |
| **Data and privacy**       | Everything stored on one server in Sydney; AES-256-GCM field encryption for dietary and allergy data; log redaction ([compliance](../compliance/COMPLIANCE_REGISTER.md)) |
| **Founder bandwidth**      | Software that turns enquiries and RSVPs into work items, and a staff console that grows with the business                                                                |
| **Single server**          | Accepted for launch, with nightly encrypted backups (ADR-0011); revisit when the first paying customer's event is on the platform                                        |

## Key metrics

Enquiries per week, enquiry-to-booking conversion, average event value (AUD incl. GST), gross margin per event, invitation sign-ups and Premium conversion, post-event NPS, and verified Perth partners. Measuring the web funnel needs analytics with consent (MKT-14).
