import type { CSSProperties } from "react";
import type { CardFrameShape, CardMotifId, OccasionCardDesign } from "@/lib/public/card-designs";

interface CardShapeSvgProps {
  shape: CardFrameShape;
}

/**
 * Renders the 16 distinct outer/inner ornamental card frame silhouettes using `--inv-accent`
 * and `--inv-rule` custom properties.
 */
export function CardShapeSvg({ shape }: CardShapeSvgProps) {
  switch (shape) {
    case "double-arch":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M 14 406 L 14 146 A 146 146 0 0 1 306 146 L 306 406 Z"
            stroke="var(--inv-accent)"
            strokeWidth="2"
            opacity="0.82"
          />
          <path
            d="M 22 398 L 22 150 A 138 138 0 0 1 298 150 L 298 398 Z"
            stroke="var(--inv-rule)"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.65"
          />
          <polygon points="160,8 165,14 160,20 155,14" fill="var(--inv-accent)" />
        </svg>
      );

    case "mihrab-arch":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M 16 404 L 16 144 Q 16 60 160 16 Q 304 60 304 144 L 304 404 Z"
            stroke="var(--inv-accent)"
            strokeWidth="2.2"
            opacity="0.9"
          />
          <path
            d="M 25 395 L 25 148 Q 25 72 160 28 Q 295 72 295 148 L 295 395 Z"
            stroke="var(--inv-rule)"
            strokeWidth="1"
            opacity="0.65"
          />
          <rect
            x="24"
            y="384"
            width="10"
            height="10"
            transform="rotate(45 29 389)"
            stroke="var(--inv-accent)"
            strokeWidth="1"
            opacity="0.7"
          />
          <rect
            x="286"
            y="384"
            width="10"
            height="10"
            transform="rotate(45 291 389)"
            stroke="var(--inv-accent)"
            strokeWidth="1"
            opacity="0.7"
          />
          <circle cx="160" cy="18" r="4" fill="var(--inv-accent)" />
        </svg>
      );

    case "scalloped":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="16"
            y="16"
            width="288"
            height="388"
            rx="28"
            stroke="var(--inv-accent)"
            strokeWidth="2"
            strokeDasharray="10 6"
            opacity="0.78"
          />
          {[40, 70, 100, 130, 160, 190, 220, 250, 280].map((cx) => (
            <g key={cx}>
              <circle
                cx={cx}
                cy="22"
                r="8"
                stroke="var(--inv-rule)"
                strokeWidth="1"
                opacity="0.55"
              />
              <circle
                cx={cx}
                cy="398"
                r="8"
                stroke="var(--inv-rule)"
                strokeWidth="1"
                opacity="0.55"
              />
            </g>
          ))}
        </svg>
      );

    case "octagon":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <polygon
            points="44,14 276,14 306,44 306,376 276,406 44,406 14,376 14,44"
            stroke="var(--inv-accent)"
            strokeWidth="2"
            opacity="0.88"
          />
          <polygon
            points="50,22 270,22 298,50 298,370 270,398 50,398 22,370 22,50"
            stroke="var(--inv-rule)"
            strokeWidth="0.9"
            opacity="0.55"
          />
        </svg>
      );

    case "art-deco":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M 12 36 L 36 36 L 36 12 L 284 12 L 284 36 L 308 36 L 308 384 L 284 384 L 284 408 L 36 408 L 36 384 L 12 384 Z"
            stroke="var(--inv-accent)"
            strokeWidth="2"
            opacity="0.9"
          />
          <rect
            x="22"
            y="22"
            width="276"
            height="376"
            stroke="var(--inv-rule)"
            strokeWidth="0.9"
            opacity="0.55"
          />
        </svg>
      );

    case "ticket-stub":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M 16 16 L 304 16 L 304 114 A 14 14 0 0 0 304 142 L 304 404 L 16 404 L 16 142 A 14 14 0 0 0 16 114 Z"
            stroke="var(--inv-accent)"
            strokeWidth="2"
            opacity="0.85"
          />
          <line
            x1="28"
            y1="128"
            x2="292"
            y2="128"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            strokeDasharray="6 4"
            opacity="0.65"
          />
        </svg>
      );

    case "polaroid":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="16"
            y="16"
            width="288"
            height="388"
            rx="12"
            stroke="var(--inv-rule)"
            strokeWidth="1.8"
            opacity="0.72"
          />
          <rect
            x="28"
            y="30"
            width="264"
            height="205"
            rx="8"
            stroke="var(--inv-accent)"
            strokeWidth="1.5"
            opacity="0.65"
          />
          <line
            x1="48"
            y1="382"
            x2="272"
            y2="382"
            stroke="var(--inv-rule)"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
      );

    case "crest-shield":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="14"
            y="14"
            width="292"
            height="392"
            rx="18"
            stroke="var(--inv-rule)"
            strokeWidth="1.4"
            opacity="0.6"
          />
          <path
            d="M 40 32 L 280 32 L 280 264 Q 280 368 160 398 Q 40 368 40 264 Z"
            stroke="var(--inv-accent)"
            strokeWidth="1.8"
            opacity="0.78"
          />
        </svg>
      );

    case "botanical-oval":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="14"
            y="14"
            width="292"
            height="392"
            rx="22"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            opacity="0.55"
          />
          <ellipse
            cx="160"
            cy="210"
            rx="130"
            ry="180"
            stroke="var(--inv-accent)"
            strokeWidth="1.8"
            opacity="0.78"
          />
          <ellipse
            cx="160"
            cy="210"
            rx="122"
            ry="172"
            stroke="var(--inv-rule)"
            strokeWidth="0.75"
            strokeDasharray="3 3"
            opacity="0.55"
          />
        </svg>
      );

    case "paw-badge":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="14"
            y="14"
            width="292"
            height="392"
            rx="28"
            stroke="var(--inv-accent)"
            strokeWidth="2.5"
            strokeDasharray="12 6"
            opacity="0.78"
          />
          {[
            [36, 36],
            [284, 36],
            [36, 384],
            [284, 384],
          ].map(([cx, cy], idx) => (
            <g key={idx} opacity="0.5" fill="var(--inv-accent)">
              <circle cx={cx} cy={cy! + 4} r="4.5" />
              <circle cx={cx! - 5} cy={cy! - 2} r="2.2" />
              <circle cx={cx} cy={cy! - 4} r="2.2" />
              <circle cx={cx! + 5} cy={cy! - 2} r="2.2" />
            </g>
          ))}
        </svg>
      );

    case "cloud-dream":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="16"
            y="16"
            width="288"
            height="388"
            rx="40"
            stroke="var(--inv-accent)"
            strokeWidth="1.8"
            opacity="0.72"
          />
          <path
            d="M 40 68 Q 65 44 95 62 Q 125 40 160 62 Q 195 40 225 62 Q 255 44 280 68"
            stroke="var(--inv-rule)"
            strokeWidth="1.4"
            opacity="0.6"
          />
          <path
            d="M 40 356 Q 65 380 95 362 Q 125 384 160 362 Q 195 384 225 362 Q 255 380 280 356"
            stroke="var(--inv-rule)"
            strokeWidth="1.4"
            opacity="0.6"
          />
        </svg>
      );

    case "scroll-parchment":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="20"
            y="24"
            width="280"
            height="372"
            rx="6"
            stroke="var(--inv-accent)"
            strokeWidth="1.8"
            opacity="0.78"
          />
          <rect
            x="10"
            y="16"
            width="300"
            height="14"
            rx="7"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            opacity="0.65"
          />
          <rect
            x="10"
            y="390"
            width="300"
            height="14"
            rx="7"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            opacity="0.65"
          />
        </svg>
      );

    case "minimalist-monolith":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="18"
            y="18"
            width="284"
            height="384"
            stroke="var(--inv-accent)"
            strokeWidth="1.6"
            opacity="0.88"
          />
          <line
            x1="18"
            y1="54"
            x2="302"
            y2="54"
            stroke="var(--inv-rule)"
            strokeWidth="0.75"
            opacity="0.55"
          />
          <line
            x1="18"
            y1="366"
            x2="302"
            y2="366"
            stroke="var(--inv-rule)"
            strokeWidth="0.75"
            opacity="0.55"
          />
        </svg>
      );

    case "mediterranean-tile":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="12"
            y="12"
            width="296"
            height="396"
            rx="16"
            stroke="var(--inv-rule)"
            strokeWidth="2.4"
            opacity="0.78"
          />
          <rect
            x="24"
            y="24"
            width="272"
            height="372"
            rx="10"
            stroke="var(--inv-accent)"
            strokeWidth="1.4"
            opacity="0.72"
          />
          <rect
            x="18"
            y="18"
            width="16"
            height="16"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            opacity="0.7"
          />
          <rect
            x="286"
            y="18"
            width="16"
            height="16"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            opacity="0.7"
          />
          <rect
            x="18"
            y="386"
            width="16"
            height="16"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            opacity="0.7"
          />
          <rect
            x="286"
            y="386"
            width="16"
            height="16"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            opacity="0.7"
          />
        </svg>
      );

    case "memorial-tablet":
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <rect
            x="18"
            y="18"
            width="284"
            height="384"
            rx="12"
            stroke="var(--inv-rule)"
            strokeWidth="1.2"
            opacity="0.72"
          />
          <rect
            x="26"
            y="26"
            width="268"
            height="368"
            rx="8"
            stroke="var(--inv-accent)"
            strokeWidth="0.7"
            opacity="0.45"
          />
        </svg>
      );

    case "arch":
    default:
      return (
        <svg
          className="pub-occ-frame-svg"
          viewBox="0 0 320 420"
          preserveAspectRatio="none"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M 16 404 L 16 144 A 144 144 0 0 1 304 144 L 304 404 Z"
            stroke="var(--inv-accent)"
            strokeWidth="1.8"
            opacity="0.82"
          />
          <circle cx="160" cy="14" r="3" fill="var(--inv-accent)" />
        </svg>
      );
  }
}

