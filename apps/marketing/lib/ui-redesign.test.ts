import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventEstimator } from "../components/event-estimator";

describe("redesign asset parity and estimator UI", () => {
  it("keeps app icon.svg files synced with the shared brand mark", () => {
    const brandIcon = readFileSync(
      resolve(process.cwd(), "../../packages/ui/src/brand/icon.svg"),
      "utf8",
    ).trim();
    const marketingIcon = readFileSync(resolve(process.cwd(), "app/icon.svg"), "utf8").trim();
    const invitationIcon = readFileSync(
      resolve(process.cwd(), "../invitation/app/icon.svg"),
      "utf8",
    ).trim();

    expect(marketingIcon).toBe(brandIcon);
    expect(invitationIcon).toBe(brandIcon);
    expect(brandIcon).toContain("M12 51.5c4-2 16-2 24 0");
  });

  it("renders EventEstimator with one-tap guest presets, category pills, breakdown bar, and summary chips", () => {
    const html = renderToStaticMarkup(React.createElement(EventEstimator, { locale: "en" }));
    expect(html).toContain('class="estimator-cat-pills"');
    expect(html).toContain('class="estimator-cat-pill"');
    expect(html).toContain('class="estimator-presets"');
    for (const preset of [50, 100, 150, 250]) {
      expect(html).toContain(`>${preset}</button>`);
    }
    expect(html).toContain('class="estimator-breakdown"');
    expect(html).toContain("Base coordination");
    expect(html).toContain("Guest allocation");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('class="pills estimator-summary-chips"');
    expect(html).toContain("Signature");
    expect(html).toContain("Perth metro");
  });

  it("defines editorial arch Open Graph metadata on both marketing and invitation apps", () => {
    const marketingOg = readFileSync(resolve(process.cwd(), "app/opengraph-image.tsx"), "utf8");
    const invitationOg = readFileSync(
      resolve(process.cwd(), "../invitation/app/opengraph-image.tsx"),
      "utf8",
    );

    expect(marketingOg).toContain("celebrationTokens");
    expect(marketingOg).toContain("marketing.launchTitle");
    expect(marketingOg).toContain("M12 51.5c4-2 16-2 24 0");
    expect(invitationOg).toContain("celebrationTokens");
    expect(invitationOg).toContain("getInvitationShell");
    expect(invitationOg).toContain("M12 51.5c4-2 16-2 24 0");
  });
});
