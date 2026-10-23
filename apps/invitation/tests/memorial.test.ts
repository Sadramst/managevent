import { describe, it, expect } from "vitest";
import { isThemeCompatibleWithMode, getDefaultThemeForMode } from "@managevent/ui/themes";
import { invitationStore } from "../lib/invitation-store";

describe("Memorial Mode Safety and Theme Rules", () => {
  it("enforces memorial theme compatibility", () => {
    // Memorial mode allows only memorial themes
    expect(isThemeCompatibleWithMode("memorial-alabaster", "MEMORIAL")).toBe(true);
    expect(isThemeCompatibleWithMode("memorial-slate", "MEMORIAL")).toBe(true);
    expect(isThemeCompatibleWithMode("royal-ivory", "MEMORIAL")).toBe(false);
    expect(isThemeCompatibleWithMode("persian-azure", "MEMORIAL")).toBe(false);

    // Celebration mode rejects memorial themes
    expect(isThemeCompatibleWithMode("royal-ivory", "CELEBRATION")).toBe(true);
    expect(isThemeCompatibleWithMode("memorial-alabaster", "CELEBRATION")).toBe(false);
  });

  it("returns appropriate default theme for mode", () => {
    expect(getDefaultThemeForMode("MEMORIAL")).toBe("memorial-alabaster");
    expect(getDefaultThemeForMode("CELEBRATION")).toBe("royal-ivory");
  });

  it("initializes memorial seed events in Memorial Mode", () => {
    const memorialEvent = invitationStore.getEventById("evt_memorial_demo");
    expect(memorialEvent).not.toBeNull();
    expect(memorialEvent?.experienceMode).toBe("MEMORIAL");
    expect(memorialEvent?.gateStyle).toBe("plain-fade");
    expect(memorialEvent?.themeId.startsWith("memorial-")).toBe(true);
  });
});
