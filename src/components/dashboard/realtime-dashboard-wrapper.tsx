"use client";

import React, { useState, useCallback } from "react";
import { useGroupFullData } from "@/hooks/useGroupData";
import { useDashboardStats, useUserGroups } from "@/components/providers/app-data-provider";
import { useRealtimeSync } from "@/components/realtime/realtime-sync-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, CreditCard, TrendingUp, Calendar } from "lucide-react";

type Props = {
  currentUserId: string;
};

export function RealtimeDashboardWrapper({ currentUserId }: Props) {
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const { showUpdateNotification } = useRealtimeSync();
  
  // SWRフックを使用してデータを取得
  const { data: dashboardStats, mutate: mutateDashboard, isLoading: statsLoading } = useDashboardStats();
  const { data: userGroups, mutate: mutateGroups, isLoading: groupsLoading } = useUserGroups();

  // リアルタイム変更の通知
  const handleRealtimeChange = useCallback(() => {
    showUpdateNotification("ダッシュボードが更新されました");
  }, [showUpdateNotification]);

  // 手動更新
  const handleManualRefresh = useCallback(async () => {
    setIsManualRefresh(true);
    try {
      await Promise.all([
        mutateDashboard(),
        mutateGroups(),
      ]);
    } finally {
      setTimeout(() => setIsManualRefresh(false), 500);
    }
  }, [mutateDashboard, mutateGroups]);

  const isLoading = statsLoading || groupsLoading;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-muted-foreground">
            グループの出費とメンバーの概要
          </p>
        </div>
        <Button 
          onClick={handleManualRefresh} 
          disabled={isManualRefresh || isLoading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isManualRefresh ? "animate-spin" : ""}`} />
          更新
        </Button>
      </div>

      {/* 統計カード */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総出費</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{dashboardStats?.totalExpenses?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                全グループ合計
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">参加グループ</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.groupCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                アクティブなグループ
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総メンバー</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.totalMembers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                全グループ合計
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">未精算</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{dashboardStats?.unsettledAmount?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                精算待ち金額
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* グループ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>最近のグループ</CardTitle>
          <CardDescription>
            参加中のグループ一覧（リアルタイム同期）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GroupListSkeleton />
          ) : userGroups?.groups?.length > 0 ? (
            <div className="space-y-3">
              {userGroups.groups.map((group: any) => (
                <GroupCard key={group.id} group={group} currentUserId={currentUserId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">参加しているグループがありません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 個別グループカード（リアルタイム同期付き）
function GroupCard({ group, currentUserId }: { group: any; currentUserId: string }) {
  const { data: groupData } = useGroupFullData(group.id, currentUserId);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{group.name}</h3>
        <p className="text-sm text-muted-foreground">
          {groupData?.stats?.memberCount || 0}人のメンバー • 
          ¥{groupData?.stats?.totalExpenses?.toLocaleString() || 0}
        </p>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <a href={`/dashboard/groups/${group.id}`}>
          詳細
        </a>
      </Button>
    </div>
  );
}

// ローディングスケルトン
function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-24 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GroupListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}