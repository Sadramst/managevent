# AGENTS.md: packages/storage

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Cloudflare R2 media**. Signed upload and download URLs, bucket selection (public or private), key conventions, and image or video variant descriptors.

- **Built by:** FND-13 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Private bucket objects are served only through short-lived signed URLs. Strip EXIF location data before anything is public (in the worker).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
