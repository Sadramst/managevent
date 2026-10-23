import { describe, expect, it } from "vitest";
import {
  buildMediaObjectKey,
  createSignedDownloadUrl,
  createSignedUploadUrl,
  getMediaVariants,
  getPublicMediaUrl,
  selectMediaBucket,
} from "./index.js";

describe("@managevent/storage", () => {
  it("selects PRIVATE vs PUBLIC buckets accurately based on purpose, moderation and EXIF stripping", () => {
    expect(
      selectMediaBucket({ purpose: "DOCUMENT", moderation: "APPROVED", exifStripped: true }),
    ).toBe("PRIVATE");
    expect(selectMediaBucket({ purpose: "WALL", moderation: "PENDING", exifStripped: true })).toBe(
      "PRIVATE",
    );
    expect(
      selectMediaBucket({ purpose: "WALL", moderation: "APPROVED", exifStripped: false }),
    ).toBe("PRIVATE");
    expect(selectMediaBucket({ purpose: "WALL", moderation: "APPROVED", exifStripped: true })).toBe(
      "PUBLIC",
    );
    expect(
      selectMediaBucket({ purpose: "COVER", moderation: "APPROVED", exifStripped: true }),
    ).toBe("PUBLIC");
  });

  it("builds object keys and image/video variants (AVIF, WEBP, H264_1080P)", () => {
    const key = buildMediaObjectKey({
      purpose: "WALL",
      assetId: "med_0192b4",
      extension: ".jpg",
      eventId: "evt_0192b4",
    });
    expect(key).toBe("events/evt_0192b4/wall/med_0192b4.jpg");

    const imageVariants = getMediaVariants(key, false);
    expect(imageVariants.map((v) => v.variant)).toEqual(["AVIF", "WEBP"]);

    const videoVariants = getMediaVariants(key, true);
    expect(videoVariants[0]?.variant).toBe("H264_1080P");
    expect(videoVariants[0]?.key).toBe("events/evt_0192b4/wall/med_0192b4.1080p.mp4");
  });

  it("generates short-lived R2 signed upload/download URLs and blocks unstripped or private public URLs", () => {
    const now = new Date("2026-10-23T04:00:00.000Z");
    const upload = createSignedUploadUrl({
      bucket: "PRIVATE",
      key: "events/evt_1/wall/med_1.jpg",
      contentType: "image/jpeg",
      expiresInSeconds: 600,
      now,
    });
    expect(upload.method).toBe("PUT");
    expect(upload.bucketName).toBe("managevent-private");
    expect(upload.url).toContain("X-Amz-Signature=");

    const download = createSignedDownloadUrl({
      bucket: "PRIVATE",
      key: "events/evt_1/document/med_doc.pdf",
      now,
    });
    expect(download.method).toBe("GET");
    expect(download.url).toContain("X-Amz-Expires=900");

    // Reject TTL > 3600s
    expect(() =>
      createSignedDownloadUrl({
        bucket: "PRIVATE",
        key: "events/evt_1/document/med_doc.pdf",
        expiresInSeconds: 7200,
      }),
    ).toThrow(RangeError);

    // Public URL checks
    expect(() =>
      getPublicMediaUrl({
        bucket: "PRIVATE",
        key: "events/evt_1/wall/med_1.avif",
        exifStripped: true,
      }),
    ).toThrow("Private bucket objects must be served only through short-lived signed URLs");

    expect(() =>
      getPublicMediaUrl({
        bucket: "PUBLIC",
        key: "events/evt_1/wall/med_1.avif",
        exifStripped: false,
      }),
    ).toThrow("Media must have EXIF location data stripped before public serving");

    expect(
      getPublicMediaUrl({
        bucket: "PUBLIC",
        key: "events/evt_1/wall/med_1.avif",
        exifStripped: true,
        cdnBaseUrl: "https://media.managevent.com.au",
      }),
    ).toBe("https://media.managevent.com.au/events/evt_1/wall/med_1.avif");
  });
});
