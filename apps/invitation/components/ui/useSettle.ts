"use client";

import { useCallback } from "react";
import type { ActionResult } from "@/lib/action-result";
import { settle } from "@/lib/client-action";
import { useUiCopy } from "./UiCopy";

/**
 * `settle()` with the shared "could not reach Managevent" message already filled in.
 *
 *   const run = useSettle();
 *   startTransition(async () => {
 *     const result = await run(() => createPartyAction(eventId, input, key));
 *     if (!result) return;             // the action redirected: leave everything as it is
 *     if (!result.ok) setFailure(result.message);   // includes a dropped connection
 *   });
 *
 * Every server action a client component calls goes through this (or `settle` directly), so a
 * failed request is reported next to the form and never throws away what was typed.
 */
export function useSettle(): <T>(
  call: () => Promise<ActionResult<T> | undefined>,
) => Promise<ActionResult<T> | null> {
  const { networkError } = useUiCopy();
  return useCallback(
    <T>(call: () => Promise<ActionResult<T> | undefined>) => settle(call, networkError),
    [networkError],
  );
}
