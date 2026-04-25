import { setRequestLocale } from "next-intl/server";
import { AdminUsersDashboard } from "@/components/admin/admin-users-dashboard";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminUsersDashboard />;
}