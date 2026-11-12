# Domains and DNS: managevent.com.au

DNS is managed at **VentraIP** (VIPcontrol → Domains → `managevent.com.au` → DNS). Every web hostname points at the one production server, where Caddy obtains the certificates ([`../DEPLOYMENT.md`](../DEPLOYMENT.md), [ADR-0011](../docs/architecture/adr/0011-production-on-single-sydney-vps.md)).

## Records in use

| Host                       | Type | Value             | State                                                                                                  |
| -------------------------- | ---- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `api`                      | `A`  | `139.180.163.128` | Live. Certificate from Let's Encrypt                                                                   |
| `www`                      | `A`  | `139.180.163.128` | Live. Certificate from Let's Encrypt. Also serves the staff console at `/admin`                        |
| `invitation`               | `A`  | `139.180.163.128` | Live. Certificate from ZeroSSL (pinned in the Caddyfile, see Troubleshooting in `DEPLOYMENT.md`)       |
| `managevent.com.au` (apex) | `A`  | `103.42.108.46`   | **Not ours: a parking page.** The owner must change it to `139.180.163.128` (see `DEPLOYMENT.md`, DNS) |

Rules:

- **One server, `A` records only.** There is no CDN in front. Putting one in front changes how the client address is trusted; read "Client address trust model" in `DEPLOYMENT.md` first.
- **No `AAAA` records for now.** Docker's default configuration does not carry IPv6 into containers, so IPv6 visitors would all appear to Caddy as one internal address and share one rate-limit bucket (`DEPLOYMENT.md`, DNS).
- **A new hostname needs three things:** an `A` record, a site block in `infra/vps/Caddyfile`, and its origin in the API's trusted origins (a `NEXT_PUBLIC_*_URL` value, see [`ENVIRONMENTS.md`](ENVIRONMENTS.md)).
- `www` had a 4-hour TTL on its previous record. After a change, test in a private window or flush the local DNS cache before concluding that DNS is wrong.

## Email (only when Resend is switched on)

No email DNS is needed until the owner enables Resend (`DEPLOYMENT.md`, go-live checklist step 8). Resend shows the exact records for the domain; add them **exactly as shown** and do not copy values from anywhere else.

| Purpose | Type  | Name (typical)      | Value                                              |
| ------- | ----- | ------------------- | -------------------------------------------------- |
| DKIM    | `TXT` | `resend._domainkey` | From Resend's domain screen                        |
| Bounces | `MX`  | `send`              | From Resend's domain screen                        |
| SPF     | `TXT` | `send`              | From Resend's domain screen                        |
| DMARC   | `TXT` | `_dmarc`            | `v=DMARC1; p=none` to start, if there is no record |

- Never publish two SPF records at the same name: merge them.
- DMARC starts at `p=none` (monitoring), then moves to `quarantine` and later `reject` once reports are clean.
- The default sender is `hello@managevent.com.au`. A separate sender for invitations (`EMAIL_FROM_INVITATIONS`) on another domain or subdomain needs its own verified domain in Resend.
- Mailboxes that must exist before launch, wherever the owner hosts mail: the public contact address (`CONTACT_EMAIL`), `security@managevent.com.au` ([`../SECURITY.md`](../SECURITY.md)) and the ACME contact `admin@managevent.com.au` (Caddyfile).

## Reserved for apps that are not built

None of these has a DNS record, a Caddy site or a container today. Each will be added to the same server, or decided otherwise, when the app exists.

| Host      | Future use                                                          |
| --------- | ------------------------------------------------------------------- |
| `app`     | Customer portal (`apps/portal`)                                     |
| `vendors` | Vendor portal (`apps/vendors`)                                      |
| `admin`   | Staff app (`apps/admin`). Today the staff console is `www` `/admin` |
| `media`   | Public media bucket custom domain (OPEN_DECISIONS D-04)             |

**Legacy links:** `appilico.com.au` keeps rewrites for `/anniversary/*` and `/e/*` to `invitation.managevent.com.au/legacy/*` (WEBSITE.md §B6.4).
