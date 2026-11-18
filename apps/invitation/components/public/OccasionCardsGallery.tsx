"use client";

import { useMemo, useState } from "react";
import type { DemoInvitation } from "@managevent/validators";
import { Search } from "lucide-react";
import {
  CARD_DESIGN_CATEGORIES,
  type CardDesignCategory,
  OCCASION_CARD_DESIGNS,
} from "@/lib/public/card-designs";
import { createInvitationHref, samplePath } from "@/lib/public/links";
import { Badge, buttonClass } from "@/components/ui";
import { OccasionCardArtwork } from "./OccasionCardArtwork";

export interface OccasionCardsGalleryProps {
  demos: DemoInvitation[];
  signedIn: boolean;
  /** Optional initial category slug (when passed from home category links). */
  initialCategory?: CardDesignCategory | "all" | undefined;
}

/**
 * Interactive searchable & category-filterable gallery of all 52 celebration, cultural,
 * birthday, dog & pet, baby shower (girl, boy & neutral), gala, and memorial invitation cards.
 */
export function OccasionCardsGallery({
  demos,
  signedIn,
  initialCategory = "all",
}: OccasionCardsGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<CardDesignCategory | "all">(
    CARD_DESIGN_CATEGORIES.some((c) => c.id === initialCategory) ? initialCategory : "all",
  );
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: OCCASION_CARD_DESIGNS.length };
    for (const design of OCCASION_CARD_DESIGNS) {
      map[design.category] = (map[design.category] ?? 0) + 1;
    }
    return map;
  }, []);

  const filteredDesigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OCCASION_CARD_DESIGNS.filter((design) => {
      if (selectedCategory !== "all" && design.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        design.name.toLowerCase().includes(q) ||
        design.categoryLabel.toLowerCase().includes(q) ||
        design.badgeText.toLowerCase().includes(q) ||
        design.summary.toLowerCase().includes(q) ||
        design.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, query]);

  const demoForDesign = (templateSlug: string, mode: "CELEBRATION" | "MEMORIAL") =>
    demos.find((d) => d.templateSlug === templateSlug) ??
    demos.find((d) => d.experienceMode === mode);

  return (
    <div className="pub-occ-wrap">
      {/* Toolbar: Search + Result Count */}
      <div className="pub-occ-toolbar">
        <div className="pub-occ-search">
          <label htmlFor="occ-card-search" className="pub-occ-search-label">
            Search card designs by occasion or keyword
          </label>
          <div className="pub-occ-search-field">
            <Search className="pub-occ-search-icon" aria-hidden="true" />
            <input
              id="occ-card-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search dog birthday, baby girl, baby boy, wedding, 50th, safari..."
            />
          </div>
        </div>
        <p className="pub-occ-count" aria-live="polite">
          Showing <strong>{filteredDesigns.length}</strong> of{" "}
          <strong>{OCCASION_CARD_DESIGNS.length}</strong> designs
        </p>
      </div>

      {/* Category Filter Strip */}
      <div className="pub-occ-chips" role="group" aria-label="Filter cards by occasion">
        {CARD_DESIGN_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className="pub-occ-chip"
              aria-pressed={isActive}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.shortLabel}</span>
              <span className="pub-occ-chip-count">{counts[cat.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Empty Search Fallback */}
      {filteredDesigns.length === 0 ? (
        <div className="pub-occ-empty">
          <h3>No matching card designs</h3>
          <p>
            Try another keyword or clear your search filter to view all{" "}
            {OCCASION_CARD_DESIGNS.length} card styles.
          </p>
          <button
            type="button"
            className={buttonClass({ size: "small" })}
            onClick={() => {
              setQuery("");
              setSelectedCategory("all");
            }}
          >
            Show all {OCCASION_CARD_DESIGNS.length} cards
          </button>
        </div>
      ) : (
        <ul className="pub-occ-grid">
          {filteredDesigns.map((design) => {
            const memorial = design.mode === "MEMORIAL";
            const matchedDemo = demoForDesign(design.templateSlug, design.mode);
            const customHref = createInvitationHref(signedIn, design.templateSlug, design.id);
            const demoHref = matchedDemo
              ? `${samplePath(matchedDemo)}?card=${encodeURIComponent(design.id)}`
              : null;

            return (
              <li
                key={design.id}
                className="pub-occ-card-item"
                data-experience-mode={memorial ? "memorial" : undefined}
              >
                <OccasionCardArtwork design={design} />
                <div className="pub-occ-card-body">
                  <div className="pub-occ-card-badges">
                    <Badge tone="neutral">{design.categoryLabel}</Badge>
                    {memorial ? (
                      <Badge tone="neutral">Memorial Mode</Badge>
                    ) : design.free ? (
                      <Badge tone="success">Free</Badge>
                    ) : (
                      <Badge tone="primary" solid>
                        Premium
                      </Badge>
                    )}
                  </div>
                  <h3 className="pub-occ-card-title">{design.name}</h3>
                  <p className="pub-occ-card-summary">{design.summary}</p>
                  <div className="pub-occ-card-actions">
                    {demoHref ? (
                      <a
                        className={buttonClass({ variant: "secondary", size: "small" })}
                        href={demoHref}
                        aria-label={`Live preview: ${design.name}`}
                      >
                        Live preview
                      </a>
                    ) : null}
                    <a
                      className={buttonClass({ size: "small" })}
                      href={customHref}
                      aria-label={`Customize card: ${design.name}`}
                    >
                      Customize card
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
