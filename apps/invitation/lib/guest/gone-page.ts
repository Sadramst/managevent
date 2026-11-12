/**
 * The pages `proxy.ts` answers with before any route renders:
 * - `gone` (HTTP 410): the host has turned this guest link off;
 * - `busy` (HTTP 429): the rate limit the API keeps for guest pages has been reached.
 *
 * Each is one self-contained HTML document: no stylesheet, script, font or image request, and
 * nothing about the event or the guest. They use the calm (memorial) palette because the mode of
 * the event is not known here and a quiet page is right for both.
 */
import { getDir, getInvitationGuest } from "@managevent/i18n";
import { designTokens, memorialTokens } from "@managevent/ui/tokens";

export type GuestStatusPage = "gone" | "busy";

export const GUEST_STATUS_HEADERS: Readonly<Record<string, string>> = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The full HTML document for a guest link that cannot be shown right now. Pure. */
export function buildGuestStatusHtml(kind: GuestStatusPage): string {
  const guest = getInvitationGuest("en");
  const copy = guest[kind];
  const palette = memorialTokens;
  const { typography, radius } = designTokens;
  const css = [
    "*{box-sizing:border-box}",
    `html{background:${palette.surface};color:${palette.ink};font-family:${typography.latinBody};line-height:1.7;-webkit-text-size-adjust:100%}`,
    "body{margin:0;min-block-size:100dvh;display:grid;place-items:center;padding:2rem 1.25rem}",
    `main{inline-size:100%;max-inline-size:32rem;padding:2.5rem 1.75rem;border:1px solid ${palette.accent};border-radius:${radius.panel};background:${palette.surfaceRaised};text-align:center}`,
    `h1{margin:0 0 1rem;font-family:${typography.latinDisplay};font-weight:500;font-size:2rem;line-height:1.2}`,
    "p{margin:0}",
    `hr{inline-size:3rem;margin:1.75rem auto 1.25rem;border:0;border-block-start:1px solid ${palette.accent}}`,
    `.credit{font-size:0.85rem;color:${palette.inkMuted}}`,
  ].join("");

  return [
    "<!doctype html>",
    `<html lang="en-AU" dir="${getDir("en")}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex, nofollow, noarchive">',
    `<meta name="theme-color" content="${palette.surface}">`,
    `<title>${escapeHtml(copy.title)}</title>`,
    `<style>${css}</style>`,
    "</head>",
    "<body>",
    "<main>",
    `<h1>${escapeHtml(copy.title)}</h1>`,
    `<p>${escapeHtml(copy.body)}</p>`,
    "<hr>",
    `<p class="credit">${escapeHtml(guest.gone.credit)}</p>`,
    "</main>",
    "</body>",
    "</html>",
  ].join("");
}
