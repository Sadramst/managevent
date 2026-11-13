# Data model (contract for `packages/db`)

[`prisma/schema.prisma`](prisma/schema.prisma) is the source of truth. This file explains it: conventions, what each table holds, and which tables the running code uses. Change both in the same PR (`AGENTS.md` §6). Migrations in [`prisma/migrations`](prisma/migrations) are append-only.

## Conventions

These follow ADR-0006.

- **IDs:** `String @id`, a prefixed UUIDv7 generated in application code with `generateId()` (for example `evt_0192…`). Exceptions: Better Auth creates `Session`, `Account`, `Verification` and `TwoFactor` ids, `CeremonyType` is keyed by its `slug`, and `TaxInvoiceSequence` is a single row with `id = 1`.
- **Timestamps:** every table has `createdAt` and `updatedAt`. Customer-facing tables (`User`, `Organisation`, `Lead`, `Event`, `Invitation`, `Party`, `Guest`, `Order`, `Booking`, `MediaAsset`, `WellEntry`) also have `deletedAt?` for soft delete.
- **Money:** `Int` cents, plus a `currency` column that defaults to `"AUD"`. Invoiceable lines store `amountExGstCents`, `gstCents` and `amountIncGstCents`. GST is calculated only in `packages/payments`.
- **Localised fields:** `Json` shaped `{ en: string, ar?: string, zh?: string, hi?: string }`, validated by `LocalizedTextSchema` in `packages/validators`. Only `en` is enabled today.
- 🔒 marks a field that is encrypted at field level (AES-256-GCM, `enc:v1:` prefix) by the Prisma extension in `src/encryption.ts`, keyed by `PII_ENCRYPTION_KEY`.
- **Times:** `DateTime` stored in UTC, plus `timeZone String` (IANA) on events.
- **Status strings:** a few status columns are plain `String` rather than enums (`Campaign.status`, `Message.status`, `Task.status`, `Transfer.status`). Their allowed values are listed with the table.

## ID prefixes

From `ID_PREFIXES` in `src/ids.ts`.

| Prefix  | Entity               | Prefix | Entity            |
| ------- | -------------------- | ------ | ----------------- |
| `usr_`  | User                 | `org_` | Organisation      |
| `lead_` | Lead                 | `bld_` | BuilderSession    |
| `est_`  | Estimate             | `evt_` | Event             |
| `sub_`  | SubEvent             | `inv_` | Invitation        |
| `pty_`  | Party                | `gst_` | Guest             |
| `rsvp_` | Rsvp                 | `hc_`  | EventHeadcount    |
| `pass_` | Pass                 | `ord_` | Order             |
| `oln_`  | OrderLine            | `rec_` | RecommendationSet |
| `pay_`  | Payment              | `txi_` | TaxInvoice        |
| `ven_`  | Venue                | `pkg_` | Package           |
| `svc_`  | Service              | `vsv_` | VendorService     |
| `bkg_`  | Booking              | `itm_` | InventoryItem     |
| `med_`  | MediaAsset           | `msg_` | Message           |
| `cmp_`  | Campaign             | `aud_` | AuditLog          |
| `cns_`  | ConsentRecord        | `rst_` | CrewRoster        |
| `scn_`  | ScanEvent            | `lgs_` | LegacySlug        |
| `mem_`  | Membership           | `coh_` | CoHost            |
| `prc_`  | PriceList            | `vdc_` | VendorDocument    |
| `avb_`  | AvailabilityBlock    | `psc_` | PaymentSchedule   |
| `trf_`  | Transfer             | `ref_` | Refund            |
| `irs_`  | InventoryReservation | `tsk_` | Task              |
| `rsh_`  | RunSheet             | `flp_` | FloorPlan         |
| `wel_`  | WellEntry            | `uns_` | Unsubscribe       |
| `whk_`  | WebhookEvent         |        |                   |

## Enums

