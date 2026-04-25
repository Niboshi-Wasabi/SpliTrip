"use client";

import React, { createContext, useContext, type ReactNode } from "react";
import useSWR, { SWRConfig, mutate } from "swr";
import { createClient } from "@/utils/supabase/client";

// 管理画面共通のfetcher
const adminFetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
};

// SWR設定（管理画面最適化）
const swrConfig = {
  fetcher: adminFetcher,
  revalidateOnFocus: false, // フォーカス時の再取得を無効化
  revalidateOnReconnect: true, // 接続復旧時の再取得
  dedupingInterval: 300000, // 5分間の重複排除
  errorRetryCount: 2, // エラー時のリトライ回数
  errorRetryInterval: 1000, // リトライ間隔
  refreshInterval: 0, // 自動更新無効（管理画面では手動更新を優先）
  shouldRetryOnError: (err: any) => {
    // 401, 403, 404 は再試行しない
    return ![401, 403, 404].includes(err.status);
  },
};

type AdminDataContextType = {
  preloadData: (urls: string[]) => void;
};

const AdminDataContext = createContext<AdminDataContextType>({
  preloadData: () => {},
});

export function AdminDataProvider({ children }: { children: ReactNode }) {
  // データのプリロード機能
  const preloadData = (urls: string[]) => {
    urls.forEach((url) => {
      // バックグラウンドでデータを取得（SWRキャッシュに保存）
      adminFetcher(url).catch(() => {
        // プリロードエラーは無視（実際の使用時に再試行）
      });
    });
  };

  const contextValue: AdminDataContextType = {
    preloadData,
  };

  return (
    <SWRConfig value={swrConfig}>
      <AdminDataContext.Provider value={contextValue}>
        {children}
      </AdminDataContext.Provider>
    </SWRConfig>
  );
}

export const useAdminData = () => useContext(AdminDataContext);

// 各リソース用のカスタムフック（リアルタイム同期対応）
export const useAdminUsers = () => {
  const swrResult = useSWR("/api/admin/users");
  
  // 管理画面では30秒ごとに自動更新
  const { mutate } = swrResult;
  
  return {
    ...swrResult,
    refreshManually: () => mutate(),
  };
};

export const useAnnouncements = () => {
  const swrResult = useSWR("/api/admin/announcements");
  
  // リアルタイム同期（app_announcementsテーブルの変更を監視）
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-announcements")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_announcements",
        },
        () => {
          // お知らせテーブルの変更時にSWRキャッシュを更新
          mutate("/api/admin/announcements");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return swrResult;
};

export const useSystemSettings = () => {
  return useSWR("/api/admin/system-settings");
};

export const useAuditLogs = (page = 1, limit = 50) => {
  const swrResult = useSWR(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
  
  // 監査ログの自動更新（新しいログエントリの検出）
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-audit-logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_audit_logs",
        },
        () => {
          // 新しい監査ログが追加された時にキャッシュを更新
          mutate(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, limit]);
  
  return swrResult;
};

// リソースの事前キャッシュ化
export const preloadAdminResources = () => {
  if (typeof window !== "undefined") {
    const resources = [
      "/api/admin/users",
      "/api/admin/announcements", 
      "/api/admin/system-settings",
      "/api/admin/audit-logs?page=1&limit=50",
    ];
    
    resources.forEach(url => {
      adminFetcher(url).catch(() => {
        // プリロードエラーは無視
      });
    });
  }
};