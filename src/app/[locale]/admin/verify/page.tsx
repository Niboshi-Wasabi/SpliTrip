import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth/admin-guard";
import { AdminStepUpPanel } from "@/components/auth/admin-step-up-panel";

type AdminVerifyPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminVerifyPage({ params }: AdminVerifyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  // 管理者権限チェック（管理者でない場合はダッシュボードへ）
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 dark:from-blue-950/50 dark:via-background dark:to-emerald-950/40">
      <AdminStepUpPanel />
    </div>
  );
}