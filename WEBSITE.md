# WEBSITE.md: web specification

**Covers:** Part A, `www.managevent.com.au` (`apps/marketing`). Part B, `invitation.managevent.com.au` (`apps/invitation`). Part C, the rules that apply across both domains.
**Status:** v0.1 specification. Step 2 implements a deliberately minimal launch subset locally: `/`, `/fa`, `/privacy`, `/terms`, `/accessibility` and their FA equivalents, server-action enquiry, 404 and SEO metadata. Production deployment is pending provider access and verification. The Builder and all catalogue/price/review/venue pages remain unpublished; `/plan` returns 404 until real rates are approved. The remainder of this document is the future product specification.
**Read with:** `AGENTS.md`, `ARCHITECTURE.md`, `docs/design/DESIGN_SYSTEM.md`, `docs/design/MEMORIAL_MODE.md`, `packages/db/DATA_MODEL.md`, `content/README.md`.

Conventions used in this document:

- **Route paths are written for English.** The Farsi version of every public `www.` route is the same path prefixed with `/fa` (§A4).
- **Source tags:**
  - `[content]` means the data comes from the `content/` JSON or MDX files (and later a CMS).
  - `[api]` means it comes from `apps/api`.
  - `[static]` means it is in-code copy taken from `packages/i18n`.
- **Priorities:** **P0** is in the MVP and blocks launch. **P1** comes in the first 90 days after launch. **P2** is later.

---

# Part A: `www.managevent.com.au`

## A1. Goals

| Goal                                                | Measure (targets set by founder)                            |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Turn Perth visitors into qualified enquiries        | Enquiry and consultation bookings per 1,000 sessions        |
| Make the 0-to-100 offer tangible                    | Ceremony Builder starts → completed estimates → leads       |
| Rank for "[ceremony] + Perth" searches in EN and FA | Organic sessions on `/perth/*` pages, plus top-10 positions |
| Feed the invitation product                         | Clicks from `www.` → `invitation.` Host Studio sign-ups     |
| Recruit vendors (phase 2)                           | Applications from `/vendors/join`                           |

## A2. Audiences and their main journeys

| Audience                                      | Arrives via                            | Main journey                                                                     |
| --------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| Couple planning a wedding or Aghd             | Google, Instagram, word of mouth       | Home → Ceremony page → Builder → estimate → book a consultation                  |
| Persian-Australian family (FA-first)          | Farsi social posts, community groups   | `/fa` home → Persian ceremonies → Builder in FA → WhatsApp or phone enquiry      |
| Parent planning a kids' or milestone birthday | Google "birthday party packages Perth" | City page → package detail → add-ons → book                                      |
| Grieving family arranging a memorial or wake  | Google, a funeral director's referral  | `/perth/celebration-of-life` (Memorial Mode) → gentle enquiry form or phone call |
| Corporate EA or office manager                | Google, LinkedIn                       | Corporate page → quote request, B2B subscription interest                        |
| Host who only wants invitations               | Social, "digital invitation Perth"     | Invitations page → `invitation.` Host Studio                                     |
| Vendor                                        | Outreach, search                       | `/vendors` → `/vendors/join` → `vendors.` onboarding                             |

## A3. Sitemap and routes

| Route                                                                                                                | Page                                                                                           | Priority   | Data                  | Notes                                                                                 |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- | --------------------- | ------------------------------------------------------------------------------------- |
| `/`                                                                                                                  | Home                                                                                           | P0         | content               | §A6.1                                                                                 |
| `/ceremonies`                                                                                                        | All ceremony types hub                                                                         | P0         | content               | Grouped into the 4 families (§A6.2)                                                   |
| `/ceremonies/[slug]`                                                                                                 | Ceremony detail (for example `wedding`, `sofreh-aghd`, `celebration-of-life`)                  | P0         | content               | City-neutral version. Canonical for non-local intent.                                 |
| `/packages`                                                                                                          | Packages catalogue                                                                             | P0         | content, later api    | Filter by ceremony, guest count and budget                                            |
| `/packages/[slug]`                                                                                                   | Package detail                                                                                 | P0         | content, later api    | Includes, add-ons, "from" price incl. GST                                             |
| `/plan`                                                                                                              | **Ceremony Builder and Cost Estimator**                                                        | P0         | api (`/v1/builder/*`) | §A6.4. This is the signature feature.                                                 |
| `/plan/ai`                                                                                                           | AI Event Planner                                                                               | P1         | api (`/v1/ai/plan`)   | §A6.5                                                                                 |
| `/plan/estimate/[id]`                                                                                                | Saved or shared estimate                                                                       | P0         | api                   | Unlisted (`noindex`). Can be sent to a partner.                                       |
| `/venues`                                                                                                            | Venue catalogue (Perth)                                                                        | P0         | content, later api    | Map plus list                                                                         |
| `/venues/[slug]`                                                                                                     | Venue detail                                                                                   | P0         | content, later api    | Capacity, setups, rules (curfew, BYO, noise)                                          |
| `/services`                                                                                                          | Services hub                                                                                   | P0         | content               | Styling, catering, hire, entertainment, photo and video, florals, cakes, staffing, AV |
| `/services/[slug]`                                                                                                   | Service detail                                                                                 | P1         | content               |                                                                                       |
| `/hire`                                                                                                              | Equipment hire catalogue (chairs, arches, sofreh sets, linen, staging)                         | P1         | api (`inventory`)     | Availability by date (P2)                                                             |
| `/invitations`                                                                                                       | Digital invitations product page                                                               | P0         | static, content       | Hands off to `invitation.` (§A6.8)                                                    |
| `/gallery`                                                                                                           | Portfolio of real events                                                                       | P0         | content               | Filter by ceremony and venue. Real photos only, with consent.                         |
| `/stories`                                                                                                           | Testimonials and case studies                                                                  | P1         | content               |                                                                                       |
| `/how-it-works`                                                                                                      | The 0-to-100 process explained                                                                 | P0         | static                |                                                                                       |
| `/pricing`                                                                                                           | How pricing works (deposits, milestones, GST, refunds)                                         | P0         | static                | Mandatory consumer-law clarity                                                        |
| `/faq`                                                                                                               | FAQ                                                                                            | P0         | content               | FAQPage schema                                                                        |
| `/about`                                                                                                             | Story, team, "A product by Appilico"                                                           | P0         | content               |                                                                                       |
| `/contact`                                                                                                           | Enquiry form, phone, WhatsApp, studio address                                                  | P0         | api (`/v1/leads`)     | §A6.10                                                                                |
| `/book`                                                                                                              | Book a free consultation (calendar slots)                                                      | P0         | api                   | P0 can embed a booking link. A native booking flow is P1.                             |
| `/corporate`                                                                                                         | Corporate events and B2B subscriptions                                                         | P1         | static, content       |                                                                                       |
| `/memorials`                                                                                                         | Memorials, celebrations of life and wakes hub                                                  | P0         | content               | **Memorial Mode** for the whole subtree                                               |
| `/vendors`                                                                                                           | Become a partner (marketing)                                                                   | P1         | static                |                                                                                       |
| `/vendors/join`                                                                                                      | Hand-off to `vendors.managevent.com.au/signup`                                                 | P1         | —                     |                                                                                       |
| `/journal`                                                                                                           | Blog and guides                                                                                | P1         | content (MDX)         | For example "Sofreh Aghd checklist", "Council hall hire in Perth"                     |
| `/journal/[slug]`                                                                                                    | Article                                                                                        | P1         | content               |                                                                                       |
| `/[city]`                                                                                                            | City landing (`perth` live; `sydney`, `melbourne`, `brisbane`, `adelaide`, `gold-coast` gated) | P0 (perth) | content               | §A7                                                                                   |
| `/[city]/[ceremony-slug]`                                                                                            | Programmatic local SEO page                                                                    | P0 (perth) | content               | §A7                                                                                   |
| `/[city]/venues/[area]`                                                                                              | Venues by area (for example `/perth/venues/swan-valley`)                                       | P1         | content               |                                                                                       |
| `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/refunds`, `/legal/vendor-terms`, `/legal/acceptable-use` | Legal pages                                                                                    | P0         | content (MDX)         | Drafts need legal review (see `docs/compliance`)                                      |
| `/accessibility`                                                                                                     | Accessibility statement                                                                        | P0         | static                |                                                                                       |
| `/sitemap.xml`, `/robots.txt`                                                                                        | Generated                                                                                      | P0         | —                     | Gated cities excluded until live                                                      |
| `/not-found`                                                                                                         | 404 page                                                                                       | P0         | static                | Offers Builder and contact links                                                      |

