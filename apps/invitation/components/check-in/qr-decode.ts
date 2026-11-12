/**
 * Reads a QR code out of raw camera pixels, for browsers without the built-in
 * `BarcodeDetector` (Safari and every browser on iPhone and iPad, Firefox, Chrome on Windows).
 *
 * The decoder (`jsqr`, plain JavaScript, no network calls) is loaded on first use, so it is
 * only downloaded by a door device that actually needs it.
 */
type JsQr = typeof import("jsqr").default;

/** `jsqr` is a CommonJS bundle: depending on the bundler its function is one or two `default`s deep. */
function resolveDecoder(loaded: unknown): JsQr {
  let candidate: unknown = loaded;
  for (let depth = 0; depth < 3 && typeof candidate !== "function"; depth += 1) {
    candidate = (candidate as { default?: unknown } | null | undefined)?.default;
  }
  if (typeof candidate !== "function") throw new Error("The QR decoder did not load");
  return candidate as JsQr;
}

let decoder: Promise<JsQr> | null = null;

/** Loads the decoder once. A failed load (offline) is retried on the next call. */
export function loadQrDecoder(): Promise<JsQr> {
  decoder ??= import("jsqr").then(resolveDecoder).catch((error: unknown) => {
    decoder = null;
    throw error;
  });
  return decoder;
}

/**
 * The text of the QR code in an RGBA frame (`width * height * 4` bytes), or null when the
 * frame holds none. Passes are dark on light, so inverted codes are not tried: that halves the
 * work per frame on a phone.
 */
export async function decodeQrPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<string | null> {
  const decode = await loadQrDecoder();
  const found = decode(pixels, width, height, { inversionAttempts: "dontInvert" });
  const value = found?.data.trim() ?? "";
  return value.length > 0 ? value : null;
}
