import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { generateTailwindV4ThemeCss, tailwindBrandTokens } from "@managevent/config/tailwind";
import {
  celebrationTokens,
  designTokens,
  getContrastRatio,
  getCssVariablesForMode,
  memorialTokens,
  type PaletteTokens,
} from "../tokens.js";
import {
  BrandLogo,
  ButtonLink,
  Card,
  Container,
  PageHero,
  Section,
  SectionHead,
  SiteFooter,
  SiteHeader,
} from "./index.js";

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const tailwindCss = read("../../../config/tailwind.css");
const brandCss = read("./brand.css");

/** Reads every `--name: value;` declaration inside the first block whose selector matches. */
function declarations(css: string, selector: RegExp): Record<string, string> {
  const block = new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`).exec(css);
  if (!block?.[1]) throw new Error(`Block not found: ${selector.source}`);
  const out: Record<string, string> = {};
  for (const match of block[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) out[name] = value.trim();
  }
  return out;
}

const normalise = (value: string) => value.replace(/"/g, "'").toLowerCase();

const cssName = (key: string) => `--me-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

function paletteAsCssVars(palette: Readonly<PaletteTokens>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [cssName(key), normalise(value)]),
  );
}

describe("design tokens stay in sync across the three copies", () => {
  const celebrationCss = declarations(tailwindCss, /\[data-experience-mode="celebration"\]/);
  const memorialCss = declarations(tailwindCss, /\[data-experience-mode="memorial"\]/);
  const themeCss = declarations(tailwindCss, /@theme/);

  it("packages/ui tokens.ts equals packages/config tailwind.ts", () => {
    expect(tailwindBrandTokens.celebration).toEqual(celebrationTokens);
    expect(tailwindBrandTokens.memorial).toEqual(memorialTokens);
    expect(tailwindBrandTokens.radius).toEqual(designTokens.radius);
    expect(tailwindBrandTokens.fonts.displayLatin).toBe(designTokens.typography.latinDisplay);
    expect(tailwindBrandTokens.fonts.bodyLatin).toBe(designTokens.typography.latinBody);
    expect(tailwindBrandTokens.motion.easing).toBe(designTokens.motion.easing);
    expect(tailwindBrandTokens.motion.uiMs).toBe(designTokens.motion.uiMs);
  });

  it("packages/config tailwind.css carries the same palettes as tokens.ts", () => {
    const lower = (vars: Record<string, string>) =>
      Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, normalise(v)]));
    expect(lower(celebrationCss)).toEqual(paletteAsCssVars(celebrationTokens));
    expect(lower(memorialCss)).toEqual(paletteAsCssVars(memorialTokens));
  });

  it("getCssVariablesForMode() emits exactly the variables tailwind.css defines", () => {
    expect(Object.keys(getCssVariablesForMode("CELEBRATION")).sort()).toEqual(
      Object.keys(celebrationCss).sort(),
    );
    expect(Object.keys(getCssVariablesForMode("MEMORIAL")).sort()).toEqual(
      Object.keys(memorialCss).sort(),
    );
  });

  it("tailwind.css @theme carries the same radii, fonts and easing as tokens.ts", () => {
    for (const [name, value] of Object.entries(designTokens.radius)) {
      expect(themeCss[`--radius-${name}`]).toBe(value);
    }
    expect(normalise(themeCss["--font-display"] ?? "")).toBe(
      normalise(designTokens.typography.latinDisplay),
    );
    expect(normalise(themeCss["--font-sans"] ?? "")).toBe(
      normalise(designTokens.typography.latinBody),
    );
    expect(themeCss["--ease-brand"]).toBe(designTokens.motion.easing);
  });

  it("defines the aliases Tailwind utilities rely on (rounded-button, rounded-card, font-serif)", () => {
    expect(themeCss["--radius-button"]).toBe(themeCss["--radius-control"]);
    expect(themeCss["--radius-card"]).toBe(themeCss["--radius-panel"]);
    expect(themeCss["--font-serif"]).toBe(themeCss["--font-display"]);
  });

  it("the generated theme from tailwind.ts matches the checked-in tailwind.css", () => {
    const squash = (css: string) => normalise(css).replace(/\s+/g, " ").trim();
    expect(squash(generateTailwindV4ThemeCss())).toBe(squash(tailwindCss));
  });

  it("every colour brand.css reads is a token that tailwind.css defines", () => {
    const palette = new Set(Object.keys(celebrationCss));
    const paletteReads = [...brandCss.matchAll(/var\((--me-[\w-]+)/g)]
      .map((match) => match[1] ?? "")
      .filter((name) => !new RegExp(`${name}:`).test(brandCss));
    expect(paletteReads.length).toBeGreaterThan(0);
    for (const name of paletteReads) expect(palette, name).toContain(name);
  });
});