```text
Role                        CUSTOMER_HOST | GUEST | VENDOR | PLANNER_STAFF | CHECKIN_CREW | SUPER_ADMIN
CeremonyFamily              CELEBRATION | CULTURAL | CORPORATE | SOLEMN
ExperienceMode              CELEBRATION | MEMORIAL
EventStatus                 DRAFT | ENQUIRY | PROPOSAL | BOOKED | PLANNING | LIVE | COMPLETED | CANCELLED
LeadStage                   NEW | QUALIFIED | PROPOSAL_SENT | BOOKED | LOST
LeadSource                  BUILDER | CONTACT_FORM | BOOK_CONSULT | WHATSAPP | PHONE | INVITATION_BRIDGE | REFERRAL | OTHER
RsvpStatus                  PENDING | YES | NO | MAYBE
RsvpSource                  WEB | HOST_ENTRY | IMPORT
DietaryTag                  HALAL | VEGETARIAN | VEGAN | GLUTEN_FREE | DAIRY_FREE | NUT_ALLERGY | SHELLFISH_ALLERGY | OTHER_ALLERGY | KOSHER | NONE
AllergySeverity             MILD | MODERATE | SEVERE_ANAPHYLAXIS
HeadcountTrigger            RSVP | HOST_EDIT | SCHEDULED
CoHostRole                  OWNER | EDITOR | VIEWER
InvitationPlan              FREE | PREMIUM | AGENCY
WellMode                    NONE | WISHING_WELL | TRIBUTE_BOOK
WellVisibility              HOSTS_ONLY | WALL
LegacySlugSource            APPILICO_ANNIVERSARY | APPILICO_E
OrganisationKind            VENDOR | CORPORATE | INTERNAL
MembershipRole              OWNER | ADMIN | MEMBER
OrderStatus                 DRAFT | PROPOSED | ACCEPTED | LOCKED | COMPLETED | CANCELLED
OrderLineKind               SERVICE | PACKAGE | HIRE | VENDOR_BOOKING | FEE
OrderLineUnit               GUEST | TABLE | HOUR | ITEM | FIXED
RecommendationStatus        OPEN | APPLIED | DISMISSED | SUPERSEDED
PaymentStatus               PENDING | REQUIRES_ACTION | SUCCEEDED | FAILED | REFUNDED | PARTIALLY_REFUNDED
PaymentKind                 DEPOSIT | MILESTONE | BALANCE | INVITATION_PASS | ADD_ON | REFUND
PaymentMethod               CARD | APPLE_PAY | GOOGLE_PAY | AFTERPAY | BANK_TRANSFER
VendorStatus                APPLIED | PENDING_DOCS | UNDER_REVIEW | APPROVED | SUSPENDED | REJECTED
DocumentType                PUBLIC_LIABILITY | FOOD_SAFETY | RSA | LIQUOR_LICENCE | WWCC | ABN_EVIDENCE | OTHER
BookingStatus               REQUESTED | QUOTED | ACCEPTED | DECLINED | CONFIRMED | DELIVERED | CANCELLED
InventoryReservationStatus  HELD | DISPATCHED | RETURNED | DAMAGED
ScanResult                  OK | DUPLICATE | INVALID | WRONG_EVENT
MediaBucket                 PUBLIC | PRIVATE
MediaPurpose                WALL | COVER | GALLERY | MUSIC | DOCUMENT | TRIBUTE
MediaModeration             PENDING | APPROVED | REJECTED
MessageChannel              EMAIL | SMS | WHATSAPP | PUSH | IN_APP
ConsentSubjectType          USER | GUEST | LEAD
ConsentPurpose              MARKETING_EMAIL | MARKETING_SMS | EVENT_UPDATES | HEALTH_DATA_CATERING | PHOTO_PUBLICATION | TESTIMONIAL
```

## Which tables are in use

`apps/api` and `apps/worker` read and write the identity, CRM (`Lead`), event and invitation, `Order` and `RecommendationSet`, `Payment`, `CrewRoster`, `ScanEvent`, wishes, messaging, consent, audit and webhook tables. `db:seed` fills the catalogue tables (`CeremonyType`, `Venue`, `Package`, `PriceList`) and `TaxInvoiceSequence` from `content/`, but no app reads them yet.

