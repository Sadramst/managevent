# WEBSITE.md: web specification

**Covers:** Part A, `www.managevent.com.au` (`apps/marketing`, including the staff console at `/admin`). Part B, `invitation.managevent.com.au` (`apps/invitation`). Part C, the rules that apply across both.
**Read with:** [`AGENTS.md`](AGENTS.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md), [`docs/design/MEMORIAL_MODE.md`](docs/design/MEMORIAL_MODE.md), [`packages/db/DATA_MODEL.md`](packages/db/DATA_MODEL.md), [`content/README.md`](content/README.md). How each app is built and tested is in its README ([marketing](apps/marketing/README.md), [invitation](apps/invitation/README.md)). This file says what the sites contain and the rules they must keep.

**Status labels**

- **Built:** the route exists and runs against the real API and PostgreSQL locally. Nothing has been deployed from this branch yet ([`DEPLOYMENT.md`](DEPLOYMENT.md), OPS-01).
- **Planned (ID):** not built; the ID is the row in [`ROADMAP.md`](ROADMAP.md).
- **Not scheduled:** product intent with no ROADMAP row yet. Add a row before building it.

Both sites are English only (`en-AU`). All copy comes from `packages/i18n`. Section numbers are stable because code comments cite them; keep them when editing.

---

# Part A: `www.managevent.com.au`

## A1. Goals

| Goal                                         | Measure (targets set by the founder)                |
| -------------------------------------------- | --------------------------------------------------- |
| Turn Perth visitors into qualified enquiries | Enquiries per 1,000 sessions (needs MKT-14)         |
| Make the 0-to-100 offer tangible             | Estimator use, then enquiries                       |
| Rank for "[ceremony] + Perth" searches       | Organic sessions and positions (city pages: MKT-10) |
| Feed the invitation product                  | Clicks from `www.` to `invitation.`, host sign-ups  |

## A2. Audiences

Couples planning a wedding, parents planning a birthday, families arranging a memorial or wake (who must meet Memorial Mode and a gentle enquiry), corporate organisers, and hosts who only want invitations (sent to `invitation.`). Vendor recruitment waits for the vendor portal (VEN-01).

## A3. Routes

Public pages live in `apps/marketing/app/[locale]/`. Visitors never see a locale prefix (A4). `lib/site.ts` (`routes`, `sitemapPaths`) is the single list used by the header, footer and sitemap.

### Built

| Route                               | Page                                                                                                 | Data                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `/`                                 | Home (A6.1), including the estimator (A6.4) and the enquiry form (A6.10)                             | `content/`, i18n, plan figures from `packages/payments` |
| `/ceremonies`                       | Ceremony hub                                                                                         | `content/ceremonies`                                    |
| `/ceremonies/[slug]`                | One page per file in `content/ceremonies`: ten today (A6.2)                                          | `content/ceremonies`                                    |
| `/services`                         | What we handle, one page with anchors (including `#hire`)                                            | i18n                                                    |
| `/invitations`                      | The invitation product and the Free vs Premium table (A6.8)                                          | i18n, `packages/payments`                               |
| `/pricing`                          | How pricing works: invitation plans, agency quotes, deposits, GST                                    | i18n, `packages/payments`                               |
| `/how-it-works`                     | The process from first call to pack-down                                                             | i18n                                                    |
| `/venues`                           | Perth settings (A6.6)                                                                                | `content/locations/perth/venues.json`                   |
| `/memorials`                        | Memorials, celebrations of life and wakes, in Memorial Mode (A6.9)                                   | i18n                                                    |
| `/about`                            | Story and "A product by Appilico"                                                                    | i18n                                                    |
| `/contact`                          | Enquiry form, phone and email; accepts `?ceremony=` and `?venue=` prefills (A6.10)                   | `POST /v1/leads`                                        |
| `/faq`                              | FAQ with `FAQPage` structured data                                                                   | i18n                                                    |
| `/privacy`, `/terms`                | Legal drafts, labelled as drafts. Final versions need legal review (PRV-02)                          | i18n                                                    |
| `/accessibility`                    | Accessibility statement                                                                              | i18n                                                    |
| `/admin`, `/admin/leads/[leadId]`   | Staff console (A14)                                                                                  | `GET` and `PATCH /v1/leads`                             |
| `/admin/sign-in`, `/admin/sign-out` | Staff sign-in (password, then authenticator code) and sign-out                                       | Better Auth through `/api/auth/*`                       |
| `/api/auth/*`                       | Same-origin proxy to the API's Better Auth mount (Part C)                                            | —                                                       |
| `/sitemap.xml`, `/robots.txt`       | The sitemap lists the static pages and every ceremony page; robots disallows `/admin` and `/api/`    | —                                                       |
| Any other path                      | Branded 404 (the `[...document]` catch-all calls `notFound()`; unknown `/admin/*` paths do the same) | —                                                       |

