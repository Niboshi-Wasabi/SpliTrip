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
 * Why debounce:
 *   一括 INSERT（負担行の複数行など）で大量のイベントが来る場合に
 *   router.refresh() が連発されるのを防ぐ。
 *   Prevents rapid-fire router.refresh() when bulk inserts (e.g. expense splits)
 *   generate many events in quick succession.
 *
 * Why useEffect cleanup:
 *   WebSocket チャンネルを解除し、メモリリークとゴーストリスナーを防止する。
 *   Unsubscribes the WebSocket channel to prevent memory leaks and ghost listeners.
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

export function useRealtimeSync({
  groupId,
  currentUserId,
  onRemoteChange,
}: RealtimeSyncOptions): void {
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  const handleChange = useCallback(
    (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        router.refresh();

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
      }, DEBOUNCE_MS);
    },
    [router, currentUserId],
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`realtime-group:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_expenses",
          filter: `group_id=eq.${groupId}`,
        },
        handleChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        handleChange,
      )
      .on(
        "broadcast",
        { event: "data-changed" },
        () => handleChange({ new: undefined, old: undefined }),
      )
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
  }, [groupId, handleChange]);
}
