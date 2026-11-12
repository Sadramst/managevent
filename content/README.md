# Content

Structured catalogue content for `www.` and the database seed. Until staff can edit it in the product (ADM-07, or the CMS chosen in D-06), these JSON files are the source.

```text
content/
  schemas/            JSON Schema 2020-12: ceremony, city, localized, package, routes, testimonial, venue
  ceremonies/         one file per ceremony slug (10)
  packages/           one file per package (2, both placeholders)
  locations/<city>/   city.json for 6 cities; venues.json for Perth only
  testimonials/       testimonials.json (empty: only verified testimonials with consent go here)
  routes.json         SEO aliases → canonical paths
```

## Who reads it

| Content                        | Used by                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `ceremonies/`                  | `apps/marketing` (`/ceremonies` and `/ceremonies/[slug]`), and `pnpm db:seed` (`CeremonyType`)   |
| `locations/perth/venues.json`  | `apps/marketing` (`/venues`), and `pnpm db:seed` (`Venue`)                                       |
| `packages/`                    | `pnpm db:seed` (`Package`) only. **Planned:** `/packages` pages (MKT-05)                         |
| `locations/<city>/city.json`   | Nothing yet. **Planned:** city SEO pages (MKT-10); Perth is `live`, every other city is `hidden` |
| `routes.json`, `testimonials/` | Nothing yet                                                                                      |

## Validation

- `pnpm validate:content` (`scripts/validate-content.mjs`, run in CI) checks that the schemas are present and that every file has its required fields.
- `apps/marketing` parses ceremonies and Perth venues with the Zod mirrors in `packages/validators/src/content.ts` (`@managevent/validators/content`) at build time, so an invalid file fails the build.
- Change a JSON schema and its Zod mirror in the same PR.

## Rules

- `status` is `placeholder` (invented or unconfirmed: never shown as a real partner, venue or review), `draft` or `published`. Every Perth venue is a `placeholder`, and ceremonies are `draft`.
- Every translatable field is `{ "en": "..." }`. The schema also reserves `ar`, `zh` and `hi`; enabling one is a `contract-change`.
- **Never** put real customer names, photos or reviews here without a consent record id.
- Placeholder packages have `fromPriceIncGstCents: 0`. Anything that renders them must show "Price on request", never $0. Real prices wait for DEC-01.
