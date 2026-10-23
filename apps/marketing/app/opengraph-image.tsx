import { ImageResponse } from "next/og";
import { celebrationTokens } from "@managevent/ui/tokens";
import { t } from "@managevent/i18n";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 90,
        width: "100%",
        height: "100%",
        background: celebrationTokens.surface,
        color: celebrationTokens.primary,
        border: `12px solid ${celebrationTokens.accent}`,
      }}
    >
      <div style={{ fontSize: 94 }}>Managevent</div>
      <div style={{ fontSize: 44, marginTop: 30 }}>{t("en", "marketing.launchTitle")}</div>
      <div style={{ fontSize: 30, marginTop: 45 }}>{t("en", "marketing.launchLocation")}</div>
    </div>,
    size,
  );
}
