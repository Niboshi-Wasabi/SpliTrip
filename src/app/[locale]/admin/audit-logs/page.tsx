import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { listAdminAuditLogs } from "@/lib/admin/list-admin-audit-logs";
import { AuditLogsTable } from "./AuditLogsTable";

export const dynamic = "force-dynamic";

type AuditLogsPageProps = {
  params: Promise<{ locale: string }>;
};

async function AuditLogsContent() {
  const logsResult = await listAdminAuditLogs({ limit: 100 })
    .then((data) => ({ logs: data.logs, fetchError: null as null | unknown }))
    .catch((fetchError) => ({ logs: null as null, fetchError }));

  if (logsResult.fetchError || !logsResult.logs) {
    const error = logsResult.fetchError;
    console.error("[AuditLogsPage] 監査ログ取得エラー:", error);
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
        監査ログの取得に失敗しました。SUPABASE_SERVICE_ROLE_KEY の設定を確認してください。
      </div>
    );
  }

  return <AuditLogsTable logs={logsResult.logs} />;
}

export default async function AuditLogsPage({ params }: AuditLogsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <History className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <CardTitle className="flex flex-wrap items-center gap-2">
            {t("auditLogsTitle")}
            <Badge variant="outline" className="ml-0">
              {t("adminOnlyBadge")}
            </Badge>
          </CardTitle>
        </div>
        <CardDescription>{t("auditLogsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-[var(--apple-text-secondary)]">読み込み中...</p>
            </div>
          }
        >
          <AuditLogsContent />
        </Suspense>
      </CardContent>
    </Card>
  );
}
