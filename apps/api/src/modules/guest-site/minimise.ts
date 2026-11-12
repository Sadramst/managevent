/**
 * Data minimisation for a guest RSVP (Australian Privacy Principle 3: collect only what is
 * needed).
 *
 * The guest's browser decides what it sends; the host's RSVP settings decide what the event
 * needs. Anything the host did not ask for is dropped here, before validation against the party
 * and before anything is stored, so a stale page, a modified client or a direct API call cannot
 * leave personal or health information on file that nobody asked for.
 *
 * Rules:
 * - a guest who is not coming (`NO`) needs no catering or access arrangements: their health block
 *   is dropped, and the RSVP transaction clears what an earlier "yes" left on file;
 * - dietary and allergy fields are kept only when `askDietary` is on, accessibility notes only
 *   when `askAccessibility` is on; when neither is on, no health block is written at all;
 * - song requests are kept only when the song prompt is shown, the message only when `askMessage`
 *   is on, and contact details only when `askContact` is on.
 *
 * Pure: no database, no clock.
 */
import type { GuestRsvpHealth, GuestRsvpSubmit, RsvpConfig } from "@managevent/validators";

function minimiseHealth(
  health: GuestRsvpHealth | undefined,
  config: RsvpConfig,
): GuestRsvpHealth | undefined {
  if (!health) return undefined;
  // Neither question is shown: leave the stored block alone and store nothing new.
  if (!config.askDietary && !config.askAccessibility) return undefined;

  const kept: GuestRsvpHealth = { dietary: config.askDietary ? health.dietary : [] };
  if (config.askDietary) {
    if (health.allergyNotes !== undefined) kept.allergyNotes = health.allergyNotes;
    if (health.allergySeverity !== undefined) kept.allergySeverity = health.allergySeverity;
  }
  if (config.askAccessibility && health.accessibilityNotes !== undefined) {
    kept.accessibilityNotes = health.accessibilityNotes;
  }
  return kept;
}

/** The submission reduced to what this invitation's RSVP settings ask for. */
export function minimiseRsvpSubmission(body: GuestRsvpSubmit, config: RsvpConfig): GuestRsvpSubmit {
  const { messageToHost, contact, ...rest } = body;
  return {
    ...rest,
    members: body.members.map(({ health, ...member }) => {
      const kept = member.status === "NO" ? undefined : minimiseHealth(health, config);
      return kept ? { ...member, health: kept } : member;
    }),
    plusOnes: body.plusOnes.map(({ health, ...plusOne }) => {
      const kept = minimiseHealth(health, config);
      return kept ? { ...plusOne, health: kept } : plusOne;
    }),
    songRequests: config.songPrompt === "HIDDEN" ? [] : body.songRequests,
    ...(config.askMessage && messageToHost !== undefined ? { messageToHost } : {}),
    ...(config.askContact && contact !== undefined ? { contact } : {}),
  };
}
