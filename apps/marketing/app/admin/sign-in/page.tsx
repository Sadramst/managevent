import { getAdminPages } from "@managevent/i18n";
import { BrandLogo } from "@managevent/ui/brand";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSignInForm } from "../../../components/admin-sign-in-form";
import { parseSignInReason, safeAdminNext } from "../../../lib/admin/leads";
import { getStaffSession } from "../../../lib/admin/server";

const copy = getAdminPages("en");

export const metadata: Metadata = { title: copy.signIn.metaTitle };

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const next = safeAdminNext(query.next);
  const reason = parseSignInReason(query.reason);

  // Already signed in as staff: nothing to do here. If the API cannot be reached the form is
  // still shown; signing in will report the problem.
  const session = await getStaffSession().catch(() => null);
  if (session?.status === "staff") redirect(next);

  return (
    <main id="main" className="wrap console-auth">
      <div className="console-auth-inner">
        <div className="console-auth-brand">
          <BrandLogo descriptor={copy.shell.productLabel} />
        </div>
        <div className="panel">
          <h1>{copy.signIn.title}</h1>
          <p className="lead">{copy.signIn.lead}</p>
          <AdminSignInForm
            copy={copy.signIn}
            next={next}
            // "Staff only" is shown to a signed-in host who followed a link here; a stale
            // `?reason=staff` on its own says nothing true about the visitor.
            notice={reason === "staff" && session?.status !== "not-staff" ? undefined : reason}
          />
        </div>
        <p className="notice console-auth-help">{copy.signIn.help}</p>
      </div>
    </main>
  );
}
