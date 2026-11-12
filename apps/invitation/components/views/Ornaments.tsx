import type { InvitationThemeId } from "@managevent/types";

/**
 * Decorative SVG for the guest micro-site. Every shape is drawn in `currentColor` (the parent
 * sets it from a theme token), so one drawing serves every theme. All of it is `aria-hidden`.
 *
 * Each celebration theme has its own emblem: a jewelled rule (Royal Ivory), a single hairline
 * (Alabaster and Platinum), a crescent among stars (Midnight Celestial) and a pair of leafy
 * sprigs (Emerald Botanic). Memorial themes carry a plain fine rule and nothing else.
 */

const svgProps = {
  "aria-hidden": true,
  focusable: false,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** A four-point star centred on (cx, cy). */
function star(cx: number, cy: number, r: number): string {
  const inner = r * 0.28;
  return [
    `M${cx} ${cy - r}`,
    `L${cx + inner} ${cy - inner}`,
    `L${cx + r} ${cy}`,
    `L${cx + inner} ${cy + inner}`,
    `L${cx} ${cy + r}`,
    `L${cx - inner} ${cy + inner}`,
    `L${cx - r} ${cy}`,
    `L${cx - inner} ${cy - inner}`,
    "Z",
  ].join(" ");
}

function JewelRule() {
  return (
    <svg {...svgProps} className="inv-emblem" viewBox="0 0 200 28" width="200" height="28">
      <path d="M4 14H70M130 14H196" />
      <path d="M100 3l11 11-11 11-11-11z" />
      <path d="M100 9l5 5-5 5-5-5z" fill="currentColor" stroke="none" />
      <path d="M79 10l4 4-4 4-4-4zM121 10l4 4-4 4-4-4z" />
    </svg>
  );
}

function Hairline() {
  return (
    <svg {...svgProps} className="inv-emblem" viewBox="0 0 200 28" width="200" height="28">
      <path d="M100 2V26" />
    </svg>
  );
}

function Crescent() {
  return (
    <svg {...svgProps} className="inv-emblem" viewBox="0 0 200 44" width="200" height="44">
      <path
        d="M104 9A14 14 0 1 0 104 35A13.4 13.4 0 0 1 104 9Z"
        fill="currentColor"
        stroke="none"
      />
      <g fill="currentColor" stroke="none">
        <path d={star(64, 22, 7)} />
        <path d={star(138, 14, 5)} />
        <path d={star(150, 31, 3)} />
        <path d={star(42, 12, 3)} />
        <path d={star(28, 30, 2)} />
        <path d={star(172, 20, 2)} />
      </g>
    </svg>
  );
}

const LEAF = "M0 0C4-6 12-6 17 0C12 6 4 6 0 0Z";

/** One sprig: a curved stem with paired leaves, growing from its base at the start. */
function Sprig() {
  const leaves = [
    { x: 14, y: 20.5, up: -52, down: 40 },
    { x: 30, y: 17.6, up: -50, down: 42 },
    { x: 46, y: 14.4, up: -48, down: 44 },
    { x: 61, y: 11, up: -46, down: 46 },
  ];
  return (
    <>
      <path d="M2 22C28 20 56 14 86 4" />
      {leaves.map((leaf) => (
        <g key={leaf.x}>
          <path
            d={LEAF}
            transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.up})`}
            fill="currentColor"
            fillOpacity="0.22"
          />
          <path
            d={LEAF}
            transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.down})`}
            fill="currentColor"
            fillOpacity="0.1"
          />
        </g>
      ))}
      <path
        d={LEAF}
        transform="translate(76 7.4) rotate(-18)"
        fill="currentColor"
        fillOpacity="0.22"
      />
    </>
  );
}

