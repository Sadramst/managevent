"use client";

import { useState, type CSSProperties } from "react";
import { getExperienceMode, t } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import { getCssVariablesForMode } from "@managevent/ui/tokens";

export interface EstimateTransferPayload {
  ceremonySlug: string;
  guests: number;
  summaryText: string;
}

const CATEGORY_RATES_CENTS: Record<
  string,
  { baseFixedCents: number; perGuestCents: Record<"ESSENTIAL" | "SIGNATURE" | "LUXE", number> }
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
  "sofreh-aghd": {
    baseFixedCents: 220000,
    perGuestCents: { ESSENTIAL: 13000, SIGNATURE: 22000, LUXE: 34000 },
  },
  "celebration-of-life": {
    baseFixedCents: 110000,
    perGuestCents: { ESSENTIAL: 6500, SIGNATURE: 11000, LUXE: 16500 },
  },
};

const ZONE_SURCHARGE_CENTS: Record<"METRO" | "OUTER" | "REGIONAL", number> = {
  METRO: 0,
  OUTER: 35000,
  REGIONAL: 85000,
};

function formatAudFromCents(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString("en-AU")} AUD`;
}

export function EventEstimator({ locale }: { locale: EnabledLocale }) {
  const [ceremonySlug, setCeremonySlug] = useState<string>("wedding");
  const [guests, setGuests] = useState<number>(100);
  const [tier, setTier] = useState<"ESSENTIAL" | "SIGNATURE" | "LUXE">("SIGNATURE");
  const [zone, setZone] = useState<"METRO" | "OUTER" | "REGIONAL">("METRO");

  const mode = getExperienceMode(ceremonySlug);
  const rates = CATEGORY_RATES_CENTS[ceremonySlug] ?? CATEGORY_RATES_CENTS.wedding!;
  const safeGuests = Math.max(20, Math.min(500, guests || 20));
  const perGuestCents = rates.perGuestCents[tier];
  const zoneCents = ZONE_SURCHARGE_CENTS[zone];

  const midTotalCents = rates.baseFixedCents + safeGuests * perGuestCents + zoneCents;
  const lowTotalCents = Math.round((midTotalCents * 0.9) / 10000) * 10000;
  const highTotalCents = Math.round((midTotalCents * 1.12) / 10000) * 10000;
  const avgPerGuestCents = Math.round(midTotalCents / safeGuests);

  // Logistics bridge calculations
  const recommendedTables = Math.ceil(safeGuests / 10);
  const recommendedCrew = Math.max(2, Math.ceil(safeGuests / 22));
  const recommendedPortions = mode === "MEMORIAL" ? safeGuests : Math.ceil(safeGuests * 1.08);

  const handleApplyToEnquiry = () => {
    const tierName =
      tier === "ESSENTIAL" ? "Essential" : tier === "SIGNATURE" ? "Signature" : "Luxe 0-to-100";
    const zoneName =
      zone === "METRO"
        ? "Perth Metro"
        : zone === "OUTER"
          ? "Swan Valley / Perth Hills"
          : "Regional WA";
    const summaryText = `Estimator Summary: ${safeGuests} guests · ${tierName} tier · ${zoneName} · Est. ${formatAudFromCents(lowTotalCents)} – ${formatAudFromCents(highTotalCents)} (incl. GST). Logistics: ${recommendedTables} tables, ${recommendedCrew} crew.`;

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
            <option value="wedding">{t(locale, "marketing.launchEstCatWedding")}</option>
            <option value="birthday-milestone">
              {t(locale, "marketing.launchEstCatBirthday")}
            </option>
            <option value="gala-dinner">{t(locale, "marketing.launchEstCatCorporate")}</option>
            <option value="sofreh-aghd">{t(locale, "marketing.launchEstCatCultural")}</option>
            <option value="celebration-of-life">
              {t(locale, "marketing.launchEstCatMemorial")}
            </option>
          </select>
        </div>

        <div className="estimator-field">
          <div className="estimator-range-header">
            <label htmlFor="est-guests">{t(locale, "marketing.launchEstGuestsLabel")}</label>
            <strong className="estimator-guest-badge" dir="ltr">
              {safeGuests} guests
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
            onChange={(e) => setTier(e.target.value as "ESSENTIAL" | "SIGNATURE" | "LUXE")}
          >
            <option value="ESSENTIAL">{t(locale, "marketing.launchEstTierEssential")}</option>
            <option value="SIGNATURE">{t(locale, "marketing.launchEstTierSignature")}</option>
            <option value="LUXE">{t(locale, "marketing.launchEstTierLuxe")}</option>
          </select>
        </div>

        <div className="estimator-field">
          <label htmlFor="est-zone">{t(locale, "marketing.launchEstZoneLabel")}</label>
          <select
            id="est-zone"
            value={zone}
            onChange={(e) => setZone(e.target.value as "METRO" | "OUTER" | "REGIONAL")}
          >
            <option value="METRO">{t(locale, "marketing.launchEstZoneMetro")}</option>
            <option value="OUTER">{t(locale, "marketing.launchEstZoneOuter")}</option>
            <option value="REGIONAL">{t(locale, "marketing.launchEstZoneRegional")}</option>
          </select>
        </div>
      </div>

      <div className="estimator-output">
        <div className="estimator-output-top">
          <span className="estimator-badge">
            {mode === "MEMORIAL"
              ? "Memorial Mode · Respectful Coordination"
              : "0-to-100 Full Service · Perth WA"}
          </span>
          <h3>{t(locale, "marketing.launchEstResultTitle")}</h3>
          <p className="estimator-label">{t(locale, "marketing.launchEstRangeLabel")}</p>
          <p className="estimator-price" dir="ltr">
            {formatAudFromCents(lowTotalCents)} – {formatAudFromCents(highTotalCents)}
          </p>
          <p className="estimator-subprice">
            {t(locale, "marketing.launchEstPerGuestLabel")}:{" "}
            <strong dir="ltr">{formatAudFromCents(avgPerGuestCents)}</strong> (
            {t(locale, "common.inclGst")})
          </p>
        </div>

        <div className="estimator-logistics">
          <h4>{t(locale, "marketing.launchEstLogisticsTitle")}</h4>
          <div className="estimator-metrics">
            <div>
              <strong dir="ltr">{recommendedTables}</strong>
              <span>{t(locale, "marketing.launchEstTablesLabel")}</span>
            </div>
            <div>
              <strong dir="ltr">{recommendedCrew}</strong>
              <span>{t(locale, "marketing.launchEstStaffLabel")}</span>
            </div>
            <div>
              <strong dir="ltr">{recommendedPortions}</strong>
              <span>{t(locale, "marketing.launchEstCakeLabel")}</span>
            </div>
          </div>
        </div>

        <button type="button" className="button estimator-cta" onClick={handleApplyToEnquiry}>
          {t(locale, "marketing.launchEstApplyBtn")}
        </button>
        <p className="estimator-disclaimer">{t(locale, "marketing.launchEstDisclaimer")}</p>
      </div>
    </div>
  );
}
