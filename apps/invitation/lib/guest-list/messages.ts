/**
 * The messages a host sends with a private link: the invitation and the reminder. Wording comes
 * from `packages/i18n`; this only chooses the variant (calm for a memorial, "do not pass it on"
 * when forwarding is off, "by {deadline}" when a reply-by date is set) and fills in the event.
 *
 * The result still contains `{name}` and `{link}`: the client fills those per household.
 */
import { fill } from "./fill";

export interface MessageEvent {
  title: string;
  /** "Friday, 23 October 2026". */
  date: string;
  hosts: string;
  memorial: boolean;
}

export interface InviteMessageCopy {
  body: string;
  bodyPrivate: string;
  bodyMemorial: string;
  bodyMemorialPrivate: string;
}

/** The invitation message template for this event, with `{name}` and `{link}` left to fill. */
export function inviteMessageTemplate(
  copy: InviteMessageCopy,
  event: MessageEvent,
  options: { allowForwarding: boolean },
): string {
  const template = event.memorial
    ? options.allowForwarding
      ? copy.bodyMemorial
      : copy.bodyMemorialPrivate
    : options.allowForwarding
      ? copy.body
      : copy.bodyPrivate;
  return fill(template, { title: event.title, date: event.date, hosts: event.hosts });
}

export interface ReminderMessageCopy {
  body: string;
  bodyDeadline: string;
  bodyMemorial: string;
  bodyMemorialDeadline: string;
}

/** The reminder template for this event. `deadline` is a formatted date, or null when none is set. */
export function reminderMessageTemplate(
  copy: ReminderMessageCopy,
  event: Pick<MessageEvent, "title" | "hosts" | "memorial">,
  deadline: string | null,
): string {
  const template = event.memorial
    ? deadline
      ? copy.bodyMemorialDeadline
      : copy.bodyMemorial
    : deadline
      ? copy.bodyDeadline
      : copy.body;
  return fill(template, {
    title: event.title,
    hosts: event.hosts,
    ...(deadline ? { deadline } : {}),
  });
}

/** Fills the household's name and link into a prepared template. */
export function personalise(template: string, name: string, link: string): string {
  return fill(template, { name, link });
}
