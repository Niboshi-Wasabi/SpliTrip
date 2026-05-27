"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePerformanceTracking } from "@/lib/performance/performance-monitor";
import { Activity, Clock, Database, Zap, RefreshCw, Wifi } from "lucide-react";
import type { PerformanceSummary, ApiPerformanceData, CachePerformanceData } from "@/types/performance";

export function PerformanceDashboard() {
  const { getMetrics, getSummary } = usePerformanceTracking();
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = () => {
    setIsRefreshing(true);
    const summary = getSummary();
    setPerformanceSummary(summary);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    refreshMetrics();
    
    // 30秒ごとに自動更新
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!performanceSummary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            パフォーマンス監視
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--apple-text-secondary)]" />
            <p className="text-[var(--apple-text-secondary)]">メトリクスを読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPerformanceBadge = (time: number) => {
    if (time < 200) return <Badge variant="default" className="bg-green-100 text-green-800">高速</Badge>;
    if (time < 500) return <Badge variant="secondary">普通</Badge>;
    return <Badge variant="destructive">改善必要</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">パフォーマンス監視</h2>
          <p className="text-[var(--apple-text-secondary)]">
            リアルタイム同期とSWRキャッシュの効率を監視
          </p>
        </div>
        <Button onClick={refreshMetrics} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          更新
        </Button>
      </div>

      {/* 概要カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ページ読み込み</CardTitle>
            <Clock className="h-4 w-4 text-[var(--apple-text-secondary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(performanceSummary.pageLoadTime)}</div>
            {getPerformanceBadge(performanceSummary.pageLoadTime)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API呼び出し</CardTitle>
            <Database className="h-4 w-4 text-[var(--apple-text-secondary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceSummary.apiPerformance.length}</div>
            <p className="text-xs text-[var(--apple-text-secondary)]">エンドポイント</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">リアルタイム</CardTitle>
            <Wifi className="h-4 w-4 text-[var(--apple-text-secondary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceSummary.realtimeActivity.reduce((totalCount: number, activityItem) => totalCount + activityItem.count, 0)}
            </div>
            <p className="text-xs text-[var(--apple-text-secondary)]">イベント数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">メモリ使用量</CardTitle>
            <Zap className="h-4 w-4 text-[var(--apple-text-secondary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceSummary.memoryUsage ? 
                `${Math.round(performanceSummary.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB` : 
                "N/A"
              }
            </div>
            <p className="text-xs text-[var(--apple-text-secondary)]">JavaScript Heap</p>
          </CardContent>
        </Card>
      </div>

      {/* API パフォーマンス */}
      <Card>
        <CardHeader>
          <CardTitle>API レスポンス時間</CardTitle>
          <CardDescription>各エンドポイントの応答時間統計</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceSummary.apiPerformance.map((apiItem: ApiPerformanceData, itemIndex: number) => (
              <div key={itemIndex} className="flex items-center justify-between p-3 rounded-lg bg-[var(--apple-fill-tertiary)]/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{apiItem.endpoint}</p>
                  <p className="text-xs text-[var(--apple-text-secondary)]">
                    {apiItem.callCount}回の呼び出し
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="font-medium">{formatTime(apiItem.avgTime)}</div>
                    <div className="text-xs text-[var(--apple-text-secondary)]">平均</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600">{formatTime(apiItem.minTime)}</div>
                    <div className="text-xs text-[var(--apple-text-secondary)]">最小</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-600">{formatTime(apiItem.maxTime)}</div>
                    <div className="text-xs text-[var(--apple-text-secondary)]">最大</div>
                  </div>
                  {getPerformanceBadge(apiItem.avgTime)}
                </div>
              </div>
            ))}
            {performanceSummary.apiPerformance.length === 0 && (
              <p className="text-center py-8 text-[var(--apple-text-secondary)]">
                API呼び出しのデータがありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* キャッシュ パフォーマンス */}
      <Card>
        <CardHeader>
          <CardTitle>キャッシュ効率</CardTitle>
          <CardDescription>SWRキャッシュのヒット率</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceSummary.cachePerformance.map((cacheItem: CachePerformanceData, cacheIndex: number) => (
              <div key={cacheIndex} className="flex items-center justify-between p-3 rounded-lg bg-[var(--apple-fill-tertiary)]/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cacheItem.endpoint}</p>
                  <p className="text-xs text-[var(--apple-text-secondary)]">
                    {cacheItem.totalRequests}回のリクエスト
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {Math.round(cacheItem.hitRate * 100)}%
                    </div>
                    <div className="text-xs text-[var(--apple-text-secondary)]">ヒット率</div>
                  </div>
                  <Badge 
                    variant={cacheItem.hitRate > 0.8 ? "default" : cacheItem.hitRate > 0.5 ? "secondary" : "destructive"}
                    className={
                      cacheItem.hitRate > 0.8 ? "bg-green-100 text-green-800" : 
                      cacheItem.hitRate > 0.5 ? "" : ""
                    }
                  >
                    {cacheItem.hitRate > 0.8 ? "良好" : cacheItem.hitRate > 0.5 ? "普通" : "改善必要"}
                  </Badge>
                </div>
              </div>
            ))}
            {performanceSummary.cachePerformance.length === 0 && (
              <p className="text-center py-8 text-[var(--apple-text-secondary)]">
                キャッシュデータがありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* リアルタイム アクティビティ */}
      <Card>
        <CardHeader>
          <CardTitle>リアルタイム アクティビティ</CardTitle>
          <CardDescription>Supabase Realtimeイベントの統計</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceSummary.realtimeActivity.map((realtimeItem, realtimeIndex: number) => (
              <div key={realtimeIndex} className="flex items-center justify-between p-3 rounded-lg bg-[var(--apple-fill-tertiary)]/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{realtimeItem.eventType}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{realtimeItem.count}</div>
                  <div className="text-xs text-[var(--apple-text-secondary)]">イベント</div>
                </div>
              </div>
            ))}
            {performanceSummary.realtimeActivity.length === 0 && (
              <p className="text-center py-8 text-[var(--apple-text-secondary)]">
                リアルタイムイベントがありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}