# Australian Consumer Law: product rules

> Not legal advice. Terms and policies need legal review, especially for unfair contract terms, which carry significant penalties (PRV-02, BIZ-03).

## Engineering and product must

- Show **total prices including GST**. Do not drip in mandatory fees at checkout; travel-zone surcharges appear in the estimate. Today: every price on www and `invitation.` is GST-inclusive, and the Premium Event Pass is $69 incl. GST.
- Keep "from" prices honest: they must be achievable. Agency prices are not published until the founder approves rates (DEC-01); the www estimator is labelled indicative.
- Never imply that consumer guarantees can be excluded. Refund text must not say "no refunds" in a way that misleads about statutory rights.
- Keep deposits and cancellation fees reasonable, tied to costs actually incurred or committed, and show the cancellation schedule before payment (PRT-06).
- **Reviews and testimonials:** real customers only. No fake, misleadingly edited or cherry-picked aggregate ratings; disclose incentives. Every entry in `content/testimonials` must have `verified: true` and a `consentRecordId` (`content/schemas/testimonial.schema.json`, checked by `pnpm validate:content`). Verified marketplace reviews are VEN-06.
- No fake urgency or scarcity ("Only 1 date left!") unless it is true and verifiable. No urgency anywhere in Memorial Mode.
- Show platform and vendor terms at sign-up, record the accepted version, and keep the terms fair (no unilateral variation without notice). Recording terms acceptance is planned (PRT-11, VEN-01).
