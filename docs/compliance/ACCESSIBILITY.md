# Accessibility

- **Target:** WCAG 2.2 AA across web, mobile and desktop. Disability Discrimination Act 1992 context.
- Every PR involving UI must have an axe scan and keyboard pass. Test with screen readers before release (VoiceOver iOS and macOS, TalkBack, NVDA).
- RTL screen-reader checks for Farsi.
- **Motion:** `prefers-reduced-motion` alternatives for the gate reveal and the hero dial.
- **Colour:** champagne gold and muted slate never carry body text (they fail contrast). The tokens enforce this.
- **Events:** venue accessibility data (step-free access, accessible toilets, hearing loops) is shown on venue pages. Guest accessibility needs flow to planners.
- Publish an accessibility statement at `/accessibility`, with a contact address for feedback.