Redirects: `managevent.com.au/*` returns 301 to `www.`. The legacy Appilico invitation paths `/anniversary/*` and `/e/*` on `appilico.com.au` keep working through rewrites (see §B6.4).

## A4. Locales and URLs

- Supported locales: `en-AU` (default, no URL prefix) and `fa-IR` (`/fa` prefix). Later locales (`ar`, `zh`, `hi`) are enabled through `packages/i18n` config and use the prefixes `/ar`, `/zh`, `/hi`.
- `<html lang dir>` is set on the server for each locale. `fa` and `ar` use `dir="rtl"`.
- `hreflang` alternates go on every page, plus `x-default` pointing to EN.
- The language switcher keeps the current path and query. The choice lives in the URL, and a cookie is used only to _suggest_ a locale on the first visit. Never redirect automatically by `Accept-Language` (it harms SEO and annoys bilingual users). Show a dismissible banner instead: "این صفحه به فارسی هم هست".
- Slugs stay in English in every locale, which keeps routing simple. Page content, `<title>`, meta and Open Graph are all translated.
- **Numbers:** Farsi UI shows Persian digits (۱۲۳) for display copy, but **prices and phone numbers stay in Latin digits** with an LTR isolate (`<bdi>`) so they cannot be misread. This matches the existing Appilico behaviour.
- **Dates:** Gregorian by default. Farsi pages also show the Jalali date in brackets for ceremony dates, via the `packages/i18n` formatter.

## A5. Global layout

**Header (sticky on scroll-up only):**

- The wordmark, linking to home.
- Primary navigation: Ceremonies (mega menu grouped by the 4 families), Packages, Venues, Invitations, How it works, Journal (P1).
- Utility links: a language switch (EN / فارسی), "Sign in" (to `app.`), and the main button **"Plan my ceremony"** (to `/plan`).
- On mobile, the menu is a full-height sheet. The "Plan my ceremony" button and a WhatsApp button stay visible in a bottom bar.

**Footer:**

- Ceremonies by family, Perth areas served, company links (About, Careers P2, Vendors, Contact), legal pages, and social links.
- ABN placeholder, "A product by Appilico", and an Acknowledgement of Country. Final wording is to be approved; see `docs/business/BRAND_VOICE.md`.

**Contact surfaces:** phone (`tel:`), WhatsApp (`wa.me` with a prefilled message in the active locale), and email. Show business hours in Perth time.

**Experience mode:** the layout reads `experienceMode` (`celebration` | `memorial`) from route metadata. Under `/memorials/*`, `/ceremonies/{funeral|memorial|celebration-of-life|wake}` and their city equivalents, Memorial Mode applies: the palette switches, celebratory imagery and motion are removed, the main button changes to "Talk to us" and opens a gentle enquiry, and promotional banners are hidden.

## A6. Page specifications

### A6.1 Home `/`

**Job:** show in about 5 seconds that we can run _any_ ceremony end to end in Perth, then get the visitor into the Builder or an enquiry.

Sections, in order:

1. **Hero: "From 0 to 100."**
   - The signature moment is an interactive **ceremony dial**. The visitor taps a ceremony type (Wedding, Sofreh Aghd, Birthday, Gala, Celebration of Life, …) and the hero image, the headline and a short "what we handle" list change to match.
   - The main button is "Plan my ceremony", which opens `/plan` with the type preselected. The secondary button is "See packages".
   - **Motion:** a single orchestrated transition on selection. Respect `prefers-reduced-motion`.
   - The _Celebration of Life_ option previews Memorial Mode. Its tile is visually calm.
2. **What 0-to-100 means:** a horizontal sequence of real stages: Idea → Plan → Venue → Style → Invite → Host → Pack-down. This is a genuine sequence, so numbered markers are appropriate here.
3. **Ceremony families:**
   - Four entry points: Celebrations and milestones; Cultural and religious; Corporate and community; Solemn and life tributes.
   - Each lists 4–6 ceremonies.
   - The cultural block leads with Persian ceremonies in EN and FA.
4. **The invitation bridge:** a short demo showing an invitation RSVP count updating a catering estimate. It links to `/invitations`. This is the core hook, explained visually.
5. **Perth venues strip** `[content]`: Swan Valley, Kings Park and Matilda Bay setups, Fremantle heritage, council halls, backyard marquees. Links to `/venues`.
6. **Featured packages** `[content]`: three packages with "from $X incl. GST".
7. **Proof:** testimonials and real-event gallery items `[content]`. Hide the section until real ones exist; never show fake reviews (Australian Consumer Law).
8. **How it works:** consult → proposal → deposit → planning → event day → after.
9. **FAQ teaser:** 4 questions.
10. **Closing call to action:** consultation booking, WhatsApp and phone.

### A6.2 Ceremonies hub `/ceremonies` and detail `/ceremonies/[slug]`

The **hub** groups ceremonies into families, each card showing a short description, a "from" price and Memorial Mode where relevant.

The **detail page template** (content model `Ceremony`, §A8):

- **Hero:** ceremony name, a one-line promise, and the main button "Plan this ceremony" (opens `/plan?type=slug`).
- **What we handle:** a checklist built from the `includes[]` service categories.
- **Cultural notes block** (cultural ceremonies only): for example, the elements of a Sofreh Aghd (mirror and candelabra, sugar cones, honey, sweets, the needle and thread tradition). Write respectfully, reviewed by a community member. Fully bilingual.
- **Typical timeline:** a run-sheet preview built from `timelineTemplate[]`.
- **Packages for this ceremony** `[content/api]`.
- **Suggested Perth venues:** filtered by `suitableFor` and capacity.
- **Gallery:** real events tagged with this ceremony.
- **FAQ:** specific to the ceremony.
- **Related ceremonies.**
- **Enquiry box.**

Initial ceremony slugs (all P0 as content stubs; copy is filled in progressively):

- **Celebrations:** `wedding`, `engagement`, `proposal`, `birthday-kids`, `birthday-milestone`, `anniversary`, `surprise-party`, `baby-shower`, `gender-reveal`, `graduation`
- **Cultural:** `sofreh-aghd`, `baleh-boroon`, `nowruz`, `shab-e-yalda`, `mehmooni`, `arabic-wedding`, `south-asian-wedding`, `mehndi`, `chinese-tea-ceremony`, `faith-ceremony`
- **Corporate:** `gala-dinner`, `product-launch`, `end-of-year-party`, `community-hall-event`
- **Solemn:** `funeral-coordination`, `memorial-service`, `celebration-of-life`, `wake`

