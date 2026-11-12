import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInvitationShell } from "@managevent/i18n";
import { AuthPage } from "@/components/auth/AuthPage";
import { TwoFactorForm } from "@/components/auth/TwoFactorForm";
import { privateMetadata } from "@/lib/metadata";
import { safeNextPath } from "@/lib/next-path";
import { getMeOptional } from "@/lib/session";

const copy = getInvitationShell("en").auth;

export const metadata: Metadata = privateMetadata(copy.twoFactor.metaTitle);

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const me = await getMeOptional();
  if (me.user) redirect(next);

  return (
    <AuthPage
      eyebrow={copy.twoFactor.eyebrow}
      title={copy.twoFactor.title}
      lead={copy.twoFactor.lead}
    >
      <TwoFactorForm next={next} copy={copy} />
    </AuthPage>
  );
}
