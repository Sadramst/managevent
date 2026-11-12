import { t } from "@managevent/i18n";

export const chaseCopy = {
  pageTitle: t("en", "invitation.chasePageTitle"),
  backToStudio: t("en", "invitation.chaseBackToStudio"),
  statAwaiting: t("en", "invitation.chaseStatAwaiting"),
  statReplied: t("en", "invitation.chaseStatReplied"),
  statTotal: t("en", "invitation.chaseStatTotal"),
  noDeadline: t("en", "invitation.chaseNoDeadline"),
  deadlineOpen: (days: number) =>
    days === 1 ? "1 day left to reply" : `${days} days left to reply`,
  deadlineDueToday: t("en", "invitation.chaseDeadlineDueToday"),
  deadlineClosed: (days: number) =>
    days === 1 ? "Reply-by date passed 1 day ago" : `Reply-by date passed ${days} days ago`,
  memorialRepliesRequested: (date: string) => `Replies requested by ${date}`,
  seats: (n: number) => (n === 1 ? "1 seat" : `${n} seats`),
  table: (label: string) => `Table ${label}`,
  nobodyAwaiting: t("en", "invitation.chaseNobodyAwaiting"),
  messageLabel: (name: string) => `Reminder message for ${name}`,
  copy: t("en", "invitation.chaseCopy"),
  copied: t("en", "invitation.chaseCopied"),
  copyAria: (name: string) => `Copy message for ${name}`,
  copyFailed: t("en", "invitation.chaseCopyFailed"),
  reminder: {
    celebration: {
      greeting: (name: string) => `Hi ${name},`,
      intro: (title: string) => `We would love to know if you can join us for ${title}.`,
      deadline: (date: string) => `Could you please let us know by ${date}?`,
      noDeadline: t("en", "invitation.chaseCelebrationNoDeadline"),
      close: t("en", "invitation.chaseCelebrationClose"),
    },
    memorial: {
      greeting: (name: string) => `Dear ${name},`,
      intro: (title: string) =>
        `We are writing about ${title}. We would be grateful to know whether you are able to attend.`,
      deadline: (date: string) => `A reply by ${date} would help us plan with care.`,
      noDeadline: t("en", "invitation.chaseMemorialNoDeadline"),
      close: t("en", "invitation.chaseMemorialClose"),
    },
  },
} as const;