### A6.3 Packages `/packages` and `/packages/[slug]`

- **Filters:** ceremony type, guest count band (≤30, 31–80, 81–150, 151–300, 300+), budget band, and indoor or outdoor.
- **Package card:** name, the ceremony types it suits, guest range, "from $X incl. GST", and the 3 headline inclusions.
- **Detail page:**
  - Full inclusions grouped by category, optional add-ons with prices, and what is _not_ included.
  - The deposit and payment schedule summary, from `docs/business/PRICING_MODEL.md`.
  - The main button is "Customise in Builder", which opens `/plan?package=slug`.
- Prices are always **GST-inclusive** and labelled "incl. GST". A "from" price must be achievable at the stated minimum guest count. These are consumer-law requirements.

### A6.4 Ceremony Builder and Cost Estimator `/plan` (signature, P0)

**Purpose:** a visitor configures their ceremony from 0 to 100 and sees a live estimate range, then converts to a lead or a deposit.

**Steps.** These are a real sequence, so a stepper is appropriate. State is saved in the URL and on the server.

1. **Ceremony:** type, plus any sub-events (for example Aghd + reception), date or a flexible month, and Perth area.
2. **Guests:** adults and children. This can be set to "I'll use my invitation RSVPs later", which links to the bridge.
3. **Venue:** "I have one" (enter it), "Help me choose" (show suggestions), or one of the venue types: home or backyard, council hall, winery, park or reserve, restaurant, hotel or function centre.
4. **Style:** theme moodboards using the 5 luxury themes plus Memorial palettes, and a colour accent.
5. **Services:** toggle each category, with tiers per category.
   - Categories: styling and décor, catering, cake and sweets, florals, photo and video, entertainment (DJ, live music, MC), hire (furniture, tableware, marquee), staffing, AV and lighting, invitations, and the cultural elements set (for example a Sofreh).
   - Tiers: Essential, Signature, Luxe.
6. **Extras:** transport, accommodation blocks, kids' entertainment, live photo wall, and the digital wishing well.
7. **Summary:**
   - An estimate **range** (low to high, incl. GST), a breakdown by category, the assumptions, and a deposit preview.
   - Actions: **Book consultation**, **Save and email me**, **Pay deposit to hold the date** (P1), and **Share with partner** (link to `/plan/estimate/[id]`).

**Rules** (in `packages/pricing`, shared with `app.` and `admin.`):

- The estimate is `Σ(service tier price × quantity driver) + venue estimate + staffing + travel zone fee`, shown as a range with ±% bands per category.
- **Quantity drivers:** per guest (catering, chairs), per table (centrepieces, linen), per hour (staff, DJ), and fixed (styling base).
- Travel zones come from the Perth CBD: metro, outer metro (Joondalup, Rockingham, Armadale, Mundaring), and regional (quote only).
- Show "Indicative only. A final quote follows a consultation."
- Every estimate is stored (`BuilderSession` → `Estimate`) with the price-list version, so it can be reproduced later.

**Lead capture:**

- The visitor can see the range without entering details. Saving, emailing or booking requires name, email and phone, plus marketing consent as a separate, unticked checkbox (Spam Act).
- The lead goes to the CRM through `/v1/leads` with `source=builder` and the estimate id attached.

**AI assist (P1):** a "Describe your dream ceremony" text box calls the AI Ceremony Architect, which pre-fills the steps. The visitor can review everything before continuing.

**Memorial variant:**

- Steps are renamed: Service, Gathering, Place, Tribute style, Support services.
- Extras that do not fit are hidden.
- The tone changes: "We'll take care of the details so your family can be together."
- No upsell badges.

**Acceptance criteria:**

- The Builder can be completed with keyboard only and in RTL.
- Refreshing the page or switching locale keeps the state.
- The estimate matches `packages/pricing` unit-test fixtures.
- The page works on a 360px-wide screen.
- p75 INP stays below 200ms while toggling services.

### A6.5 AI Event Planner `/plan/ai` (P1)

- **Input:** event type, date, guest count, budget, vibe or tone, language, and must-haves.
- **Output** (structured): the timeline (T-minus milestones), a budget split by category, a vendor checklist, an invitation wording draft (the copywriter), and the day-of run-sheet skeleton. Every output can be edited and exported to a Builder session.
- **Guardrails:**
  - AI output is clearly labelled.
  - The planner never states availability or exact prices as fact. Prices always come from `packages/pricing`.
  - Memorial prompts use the dedicated tone (ARCHITECTURE §12).
  - Anonymous visitors are rate-limited.

### A6.6 Venues `/venues`, `/venues/[slug]`

- **List:** a list and map toggle. Filters: area, venue type, capacity (seated and standing), indoor or outdoor, BYO allowed, curfew, kitchen available, accessible.
- **Detail:** gallery, capacities by layout (banquet, rounds, cocktail, theatre), facilities, rules (noise or curfew, BYO, decoration limits, insurance requirement), suitable ceremonies, packages here, a map, and "Check date and get a quote".
- **Launch placeholders** in `content/locations/perth/venues.json`. All are `PLACEHOLDER` until confirmed with the venue; never imply a partnership that doesn't exist.
  - Swan Valley winery (garden ceremony, barrel-room reception)
  - Kings Park setting (outdoor ceremony; permit required from the managing authority)
  - Matilda Bay foreshore (sunset ceremony; permit required)
  - Fremantle heritage warehouse or hall
  - Community halls in the City of Joondalup, City of Canning and City of Melville (council booking; $20M public liability usually required)
  - Luxury backyard marquee (private home; neighbour and noise considerations)
  - CBD or riverside function centre (corporate)

### A6.7 Services `/services`, Hire `/hire`

- Each service page includes what we do, tiers, sample inclusions, gallery, related packages, and an enquiry button.
- **Hire catalogue (P1):** items with photos, dimensions and price per unit per day. In P2, items can be added to a Builder session and availability is checked against `inventory` by date.

### A6.8 Invitations product page `/invitations`

- **Hero:** a live demo invitation (a seeded, `noindex` demo event on `invitation.`) shown on a phone mock-up with the gate animation.
- **Feature walkthrough:** the envelope reveal, bilingual EN/FA, RSVP with dietary requirements, QR entry pass, live photo wall, wishing well or tribute book, and WhatsApp sharing.
- **Comparison:** Free invitation vs Premium Event Pass, as a table that pulls entitlements from `packages/payments` plan config.
- **The bridge:** "Your RSVPs size your catering automatically when Managevent runs your event."
- The main button is "Create your invitation", linking to `invitation.managevent.com.au/studio/new` (with SSO).

### A6.9 Memorials hub `/memorials` (Memorial Mode)

- **Tone:** calm, plain and warm. Use no superlatives.
- **Content:** how we help (venue, catering for the wake, tribute displays, slideshow, live-stream coordination (P2), tribute book and invitation), working alongside funeral directors, and the cultural and religious observances we accommodate.
- **Contact:** a gentle enquiry form with fewer fields and optional details, plus "Call us" shown prominently.
- **Do not show:** countdowns, "book now" urgency, discounts or confetti.
- **Scope note** (see OPEN_DECISIONS D-09): Managevent coordinates memorial gatherings and does **not** provide regulated funeral-director services such as care of the deceased.

