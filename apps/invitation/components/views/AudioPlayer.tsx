"use client";

import React, { useEffect, useRef, useState } from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import { Volume2, VolumeX, Music } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface AudioPlayerProps {
  audioUrl?: string | undefined;
  audioTitle?: string | undefined;
  theme: InvitationThemeTokens;
  locale: "en" | "fa";
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  audioTitle,
  theme,
  locale,
}) => {
  const { colors } = theme;
  const isFa = locale === "fa";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isMutedParam = searchParams.get("muted") === "1";
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(isMutedParam);

  useEffect(() => {
    setIsMuted(isMutedParam);
    if (audioRef.current) {
      audioRef.current.muted = isMutedParam;
    }
  }, [isMutedParam]);

  if (!audioUrl) return null;

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
      if (!nextMuted && audioRef.current.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }

    // Persist mute state in URL without full page reload
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (nextMuted) {
      current.set("muted", "1");
    } else {
      current.delete("muted");
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  return (
    <div className="fixed bottom-4 end-4 z-40">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute music" : "Mute music"}
        className="group relative flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.rule,
          color: colors.accentInk,
        }}
      >
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-transform ${
            isPlaying && !isMuted ? "animate-spin" : ""
          }`}
          style={{
            backgroundColor: `${colors.accent}20`,
            animationDuration: "6s",
          }}
        >
          <Music className="h-3.5 w-3.5" style={{ color: colors.accent }} />
        </div>

        {audioTitle && (
          <span className="hidden font-serif text-xs font-medium sm:inline-block max-w-[120px] truncate">
            {audioTitle}
          </span>
        )}

        <div className="flex h-5 w-5 items-center justify-center">
          {isMuted ? (
            <VolumeX className="h-4 w-4" style={{ color: colors.inkMuted }} />
          ) : (
            <Volume2 className="h-4 w-4" style={{ color: colors.accent }} />
          )}
        </div>
      </button>
    </div>
  );
};
