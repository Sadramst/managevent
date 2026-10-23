"use client";

import React, { useEffect, useState } from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import { toPersianDigits } from "@/lib/i18n";

interface CountdownSectionProps {
  targetDateISO: string;
  theme: InvitationThemeTokens;
  experienceMode: "CELEBRATION" | "MEMORIAL";
  locale: "en" | "fa";
}

export const CountdownSection: React.FC<CountdownSectionProps> = ({
  targetDateISO,
  theme,
  experienceMode,
  locale,
}) => {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    passed: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    passed: false,
  });

  const isMemorial = experienceMode === "MEMORIAL";
  const { colors } = theme;

  useEffect(() => {
    setMounted(true);
    const targetMs = new Date(targetDateISO).getTime();

    const update = () => {
      const nowMs = Date.now();
      const diffMs = targetMs - nowMs;

      if (diffMs <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: true });
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, passed: false });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDateISO]);

  if (isMemorial) {
    return (
      <div className="my-6 text-center">
        <p className="font-serif text-sm tracking-widest text-ink-muted" style={{ color: colors.inkMuted }}>
          {locale === "fa" ? "گردهمایی برای گرامیداشت یاد و خاطره" : "A gathering in loving memory"}
        </p>
      </div>
    );
  }

  const formatDigit = (num: number) => {
    const padded = String(num).padStart(2, "0");
    return locale === "fa" ? toPersianDigits(padded) : padded;
  };

  const labels = {
    days: locale === "fa" ? "روز" : "Days",
    hours: locale === "fa" ? "ساعت" : "Hours",
    minutes: locale === "fa" ? "دقیقه" : "Mins",
    seconds: locale === "fa" ? "ثانیه" : "Secs",
  };

  return (
    <div className="relative z-10 my-8 mx-auto max-w-md px-4">
      {timeLeft.passed ? (
        <div
          className="rounded-panel border p-4 text-center font-serif text-sm sm:text-base"
          style={{
            backgroundColor: `${colors.bgWarm}80`,
            borderColor: colors.rule,
            color: colors.accentInk,
          }}
        >
          {locale === "fa" ? "سپاس از همراهی شما در این روز خاطره‌انگیز" : "Thank you for celebrating with us!"}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
          {[
            { value: timeLeft.days, label: labels.days },
            { value: timeLeft.hours, label: labels.hours },
            { value: timeLeft.minutes, label: labels.minutes },
            { value: timeLeft.seconds, label: labels.seconds },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-control border p-2 sm:p-3 backdrop-blur-md shadow-sm"
              style={{
                backgroundColor: `${colors.surface}CC`,
                borderColor: colors.rule,
              }}
            >
              <div
                className="font-display text-xl font-bold sm:text-2xl"
                style={{ color: colors.accentInk }}
              >
                {mounted ? formatDigit(item.value) : "--"}
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted sm:text-xs" style={{ color: colors.inkMuted }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