**Planned (schema only, no code uses them yet):** `Organisation`, `Membership`, `BuilderSession`, `Estimate`, `Service`, `SubEvent`, `OrderLine`, `Booking`, `VendorService`, `VendorDocument`, `AvailabilityBlock`, `PaymentSchedule`, `Transfer`, `TaxInvoice`, `Refund`, `InventoryItem`, `InventoryReservation`, `Task`, `RunSheet`, `FloorPlan` and `MediaAsset`. The `ROADMAP.md` items that will use them are named in each section below. Expect these tables to change when that work starts.

## Entities

### Identity

- **User:** `id`, `email` (unique), `emailVerified`, `phone?`, `name`, `image?`, `locale` (default `en`), `roles Role[]`, `mfaEnabled`, `twoFactorEnabled` (Better Auth), `avatarMediaId?`, `deletedAt?`. New accounts get `roles = [CUSTOMER_HOST]`; staff roles are granted only by the API's `staff:create` CLI.
- **Session, Account, Verification, TwoFactor:** Better Auth tables (`packages/auth`). `Account.password` holds the password hash; `TwoFactor` holds the TOTP secret and backup codes.
- **Organisation** _(planned, VEN-01)_: `id`, `kind OrganisationKind`, `name`, `slug?` (unique), `abn?`, `acn?`, `gstRegistered`, `abnVerifiedAt?`, `abnLookupSnapshot Json?`, `stripeConnectAccountId?`, `status VendorStatus?`.
- **Membership** _(planned, VEN-01)_: `id`, `userId`, `organisationId`, `role MembershipRole` (default `MEMBER`). Unique on (`userId`, `organisationId`).

### Marketing and CRM

- **Lead:** `id`, `stage`, `source`, `name`, `email`, `phone?`, `preferredLanguage` (default `en`), `preferredChannel MessageChannel` (default `EMAIL`), `ceremonySlug?`, `eventDate?`, `dateFlexible`, `guestEstimate?`, `area?`, `message?`, `notes?` (internal planner notes, never shown to the enquirer), `estimateId?`, `utm Json?`, `assignedToUserId?`, `marketingConsentId?`, `eventId?` (set once converted), `idempotencyKey?` (unique; a retried enquiry returns the first lead).
- **BuilderSession** _(planned, DEC-01)_: `id`, `anonymousKey`, `userId?`, `stateJson`, `locale`, `ceremonySlug`.
- **Estimate** _(planned, DEC-01, PRT-01)_: `id`, `builderSessionId`, `priceListVersion`, `currency`, `lowIncGstCents`, `highIncGstCents`, `breakdownJson`, `assumptionsJson`, `shareToken` (unique).

### Catalogue

Seeded from `content/` by `db:seed`. `content/` stays the source until ADM-07 (or the CMS chosen in D-06) moves editing into the product.

- **CeremonyType:** `slug` (id), `family`, `experienceMode`, `name Json`, `summary Json?`, `culturalNotes Json?`, `includesCategories String[]`, `timelineTemplate Json`.
- **Venue:** `id`, `slug` (unique), `name Json`, `area`, `type`, `capacityJson`, `rulesJson`, `facilities String[]`, `suitableFor String[]`, `accessible`, `lat?`, `lng?`, `partnerStatus`, `organisationId?` (vendor-owned venue).
- **Service** _(planned)_: `id`, `category`, `name Json`, `tiersJson`.
- **Package:** `id`, `slug` (unique), `name Json`, `tier?`, `ceremonySlugs String[]`, `guestMin`, `guestMax`, `currency`, `fromPriceIncGstCents`, `inclusionsJson`, `addOnsJson`, `depositRuleJson`, `active`.
- **PriceList:** `id`, `version` (unique; the seed writes `2026.10.1`), `effectiveFrom`, `rulesJson`. Makes estimates reproducible.

### Events and invitations

