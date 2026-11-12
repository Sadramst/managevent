"use client";

import { useState, type CSSProperties } from "react";
import { getExperienceMode, t, type TranslationKey } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import { getCssVariablesForMode } from "@managevent/ui/tokens";

export interface EstimateTransferPayload {
  ceremonySlug: string;
  guests: number;
  summaryText: string;
}

type Tier = "ESSENTIAL" | "SIGNATURE" | "LUXE";
type Zone = "METRO" | "OUTER" | "REGIONAL";

// DECISION-NEEDED(pricing): these rates are working assumptions, not founder-approved prices
// (docs/business/PRICING_MODEL.md). The estimator is labelled indicative everywhere it appears.
const CATEGORY_RATES_CENTS: Record<
  string,
  { baseFixedCents: number; perGuestCents: Record<Tier, number> }
> = {
  wedding: {
    baseFixedCents: 280000,
    perGuestCents: { ESSENTIAL: 14500, SIGNATURE: 23500, LUXE: 36000 },
  },
  "birthday-milestone": {
    baseFixedCents: 140000,
    perGuestCents: { ESSENTIAL: 9500, SIGNATURE: 16500, LUXE: 25500 },
  },
  "gala-dinner": {
    baseFixedCents: 240000,
    perGuestCents: { ESSENTIAL: 13500, SIGNATURE: 21500, LUXE: 32000 },
  },
  "celebration-of-life": {
    baseFixedCents: 110000,
    perGuestCents: { ESSENTIAL: 6500, SIGNATURE: 11000, LUXE: 16500 },
  },
};

const ZONE_SURCHARGE_CENTS: Record<Zone, number> = {
  METRO: 0,
  OUTER: 35000,
  REGIONAL: 85000,
};

const CATEGORIES: readonly { slug: string; label: TranslationKey }[] = [
  { slug: "wedding", label: "marketing.launchEstCatWedding" },
  { slug: "birthday-milestone", label: "marketing.launchEstCatBirthday" },
  { slug: "gala-dinner", label: "marketing.launchEstCatCorporate" },
  { slug: "celebration-of-life", label: "marketing.launchEstCatMemorial" },
];

const TIERS: readonly { value: Tier; label: TranslationKey; hint: TranslationKey }[] = [
  {
    value: "ESSENTIAL",
    label: "marketing.launchEstTierEssential",
    hint: "marketing.launchEstTierEssentialHint",
  },
  {
    value: "SIGNATURE",
    label: "marketing.launchEstTierSignature",
    hint: "marketing.launchEstTierSignatureHint",
  },
  { value: "LUXE", label: "marketing.launchEstTierLuxe", hint: "marketing.launchEstTierLuxeHint" },
];

const ZONES: readonly { value: Zone; label: TranslationKey; hint: TranslationKey }[] = [
  {
    value: "METRO",
    label: "marketing.launchEstZoneMetro",
    hint: "marketing.launchEstZoneMetroHint",
  },
  {
    value: "OUTER",
    label: "marketing.launchEstZoneOuter",
    hint: "marketing.launchEstZoneOuterHint",
  },
  {
    value: "REGIONAL",
    label: "marketing.launchEstZoneRegional",
    hint: "marketing.launchEstZoneRegionalHint",
  },
];

/** Whole Australian dollars, e.g. 2370000 cents -> "$23,700". The label carries "AUD". */
function formatDollarsFromCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
}

/** Page-supplied wording. Each label falls back to the launch copy when omitted. */
export interface EstimatorLabels {
  badge?: string;
  memorialBadge?: string;
  /** Uses a `{count}` placeholder, e.g. "{count} guests". */
  guestsUnit?: string;
  logisticsTitle?: string;
  disclaimer?: string;
}