### A6.10 Contact `/contact`, Book `/book`

- **Enquiry form:** name, email, phone, ceremony type, date or "not sure", guest estimate, Perth area, message, preferred contact channel (phone, email or WhatsApp), preferred language (EN or FA), and marketing consent (unticked).
- **Protection:** server-side Zod validation, a honeypot field, and rate limiting. Use privacy-friendly bot protection; do not use any CAPTCHA that sends PII offshore without disclosure.
- **On submit:** `POST /v1/leads`, which sends an auto-reply email in the chosen locale and a CRM notification to planners. Store UTM and source.
- **Book (P0):**
  - P0 shows the consultation types (phone 15 min, video 30 min, studio visit 45 min) and opens a booking link.
  - The native slot picker against planner calendars is P1.

## A7. Programmatic local SEO

**Route patterns:**

- `/[city]`
- `/[city]/[ceremony-slug]`
- `/[city]/venues/[area]` (P1)
- `/[city]/[service-slug]` (P2, for example `/perth/sofreh-hire`)

**Launch matrix (Perth, P0):** every ceremony slug in §A6.2, plus these commercial aliases, each mapped to a ceremony and package filter:

- `/perth/weddings`
- `/perth/persian-aghd` (canonical slug `sofreh-aghd`; the alias returns 301 to `/perth/sofreh-aghd`, or the reverse; pick one and record the choice in `content/routes.json`)
- `/perth/birthday-party-packages`
- `/perth/kids-party-packages`
- `/perth/engagement-parties`
- `/perth/corporate-events`
- `/perth/community-hall-events`
- `/perth/celebration-of-life`
- `/perth/wake-catering`

**Cities:** Perth is live at launch. Sydney and Melbourne are next. Brisbane, Adelaide and the Gold Coast come later. City pages are **gated** by `content/locations/[city]/city.json → status: "live" | "waitlist" | "hidden"`:

| Status     | What happens                                             |
| ---------- | -------------------------------------------------------- |
| `hidden`   | 404                                                      |
| `waitlist` | A `noindex` "Coming to Sydney" page with a waitlist form |
| `live`     | Indexable                                                |

**Thin-content guard:**

- A `/[city]/[ceremony]` page is only indexable if it has at least 3 local content blocks (local venues, local gallery items, local FAQ or a local price note) and ≥300 words of unique copy.
- Otherwise it renders with `noindex` and a canonical to `/ceremonies/[slug]`.
- A build-time check fails CI if an indexable page is under the threshold.

**Page template:**

1. H1 "[Ceremony] in [City]".
2. Local intro.
3. Packages with a city price note.
4. Venues in the city filtered by suitability.
5. Local gallery.
6. Process.
7. Local FAQ.
8. Nearby areas served (Perth list: Joondalup, Wanneroo, Stirling, Perth CBD, Fremantle, Cockburn, Canning, Melville, Swan and the Swan Valley, Armadale, Rockingham, Mandurah (outer), Kalamunda and the Perth Hills).
9. An enquiry form.

**Structured data:**

- `LocalBusiness` (or `EventPlanner` where valid) with an `areaServed` city, plus `Service` with an `offers` price range in AUD.
- `BreadcrumbList` and `FAQPage`.
- Do not mark up fake `AggregateRating`. Ratings appear only when they come from real, verifiable reviews.

## A8. Content model (`content/`, later a CMS)

Schemas live in `content/schemas/*.schema.json`, and the matching Zod mirrors live in `packages/validators/content`. Every entity has `id`, `slug`, `status` (`draft` | `published` | `placeholder`), `locales.{en,fa}` (translated fields) and `updatedAt`.

| Entity        | Key fields                                                                                                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Ceremony`    | `family`, `experienceMode`, `name`, `summary`, `culturalNotes?`, `includes[]` (service category ids), `timelineTemplate[]` ({`offsetMinutes`, `label`}), `faq[]`, `heroImage`, `seo` ({`title`, `description`}), `relatedSlugs[]`                                                          |
| `Package`     | `ceremonySlugs[]`, `guestMin`, `guestMax`, `fromPriceIncGstCents`, `inclusions[]` ({`category`, `label`, `qtyRule`}), `addOns[]`, `exclusions[]`, `depositRule`, `tier`                                                                                                                    |
| `Venue`       | `area`, `type`, `capacity` ({`banquet`, `rounds`, `cocktail`, `theatre`}), `indoorOutdoor`, `rules` ({`curfew`, `byo`, `noiseNotes`, `insuranceRequiredCents`, `decorationLimits`}), `facilities[]`, `accessible`, `geo` ({`lat`, `lng`}), `suitableFor[]`, `partnerStatus` (`placeholder` | `prospect`      | `partner`), `images[]` |
| `Service`     | `category`, `tiers[]` ({`name`, `priceRule`, `inclusions[]`}), `images[]`                                                                                                                                                                                                                  |
| `Testimonial` | `ceremonySlug`, `venueSlug?`, `quote`, `author` (first name plus suburb), `consentRecordId`, `date`, `verified` (bool). **Only `verified: true` items can be published.**                                                                                                                  |
| `GalleryItem` | `image`, `alt` (EN and FA), `ceremonySlug`, `venueSlug?`, `city`, `consentRecordId`, `credit`                                                                                                                                                                                              |
| `FAQ`         | `question`, `answer`, `scope` (`global`                                                                                                                                                                                                                                                    | `ceremony:slug` | `city:slug`)           |
| `City`        | `status`, `name`, `areasServed[]`, `travelZones`, `localIntro`, `seo`                                                                                                                                                                                                                      |
| `Article`     | MDX with frontmatter: `title`, `excerpt`, `cover`, `ceremonySlugs[]`, `city?`, `author`, `publishedAt`                                                                                                                                                                                     |

Image rules:

- Use AVIF or WebP from R2. Alt text is required in both locales.
- Faces of guests appear only with a consent record.
- Placeholder imagery must be licensed stock and tagged `placeholder: true`.

## A9. Design direction (`www.`)

The tokens are owned by `packages/ui` and fully specified in `docs/design/DESIGN_SYSTEM.md`. A summary of what is binding:

- **Celebration palette:**
  - Warm Ivory `#FAF7F2` (surface)
  - Champagne Gold `#C5A059` (accent; contrast on ivory is only 2.3:1, so on light surfaces it is **decorative only**: rules, ornaments, arch frames and icons paired with a text label. Gold _text_ is allowed only on Burgundy (5.3:1) or Charcoal (7.2:1).)
  - Deep Burgundy `#5C1A24` (primary actions, headings)
  - Rich Charcoal `#18181B` (body text)
- **Memorial palette:**
  - Soft Alabaster `#F8F9FA`
  - Muted Slate `#64748B` (secondary text; 4.5:1 on alabaster, which only just passes, so never use it on a tinted surface)
  - Warm Bronze `#8C7A6B` (accent; 3.9:1, so large text, icons and borders only, never button labels)
  - Deep Ink `#1E293B` (body text, primary actions)
- **Type:**
  - Cormorant Garamond for display and headings. Playfair Display is a fallback only and is never mixed on the same page.
  - Plus Jakarta Sans for the UI.
  - Vazirmatn for Farsi, used for both UI and headings. A decorative Persian display face is allowed only for invitation names (§B4).
  - One serif and one sans per page.
