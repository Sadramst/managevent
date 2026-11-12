# AGENTS.md: packages/storage

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Cloudflare R2 media helpers.** Public or private bucket selection, object key conventions, short-lived SigV4 signed upload and download URLs, and image (AVIF, WebP) and video (H.264 1080p) variant descriptors.

- **Status:** built and unit-tested, but **no app uses it yet**. Hosts paste media links today; uploads and the photo wall are INV-11, which also needs D-03 and D-04 (media residency) decided.
- **Planned users:** `apps/api` (signed URLs), `apps/worker` (EXIF stripping and variants), INV-11, VEN-02.

## Rules

- Private bucket objects are served only through short-lived signed URLs (15 minutes by default, 1 hour at most).
- Guest wall and tribute media stays private until it is approved **and** EXIF-stripped; documents are always private. The worker strips EXIF location data before anything becomes public.
- The signer falls back to placeholder credentials when the `R2_*` variables are missing. Before an app uses it, make it fail closed instead, like Stripe and Resend in `apps/api`.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
