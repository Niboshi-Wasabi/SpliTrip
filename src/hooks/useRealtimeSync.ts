"use client";

/**
 * Supabase Realtime (Postgres Changes) でグループの出費・メンバー変更を監視し、
 * 変更検知時に Server Component を再描画するカスタムフック。
 * Custom hook that subscribes to Postgres Changes on group_expenses / group_members
 * and triggers a Server Component re-render via `router.refresh()` on change.
 *
 * Why `postgres_changes` over broadcast:
 *   ブロードキャストは自前で送信する必要があるが、postgres_changes は
 *   DB への直接 INSERT/UPDATE/DELETE（RPC 含む）も検知できるため、
 *   クライアントコードに漏れがあっても UI が同期される。
 *   Broadcast requires explicit sending, but postgres_changes detects
 *   any DB mutation (including RPCs), so UI stays in sync even if
 *   client code forgets to broadcast.
 *
 * Filter の UUID はハイフンが演算子と誤解釈されることがあるため、値を二重引用符で包む。
 * Realtime filter grammar: https://supabase.com/docs/guides/realtime/postgres-changes
 *
 * Why debounce (postgres only):
 *   一括 INSERT で大量のイベントが来る場合に router.refresh() が連発されるのを防ぐ。
 *   ブロードキャストは 1 回なのでデバウンスしない（他タブの即時更新のため）。
 */

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type RealtimeSyncOptions = {
  groupId: string;
  /** 自分の変更ではトーストを出さないための userId */
  currentUserId?: string;
  /** 他者の変更を検知した際のコールバック / Callback when another user's change is detected */
  onRemoteChange?: () => void;
};

const DEBOUNCE_MS = 400;
const VISIBILITY_REFRESH_MS = 350;

/** `group_id=eq.<uuid>` の uuid にハイフンがあるとフィルタが壊れる場合があるため値を引用する。 */
function realtimeEqUuidFilter(columnName: string, uuidValue: string): string {
  return `${columnName}=eq."${uuidValue}"`;
}

export function useRealtimeSync({
  groupId,
  currentUserId,
  onRemoteChange,
}: RealtimeSyncOptions): void {
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  const refreshTwice = useCallback(() => {
    router.refresh();
    requestAnimationFrame(() => {
      router.refresh();
    });
  }, [router]);

  const notifyRemoteToast = useCallback(
    (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      const changedByUserId =
        (payload.new as Record<string, unknown> | undefined)?.payer_id ??
        (payload.new as Record<string, unknown> | undefined)?.user_id;
      if (
        currentUserId &&
        typeof changedByUserId === "string" &&
        changedByUserId !== currentUserId
      ) {
        onRemoteChangeRef.current?.();
      } else if (!currentUserId) {
        onRemoteChangeRef.current?.();
      }
    },
    [currentUserId],
  );

  const handlePostgresChange = useCallback(
    (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        refreshTwice();
        notifyRemoteToast(payload);
      }, DEBOUNCE_MS);
    },
    [refreshTwice, notifyRemoteToast],
  );

  /** 他タブからの broadcast。送信側は broadcast.self=false のため受信タブのみ。即時更新。 */
  const handleBroadcastRefresh = useCallback(() => {
    refreshTwice();
    onRemoteChangeRef.current?.();
  }, [refreshTwice]);

  useEffect(() => {
    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (visibilityTimer.current) {
        clearTimeout(visibilityTimer.current);
      }
      visibilityTimer.current = setTimeout(() => {
        refreshTwice();
      }, VISIBILITY_REFRESH_MS);
    };

    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
      if (visibilityTimer.current) {
        clearTimeout(visibilityTimer.current);
      }
    };
  }, [refreshTwice]);

  useEffect(() => {
    const supabase = createClient();
    const groupIdFilter = realtimeEqUuidFilter("group_id", groupId);

    const channel = supabase
      .channel(`realtime-group:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_expenses",
          filter: groupIdFilter,
        },
        handlePostgresChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: groupIdFilter,
        },
        handlePostgresChange,
      )
      .on("broadcast", { event: "data-changed" }, handleBroadcastRefresh)
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[useRealtimeSync] Realtime channel error:", error?.message ?? error);
        }
        if (status === "TIMED_OUT") {
          console.warn("[useRealtimeSync] Realtime subscription timed out");
        }
      });

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [groupId, handlePostgresChange, handleBroadcastRefresh]);
}
