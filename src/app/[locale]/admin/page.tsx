import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Shield } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/auth/admin-guard";
import { listAdminUsers } from "@/lib/admin/list-admin-users";
import { UsersTable } from "./UsersTable";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * ユーザー一覧と概要は 1 回の listAdminUsers のみ（二重呼び出しを避けて TTFB を短縮）。
 */
async function AdminUsersDashboard() {
  try {
    const users = await listAdminUsers();
    const totalUsers = users.length;
    const proCount = users.filter((userItem) => userItem.premium_access).length;
    const adminCount = users.filter((userItem) => userItem.is_admin).length;

    return (
      <>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
              <Users className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">登録済みユーザー</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PROユーザー</CardTitle>
              <TrendingUp className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proCount}</div>
              <p className="text-xs text-muted-foreground">
                {totalUsers > 0 ? Math.round((proCount / totalUsers) * 100) : 0}% がPRO
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">管理者</CardTitle>
              <Shield className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminCount}</div>
              <p className="text-xs text-muted-foreground">管理権限保持者</p>
            </CardContent>
          </Card>
        </div>

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
            <UsersTable users={users} />
          </CardContent>
        </Card>
      </>
    );
  } catch (error) {
    console.error("[AdminPage] ダッシュボード取得エラー:", error);
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
        ユーザー一覧の取得に失敗しました。SUPABASE_SERVICE_ROLE_KEY の設定を確認してください。
      </div>
    );
  }
}

function AdminUsersDashboardFallback() {
  return (
    <>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">読み込み中...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>ユーザー管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<AdminUsersDashboardFallback />}>
        <AdminUsersDashboard />
      </Suspense>
    </div>
  );
}
