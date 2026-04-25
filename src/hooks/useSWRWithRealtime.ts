"use client";

import { useEffect, useCallback, useRef } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/utils/supabase/client";

/**
 * SWRとSupabase Realtimeを統合したカスタムフック
 * - SWRによる効率的なキャッシング
 * - Realtimeによるリアルタイムデータ同期
 * - 自動的なUI更新とトースト通知
 */

type RealtimeConfig = {
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
};

type SWRRealtimeOptions = {
  realtimeConfig?: RealtimeConfig[];
  currentUserId?: string;
  onRemoteChange?: (payload: any) => void;
  enableBroadcast?: boolean;
  broadcastChannel?: string;
  debounceMs?: number;
};

export function useSWRWithRealtime<T = any>(
  key: string | null,
  options: SWRRealtimeOptions = {}
) {
  const {
    realtimeConfig = [],
    currentUserId,
    onRemoteChange,
    enableBroadcast = true,
    broadcastChannel,
    debounceMs = 150,
  } = options;

  // SWRフック
  const swrResult = useSWR<T>(key);
  
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRemoteChangeRef = useRef(onRemoteChange);

  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
  }, [onRemoteChange]);

  // リアルタイム同期の処理
  const handleRealtimeChange = useCallback((payload: any) => {
    // デバウンス処理
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      // SWRキャッシュを更新
      if (key) {
        mutate(key);
      }
      
      // 他ユーザーの変更かチェック
      const changedByUserId = payload.new?.payer_id ?? payload.new?.user_id;
      if (
        currentUserId &&
        typeof changedByUserId === "string" &&
        changedByUserId !== currentUserId
      ) {
        onRemoteChangeRef.current?.(payload);
      } else if (!currentUserId) {
        onRemoteChangeRef.current?.(payload);
      }
    }, debounceMs);
  }, [key, currentUserId, debounceMs]);

  // ブロードキャスト処理
  const handleBroadcast = useCallback(() => {
    if (key) {
      mutate(key);
    }
    onRemoteChangeRef.current?.({});
  }, [key]);

  // Realtime購読の設定
  useEffect(() => {
    if (!key || realtimeConfig.length === 0) {
      return;
    }

    const supabase = createClient();
    const channelName = broadcastChannel || `swr-realtime:${key}`;
    let channel = supabase.channel(channelName);

    // postgres_changesの設定
    realtimeConfig.forEach(config => {
      channel = channel.on(
        "postgres_changes",
        {
          event: config.event || "*",
          schema: "public",
          table: config.table,
          filter: config.filter,
        },
        handleRealtimeChange
      );
    });

    // ブロードキャストの設定
    if (enableBroadcast) {
      channel = channel.on("broadcast", { event: "data-changed" }, handleBroadcast);
    }

    // チャンネル購読
    channel.subscribe((status, error) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(`[SWRRealtime] Channel error for ${key}:`, error);
      }
      if (status === "TIMED_OUT") {
        console.warn(`[SWRRealtime] Subscription timeout for ${key}:`, error);
      }
    });

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [key, realtimeConfig, handleRealtimeChange, handleBroadcast, enableBroadcast, broadcastChannel]);

  return {
    ...swrResult,
    // 手動でリアルタイム同期をトリガー
    triggerSync: () => {
      if (key) {
        mutate(key);
      }
    },
  };
}