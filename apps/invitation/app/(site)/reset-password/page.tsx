import type { Metadata } from "next";
import { getInvitationShell } from "@managevent/i18n";
import { ButtonLink } from "@managevent/ui/brand";
import { AuthPage } from "@/components/auth/AuthPage";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Notice } from "@/components/ui/Notice";
import { privateMetadata } from "@/lib/metadata";
import { getMeOptional } from "@/lib/session";
import { routes, wwwLinks } from "@/lib/urls";

const shell = getInvitationShell("en");
const copy = shell.auth;

export const metadata: Metadata = {
  ...privateMetadata(copy.reset.metaTitle),
  // The reset token arrives in the query string: keep it out of the Referer of any link.
  referrer: "no-referrer",
};

function first(value: string | string[] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.length <= 500 ? single : null;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const query = await searchParams;
  const token = first(query.token);
  const linkInvalid = first(query.error) !== null;
  const { capabilities } = await getMeOptional();

  // Without an email provider no reset link can be sent. Say so; never pretend to send one.
  if (!capabilities.passwordReset) {
    return (
      <AuthPage
        eyebrow={copy.reset.eyebrow}
        title={copy.reset.unavailableTitle}
        lead={copy.reset.unavailableLead}
      >
        <Notice tone="warning">
          <p>{shell.capabilities.passwordResetOff}</p>
        </Notice>
        <div className="form-actions">
          <ButtonLink label={shell.capabilities.contactUs} href={wwwLinks.contact} external />
          <ButtonLink variant="secondary" label={copy.reset.backToSignIn} href={routes.signIn} />
        </div>
      </AuthPage>
    );
  }

  const choosing = token !== null && !linkInvalid;
  return (
    <AuthPage
      eyebrow={copy.reset.eyebrow}
      title={choosing ? copy.reset.newTitle : copy.reset.requestTitle}
      lead={choosing ? copy.reset.newLead : copy.reset.requestLead}
    >
      <ResetPasswordForm token={token} linkInvalid={linkInvalid} copy={copy} />
    </AuthPage>
  );
}
