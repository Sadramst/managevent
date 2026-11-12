"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./Button";

export type SubmitButtonProps = Omit<ButtonProps, "type">;

/**
 * The submit button for a `<form action={serverAction}>`: it reads the pending state of the
 * form with `useFormStatus`, so it shows a spinner and blocks a second submit with no extra
 * wiring. Must be rendered inside the form. Pass `pending` too when the form is submitted by
 * hand (an `onSubmit` handler with `useTransition`).
 */
export function SubmitButton({ pending, ...rest }: SubmitButtonProps) {
  const status = useFormStatus();
  return <Button {...rest} type="submit" pending={Boolean(pending) || status.pending} />;
}
