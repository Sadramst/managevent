# Domains and DNS: managevent.com.au

DNS hosted on Cloudflare is recommended, with the proxy off for Vercel records unless configured for it.

| Host                       | Type                 | Target                            | Notes                                                                             |
| -------------------------- | -------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `managevent.com.au` (apex) | A / ALIAS            | Vercel                            | Redirects 301 to `www`                                                            |
| `www`                      | CNAME                | Vercel (`apps/marketing` project) |                                                                                   |
| `invitation`               | CNAME                | Vercel (`apps/invitation`)        |                                                                                   |
| `app`                      | CNAME                | Vercel (`apps/portal`)            |                                                                                   |
| `vendors`                  | CNAME                | Vercel (`apps/vendors`)           |                                                                                   |
| `admin`                    | CNAME                | Vercel (`apps/admin`)             | Consider Cloudflare Access in front                                               |
| `api`                      | CNAME                | Fly.io `syd` (or AWS ALB)         | D-01                                                                              |
| `media`                    | CNAME                | R2 public bucket custom domain    |                                                                                   |
| `*.staging`                | CNAME                | Staging projects                  | Basic auth plus `noindex`                                                         |
| Email                      | MX, SPF, DKIM, DMARC | Workspace mail plus Resend        | Separate subdomains for sending: `mail.` (transactional), `invite.` (invitations) |

- **DMARC:** start with `p=none` for monitoring, then move to `quarantine` and later `reject`.
- **Legacy:** `appilico.com.au` keeps rewrites for `/anniversary/*` and `/e/*` to `invitation.managevent.com.au/legacy/*` (WEBSITE.md §B6.4).
