# @managevent/logistics

Pure, deterministic, versioned engine that turns an RSVP headcount into logistics recommendations (`ARCHITECTURE.md` §6). The worker's `headcount.changed` job runs it after every headcount snapshot and stores the result as a `RecommendationSet`. Rules: [`AGENTS.md`](AGENTS.md).

## Usage

```ts
import { generateLogisticsRecommendations } from "@managevent/logistics";

const result = generateLogisticsRecommendations({
  adultsYes: 100,
  childrenYes: 12,
  maybe: 6,
  dietaryBreakdown: { HALAL: 45, NUT_ALLERGY: 2 },
  tableType: "ROUND_10",
  separateKidsTables: true,
  serviceStyle: "PLATED",
  alcoholServed: true,
  cakeProfile: "FULL_SERVE",
  orderLines: [],
  now: new Date(),
});
// result.rulesVersion === LOGISTICS_RULES_VERSION ("1.0.0")
```

- Headcount basis = confirmed adults + confirmed children + a maybe allowance (50% by default, `maybeAllowanceRate`) + a planner buffer (5%, at least 2). `calculateHeadcountBasis()` exposes it on its own.
- `tableType`: `ROUND_10`, `ROUND_8`, `BANQUET_12`. `serviceStyle`: `PLATED`, `BANQUET`, `BUFFET`, `COCKTAIL`. `cakeProfile`: `FULL_SERVE`, `LIGHT_SERVE`.
- `orderLines` are the current quantities and prices by `logisticsKey`; each recommendation item states the current and recommended quantity, the reason and the price delta. After a line's `finalNumbersDueAt` the item is marked advisory only.
- Allergen counts (`NUT_ALLERGY`, `SHELLFISH_ALLERGY`, `OTHER_ALLERGY`) stay separate and are never merged into "other".
