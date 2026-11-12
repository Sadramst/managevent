"use client";

import { ErrorScreen, type ErrorScreenProps } from "@/components/ErrorScreen";

/** Error boundary for everything outside the studio (public pages, sign-in, guest pages). */
export default function RootError({ error, reset }: Pick<ErrorScreenProps, "error" | "reset">) {
  return <ErrorScreen error={error} reset={reset} />;
}
