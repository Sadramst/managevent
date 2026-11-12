# @managevent/invitation

Invitations: `invitation.managevent.com.au` (local port `3001`).

The **Host Studio** (create an invitation, design, details, guests, share, responses, settings), the **guest micro-site** (`/i/{eventSlug}/{guestToken}`: gate, details, RSVP with dietary needs, pass, calendar) and **door check-in**. It is the same product as `www.managevent.com.au`: both use the brand shell in `packages/ui` (`@managevent/ui/brand` and `brand.css`).

English only (en-AU). Rules for working here are in [`AGENTS.md`](AGENTS.md); what is still to build is in [`ROADMAP.md`](../../ROADMAP.md) (INV-04, INV-07, INV-08, INV-11, INV-14, INV-17, INV-18).

## How it works

- **No data lives in this app.** Every read and write goes to `apps/api` through `@managevent/api-client`, server-side only (server components, server actions, route handlers). There is no in-memory store and no hard-coded sample data: the sample invitations come from `GET /v1/public/demos`.
- **The browser never calls the API.** The one exception is sign-in, which goes through the same-origin proxy `app/api/auth/[...all]/route.ts` so the session cookie is set on this origin. The proxy forwards only the calls the sign-in pages make (sign in, sign up, magic link, two-step codes, password reset, sign out, and the two emailed links) and answers 404 for anything else under `/api/auth/`. It never returns the session token (removed from JSON bodies; `set-auth-token` dropped), never emits CORS headers, does not forward an `authorization` header, accepts JSON only and refuses bodies over 16 KB. A redirect to Better Auth's own error page becomes `/sign-in?error=link`.
- **Who is signed in** comes from `GET /v1/me` (`lib/session.ts`), never from reading the cookie.
- **What the deployment can do** (`capabilities`: `magicLink`, `passwordReset`, `emailInvitations`, `stripeCheckout`) also comes from `GET /v1/me`. When a capability is off the page says so plainly and offers the alternative; it never pretends.

## Running locally

From the repo root:

```bash
pnpm db:local:detach                                    # PostgreSQL on 5432 (pnpm db:local:status to check)
pnpm db:migrate                                         # once, and after each new migration
pnpm with-env pnpm --filter @managevent/api dev         # API on http://localhost:4000
pnpm with-env pnpm --filter @managevent/api seed:demo   # the six sample invitations (safe to repeat)
pnpm with-env pnpm --filter @managevent/invitation dev  # this app on http://localhost:3001
```

The environment comes from the root `.env` (copied from `.env.example`); only `pnpm with-env` and the root scripts load it. For a production build: `pnpm with-env pnpm --filter @managevent/invitation build`, then `... start`.

Checks: `pnpm --filter @managevent/invitation typecheck lint test build`.

## Browser tests

`tests/e2e` (Playwright, projects `desktop` at 1440px and `mobile` as a Pixel 7) runs against the **real stack**: PostgreSQL, the API and a production build of this app. Nothing is mocked. Each spec signs up its own hosts and creates its own events with names unique to the run, so runs do not depend on each other and never reset the shared database.

```bash
# One shared secret for the API, this app and the test run (any 32+ characters):
export API_PROXY_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

pnpm db:local:detach
pnpm with-env pnpm --filter @managevent/api start          # or reuse one that is running
pnpm with-env pnpm --filter @managevent/api seed:demo      # once
pnpm with-env pnpm --filter @managevent/invitation build
pnpm with-env pnpm --filter @managevent/invitation start
PW_CHANNEL=chrome pnpm --filter @managevent/invitation test:e2e   # PW_CHANNEL: use an installed browser
```

This suite does not run in CI yet, and there is no WebKit project (INV-18).

