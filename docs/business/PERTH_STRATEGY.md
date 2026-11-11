# Managevent — Perth Business & Product Strategy (0 to 100)

> **Operating Market:** Perth & Western Australia (Metro, Swan Valley, Perth Hills, Fremantle, Peel)
> **Language Strategy:** English-first experience across all customer, planner, and admin surfaces, architected on `@managevent/i18n` for zero-friction expansion into additional languages (Persian/Farsi, Arabic, Mandarin, Hindi) as community verticals scale.

---

## 1. Executive Vision

**Managevent** is Perth's full-lifecycle ("0 to 100") event planning, styling, equipment hire, and digital event management platform. Unlike traditional event agencies that rely on disconnected spreadsheets, or standalone invitation sites that stop at collecting RSVPs, Managevent combines **hands-on Perth event production** with **proprietary event software**:

1. **Full-Service Event Production (0 to 100 Agency):** End-to-end concept, venue sourcing, styling, catering coordination, furniture/marquee hire, AV, and on-the-day staffing across Perth.
2. **Digital Invitations & Guest Experience (`invitation.`):** Custom-designed interactive invitations, QR entry passes, wishing wells, tribute books, and encrypted dietary/allergy tracking.
3. **The RSVP-to-Fulfilment Bridge:** Live guest RSVPs automatically calculate catering headcounts, dietary breakdowns (Halal, Vegan, Gluten-Free, Anaphylaxis alerts), cake portions, table layouts, and hire quantities.
4. **Planner & Operations Command Centre (`admin.`):** Unified CRM lead pipeline, proposal generator, event run-sheet tracker, Perth vendor compliance monitor, and ATO GST financial reporting.

---

## 2. Core Event Verticals in Perth

Managevent is structured to serve **five high-demand event pillars** in Western Australia, balancing weekend celebrations with weekday corporate and year-round memorial gatherings to eliminate seasonal revenue dips:

| Event Vertical                                 | Example Occasions                                                                                            | Target Perth Locations                                                                             | Margin & Revenue Model                                                                        |
| :--------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **1. Weddings & Engagements**                  | Modern Australian weddings, vineyard receptions, elopements, engagement parties, bridal showers              | Swan Valley wineries, Kings Park, Matilda Bay foreshore, Cottesloe, Perth Hills orchards           | Package fee + 15–25% styling/hire margin + vendor commission                                  |
| **2. Milestone & Private Celebrations**        | 21st, 30th, 40th, 50th+ birthdays, anniversaries, baby showers, gender reveals, graduations, housewarmings   | Fremantle heritage spaces, riverside venues, private residences (backyard marquees), South Perth   | Tiered fixed-price packages ($2.5k–$25k+) + custom add-ons                                    |
| **3. Corporate & Community Events**            | End-of-year galas, product launches, award nights, conferences, charity fundraisers, council & school events | Perth CBD hotels/rooftops, Elizabeth Quay, Crown/Optus precincts, Joondalup/Canning/Melville halls | B2B fixed proposals + recurring corporate accounts + AV/hire                                  |
| **4. Cultural & Traditional Ceremonies**       | Sofreh Aghd, Baleh Boroon, Nowruz, Shab-e Yalda, Mehmooni, multicultural weddings & community festivals      | Swan Valley estates, community banquet halls, riverfront pavilions                                 | Specialist styling & cultural prop hire (high margin, low competition)                        |
| **5. Memorials, Wakes & Celebrations of Life** | Post-service wakes, celebrations of life, unveiling gatherings, anniversary remembrances                     | Kings Park pavilions, river yacht clubs, suburban community halls, family homes                    | Dignified fixed-fee coordination + wake catering + free Premium Memorial digital tribute/RSVP |

---

## 3. Product & UI/UX Strategy

### 3.1 Brand & Aesthetic Direction

- **Editorial Warmth (`CELEBRATION` Mode):** Warm Ivory (`#FAF7F2`) surfaces, Elevated White (`#FFFFFF`) panels, Deep Burgundy (`#5C1A24`) primary actions, Champagne Gold (`#C5A059`) architectural arch motifs and hairline rules, and Rich Charcoal (`#18181B`) typography (`Cormorant Garamond` headings + `Plus Jakarta Sans` UI).
- **Dignified Calm (`MEMORIAL` Mode):** Automatically triggered for memorials, wakes, and celebrations of life via `getExperienceMode()`. Switches to Soft Alabaster (`#F8F9FA`), Deep Ink (`#1E293B`), Muted Slate (`#64748B`), and Warm Bronze (`#8C7A6B`) with gentle fade transitions and zero celebratory language or upsells.
- **English-First, Multi-Language Ready:**
  - All primary UI flows, navigation, CTAs, estimator tools, and admin workflows are crafted in clear Australian English (`en-AU`, `AUD incl. GST`, `Australia/Perth` AWST timezone).
  - Every string is backed by `@managevent/i18n` dictionaries and logical CSS layout properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `inset-inline-*`) so secondary languages (`/fa` Persian, and future `/ar`, `/zh`, `/hi`) work seamlessly without layout refactoring.

