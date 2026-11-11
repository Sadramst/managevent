"use client";

import React from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import type { ViewMode } from "@/lib/types";
import { BookOpen, Clock, Image as ImageIcon } from "lucide-react";

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  theme: InvitationThemeTokens;
  hasGallery: boolean;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  currentMode,
  onChange,
  theme,
  hasGallery,
}) => {
  const { colors } = theme;

  const tabs: Array<{ id: ViewMode; labelEn: string; icon: React.ReactNode }> = [
    {
      id: "story",
      labelEn: "Story",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "timeline",
      labelEn: "Schedule",
      icon: <Clock className="h-4 w-4" />,
    },
    ...(hasGallery
      ? [
          {
            id: "gallery" as ViewMode,
            labelEn: "Gallery",
            icon: <ImageIcon className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="relative z-10 flex justify-center px-4 py-4">
      <div
        className="inline-flex items-center gap-1 rounded-full border p-1 shadow-sm backdrop-blur-md"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.rule,
        }}
      >
        {tabs.map((tab) => {
          const isActive = currentMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                isActive ? "shadow-xs" : "opacity-70 hover:opacity-100"
              }`}
              style={{
                backgroundColor: isActive ? colors.accent : "transparent",
                color: isActive ? "#FFFFFF" : colors.accentInk,
              }}
            >
              {tab.icon}
              <span>{tab.labelEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