/**
 * Hand-crafted custom SVG illustration for all 40 celebration, pet, baby, cultural, and memorial motifs.
 */
export function CardMotifSvg({ motif, className }: { motif: CardMotifId; className?: string }) {
  return (
    <span className={className ? `pub-occ-motif ${className}` : "pub-occ-motif"} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false" aria-hidden="true" fill="none">
        {renderMotif(motif)}
      </svg>
    </span>
  );
}

function renderMotif(motif: CardMotifId) {
  const accent = "var(--inv-accent, var(--me-accent, currentColor))";
  const ink = "var(--inv-ink, var(--me-primary, currentColor))";
  const surface = "var(--inv-surface, var(--me-surface-raised, currentColor))";

  switch (motif) {
    case "dog-party-hat":
      return (
        <>
          <path d="M25 18 L32 4 L39 18 Z" fill={accent} stroke={ink} strokeWidth="1.6" />
          <circle cx="32" cy="4" r="2.6" fill={accent} />
          <ellipse
            cx="16"
            cy="30"
            rx="5.5"
            ry="11"
            transform="rotate(14 16 30)"
            fill={accent}
            opacity="0.85"
          />
          <ellipse
            cx="48"
            cy="30"
            rx="5.5"
            ry="11"
            transform="rotate(-14 48 30)"
            fill={accent}
            opacity="0.85"
          />
          <circle cx="32" cy="32" r="14" fill={surface} stroke={ink} strokeWidth="1.6" />
          <circle cx="26.5" cy="29" r="2" fill={ink} />
          <circle cx="37.5" cy="29" r="2" fill={ink} />
          <ellipse cx="32" cy="34.5" rx="3" ry="2" fill={ink} />
          <path d="M29 38.5 Q32 42 35 38.5" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M21 53 C19 51 17 53 19 55 C17 57 19 59 21 57 L43 57 C45 59 47 57 45 55 C47 53 45 51 43 53 Z"
            fill={accent}
            opacity="0.35"
            stroke={ink}
            strokeWidth="1.3"
          />
        </>
      );

    case "poodle-couture":
      return (
        <>
          <circle cx="17" cy="26" r="5" fill={accent} opacity="0.45" />
          <circle cx="15" cy="34" r="5" fill={accent} opacity="0.45" />
          <circle cx="47" cy="26" r="5" fill={accent} opacity="0.45" />
          <circle cx="49" cy="34" r="5" fill={accent} opacity="0.45" />
          <circle cx="32" cy="18" r="7" fill={surface} stroke={accent} strokeWidth="1.5" />
          <circle cx="32" cy="32" r="13" fill={surface} stroke={ink} strokeWidth="1.5" />
          <path d="M26 11 L32 14 L26 17 Z M38 11 L32 14 L38 17 Z" fill={accent} />
          <circle cx="27" cy="30" r="2" fill={ink} />
          <circle cx="37" cy="30" r="2" fill={ink} />
          <ellipse cx="32" cy="36" rx="2.8" ry="1.8" fill={ink} />
          <circle cx="24" cy="48" r="2.2" fill={surface} stroke={accent} strokeWidth="1.2" />
          <circle cx="29" cy="50" r="2.2" fill={surface} stroke={accent} strokeWidth="1.2" />
          <circle cx="35" cy="50" r="2.2" fill={surface} stroke={accent} strokeWidth="1.2" />
          <circle cx="40" cy="48" r="2.2" fill={surface} stroke={accent} strokeWidth="1.2" />
        </>
      );

    case "puppy-bone-ball":
      return (
        <>
          <circle
            cx="44"
            cy="22"
            r="11"
            fill={accent}
            opacity="0.7"
            stroke={ink}
            strokeWidth="1.5"
          />
          <path
            d="M36 15 Q44 22 36 29 M52 15 Q44 22 52 29"
            stroke={surface}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16 36 C12 33 9 37 13 40 C9 43 12 47 16 44 L44 44 C48 47 51 43 47 40 C51 37 48 33 44 36 Z"
            fill={surface}
            stroke={ink}
            strokeWidth="1.5"
          />
          <circle cx="22" cy="18" r="3" fill={accent} opacity="0.85" />
          <circle cx="15" cy="24" r="2.2" fill={accent} opacity="0.65" />
          <circle cx="29" cy="22" r="2.2" fill={accent} opacity="0.65" />
        </>
      );

    case "cat-crown-whiskers":
      return (
        <>
          <path
            d="M23 16 L25 8 L32 13 L39 8 L41 16 Z"
            fill={accent}
            stroke={ink}
            strokeWidth="1.4"
          />
          <path
            d="M18 28 L17 16 L26 22 Z"
            fill={accent}
            opacity="0.5"
            stroke={ink}
            strokeWidth="1.4"
          />
          <path
            d="M46 28 L47 16 L38 22 Z"
            fill={accent}
            opacity="0.5"
            stroke={ink}
            strokeWidth="1.4"
          />
          <circle cx="32" cy="34" r="14" fill={surface} stroke={ink} strokeWidth="1.6" />
          <circle cx="26.5" cy="32" r="2.1" fill={ink} />
          <circle cx="37.5" cy="32" r="2.1" fill={ink} />
          <polygon points="32,38 29.5,35.5 34.5,35.5" fill={accent} />
          <line x1="10" y1="33" x2="21" y2="35" stroke={ink} strokeWidth="1.2" />
          <line x1="10" y1="38" x2="21" y2="38" stroke={ink} strokeWidth="1.2" />
          <line x1="54" y1="33" x2="43" y2="35" stroke={ink} strokeWidth="1.2" />
          <line x1="54" y1="38" x2="43" y2="38" stroke={ink} strokeWidth="1.2" />
        </>
      );

    case "paw-heart-gotcha":
      return (
        <>
          <circle cx="18" cy="22" r="4.5" fill={accent} />
          <circle cx="28" cy="14" r="4.5" fill={accent} />
          <circle cx="38" cy="14" r="4.5" fill={accent} />
          <circle cx="48" cy="22" r="4.5" fill={accent} />
          <path
            d="M21 31 C15 35 16 49 32 49 C48 49 49 35 43 31 C38 28 36 25 32 25 C28 25 26 28 21 31 Z"
            fill={accent}
            opacity="0.88"
          />
          <path
            d="M32 44 C26 39 24 34 27.5 32 C29.5 30.8 31.5 32.5 32 34 C32.5 32.5 34.5 30.8 36.5 32 C40 34 38 39 32 44 Z"
            fill={surface}
          />
        </>
      );

    case "baby-girl-pram":
      return (
        <>
          <path
            d="M16 34 C16 20 26 14 38 14 L38 34 Z"
            fill={accent}
            opacity="0.75"
            stroke={ink}
            strokeWidth="1.4"
          />
          <path
            d="M16 34 L48 34 C48 43 41 47 32 47 C23 47 16 43 16 34 Z"
            fill={surface}
            stroke={ink}
            strokeWidth="1.4"
          />
          <path d="M48 34 L54 22 L58 22" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="23" cy="51" r="5" fill={surface} stroke={ink} strokeWidth="1.6" />
          <circle cx="41" cy="51" r="5" fill={surface} stroke={ink} strokeWidth="1.6" />
          <circle cx="23" cy="51" r="1.5" fill={accent} />
          <circle cx="41" cy="51" r="1.5" fill={accent} />
          <path d="M13 18 L18 15 L18 21 Z M23 18 L18 15 L18 21 Z" fill={accent} />
        </>
      );

    case "baby-girl-butterfly":
      return (
        <>
          <ellipse
            cx="22"
            cy="26"
            rx="11"
            ry="9"
            transform="rotate(-22 22 26)"
            fill={accent}
            opacity="0.6"
            stroke={ink}
            strokeWidth="1.2"
          />
          <ellipse
            cx="42"
            cy="26"
            rx="11"
            ry="9"
            transform="rotate(22 42 26)"
            fill={accent}
            opacity="0.6"
            stroke={ink}
            strokeWidth="1.2"
          />
          <ellipse
            cx="24"
            cy="40"
            rx="8"
            ry="6.5"
            transform="rotate(18 24 40)"
            fill={accent}
            opacity="0.35"
            stroke={ink}
            strokeWidth="1.2"
          />
          <ellipse
            cx="40"
            cy="40"
            rx="8"
            ry="6.5"
            transform="rotate(-18 40 40)"
            fill={accent}
            opacity="0.35"
            stroke={ink}
            strokeWidth="1.2"
          />
          <rect x="30.5" y="18" width="3" height="28" rx="1.5" fill={ink} />
          <path
            d="M32 18 Q26 11 22 13 M32 18 Q38 11 42 13"
            stroke={ink}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      );

    case "baby-boy-prince-crown":
      return (
        <>
          <path
            d="M14 44 L11 21 L23 31 L32 14 L41 31 L53 21 L50 44 Z"
            fill={accent}
            opacity="0.45"
            stroke={ink}
            strokeWidth="1.6"
          />
          <rect
            x="13"
            y="44"
            width="38"
            height="6"
            rx="3"
            fill={accent}
            stroke={ink}
            strokeWidth="1.4"
          />
          <circle cx="11" cy="18" r="2.8" fill={accent} />
          <circle cx="32" cy="11" r="3.4" fill={accent} />
          <circle cx="53" cy="18" r="2.8" fill={accent} />
          <circle cx="32" cy="34" r="3" fill={accent} />
        </>
      );

    case "baby-boy-sailboat":
      return (
        <>
          <line x1="32" y1="10" x2="32" y2="42" stroke={ink} strokeWidth="2" />
          <path
            d="M32 12 L48 37 L32 37 Z"
            fill={accent}
            opacity="0.85"
            stroke={ink}
            strokeWidth="1.3"
          />
          <path d="M30 16 L17 37 L30 37 Z" fill={surface} stroke={ink} strokeWidth="1.3" />
          <path d="M14 42 L50 42 L44 50 L20 50 Z" fill={ink} stroke={ink} strokeWidth="1.3" />
          <path
            d="M10 55 Q18 51 26 55 T42 55 T54 55"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      );

    case "baby-neutral-moon-bear":
      return (
        <>
          <path
            d="M42 14 C31 14 23 23 23 34 C23 45 32 53 43 52 C33 49 28 41 28 33 C28 24 34 17 42 14 Z"
            fill={accent}
            opacity="0.45"
            stroke={ink}
            strokeWidth="1.4"
          />
          <circle
            cx="34"
            cy="27"
            r="3.5"
            fill={accent}
            opacity="0.7"
            stroke={ink}
            strokeWidth="1.2"
          />
          <circle
            cx="45"
            cy="27"
            r="3.5"
            fill={accent}
            opacity="0.7"
            stroke={ink}
            strokeWidth="1.2"
          />
          <circle cx="39.5" cy="33" r="8.5" fill={surface} stroke={ink} strokeWidth="1.3" />
          <ellipse
            cx="39.5"
            cy="35.5"
            rx="3.2"
            ry="2.2"
            fill={surface}
            stroke={accent}
            strokeWidth="0.8"
          />
          <circle cx="39.5" cy="34.5" r="1.4" fill={ink} />
          <polygon
            points="18,16 19.5,20 23.5,20 20.2,22.5 21.5,26.5 18,24 14.5,26.5 15.8,22.5 12.5,20 16.5,20"
            fill={accent}
          />
        </>
      );

    case "gender-reveal-booties":
      return (
        <>
          <path
            d="M12 38 C12 31 17 27 23 27 L25 36 C28 37 29 41 26 44 L12 44 Z"
            fill={accent}
            opacity="0.55"
            stroke={ink}
            strokeWidth="1.4"
          />
          <path
            d="M52 38 C52 31 47 27 41 27 L39 36 C36 37 35 41 38 44 L52 44 Z"
            fill={ink}
            opacity="0.2"
            stroke={ink}
            strokeWidth="1.4"
          />
          <circle
            cx="32"
            cy="18"
            r="8"
            fill={accent}
            opacity="0.2"
            stroke={accent}
            strokeWidth="1.4"
          />
          <path
            d="M29.5 15.5 C29.5 13 34.5 13 34.5 15.8 C34.5 17.8 32 18 32 20"
            stroke={ink}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="32" cy="22.8" r="1" fill={ink} />
        </>
      );

    case "safari-lion":
      return (
        <>
          <circle
            cx="32"
            cy="35"
            r="18"
            fill={accent}
            opacity="0.85"
            stroke={ink}
            strokeWidth="1.5"
          />
          <circle cx="32" cy="36" r="12" fill={surface} stroke={ink} strokeWidth="1.4" />
          <circle cx="24" cy="26" r="3" fill={surface} stroke={ink} strokeWidth="1.2" />
          <circle cx="40" cy="26" r="3" fill={surface} stroke={ink} strokeWidth="1.2" />
          <circle cx="27.5" cy="34" r="1.8" fill={ink} />
          <circle cx="36.5" cy="34" r="1.8" fill={ink} />
          <polygon points="32,40 29.5,37.5 34.5,37.5" fill={ink} />
          <path
            d="M27 16 L29 10 L32 13 L35 10 L37 16 Z"
            fill={accent}
            stroke={ink}
            strokeWidth="1.2"
          />
        </>
      );

    case "fairy-butterfly":
      return (
        <>
          <line
            x1="16"
            y1="50"
            x2="38"
            y2="24"
            stroke={ink}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <polygon
            points="40,10 43,19 52,19 45,25 48,34 40,28 32,34 35,25 28,19 37,19"
            fill={accent}
            stroke={ink}
            strokeWidth="1.4"
          />
          <circle cx="22" cy="20" r="2" fill={accent} />
          <circle cx="50" cy="40" r="2.5" fill={accent} opacity="0.7" />
          <circle cx="18" cy="32" r="1.5" fill={accent} />
        </>
      );

    case "space-rocket":
      return (
        <>
          <path
            d="M32 8 C41 18 42 32 39 42 L25 42 C22 32 23 18 32 8 Z"
            fill={surface}
            stroke={ink}
            strokeWidth="1.5"
          />
          <path
            d="M24 34 L16 44 L25 42 Z M40 34 L48 44 L39 42 Z"
            fill={accent}
            stroke={ink}
            strokeWidth="1.2"
          />
          <circle cx="32" cy="24" r="5" fill={accent} stroke={ink} strokeWidth="1.3" />
          <path d="M28 43 L32 54 L36 43 Z" fill={accent} opacity="0.85" />
        </>
      );

    case "hot-air-balloon":
      return (
        <>
          <path
            d="M17 25 A 15 16 0 1 1 47 25 C47 33 38 40 36 42 L28 42 C26 40 17 33 17 25 Z"
            fill={accent}
            opacity="0.75"
            stroke={ink}
            strokeWidth="1.5"
          />
          <path
            d="M32 9 C26 18 26 32 29 42 M32 9 C38 18 38 32 35 42"
            stroke={surface}
            strokeWidth="1.4"
          />
          <line x1="28" y1="42" x2="29" y2="48" stroke={ink} strokeWidth="1.3" />
          <line x1="36" y1="42" x2="35" y2="48" stroke={ink} strokeWidth="1.3" />
          <rect
            x="27"
            y="48"
            width="10"
            height="7"
            rx="1.5"
            fill={accent}
            stroke={ink}
            strokeWidth="1.3"
          />
        </>
      );

    case "espresso-martini":
      return (
        <>
          <path
            d="M16 18 L48 18 L32 36 Z"
            fill={ink}
            opacity="0.25"
            stroke={accent}
            strokeWidth="1.8"
          />
          <rect x="19" y="18" width="26" height="4" fill={accent} opacity="0.7" />
          <line x1="32" y1="36" x2="32" y2="52" stroke={accent} strokeWidth="2" />
          <line
            x1="22"
            y1="52"
            x2="42"
            y2="52"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="29" cy="19.5" r="1.4" fill={ink} />
          <circle cx="32.5" cy="19.5" r="1.4" fill={ink} />
          <circle cx="36" cy="19.5" r="1.4" fill={ink} />
        </>
      );

    case "mihrab-pomegranate":
      return (
        <>
          <path
            d="M27 14 L29 9 L32 13 L35 9 L37 14 Z"
            fill={accent}
            stroke={ink}
            strokeWidth="1.2"
          />
          <circle
            cx="32"
            cy="34"
            r="16"
            fill={accent}
            opacity="0.3"
            stroke={accent}
            strokeWidth="1.8"
          />
          <circle cx="27" cy="31" r="2" fill={ink} opacity="0.7" />
          <circle cx="35" cy="29" r="2" fill={ink} opacity="0.7" />
          <circle cx="31" cy="39" r="2" fill={ink} opacity="0.7" />
          <circle cx="37" cy="37" r="2" fill={ink} opacity="0.7" />
        </>
      );

    case "rose-nightingale":
      return (
        <>
          <circle cx="32" cy="32" r="14" stroke={accent} strokeWidth="1.5" strokeDasharray="4 3" />
          <path d="M22 36 Q32 16 42 36 Q32 48 22 36 Z" fill={accent} opacity="0.45" />
          <circle cx="32" cy="32" r="5" fill={accent} stroke={ink} strokeWidth="1.2" />
          <path
            d="M14 26 Q18 20 24 22 M50 38 Q46 44 40 42"
            stroke={accent}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      );

    case "wedding-rings":
      return (
        <>
          <circle cx="25" cy="33" r="12" stroke={accent} strokeWidth="2.8" />
          <circle cx="39" cy="33" r="12" stroke={ink} strokeWidth="2.4" opacity="0.85" />
          <polygon points="25,14 29,18 25,22 21,18" fill={accent} />
        </>
      );

    case "diamond-ring":
      return (
        <>
          <circle cx="32" cy="38" r="13" stroke={accent} strokeWidth="3" />
          <polygon
            points="25,21 39,21 43,14 36,10 28,10 21,14"
            fill={surface}
            stroke={ink}
            strokeWidth="1.4"
          />
          <line x1="21" y1="14" x2="43" y2="14" stroke={ink} strokeWidth="1" />
          <line x1="32" y1="10" x2="32" y2="21" stroke={ink} strokeWidth="1" />
        </>
      );

    case "birthday-cake":
      return (
        <>
          <rect
            x="16"
            y="34"
            width="32"
            height="16"
            rx="3"
            fill={accent}
            opacity="0.65"
            stroke={ink}
            strokeWidth="1.4"
          />
          <rect
            x="21"
            y="24"
            width="22"
            height="10"
            rx="2"
            fill={surface}
            stroke={ink}
            strokeWidth="1.4"
          />
          <line x1="32" y1="14" x2="32" y2="24" stroke={ink} strokeWidth="2" />
          <path d="M32 7 Q35 12 32 14 Q29 12 32 7 Z" fill={accent} />
        </>
      );

    case "memorial-eucalyptus":
      return (
        <>
          <path d="M18 50 Q30 32 46 14" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse
            cx="26"
            cy="36"
            rx="5.5"
            ry="3.5"
            transform="rotate(-35 26 36)"
            fill={accent}
            opacity="0.45"
          />
          <ellipse
            cx="35"
            cy="34"
            rx="5.5"
            ry="3.5"
            transform="rotate(25 35 34)"
            fill={accent}
            opacity="0.45"
          />
          <ellipse
            cx="34"
            cy="23"
            rx="5"
            ry="3.2"
            transform="rotate(-35 34 23)"
            fill={accent}
            opacity="0.45"
          />
          <ellipse
            cx="43"
            cy="22"
            rx="4.5"
            ry="3"
            transform="rotate(25 43 22)"
            fill={accent}
            opacity="0.45"
          />
        </>
      );

    case "dove-olive-branch":
      return (
        <>
          <path
            d="M16 36 C24 34 28 24 22 16 C32 20 38 26 42 26 C46 26 49 23 50 26 C49 29 45 31 44 33 C42 40 32 45 20 44 L14 48 L19 41 Z"
            fill={surface}
            stroke={ink}
            strokeWidth="1.5"
          />
          <path d="M46 31 Q52 35 55 32" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </>
      );

    case "botanical-wreath":
      return (
        <>
          <circle cx="32" cy="32" r="18" stroke={accent} strokeWidth="1.6" />
          <ellipse cx="17" cy="24" rx="5" ry="2.6" transform="rotate(-35 17 24)" fill={accent} />
          <ellipse cx="16" cy="37" rx="5" ry="2.6" transform="rotate(25 16 37)" fill={accent} />
          <ellipse cx="47" cy="24" rx="5" ry="2.6" transform="rotate(35 47 24)" fill={accent} />
          <ellipse cx="48" cy="37" rx="5" ry="2.6" transform="rotate(-25 48 37)" fill={accent} />
          <circle cx="32" cy="14" r="3" fill={ink} />
        </>
      );

    case "coastal-pearl":
      return (
        <>
          <path
            d="M14 42 C14 25 22 16 32 16 C42 16 50 25 50 42 Z"
            fill={accent}
            opacity="0.25"
            stroke={ink}
            strokeWidth="1.5"
          />
          <path
            d="M22 42 L26 19 M32 42 L32 16 M42 42 L38 19"
            stroke={accent}
            strokeWidth="1.1"
            opacity="0.7"
          />
          <circle cx="32" cy="40" r="6.5" fill={surface} stroke={accent} strokeWidth="1.6" />
        </>
      );

    case "celestial-stars":
      return (
        <>
          <polygon points="32,10 35,23 48,26 35,29 32,42 29,29 16,26 29,23" fill={accent} />
          <polygon
            points="48,38 50,43 55,45 50,47 48,52 46,47 41,45 46,43"
            fill={accent}
            opacity="0.8"
          />
          <circle cx="17" cy="44" r="2.2" fill={accent} opacity="0.8" />
        </>
      );

    case "editorial-monogram":
      return (
        <>
          <rect x="16" y="14" width="32" height="36" stroke={ink} strokeWidth="1.8" />
          <line x1="21" y1="19" x2="43" y2="19" stroke={accent} strokeWidth="1.2" />
          <text
            x="32"
            y="40"
            textAnchor="middle"
            fontFamily="serif"
            fontSize="22"
            fontWeight="700"
            fill={ink}
          >
            M
          </text>
        </>
      );

    case "native-banksia":
      return (
        <>
          <ellipse
            cx="32"
            cy="24"
            rx="8"
            ry="13"
            fill={accent}
            opacity="0.75"
            stroke={ink}
            strokeWidth="1.4"
          />
          <line x1="26" y1="20" x2="38" y2="20" stroke={surface} strokeWidth="1.3" />
          <line x1="25" y1="26" x2="39" y2="26" stroke={surface} strokeWidth="1.3" />
          <line x1="32" y1="37" x2="32" y2="52" stroke={ink} strokeWidth="2" />
          <path
            d="M32 46 L20 38 M32 43 L44 35"
            stroke={ink}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      );

    case "henna-mandala":
      return (
        <>
          <circle cx="32" cy="32" r="20" stroke={accent} strokeWidth="1.6" strokeDasharray="3 2" />
          <circle cx="32" cy="32" r="13" stroke={ink} strokeWidth="1.4" />
          <circle cx="32" cy="32" r="5" fill={accent} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse
              key={deg}
              cx="32"
              cy="17"
              rx="2.6"
              ry="5"
              fill={accent}
              opacity="0.6"
              transform={`rotate(${deg} 32 32)`}
            />
          ))}
        </>
      );

    case "champagne-coupes":
      return (
        <>
          <path
            d="M14 20 L30 20 L22 33 Z"
            fill={accent}
            opacity="0.5"
            stroke={ink}
            strokeWidth="1.4"
          />
          <path
            d="M34 16 L50 16 L42 29 Z"
            fill={accent}
            opacity="0.5"
            stroke={ink}
            strokeWidth="1.4"
          />
          <line x1="22" y1="33" x2="22" y2="49" stroke={ink} strokeWidth="1.6" />
          <line x1="42" y1="29" x2="42" y2="45" stroke={ink} strokeWidth="1.6" />
          <line
            x1="16"
            y1="49"
            x2="28"
            y2="49"
            stroke={ink}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="36"
            y1="45"
            x2="48"
            y2="45"
            stroke={ink}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="32" cy="11" r="2" fill={accent} />
        </>
      );

    case "anniversary-laurel":
      return (
        <>
          <path
            d="M18 44 Q12 28 24 14 M46 44 Q52 28 40 14"
            stroke={accent}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <polygon
            points="32,18 35,26 43,26 37,31 39,39 32,34 25,39 27,31 21,26 29,26"
            fill={accent}
          />
          <ellipse
            cx="16"
            cy="28"
            rx="4"
            ry="2.2"
            transform="rotate(-30 16 28)"
            fill={ink}
            opacity="0.7"
          />
          <ellipse
            cx="48"
            cy="28"
            rx="4"
            ry="2.2"
            transform="rotate(30 48 28)"
            fill={ink}
            opacity="0.7"
          />
        </>
      );

    case "vintage-key-21":
      return (
        <>
          <circle cx="22" cy="32" r="10" stroke={accent} strokeWidth="2.8" />
          <circle cx="22" cy="32" r="4" stroke={ink} strokeWidth="1.2" />
          <line
            x1="32"
            y1="32"
            x2="52"
            y2="32"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line x1="44" y1="32" x2="44" y2="41" stroke={accent} strokeWidth="2.5" />
          <line x1="50" y1="32" x2="50" y2="39" stroke={accent} strokeWidth="2.5" />
        </>
      );

    case "wine-crest":
      return (
        <>
          <path
            d="M22 14 L42 14 L40 29 C40 35 36 39 32 39 C28 39 24 35 24 29 Z"
            fill={accent}
            opacity="0.6"
            stroke={ink}
            strokeWidth="1.5"
          />
          <line x1="32" y1="39" x2="32" y2="52" stroke={ink} strokeWidth="2" />
          <line
            x1="23"
            y1="52"
            x2="41"
            y2="52"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      );

    case "art-deco-fan":
      return (
        <>
          <path
            d="M10 46 A 22 22 0 0 1 54 46 Z"
            fill={accent}
            opacity="0.25"
            stroke={accent}
            strokeWidth="1.8"
          />
          <line x1="32" y1="46" x2="16" y2="29" stroke={accent} strokeWidth="1.4" />
          <line x1="32" y1="46" x2="24" y2="22" stroke={accent} strokeWidth="1.4" />
          <line x1="32" y1="46" x2="32" y2="20" stroke={accent} strokeWidth="1.8" />
          <line x1="32" y1="46" x2="40" y2="22" stroke={accent} strokeWidth="1.4" />
          <line x1="32" y1="46" x2="48" y2="29" stroke={accent} strokeWidth="1.4" />
        </>
      );

    case "tiara-crown":
      return (
        <>
          <path
            d="M12 42 Q32 16 52 42 Z"
            fill={accent}
            opacity="0.2"
            stroke={accent}
            strokeWidth="1.8"
          />
          <path d="M14 42 L22 26 L32 16 L42 26 L50 42" stroke={ink} strokeWidth="1.6" />
          <circle cx="32" cy="14" r="3.5" fill={accent} />
          <circle cx="22" cy="24" r="2.2" fill={accent} />
          <circle cx="42" cy="24" r="2.2" fill={accent} />
        </>
      );

    case "star-of-david":
      return (
        <>
          <polygon points="32,10 50,42 14,42" stroke={accent} strokeWidth="2" />
          <polygon points="32,54 14,22 50,22" stroke={accent} strokeWidth="2" />
          <circle cx="32" cy="32" r="4" fill={accent} opacity="0.5" />
        </>
      );

    case "crescent-lantern":
      return (
        <>
          <path
            d="M27 14 C18 16 14 26 17 35 C20 43 28 48 37 46 C28 45 23 38 22 30 C21 22 23 17 27 14 Z"
            fill={accent}
          />
          <rect
            x="38"
            y="24"
            width="12"
            height="18"
            rx="2"
            stroke={accent}
            strokeWidth="1.8"
            fill={accent}
            opacity="0.35"
          />
          <polygon points="44,16 50,24 38,24" fill={accent} />
          <line x1="44" y1="10" x2="44" y2="16" stroke={accent} strokeWidth="1.6" />
        </>
      );

    case "graduation-cap":
      return (
        <>
          <polygon points="32,14 54,25 32,36 10,25" fill={ink} stroke={accent} strokeWidth="1.6" />
          <path
            d="M20 31 L20 44 Q32 50 44 44 L44 31"
            stroke={accent}
            strokeWidth="1.8"
            fill={ink}
            opacity="0.8"
          />
          <line x1="50" y1="27" x2="50" y2="44" stroke={accent} strokeWidth="2" />
          <circle cx="50" cy="45" r="2.5" fill={accent} />
        </>
      );

    case "house-key-olive":
      return (
        <>
          <polygon
            points="32,12 52,29 12,29"
            fill={accent}
            opacity="0.3"
            stroke={ink}
            strokeWidth="1.8"
          />
          <rect x="18" y="29" width="28" height="20" stroke={ink} strokeWidth="1.8" />
          <rect x="28" y="37" width="8" height="12" fill={accent} />
        </>
      );

    case "trophy-gala":
      return (
        <>
          <path
            d="M20 14 L44 14 L41 31 Q32 40 23 31 Z"
            fill={accent}
            stroke={ink}
            strokeWidth="1.4"
          />
          <line x1="32" y1="36" x2="32" y2="48" stroke={accent} strokeWidth="3" />
          <rect x="23" y="48" width="18" height="5" rx="1.5" fill={ink} />
        </>
      );

    default:
      return (
        <>
          <circle cx="32" cy="32" r="18" stroke={accent} strokeWidth="1.6" strokeDasharray="4 3" />
          <polygon
            points="32,12 37,27 52,32 37,37 32,52 27,37 12,32 27,27"
            fill={accent}
            opacity="0.85"
          />
        </>
      );
  }
}

