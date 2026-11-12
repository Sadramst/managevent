import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInvitationShell } from "@managevent/i18n";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPage } from "@/components/auth/AuthPage";
import { privateMetadata } from "@/lib/metadata";
import { safeNextPath } from "@/lib/next-path";
import { getMeOptional } from "@/lib/session";
import { wwwLinks } from "@/lib/urls";

const copy = getInvitationShell("en").auth;

export const metadata: Metadata = privateMetadata(copy.signIn.metaTitle);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const query = await searchParams;
  const next = safeNextPath(query.next);
  // Set by the auth proxy when an emailed link fails. Only this one value is recognised: text
  // from the address is never shown.
  const linkFailed = query.error === "link";
  const me = await getMeOptional();
  if (me.user) redirect(next);

  return (
    <AuthPage
      eyebrow={copy.signIn.eyebrow}
      title={copy.signIn.title}
      lead={copy.signIn.lead}
      points={copy.signIn.points}
    >
      <AuthForm
        mode="sign-in"
        next={next}
        capabilities={{
          magicLink: me.capabilities.magicLink,
          passwordReset: me.capabilities.passwordReset,
        }}
        copy={copy}
        legal={{ terms: wwwLinks.terms, privacy: wwwLinks.privacy }}
        initialError={linkFailed ? "linkFailed" : undefined}
      />
    </AuthPage>
  );
}