- **`API_PROXY_SECRET` matters.** The API limits sign-ups (20 an hour), guest pages and "not found" answers per visitor address. Each test presents its own address (`tests/e2e/support/stack.ts`), and the API believes it only with the shared secret. Without the secret every test shares one address and a full run is refused part-way with "Too many attempts".
- **Other ports.** `E2E_BASE_URL` is this app (default `http://localhost:3001`); `E2E_API_URL` (or `API_URL`) is the API the specs call for set-up (default `http://localhost:4000`). This app's own `API_URL` must point at the same API. The API trusts `http://localhost:3001` and `NEXT_PUBLIC_INVITATION_URL` as origins, so keep the app on one of them.
- **`E2E_WEB_SERVER=1`** lets Playwright start the API and `next start` itself (after a build); servers that are already running are reused.

What each spec covers:

- `journey.spec.ts`: the whole product in order, all through the pages. Sign up, empty studio, wizard, publish refused then fixed, details, guests by hand and by CSV, design and the Premium lock, draft preview, publish, share (copy, WhatsApp, QR), a guest's reply with dietary needs and consent, responses and CSV, wishing well moderation, awaiting replies, door check-in on the free plan explaining Premium, a link turned off (410), sign out and in, another host's 404, and a celebration of life in Memorial Mode.
- `pages.spec.ts`: every public page and each of the six sample invitations answers 200 with one `h1`, no axe violations, no console errors and no sideways scroll at 390px; a guest page without JavaScript; unknown links are real 404s; the WhatsApp, Instagram and Facebook in-app browsers with storage refused.
- `public.spec.ts`: home, templates, pricing, email preferences, old links, sitemap and robots.
- `studio-host.spec.ts`: wizard validation, Design, Details (stale write), Settings, publish and unpublish, deleting an event.
- `studio-guests.spec.ts`: guest list, import, share, responses, awaiting replies and the door list (on a memorial event, where check-in is included).
- `guest.spec.ts`: the guest micro-site: themes, gate, reduced motion, reply rules, replies closed after the reply date, passes, calendar, 404 and 410.

- `resilience.spec.ts`: what must survive a failure and what must stay on the server. A dropped connection at the door and in the guest-list, reply and share dialogs; creating an invitation with two taps (one event, no false error); a session that ended; a host reloading a draft preview 32 times; the auth proxy (404 for everything but the sign-in calls, no CORS headers, no session token, 413 and 415); no guest email addresses in the Share and Awaiting pages; a partly answered household in Awaiting replies; a refused copy; the pass code on the pass and at the door; a reply refused because the invitation changed.

Not covered in a browser, because a local stack cannot do them: sending email (invitations, reminders, magic links, password reset), Stripe Checkout, and scanning a QR pass with a real camera (the typed pass code and the door list are tested instead; the JavaScript decoder is unit-tested against a generated pass in `components/check-in/qr-decode.test.ts`).

## Environment

| Variable                     | Used for                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `API_URL`                    | Where this server reaches the API. Default `http://localhost:4000`. Never sent to browsers |
| `API_PROXY_SECRET`           | Shared with the API so it believes the visitor IP this server forwards                     |
| `NEXT_PUBLIC_INVITATION_URL` | This site's public origin (absolute guest links, metadata)                                 |
| `NEXT_PUBLIC_MARKETING_URL`  | The www origin (header, footer, legal and contact links)                                   |

Defaults when unset: production `https://invitation.managevent.com.au` and `https://www.managevent.com.au`; otherwise `http://localhost:3001` and `http://localhost:3100`.

## Layout

