"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { decodeQrPixels, loadQrDecoder } from "./qr-decode";

/** The parts of the Shape Detection API this hook uses (not yet in TypeScript's DOM library). */
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

/** Reads the QR code in the current video frame, or null when there is none. */
type FrameReader = (video: HTMLVideoElement) => Promise<string | null>;

function detectorConstructor(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  return typeof candidate === "function" ? candidate : null;
}

/** The browser's own detector, where it exists and reads QR codes (Chrome on Android, macOS). */
async function nativeReader(): Promise<FrameReader | null> {
  const Detector = detectorConstructor();
  if (!Detector) return null;
  try {
    const formats = (await Detector.getSupportedFormats?.()) ?? ["qr_code"];
    if (!formats.includes("qr_code")) return null;
    const detector = new Detector({ formats: ["qr_code"] });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

/** Frames are scaled down to this before decoding: plenty for a pass, and quick on a phone. */
const MAX_FRAME_EDGE = 720;

/**
 * Everywhere else (iPhone and iPad, Firefox, Chrome on Windows): draw the frame on a canvas and
 * decode its pixels in JavaScript. Throws when the decoder cannot be loaded.
 */
async function canvasReader(): Promise<FrameReader> {
  await loadQrDecoder();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No 2D canvas");
  return async (video) => {
    const { videoWidth, videoHeight } = video;
    if (videoWidth === 0 || videoHeight === 0) return null;
    const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(videoWidth, videoHeight));
    const width = Math.max(1, Math.round(videoWidth * scale));
    const height = Math.max(1, Math.round(videoHeight * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    return decodeQrPixels(context.getImageData(0, 0, width, height).data, width, height);
  };
}

export interface PassScanner {
  /** True when this browser can open a camera. Hide the button otherwise. */
  supported: boolean;
  active: boolean;
  /** True after the camera was refused or could not be opened. */
  denied: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  start: () => void;
  stop: () => void;
}

const SCAN_EVERY_MS = 250;
/** The same code held in front of the camera is reported once, then ignored for this long. */
const SAME_CODE_PAUSE_MS = 4_000;

/**
 * Camera scanning of QR passes. It uses the browser's own `BarcodeDetector` where there is
 * one, and a JavaScript decoder everywhere else, so an iPhone at the door scans passes as well
 * as an Android phone does. Feature-detected after mount (so server and first client render
 * agree): where there is no camera access at all (some in-app browsers), `supported` stays
 * false and the door list and typed codes still do the whole job.
 *
 * `onCode` is called once per code seen. The camera is released on stop and on unmount.
 */
export function usePassScanner(onCode: (value: string) => void): PassScanner {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [denied, setDenied] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRef = useRef<{ value: string; at: number } | null>(null);
  const onCodeRef = useRef(onCode);
  /** Bumped by every start and stop, so a start that is still opening the camera can tell it was cancelled. */
  const sessionRef = useRef(0);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (typeof navigator.mediaDevices?.getUserMedia === "function") setSupported(true);
  }, []);

  const release = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    release();
    setActive(false);
  }, [release]);

  const start = useCallback(() => {
    const video = videoRef.current;
    if (!video || typeof navigator.mediaDevices?.getUserMedia !== "function") return;
    sessionRef.current += 1;
    const session = sessionRef.current;
    release();
    setDenied(false);

    const open = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (session !== sessionRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      const read = (await nativeReader()) ?? (await canvasReader());
      if (session !== sessionRef.current) return;
      setActive(true);

      let reading = false;
      timerRef.current = setInterval(() => {
        if (reading || video.readyState < 2) return;
        reading = true;
        read(video)
          .then((value) => {
            if (!value || session !== sessionRef.current) return;
            const now = Date.now();
            const last = lastRef.current;
            if (last && last.value === value && now - last.at < SAME_CODE_PAUSE_MS) return;
            lastRef.current = { value, at: now };
            onCodeRef.current(value);
          })
          .catch(() => undefined)
          .finally(() => {
            reading = false;
          });
      }, SCAN_EVERY_MS);
    };

    // Refused, no camera, or the decoder could not be loaded: say so and fall back to the list.
    open().catch(() => {
      if (session !== sessionRef.current) return;
      release();
      setDenied(true);
      setActive(false);
    });
  }, [release]);

  useEffect(() => stop, [stop]);

  return { supported, active, denied, videoRef, start, stop };
}
