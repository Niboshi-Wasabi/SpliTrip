/**
 * Supabase Realtime のブロードキャスト機能を使い、
 * グループ内の全接続クライアントに「データが変更された」ことを通知する。
 * postgres_changes と違い、テーブルごとの Realtime 有効化や RLS の影響を受けない。
 *
 * チャンネル名は `useRealtimeSync`（`src/hooks/useRealtimeSync.ts`）の
 * `realtime-group:${groupId}` と一致させること。不一致だと他タブが refresh されない。
 */
import { createClient } from "@/utils/supabase/client";

const realtimeGroupChannelName = (groupId: string) => `realtime-group:${groupId}`;

export function broadcastGroupRefresh(groupId: string): void {
  const supabase = createClient();
  const channel = supabase.channel(realtimeGroupChannelName(groupId), {
    config: { broadcast: { self: false } },
  });

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channel
        .send({
          type: "broadcast",
          event: "data-changed",
          payload: {},
        })
        .then(() => {
          setTimeout(() => supabase.removeChannel(channel), 500);
        });
    }
  });
}
