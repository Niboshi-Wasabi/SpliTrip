"use client";

/**
 * パフォーマンス監視とメトリクス収集
 * リアルタイム同期とSWRの効率を測定
 */

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTimes: Map<string, number[]>;
  realtimeEventCounts: Map<string, number>;
  cacheHitRates: Map<string, { hits: number; misses: number }>;
  memoryUsage?: MemoryInfo;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    pageLoadTime: 0,
    apiResponseTimes: new Map(),
    realtimeEventCounts: new Map(),
    cacheHitRates: new Map(),
  };

  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
    this.startMemoryMonitoring();
  }

  private initializeObservers() {
    // Navigation timing
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === "navigation") {
              const navigationEntry = entry as PerformanceNavigationTiming;
              this.metrics.pageLoadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
            }
          });
        });
        navigationObserver.observe({ entryTypes: ["navigation"] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn("Navigation timing observer not supported:", error);
      }

      // Measure API requests
      try {
        const measureObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name.startsWith("api-call:")) {
              const apiEndpoint = entry.name.replace("api-call:", "");
              if (!this.metrics.apiResponseTimes.has(apiEndpoint)) {
                this.metrics.apiResponseTimes.set(apiEndpoint, []);
              }
              this.metrics.apiResponseTimes.get(apiEndpoint)!.push(entry.duration);
            }
          });
        });
        measureObserver.observe({ entryTypes: ["measure"] });
        this.observers.push(measureObserver);
      } catch (error) {
        console.warn("Measure observer not supported:", error);
      }
    }
  }

  private startMemoryMonitoring() {
    if (typeof window !== "undefined" && "performance" in window && "memory" in performance) {
      const updateMemoryUsage = () => {
        this.metrics.memoryUsage = (performance as any).memory;
      };
      
      // 30秒ごとにメモリ使用量を更新
      setInterval(updateMemoryUsage, 30000);
      updateMemoryUsage(); // 初回実行
    }
  }

  // API呼び出しの測定開始
  startApiMeasure(endpoint: string) {
    if (typeof window !== "undefined" && "performance" in window) {
      const markName = `api-start:${endpoint}`;
      performance.mark(markName);
      return markName;
    }
    return null;
  }

  // API呼び出しの測定終了
  endApiMeasure(endpoint: string, startMark?: string | null) {
    if (typeof window !== "undefined" && "performance" in window && startMark) {
      const endMarkName = `api-end:${endpoint}`;
      const measureName = `api-call:${endpoint}`;
      
      performance.mark(endMarkName);
      performance.measure(measureName, startMark, endMarkName);
    }
  }

  // リアルタイムイベントのカウント
  recordRealtimeEvent(eventType: string) {
    const currentCount = this.metrics.realtimeEventCounts.get(eventType) || 0;
    this.metrics.realtimeEventCounts.set(eventType, currentCount + 1);
  }

  // キャッシュヒット/ミスの記録
  recordCacheEvent(endpoint: string, isHit: boolean) {
    if (!this.metrics.cacheHitRates.has(endpoint)) {
      this.metrics.cacheHitRates.set(endpoint, { hits: 0, misses: 0 });
    }
    
    const stats = this.metrics.cacheHitRates.get(endpoint)!;
    if (isHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
  }

  // メトリクスの取得
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // パフォーマンスサマリーの生成
  getPerformanceSummary() {
    const apiTimes = Array.from(this.metrics.apiResponseTimes.entries()).map(([endpoint, times]) => ({
      endpoint,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      callCount: times.length,
    }));

    const cacheStats = Array.from(this.metrics.cacheHitRates.entries()).map(([endpoint, stats]) => ({
      endpoint,
      hitRate: stats.hits / (stats.hits + stats.misses),
      totalRequests: stats.hits + stats.misses,
    }));

    const realtimeStats = Array.from(this.metrics.realtimeEventCounts.entries()).map(([eventType, count]) => ({
      eventType,
      count,
    }));

    return {
      pageLoadTime: this.metrics.pageLoadTime,
      apiPerformance: apiTimes,
      cachePerformance: cacheStats,
      realtimeActivity: realtimeStats,
      memoryUsage: this.metrics.memoryUsage,
    };
  }

  // リソースのクリーンアップ
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();

// SWRとの統合用フック
export function usePerformanceTracking() {
  const trackApiCall = (endpoint: string) => {
    const startMark = performanceMonitor.startApiMeasure(endpoint);
    
    return {
      finish: (wasFromCache = false) => {
        performanceMonitor.endApiMeasure(endpoint, startMark);
        performanceMonitor.recordCacheEvent(endpoint, wasFromCache);
      },
    };
  };

  const trackRealtimeEvent = (eventType: string) => {
    performanceMonitor.recordRealtimeEvent(eventType);
  };

  return {
    trackApiCall,
    trackRealtimeEvent,
    getMetrics: () => performanceMonitor.getMetrics(),
    getSummary: () => performanceMonitor.getPerformanceSummary(),
  };
}