**Redirects** (`next.config.ts`, permanent): `/plan`, `/plan/*` and `/estimator` → `/#estimator`; `/packages`, `/packages/*` and `/prices` → `/pricing`; `/book`, `/enquire`, `/enquiry` and `/contact-us` → `/contact`; `/hire` → `/services#hire`; `/legal` and `/legal/{privacy,terms,accessibility}` → the unprefixed legal pages; plus a few spelling aliases. Remove a redirect in the same PR that gives its path a real page (MKT-05 replaces `/packages`).

### Planned

| Route or feature                                      | Status                                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/packages`, `/packages/[slug]`                       | Planned (MKT-05), A6.3                                                                                         |
| `/perth`, `/perth/[ceremony]`, other cities           | Planned (MKT-10), A7. There is no city route today                                                             |
| Consent banner, analytics, conversion events          | Planned (MKT-14, PRV-03), A11                                                                                  |
| Refund, cookie and vendor-terms pages                 | Planned (PRV-02)                                                                                               |
| `/plan` Builder, `/plan/estimate/[id]`, `/plan/ai`    | Not scheduled (A6.4, A6.5)                                                                                     |
| `/venues/[slug]`, `/services/[slug]`                  | Not scheduled. Venue detail needs real partners (BIZ-07)                                                       |
| `/gallery`, `/stories`                                | Not scheduled. Needs real photography with consent (BIZ-08). Never show fake reviews (Australian Consumer Law) |
| `/journal`, `/corporate`, `/vendors`, `/vendors/join` | Not scheduled (vendor sign-up itself is VEN-01)                                                                |

## A4. Locales and URLs

- One locale ships: `en-AU`, with no URL prefix. `proxy.ts` rewrites `/x` to `/en/x` internally, redirects `/en/*` to the unprefixed path (308) and the retired Persian `/fa/*` URLs to the unprefixed path (301).
- A later locale is enabled by widening `EnabledLocaleSchema` (`packages/validators`) and adding its dictionary in `packages/i18n` (a `contract-change`). It must live in the URL, never only in storage or a cookie, and must never be chosen by an automatic `Accept-Language` redirect.
- Dates read day first (`23 October 2026`; `DD/MM/YYYY` where numeric) through the `packages/i18n` formatters, which do not depend on `Intl` during rendering.

## A5. Global layout

- The header, footer and mobile menu come from the brand shell in `packages/ui` (`@managevent/ui/brand`: `SiteHeader`, `SiteFooter`, `SiteMenu`), shared with `apps/invitation`.
- Contact details are staff settings: the footer, contact page, memorial page, legal pages and structured data read the email and phone from `GET /v1/site-settings` (`apps/marketing/lib/contact.ts`, refreshed at most every minute), and staff edit them at `/admin/settings`. The email defaults to `appilico.au@gmail.com`, the phone is blank, and a blank phone shows no phone link. `CONTACT_EMAIL` and `CONTACT_PHONE` are only first-run defaults and the fallback if the API is unreachable.
- **Experience mode:** pages derive it with `getExperienceMode()`. Memorial pages switch to the memorial palette, drop celebratory imagery and motion, use gentle wording, and show no promotional prompts.

## A6. Page notes

### A6.1 Home `/`

Sections in order, each an anchor: hero → `#occasions` (ceremony families) → `#services` → `#invitations` ("Create your invitation" goes to `invitation./templates`) → `#estimator` → `#venues` (Perth settings, each linking to `/?venue=<slug>#enquiry`) → `#process` → `#enquiry`. The page emits `Organization` structured data.

### A6.2 Ceremonies

The hub groups the ceremonies in `content/ceremonies`. The ten slugs today: `wedding`, `engagement`, `anniversary`, `birthday-milestone`, `baby-shower`, `cultural-celebration`, `gala-dinner`, `memorial-service`, `celebration-of-life`, `wake`. A detail page shows the promise, what we handle, a typical timeline, FAQ and an enquiry link with `?ceremony=<slug>`. Adding a ceremony is a content change validated by `pnpm validate:content`. `memorial-service`, `celebration-of-life` and `wake` render in Memorial Mode.

### A6.3 Packages (planned, MKT-05)

`/packages` and `/packages/[slug]` render every file in `content/packages` (two today), validated at build, listed in the sitemap and linked from `/pricing`. Prices are GST-inclusive, labelled "incl. GST", and a "from" price must be achievable at the stated minimum guest count. No prices appear until the rates are approved (DEC-01).

### A6.4 Estimator (built) and Ceremony Builder (not scheduled)

- **Built:** the home `#estimator` (`components/event-estimator.tsx`) gives an indicative range from ceremony, guest count and service choices. Its rates are placeholders marked `DECISION-NEEDED(pricing)`; DEC-01 replaces them with founder-approved figures or withdraws the estimator. It is labelled indicative, never states availability, and does not save estimates or create leads: the visitor continues to the enquiry form.
- **Not scheduled:** a multi-step Builder at `/plan` that saves estimates (`BuilderSession` → `Estimate` with the price-list version), shares them at `/plan/estimate/[id]` (`noindex`), and creates a lead with `source=BUILDER`. The estimate engine and price list exist in `packages/pricing` but no app uses them. If built: state in the URL and on the server, never in storage; keyboard-complete; a memorial variant with gentler step names and no upsells.

### A6.5 AI Event Planner (not scheduled)

A brief-to-timeline planner would call `packages/ai` through the API, label its output as AI, never state prices or availability as fact, and use the memorial tone for memorial events. The first AI feature is studio wording (INV-04).

### A6.6 Venues `/venues`

Eleven Perth settings from `content/locations/perth/venues.json`, all placeholders, not partners. Each card links to `/contact?venue=<slug>`; the form prefills a neutral, editable message for a known slug and ignores unknown values. The page makes no booking, availability or partnership claim (BIZ-07 covers real agreements).

### A6.7 Services `/services`

One page describing what we handle, with a `#hire` anchor. Detail pages and a hire catalogue with availability are not scheduled (hire inventory is ADM-05).

### A6.8 Invitations `/invitations`

Explains the invitation product, shows the Free vs Premium table from `packages/payments` plan config, and links to `invitation./templates` and `invitation./studio/new`. It promises only built features.

### A6.9 Memorials `/memorials`

Memorial Mode for the whole page: calm, plain and warm, no countdowns, urgency, discounts or confetti, and a prominent call option. Managevent coordinates memorial gatherings and does **not** provide regulated funeral-director services (OPEN_DECISIONS D-09).

### A6.10 Enquiry form (`/#enquiry` and `/contact`)

- **Fields:** name, email, phone (optional), ceremony, event date or "not sure yet", guest estimate, message, and marketing consent (unticked, separate). A hidden `websiteUrl` field is a honeypot and must stay empty.
- **Submit:** the server action `submitEnquiry` (`app/actions.ts`) validates with `LeadCreateSchema` and calls `POST /v1/leads` server-side with an `Idempotency-Key` and the visitor's address (Part C). It works without JavaScript. The API rate-limits it.
- **Consultation booking** (`/book`) is not scheduled; it redirects to `/contact`.

## A7. Programmatic local SEO (planned, MKT-10)

- **Routes:** `/[city]` and `/[city]/[ceremony-slug]`, from `content/locations/[city]/city.json` and `content/ceremonies`.
- **City gating** by `city.json` `status`. Today Perth is `live`; Sydney, Melbourne, Brisbane, Adelaide and the Gold Coast are `hidden`.

  | Status     | What happens                     |
  | ---------- | -------------------------------- |
  | `hidden`   | 404, and absent from the sitemap |
  | `waitlist` | A `noindex` "coming soon" page   |
  | `live`     | Indexable and in the sitemap     |

- **Thin-content guard:** a city page is indexable only with enough local content (local venues, FAQ or a price note, and a minimum word count agreed in the issue). Otherwise it renders `noindex` with a canonical to `/ceremonies/[slug]`. A CI step fails any indexable page below the threshold.
- **Structured data:** `Service` with an AUD price range, `BreadcrumbList`, `FAQPage`. Never an `AggregateRating` without real, verifiable reviews.

## A8. Content model

`content/` holds ceremonies, packages, cities and Perth venues, and testimonials, validated against `content/schemas` by `pnpm validate:content` (also in CI) and parsed at build by `lib/content.ts`. The fields are documented in [`content/README.md`](content/README.md) and the schemas. Rules: placeholders are labelled as placeholders; testimonials render only when `verified` with a consent record; guests' faces appear only with consent. A CMS is undecided (D-06, ADM-07).

## A9. Design

Binding rules (palettes, the contrast limits on gold and bronze, Cormorant Garamond with Plus Jakarta Sans, one orchestrated motion per page, no hex values in apps) are in [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md); voice is in [`docs/business/BRAND_VOICE.md`](docs/business/BRAND_VOICE.md). Fonts are self-hosted through `@fontsource`. Tailwind v4 reads the tokens through `@managevent/config/tailwind.css`.

## A10. Technical SEO

- Every page uses `pageMetadata()` (`lib/site.ts`): title `"<page> | Managevent Perth"`, a description, a canonical URL, `en-AU` and `x-default` alternates, and Open Graph with the generated `/opengraph-image`.
- Structured data (`lib/structured-data.ts`): `Organization` with a Perth `areaServed` and contact point, `BreadcrumbList`, `Service`, `FAQPage`.
- The sitemap excludes `/admin`, `/api/` and anything `noindex`.
- Google Business Profile is a business task (BIZ-09).

## A11. Analytics and consent (planned, MKT-14 and PRV-03)

Nothing is collected today: there is no analytics script and no cookie banner. When built: a provider whose data residency meets ADR-0008, no request before consent, separate Necessary, Analytics and Marketing choices with non-essential off by default, conversion events for enquiry submit and sign-up, and **never** personal information in events or URLs. Guest invitation pages stay free of analytics.

## A12. Lead pipeline

1. The enquiry form calls `POST /v1/leads` (Zod `LeadCreateSchema`). The API stores the `Lead` and a marketing-consent record, and enqueues `lead.created`.
2. The worker sends an auto-reply and alerts `LEAD_NOTIFICATION_EMAIL`, only when Resend is configured; otherwise it records `NOT_CONFIGURED` and sends nothing (OPS-02).
3. Staff work the enquiry in `/admin` (A14). Stages (`LeadStage`): `NEW` → `QUALIFIED` → `PROPOSAL_SENT` → `BOOKED`, or `LOST`. Proposals and deposit links are planned (ADM-02).

## A13. Quality gates (`www.`)

- Vitest beside the code; Playwright `test:e2e` (desktop and Pixel 7 against `tests/mock-api.mjs`, with axe) runs in CI; `test:e2e:real` runs the staff console against the real API and PostgreSQL.
- Targets from `AGENTS.md` §3: WCAG 2.2 AA; LCP < 2.5 s, INP < 200 ms and CLS < 0.1 on a mid-range Android over 4G. Lighthouse budgets in CI are not set up (not scheduled).

## A14. Staff console `/admin`

Built, with its own root layout in `app/admin` outside the locale tree. Details are in the [marketing README](apps/marketing/README.md#staff-console-admin).

- **Who:** `PLANNER_STAFF` and `SUPER_ADMIN`, always with TOTP. Accounts are created with the API's `staff:create` CLI; there is no sign-up, magic link or password reset here. A signed-in host who opens `/admin` is told the area is for staff.
- **What:** the enquiry inbox (stage tabs, search, paging) and the enquiry detail (contact, event details, consent, stage moves, notes, assign to me). Memorial enquiries are marked and render in Memorial Mode.
- **Never cached or indexed:** every `/admin/*` response is `private, no-store` and `noindex`.
- **Planned:** proposals (ADM-02), event command centre (ADM-03), vendor verification (ADM-04), hire inventory (ADM-05), finance (ADM-06), content editing (ADM-07), audit log and staff management (ADM-08). The 8-hour staff session is OPS-10.

---

# Part B: `invitation.managevent.com.au`

## B1. Goals

- A host can create, personalise and send an invitation in **under 15 minutes**.
- A guest can open it inside WhatsApp or Instagram on a mid-range phone and reply in **under 60 seconds**.
- RSVP numbers and dietary needs feed the logistics recommendations (ARCHITECTURE §6).
- Guest pages are private by default.

## B2. Routes

### Built

| Route                                                              | Who     | Purpose                                                                                                              |
| ------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                | Public  | Product intro and the sample invitations                                                                             |
| `/templates`                                                       | Public  | The six sample invitations, one per template, from `GET /v1/public/demos` (seeded by `seed:demo`)                    |
| `/pricing`                                                         | Public  | Free vs Premium Event Pass (`noindex`)                                                                               |
| `/sign-up`, `/sign-in`, `/sign-in/two-factor`, `/reset-password`   | Public  | Host accounts: email and password, optional TOTP. Magic link and password reset appear only when email is configured |
| `/unsubscribe`                                                     | Guest   | Email preferences, from the signed link in invitation emails                                                         |
| `/studio`                                                          | Host    | My invitations                                                                                                       |
| `/studio/new`                                                      | Host    | Template-first wizard (B3)                                                                                           |
| `/studio/[eventId]`                                                | Host    | Overview: status, counts, publish panel                                                                              |
| `/studio/[eventId]/design`                                         | Host    | Template, theme and gate style                                                                                       |
| `/studio/[eventId]/content`                                        | Host    | The "Details" tab: wording, hosts, story, schedule, venue, dress code, FAQ, cover and gallery image links            |
| `/studio/[eventId]/guests`                                         | Host    | Households and guests, search and filters, CSV import, recording a reply on a guest's behalf                         |
| `/studio/[eventId]/share`                                          | Host    | Personal links, WhatsApp, QR codes, turn off or reissue a link, email invitations                                    |
| `/studio/[eventId]/responses`                                      | Host    | Totals, deadline, latest replies, dietary breakdown, songs, messages, wishes moderation                              |
| `/studio/[eventId]/responses/export.csv`                           | Host    | CSV with a UTF-8 BOM; `?includeHealth=true` adds the dietary columns                                                 |
| `/studio/[eventId]/awaiting`                                       | Host    | Who has not replied, reminder text to copy, reminder emails (Premium)                                                |
| `/studio/[eventId]/settings`                                       | Host    | Reply deadline and questions, forwarding, link words, wishing well or tribute book, plan and upgrade                 |
| `/check-in/[eventId]`                                              | Host    | Door check-in (B8)                                                                                                   |
| `/i/[eventSlug]/[guestToken]`                                      | Guest   | Personal invitation (B5)                                                                                             |
| `/i/[eventSlug]/[guestToken]/pass`                                 | Guest   | QR door passes (B8)                                                                                                  |
| `/i/[eventSlug]/[guestToken]/calendar.ics`                         | Guest   | Calendar file (B12)                                                                                                  |
| `/legacy/...`, `/anniversary/[slug]`, `/e/[eventSlug]/[guestSlug]` | Guest   | Old links, resolved by the API and redirected to `/i/...` (B6.4)                                                     |
| `/api/auth/*`                                                      | Browser | Same-origin Better Auth proxy for the sign-in calls only (Part C)                                                    |

Every route under `/studio` and `/check-in` requires a signed-in host (`requireHost()` in `app/studio/layout.tsx` and the check-in page); a signed-out visitor is sent to `/sign-in?next=...`. An event the host may not read is a real 404.

**Indexing:** only `/` and `/templates` are indexable and in the sitemap. Every other route sends `X-Robots-Tag: noindex, nofollow, noarchive` (`next.config.ts`) and the robots meta tag (`privateMetadata()`). `robots.txt` disallows `/i/`, `/studio`, `/check-in/`, the sign-in pages, `/unsubscribe`, `/pricing`, `/legacy/`, `/anniversary/`, `/e/` and `/api/`.

### Planned

| Route or feature                                                                                                                                                                           | Status                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Uploads, `/studio/[eventId]/wall`, guest `/wall`, `/display/[eventId]/[displayToken]`                                                                                                      | Planned (INV-11), B10. Today images and music are HTTPS links the host pastes                                  |
| "Suggest wording" with AI in the Details tab                                                                                                                                               | Planned (INV-04)                                                                                               |
| XLSX export of responses                                                                                                                                                                   | Planned (INV-07); CSV is built                                                                                 |
| Bulk SMS and WhatsApp sending                                                                                                                                                              | Planned (INV-08), B13                                                                                          |
| Inviting co-hosts                                                                                                                                                                          | Planned (INV-17). The API already knows `OWNER`, `EDITOR` and `VIEWER` co-hosts; there is no way to invite one |
| Importing the Appilico anniversary event                                                                                                                                                   | Planned (INV-14); the legacy routes exist                                                                      |
| Invitation browser tests in CI, and WebKit                                                                                                                                                 | Planned (INV-18)                                                                                               |
| `/templates/[templateSlug]`, `/i/[eventSlug]` open invitation, Story/Timeline/Gallery view switch, PIN protection, Wallet passes, scheduled sending, printable place cards, a music picker | Not scheduled. `pinProtection` exists only as a plan entitlement flag                                          |

## B3. Host Studio

**Create (`/studio/new`).** Four steps: **template** (chosen with the occasion; the occasion sets Memorial Mode) → **basics** (title, hosts, honouree, date, start and end time, time zone defaulting to `Australia/Perth`, venue) → **guests** (up to 12 households; the Guests tab has no such limit) → **review**. The event starts as a `DRAFT` on the Free plan; memorial events get Premium free. A double tap creates one event because the client guards it; server-side idempotency for `POST /v1/events` is OPS-09.

**Occasions** (`INVITATION_OCCASION_SLUGS`): wedding, engagement, anniversary, birthday, baby shower, graduation, corporate event, cultural celebration, other celebration, memorial service, celebration of life, wake. The last three are memorial.

**Publish** needs a headline, hosts, a venue name and a future start (`422 PUBLISH_REQUIREMENTS_NOT_MET` lists what is missing). A host can preview a draft through a guest link; previews and sample invitations are read-only.

**Edits** carry `expectedUpdatedAt`; a stale write answers `409 STALE_WRITE`.

## B4. Templates and themes

A **template** is layout and default styling (`InvitationTemplateSlugEnum` in `packages/validators`). A **theme** is tokens: colours, display and body fonts, ornaments, gate, motion and mode (`INVITATION_THEMES` in `packages/ui`, `@managevent/ui/themes`).

| Kind      | Ids                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Templates | `royal-classic`, `modern-minimal`, `celestial-evening`, `botanic-garden`, `memorial-calm`, `memorial-linen`                                 |
| Themes    | Celebration: `royal-ivory`, `midnight-celestial`, `emerald-botanic`, `alabaster-platinum`. Memorial: `memorial-alabaster`, `memorial-slate` |
| Gates     | `wax-seal`, `ribbon`, `arch`, `plain-fade`                                                                                                  |

**Compatibility rule** (validators and API): memorial events use memorial themes only; celebration events cannot use memorial themes. Premium unlocks all themes and gate styles (`allThemesAndAnimations`, `allGateStyles`).

## B5. Guest micro-site `/i/[eventSlug]/[guestToken]`

The link is the credential: no sign-in, nothing cached, indexed or logged. The page receives only the guest-safe view (`GET /v1/i/{eventSlug}/{guestToken}`): this party only, with no token, salt, email, phone or internal id.

### B5.1 First paint

Who, when and where, the wording, schedule, questions, the reply anchor, and the calendar and maps links are plain server-rendered HTML that works with JavaScript off. The gate, countdown, music and forms are scripted extras (`.inv-js-only`).

### B5.2 Gate

One CSS sequence of about 1.6 s on tap, Enter or Space. Reduced motion and memorial events get a short fade labelled "Open". `?opened=1` skips it (no storage), and the gate control is a real link to that URL, so the page opens even if scripts never load.

### B5.3 Sections

Hero, wording, countdown (not in Memorial Mode), venue with a maps link, dress code, story, schedule, gallery, FAQ, reply, wishes. Sections the host left empty are not shown. A Story/Timeline/Gallery view switch is not scheduled.

### B5.4 Behaviour

- **Theme:** `GuestShell` maps the invitation theme onto the brand tokens; text colours are nudged where a pairing would miss WCAG AA (tested for all six themes).
- **Images** are the host's HTTPS links, lazy-loaded with `referrerPolicy="no-referrer"`. There is no image optimiser or upload yet (INV-11).
- **Open Graph:** event title and cover only. The guest's name is never in a title, description or image.
- **No third-party requests** before the guest acts: fonts are self-hosted, maps open externally, and guest pages carry no analytics.

## B6. Guest links and tokens

### B6.1 Format

`/i/{eventSlug}/{guestToken}`

- **`eventSlug`:** `{slug-of-title, up to 40 characters}-{4 random characters}` from the 31-character safe alphabet (`SAFE_TOKEN_ALPHABET`, no `0 1 i l o`). On Premium the host chooses the words (`customEventSlug`); a clash answers `409 SLUG_TAKEN`.
- **`guestToken`:** `{slug-of-household-name}-{8-character suffix}`. The suffix is HMAC-SHA256, keyed with `GUEST_TOKEN_PEPPER`, over the per-event salt (`Invitation.salt`) and the party's immutable `stableId`, plus `tokenVersion` after a reissue (`apps/api/src/lib/guest-tokens.ts`).

### B6.2 Permanence

- The token is stored when the party is created and never recomputed: renaming a household, fixing a typo or reordering the list never breaks a sent link.
- The host can **turn off** a link (410 Gone with a polite page) and **reissue** it with a new suffix.
- Changing `GUEST_TOKEN_PEPPER` in production breaks every link already sent.

### B6.3 Privacy

- A link is matched exactly against the stored token. Unknown → a real 404 that does not reveal whether the event exists; turned off → 410; over the rate limit → 429 with `Retry-After: 60` (`proxy.ts`, `lib/guest/gone-page.ts`).
- The API rate-limits guest reads and writes per IP and per link, and counts misses per IP to stop enumeration.
- Guest links are credentials: only callers with `guest:write` receive them, apps never log them, and Caddy redacts them from access logs.
- PIN protection is not scheduled.

### B6.4 Legacy links

Old Appilico links (`/anniversary/<slug>`, `/e/<event>/<guest>`, `/legacy/...`) are resolved through the `LegacySlug` table (`POST /v1/public/legacy/resolve`) and redirected to the matching `/i/...` link. The legacy committed salt is retired: imported tokens are stored as data, not recomputed (D-12). No legacy rows exist until INV-14 imports them.

## B7. RSVP

The host chooses the questions in Settings (`RsvpConfigSchema`): allow "maybe" (off by default), dietary needs, accessibility needs, song request (standard, memorial wording, or hidden; memorial events cannot use the standard prompt), message to the hosts, and contact for updates. What the host does not ask for is neither shown nor stored (`apps/api/src/modules/guest-site/minimise.ts`).

- **Per person:** attending yes, no or maybe, for each member of the household. Whether guest-added plus-ones count toward the Free plan's 30 guests is undecided (DEC-02).
- **Dietary, allergy and accessibility details are health information.** They need an unticked consent box whose exact wording is stored with the reply, are encrypted at field level, and are never sent back to the guest form (it offers "keep what is on file" or "change these details"). Deleting them 90 days after the event is PRV-01 and is not built.
- **Submit:** `POST /v1/i/{eventSlug}/{guestToken}/rsvp` with an `Idempotency-Key`; a retry of the same answers reuses the key. Guests can change their reply until the deadline; afterwards the form is replaced by what the hosts have (`RSVP_CLOSED`).
- **Every change** writes an `EventHeadcount` snapshot and enqueues `headcount.changed` (ARCHITECTURE §6). A host recording a reply in the Guests tab does the same.
- **Host view** (Responses): totals, adults and children, the dietary breakdown with each allergen counted separately, songs, messages, and the CSV export (health columns only on request).

## B8. QR passes and check-in

- After a "yes", each attending guest has a pass at `/pass`: name, event, date and a QR code drawn on the server. The payload is `MV1.{passId}.{signature}` and contains no personal information; it is printed under the code so a door that cannot scan can type it.
- Passes and check-in are a Premium entitlement (`qrPassesAndCheckin`; free for memorial events). On the Free plan the door page explains this (`FEATURE_NOT_IN_PLAN`).
- **Door check-in** (`/check-in/[eventId]`, a signed-in host): search and tap, camera scanning (`BarcodeDetector`, or the `jsqr` decoder where the browser has none), or the typed pass code. Results use colour, an icon and words, including "already checked in". The door sees allergy and dietary flags, never notes. A failed request says so and retries with the same `clientUuid`. The list refreshes every 20 seconds.
- Offline crew scanning on mobile and the Windows kiosk are planned (MOB-03, WIN-05). Apple and Google Wallet passes are not scheduled.

## B9. Wishing well and tribute book

- **Celebration events: wishing well.** The host can show their own PayID or bank details and a message (D-05 option a). **No money flows through Managevent.**
- **Memorial events: tribute book.** Guests leave a message; bank and registry details are refused.
- Guests post through `POST /v1/i/{eventSlug}/{guestToken}/wishes`. Every entry starts `PENDING`; the host approves or removes it in Responses.
- Export of the book is a Premium entitlement flag (`wellAndTributeExport`) with no export built (not scheduled).

## B10. Live photo wall (planned, INV-11)

Guests post photos from their link; uploads go to R2 through signed URLs (`packages/storage`, not used yet), are stripped of location data, and are approved by the host before showing on the wall and the `/display` screen. Auto-approval is never available for memorial events. Needs D-03 (realtime) and D-04 (media residency).

## B11. Music

The guest page plays music only after the gate is opened, with a mute control, when the invitation's music link is set and the host has attested the rights (`InvitationMusicSchema`). There is no music control in the studio yet; uploads and a licensed library come with INV-11. Never embed or pull commercial recordings from streaming services: a background track on a public page is a public communication of the recording ([`docs/compliance/MUSIC_LICENSING.md`](docs/compliance/MUSIC_LICENSING.md)).

## B12. Calendar and maps

`/calendar.ics` returns one `VEVENT` from `GET /v1/i/{eventSlug}/{guestToken}/calendar`, with no guest name; long lines are folded (`apps/api/src/modules/guest-site/ics.ts`). Maps open the venue address in the device's maps app. One `VEVENT` per schedule item is not scheduled.

## B13. Sharing

| Channel                                  | Free     | Premium   | Status                                                                                                               |
| ---------------------------------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| Copy link and QR code                    | ✓        | ✓         | Built                                                                                                                |
| WhatsApp click-to-send (`wa.me`)         | ✓        | ✓         | Built. Addresses the guest's number only for an Australian mobile; asks guests not to forward when forwarding is off |
| Email invitations (Resend)               | up to 50 | unlimited | Built; shown only when email is configured                                                                           |
| RSVP reminder emails                     | —        | ✓         | Built. Pending guests only, at most 2 per address, never before 8 am or after 8 pm in the event's time zone          |
| Bulk SMS and WhatsApp templates (Twilio) | —        | ✓         | Planned (INV-08, BIZ-05)                                                                                             |

Every email carries a signed unsubscribe link. Messaging follows [`docs/compliance/MESSAGING_SPAM_ACT.md`](docs/compliance/MESSAGING_SPAM_ACT.md).

## B14. Plans and entitlements

`packages/payments/src/plans.ts` is the source of truth; pages read it and never copy the numbers.

| Plan               | Price                                      | Guests    | Email invitations |
| ------------------ | ------------------------------------------ | --------- | ----------------- |
| Free Invitation    | $0                                         | 30        | 50                |
| Premium Event Pass | $69 incl. GST (6900 cents), once per event | unlimited | unlimited         |
| Agency             | Included in agency packages                | unlimited | unlimited         |

- **Memorial events get Premium free** (`getInvitationPlan(plan, "MEMORIAL")`).
- Premium adds all themes and gate styles, custom link words, reminder emails, QR passes and check-in, and removes the Managevent credit from the guest site, plus flags for features not built yet (photo wall, music uploads, bulk SMS and WhatsApp, PIN, book export). Only Agency has `automaticLogisticsBridge`.
- **Upgrade:** Stripe Checkout (`POST /v1/events/{eventId}/plan/checkout`), applied by the confirm call or the signed webhook, whichever arrives first. Without Stripe keys the studio shows the upgrade as unavailable and points to www `/contact`. Live Stripe has never been exercised (OPS-03); whether a pass purchase issues a tax invoice is undecided (DEC-03).

## B15. The logistics bridge from `invitation.`

Every RSVP produces a headcount snapshot and, through the worker, a versioned `RecommendationSet` (catering, cake, seating, hire, staffing). Nothing in `invitation.` shows recommendations yet: showing and applying them is planned in the customer portal (PRT-03, PRT-04) and the staff event view (ADM-03). A self-serve prompt to request a quote with the headcount is not scheduled; if built, it never appears to guests, and never in Memorial Mode unless the host turns it on.

## B16. In-app browser and device hardening

Mandatory, and covered by `tests/e2e/pages.spec.ts`:

- Never depend on `localStorage` or `sessionStorage`: WhatsApp, Instagram and Facebook webviews can throw. Keep state in the URL (`?opened=1`).
- No `Intl`-dependent formatting during SSR or hydration; use the deterministic formatters (`lib/dates.ts`, `packages/i18n`).
- Pages work at 390 px with no sideways scroll, and in the WhatsApp, Instagram and Facebook in-app browser profiles with storage refused. WebKit (iPhone Safari) is not tested yet (INV-18).

## B17. Memorial Mode on `invitation.`

Set by the occasion; the host cannot switch it off.

- Memorial templates and themes only; a gentle fade instead of the seal break; no arch or ornament; no countdown.
- Respectful wording; the song prompt is the memorial variant or hidden.
- The wishing well becomes the tribute book, with no bank details.
- No plan-limit or upgrade prompts (Premium is free).
- When the photo wall exists, auto-approval is never available (INV-11).

## B18. What is tested

`apps/invitation/tests/e2e` runs the whole product against the real API and PostgreSQL: sign-up, wizard, publish, details, guests and CSV, design and the Premium lock, share, a guest reply with dietary needs and consent, responses and CSV, wishes moderation, awaiting replies, check-in, a revoked link (410), another host's 404, and Memorial Mode end to end. Not covered in a browser: real email, Stripe Checkout, and a real camera scan. These tests do not run in CI yet (INV-18). The spec list is in the [invitation README](apps/invitation/README.md#browser-tests).

---

# Part C: cross-domain rules

1. **Sign-in.** Better Auth runs in `apps/api`. Each web app has a same-origin proxy at `/api/auth/*` that forwards only the sign-in calls. All other reads and writes happen server-side through `@managevent/api-client`, carrying the visitor's address with `API_PROXY_SECRET`. With `AUTH_COOKIE_DOMAIN=.managevent.com.au` the session cookie is shared by `www.` and `invitation.`.
2. **Hand-offs between subdomains** carry intent in the URL, never personal information: `www.` links to `invitation./templates` and `invitation./studio/new`; `invitation.` links back to www `/contact`, the legal pages and `/pricing`.
3. **One brand shell.** Both sites use `@managevent/ui/brand`. Guest invitation pages carry no site navigation and render in their invitation theme.
4. **One copy source.** `packages/i18n`, one module per area (for example `site-pages.ts`, `admin-pages.ts`, `invitation-shell.ts`, `invitation-studio-guests.ts`).
5. **One plan source.** Invitation prices and limits come from `packages/payments`.
6. **Errors.** Both apps have a friendly error page and a branded 404; no stack trace reaches a visitor.
7. **Honest capabilities.** `GET /v1/me` reports what the deployment can do (`magicLink`, `passwordReset`, `emailInvitations`, `stripeCheckout`). When a capability is off, the page says so plainly and offers the alternative.
