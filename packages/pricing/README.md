# @managevent/pricing

Pure Ceremony Builder cost estimator (`WEBSITE.md` §A6.4), reproducible price-list version (`2026.10.1`), quantity drivers (`GUEST`, `TABLE`, `HOUR`, `FIXED`), travel zones, and fixtures for all 4 ceremony families.

## Usage

```ts
import { calculateBuilderEstimate, CEREMONY_FAMILY_BUILDER_FIXTURES } from "@managevent/pricing";

const estimate = calculateBuilderEstimate(CEREMONY_FAMILY_BUILDER_FIXTURES.CULTURAL);
```