/** Two sprigs growing outwards from a centre bead. */
function Sprigs() {
  return (
    <svg {...svgProps} className="inv-emblem" viewBox="0 0 200 40" width="200" height="40">
      <g transform="translate(106 8)">
        <Sprig />
      </g>
      <g transform="translate(94 8) scale(-1 1)">
        <Sprig />
      </g>
      <circle cx="100" cy="30" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FineRule() {
  return (
    <svg {...svgProps} className="inv-emblem" viewBox="0 0 200 12" width="200" height="12">
      <path d="M60 6H140" />
    </svg>
  );
}

/** The emblem at the head of the invitation, chosen by theme. */
export function Emblem({ themeId }: { themeId: InvitationThemeId }) {
  switch (themeId) {
    case "royal-ivory":
      return <JewelRule />;
    case "alabaster-platinum":
      return <Hairline />;
    case "midnight-celestial":
      return <Crescent />;
    case "emerald-botanic":
      return <Sprigs />;
    default:
      return <FineRule />;
  }
}

/** The small mark above a section title. */
export function SectionMark({ themeId }: { themeId: InvitationThemeId }) {
  switch (themeId) {
    case "royal-ivory":
      return (
        <svg {...svgProps} className="inv-mark" viewBox="0 0 80 12" width="80" height="12">
          <path d="M2 6H30M50 6H78" />
          <path d="M40 1l5 5-5 5-5-5z" />
        </svg>
      );
    case "midnight-celestial":
      return (
        <svg {...svgProps} className="inv-mark" viewBox="0 0 80 14" width="80" height="14">
          <path d="M2 7H28M52 7H78" />
          <path d={star(40, 7, 6)} fill="currentColor" stroke="none" />
        </svg>
      );
    case "emerald-botanic":
      return (
        <svg {...svgProps} className="inv-mark" viewBox="0 0 80 14" width="80" height="14">
          <path d="M2 7H26M54 7H78" />
          <path
            d={LEAF}
            transform="translate(40 7) rotate(-150)"
            fill="currentColor"
            fillOpacity="0.25"
          />
          <path
            d={LEAF}
            transform="translate(40 7) rotate(-30)"
            fill="currentColor"
            fillOpacity="0.25"
          />
        </svg>
      );
    case "alabaster-platinum":
      return (
        <svg {...svgProps} className="inv-mark" viewBox="0 0 80 12" width="80" height="12">
          <path d="M28 6H52" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps} className="inv-mark" viewBox="0 0 80 12" width="80" height="12">
          <path d="M24 6H56" />
        </svg>
      );
  }
}

/** The arch glyph pressed into the wax seal and the ribbon knot. */
export function ArchGlyph() {
  return (
    <svg
      {...svgProps}
      className="inv-glyph"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      strokeWidth={1.5}
    >
      <path d="M8 27V15a8 8 0 0 1 16 0v12" />
      <path d="M12.5 27V16a3.5 3.5 0 0 1 7 0v11" />
      <path d="M5 27h22" />
    </svg>
  );
}

/** A scatter of stars behind the Midnight Celestial hero. Purely decorative. */
export function StarField() {
  const stars: [number, number, number][] = [
    [40, 60, 5],
    [120, 24, 3],
    [210, 90, 4],
    [300, 36, 2.5],
    [372, 120, 5],
    [450, 48, 3],
    [520, 150, 2.5],
    [580, 70, 4],
    [90, 170, 2.5],
    [260, 190, 3],
    [430, 220, 2],
    [16, 250, 3],
    [560, 270, 3],
    [180, 300, 2],
    [340, 320, 3.5],
    [70, 370, 3],
    [500, 380, 2.5],
  ];
  return (
    <svg
      {...svgProps}
      className="inv-starfield"
      viewBox="0 0 600 420"
      preserveAspectRatio="xMidYMin slice"
    >
      <g fill="currentColor" stroke="none">
        {stars.map(([x, y, r]) => (
          <path key={`${x}-${y}`} d={star(x, y, r)} />
        ))}
      </g>
    </svg>
  );
}

/** A leafy branch for the corners of the Emerald Botanic hero. */
export function CornerBranch({ corner }: { corner: "start" | "end" }) {
  const leaves = [
    { x: 22, y: 150, r: -110 },
    { x: 30, y: 128, r: -20 },
    { x: 40, y: 108, r: -118 },
    { x: 52, y: 88, r: -28 },
    { x: 66, y: 70, r: -128 },
    { x: 82, y: 54, r: -40 },
    { x: 100, y: 40, r: -140 },
    { x: 120, y: 28, r: -52 },
    { x: 142, y: 19, r: -150 },
  ];
  return (
    <svg
      {...svgProps}
      className="inv-branch"
      data-corner={corner}
      viewBox="0 0 180 180"
      width="180"
      height="180"
    >
      <path d="M14 176C24 110 70 44 172 12" />
      {leaves.map((leaf) => (
        <path
          key={leaf.x}
          d={LEAF}
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r}) scale(1.5)`}
          fill="currentColor"
          fillOpacity="0.18"
        />
      ))}
    </svg>
  );
}
