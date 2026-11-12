# Pricing model

All consumer prices are **GST-inclusive AUD**. Money is integer cents; GST maths lives only in `packages/payments` ([`../compliance/PAYMENTS_AND_GST.md`](../compliance/PAYMENTS_AND_GST.md)). Founder decisions still open are ROADMAP **DEC-01** (agency rates) to **DEC-03**.

## Invitations (built)

The plans are defined in `packages/payments/src/plans.ts` (`INVITATION_PLANS`). Premium is bought through Stripe Checkout when `STRIPE_SECRET_KEY` is configured; otherwise the upgrade is shown as unavailable.

| Plan                   | Price                                             | Guests    | Email invitations | Notes                                                                                                      |
| ---------------------- | ------------------------------------------------- | --------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Free**               | $0                                                | 30        | 50                | RSVP with dietary questions. No reminders, QR passes, check-in, custom link words, PIN or branding removal |
| **Premium Event Pass** | **$69 incl. GST** (6900 cents), one-off per event | Unlimited | Unlimited         | All themes and gate styles, RSVP reminders, QR passes and check-in, custom link, PIN, no Managevent credit |
| **Agency**             | Included in agency packages                       | Unlimited | Unlimited         | Everything in Premium, plus the automatic logistics bridge                                                 |

- **Memorial events get Premium free** (`getInvitationPlan(plan, "MEMORIAL")`, D-15). This does not include agency fulfilment.
- Some Premium entitlements describe features that are not built yet: the photo wall and display (INV-11), bulk SMS and WhatsApp (INV-08), music uploads (INV-11), and PIN protection and wishing-well or tribute-book export (not scheduled). Do not advertise them as available.
- **Open:** whether guest-added plus-ones count toward the Free limit (DEC-02), and whether a pass purchase issues an ATO tax invoice (DEC-03; none is issued today).
- **SMS credits:** to be priced per 100 (Twilio cost plus margin) when SMS sending exists (INV-08, BIZ-05).

## Ceremony packages (agency)

Not approved yet (DEC-01). The www home page shows an estimator labelled indicative, using placeholder rates in `apps/marketing/components/event-estimator.tsx`; `packages/pricing` holds a separate placeholder price list. Neither is a price offer.

- **Tiers:** Essential, Signature, Luxe.
- **"From" prices** must be achievable at the stated minimum guest count and inclusions (Australian Consumer Law).
- **Planning fee:** a fixed fee or a percentage of the order. Founder to decide (DEC-01).

### Payment schedule (default; set per order)

Implemented as `buildDefaultPaymentSchedule` in `packages/payments`; taking the payments is planned (PRT-06).

| Milestone   | Amount                               | When                                                        |
| ----------- | ------------------------------------ | ----------------------------------------------------------- |
| Deposit     | 25% (min $500)                       | To hold the date                                            |
| Milestone 2 | 50%                                  | 8 weeks before                                              |
| Balance     | Remainder, adjusted to final numbers | Final numbers due 14 days before; balance due 7 days before |

- **Final numbers:** each order line has `finalNumbersDueAt`. Increases after that date depend on vendor availability.
- **Cancellation and refunds:** see [`../compliance/CONSUMER_LAW.md`](../compliance/CONSUMER_LAW.md). Deposits must reflect a genuine pre-estimate of loss. The terms need legal review (PRV-02).

## Marketplace (phase 2, not built)

- Commission of 10–15% on vendor bookings (to validate), collected as Stripe Connect application fees (VEN-03, MKP-01).
- Payout release: the deposit share after the cooling-off period; the balance 2–5 business days after delivery unless disputed (D-07).

## B2B (planned, MKP-02)

Corporate subscription: priority dates, an account manager, invoicing on terms, branded invitation themes. Premium vendor placement for marketplace vendors.

## Card surcharges

If we surcharge, it must not exceed our cost of acceptance and must be disclosed before payment. Check the current RBA and ACCC rules when payments for packages are built, because surcharging policy is under review.