```text
app/
  layout.tsx  globals.css  icon.svg     # root: fonts, brand.css, UI copy and toast providers; no chrome
  (site)/                               # public + sign-in pages inside the www header and footer
    page.tsx  templates/  pricing/  unsubscribe/
    sign-in/  sign-in/two-factor/  sign-up/  reset-password/
  studio/                               # Host Studio: layout requires a signed-in host, StudioShell chrome
    page.tsx  new/  [eventId]/{layout,loading,page,design,content,guests,share,responses,awaiting,settings}
  check-in/[eventId]/                   # door check-in (signed-in host)
  i/[eventSlug]/[guestToken]/           # guest micro-site: no site chrome, noindex
  legacy/  anniversary/  e/             # old links, resolved by the API
  api/auth/[...all]/route.ts            # same-origin auth proxy
  robots.ts  sitemap.ts  opengraph-image.tsx  not-found.tsx  error.tsx
proxy.ts                                # records the requested path for the sign-in redirect; guest 410s
components/
  ui/        # Field, Modal/Drawer, ConfirmDialog, Toast, Notice, EmptyState, StatTile, CopyButton,
             # Tabs, Badge, Spinner, Button, SubmitButton, Menu (built on brand.css classes).
             # Modal docks its action row, gives focus back to the control that opened it and
             # scrolls a new alert into view
  site/      # SiteChrome (header and footer), CurrentNav
  studio/    # StudioShell, StudioTabs, EventSwitcher
  auth/      # AuthPage, AuthForm, TwoFactorForm, ResetPasswordForm, PasswordField, SignOutButton
lib/
  server-api.ts     # getServerApi(): the API client for this request (cookie, user-agent, IP)
  session.ts        # getMe(), getMeOptional(), requireHost()
  action-result.ts  # ActionResult<T>, runAction(), toActionFailure(), fail(), ok()
  client-action.ts  # settle(): a server action call that reports a dropped connection as a
                    # NETWORK_ERROR result and a redirect as null (see components/ui/useSettle.ts)
  next-path.ts      # safeNextPath(), signInPath(): open-redirect-safe ?next=
  urls.ts           # routes, absoluteInviteUrl(), wwwLinks
  dates.ts          # formatting for the API's local wall-clock strings (no Intl)
  auth-client.ts    # browser calls to /api/auth/*
  metadata.ts       # NOINDEX, privateMetadata()
```

## Conventions

- **Copy** lives in `packages/i18n`, one module per area (`invitation-shell.ts` for the shell). Server components read it with `getInvitationShell("en")`; client components receive the strings they need as props, so the i18n package stays out of the browser bundle.
- **Styling** uses the brand shell classes (`.button`, `.field`, `.card`, `.tabs`, `.dialog` ...) and token utilities (`bg-surface`, `text-ink`, `rounded-card` ...). No palette utilities and no hex values. Logical properties only. Guest pages are the exception: they render in their invitation theme from `@managevent/ui/themes`.
- **Mutations** are server actions that return `ActionResult<T>` and call `revalidatePath`. See the example at the top of `lib/action-result.ts`.
- **Calling an action from the browser** always goes through `useSettle()` (`components/ui`) or `settle()` (`lib/client-action.ts`), never a bare `await action()`. A request that fails comes back as `{ ok: false, code: "NETWORK_ERROR" }` to show beside the form, with what was typed and any idempotency key kept; left uncaught inside `startTransition` it would replace the page with the error screen. An action that redirects (create, delete, or `requireHost()` after the session ended) comes back as `null`: leave the button busy and report nothing.
- **A screen receives only what it shows.** Guest contact details are personal information and a guest link is a credential, so pages build the narrowest view for each client component (`toLinkPartyView`, `toEmailPartyView` in `lib/guest-list/load.ts`); the full `PartyView` is for the Guests tab only.
- **Privacy:** everything except `/` and `/templates` is `noindex` (HTTP header in `next.config.ts` and the robots meta tag via `privateMetadata()`). Guest names never go into titles or Open Graph tags. Guest links are credentials: never log them. `next dev` logs neither server action arguments nor the request paths that carry a token (`unloggedRequests` in `next.config.ts`).
- **Not found is a real 404.** `notFound()` only sets the status if nothing has been sent yet, so there is no `loading.tsx` above a layout or page that can call it: the studio's loading state is `app/studio/[eventId]/loading.tsx`, below the event layout that asks the API for the event.
- **Images** supplied by hosts are plain `<img loading="lazy" referrerPolicy="no-referrer">`; there is no remote image optimiser.