### 3.2 Surface-by-Surface UX Architecture

1. **Marketing & Discovery Site (`apps/marketing` — `www.managevent.com.au`)**
   - **Hero & Value Proposition:** Clear positioning as Perth's 0-to-100 event partner.
   - **All-Events Category Showcase:** Interactive exploration of Weddings, Milestones, Corporate Galas, Cultural Gatherings, and Memorials.
   - **Interactive Instant Cost Estimator:** Real-time client-side calculator allowing Perth hosts to select their occasion, guest count (20–500), service tier (_Essential_, _Signature_, _Luxe_), and WA travel zone (_Perth Metro_, _Swan Valley & Hills_, _Mandurah & Regional_) to view an instant GST-inclusive estimate and carry it directly into their enquiry.
   - **Perth Venue Guide:** Curated showcase of Perth venue styles (Swan Valley wineries, foreshore reserves, heritage warehouses, council halls) with capacity and council permit guidance.
   - **0-to-100 Services Matrix & Digital Bridge Preview:** Visual explanation of how Managevent connects digital invitations and RSVPs to physical event delivery.

2. **Digital Invitations & Host Studio (`apps/invitation` — `invitation.managevent.com.au`)**
   - **Guest Micro-Site (`/i/[eventSlug]/[guestToken]`):** Server-rendered core details, animated wax-seal gate reveal (with reduced-motion support), story, timeline, map directions, `.ics` calendar download, QR entry pass, and multi-member party RSVP drawer.
   - **Host Studio (`/studio`):** Real-time response statistics, dietary/allergy matrix, table assignment, 1-click WhatsApp invitation generator, and UTF-8 BOM CSV export for caterers.

3. **Admin & Planner Command Centre (`apps/admin` — `admin.managevent.com.au`)**
   - **Executive Dashboard:** Live metrics across new Perth enquiries, active event pipeline value (AUD incl. GST), confirmed headcounts, and urgent tasks.
   - **CRM Lead Inbox:** Filterable, sortable lead management table (`NEW` → `CONTACTED` → `QUALIFIED` → `PROPOSAL_SENT` → `BOOKED`) with a native light-dismiss inspection modal, coordinator assignment, and instant quote builder.
   - **Active Event Run-Sheets & Logistics Bridge:** Live view of booked events showing RSVP headcount ratios, catering/seating recommendations from `@managevent/logistics`, and privacy-masked health/allergy disclosures.
   - **Perth Vendor & Venue Compliance Queue:** Tracking ABN verification, $20M Public Liability Insurance certificates, WA food safety, and RSA credentials.
   - **ATO Tax Invoice & GST Ledger:** Real-time GST split (`amountCents`, `gstCents`), deposit milestones, and BAS period summary.

---

## 4. Go-To-Market & Operations Roadmap (Perth WA)

### Stage 1: Launch & Agency Cashflow (Months 1–3)

- Launch `www.managevent.com.au`, `invitation.managevent.com.au`, and `admin.managevent.com.au`.
- Onboard foundational Perth partner network: 3 caterers (including Halal & dietary specialists), 2 Swan Valley / Fremantle venues, 2 florists, 1 marquee & furniture hire partner, and AV/DJ specialists.
- Run targeted Google Search campaigns for _"event planner Perth"_, _"wedding & party planner Perth"_, _"corporate event management Perth"_, and _"celebration of life coordination Perth"_.
- Use free & Premium digital invitations (`$69 AUD incl. GST`) as a viral acquisition loop: every guest attending a Managevent-invited event experiences the platform firsthand.

### Stage 2: Automation & Customer Portal (Months 4–6)

- Launch `app.managevent.com.au` (`apps/portal`) so hosts can self-manage checklists, approve catering adjustments triggered by live RSVPs, and pay milestone invoices via Stripe AU (Card, Apple Pay, PayID, Afterpay).
- Expand owned high-margin styling inventory in Perth (arches, plinths, table linen, signage, cultural centrepieces).

### Stage 3: Vendor Marketplace & On-Site Tech (Months 7–12)

- Open `vendors.managevent.com.au` (`apps/vendors`) with automated ABN Lookup validation and Stripe Connect Express split payouts.
- Deploy Crew mobile check-in mode (`apps/mobile`) and venue door kiosks (`apps/desktop-win`) for 200+ guest galas and weddings.
- Replicate the playbook to Sydney and Melbourne.