- **Event:** `id`, `ownerUserId`, `title Json`, `ceremonySlug`, `experienceMode` (derived with `getExperienceMode()` and stored), `status`, `startsAt`, `endsAt?`, `timeZone` (default `Australia/Perth`), `venueId?`, `venueFreeText?`, `lat?`, `lng?`, `guestCountTarget?`, `plannerUserId?`, `leadId?`, `isAgencyManaged`.
- **SubEvent** _(planned)_: `id`, `eventId`, `title Json`, `startsAt`, `endsAt?`, `venueId?`, `venueFreeText?`, `order`.
- **CoHost:** `id`, `eventId`, `userId`, `role CoHostRole`. Unique on (`eventId`, `userId`). Creating an event writes an `OWNER` row for its owner, and the API's access checks read it. There is no flow to invite a co-host yet (INV-17).
- **Invitation:** `id`, `eventId` (unique, 1:1), `eventSlug` (unique), `templateSlug`, `themeId`, `contentJson` (wording, story, FAQ, dress code), `languages String[]` (`["en"]` today), `defaultLanguage` (default `en`), `gateStyle`, `musicMediaId?`, `coverMediaId?`, `plan InvitationPlan` (default `FREE`), `pinHash?`, `rsvpDeadline?`, `rsvpConfigJson`, `publishedAt?`, `salt` (per event, random; never exported), `allowForwarding`, `wallEnabled`, `wallAutoApprove` (always false when memorial), `wellMode WellMode`, `wellConfigJson`, `isDemo` (sample invitations created by `seed:demo` and shown on the public gallery; every guest write is refused).
- **Party:** `id`, `invitationId`, `stableId` (immutable), `displayName Json`, `token` (stored at creation and never recomputed on rename), `tokenRevokedAt?`, `tokenVersion` (default 0; bumped on reissue or collision), `revokedTokens String[]` (earlier tokens of a reissued link; they resolve to 410), `maxSeats`, `allowPlusOnes`, `childrenAllowed`, `tags String[]`, `tableLabel?`. Unique on (`invitationId`, `token`) and (`invitationId`, `stableId`).
- **Guest:** `id`, `partyId`, `stableId`, `name Json`, `email?`, `phone?`, `isChild`, `isPlusOne`, `individualToken?`, `contactConsentId?`.
- **Rsvp:** `id`, `guestId` (unique), `status RsvpStatus`, `respondedAt`, `dietaryEncrypted?` 🔒 (encrypted JSON `DietaryTag[]`), `allergyNotes?` 🔒, `allergySeverityEncrypted?` 🔒 (encrypted `AllergySeverity`), `accessibilityNotes?` 🔒, `songRequests String[]`, `messageToHost?`, `source RsvpSource`, `idempotencyKey` (unique).
  - No plaintext dietary or severity column exists. Callers pass `dietary` and `allergySeverity`; `encryptRsvpWriteData()` turns them into the encrypted columns and `decryptRsvpRecord()` restores them in memory only.
  - Migration `20261023010000_encrypted_health_only` refuses to drop legacy plaintext values that have no ciphertext; backfill through the application key first.
- **EventHeadcount:** `id`, `eventId`, `takenAt`, `adultsYes`, `childrenYes`, `maybe`, `pending`, `no`, `dietaryCountsJson` (validated integer counts only, never names or notes), `trigger HeadcountTrigger`. After writing a snapshot the API enqueues the worker's `headcount.changed` job.
- **Pass:** `id`, `guestId?`, `partyId`, `qrPayloadSig` (signed QR payload), `checkedInAt?`, `checkedInBy?`, `deviceId?`, `revokedAt?` (set when the guest stops attending or is removed).
- **LegacySlug:** `id`, `legacyPath` (unique), `partyId`, `source LegacySlugSource`. The API resolves these paths; the import that fills the table has not run (INV-14).

### Orders and logistics