- **Distinctiveness.** The palette sits close to the generic "luxury cream and serif" look, so distinctiveness must come from **structure**, not colour:
  - The **arch** motif from the Appilico invitations (a thin gold arch that frames hero media).
  - A **sofreh-inspired layered layout**, where content panels overlap like laid cloths.
  - The ceremony dial in the hero.
- **Avoid:** tracked-out all-caps eyebrows, one italicised word in a headline, identical rounded cards with the same shadow, decorative numbering on non-sequences, and fade-up animation on every section.
- **Motion:** one orchestrated moment per page (the hero dial on home, the step transition in the Builder). Everything else responds to the visitor's actions.
- **Copy voice:** warm, specific and plain. Use sentence case. Buttons say exactly what happens ("Book a consultation", "Save my estimate"). The full guide is `docs/business/BRAND_VOICE.md`.

## A10. Technical SEO and metadata

- Use the Next.js Metadata API for each route: title template `%s | Managevent Perth`, a description of 150–160 characters, a canonical URL, `hreflang`, and Open Graph and Twitter cards.
- Open Graph images are generated per page with the brand frame, and FA variants are rendered in RTL.
- `sitemap.xml` is split by locale and type. It excludes `noindex`, gated-city and estimate pages.
- `robots.txt` allows all and points to the sitemap. Staging and preview environments are `noindex` with basic auth.
- Mark up with JSON-LD as described in §A7, plus `Organization` (with `parentOrganization: Appilico`) and `WebSite` with a `SearchAction` (P2).
- Set up Google Business Profile for Perth (a business task, tracked in `docs/business/GO_TO_MARKET_PERTH.md`).

## A11. Analytics and consent

- Use privacy-friendly analytics whose data region is compatible with ADR-0008. No marketing pixels fire before consent.
- The cookie banner offers Necessary, Analytics and Marketing as separate choices. Non-essential cookies are off by default.
- **Conversion events:** `builder_started`, `builder_step_completed{step}`, `estimate_viewed`, `estimate_saved`, `lead_submitted{source}`, `consult_booked`, `whatsapp_clicked`, `phone_clicked`, `invitation_cta_clicked`, `vendor_apply_clicked`.
- **Never** put PII in analytics events or URLs.

## A12. Lead pipeline

1. A form, the Builder or WhatsApp creates a lead: `POST /v1/leads` (Zod `LeadCreate`).
2. The API stores the `Lead`, sends an auto-reply (Resend) and notifies planners (email plus `admin.` inbox, and push in P1).
3. The SLA is a first response within 1 business hour, Perth time, as shown in the `admin.` CRM.
4. Lead stages run Lead → Qualified → Proposal sent → Deposit paid (Booked) → Planning → Delivered → Reviewed.

## A13. Budgets and quality gates (`www.`)

- **Lighthouse (mobile):** Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100 on home, a ceremony page, `/plan` and a city page.
- **Size:** JS ≤ 170 KB gzip on initial load for content pages. The Builder can lazy-load its step modules.
- **Fonts:** self-hosted and subset (Latin plus Arabic script for Vazirmatn), with `font-display: swap`. Preload the display face only.
- **Tests:**
  - Playwright covers: home → Builder → estimate → lead; FA RTL snapshots; Memorial Mode routes have no celebration tokens.
  - An axe scan runs on every page template.

## A14. MVP slice for `www.` (launch checklist)

- [ ] Global layout with EN and FA, the language switch and Memorial Mode
- [ ] Home, ceremonies hub, 8 fully written ceremony pages (wedding, sofreh-aghd, birthday-milestone, birthday-kids, engagement, gala-dinner, celebration-of-life, community-hall-event), with stubs for the rest
- [ ] 6 packages, `/packages` and the detail page
- [ ] `/plan` Builder with estimate, save and lead capture (no online deposit yet)
- [ ] Venues list and detail with ≥ 8 Perth placeholders, clearly labelled
- [ ] `/invitations` page linking to `invitation.`
- [ ] Perth city page plus the 9 alias pages that pass the thin-content guard
- [ ] Contact and book, FAQ, how it works, pricing, about, legal pages (reviewed), and the accessibility statement
- [ ] Sitemap, robots, JSON-LD, Open Graph images, analytics with consent

---

# Part B: `invitation.managevent.com.au`

This merges `appilico-invitations` (multi-tenant studio, themes, dashboard, RSVP, pricing) with `anniversary-invitation` (a polished static guest experience, permanent hashed links, bilingual RTL, in-app browser hardening). The AI Studio prototype contributes the gate reveal, view modes and the AI assistant. See `apps/invitation/MIGRATION.md`.

## B1. Goals

- A host can create, personalise and send a beautiful bilingual invitation in **under 15 minutes**.
- A guest can open the invitation inside WhatsApp or Instagram on a mid-range phone and RSVP in **under 60 seconds**.
- RSVP data (headcount, adults and children, dietary needs) flows into `app.` for the logistics bridge.
- Guest pages are private by default.

## B2. Route map

| Route                                      | Who             | Purpose                                                                                                            | Index     |
| ------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| `/`                                        | Public          | Short product intro, linking to `www./invitations` and `/studio/new`                                               | `index`   |
| `/templates`                               | Public          | Template gallery with live previews of demo events                                                                 | `index`   |
| `/templates/[templateSlug]`                | Public          | Full-screen demo of one template                                                                                   | `noindex` |
| `/studio`                                  | Host (auth)     | My invitations list                                                                                                | `noindex` |
| `/studio/new`                              | Host            | Create flow (§B3)                                                                                                  | `noindex` |
| `/studio/[eventId]`                        | Host or co-host | Studio home: overview, stats, checklist                                                                            | `noindex` |
| `/studio/[eventId]/design`                 | Host            | Template, theme, typography, music, cover media, gate style                                                        | `noindex` |
| `/studio/[eventId]/content`                | Host            | Wording (AI assistant), story, schedule or sub-events, venue, dress code, FAQ                                      | `noindex` |
| `/studio/[eventId]/guests`                 | Host            | Guest list, parties, import (CSV or XLSX, UTF-8 BOM, Farsi names), tags, tables                                    | `noindex` |
| `/studio/[eventId]/share`                  | Host            | Share studio: links, QR codes, WhatsApp, SMS, email, scheduling                                                    | `noindex` |
| `/studio/[eventId]/responses`              | Host            | RSVPs, dietary breakdown, song requests, exports                                                                   | `noindex` |
| `/studio/[eventId]/wall`                   | Host            | Photo wall moderation                                                                                              | `noindex` |
| `/studio/[eventId]/well`                   | Host            | Wishing well or tribute book entries                                                                               | `noindex` |
| `/studio/[eventId]/settings`               | Host            | Privacy (PIN), RSVP deadline, languages, co-hosts, plan and upgrade                                                | `noindex` |
| `/i/[eventSlug]`                           | Guest           | Event-level public link, if the host enables an "open invitation" (asks for a name, then joins or creates a party) | `noindex` |
| `/i/[eventSlug]/[guestToken]`              | Guest           | **Personal invitation micro-site** (§B5)                                                                           | `noindex` |
| `/i/[eventSlug]/[guestToken]/pass`         | Guest           | QR entry pass (also delivered as Apple or Google Wallet in P2)                                                     | `noindex` |
| `/i/[eventSlug]/[guestToken]/wall`         | Guest           | Live photo wall (view and upload)                                                                                  | `noindex` |
| `/i/[eventSlug]/[guestToken]/well`         | Guest           | Wishing well or tribute book                                                                                       | `noindex` |
| `/i/[eventSlug]/[guestToken]/calendar.ics` | Guest           | Calendar file                                                                                                      | `noindex` |
| `/display/[eventId]/[displayToken]`        | Venue screen    | Projector view of the wall or slideshow (used by the Windows controller or any browser)                            | `noindex` |
| `/legacy/...`                              | Guest           | Read-only compatibility for imported Appilico links (§B6.4)                                                        | `noindex` |

