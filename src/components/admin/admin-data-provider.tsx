"use client";

import { createContext, useContext, type ReactNode } from "react";
import useSWR, { SWRConfig } from "swr";

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

// 各リソース用のカスタムフック
export const useAdminUsers = () => {
  return useSWR("/api/admin/users");
};

export const useAnnouncements = () => {
  return useSWR("/api/admin/announcements");
};

export const useSystemSettings = () => {
  return useSWR("/api/admin/system-settings");
};

export const useAuditLogs = (page = 1, limit = 50) => {
  return useSWR(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
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