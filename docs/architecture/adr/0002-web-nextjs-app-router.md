# ADR-0002: Next.js App Router, one app per subdomain

- **Status:** Accepted. The hosting clause (one Vercel project per app, functions in `syd1`) is superseded by [ADR-0011](0011-production-on-single-sydney-vps.md): the web apps run as containers on the Sydney VPS. Amended in practice: the staff console is served at `www.managevent.com.au/admin` from `apps/marketing` (ADR-0011), not as a separate `admin.` app; `portal` and `vendors` are not built yet. Next.js is 16.4.2.
- **Context:** The five web surfaces have very different audiences, auth models, caching and release cadences: public SEO, private guest pages, customers, vendors and staff.
- **Decision:** Five separate Next.js apps (`marketing`, `invitation`, `portal`, `vendors`, `admin`), each its own Vercel project on its own subdomain, with functions in `syd1`. Use the current Next.js major at scaffold time (16.x as of October 2026). Shared UI comes from `packages/ui`.
- **Rejected:** A single multi-zone app. It couples deploys and makes privacy rules (for example `noindex` everywhere on `invitation.`) easy to break by accident.
- **Consequences:**
  - SSO uses a cookie on `.managevent.com.au` (ADR-0005).
  - Cross-app links use `NEXT_PUBLIC_*_URL` environment variables. Never hard-code hosts.