`noindex, nofollow, noarchive` is sent as both an **HTTP header and a meta tag** on every route except `/` and `/templates`. `robots.txt` disallows `/i/`, `/studio/`, `/display/` and `/legacy/`.

## B3. Host Studio: the create flow (`/studio/new`)

1. **Event basics:**
   - Ceremony type: the same list as `www.`. It sets `experienceMode` automatically, and memorial types switch the whole studio to Memorial Mode.
   - Title, date and time, time zone (default `Australia/Perth`), and multi-part events (for example Aghd at 4pm and reception at 7pm, each with its own venue).
   - Languages: EN, FA or both, and which is the default for guests.
2. **Template:** pick from the gallery (§B4), filtered by ceremony type. Previews are live, using the host's own details.
3. **Wording with the AI assistant:**
   - Inputs are tone (poetic, formal, casual, Persian classical, Persian modern, or memorial-respectful), the names, and the key details.
   - It generates headline, invitation text, story paragraphs and a schedule, in EN and FA as parallel versions rather than a literal translation.
   - The host edits every field. Never auto-publish AI text.
4. **Personalise:**
   - Cover photo or video, gate style (wax seal, ribbon, gate or arch, or a plain fade in Memorial Mode), and background music (§B11).
   - Colour accent within the theme's allowed range.
5. **Guests:** add manually, import CSV or XLSX, or paste from contacts on mobile. Guests are grouped into **parties** (a family or couple). Each party gets a party link, and individual links can be issued too (the Appilico model).
6. **RSVP settings:** the deadline, which questions to ask (§B7), plus-one rules, and children allowed (yes, no or count).
7. **Preview** as a specific guest, in both languages, on a phone frame.
8. **Publish:** the invitation goes live and links are generated. Send now or schedule.

Autosave runs on every field. Drafts are private. Co-hosts can be invited by email with the roles `editor` or `viewer`.

## B4. Templates and themes

A **template** is layout plus motion: the structure of the gate and the order of sections. A **theme** is tokens: colours, typography, ornaments and the default gate style. They combine freely, subject to compatibility flags.

Themes at launch, ported from `appilico-invitations/src/lib/themes.ts` and re-expressed as `packages/ui` theme tokens:

| Theme id             | Name                              | Mode        | Notes                                                                        |
| -------------------- | --------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `royal-ivory`        | Royal Ivory & Gold Burgundy       | celebration | The house style, matching the brand palette                                  |
| `midnight-celestial` | Midnight Celestial & Rose Gold    | celebration | Night indigo with constellation arches                                       |
| `emerald-botanic`    | Emerald Botanic Garden            | celebration | Emerald with antique gold foliage                                            |
| `persian-azure`      | Persian Azure & Isfahan Turquoise | celebration | Tilework and sandstone. Default for Persian ceremonies.                      |
| `alabaster-platinum` | Minimalist Alabaster & Platinum   | celebration | Modern monochrome                                                            |
| `memorial-alabaster` | Alabaster & Bronze                | memorial    | **Default for memorial events.** Calm, with no ornaments beyond a fine rule. |
| `memorial-slate`     | Slate & Linen                     | memorial    | Muted, photo-forward                                                         |

The theme token schema in `packages/ui/themes` contains:

- `colors` (bg, bgWarm, surface, ink, inkMuted, accent, accentInk, rule)
- `fonts` (display, body, faDisplay, faBody)
- `ornaments` (arch, florals, tile, none)
- `gate` (sealColor, ribbonColor, style)
- `motion` (`full` | `gentle` | `none`)
- `mode` (`celebration` | `memorial`)

**Compatibility rule:** memorial events can only choose themes where `mode = memorial`, and celebration events cannot choose memorial themes. This is enforced in the validators.

