import { notFound } from "next/navigation";
import { AdminDashboard } from "../../../components/admin-dashboard";
import { pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    ...pageMetadata("en", "Admin & Planner Command Centre", "/admin"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return (
    <main id="main" className="wrap section">
      <AdminDashboard />
    </main>
  );
}