export function EventEstimator({
  locale,
  labels = {},
}: {
  locale: EnabledLocale;
  labels?: EstimatorLabels;
}) {
  const [ceremonySlug, setCeremonySlug] = useState<string>("wedding");
  const [guests, setGuests] = useState<number>(100);
  const [tier, setTier] = useState<Tier>("SIGNATURE");
  const [zone, setZone] = useState<Zone>("METRO");

  const mode = getExperienceMode(ceremonySlug);
  const rates = CATEGORY_RATES_CENTS[ceremonySlug] ?? CATEGORY_RATES_CENTS.wedding!;
  const safeGuests = Math.max(20, Math.min(500, guests || 20));
  const perGuestCents = rates.perGuestCents[tier];
  const zoneCents = ZONE_SURCHARGE_CENTS[zone];

  const midTotalCents = rates.baseFixedCents + safeGuests * perGuestCents + zoneCents;
  const lowTotalCents = Math.round((midTotalCents * 0.9) / 10000) * 10000;
  const highTotalCents = Math.round((midTotalCents * 1.12) / 10000) * 10000;
  const avgPerGuestCents = Math.round(midTotalCents / safeGuests);

  // What the guest count usually means for tables, staff and dessert.
  const recommendedTables = Math.ceil(safeGuests / 10);
  const recommendedCrew = Math.max(2, Math.ceil(safeGuests / 22));
  const recommendedPortions = mode === "MEMORIAL" ? safeGuests : Math.ceil(safeGuests * 1.08);

  const tierOption = TIERS.find((option) => option.value === tier) ?? TIERS[1]!;
  const zoneOption = ZONES.find((option) => option.value === zone) ?? ZONES[0]!;

  const handleApplyToEnquiry = () => {
    const summaryText = t(locale, "marketing.launchEstSummary", {
      guests: safeGuests,
      tier: t(locale, tierOption.label),
      zone: t(locale, zoneOption.label),
      low: formatDollarsFromCents(lowTotalCents),
      high: formatDollarsFromCents(highTotalCents),
      tables: recommendedTables,
      crew: recommendedCrew,
    });

    window.dispatchEvent(
      new CustomEvent<EstimateTransferPayload>("managevent:apply-estimate", {
        detail: {
          ceremonySlug,
          guests: safeGuests,
          summaryText,
        },
      }),
    );

    const enquirySection = document.getElementById("enquiry");
    if (enquirySection) {
      enquirySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className="estimator-grid"
      style={
        mode === "MEMORIAL" ? (getCssVariablesForMode("MEMORIAL") as CSSProperties) : undefined
      }
      data-experience-mode={mode.toLowerCase()}
    >
      <div className="estimator-controls">
        <div className="estimator-field">
          <label htmlFor="est-ceremony">{t(locale, "marketing.launchEstCategoryLabel")}</label>
          <select
            id="est-ceremony"
            value={ceremonySlug}
            onChange={(e) => setCeremonySlug(e.target.value)}
          >
            {CATEGORIES.map((option) => (
              <option key={option.slug} value={option.slug}>
                {t(locale, option.label)}
              </option>
            ))}
          </select>
        </div>

        <div className="estimator-field">
          <div className="estimator-range-header">
            <label htmlFor="est-guests">{t(locale, "marketing.launchEstGuestsLabel")}</label>
            <strong className="estimator-guest-badge" dir="ltr">
              {(labels.guestsUnit ?? "{count} guests").replace("{count}", String(safeGuests))}
            </strong>
          </div>
          <input
            id="est-guests"
            type="range"
            min={20}
            max={400}
            step={10}
            value={safeGuests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="estimator-slider"
          />
          <div className="estimator-scale" dir="ltr" aria-hidden="true">
            <span>20</span>
            <span>100</span>
            <span>200</span>
            <span>300</span>
            <span>400+</span>
          </div>
        </div>

        <div className="estimator-field">
          <label htmlFor="est-tier">{t(locale, "marketing.launchEstTierLabel")}</label>
          <select
            id="est-tier"
            value={tier}
            aria-describedby="est-tier-hint"
            onChange={(e) => setTier(e.target.value as Tier)}
          >
            {TIERS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(locale, option.label)}
              </option>
            ))}
          </select>
          <p className="estimator-hint" id="est-tier-hint">
            {t(locale, tierOption.hint)}
          </p>
        </div>

        <div className="estimator-field">
          <label htmlFor="est-zone">{t(locale, "marketing.launchEstZoneLabel")}</label>
          <select
            id="est-zone"
            value={zone}
            aria-describedby="est-zone-hint"
            onChange={(e) => setZone(e.target.value as Zone)}
          >
            {ZONES.map((option) => (
              <option key={option.value} value={option.value}>
                {t(locale, option.label)}
              </option>
            ))}
          </select>
          <p className="estimator-hint" id="est-zone-hint">
            {t(locale, zoneOption.hint)}
          </p>
        </div>
      </div>

      <div className="estimator-output">
        <div className="estimator-output-top">
          <span className="estimator-badge">
            {(mode === "MEMORIAL" ? labels.memorialBadge : undefined) ??
              labels.badge ??
              t(locale, "marketing.launchEstimatorKicker")}
          </span>
          <h3>{t(locale, "marketing.launchEstResultTitle")}</h3>
          <p className="estimator-label">{t(locale, "marketing.launchEstRangeLabel")}</p>
          <p className="estimator-price" dir="ltr" aria-live="polite">
            <span>{formatDollarsFromCents(lowTotalCents)}</span>
            <span aria-hidden="true"> – </span>
            <span className="sr-only"> to </span>
            <span>{formatDollarsFromCents(highTotalCents)}</span>
          </p>
          <p className="estimator-subprice">
            {t(locale, "marketing.launchEstPerGuestLabel")}:{" "}
            <strong dir="ltr">{formatDollarsFromCents(avgPerGuestCents)}</strong> (
            {t(locale, "common.inclGst")})
          </p>
        </div>

        <div className="estimator-output-foot">
          <button type="button" className="button estimator-cta" onClick={handleApplyToEnquiry}>
            {t(locale, "marketing.launchEstApplyBtn")}
          </button>
          <p className="estimator-disclaimer">
            {labels.disclaimer ?? t(locale, "marketing.launchEstDisclaimer")}
          </p>
        </div>
      </div>

      <div className="estimator-logistics">
        <h4>{labels.logisticsTitle ?? t(locale, "marketing.launchEstLogisticsTitle")}</h4>
        <dl className="estimator-metrics">
          <div>
            <dt>{t(locale, "marketing.launchEstTablesLabel")}</dt>
            <dd dir="ltr">{recommendedTables}</dd>
          </div>
          <div>
            <dt>{t(locale, "marketing.launchEstStaffLabel")}</dt>
            <dd dir="ltr">{recommendedCrew}</dd>
          </div>
          <div>
            <dt>{t(locale, "marketing.launchEstCakeLabel")}</dt>
            <dd dir="ltr">{recommendedPortions}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
