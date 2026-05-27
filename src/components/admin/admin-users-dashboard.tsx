"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminUsers } from "@/components/admin/admin-data-provider";
import { UsersTable } from "@/app/[locale]/admin/UsersTable";
import { useMemo } from "react";
import type { AdminUserListItem } from "@/lib/admin/list-admin-users";

export function AdminUsersDashboard() {
  const { 
    data: usersResponse, 
    error: fetchError, 
    isLoading,
    mutate: refreshUsers 
  } = useAdminUsers();
  
  const users = useMemo(() => {
    if (usersResponse?.ok && usersResponse?.items) {
      return usersResponse.items;
    }
    return [];
  }, [usersResponse]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">
        読み込み中…
      </div>
    );
  }

  const hasFetchFailure = Boolean(fetchError);
  const hasExplicitFailure = usersResponse != null && usersResponse.ok === false;
  if (hasFetchFailure || hasExplicitFailure) {
    const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError ?? "");
    console.error("[AdminUsersDashboard] データ取得エラー:", fetchError);
    const isConfigError =
      fetchError && typeof fetchError === "object" && "status" in fetchError
        ? (fetchError as { status: number }).status === 500
        : false;
    const isPermissionError =
      fetchError && typeof fetchError === "object" && "status" in fetchError
        ? (fetchError as { status: number }).status === 403
        : false;
    
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {isConfigError ? (
            <>
              <p className="font-semibold mb-2">サーバー設定エラー</p>
              <p>サーバー側の設定を確認してください。問題が続く場合はサポートに連絡してください。</p>
            </>
          ) : isPermissionError ? (
            <p>管理者権限が不足しています。管理者アカウントでログインしているか確認してください。</p>
          ) : (
            <>
              <p>ユーザー一覧の取得に失敗しました。</p>
              {errorMessage ? (
                <p className="mt-1 text-xs">詳細: {errorMessage}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => refreshUsers()}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            再試行
          </Button>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const proCount = users.filter((userItem: AdminUserListItem) => userItem.premium_access).length;
  const adminCount = users.filter((userItem: AdminUserListItem) => userItem.is_admin).length;

  return (
    <div className="space-y-6">
      {/* 手動リフレッシュボタン */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refreshUsers()}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          更新
        </Button>
      </div>

      {/* KPIカード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-[var(--apple-text-secondary)]">登録済みユーザー</p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PROユーザー</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proCount}</div>
            <p className="text-xs text-[var(--apple-text-secondary)]">
              {totalUsers > 0 ? Math.round((proCount / totalUsers) * 100) : 0}% がPRO
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理者</CardTitle>
            <Shield className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-[var(--apple-text-secondary)]">管理権限を持つユーザー</p>
          </CardContent>
        </Card>
      </div>

      {/* ユーザーテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー管理</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <UsersTable users={users} />
        </CardContent>
      </Card>
    </div>
  );
}