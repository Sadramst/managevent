import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { decodeQrPixels } from "./qr-decode";

/** The shape of a real pass payload: `MV1.{passId}.{sig}` (78 characters). */
const PASS = "MV1.pass_0193a1cf-9ce7-7b05-8cfa-bed80bbc3b1c.Qm9yZGVyX2NvbGxpZV9wYXNzX3NpZzAx";

/** Draws a QR code the way a camera frame holds it: RGBA pixels, dark on light, with a margin. */
function frameOf(text: string, scale: number, margin: number) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const side = (modules.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (!modules.get(row, column)) continue;
      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          const at = (((row + margin) * scale + y) * side + (column + margin) * scale + x) * 4;
          pixels[at] = 0;
          pixels[at + 1] = 0;
          pixels[at + 2] = 0;
        }
      }
    }
  }
  return { pixels, side };
}

describe("decodeQrPixels (camera scanning without BarcodeDetector)", () => {
  it("reads a pass from a frame, exactly as it was issued", async () => {
    const { pixels, side } = frameOf(PASS, 6, 4);
    await expect(decodeQrPixels(pixels, side, side)).resolves.toBe(PASS);
  });

  it("reads a small code too", async () => {
    const { pixels, side } = frameOf(PASS, 3, 4);
    await expect(decodeQrPixels(pixels, side, side)).resolves.toBe(PASS);
  });

  it("answers null for a frame with no code in it", async () => {
    const blank = new Uint8ClampedArray(200 * 200 * 4).fill(255);
    await expect(decodeQrPixels(blank, 200, 200)).resolves.toBeNull();
  });
});