- **Order:** `id`, `eventId`, `status OrderStatus`, `priceListVersion`, `currency`, `totalsJson`, `acceptedAt?`, `termsVersion`. The worker reads an event's order lines when it builds recommendations; nothing creates orders yet (ADM-02, PRT-05).
- **OrderLine** _(planned, PRT-04, PRT-05)_: `id`, `orderId`, `kind OrderLineKind`, `refId`, `description Json`, `qty`, `unit OrderLineUnit`, `currency`, `unitPriceExGstCents`, `amountExGstCents`, `gstCents`, `amountIncGstCents`, `vendorOrganisationId?`, `finalNumbersDueAt?`, `logisticsKey?` (for example `catering.main`, `cake.serves`, `seating.chairs`).
- **RecommendationSet:** `id`, `eventId`, `orderId?`, `basedOnHeadcountId`, `rulesVersion`, `itemsJson` (`[{ logisticsKey, currentQty, recommendedQty, reason, deltaIncGstCents }]`), `status RecommendationStatus`, `appliedByUserId?`. Written by the worker's `headcount.changed` job with `packages/logistics`; older open sets become `SUPERSEDED`. Applying a set is PRT-04.
- **Booking** _(planned, VEN-05)_: `id`, `orderLineId?`, `eventId`, `vendorOrganisationId`, `vendorServiceId`, `status BookingStatus`, `quoteJson`, `runSheetJson`.
- **VendorService** _(planned, VEN-04)_: `id`, `organisationId`, `category`, `name Json`, `tiersJson`, `serviceAreas String[]`, `active`.
- **VendorDocument** _(planned, VEN-02, ADM-04)_: `id`, `organisationId`, `type DocumentType`, `mediaId`, `issuer?`, `currency`, `coverAmountCents?`, `expiresAt?`, `verifiedByUserId?`, `verifiedAt?`, `status VendorStatus`.
- **AvailabilityBlock** _(planned, VEN-04)_: `id`, `organisationId`, `startsAt`, `endsAt`, `reason`.

### Payments and finance

- **Payment:** `id`, `orderId?`, `invitationId?`, `kind PaymentKind`, `status PaymentStatus`, `currency`, `amountExGstCents` (default 0), `amountIncGstCents`, `gstCents`, `stripePaymentIntentId` (unique), `method PaymentMethod`, `idempotencyKey?` (unique), `paidAt?`. Today only the Premium Event Pass writes rows (`kind = INVITATION_PASS`, `method = CARD`), from the verified Stripe webhook.
- **PaymentSchedule** _(planned, PRT-06)_: `id`, `orderId`, `currency`, `itemsJson` (`[{ kind, dueAt, amountIncGstCents }]`).
- **Transfer** _(planned, VEN-03)_: `id`, `paymentId`, `vendorOrganisationId`, `currency`, `amountCents`, `stripeTransferId?`, `releaseAt`, `releasedAt?`, `status`.
- **TaxInvoice** _(planned, PRT-06, DEC-03)_: `id`, `number` (unique), `issuedAt`, `supplierAbn`, `customerName`, `customerAbn?`, `currency`, `linesJson`, `totalExGstCents`, `gstCents`, `totalIncGstCents`, `pdfMediaId`, `xeroInvoiceId?`. No code issues tax invoices yet; `buildTaxInvoice()` in `packages/payments` builds the model.
- **TaxInvoiceSequence:** a single row (`id = 1`, `lastValue`) created by `db:seed`. Invoice numbers must be taken from it inside the same transaction that writes the `TaxInvoice`, so numbers stay gapless.
- **Refund** _(planned, OPS-03, ADM-06)_: `id`, `paymentId`, `currency`, `amountCents`, `reason`, `policyClause`, `stripeRefundId` (unique).

### Operations

All planned except `CrewRoster` and `ScanEvent`.

