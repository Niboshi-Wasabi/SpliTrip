"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { preloadMainPages, preloadOnIdle } from "@/lib/performance/page-preloader";

/**
 * アプリ全体のパフォーマンス向上機能
 * - ページプリロード
 * - ナビゲーション最適化
 * - アイドル時間の活用
 */
export function AppPerformanceEnhancer() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // アイドル時間を利用してメインページをプリロード
    preloadOnIdle(() => {
      preloadMainPages();
    });

    // 現在のページに応じて関連ページをプリフェッチ
    if (pathname === "/dashboard") {
      // ダッシュボードにいる場合は設定ページとグループページをプリフェッチ
      router.prefetch("/settings");
      router.prefetch("/dashboard/groups/new");
    } else if (pathname === "/settings") {
      // 設定ページにいる場合はダッシュボードをプリフェッチ
      router.prefetch("/dashboard");
    } else if (pathname.startsWith("/dashboard/groups/")) {
      // グループページにいる場合はダッシュボードをプリフェッチ
      router.prefetch("/dashboard");
    }

    // ページビューのトラッキング（将来のアナリティクス用にログ出力は削除）
  }, [pathname, router]);

  // Service Worker 登録（PWA対応）
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Service Worker登録失敗は無視
      });
    }
  }, []);

  return null; // 描画しない
}