describe("brand.css rules", () => {
  // Comments may show example values, so they are not part of the checks.
  const code = brandCss.replace(/\/\*[\s\S]*?\*\//g, "");

  it("contains no raw colour values, only tokens", () => {
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
  });

  it("uses logical properties only", () => {
    expect(code).not.toMatch(
      /(^|[\s;{])(margin|padding|border)-(left|right)\b|[\s;{](left|right)\s*:|text-align:\s*(left|right)|float:\s*(left|right)/,
    );
    expect(code).not.toMatch(/[\s;{](width|height|min-width|max-width|min-height|max-height)\s*:/);
  });

  it("keeps every rule inside a cascade layer so utilities and page styles can override it", () => {
    const outside = code
      .replace(/@layer\s+[\w-]+\s*\{[\s\S]*?\n\}/g, "")
      .replace(/@layer[^;{]+;/g, "")
      .trim();
    expect(outside).toBe("");
  });

  it("handles reduced motion, visible focus and Memorial Mode", () => {
    expect(code).toContain("prefers-reduced-motion: reduce");
    expect(code).toContain(":focus-visible");
    expect(code).toContain('[data-experience-mode="memorial"]');
    expect(code).toContain("--me-shadow-soft:");
    expect(code).toMatch(/\[data-experience-mode="memorial"\][\s\S]*box-shadow:\s*none/);
  });
});

describe("status and accent-strong tokens are text-safe (WCAG AA)", () => {
  it.each([
    ["celebration", celebrationTokens],
    ["memorial", memorialTokens],
  ] as const)("%s", (_, palette) => {
    for (const key of ["accentStrong", "danger", "success", "warning"] as const) {
      expect(getContrastRatio(palette[key], palette.surface), key).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(palette[key], palette.surfaceRaised), key).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
});

describe("brand shell components", () => {
  const nav = [
    { label: "Services", href: "/#services" },
    { label: "Estimator", href: "/#estimator" },
  ];

  it("BrandLogo renders one token-driven lockup with no Tailwind utilities or hex colours", () => {
    const html = renderToStaticMarkup(<BrandLogo descriptor="Events" />);
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain('data-tone="onLight"');
    expect(html).toContain('<span class="brand-name">Managevent</span>');
    expect(html).toContain('<span class="brand-descriptor">Events</span>');
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(html).not.toMatch(/text-white|font-serif|amber/);
    expect(renderToStaticMarkup(<BrandLogo tone="onDark" size="sm" />)).toContain(
      'data-tone="onDark" data-size="sm"',
    );
  });

  it("BrandLogo mark-only variant is named for assistive technology", () => {
    const html = renderToStaticMarkup(<BrandLogo markOnly title="Managevent" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Managevent"');
    expect(html).not.toContain("brand-name");
  });

  it("SiteHeader renders the nav, the sibling-site link at its index, the CTA and a no-JS menu", () => {
    const html = renderToStaticMarkup(
      <SiteHeader
        product="events"
        productLabel="Events"
        homeHref="/"
        navLabel="Main"
        menuLabel="Menu"
        navItems={nav}
        crossLink={{ label: "Invitations", href: "https://invitation.example", index: 1 }}
        cta={{ label: "Talk to us", href: "/#enquiry" }}
        secondaryCta={{ label: "Sign in", href: "/sign-in" }}
      />,
    );
    expect(html).toContain('data-product="events"');
    expect(html).toContain('<a class="site-brand" href="/">');
    const desktopNav = html.slice(
      html.indexOf('class="site-nav"'),
      html.indexOf("site-header-actions"),
    );
    expect([...desktopNav.matchAll(/>([^<]+)<\/a>/g)].map((m) => m[1])).toEqual([
      "Services",
      "Invitations",
      "Estimator",
    ]);
    expect(desktopNav).toContain('href="https://invitation.example" rel="noopener"');
    expect(html).toContain('<details class="site-menu">');
    expect(html).toContain("<summary");
    expect(html.match(/Talk to us/g)).toHaveLength(2);
    expect(html).not.toContain("/admin");
  });

  it("SiteFooter renders columns, sibling links, contact, acknowledgement, legal and byline", () => {
    const html = renderToStaticMarkup(
      <SiteFooter
        product="invitations"
        productLabel="Invitations"
        homeHref="/"
        tagline="Perth, Western Australia"
        columns={[{ title: "Explore", links: nav }]}
        crossLinks={{
          title: "Managevent",
          links: [{ label: "Event planning", href: "https://www.example", external: true }],
        }}
        contact={{ title: "Contact", email: "hello@example.com", phone: "0400000000" }}
        legalLabel="Legal"
        legalLinks={[{ label: "Privacy", href: "https://www.example/privacy" }]}
        acknowledgement="We acknowledge the Traditional Custodians."
        byline="A product by Appilico"
      />,
    );
    expect(html).toContain('data-product="invitations"');
    expect(html).toContain("--footer-cols:3");
    expect(html).toContain('<nav class="footer-col" aria-label="Explore">');
    expect(html).toContain('href="https://www.example" rel="noopener"');
    expect(html).toContain('href="mailto:hello@example.com"');
    expect(html).toContain('href="tel:0400000000"');
    expect(html).toContain("We acknowledge the Traditional Custodians.");
    expect(html).toContain("A product by Appilico");
    expect(html).toContain('<ul class="footer-legal" aria-label="Legal">');
    expect(html).toContain('data-tone="onLight"');
  });

  it("SiteFooter dark tone switches the surface and the logo tone", () => {
    const html = renderToStaticMarkup(
      <SiteFooter
        product="events"
        productLabel="Events"
        homeHref="/"
        columns={[]}
        legalLabel="Legal"
        legalLinks={[]}
        acknowledgement="Ack"
        byline="By"
        tone="dark"
      />,
    );
    expect(html).toContain('class="footer-shell surface-dark"');
    expect(html).toContain('data-tone="onDark"');
  });

  it("primitives map to the brand.css vocabulary", () => {
    const html = renderToStaticMarkup(
      <>
        <PageHero eyebrow="Invitations" title="Host studio" lead="Lead" tone="dark" />
        <Section band tight id="guests">
          <SectionHead eyebrow="Guests" title="Guest list" lead="Everyone you invited." />
          <Container size="narrow">
            <Card as="article" variant="accent">
              <ButtonLink label="Open" href="/x" variant="secondary" size="small" block />
            </Card>
            <Card variant="sheet" />
          </Container>
        </Section>
      </>,
    );
    expect(html).toContain('class="page-hero surface-dark"');
    expect(html).toContain("<h1>Host studio</h1>");
    expect(html).toContain('<section class="band" id="guests">');
    expect(html).toContain('class="wrap section section-tight"');
    expect(html).toContain('<p class="eyebrow">Guests</p><h2>Guest list</h2>');
    expect(html).toContain('class="wrap wrap-narrow"');
    expect(html).toContain('<article class="card card-accent">');
    expect(html).toContain('class="button button-secondary button-small button-block" href="/x"');
    expect(html).toContain('<div class="panel">');
  });
});
