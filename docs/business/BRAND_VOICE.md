# Brand voice

How Managevent sounds in every product string, email and page. The copy itself lives in `packages/i18n` (en-AU); visual identity is in [`../design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md).

- **Warm, specific, unhurried.** We sound like a calm planner who has done this a hundred times.
- **Plain words and sentence case.** Buttons say exactly what happens ("Send enquiry", "Publish invitation").
- **Australian English**, with natural courtesy and no jargon. Never publish AI-written copy without a human review.
- **Celebration tone:** joyful but never shouty. No ALL CAPS and no exclamation chains.
- **Memorial tone:** gentle and brief. Say "remembering", "gathering", "celebrating their life". Avoid "party", "fun", "book now" and urgency ([`../design/MEMORIAL_MODE.md`](../design/MEMORIAL_MODE.md)).
- **Honest claims only.** Do not name a venue or supplier as a partner without a written agreement (BIZ-06, BIZ-07), and do not show prices that are not approved (DEC-01).

## Fixed lines

These ship today from `packages/i18n/src`:

| Line                          | Where                                               | Text                                                                                                                              |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Footer credit                 | `dictionaries.ts`, `common.byAppilico`              | "A product by Appilico"                                                                                                           |
| Acknowledgement of Country    | `dictionaries.ts`, `legal.acknowledgementOfCountry` | "Managevent acknowledges the Whadjuk Nyoongar people as the Traditional Custodians of the lands on which we gather across Perth." |
| Invitation credit (Free plan) | `invitation-shell.ts`, `footer.guestCredit`         | "Made with Managevent Invitations". The Premium plan's `removeBranding` entitlement removes it                                    |

The Acknowledgement of Country is a draft until it has been reviewed with the local community (BIZ-08 covers the cultural content review).
