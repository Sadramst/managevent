# Pricing model

All consumer prices are shown **GST-inclusive**, in **AUD**. The maths lives in `packages/payments` and `packages/pricing`.

## Ceremony packages (agency)

- **"From" prices** must be achievable at the stated minimum guest count and with the stated inclusions (ACL).
- **Tiers:** Essential, Signature, Luxe, per service category.
- **Planning fee:** a fixed fee or a % of the order. Founder to decide.

### Payment schedule (default; set per order)

| Milestone   | Amount                               | When                                                        |
| ----------- | ------------------------------------ | ----------------------------------------------------------- |
| Deposit     | 25% (min $500)                       | To hold the date                                            |
| Milestone 2 | 50%                                  | 8 weeks before                                              |
| Balance     | Remainder, adjusted to final numbers | Final numbers due 14 days before; balance due 7 days before |

- **Final numbers:** each order line has `finalNumbersDueAt`. Increases after that date depend on vendor availability.
- **Cancellation and refunds:** see `docs/compliance/CONSUMER_LAW.md`. Deposits must reflect genuine pre-estimates of loss. The terms need legal review.

## Invitations

| Plan               | Price (placeholder)                            | Notes                                    |
| ------------------ | ---------------------------------------------- | ---------------------------------------- |
| Free               | $0                                             | Up to 30 guests                          |
| Premium Event Pass | **TBC** (suggest test points: $39 / $69 / $99) | One-off per event                        |
| Agency             | Included                                       | Part of any Managevent package           |
| SMS credits        | TBC per 100                                    | Pass the Twilio cost through plus margin |

**Decision for the founder:** make Premium free for memorial events (recommended, as a goodwill gesture).

## Marketplace (phase 2)

- Commission of 10–15% on vendor bookings (to validate). Collected through Stripe Connect application fees.
- Payout release: deposit share after the cooling-off period; balance 2–5 business days after delivery, unless disputed (D-07).

## B2B

Corporate subscription (TBC): priority dates, account manager, invoicing on terms, branded invitation themes.

## Card surcharges

If we surcharge, it must not exceed our cost of acceptance and must be disclosed before payment. Check the current RBA and ACCC rules at implementation time, because surcharging policy is under review.
