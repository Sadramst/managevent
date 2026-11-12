import { describe, expect, it } from "vitest";
import config, { unloggedRequests } from "../next.config";

/**
 * `next dev` prints the path of every incoming request unless told otherwise. A guest link is
 * a credential (`/i/{eventSlug}/{guestToken}`), and so are the tokens in email-preference,
 * password-reset and sign-in links: none of them may reach a terminal or a captured log.
 */
describe("request logging in development", () => {
  const ignored = (url: string) => unloggedRequests.some((pattern) => pattern.test(url));

  it("is configured to skip the paths that carry a credential", () => {
    expect(config.logging).toMatchObject({
      serverFunctions: false,
      incomingRequests: { ignore: unloggedRequests },
    });
  });

  it.each([
    "/i/amara-and-jon-k3xq/the-okafors-abcd2345",
    "/i/amara-and-jon-k3xq/the-okafors-abcd2345/pass",
    "/i/amara-and-jon-k3xq/the-okafors-abcd2345/calendar.ics",
    "/i/amara-and-jon-k3xq/the-okafors-abcd2345?opened=1&_rsc=abc12",
    "/legacy/invite/abcDEF123",
    "/anniversary/the-okafors-abcd2345",
    "/e/amara-and-jon-k3xq/the-okafors-abcd2345",
    "/unsubscribe?t=eyJhbGciOiJIUzI1NiJ9.token",
    "/reset-password?token=Zm9vYmFy",
    "/api/auth/magic-link/verify?token=Zm9vYmFy&callbackURL=%2Fstudio",
    "/api/auth/reset-password/Zm9vYmFy?callbackURL=%2Freset-password",
  ])("does not log %s", (url) => {
    expect(ignored(url)).toBe(true);
  });

  it.each(["/", "/templates", "/pricing", "/sign-in?next=%2Fstudio", "/studio/evt_1/guests"])(
    "still logs %s",
    (url) => {
      expect(ignored(url)).toBe(false);
    },
  );
});
