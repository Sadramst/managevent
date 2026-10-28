"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import { Sparkles } from "lucide-react";

interface GateRevealProps {
  theme: InvitationThemeTokens;
  guestName: string;
  experienceMode: "CELEBRATION" | "MEMORIAL";
  isOpenedDefault: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}

export const GateReveal: React.FC<GateRevealProps> = ({
  theme,
  guestName,
  experienceMode,
  isOpenedDefault,
  onOpen,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(isOpenedDefault);
  const [isOpening, setIsOpening] = useState(false);

  const isMemorial = experienceMode === "MEMORIAL";
  const { gate, colors } = theme;

  const handleOpen = () => {
    if (isOpening || isOpen) return;
    setIsOpening(true);
    onOpen();

    // Trigger URL state update (?opened=1) without page reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("opened", "1");
      window.history.replaceState({}, "", url.toString());
    }

    const duration = isMemorial ? 400 : 1600;
    setTimeout(() => {
      setIsOpen(true);
      setIsOpening(false);
    }, duration);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.div
            key="envelope-gate"
            initial={{ opacity: 1 }}
            exit={
              isMemorial
                ? { opacity: 0, transition: { duration: 0.4 } }
                : { opacity: 0, scale: 1.05, transition: { duration: 0.8, delay: 0.8 } }
            }
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backgroundColor: colors.bg,
              backgroundImage: `radial-gradient(${colors.accent} 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
            }}
          >
            {/* The Envelope / Gate Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative w-full max-w-md overflow-hidden rounded-sheet border shadow-2xl backdrop-blur-xl"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.rule,
                boxShadow: `0 25px 50px -12px ${colors.accent}30`,
              }}
            >
              {/* Envelope Flap (Celebration) */}
              {!isMemorial && (
                <motion.div
                  animate={isOpening ? { rotateX: 180, opacity: 0 } : { rotateX: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="h-28 w-full border-b"
                  style={{
                    transformOrigin: "top",
                    backgroundColor: colors.bgWarm,
                    borderColor: colors.rule,
                  }}
                />
              )}

              {/* Envelope Body / Card Face */}
              <div className="p-8 text-center sm:p-10">
                <div
                  className="mb-4 inline-flex items-center justify-center gap-1.5 rounded-chip px-4 py-1 text-xs font-medium border"
                  style={{
                    backgroundColor: colors.bgWarm,
                    borderColor: colors.rule,
                    color: colors.inkMuted,
                  }}
                >
                  <Sparkles className="h-3 w-3 text-accent" />
                  <span>{isMemorial ? "Personal Invitation" : "Exclusive Invitation"}</span>
                </div>

                <p
                  className="font-serif text-sm uppercase tracking-widest text-ink-muted"
                  style={{ color: colors.inkMuted }}
                >
                  {isMemorial ? "In remembrance with" : "Warmly presented to"}
                </p>

                <h1
                  className="mt-2 font-display text-2xl font-semibold tracking-wide sm:text-3xl"
                  style={{ color: colors.accentInk }}
                >
                  {guestName}
                </h1>

                {/* Wax Seal or Open Button */}
                <div className="mt-8 flex flex-col items-center justify-center">
                  <motion.button
                    type="button"
                    onClick={handleOpen}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    animate={
                      isOpening
                        ? {
                            scale: [1, 1.2, 0],
                            opacity: [1, 0.8, 0],
                            transition: { duration: 0.6 },
                          }
                        : { scale: 1 }
                    }
                    className="group relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-transform"
                    style={{
                      backgroundColor: gate.sealColor,
                      boxShadow: `0 10px 25px -5px ${gate.sealColor}60`,
                    }}
                    aria-label={isMemorial ? "Open Invitation" : "Break Seal and Open Invitation"}
                  >
                    <span className="font-serif text-xs font-bold uppercase tracking-wider text-white">
                      {isOpening ? "…" : isMemorial ? "Open" : "Open"}
                    </span>
                    <span
                      className="absolute -bottom-7 whitespace-nowrap text-[11px] font-medium"
                      style={{ color: colors.inkMuted }}
                    >
                      {isMemorial ? "Tap to open" : "Tap to open"}
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content behind the Gate */}
      <div className={!isOpen ? "pointer-events-none select-none blur-sm" : ""}>{children}</div>
    </div>
  );
};
