import type { Metadata } from "next";
import { getInvitationPublic, getInvitationShell } from "@managevent/i18n";
import { Container, Eyebrow } from "@managevent/ui/brand";
import { UnsubscribeSchema } from "@managevent/validators";
import { buttonClass, Notice, SubmitButton } from "@/components/ui";
import { privateMetadata } from "@/lib/metadata";
import { routes, wwwLinks } from "@/lib/urls";
import { unsubscribeFormAction } from "./actions";

const copy = getInvitationPublic("en").unsubscribe;
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.metaTitle);

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * Email preferences, reached from the unsubscribe link at the bottom of an invitation or
 * reminder email (`/unsubscribe?t=<signed token>`).
 *
 * Opening the page changes nothing: mail scanners and link previews fetch links, so the
 * address is only taken off the list when the person presses the button. The page never shows
 * the address and never logs the token.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = first(params.t);
  const status = first(params.status);
  const tokenLooksValid = UnsubscribeSchema.safeParse({ token }).success;

  const state: "done" | "invalid" | "confirm" =
    status === "done" ? "done" : status === "invalid" || !tokenLooksValid ? "invalid" : "confirm";

  const homeLink = (
    <a className={buttonClass({ variant: "secondary" })} href={routes.home}>
      {copy.home}
    </a>
  );

  return (
    <main id="main" tabIndex={-1}>
      <Container size="narrow" className="pub-quiet">
        <Eyebrow>{copy.eyebrow}</Eyebrow>

        {state === "done" ? (
          <>
            <h1>{copy.doneTitle}</h1>
            <p className="lead" role="status">
              {copy.doneBody}
            </p>
            <div className="page-hero-actions">{homeLink}</div>
          </>
        ) : null}

        {state === "invalid" ? (
          <>
            <h1>{copy.invalidTitle}</h1>
            <p className="lead">{copy.invalidBody}</p>
            <div className="page-hero-actions">
              <a className={buttonClass()} href={wwwLinks.contact} rel="noopener">
                {shell.capabilities.contactUs}
              </a>
              {homeLink}
            </div>
          </>
        ) : null}

        {state === "confirm" ? (
          <>
            <h1>{copy.confirmTitle}</h1>
            <p className="lead">{copy.confirmBody}</p>
            {status === "error" ? (
              <Notice tone="danger" role="alert" title={copy.errorTitle} className="pub-after">
                {copy.errorBody}
              </Notice>
            ) : null}
            <form action={unsubscribeFormAction}>
              <input type="hidden" name="t" value={token} />
              <SubmitButton size="large" pendingLabel={copy.confirmPending}>
                {copy.confirmAction}
              </SubmitButton>
            </form>
          </>
        ) : null}
      </Container>
    </main>
  );
}
