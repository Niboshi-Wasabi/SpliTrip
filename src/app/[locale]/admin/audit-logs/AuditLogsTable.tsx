"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown, Shield, CheckCircle, XCircle, Trash2 } from "lucide-react";
import type { AdminAuditLogItem } from "@/lib/admin/list-admin-audit-logs";

type AuditLogsTableProps = {
  logs: AdminAuditLogItem[];
};

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const t = useTranslations("Admin");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "grant_pro":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {t("actionGrantPro")}
          </Badge>
        );
      case "revoke_pro":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("actionRevokePro")}
          </Badge>
        );
      case "delete_user":
        return (
          <Badge variant="destructive" className="gap-1">
            <Trash2 className="h-3 w-3" />
            {t("actionDeleteUser")}
          </Badge>
        );
      case "announcement_create":
        return <Badge variant="default">{t("actionAnnouncementCreate")}</Badge>;
      case "announcement_update":
        return <Badge variant="outline">{t("actionAnnouncementUpdate")}</Badge>;
      case "announcement_delete":
        return <Badge variant="destructive">{t("actionAnnouncementDelete")}</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) {
      return "詳細なし";
    }

    // 前回の状態と新しい状態を表示
    const { previous_state, new_state } = details;
    if (previous_state && new_state) {
      const prevAccess = previous_state.premium_access ? "PRO" : "無料";
      const newAccess = new_state.premium_access ? "PRO" : "無料";
      const prevSource = previous_state.premium_access_source || "none";
      const newSource = new_state.premium_access_source || "none";
      
      return `${prevAccess} (${prevSource}) → ${newAccess} (${newSource})`;
    }

    // フォールバック: JSON文字列として表示
    return JSON.stringify(details, null, 2).substring(0, 100) + "...";
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--apple-text-secondary)]">
        {t("noAuditLogs")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("auditColTime")}</TableHead>
              <TableHead>{t("auditColAdmin")}</TableHead>
              <TableHead>{t("auditColTarget")}</TableHead>
              <TableHead>{t("auditColAction")}</TableHead>
              <TableHead>{t("auditColDetails")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="text-sm font-mono">
                    {formatDate(log.created_at)}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {log.admin_display_name || "管理者"}
                    </div>
                    <div className="text-sm text-[var(--apple-text-secondary)]">
                      {log.admin_email || "メール未設定"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {log.target_display_name || "ユーザー"}
                    </div>
                    <div className="text-sm text-[var(--apple-text-secondary)]">
                      {log.target_email || "メール未設定"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getActionBadge(log.action)}
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={formatDetails(log.details)}>
                    {formatDetails(log.details)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-[var(--apple-text-secondary)] text-center">
        {logs.length} 件の操作履歴を表示中（最新100件まで）
      </div>
    </div>
  );
}