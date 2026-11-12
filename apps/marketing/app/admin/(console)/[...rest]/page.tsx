import { notFound } from "next/navigation";

/**
 * Any other address under /admin. The console layout has already required a staff session, so a
 * signed-out visitor is sent to sign in and learns nothing about which pages exist.
 */
export default function ConsoleUnknownPage(): never {
  notFound();
}
