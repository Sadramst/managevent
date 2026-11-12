"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GATE_OPENED_EVENT } from "@/components/gate/Gate";

const MAX_VOLUME = 0.6;
const FADE_MS = 2000;
const FADE_STEP_MS = 100;

export interface MusicControlProps {
  /** The host's own track (an HTTPS URL they have confirmed they hold the rights to). */
  src: string;
  title: string | null;
  /**
   * Start with the tap that opens the gate. Celebration events only; a memorial's music waits
   * for the guest to press play.
   */
  startWithGate: boolean;
  copy: { play: string; pause: string; nowPlaying: string };
}

function isMutedInUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("muted") === "1";
  } catch {
    return false;
  }
}

/** The guest's choice lives in the URL (`?muted=1`), never in storage. */
function rememberMuted(muted: boolean): void {
  try {
    const url = new URL(window.location.href);
    if (muted) url.searchParams.set("muted", "1");
    else url.searchParams.delete("muted");
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // Some embedded browsers refuse history changes; playback still works.
  }
}

/**
 * Background music with a persistent play and pause control.
 *
 * Nothing is fetched or played until the guest taps (the gate or this button), which is also
 * what browsers require. It fades in to a modest volume, loops, and pauses while the tab is
 * hidden.
 */
export function MusicControl({ src, title, startWithGate, copy }: MusicControlProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const fade = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeOnReturn = useRef(false);
  const [playing, setPlaying] = useState(false);

  const stopFade = useCallback(() => {
    if (fade.current) clearInterval(fade.current);
    fade.current = null;
  }, []);

  const play = useCallback(() => {
    const element = audio.current;
    if (!element) return;
    stopFade();
    element.volume = 0;
    element
      .play()
      .then(() => {
        const step = MAX_VOLUME / (FADE_MS / FADE_STEP_MS);
        fade.current = setInterval(() => {
          const next = Math.min(MAX_VOLUME, element.volume + step);
          element.volume = next;
          if (next >= MAX_VOLUME) stopFade();
        }, FADE_STEP_MS);
      })
      .catch(() => {
        // Blocked or the track could not load: stay paused; the button remains.
      });
  }, [stopFade]);

  const pause = useCallback(() => {
    stopFade();
    audio.current?.pause();
  }, [stopFade]);

  useEffect(() => {
    const onGateOpened = () => {
      if (startWithGate && !isMutedInUrl()) play();
    };
    const onVisibility = () => {
      const element = audio.current;
      if (!element) return;
      if (document.hidden) {
        resumeOnReturn.current = !element.paused;
        pause();
      } else if (resumeOnReturn.current) {
        resumeOnReturn.current = false;
        play();
      }
    };
    window.addEventListener(GATE_OPENED_EVENT, onGateOpened);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(GATE_OPENED_EVENT, onGateOpened);
      document.removeEventListener("visibilitychange", onVisibility);
      stopFade();
    };
  }, [pause, play, startWithGate, stopFade]);

  const toggle = () => {
    if (playing) {
      pause();
      rememberMuted(true);
    } else {
      play();
      rememberMuted(false);
    }
  };

  return (
    <div className="inv-music inv-js-only">
      <audio
        ref={audio}
        src={src}
        preload="none"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        className="inv-music-button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? copy.pause : copy.play}
        title={title ? copy.nowPlaying.replace("{title}", title) : undefined}
      >
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
    </div>
  );
}