- **InventoryItem** _(planned, ADM-05)_: `id`, `sku` (unique), `barcode` (unique), `name Json`, `category`, `qtyOwned`, `currency`, `unitHirePriceExGstCents`, `replacementCostCents`.
- **InventoryReservation** _(planned, ADM-05)_: `id`, `itemId`, `eventId`, `qty`, `from`, `to`, `status InventoryReservationStatus`.
- **Task** _(planned, ADM-03, PRT-02)_: `id`, `eventId`, `title`, `dueAt?`, `assigneeUserId?`, `status`, `checklistJson`.
- **RunSheet** _(planned, ADM-03)_: `id`, `eventId`, `itemsJson` (`[{ at, durationMin, title, owner, notes }]`), `version`.
- **CrewRoster:** `id`, `eventId`, `userId`, `role`, `shiftStart`, `shiftEnd`, `deviceIds String[]`. The API's access checks use it for `CHECKIN_CREW` roster scope at the door; there is no screen to manage it yet (ADM-03).
- **ScanEvent:** `id`, `passId`, `eventId`, `deviceId`, `scannedAt`, `clientUuid` (unique; dedupes repeated and offline scans), `result ScanResult`.
- **FloorPlan** _(planned, PRT-07, WIN-03)_: `id`, `eventId`, `venueId?`, `layoutJson`, `version`.

### Media, messaging and compliance

- **MediaAsset** _(planned, INV-11)_: `id`, `bucket MediaBucket`, `key` (unique), `mime`, `bytes`, `width?`, `height?`, `durationSec?`, `blurhash?`, `uploadedByUserId?`, `uploadedByPartyId?`, `moderation`, `eventId?`, `purpose MediaPurpose`, `exifStripped`, `retentionUntil?`. Today hosts paste media links; nothing is uploaded.
- **WellEntry:** `id`, `invitationId`, `partyId?`, `authorName`, `message` (🔒 when `visibility = HOSTS_ONLY`), `mediaId?`, `visibility WellVisibility` (default `HOSTS_ONLY`), `moderation` (default `PENDING`), `idempotencyKey?` (unique; `{partyId}:{Idempotency-Key}`).
- **Message:** `id`, `channel`, `to` (a hash of the address, never the address), `templateKey`, `locale`, `eventId?`, `campaignId?`, `status`, `providerId`, `sentAt?`.
  - `status` is `SENT`, `FAILED`, or `NOT_CONFIGURED` (written by `lead.created` when no email provider is set; nothing was sent).
  - `templateKey` values in use: `invitation.send` and `rsvp.reminder` (email campaigns), `emails.leadAutoReply` and `emails.leadPlannerAlert` (`lead.created`).
  - `providerId` is the provider's message id, or a stable marker when there is none (`failed:{campaignId}:{guestId}`, `lead-auto-reply:{leadId}`, `lead-planner-alert:{leadId}`).
- **Campaign:** `id`, `invitationId`, `channel`, `audienceFilterJson`, `scheduledAt?`, `status`, `consentAttestationUserId` (the host who attested consent for the send), `idempotencyKey?` (unique). Only `EMAIL` campaigns exist today; SMS and WhatsApp are INV-08.
  - `status` is a string: `QUEUED` → `SENDING` → `SENT` | `PARTIAL` | `FAILED`.
  - `audienceFilterJson` is `{ kind: "INVITE" | "REMINDER", recipients: [{ partyId, guestId }], skipped: [{ partyId, reason }] }`. It holds ids only, never an address. The worker reads `kind` and `recipients`; `skipped` lets a replayed request return the same answer.
  - `idempotencyKey` is stored as `{invitationId}:{kind}:{Idempotency-Key}`, so one client key cannot resolve to another event's campaign.
- **ConsentRecord:** `id`, `subjectType ConsentSubjectType`, `subjectId`, `purpose ConsentPurpose`, `granted`, `textShown`, `locale`, `at`, `ip?`, `withdrawnAt?`. Written for enquiry marketing consent (`MARKETING_EMAIL`) and on RSVP (`HEALTH_DATA_CATERING`, `EVENT_UPDATES`).
- **Unsubscribe:** `id`, `channel`, `address` (hashed), `at`. Unique on (`channel`, `address`).
- **AuditLog:** `id`, `actorUserId?`, `actorRole`, `action`, `entity`, `entityId`, `diffJson` (passed through `redactForLog`), `at`, `ip?`. Append-only.
- **WebhookEvent:** `id`, `provider`, `providerEventId`, `type`, `payloadJson`, `receivedAt`, `processedAt?`. Unique on (`provider`, `providerEventId`), which makes webhook handling idempotent. Two providers write it:
  - `stripe`: the raw verified Stripe event.
  - `guest-rsvp`: the API's RSVP submission ledger. `providerEventId = "{partyId}:{Idempotency-Key}"`, `type = "rsvp.submit"`, payload `{ bodyHash, headcountId }` only (a keyed hash of the request, never the answers). A repeated RSVP request is recognised from this row, because the key on the `Rsvp` rows is overwritten by every later submission.