## Guest micro-site (`/i/{eventSlug}/{guestToken}`)

What an invited household sees. The link is the credential: there is no sign-in, nothing is cached, indexed or logged, and the page receives only the guest-safe view from `guestSite.getView`.

```text
app/i/[eventSlug]/[guestToken]/
  page.tsx                 # the invitation (metadata: event title and cover only)
  pass/page.tsx            # door passes; each QR is drawn on the server from the signed payload,
                           # which is also printed under it as text for a door that cannot scan
  calendar.ics/route.ts    # "Add to calendar" as a text/calendar download
proxy.ts                   # GET /i/...: asks guestSite.getStatus (with the visitor's cookie, so a
                           # host's draft preview is not an "unknown link"); a revoked link answers 410
components/
  views/   # GuestInvitationPage (drop-in for a route), GuestInvitation, GuestShell, Ornaments,
           # Countdown, MusicControl, guest.css
  gate/    # Gate: the closed invitation (wax seal, ribbon, arch, plain fade)
  rsvp/    # RsvpPanel, RsvpForm, HealthFields, WishForm, model.ts (form rules, no React)
lib/guest/ # theme.ts (theme → brand tokens), load.ts, actions.ts, paths.ts, gone-page.ts
```

- **Theme.** `GuestShell` maps the invitation theme (`@managevent/ui/themes`) onto the brand `--me-*` tokens, so brand.css classes render in the guest's theme. Text colours are nudged towards the ink where a theme pairing would miss WCAG AA (`lib/guest/guest.test.ts` checks all six). Styles live in `components/views/guest.css`, loaded only on guest pages.
- **Without JavaScript** the gate, countdown, music and forms are not shown (`.inv-js-only`); who, when and where, the schedule, the questions, the reply anchor and the calendar and maps links are plain HTML.
- **Gate.** One sequence of about 1.6 seconds, in CSS. Tap, Enter or Space opens it. Reduced motion and memorial events get a short fade. `?opened=1` skips it (set after opening, and the gate control is a real link to it, so a page whose scripts never load still opens).
- **Reply.** Drawn from the host's `rsvpConfig`; what the host does not ask for is neither shown nor sent. Dietary, allergy and access details need the unticked consent box, whose exact wording is sent as `healthConsent.textShown`. Health values are never returned by the API, so the form offers "keep what is on file" or "change these details". A retry of the same answers reuses its `Idempotency-Key`; changed answers and replies after a success get a new one.
- **States.** `OPEN` (form, or the stored reply with "Change my reply"), `CLOSED` (what the hosts have, no form), `READ_ONLY` for samples and host previews (the form can be tried; sending is disabled and says why).
- **Memorial Mode** comes from the view's `experienceMode`: memorial themes, no arch or ornament, no countdown, "Open" with a plain fade, gentler wording, tribute book instead of wishing well.
- **Status codes.** Unknown link → 404 (`notFound()`), link turned off → 410 and API rate limit → 429 (`Retry-After: 60`), both from `proxy.ts` with a self-contained page (`lib/guest/gone-page.ts`).
- **Old links** (`/legacy/...`, `/anniversary/...`, `/e/...`) are resolved by the API and redirected here (`lib/public/legacy.ts`). No old links have been imported yet, so today they all answer 404 ([`MIGRATION.md`](MIGRATION.md)). `GuestInvitationPage`, `guestInvitationMetadata(link)` and `guestInvitationViewport(link)` take a `{ eventSlug, guestToken }` link, so a route can also render the invitation in place.

## Guests, share, responses and door check-in

The guest side of the Host Studio, on the real API. Copy is in `packages/i18n/src/invitation-studio-guests.ts` (`getInvitationStudioGuests("en")`); styles are section 7 of `app/globals.css` (classes prefixed `sb-`).

