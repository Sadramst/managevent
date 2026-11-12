# @managevent/storage

Cloudflare R2 media helpers (`ARCHITECTURE.md` §9): public or private bucket selection, object keys (`events/{eventId}/{purpose}/{assetId}.{ext}`, or `global/...` without an event), short-lived SigV4 signed upload and download URLs, a public CDN URL builder that refuses private or unstripped objects, and AVIF, WebP and H.264 variant descriptors.

> **Not used by any app yet.** Media uploads and the photo wall are INV-11 in [`ROADMAP.md`](../../ROADMAP.md). Rules: [`AGENTS.md`](AGENTS.md).

## Usage

```ts
import { buildMediaObjectKey, createSignedUploadUrl, selectMediaBucket } from "@managevent/storage";

const bucket = selectMediaBucket({ purpose: "WALL", moderation: "PENDING", exifStripped: false }); // "PRIVATE"
const key = buildMediaObjectKey({
  purpose: "WALL",
  eventId: "evt_123",
  assetId: "med_123",
  extension: "jpg",
});
const signed = createSignedUploadUrl({ bucket, key, contentType: "image/jpeg" }); // PUT, 15 minutes
```

- Environment: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PUBLIC_MEDIA`, `R2_BUCKET_PRIVATE_MEDIA`; `getPublicMediaUrl()` uses `NEXT_PUBLIC_MEDIA_CDN_URL`.
- When the `R2_*` credentials are missing the signer uses placeholder values and produces URLs that will not work. It must fail closed before any app relies on it.
