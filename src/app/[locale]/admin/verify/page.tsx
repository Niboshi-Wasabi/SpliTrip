import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { toAdminPostStepUpPath } from "@/lib/auth/sanitize-redirect-path";
import { AdminStepUpPanel } from "@/components/auth/admin-step-up-panel";
import { createClient } from "@/utils/supabase/server";

type AdminVerifyPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminVerifyPage({
  params,
  searchParams,
}: AdminVerifyPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const afterStepUpPath = toAdminPostStepUpPath(query.next);

  // 管理者権限チェック（管理者でない場合はダッシュボードへ）
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // プロフィールから管理者権限を確認
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect(`/${locale}/dashboard`);
  }

  // 2FA廃止により、管理者再認証をスキップして直接リダイレクト
  redirect(afterStepUpPath);
}