# Open decisions

## Resolved In Step 2 (2026-10-23)

- D-01: Fly.io `syd` for API and worker; approved for this scope.
- D-02: Supabase Sydney, using the **session pooler** for both database URLs.
- D-13: `enc:v1` AES-256-GCM key versioning accepted. Preserve the v1 key for existing ciphertext during future rotation.
- D-14: Premium Event Pass costs **6900 AUD cents, GST-inclusive**.
- D-15: Memorial invitations receive Premium entitlements **free**; this does not imply agency fulfilment or waive messaging provider credit costs.
- D-16: Builder price list remains an internal placeholder. No public Builder route or estimate offer until real founder-approved rates exist.

The D-01/D-02 entries below remain as historical context; the resolved choices above supersede their interim status.

Agents: **do not resolve these silently.** If your task touches one of them, comment on the issue and use the stated interim default.

| ID   | Decision                                         | Options                                                                                                                                       | Interim default                                                                                       | Owner                       |
| ---- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- |
| D-01 | API and worker hosting                           | Fly.io `syd` · AWS ECS Fargate `ap-southeast-2` · Render (no Sydney region, so rejected)                                                      | Fly.io `syd`                                                                                          | Founder                     |
| D-02 | Postgres provider                                | Supabase (Sydney) · Neon (Sydney)                                                                                                             | Supabase                                                                                              | Founder                     |
| D-03 | Realtime provider (photo wall, live RSVP, chat)  | Supabase Realtime · Ably (Sydney edge) · Pusher (ap4)                                                                                         | Supabase Realtime                                                                                     | Founder                     |
| D-04 | Media residency                                  | R2 with an OC hint (disclosed) · AWS S3 `ap-southeast-2` for the private bucket only                                                          | R2 for both, disclosed                                                                                | Founder plus privacy advice |
| D-05 | Digital wishing well money flow                  | (a) Show the host's own PayID or bank details, with no money through us · (b) Stripe Connect Express account for the host · (c) gift vouchers | (a) for MVP. (b) needs legal and Stripe review                                                        | Founder plus legal          |
| D-06 | Marketing CMS                                    | Git-based JSON/MDX in `content/` · Sanity · Payload (self-host in Sydney)                                                                     | `content/` JSON/MDX for MVP                                                                           | Founder                     |
| D-07 | Escrow and milestone release                     | Stripe separate charges and transfers with delayed transfers · Stripe-managed holds                                                           | Separate charges and transfers. Confirm with Stripe AU and get legal advice on holding customer funds | Founder plus legal          |
| D-08 | PayID / PayTo support                            | Stripe PayTo (AU) · direct bank transfer with reconciliation                                                                                  | Cards, Apple Pay, Google Pay and Afterpay at launch. Bank transfer reconciled manually                | Founder                     |
| D-09 | Funeral scope boundary                           | Coordinate memorials, celebrations of life and wakes only, or partner with licensed funeral directors                                         | Coordinate only, partnering with funeral directors                                                    | Founder                     |
| D-10 | Business entity details (ABN, ACN, GST, insurer) | —                                                                                                                                             | Placeholders in `docs/compliance/COMPLIANCE_REGISTER.md`                                              | Founder                     |
| D-11 | Brand logo and wordmark                          | —                                                                                                                                             | A text wordmark placeholder                                                                           | Founder / designer          |
| D-12 | Invitation token format migration                | Keep the legacy `name-party-xxxxxx` slugs for imported Appilico events · New format only                                                      | Support legacy slugs read-only for imported events                                                    | Founder                     |
