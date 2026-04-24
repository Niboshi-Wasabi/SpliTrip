import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { unstable_setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, FileText, Shield } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/auth/admin-guard";
import { listAdminAuditLogs } from "@/lib/admin/list-admin-audit-logs";
import { AuditLogsTable } from "./AuditLogsTable";

type AuditLogsPageProps = {
  params: { locale: string };
};

async function AuditLogsContent() {
  try {
    const logs = await listAdminAuditLogs(100); // 最新100件
    return <AuditLogsTable logs={logs} />;
  } catch (error) {
    console.error("[AuditLogsPage] 監査ログ取得エラー:", error);
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
        監査ログの取得に失敗しました。SUPABASE_SERVICE_ROLE_KEY の設定を確認してください。
      </div>
    );
  }
}

export default async function AuditLogsPage({ params: { locale } }: AuditLogsPageProps) {
  unstable_setRequestLocale(locale);
  
  // 管理者権限チェック
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  const t = useTranslations("Admin");

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin" className="text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
              {t("backToUserList")}
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t("auditLogsTitle")}</h1>
              <Badge variant="outline" className="ml-2">
                {t("adminOnlyBadge")}
              </Badge>
            </div>
            <p className="text-muted-foreground">{t("auditLogsDescription")}</p>
          </div>
        </div>
      </div>

      {/* 監査ログ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            管理操作の履歴
          </CardTitle>
          <CardDescription>
            PRO権限の付与・解除などの管理者操作を新しい順に表示します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">読み込み中...</div>
            </div>
          }>
            <AuditLogsContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}