```text
app/studio/[eventId]/
  guests/{page.tsx,actions.ts}       # households, search and filters, add, edit, reply, remove, CSV import
  share/{page.tsx,actions.ts}        # private links, WhatsApp, QR, turn off / reissue, email invitations
  responses/{page.tsx,actions.ts}       # totals, deadline, latest replies, dietary, songs, messages, wishes
  responses/export.csv/route.ts      # CSV download (?includeHealth=true adds the dietary columns)
  awaiting/{page.tsx,actions.ts}       # who is still to reply, reminder text, reminder emails
app/check-in/[eventId]/{page.tsx,actions.ts}   # door mode (no site chrome)
components/
  guest-list/  # GuestList, AddHouseholdDialog, HouseholdEditor, RecordReplyDialog, ImportDialog,
               # StatusBadge, PlanLimitNotice, PremiumPointer
  share/       # ShareLinks, QrDialog, EmailInvitations, CampaignHistory
  responses/   # ResponsesNav, DietarySection, WishQueue
  awaiting/    # AwaitingList, ReminderEmailForm
  check-in/    # DoorCheckIn, usePassScanner, qr-decode (jsqr, loaded on first use)
lib/guest-list/  # view models (view.ts, door.ts), loaders (load.ts, door-load.ts, event.ts),
                 # instants.ts, messages.ts, deadline.ts, whatsapp.ts, csv-template.ts, fill.ts, uuid.ts
```

- **Data flow.** Pages are server components: they load with `getServerApi()`, map DTOs to view models with every date already formatted in the event's time zone (`lib/guest-list/load.ts`), and hand plain data and copy to client components. Every mutation is a server action returning `ActionResult` and calling `revalidateEvent(eventId)`, so all tabs show the new counts.
- **Idempotency.** Adding a household, committing an import and sending a campaign each carry a key made when the form opens; a retry cannot add or send twice. A door scan carries a `clientUuid` per attempt, and "Try again" resends the same one.
- **Plan limits.** `PLAN_LIMIT_EXCEEDED` is explained with the numbers from the API (`PlanLimitNotice`). The pointer to Premium is a link to Settings when card payments are on; when they are off it says so and links to www `/contact` (`PremiumPointer`). Memorial events never see either.
- **Capabilities.** Email invitations and reminder emails render only when `capabilities.emailInvitations` and the API's `emailConfigured` are both true; otherwise the page shows the "not set up yet" notice.
- **Share.** WhatsApp links use `wa.me/<61...>` only for an Australian mobile on file, otherwise `wa.me/?text=` (the host picks the contact). The prepared message has a calm memorial variant and asks guests not to forward when forwarding is off. QR codes are drawn in the browser, with the link shown as text beneath. When the browser refuses to copy (in-app browsers, a denied permission), `CopyButton` shows the text in a read-only field, already selected, to copy by hand.
- **Awaiting replies** lists every household with at least one person who has not answered (`hasPendingGuest`), not the API's household-status filter: a household reads "attending" as soon as one member says yes.
- **Door check-in.** Search and tap to check in (`MANUAL`), camera scanning, or a typed pass code (the code printed under the QR on the guest's pass). Scanning uses the browser's `BarcodeDetector` where there is one and a JavaScript decoder (`jsqr`) everywhere else, so iPhone, Firefox and Windows door devices scan too; the button is hidden only where no camera can be opened. A request that fails shows "Check-in did not go through" with Try again and never leaves the list locked. Results use colour, an icon and words. The list refreshes after each scan and every 20 seconds. The door receives allergy and dietary flags only, never notes. `FEATURE_NOT_IN_PLAN` renders an explanation page.
- **Feedback inside dialogs** is inline: a toast would sit behind the modal backdrop. Confirmation dialogs are rendered beside a drawer rather than inside it. `Modal` ignores `close` and `cancel` events from a dialog nested inside it, so nesting no longer closes the outer one, but side by side keeps the focus order simple.
- **Tests.** `lib/guest-list/guest-list.test.ts`, `components/share/share.test.tsx`, and `tests/e2e/studio-guests.spec.ts` (signs up its own host and uses a memorial event, where check-in is included).
