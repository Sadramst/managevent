import type { ReactNode } from "react";
import { getAdminPages } from "@managevent/i18n";
import { headers } from "next/headers";
import { AdminHeader } from "../../../components/admin-header";
import { ADMIN_PATH_HEADER } from "../../../lib/admin/constants";
import { requireStaff } from "../../../lib/admin/server";

/** Every page in this group needs a staff session; anyone else is sent to the sign-in page. */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const user = await requireStaff();
  const path = ((await headers()).get(ADMIN_PATH_HEADER) ?? "").split("?")[0];
  return (
    <>
      <AdminHeader copy={getAdminPages("en")} user={user} onInbox={path === "/admin"} />
      {children}
    </>
  );
}
