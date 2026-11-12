# @managevent/pricing

Pure Ceremony Builder cost estimator (`WEBSITE.md` §A6.4): a reproducible price list (`2026.10.1`), quantity drivers (`GUEST`, `TABLE`, `HOUR`, `FIXED`), travel zones, and fixtures for the four ceremony families (`CELEBRATION`, `CULTURAL`, `CORPORATE`, `SOLEMN`).

> **No app uses it yet, and its rates are placeholders awaiting founder approval (DEC-01 in [`ROADMAP.md`](../../ROADMAP.md)).** Rules: [`AGENTS.md`](AGENTS.md).

## Usage

```ts
import { calculateBuilderEstimate, CEREMONY_FAMILY_BUILDER_FIXTURES } from "@managevent/pricing";

const estimate = calculateBuilderEstimate(CEREMONY_FAMILY_BUILDER_FIXTURES.CULTURAL);
```

The price list is exported too: `SERVICE_PRICE_RULES`, `VENUE_TYPE_ESTIMATE_INC_GST_CENTS`, `EXTRAS_PRICE_INC_GST_CENTS`, `TRAVEL_ZONE_FEES_INC_GST_CENTS`.
