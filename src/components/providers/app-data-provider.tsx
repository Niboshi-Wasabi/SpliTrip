"use client";

import { createContext, useContext, type ReactNode } from "react";
import useSWR, { SWRConfig } from "swr";
import { performanceMonitor } from "@/lib/performance/performance-monitor";
import { useRouter } from "@/i18n/navigation";

// 全体用のfetcher（認証必須、パフォーマンス追跡付き）
const appFetcher = async (url: string) => {
  const startMark = performanceMonitor.startApiMeasure(url);
  
  try {
    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number };
      error.status = response.status;
      performanceMonitor.endApiMeasure(url, startMark);
      performanceMonitor.recordCacheEvent(url, false);
      throw error;
    }
    
    const data = await response.json();
    performanceMonitor.endApiMeasure(url, startMark);
    performanceMonitor.recordCacheEvent(url, false);
    
    return data;
  } catch (error) {
    performanceMonitor.endApiMeasure(url, startMark);
    performanceMonitor.recordCacheEvent(url, false);
    throw error;
  }
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
  shouldRetryOnError: (err: Error & { status?: number }) => {
    // 401, 403, 404, 422 は再試行しない
    return ![401, 403, 404, 422].includes(err.status || 0);
  },
  onError: (err: Error & { status?: number }) => {
    console.error("[AppDataProvider] SWR Error:", err);
    // 401エラーの場合は自動的にログイン画面に遷移
    if (err.status === 401) {
      // ロケール対応のリダイレクト（現在のロケールを維持）
      const currentLocale = window.location.pathname.split('/')[1];
      const locales = ['ja', 'en'];
      const loginPath = locales.includes(currentLocale) ? `/${currentLocale}/login` : "/ja/login";
      window.location.href = loginPath;
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

// 設定データ
export const useSettings = () => {
  return useSWR("/api/settings");
};

// 注意: 以下のフックは対応するAPIエンドポイントが存在しないため削除
// - useGroupMembers: /api/groups/[groupId]/members (存在しない)
// - useGroupExpenses: /api/groups/[groupId]/expenses (GET未実装)
// - usePublicAnnouncements: /api/announcements (パブリック版存在しない)
// - usePublicSystemSettings: /api/system-settings (パブリック版存在しない)

// ===== プリロード用ヘルパー =====

// ダッシュボード関連のリソースをプリロード
export const preloadDashboardResources = () => {
  if (typeof window !== "undefined") {
    const resources = [
      "/api/profile",
      "/api/dashboard/stats",
      "/api/groups",
      // 注意: /api/announcements (パブリック版) は存在しないため除外
    ];
    
    resources.forEach(url => {
      appFetcher(url).catch(() => {
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
      // 注意: members, expenses は個別エンドポイントが存在しないため除外
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