# @managevent/logistics

Pure, deterministic, versioned RSVP headcount → logistics recommendation engine (`ARCHITECTURE.md` §6).

## Usage

```ts
import { generateLogisticsRecommendations } from "@managevent/logistics";

const recommendations = generateLogisticsRecommendations({
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
```
