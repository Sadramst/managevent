# @managevent/storage

Cloudflare R2 media storage utilities (`ARCHITECTURE.md` §9): public/private bucket selection, short-lived AWS SigV4 signed upload/download URLs, EXIF-strip guards, and AVIF/WebP/H.264 variant descriptors.

## Usage

```ts
import { createSignedUploadUrl, selectMediaBucket } from "@managevent/storage";

const bucket = selectMediaBucket({
  purpose: "WALL",
  moderation: "PENDING",
  exifStripped: false,
});
const signed = createSignedUploadUrl({
  bucket,
  key: "events/evt_123/wall/med_123.jpg",
  contentType: "image/jpeg",
});
```
