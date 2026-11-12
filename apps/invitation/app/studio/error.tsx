"use client";

import { ErrorScreen, type ErrorScreenProps } from "@/components/ErrorScreen";

/** Error boundary for studio pages. The studio shell (top bar, account menu) stays in place. */
export default function StudioError({ error, reset }: Pick<ErrorScreenProps, "error" | "reset">) {
  return <ErrorScreen error={error} reset={reset} withMain={false} />;
}
