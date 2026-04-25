/**
 * パフォーマンス監視関連の型定義
 */

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTimes: Map<string, number[]>;
  realtimeEventCounts: Map<string, number>;
  cacheHitRates: Map<string, { hits: number; misses: number }>;
  memoryUsage?: MemoryInfo;
}

export interface ApiPerformanceData {
  endpoint: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  callCount: number;
}

export interface CachePerformanceData {
  endpoint: string;
  hitRate: number;
  totalRequests: number;
}

export interface RealtimeActivityData {
  eventType: string;
  count: number;
}

export interface PerformanceSummary {
  pageLoadTime: number;
  apiPerformance: ApiPerformanceData[];
  cachePerformance: CachePerformanceData[];
  realtimeActivity: RealtimeActivityData[];
  memoryUsage?: MemoryInfo;
}

export interface RealtimeConfig {
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
}

export interface SWRRealtimeOptions {
  realtimeConfig?: RealtimeConfig[];
  currentUserId?: string;
  onRemoteChange?: (payload: any) => void;
  enableBroadcast?: boolean;
  broadcastChannel?: string;
  debounceMs?: number;
}