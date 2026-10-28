# @managevent/marketing

Marketing site: www.managevent.com.au

The public site. It covers SEO landing pages, the ceremony catalogue, packages, venues, the **Ceremony Builder and Cost Estimator** (`/plan`), the AI Event Planner, enquiry and booking forms, and the Memorials hub.

**Status:** Step 2 minimal launch implemented locally, not production-deployed.
Only home, privacy, terms and accessibility are available in EN and FA. The Builder
is deliberately a 404 until real rates are approved. No prices, testimonials,
partner claims or ABN are shown.

Run `pnpm --filter @managevent/marketing dev` (port 3100), `build`, `test`, and
`test:e2e` from the repository root. Browser tests start an isolated mock HTTP API;
they never write production leads or send email. Webpack's extension alias supports
the source-first workspace packages' Node-style `.js` imports.

Configuration names: `API_URL` (server-only), `CONTACT_EMAIL`, `CONTACT_PHONE`.
Contact defaults match the owner's supplied details; a blank phone disables the
phone link. Vercel supplies `VERCEL_ENV`; preview responses and metadata are noindex.
Use separate non-production API configuration for previews.

Fonts are local WOFF2 subsets from Fontsource (Cormorant Garamond and Plus Jakarta
Sans Latin; Vazirmatn Arabic). The licensed Unsplash inspiration image is downloaded
from https://images.unsplash.com/photo-1519741497674-611481863552 and is not presented
as a Managevent event, customer photograph or partnership claim.

Deployment and secret-entry instructions: [../../infra/DEPLOY_RUNBOOK.md](../../infra/DEPLOY_RUNBOOK.md).