export interface OccasionCardArtworkProps {
  design: OccasionCardDesign;
  customHosts?: string | undefined;
  customHeadline?: string | undefined;
  customTitle?: string | undefined;
  className?: string | undefined;
}

/**
 * Miniature physical-style invitation card preview driven purely by the design's tokens.
 * Passes palette tokens as `--inv-*` custom properties so no hex colours appear in JSX class rules.
 */
export function OccasionCardArtwork({
  design,
  customHosts,
  customHeadline,
  customTitle,
  className,
}: OccasionCardArtworkProps) {
  const { palette, sample, cardShape, motif, badgeText } = design;
  const style = {
    "--inv-bg": palette.bg,
    "--inv-warm": palette.bgWarm,
    "--inv-surface": palette.surface,
    "--inv-ink": palette.ink,
    "--inv-ink-muted": palette.inkMuted,
    "--inv-accent": palette.accent,
    "--inv-rule": palette.rule,
  } as CSSProperties;

  return (
    <div className={className ? `pub-occ-card ${className}` : "pub-occ-card"} style={style}>
      <div className="pub-occ-sheet">
        <CardShapeSvg shape={cardShape} />
        <div className="pub-occ-inner">
          <span className="pub-occ-pill">{badgeText}</span>
          <CardMotifSvg motif={motif} />
          <p className="pub-occ-hosts">{customHosts ?? sample.hosts}</p>
          <p className="pub-occ-headline">{customHeadline ?? sample.headline}</p>
          <span className="pub-occ-rule" aria-hidden="true" />
          <p className="pub-occ-title">{customTitle ?? sample.title}</p>
        </div>
      </div>
    </div>
  );
}
