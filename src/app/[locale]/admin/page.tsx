import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { Users, FileText, Settings2, LifeBuoy, TrendingUp, Shield } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/auth/admin-guard";
import { listAdminUsers } from "@/lib/admin/list-admin-users";
import { UsersTable } from "./UsersTable";

type AdminPageProps = {
  params: Promise<{ locale: string }>;
};

async function AdminUsersContent() {
  try {
    const users = await listAdminUsers();
    return <UsersTable users={users} />;
  } catch (error) {
    console.error("[AdminPage] ユーザー一覧取得エラー:", error);
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
        ユーザー一覧の取得に失敗しました。SUPABASE_SERVICE_ROLE_KEY の設定を確認してください。
      </div>
    );
  }
}

async function AdminOverview() {
  try {
    const users = await listAdminUsers();
    const totalUsers = users.length;
    const proUsers = users.filter(user => user.premium_access).length;
    const adminUsers = users.filter(user => user.is_admin).length;
    
    return (
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              登録済みユーザー
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PROユーザー</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proUsers}</div>
            <p className="text-xs text-muted-foreground">
              {totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0}% がPRO
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理者</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
            <p className="text-xs text-muted-foreground">
              管理権限保持者
            </p>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("[AdminOverview] 概要取得エラー:", error);
    return null;
  }
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  // 管理者権限チェック
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("Admin");

  return (
    <div className="space-y-6">
      {/* 管理画面概要 */}
      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">読み込み中...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
              </CardContent>
            </Card>
          ))}
        </div>
      }>
        <AdminOverview />
      </Suspense>

      {/* クイックアクション */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/announcements" className="group">
          <Card className="hover:shadow-md transition-shadow group-hover:border-blue-200 dark:group-hover:border-blue-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-sm">{t("navAnnouncements")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                お知らせの作成・編集
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/system" className="group">
          <Card className="hover:shadow-md transition-shadow group-hover:border-green-200 dark:group-hover:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle className="text-sm">{t("navSystem")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                システム設定管理
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/audit-logs" className="group">
          <Card className="hover:shadow-md transition-shadow group-hover:border-purple-200 dark:group-hover:border-purple-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-sm">{t("navAudit")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                操作履歴の確認
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/support" className="group">
          <Card className="hover:shadow-md transition-shadow group-hover:border-orange-200 dark:group-hover:border-orange-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-sm">{t("navSupport")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                サポートツール
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ユーザー管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>ユーザー管理</CardTitle>
          </div>
          <CardDescription>
            登録ユーザーの一覧表示とPRO権限の手動付与・解除
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">読み込み中...</div>
            </div>
          }>
            <AdminUsersContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}