# Accessibility

- **Target:** WCAG 2.2 AA on every surface (web now; mobile and desktop when built). Disability Discrimination Act 1992 context.
- **Checks on every UI change:** an axe scan and a keyboard pass. Both web apps' Playwright suites already run axe (`@axe-core/playwright`) on their key pages; extend them with each new page. Before release, test with screen readers (VoiceOver on iOS and macOS, TalkBack, NVDA). CI runs the marketing suite today; the invitation suite and Safari are INV-18.
- **Motion:** the invitation gate has a `prefers-reduced-motion` path (a short crossfade). Any new orchestrated animation needs one too ([`../design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md#motion)).
- **Colour:** decorative accents (champagne gold, warm bronze) never carry small body text. `packages/ui/src/ui.test.tsx` asserts every documented text pairing meets its ratio.
- **Statement:** published at `/accessibility` on www, with a contact address for feedback.
- **Guest access needs:** hosts can turn on an accessibility question on the RSVP (`askAccessibility`); answers are stored encrypted like dietary data.
- **Venue access data** (step-free access, accessible toilets, hearing loops): the venue content schema has an `accessible` field, but the `/venues` page does not show it yet. Show it before naming venues as partners (BIZ-07).
