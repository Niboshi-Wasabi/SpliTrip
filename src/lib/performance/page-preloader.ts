/**
 * ページ遷移の高速化のためのプリローダー
 */

// 主要なページリソースをプリロード
export const preloadMainPages = () => {
  if (typeof window !== "undefined") {
    const mainPages = [
      "/dashboard",
      "/settings",
      "/dashboard/groups",
    ];
    
    // Next.jsルーターによるプリフェッチ
    mainPages.forEach(page => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = page;
      document.head.appendChild(link);
    });
  }
};

// 特定のAPIエンドポイントをプリロード
export const preloadApiEndpoints = (endpoints: string[]) => {
  if (typeof window !== "undefined") {
    endpoints.forEach(endpoint => {
      fetch(endpoint, { 
        method: "GET",
        credentials: "include",
      }).catch(() => {
        // プリロードエラーは無視
      });
    });
  }
};

// ブラウザアイドル時間を利用したプリロード
export const preloadOnIdle = (callback: () => void) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const requestIdleCallback = (window as any).requestIdleCallback as (callback: () => void) => void;
    requestIdleCallback(callback);
  } else {
    // フォールバック: 少し遅延してから実行
    setTimeout(callback, 100);
  }
};