- **SiteSetting:** `id` (always `"site"`: one row), `contactEmail?`, `contactPhone?`, `notificationEmail?`, `updatedByUserId?`. Staff edit these in the console. `null` means "not set": the API answers with the first-run default (`CONTACT_EMAIL`, else `appilico.au@gmail.com`; `CONTACT_PHONE`, else blank). An empty string means "deliberately blank" (no public phone number). `notificationEmail` is where new-enquiry alerts go; unset, it follows `contactEmail`. Every change writes a `site_settings.update` AuditLog row that records which fields changed, never their values.

## Retention schedule

This is the agreed schedule (`docs/compliance/PRIVACY.md` refers to it). **No job enforces it yet.** The worker declares a `retention.cleanup` schedule with no handler; the health-data part is PRV-01.

| Data                                             | Retention                                           |
| ------------------------------------------------ | --------------------------------------------------- |
| Guest dietary, allergy and accessibility data 🔒 | Deleted (fields nulled) **90 days after the event** |
| Photo wall media                                 | 12 months after the event, unless the host extends  |
| Guest names and contacts                         | 24 months after the event, or on host deletion      |
| Leads that never converted                       | 24 months after the last contact                    |
| Tax invoices and payment records                 | 5 years (ATO requirement)                           |
| Audit logs                                       | 7 years                                             |
| Event packs on devices                           | Expire 48h after the event ends                     |

## Constraints and indexes

Unique:

- `User.email`, `Session.token`, `Organisation.slug`, `Venue.slug`, `Package.slug`, `PriceList.version`, `Estimate.shareToken`
- `Invitation.eventId`, `Invitation.eventSlug`, `Party(invitationId, token)`, `Party(invitationId, stableId)`
- `Rsvp.guestId`, `Rsvp.idempotencyKey`, `LegacySlug.legacyPath`
- `Lead.idempotencyKey`, `WellEntry.idempotencyKey`, `Campaign.idempotencyKey`, `Payment.idempotencyKey` (when set)
- `Payment.stripePaymentIntentId`, `Refund.stripeRefundId`, `TaxInvoice.number`
- `ScanEvent.clientUuid`, `MediaAsset.key`, `InventoryItem.sku`, `InventoryItem.barcode`
- `Membership(userId, organisationId)`, `CoHost(eventId, userId)`, `Unsubscribe(channel, address)`, `WebhookEvent(provider, providerEventId)`

Indexes:

- `Session(userId)`, `Account(userId)`, `TwoFactor(userId)`, `Verification(identifier)`
- `Event(ownerUserId)`, `Event(status, startsAt)`
- `Lead(stage, createdAt)`
- `Invitation(isDemo, publishedAt)`
- `Party(invitationId, deletedAt)`, `Guest(partyId)`
- `Pass(partyId)`, `Pass(guestId)`
- `ScanEvent(eventId, scannedAt)`, `ScanEvent(passId)`
- `EventHeadcount(eventId, takenAt)`
- `WellEntry(invitationId, moderation, createdAt)`
- `Campaign(invitationId, createdAt)`
- `Message(eventId, templateKey, to)`, `Message(campaignId)`, `Message(providerId)`
- `MediaAsset(eventId, purpose, moderation)`
- `ConsentRecord(subjectType, subjectId, purpose)`
- `AuditLog(entity, entityId)`, `AuditLog(at)`
