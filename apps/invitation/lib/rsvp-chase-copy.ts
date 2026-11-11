// DECISION-NEEDED(PROD-INV-01): these en-AU strings are kept local because
// lib/i18n.ts and packages/i18n are off limits for this change. Migrate the keys
// into packages/i18n through a `contract-change` issue.

export const chaseCopy = {
  pageTitle: "Awaiting replies",
  backToStudio: "Back to Host Studio",
  statAwaiting: "Parties awaiting",
  statReplied: "Parties replied",
  statTotal: "Total parties",
  noDeadline: "No reply-by date set",
  deadlineOpen: (days: number) =>
    days === 1 ? "1 day left to reply" : `${days} days left to reply`,
  deadlineDueToday: "Replies are due today",
  deadlineClosed: (days: number) =>
    days === 1 ? "Reply-by date passed 1 day ago" : `Reply-by date passed ${days} days ago`,
  memorialRepliesRequested: (date: string) => `Replies requested by ${date}`,
  seats: (n: number) => (n === 1 ? "1 seat" : `${n} seats`),
  table: (label: string) => `Table ${label}`,
  nobodyAwaiting: "Every invited party has replied.",
  messageLabel: (name: string) => `Reminder message for ${name}`,
  copy: "Copy message",
  copied: "Copied",
  copyAria: (name: string) => `Copy reminder message for ${name}`,
  copyFailed: "Could not copy. Select the message text and copy it by hand.",
  reminder: {
    celebration: {
      greeting: (name: string) => `Hi ${name},`,
      intro: (title: string) => `We would love to know if you can join us for ${title}.`,
      deadline: (date: string) => `Could you please let us know by ${date}?`,
      noDeadline: "Could you please let us know when you can?",
      close: "Thank you!",
    },
    memorial: {
      greeting: (name: string) => `Dear ${name},`,
      intro: (title: string) =>
        `We are writing about ${title}. We would be grateful to know whether you are able to attend.`,
      deadline: (date: string) => `A reply by ${date} would help us plan with care.`,
      noDeadline: "A reply when you are able would help us plan with care.",
      close: "With thanks.",
    },
  },
} as const;
