# Liquor and food safety (Western Australia)

> Verify with the WA Department of Local Government, Industry Regulation and Safety (Racing, Gaming and Liquor), local councils and FSANZ.

## Liquor

- Selling alcohol (including tickets that include drinks) needs an appropriate licence or an **occasional licence**. Many venues hold their own licence; use their bar service.
- At private events where the host supplies alcohol free of charge, the rules differ. Never sell alcohol without a licence.
- **RSA:** every person serving alcohol holds current WA-recognised Responsible Service of Alcohol training, recorded in crew and vendor records (BIZ-10, VEN-02).
- **In the software today:** `packages/logistics` adds RSA-certified bartenders to the staffing recommendation when alcohol is served. The `headcount.changed` job accepts an `alcoholServed` flag, but the API does not set it yet, so it defaults to false; capturing it belongs with the event command centre (ADM-03). A licence check on the venue or vendor is planned with vendor verification (ADM-04).

## Food

- Caterers must be registered food businesses with their local government (Food Act 2008, WA).
- **FSANZ Standard 3.2.2A** applies to most caterers (category one): a certified Food Safety Supervisor, food handler training and evidence records. We collect the certificates in vendor verification (VEN-02, ADM-04).
- Allergens are passed to caterers per table, with severity, and crew are briefed on any anaphylaxis risk. Today the recommendations count each allergen separately and never merge them into "other"; per-table briefs need seating (PRT-07), the kitchen briefing sheet export (INV-21), the catering compliance checklist (ADM-10), and the event command centre (ADM-03).
- Managevent crew who handle food (for example plating cake or desserts) complete food handler training (BIZ-10).