The Farsi display face for names is configurable per theme (as in `anniversary-invitation`'s `--font-fa-display`). It must have a licence that permits web embedding.

## B5. Guest micro-site: `/i/[eventSlug]/[guestToken]`

### B5.1 First paint (server-rendered, no JavaScript required)

The core details render on the server and show even with JavaScript blocked:

- The greeting by name in the guest's language ("Dear Sara & family" / «سارا جان و خانواده‌ی عزیز»)
- The event title, date and time (in the event's time zone, with the Jalali date shown in FA)
- The venue name and address
- An RSVP link
- An "Add to calendar" link

The `.ics` file is embedded or linked on the server, not generated in JavaScript. This is a lesson from `anniversary-invitation`.

### B5.2 Gate / envelope reveal

- **Before opening:** a full-screen closed envelope or gate, styled by the theme, shows "Tap to open" and the guest's name.
- **On tap:** one Framer Motion sequence of about 1.6s plays (the seal breaks, the flap opens, the card rises).
  - Background music starts **only now**, triggered by the tap to satisfy browser autoplay policy, at volume ≤ 0.6 with a 2s fade-in.
  - A persistent mute toggle is visible from this point.
- **`prefers-reduced-motion`:** a 200ms crossfade, with music still tap-to-play.
- **Memorial Mode:** no seal-break animation. There is a gentle fade, "Open" is the label, and music is off by default (the host can choose a soft piece, which still plays only on tap).
- **Repeat visits:** the gate is skipped (a `?opened=1` URL parameter is set after opening; no storage dependency). There is a "Replay" option in the menu.

### B5.3 View modes (a segmented control under the header)

1. **Story** (default): a cinematic, scrolling narrative. Sections appear in this order:
   1. Hero: names and date, inside the arch frame
   2. Invitation text
   3. Countdown. Celebration mode says "days to go". In Memorial Mode this is replaced by a plain date and time.
   4. Our story or the life story
   5. Schedule
   6. Venue with a map
   7. Dress code
   8. Gallery
   9. FAQ
   10. RSVP
   11. Wishing well or tribute book
   12. Footer
2. **Timeline:** the schedule and sub-events as a vertical timeline, each with its own venue, map, time and calendar button. This suits multi-part Persian weddings.
3. **Gallery:** a memory photo grid with a lightbox, plus host-curated albums. If enabled, the live wall appears as a tab here.

The menu gives access to the language switch (EN / فارسی, full RTL mirroring, kept in the URL with `?lang=`), mute, add to calendar, directions, view my pass, and "Share" (only if the host allows forwarding).

### B5.4 Section behaviour

- **Countdown:**
  - Computed against the event's time zone.
  - It shows the date and time in the server-rendered HTML first, then turns into live ticking after hydration, so there is no hydration mismatch.
  - After the event it changes to "Thank you for celebrating with us" or, in Memorial Mode, "Thank you for being with us".
- **Maps:**
  - The static map image is rendered on the server.
  - Directions open Google Maps, or Apple Maps on iOS.
  - The map embed is lazy-loaded and only loads after the guest taps.
- **Gallery:** R2 images with blurhash placeholders. Images are lazy-loaded and the first 6 are prioritised.
- **FAQ:** parking, kids, gifts and accessibility are written by the host, and the AI can suggest answers.

## B6. Guest links and tokens

### B6.1 Format

`/i/{eventSlug}/{guestToken}`

- **`eventSlug`:** human-readable, chosen at publish, unique, and from the 31-character safe alphabet plus hyphens. Example: `sara-ali-aghd-7kq`.
- **`guestToken`:** `{readableName}-{suffix}`, for example `sara-family-g9qtmt`.
  - The suffix is 6+ characters from the **31-character alphabet** (no `0 1 i l o`), derived from HMAC-SHA256(`GUEST_TOKEN_PEPPER`, `event.salt` + `party.stableId`).
  - Use 8 characters for events with more than 2,000 links.

### B6.2 Permanence rules (inherited and strengthened)

- A token depends on `party.stableId` (immutable, assigned at creation), **not** on name spelling or list position. Fixing a typo in a name therefore **never** breaks a sent link. This is an improvement on the legacy behaviour.
- Reordering, adding or removing other guests never changes an existing token.
- The host can **revoke** a link (it returns 410 Gone with a polite message) and **reissue** it with a new suffix.

### B6.3 Privacy

- Unknown tokens return a real 404 with a neutral page that does not reveal whether the event exists.
- Per-IP rate limits apply on `/i/*` to block enumeration.
- **PIN protection (Premium):** a 4–6 digit event PIN, entered once per device. It is stored in an HttpOnly cookie scoped to the event path.
- No analytics scripts run on guest pages. Only first-party, cookieless, aggregated open and RSVP counters are used. There are no third-party requests except the map tiles loaded after a tap, and fonts are self-hosted.
- Open Graph:
  - A title and image are generated for each event. The image is the host-chosen cover, shown in WhatsApp link previews.
  - **The guest's name is never included in the OG image or description,** because previews can be forwarded.

### B6.4 Legacy compatibility

Imported Appilico events keep their old URLs (for example `appilico.com.au/anniversary/armita-party-g9qtmt`):

- The rewrite on `appilico.com.au` points to `invitation.managevent.com.au/legacy/anniversary/armita-party-g9qtmt`.
- That path resolves through a `LegacySlug` table to the new token and serves the page in place, with no visible redirect, so OG previews keep working.
- The legacy committed salt is retired. Imported tokens are stored as data, not recomputed. See OPEN_DECISIONS D-12.

## B7. RSVP

**Form fields.** The host toggles each one. Required fields are marked.

| Field                   | Type                                                                                                                                                                      | Notes                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Attending               | Yes / No / Maybe (Maybe is off by default)                                                                                                                                | Required. One answer per person in the party, or per party.                                          |
| Party members           | A list prefilled from the guest list, with a toggle for each person                                                                                                       | Lets families answer for each member                                                                 |
| Adults / children count | Integers within the host's limits                                                                                                                                         | Required if children are allowed                                                                     |
| Plus-ones               | Name, plus a dietary field for each                                                                                                                                       | Only if the host allows it, with a per-party limit                                                   |
| Dietary requirements    | Multi-select for each person: Halal, Vegetarian, Vegan, Gluten-free, Dairy-free, Nut allergy, Shellfish allergy, Other allergy (text), plus a severity flag for allergies | **Health data.** Encrypted, used only for catering. Consent wording is shown.                        |
| Accessibility needs     | Optional text                                                                                                                                                             | Shared only with planners and the venue as needed                                                    |
| Song request            | Optional text, up to 3                                                                                                                                                    | Hidden in Memorial Mode, where it can be replaced by "A song that reminds you of them" (host option) |
| Message to hosts        | Optional text                                                                                                                                                             | Private to the hosts                                                                                 |
| Contact for updates     | Phone or email, optional                                                                                                                                                  | For day-of updates. Consent recorded.                                                                |

**Rules:**

- Guests can edit their RSVP until the deadline. After the deadline the form is read-only and shows a "Contact the host" link.
- **On submit:** `POST /v1/rsvp` (token-authenticated) → confirmation screen (in the event's tone) → QR pass shown if enabled → "Add to calendar".
- **Validation:** Zod, shared between client and server. The submit is idempotent (`Idempotency-Key` header).
- **Offline or poor connection:** if the POST fails, the form keeps its state and retries. Never lose a guest's answers.
- **Every change** writes an `EventHeadcount` snapshot and enqueues `headcount.changed` (ARCHITECTURE §6).
- **Host view:** totals (yes, no, pending), adults and children, a dietary breakdown with a separate count for each allergen, song requests, a CSV or XLSX export (UTF-8 BOM so Farsi names display correctly in Excel), and filters by party, tag, table and status.

## B8. QR pass and check-in

- After a "Yes" RSVP, each attending person (or the party) gets a pass at `/pass`. It shows the name, event, date, table (if assigned) and a QR code.
- **QR payload:** a signed compact token (`passId` + event + signature). It contains **no PII**.
- The pass can be saved as an image. Apple and Google Wallet passes are P2.
- **Scanning** happens in `apps/mobile` (crew mode) or the Windows kiosk:
  - It works offline (ARCHITECTURE §11).
  - The scan result shows the name, party size, table, dietary flags and an "already checked in" warning.
- Hosts can see live arrivals in `app.` and in the Studio responses tab.

## B9. Digital wishing well and tribute book

- **Celebration events: wishing well.**
  - MVP (D-05 option a): shows the host's own PayID, bank details or a gift-registry link, with an optional message to the couple. **No money flows through Managevent.**
  - P2: possibly Stripe Connect for hosts, pending legal review.
  - Messages are private to the hosts, or shown on the wall if the guest opts in.
- **Memorial events: tribute book.**
  - Guests leave a message and can add a photo or a short memory.
  - Entries are moderated before anything is public.
  - The family can export the book as a PDF keepsake (P1).
  - There is no money feature unless the family adds a charity donation link (an external URL only).

## B10. Live guest photo wall

- Guests upload photos (and short video in P2) from their personal link. Uploads are linked to the token, rate-limited, stripped of EXIF location data and resized by the worker.
- **Moderation:** in the host's default, every upload needs approval. Auto-approve is a host option for celebration events and is never available for memorial events.
- Approved items appear on:
  - the wall tab, in realtime
  - the `/display/...` projector view (fullscreen, a slow crossfade every 6s, with a QR code inviting guests to upload)
  - the Windows Live Display Controller
- **Retention:** downloadable by the host as a zip, and deleted 12 months after the event unless the host extends (privacy policy).

## B11. Music and media

- Hosts choose from the **licensed library** (royalty-free tracks we hold licences for, tagged by mood and mode) or **upload their own**. Uploading their own requires ticking a box confirming they hold the rights or that the track is royalty-free.
- Commercial recordings cannot be embedded from streaming services. Note to agents: a background track on a public web page is a public communication of the recording, so do not add features that pull commercial tracks.
- **Playback:**
  - Plays only after the tap. Fades in. Loops with a crossfade.
  - Pauses when the tab is hidden.
  - The mute state persists through the URL parameter `?muted=1`, never storage.
- **Audio files:** AAC or Opus at ≤ 128 kbps, 90s maximum, with loudness normalised in the worker.

## B12. Calendar, maps and multi-part events

- Every sub-event has its own `.ics` VEVENT. The "Add all" option exports a multi-event `.ics`. Google Calendar deep links are offered as an alternative.
- The time zone is always `TZID=` the event's IANA zone.
- Venue data comes from the shared `Venue` entity when the event is a Managevent event, or is free text plus coordinates for self-serve invitations.

## B13. Sending and sharing (Share Studio)

| Channel                                                                | Free     | Premium | Notes                                                                                                                      |
| ---------------------------------------------------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Copy link and QR (PNG)                                                 | ✓        | ✓       | Party and individual links                                                                                                 |
| WhatsApp click-to-send (`wa.me` with a prefilled personalised message) | ✓        | ✓       | Opens on the host's own phone; no sending cost                                                                             |
| Bulk WhatsApp via approved templates (Twilio)                          | —        | ✓       | Template approval is required. Opt-out handling is included.                                                               |
| Bulk SMS (Twilio, sender `Managevent`)                                 | —        | ✓       | Spam Act consent attestation by the host and an unsubscribe in every message (see `docs/compliance/MESSAGING_SPAM_ACT.md`) |
| Email invitations (Resend)                                             | ✓ (≤ 50) | ✓       | Includes the `.ics` attachment                                                                                             |
| Scheduled send and RSVP reminders                                      | —        | ✓       | Reminders go only to pending guests, at most 2                                                                             |
| Printable QR place cards and welcome board (PDF)                       | —        | ✓       | Also available from the Windows app                                                                                        |

Message templates are bilingual, with `{guestName}`, `{eventTitle}`, `{link}` and `{rsvpBy}` variables. Previews are shown before sending, and a send log is kept.

## B14. Plans and entitlements

Plan config lives in `packages/payments/plans`. **Prices are placeholders** for the founder to confirm.

| Entitlement                   | Free                              | Premium Event Pass (one-off per event, AUD incl. GST, price TBC) | Included in a Managevent agency package |
| ----------------------------- | --------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| Guests and links              | up to 30                          | unlimited                                                        | unlimited                               |
| Templates and themes          | 2 classic and the memorial themes | all, plus premium animations                                     | all                                     |
| Languages EN + FA             | ✓                                 | ✓                                                                | ✓                                       |
| RSVP and dietary requirements | ✓                                 | ✓                                                                | ✓                                       |
| Custom event slug             | —                                 | ✓                                                                | ✓                                       |
| Background music              | library (2 tracks)                | full library and upload                                          | ✓                                       |
| Gate animation styles         | 1                                 | all                                                              | all                                     |
| QR passes and check-in        | —                                 | ✓                                                                | ✓                                       |
| Live photo wall and display   | —                                 | ✓                                                                | ✓                                       |
| Wishing well or tribute book  | ✓ (basic)                         | ✓ (with export)                                                  | ✓                                       |
| SMS and WhatsApp bulk sending | —                                 | ✓ (credits)                                                      | ✓ (credits)                             |
| PIN protection                | —                                 | ✓                                                                | ✓                                       |
| Remove "Made with Managevent" | —                                 | ✓                                                                | ✓                                       |
| Logistics bridge to `app.`    | Prompt to upgrade or enquire      | Prompt to enquire                                                | **Automatic**                           |

Memorial invitations: the founder should consider making the Premium features free for memorial events. This is recorded as a business decision in `docs/business/PRICING_MODEL.md`.

## B15. The logistics bridge (seen from `invitation.`)

- If the event is linked to a Managevent `Order`, the Studio responses tab shows **"Your catering is set for 120. 132 guests have confirmed. Update in your portal."** with a deep link to `app.managevent.com.au/events/[id]/orders?apply=rec_…`.
- If the event is self-serve, a soft prompt appears: "Need catering, a cake or seating for 132 guests? Get a quote from Managevent." This creates a lead with the headcount and dietary breakdown attached, which requires the host's explicit consent to share.
- This prompt **never** appears to guests, and never appears in Memorial Mode unless the host turns it on.

## B16. In-app browser and device hardening

These lessons come from `anniversary-invitation`. The checks in this section are mandatory.

- Never depend on `localStorage` or `sessionStorage`. WhatsApp, Instagram and Facebook webviews can throw. Wrap any optional storage in try/catch, and prefer URL state.
- Do not use `Intl`-dependent formatting during SSR or hydration. Use the deterministic formatters from `packages/i18n`.
- Make sure links work in iOS Safari, Android Chrome, and the WhatsApp, Instagram and Facebook in-app browsers. Playwright projects for each of these must pass.
- Test at 320px width, at 200% text zoom and in landscape. Test on a slow 4G throttled profile with LCP below 2.5s.
- Make sure audio handles iOS silent-mode quirks and recovers after a phone call interruption.

## B17. Memorial Mode on `invitation.`

Memorial Mode is triggered by the ceremony type, and the host cannot switch it off by mistake.

- Memorial themes only, gentle motion, no confetti, no sparkles and no countdown ticking.
- Copy is respectful: "You are warmly invited to join us in remembering…".
- Song requests are swapped for "A song that reminds you of them" or hidden.
- The wishing well becomes the tribute book.
- Upsell prompts are hidden.
- The AI wording uses the memorial prompt only.
- Photo wall auto-approval is not available.

## B18. Acceptance criteria and MVP slice for `invitation.`

- [ ] Host can sign up or sign in (SSO with `www.` and `app.`), create an event, pick a template and theme, write or AI-generate EN and FA wording, add guests (manual and CSV), preview, publish, and copy WhatsApp links.
- [ ] The guest page renders the core details without JavaScript. The gate reveal works with music starting on tap, and the reduced-motion path works. Story, Timeline and Gallery views work. EN and FA switching keeps the URL state.
- [ ] RSVP with party members, adults and children, dietary needs per person, song requests and messages. Answers can be edited until the deadline and are idempotent.
- [ ] The host responses dashboard shows totals, the dietary breakdown, and CSV export with a UTF-8 BOM.
- [ ] The `headcount.changed` event is emitted, and a linked Order shows the recommendation (the bridge's end-to-end test).
- [ ] Privacy: `noindex` header and meta tag, 404 on unknown tokens, rate limits, no guest names in OG data, no third-party requests before the guest acts.
- [ ] Memorial Mode end-to-end on a demo memorial event.
- [ ] Legacy Appilico anniversary links resolve through `/legacy`.
- [ ] Playwright passes on the in-app browser profiles. The axe scan is clean.

---

# Part C: cross-domain rules

1. **Single sign-on:** a Better Auth session cookie on `.managevent.com.au`. Signing out on any subdomain signs out of all of them.
2. **Hand-offs between subdomains** carry intent through query parameters, never PII:
   - `www./plan` → `app./onboarding?estimate=est_…`
   - `www./invitations` → `invitation./studio/new?type=wedding`
   - `invitation.` responses → `app./events/…`
3. **Shared header language:** the same wordmark and type. `invitation.` guest pages carry **no** Managevent navigation chrome, only a small footer credit (removed on Premium).
4. **One design system:** both apps consume `packages/ui` tokens and themes. Never fork tokens inside an app.
5. **One i18n source:** `packages/i18n`, with namespaces `common`, `marketing`, `invitation`, `ceremonies` and `legal`.
6. **Content reuse:** ceremony names, the `experienceMode` mapping and venue data are shared entities. `invitation.` reads them through the API, never by duplicating them.
7. **Status and errors:** a friendly bilingual error page on both apps, with a reference id (no stack traces).

## Appendix: open content tasks for the founder

- The final logo and wordmark (D-11). Real photography of past events, with consent records. The real package prices and "from" prices.
- Venue partnership confirmations, to turn placeholders into partners.
- A Persian cultural-content review for Aghd, Baleh Boroon, Nowruz, Yalda and Mehmooni pages.
- The licensed music library (shortlist about 30 tracks: 20 celebration, 10 memorial).
- The Acknowledgement of Country wording, and legal review of terms, privacy and refunds.
