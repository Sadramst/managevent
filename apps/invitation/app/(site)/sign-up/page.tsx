import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fillCopy, getInvitationShell } from "@managevent/i18n";
import { INVITATION_PLANS } from "@managevent/payments/plans";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPage } from "@/components/auth/AuthPage";
import { privateMetadata } from "@/lib/metadata";
import { safeNextPath } from "@/lib/next-path";
import { getMeOptional } from "@/lib/session";
import { wwwLinks } from "@/lib/urls";

const copy = getInvitationShell("en").auth;

export const metadata: Metadata = privateMetadata(copy.signUp.metaTitle);

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const me = await getMeOptional();
  if (me.user) redirect(next);

  // The free guest limit comes from the plan config, never from copy.
  const freeGuests = INVITATION_PLANS.FREE.maxGuests;
  const points = copy.signUp.points.map((point) => fillCopy(point, { guests: freeGuests }));

  return (
    <AuthPage
      eyebrow={copy.signUp.eyebrow}
      title={copy.signUp.title}
      lead={copy.signUp.lead}
      points={points}
    >
      <AuthForm
        mode="sign-up"
        next={next}
        capabilities={{
          magicLink: me.capabilities.magicLink,
          passwordReset: me.capabilities.passwordReset,
        }}
        copy={copy}
        legal={{ terms: wwwLinks.terms, privacy: wwwLinks.privacy }}
      />
    </AuthPage>
  );
}
