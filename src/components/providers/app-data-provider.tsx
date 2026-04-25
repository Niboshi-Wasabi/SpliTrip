"use client";

import { createContext, useContext, type ReactNode } from "react";
import useSWR, { SWRConfig } from "swr";
import { useRouter } from "@/i18n/navigation";

// 全体用のfetcher（認証必須）
const appFetcher = async (url: string) => {
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

// パブリックfetcher（認証不要）
const publicFetcher = async (url: string) => {
  const response = await fetch(url, {
    cache: "no-store",
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
};

// SWR設定（全体最適化）
const swrConfig = {
  fetcher: appFetcher,
  revalidateOnFocus: false, // フォーカス時の再取得を無効化
  revalidateOnReconnect: true, // 接続復旧時の再取得
  dedupingInterval: 180000, // 3分間の重複排除（管理画面より短め）
  errorRetryCount: 3, // エラー時のリトライ回数
  errorRetryInterval: 1000, // リトライ間隔
  refreshInterval: 0, // 自動更新無効（必要に応じて手動更新）
  shouldRetryOnError: (err: any) => {
    // 401, 403, 404, 422 は再試行しない
    return ![401, 403, 404, 422].includes(err.status);
  },
  onError: (err: any) => {
    console.error("[AppDataProvider] SWR Error:", err);
    // 401エラーの場合は自動的にログイン画面に遷移
    if (err.status === 401) {
      window.location.href = "/login";
    }
  },
};

type AppDataContextType = {
  preloadData: (urls: string[]) => void;
  refreshAllData: () => void;
};

const AppDataContext = createContext<AppDataContextType>({
  preloadData: () => {},
  refreshAllData: () => {},
});

export function AppDataProvider({ children }: { children: ReactNode }) {
  // データのプリロード機能
  const preloadData = (urls: string[]) => {
    urls.forEach((url) => {
      appFetcher(url).catch(() => {
        // プリロードエラーは無視（実際の使用時に再試行）
      });
    });
  };

  // 全データの強制更新
  const refreshAllData = () => {
    // SWRの全キャッシュをクリア
    window.location.reload();
  };

  const contextValue: AppDataContextType = {
    preloadData,
    refreshAllData,
  };

  return (
    <SWRConfig value={swrConfig}>
      <AppDataContext.Provider value={contextValue}>
        {children}
      </AppDataContext.Provider>
    </SWRConfig>
  );
}

export const useAppData = () => useContext(AppDataContext);

// ===== 共通データフック =====

// ユーザープロフィール
export const useUserProfile = () => {
  return useSWR("/api/profile");
};

// ダッシュボード統計
export const useDashboardStats = () => {
  return useSWR("/api/dashboard/stats");
};

// ユーザーグループ一覧
export const useUserGroups = () => {
  return useSWR("/api/groups");
};

// 特定グループの詳細
export const useGroupDetails = (groupId: string | null) => {
  return useSWR(groupId ? `/api/groups/${groupId}` : null);
};

// グループのメンバー
export const useGroupMembers = (groupId: string | null) => {
  return useSWR(groupId ? `/api/groups/${groupId}/members` : null);
};

// グループの出費一覧
export const useGroupExpenses = (groupId: string | null) => {
  return useSWR(groupId ? `/api/groups/${groupId}/expenses` : null);
};

// 設定データ
export const useSettings = () => {
  return useSWR("/api/settings");
};

// お知らせ（パブリック）
export const usePublicAnnouncements = () => {
  return useSWR("/api/announcements", publicFetcher);
};

// システム設定（パブリック）
export const usePublicSystemSettings = () => {
  return useSWR("/api/system-settings", publicFetcher);
};

// ===== プリロード用ヘルパー =====

// ダッシュボード関連のリソースをプリロード
export const preloadDashboardResources = () => {
  if (typeof window !== "undefined") {
    const resources = [
      "/api/profile",
      "/api/dashboard/stats",
      "/api/groups",
      "/api/announcements",
    ];
    
    resources.forEach(url => {
      const fetcher = url.startsWith("/api/announcements") ? publicFetcher : appFetcher;
      fetcher(url).catch(() => {
        // プリロードエラーは無視
      });
    });
  }
};

// グループ詳細関連のリソースをプリロード
export const preloadGroupResources = (groupId: string) => {
  if (typeof window !== "undefined") {
    const resources = [
      `/api/groups/${groupId}`,
      `/api/groups/${groupId}/members`,
      `/api/groups/${groupId}/expenses`,
    ];
    
    resources.forEach(url => {
      appFetcher(url).catch(() => {
        // プリロードエラーは無視
      });
    });
  }
};

// 設定関連のリソースをプリロード
export const preloadSettingsResources = () => {
  if (typeof window !== "undefined") {
    const resources = [
      "/api/profile",
      "/api/settings",
    ];
    
    resources.forEach(url => {
      appFetcher(url).catch(() => {
        // プリロードエラーは無視
      });
    });
  }
};