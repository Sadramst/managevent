/**
 * Scheduled cron definitions for `apps/worker` (`Australia/Perth` time zone).
 */

export interface WorkerCronSchedule {
  name: string;
  cron: string;
  timeZone: "Australia/Perth";
  description: string;
}

export const WORKER_SCHEDULES: readonly WorkerCronSchedule[] = [
  {
    name: "invitation.email_campaign_sweep",
    cron: "*/5 * * * *",
    timeZone: "Australia/Perth",
    description:
      "Every five minutes: re-queues email campaigns whose job was lost and settles ones that never finished",
  },
  {
    name: "retention.cleanup",
    cron: "0 2 * * *",
    timeZone: "Australia/Perth",
    description:
      "Nightly APP 11 data retention job (nulls dietary/allergy fields 90 days post-event; purges expired packs)",
  },
  {
    name: "vendor.compliance_expiry_check",
    cron: "30 8 * * *",
    timeZone: "Australia/Perth",
    description:
      "Daily check for expiring vendor public liability, RSA and food safety certificates",
  },
] as const;
