import { ImageResponse } from "next/og";
import { getInvitationShell } from "@managevent/i18n";
import { celebrationTokens } from "@managevent/ui/tokens";

// Owner: PUBLIC. The site-wide share image (same composition as www). Guest pages must
// not inherit an image that names a guest: this one carries the product name only.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const meta = getInvitationShell("en").meta;
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
      <div style={{ fontSize: 94 }}>{meta.siteName}</div>
      <div style={{ fontSize: 40, marginTop: 30, color: celebrationTokens.ink }}>
        {meta.description}
      </div>
    </div>,
    size,
  );
}
