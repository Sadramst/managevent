# Compliance register

> **Not legal advice.** This register lists obligations to confirm with a lawyer, accountant and insurer. Owners must verify current requirements before launch. Laws change, and some items below are flagged as "verify".

## Entity details (placeholders, see D-10)

| Item                                      | Value                                                                                                 | Status            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| Operating entity                          | Appilico [Pty Ltd?], trading as Managevent                                                            | ⬜ confirm        |
| ABN                                       | `__ ___ ___ ___`                                                                                      | ⬜                |
| ACN                                       | `___ ___ ___`                                                                                         | ⬜ (if a company) |
| Business name registration ("Managevent") | ASIC                                                                                                  | ⬜                |
| GST registration                          | Required once GST turnover is ≥ $75,000. Register from day one anyway, because we issue tax invoices. | ⬜                |
| Domain                                    | managevent.com.au (.au eligibility through the ABN or business name)                                  | ✅ held           |
| Public liability insurance                | **$20M** (commonly required by WA councils and venues). Check each venue's terms.                     | ⬜                |
| Professional indemnity                    | Recommended                                                                                           | ⬜                |
| Workers' compensation (WA)                | Required once we employ crew                                                                          | ⬜                |
| Privacy policy and APP compliance         | `PRIVACY.md`                                                                                          | ⬜ legal review   |
| Terms, refunds and vendor terms           | `CONSUMER_LAW.md`                                                                                     | ⬜ legal review   |

## Obligations by area

| Area                   | Obligation                                                                                                                                                       | Where handled                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Privacy                | Privacy Act 1988 and the APPs; Notifiable Data Breaches scheme; health information (dietary and allergy data)                                                    | `PRIVACY.md`, ADR-0008                 |
| Consumer law           | Australian Consumer Law: consumer guarantees, unfair contract terms, total price display incl. GST, no fake or incentivised-without-disclosure reviews, deposits | `CONSUMER_LAW.md`                      |
| Tax                    | GST 10%, tax invoices, BAS, record keeping for 5 years                                                                                                           | `PAYMENTS_AND_GST.md`                  |
| Marketing messages     | Spam Act 2003 (consent, identify, unsubscribe); SMS sender id registration (verify the current ACMA requirements)                                                | `MESSAGING_SPAM_ACT.md`                |
| Alcohol (WA)           | Liquor Control Act 1988 (WA): licensing for any sale of alcohol, RSA for staff serving                                                                           | `LIQUOR_FOOD_SAFETY_WA.md`             |
| Food (WA)              | Food Act 2008 (WA), registration with local government, FSANZ Standard 3.2.2A (food safety supervisor, food handler training)                                    | `LIQUOR_FOOD_SAFETY_WA.md`             |
| Children               | Working with Children Check (WA) for child-related work, for example kids' party entertainers and crew                                                           | `VENDOR_VERIFICATION.md`               |
| Venues and public land | Council hall terms; permits for parks and reserves (for example Kings Park through its managing authority); noise and curfew                                     | `docs/business/OPERATIONS_PLAYBOOK.md` |
| Special activities     | Fireworks or pyrotechnics (licensed operator plus permits), drones (CASA rules), marquees (structural and council rules where applicable)                        | Vendor verification                    |
| Music                  | Public performance licensing (OneMusic Australia) at events where the venue isn't covered; licensed tracks only on invitation pages                              | `MUSIC_LICENSING.md`                   |
| Accessibility          | Disability Discrimination Act 1992; WCAG 2.2 AA for digital products                                                                                             | `ACCESSIBILITY.md`                     |
| Funerals               | Managevent does **not** perform regulated funeral-director activities. We coordinate gatherings and partner with licensed funeral directors.                     | D-09                                   |
| Payments               | PCI DSS handled by Stripe (we never touch card data); holding funds and escrow model to be confirmed (D-07)                                                      | `PAYMENTS_AND_GST.md`                  |

## State expansion

Add NSW, VIC, QLD and SA rows before launching in those states. Liquor, food and WWCC regimes differ by state.
