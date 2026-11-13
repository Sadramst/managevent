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
        width: "100%",
        height: "100%",
        padding: 28,
        background: celebrationTokens.surface,
        color: celebrationTokens.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "56px 72px",
          background: celebrationTokens.surfaceRaised,
          border: `3px solid ${celebrationTokens.accent}`,
          borderRadius: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: celebrationTokens.accentStrong,
            }}
          >
            {t("en", "marketing.launchLocation")}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 600,
              color: celebrationTokens.primary,
              marginTop: 14,
              lineHeight: 1.05,
            }}
          >
            Managevent
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 38,
              color: celebrationTokens.ink,
              marginTop: 24,
              lineHeight: 1.3,
            }}
          >
            {t("en", "marketing.launchTitle")}
          </div>
          <div
            style={{
              display: "flex",
              width: 96,
              height: 3,
              background: celebrationTokens.accent,
              marginTop: 32,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 260,
            height: 360,
            background: celebrationTokens.surface,
            border: `2px solid ${celebrationTokens.accent}`,
            borderTopLeftRadius: 180,
            borderTopRightRadius: 180,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            padding: 32,
          }}
        >
          <svg
            width="120"
            height="140"
            viewBox="0 0 48 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 53.5V24a21 21 0 0 1 42 0v29.5Z"
              fill={celebrationTokens.primary}
              stroke={celebrationTokens.primary}
              strokeWidth="1.5"
            />
            <path
              d="M8.5 49V24a15.5 15.5 0 0 1 31 0v25"
              fill="none"
              stroke={celebrationTokens.accent}
              strokeWidth="1.2"
            />
            <path
              d="M12 51.5c4-2 16-2 24 0"
              fill="none"
              stroke={celebrationTokens.accent}
              strokeWidth="1"
              strokeLinecap="round"
            />
            <path
              d="M16 43.5V27l8 10.5L32 27v16.5"
              fill="none"
              stroke={celebrationTokens.accent}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>,
    size,
  );
}
