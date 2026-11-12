/**
 * @managevent/ui/brand
 *
 * The Managevent brand shell: logo, site header, site footer and page primitives.
 * Every component is server-compatible and styled only by `@managevent/ui/brand.css`
 * (no Tailwind utilities), so an app needs no `@source` scanning of this package.
 */
export { type BrandLink, type BrandProduct, type BrandTone, cx } from "./shared.js";
export { BrandLogo, type BrandLogoProps } from "./BrandLogo.js";
export { SiteHeader, type SiteHeaderCrossLink, type SiteHeaderProps } from "./SiteHeader.js";
export { SiteMenu, type SiteMenuProps } from "./SiteMenu.js";
export {
  SiteFooter,
  type SiteFooterColumn,
  type SiteFooterContact,
  type SiteFooterProps,
} from "./SiteFooter.js";
export {
  ButtonLink,
  type ButtonLinkProps,
  Card,
  type CardProps,
  Container,
  type ContainerProps,
  Eyebrow,
  type EyebrowProps,
  PageHero,
  type PageHeroProps,
  Section,
  SectionHead,
  type SectionHeadProps,
  type SectionProps,
} from "./primitives.js";
