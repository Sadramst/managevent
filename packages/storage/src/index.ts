/**
 * @managevent/storage
 *
 * Cloudflare R2 media storage utilities (`ARCHITECTURE.md` §9 and `OPEN_DECISIONS.md` D-04):
 * - Two buckets: `public` (`managevent-public`) and `private` (`managevent-private`).
 * - Private bucket objects are served ONLY through short-lived signed URLs (`<= 3600s`).
 * - Public promotion requires `exifStripped: true` and `moderation === "APPROVED"` for guest uploads.
 * - Image/video variant descriptors (`AVIF`, `WEBP`, `H264_1080P`).
 */
import { createHmac } from "node:crypto";
import type { MediaModeration } from "@managevent/types";

export type MediaBucketKind = "PUBLIC" | "PRIVATE";
export type MediaPurposeKind = "WALL" | "COVER" | "GALLERY" | "MUSIC" | "DOCUMENT" | "TRIBUTE";

export interface MediaVariantDescriptor {
  variant: "AVIF" | "WEBP" | "H264_1080P";
  key: string;
  mime: string;
  maxWidth: number;
}

export const MAX_PRIVATE_SIGNED_URL_TTL_SECONDS = 3600 as const;
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 900 as const;

/**
 * Selects the target R2 bucket (`PUBLIC` or `PRIVATE`) based on asset purpose and moderation state.
 * Guest wall/tribute uploads and compliance/invoice documents always start in `PRIVATE`.
 */
export function selectMediaBucket(params: {
  purpose: MediaPurposeKind;
  moderation: MediaModeration;
  exifStripped: boolean;
}): MediaBucketKind {
  if (params.purpose === "DOCUMENT") {
    return "PRIVATE";
  }
  if (params.purpose === "WALL" || params.purpose === "TRIBUTE") {
    if (params.moderation === "APPROVED" && params.exifStripped) {
      return "PUBLIC";
    }
    return "PRIVATE";
  }
  if (!params.exifStripped) {
    return "PRIVATE";
  }
  return "PUBLIC";
}

/**
 * Builds a canonical R2 object key (`events/{eventId}/{purpose}/{assetId}.{ext}`).
 */
export function buildMediaObjectKey(params: {
  purpose: MediaPurposeKind;
  assetId: string;
  extension: string;
  eventId?: string;
}): string {
  const cleanExt = params.extension.replace(/^\./, "").toLowerCase();
  const prefix = params.eventId ? `events/${params.eventId}` : "global";
  return `${prefix}/${params.purpose.toLowerCase()}/${params.assetId}.${cleanExt}`;
}

/**
 * Generates processed variant descriptors (`AVIF`, `WEBP`, or `H264_1080P` for video).
 */
export function getMediaVariants(
  baseKey: string,
  isVideo: boolean = false,
): MediaVariantDescriptor[] {
  const dotIdx = baseKey.lastIndexOf(".");
  const stem = dotIdx !== -1 ? baseKey.slice(0, dotIdx) : baseKey;

  if (isVideo) {
    return [
      {
        variant: "H264_1080P",
        key: `${stem}.1080p.mp4`,
        mime: "video/mp4",
        maxWidth: 1920,
      },
    ];
  }

  return [
    {
      variant: "AVIF",
      key: `${stem}.avif`,
      mime: "image/avif",
      maxWidth: 1920,
    },
    {
      variant: "WEBP",
      key: `${stem}.webp`,
      mime: "image/webp",
      maxWidth: 1920,
    },
  ];
}

export interface SignedUrlParams {
  bucket: MediaBucketKind;
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
  now?: Date;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface SignedUrlResult {
  url: string;
  bucketName: string;
  key: string;
  expiresAt: string;
  method: "PUT" | "GET";
}

function createR2SignedUrl(method: "PUT" | "GET", params: SignedUrlParams): SignedUrlResult {
  const ttl = params.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  if (ttl <= 0 || ttl > MAX_PRIVATE_SIGNED_URL_TTL_SECONDS) {
    throw new RangeError(
      `Signed URL TTL must be between 1 and ${MAX_PRIVATE_SIGNED_URL_TTL_SECONDS} seconds`,
    );
  }

  const accountId = params.accountId ?? process.env.R2_ACCOUNT_ID ?? "mock_r2_account_id";
  const accessKeyId = params.accessKeyId ?? process.env.R2_ACCESS_KEY_ID ?? "mock_r2_access_key_id";
  const secretAccessKey =
    params.secretAccessKey ?? process.env.R2_SECRET_ACCESS_KEY ?? "mock_r2_secret_access_key";

  const bucketName =
    params.bucket === "PUBLIC"
      ? (process.env.R2_BUCKET_PUBLIC_MEDIA ?? "managevent-public")
      : (process.env.R2_BUCKET_PRIVATE_MEDIA ?? "managevent-private");

  const now = params.now ?? new Date();
  const expiresAt = new Date(now.getTime() + ttl * 1000);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalToSign = `${method}\n${bucketName}\n${params.key}\n${amzDate}\n${ttl}\n${params.contentType ?? ""}`;
  const signature = createHmac("sha256", secretAccessKey)
    .update(canonicalToSign, "utf8")
    .digest("hex");

  const encodedKey = params.key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${dateStamp}/auto/s3/aws4_request`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(ttl),
    "X-Amz-SignedHeaders": "host",
    "X-Amz-Signature": signature,
  });

  return {
    url: `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${encodedKey}?${query.toString()}`,
    bucketName,
    key: params.key,
    expiresAt: expiresAt.toISOString(),
    method,
  };
}

/**
 * Generates a short-lived signed `PUT` URL for uploading an object to Cloudflare R2.
 */
export function createSignedUploadUrl(params: SignedUrlParams): SignedUrlResult {
  return createR2SignedUrl("PUT", params);
}

/**
 * Generates a short-lived signed `GET` URL for downloading a private object from Cloudflare R2.
 */
export function createSignedDownloadUrl(params: SignedUrlParams): SignedUrlResult {
  return createR2SignedUrl("GET", params);
}

/**
 * Builds a public CDN URL (`media.managevent.com.au`) ONLY for objects in the `PUBLIC` bucket
 * whose EXIF location data has been stripped (`exifStripped === true`).
 */
export function getPublicMediaUrl(params: {
  bucket: MediaBucketKind;
  key: string;
  exifStripped: boolean;
  cdnBaseUrl?: string;
}): string {
  if (params.bucket !== "PUBLIC") {
    throw new Error("Private bucket objects must be served only through short-lived signed URLs");
  }
  if (!params.exifStripped) {
    throw new Error("Media must have EXIF location data stripped before public serving");
  }
  const base = (
    params.cdnBaseUrl ??
    process.env.NEXT_PUBLIC_MEDIA_CDN_URL ??
    "https://media.managevent.com.au"
  ).replace(/\/$/, "");
  return `${base}/${params.key.replace(/^\//, "")}`;
}
