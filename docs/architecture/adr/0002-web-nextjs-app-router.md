# ADR-0002: Next.js App Router, one app per subdomain

- **Status:** Accepted
- **Context:** The five web surfaces have very different audiences, auth models, caching and release cadences: public SEO, private guest pages, customers, vendors and staff.
- **Decision:** Five separate Next.js apps (`marketing`, `invitation`, `portal`, `vendors`, `admin`), each its own Vercel project on its own subdomain, with functions in `syd1`. Use the current Next.js major at scaffold time (16.x as of October 2026). Shared UI comes from `packages/ui`.
- **Rejected:** A single multi-zone app. It couples deploys and makes privacy rules (for example `noindex` everywhere on `invitation.`) easy to break by accident.
- **Consequences:**
  - SSO uses a cookie on `.managevent.com.au` (ADR-0005).
  - Cross-app links use `NEXT_PUBLIC_*_URL` environment variables. Never hard-code hosts.
