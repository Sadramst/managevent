# Content

Structured content for `www.` and the shared catalogue. This is the CMS until D-06 is decided.

- Schemas: `schemas/*.schema.json` (JSON Schema 2020-12). Zod mirrors live in `packages/validators/content`. **The build validates every file.**
- `status`: `placeholder` (fake or unconfirmed: never shown as a real partner or review), `draft`, `published`.
- Every translatable field is `{ "en": "...", "fa": "..." }`. Farsi entries marked `"faReview": "needed"` must be reviewed by a fluent speaker before they are published.
- **Never** put real customer names, photos or reviews here without a consent record id.

```text
content/
  schemas/            ceremony, package, venue, city, testimonial, routes
  ceremonies/         one file per ceremony slug
  packages/           one file per package
  locations/<city>/   city.json, venues.json
  testimonials/       testimonials.json (verified only)
  routes.json         SEO aliases → canonical
```

> Placeholder packages use `fromPriceIncGstCents: 0`. The loader must render these as "Price on request" and never as $0.
